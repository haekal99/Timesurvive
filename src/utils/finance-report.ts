import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { MonthlyBill } from '@/database/monthly-bills';
import type { Transaction } from '@/context/app-context';
import type { FinanceReport, FinanceReportRow } from '@/types';

export type { FinanceReport, FinanceReportRow } from '@/types';

const money = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function formatDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
}

export function createFinanceReportRows(
  transactions: Transaction[],
  bills: MonthlyBill[],
  startDate: string,
  endDate: string,
): FinanceReportRow[] {
  const transactionRows: FinanceReportRow[] = transactions
    .filter((transaction) => transaction.date >= startDate && transaction.date <= endDate)
    .map((transaction) => ({
      date: transaction.date,
      category: transaction.category,
      description: transaction.notes || transaction.category,
      amount: transaction.amount,
      status: transaction.kind === 'income' ? 'Pemasukan' : 'Pengeluaran',
      kind: transaction.kind,
    }));

  const billRows: FinanceReportRow[] = [];
  const rangeStart = new Date(`${startDate}T12:00:00`);
  const rangeEnd = new Date(`${endDate}T12:00:00`);
  for (
    const month = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    month <= rangeEnd;
    month.setMonth(month.getMonth() + 1)
  ) {
    const yearMonth = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    for (const bill of bills) {
      const day = Math.min(bill.dueDay, new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate());
      const dueDate = `${yearMonth}-${String(day).padStart(2, '0')}`;
      if (dueDate < startDate || dueDate > endDate) continue;
      billRows.push({
        date: dueDate,
        category: bill.category,
        description: bill.name,
        amount: bill.amount,
        status: bill.status === 'paid' ? 'Tagihan · Lunas' : 'Tagihan · Belum lunas',
        kind: 'bill',
      });
    }
  }

  return [...transactionRows, ...billRows].sort(
    (left, right) => left.date.localeCompare(right.date) || left.description.localeCompare(right.description),
  );
}

export async function exportFinanceReport(report: FinanceReport): Promise<void> {
  const rows = report.rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(formatDate(row.date))}</td>
        <td>${escapeHtml(row.category)}</td>
        <td>${escapeHtml(row.description)}</td>
        <td class="amount">${escapeHtml(money.format(row.amount))}</td>
        <td>${escapeHtml(row.status)}</td>
      </tr>`,
    )
    .join('');
  const paidCount = report.rows.filter((row) => row.kind === 'bill' && row.status.endsWith('Lunas')).length;
  const unpaidCount = report.rows.filter((row) => row.kind === 'bill' && row.status.endsWith('Belum lunas')).length;
  const html = `<!doctype html>
    <html lang="id">
      <head><meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="utf-8">
        <style>
          @page { size: A4; margin: 20mm 16mm; }
          body { font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; }
          header { border-bottom: 3px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; }
          h1 { font-size: 22px; margin: 0 0 5px; } .period { color: #64748b; }
          .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; margin: 18px 0 24px; }
          .summary div { border: 1px solid #dbe2ec; border-radius: 8px; padding: 11px; }
          .label { display: block; color: #64748b; font-size: 10px; margin-bottom: 5px; }
          .value { font-size: 15px; font-weight: 700; }
          h2 { font-size: 15px; margin: 18px 0 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th { background: #eef2ff; text-align: left; color: #3730a3; }
          th, td { border: 1px solid #dbe2ec; padding: 7px 6px; vertical-align: top; }
          .amount { text-align: right; white-space: nowrap; }
          .empty { color: #64748b; padding: 18px; text-align: center; border: 1px solid #dbe2ec; }
        </style>
      </head>
      <body>
        <header><h1>TimeSurvive - Laporan Keuangan &amp; Tagihan</h1>
          <div class="period">Periode ${escapeHtml(formatDate(report.startDate))} - ${escapeHtml(formatDate(report.endDate))}</div>
        </header>
        <section class="summary">
          <div><span class="label">Total Pemasukan</span><span class="value">${escapeHtml(money.format(report.income))}</span></div>
          <div><span class="label">Total Pengeluaran</span><span class="value">${escapeHtml(money.format(report.expenses))}</span></div>
          <div><span class="label">Saldo Akhir</span><span class="value">${escapeHtml(money.format(report.balance))}</span></div>
          <div><span class="label">Status Tagihan Bulanan</span><span class="value">${paidCount} lunas · ${unpaidCount} belum lunas</span></div>
        </section>
        <h2>Rincian Transaksi &amp; Tagihan</h2>
        ${rows
          ? `<table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
          : '<div class="empty">Tidak ada transaksi atau tagihan pada periode ini.</div>'}
      </body>
    </html>`;

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Fitur berbagi file tidak tersedia di perangkat ini.');
  }
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
}
