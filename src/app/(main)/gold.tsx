import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ChoiceGroup, ConfirmDialog, EmptyState, Field, LoadingState, ModalSheet, Page, Panel, useColors } from '@/components/app-ui';
import { MonthlyBillCard, MonthlyBillForm } from '@/components/finance/monthly-bills';
import {
  createMonthlyBill,
  deleteMonthlyBill,
  listMonthlyBills,
  setMonthlyBillPaid,
  setMonthlyBillUnpaid,
  updateMonthlyBill,
} from '@/database/monthly-bills';
import type { MonthlyBill, MonthlyBillDraft } from '@/database/monthly-bills';
import { createRecordId, dateKey, useApp } from '@/context/app-context';
import type { Transaction } from '@/context/app-context';
import { createFinanceReportRows, exportFinanceReport } from '@/utils/finance-report';
import { isValidDateKey, parseRupiahAmount } from '@/utils/validation';

type GoldTab = 'transactions' | 'bills' | 'history';
type DateTarget = 'start' | 'end';
const transactionKinds = [
  { label: 'Pengeluaran', value: 'expense' },
  { label: 'Pemasukan', value: 'income' },
];
const goldTabs: { label: string; value: GoldTab }[] = [
  { label: 'Transaksi', value: 'transactions' },
  { label: 'Tagihan Bulanan', value: 'bills' },
  { label: 'History', value: 'history' },
];
const transactionScopes = [
  { label: 'Bulan ini', value: 'month' },
  { label: 'Semua transaksi', value: 'all' },
];
const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseDate(value);
  return !Number.isNaN(parsed.getTime()) && dateKey(parsed) === value;
}

function formatMonth(value: string) {
  if (!isDateKey(value)) return 'Pilih periode';
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(parseDate(value));
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

function createBillPayment(bill: MonthlyBill, paidDate: string) {
  return {
    kind: 'expense' as const,
    amount: bill.amount,
    category: bill.category,
    date: paidDate,
    notes: `Tagihan bulanan: ${bill.name}`,
  };
}

export default function GoldScreen() {
  const { data, addTransaction, updateTransaction, deleteTransaction } = useApp();
  const { quickAdd } = useLocalSearchParams<{ quickAdd?: string }>();
  const colors = useColors();
  const [tab, setTab] = useState<GoldTab>('transactions');
  const [transactionScope, setTransactionScope] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [kind, setKind] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(dateKey());
  const [selectedMonth, setSelectedMonth] = useState(dateKey().slice(0, 7));
  const [notes, setNotes] = useState('');
  const [transactionFieldErrors, setTransactionFieldErrors] = useState<{ amount?: string; category?: string; date?: string }>({});
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billFormOpen, setBillFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<MonthlyBill | null>(null);
  const [billDeleteId, setBillDeleteId] = useState<string | null>(null);
  const [billError, setBillError] = useState('');
  const [pageError, setPageError] = useState('');
  const [historyRange, setHistoryRange] = useState(monthBounds(dateKey().slice(0, 7)));
  const [dateTarget, setDateTarget] = useState<DateTarget | null>(null);
  const [exporting, setExporting] = useState(false);
  const reconciledPayments = useRef(new Set<string>());
  const monthItems = data.transactions.filter(
    (item) => transactionScope === 'all' || item.date.startsWith(selectedMonth),
  );
  const income = monthItems.filter((item) => item.kind === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthItems.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const balance = data.transactions.reduce((sum, item) => sum + (item.kind === 'income' ? item.amount : -item.amount), 0);
  const maxFlow = Math.max(income, expenses, 1);
  const reportRows = createFinanceReportRows(data.transactions, bills, historyRange.start, historyRange.end);
  const historyIncome = data.transactions
    .filter((item) => item.kind === 'income' && item.date >= historyRange.start && item.date <= historyRange.end)
    .reduce((sum, item) => sum + item.amount, 0);
  const historyExpenses = data.transactions
    .filter((item) => item.kind === 'expense' && item.date >= historyRange.start && item.date <= historyRange.end)
    .reduce((sum, item) => sum + item.amount, 0);
  const closingBalance = data.transactions
    .filter((item) => item.date <= historyRange.end)
    .reduce((sum, item) => sum + (item.kind === 'income' ? item.amount : -item.amount), 0);

  const reloadBills = useCallback(async () => {
    const storedBills = await listMonthlyBills();
    setBills(storedBills);
    return storedBills;
  }, []);

  const openTransactionForm = useCallback((transaction?: Transaction) => {
    setEditingId(transaction?.id ?? null);
    setKind(transaction?.kind ?? 'expense');
    setAmount(transaction ? String(transaction.amount) : '');
    setCategory(transaction?.category ?? '');
    setDate(transaction?.date ?? `${selectedMonth}-${dateKey().slice(-2)}`);
    setNotes(transaction?.notes ?? '');
    setTransactionFieldErrors({});
    setFormOpen(true);
  }, [selectedMonth]);

  useEffect(() => {
    let cancelled = false;
    void listMonthlyBills()
      .then((storedBills) => {
        if (!cancelled) setBills(storedBills);
      })
      .catch((error: unknown) => {
        if (!cancelled) setPageError(`Data tagihan gagal dimuat: ${error instanceof Error ? error.message : String(error)}`);
      })
      .finally(() => {
        if (!cancelled) setBillsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    for (const bill of bills) {
      const transactionId = bill.paidTransactionId;
      if (
        bill.status !== 'paid' ||
        !transactionId ||
        reconciledPayments.current.has(transactionId) ||
        data.transactions.some((transaction) => transaction.id === transactionId)
      ) {
        continue;
      }
      reconciledPayments.current.add(transactionId);
      addTransaction(createBillPayment(bill, bill.paidDate ?? dateKey()), transactionId);
    }
  }, [addTransaction, bills, data.transactions]);

  useEffect(() => {
    if (quickAdd) {
      const timer = setTimeout(() => {
        setTab('transactions');
        openTransactionForm();
        router.setParams({ quickAdd: '' });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [openTransactionForm, quickAdd]);

  const shiftMonth = (month: string, increment: number) => {
    const [year, monthNumber] = month.split('-').map(Number);
    const selected = new Date(year, monthNumber - 1 + increment, 1);
    return `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}`;
  };

  const saveTransaction = () => {
    const value = parseRupiahAmount(amount);
    const errors = {
      amount: value === null ? 'Masukkan nominal Rupiah positif, misalnya 50000 atau 50.000.' : undefined,
      category: category.trim() ? undefined : 'Kategori transaksi wajib diisi.',
      date: isValidDateKey(date) ? undefined : 'Gunakan tanggal kalender yang valid (YYYY-MM-DD).',
    };
    setTransactionFieldErrors(errors);
    if (Object.values(errors).some(Boolean) || value === null) {
      return;
    }
    const entry = { kind, amount: value, category: category.trim(), date: date.trim(), notes: notes.trim() };
    if (editingId) updateTransaction(editingId, entry);
    else addTransaction(entry);
    setFormOpen(false);
  };

  const saveBill = async (draft: MonthlyBillDraft) => {
    try {
      setBillError('');
      if (!draft.name || draft.amount <= 0 || draft.dueDay < 1 || !draft.category) {
        setBillError('Periksa kembali nama, nominal, tanggal jatuh tempo, dan kategori tagihan.');
        return;
      }
      if (editingBill) {
        const oldBill = editingBill;
        const paymentId = oldBill.paidTransactionId ?? (draft.status === 'paid' ? createRecordId() : null);
        const paymentDate = oldBill.paidDate ?? dateKey();
        await updateMonthlyBill(oldBill.id, { ...draft, status: oldBill.status });
        if (draft.status === 'paid' && oldBill.status !== 'paid' && paymentId) {
          await setMonthlyBillPaid(oldBill.id, paymentDate, paymentId);
          addTransaction(
            { ...createBillPayment({ ...oldBill, ...draft }, paymentDate) },
            paymentId,
          );
        } else if (draft.status === 'unpaid' && oldBill.status === 'paid') {
          await setMonthlyBillUnpaid(oldBill.id);
          if (oldBill.paidTransactionId) deleteTransaction(oldBill.paidTransactionId);
        } else if (draft.status === 'paid' && paymentId) {
          updateTransaction(paymentId, {
            amount: draft.amount,
            category: draft.category,
            notes: `Tagihan bulanan: ${draft.name}`,
          });
        }
      } else {
        const initialStatus = draft.status === 'paid' ? 'unpaid' : draft.status;
        const id = await createMonthlyBill({ ...draft, status: initialStatus });
        if (draft.status === 'paid') {
          const transactionId = createRecordId();
          const paidDate = dateKey();
          await setMonthlyBillPaid(id, paidDate, transactionId);
          addTransaction(
            createBillPayment({ ...draft, id, paidDate, paidTransactionId: transactionId }, paidDate),
            transactionId,
          );
        }
      }
      await reloadBills();
      setBillFormOpen(false);
      setEditingBill(null);
    } catch (error) {
      setBillError(`Tagihan gagal disimpan: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const toggleBillPaid = async (bill: MonthlyBill) => {
    try {
      setPageError('');
      if (bill.status === 'paid') {
        await setMonthlyBillUnpaid(bill.id);
        if (bill.paidTransactionId) deleteTransaction(bill.paidTransactionId);
      } else {
        const paidDate = dateKey();
        const transactionId = createRecordId();
        await setMonthlyBillPaid(bill.id, paidDate, transactionId);
        addTransaction(createBillPayment(bill, paidDate), transactionId);
      }
      await reloadBills();
    } catch (error) {
      setPageError(`Status tagihan gagal diperbarui: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const removeBill = async () => {
    if (!billDeleteId) return;
    try {
      setPageError('');
      await deleteMonthlyBill(billDeleteId);
      await reloadBills();
    } catch (error) {
      setPageError(`Tagihan gagal dihapus: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBillDeleteId(null);
    }
  };

  const changeRangeDate = (target: DateTarget, selected: Date) => {
    const value = dateKey(selected);
    setHistoryRange((current) => ({
      ...current,
      [target]: value,
    }));
  };

  const chooseRangeDate = (target: DateTarget) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseDate(historyRange[target]),
        mode: 'date',
        display: 'default',
        onChange: (_event, selected) => {
          if (selected) changeRangeDate(target, selected);
        },
      });
      return;
    }
    setDateTarget(target);
  };

  const changeHistoryMonth = (increment: number) => {
    const nextMonth = shiftMonth(historyRange.start.slice(0, 7), increment);
    setHistoryRange(monthBounds(nextMonth));
  };

  const downloadReport = async () => {
    try {
      setPageError('');
      if (!isDateKey(historyRange.start) || !isDateKey(historyRange.end) || historyRange.start > historyRange.end) {
        setPageError('Pilih rentang tanggal yang valid. Tanggal awal harus sebelum atau sama dengan tanggal akhir.');
        return;
      }
      setExporting(true);
      await exportFinanceReport({
        startDate: historyRange.start,
        endDate: historyRange.end,
        income: historyIncome,
        expenses: historyExpenses,
        balance: closingBalance,
        bills,
        rows: reportRows,
      });
    } catch (error) {
      setPageError(`Laporan PDF gagal dibuat: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setExporting(false);
    }
  };

  const reportBalance = data.transactions
    .filter((item) => item.date >= historyRange.start && item.date <= historyRange.end)
    .reduce((sum, item) => sum + (item.kind === 'income' ? item.amount : -item.amount), 0);

  return (
    <Page
      title="Log Gold"
      subtitle="Keuangan yang lebih tertata, mengikuti waktu."
      action={
        tab === 'transactions' ? (
          <Button compact title="+ Transaksi" onPress={() => openTransactionForm()} />
        ) : tab === 'bills' ? (
          <Button compact title="+ Tagihan" onPress={() => { setEditingBill(null); setBillError(''); setBillFormOpen(true); }} />
        ) : undefined
      }>
      <Panel style={styles.balanceCard}>
        <View pointerEvents="none" style={[styles.clockWatermark, { borderColor: colors.primary + '18' }]}>
          <View style={[styles.clockHand, { backgroundColor: colors.primary + '20' }]} />
          <View style={[styles.clockHandShort, { backgroundColor: colors.primary + '20' }]} />
          <View style={[styles.clockCenter, { backgroundColor: colors.primary + '22' }]} />
        </View>
        <Text style={[styles.kicker, { color: colors.muted }]}>TOTAL SALDO</Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.balance, { color: colors.text }]}>{money.format(balance)}</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>Ringkasan semua transaksi tersimpan</Text>
        <View style={[styles.chronoLine, { backgroundColor: colors.primary + '24' }]}>
          <View style={[styles.chronoDot, { backgroundColor: colors.primary + '65' }]} />
          <View style={[styles.chronoDot, styles.chronoDotMiddle, { backgroundColor: colors.primary + '40' }]} />
          <View style={[styles.chronoDot, styles.chronoDotEnd, { backgroundColor: colors.primary + '25' }]} />
        </View>
      </Panel>

      {pageError ? (
        <Panel style={[styles.errorPanel, { borderColor: colors.negative + '55' }]}>
          <Text style={{ color: colors.negative, fontSize: 12 }}>{pageError}</Text>
        </Panel>
      ) : null}

      <View style={[styles.tabs, { backgroundColor: colors.surfaceSoft }]}>
        {goldTabs.map((option) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === option.value }}
            key={option.value}
            onPress={() => setTab(option.value)}
            style={[styles.tab, tab === option.value && { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.tabText, { color: tab === option.value ? colors.primary : colors.muted }]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'transactions' ? (
        <>
          <Panel>
            <View style={styles.monthPanel}>
              <Pressable accessibilityRole="button" accessibilityLabel="Bulan sebelumnya" disabled={transactionScope === 'all'} onPress={() => setSelectedMonth((month) => shiftMonth(month, -1))} style={[styles.monthArrow, transactionScope === 'all' && { opacity: 0.4 }]}>
                <Text style={[styles.monthArrowText, { color: colors.primary }]}>‹</Text>
              </Pressable>
              <Text style={[styles.monthLabel, { color: colors.text }]}>{transactionScope === 'all' ? 'Semua bulan' : new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(parseDate(`${selectedMonth}-01`))}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Bulan berikutnya" disabled={transactionScope === 'all'} onPress={() => setSelectedMonth((month) => shiftMonth(month, 1))} style={[styles.monthArrow, transactionScope === 'all' && { opacity: 0.4 }]}>
                <Text style={[styles.monthArrowText, { color: colors.primary }]}>›</Text>
              </Pressable>
            </View>
            <ChoiceGroup label="Tampilkan catatan" value={transactionScope} options={transactionScopes} onChange={setTransactionScope} />
          </Panel>

          <View style={styles.flowRow}>
            <Panel style={styles.flowCard}>
              <Text style={[styles.flowLabel, { color: colors.muted }]}>{transactionScope === 'all' ? 'Total pemasukan' : 'Pemasukan bulan ini'}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.flowValue, { color: colors.positive }]}>{money.format(income)}</Text>
              <View style={[styles.track, { backgroundColor: colors.surfaceSoft }]}>
                <View style={[styles.fill, { width: `${(income / maxFlow) * 100}%`, backgroundColor: colors.positive }]} />
              </View>
            </Panel>
            <Panel style={styles.flowCard}>
              <Text style={[styles.flowLabel, { color: colors.muted }]}>{transactionScope === 'all' ? 'Total pengeluaran' : 'Pengeluaran bulan ini'}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.flowValue, { color: colors.negative }]}>{money.format(expenses)}</Text>
              <View style={[styles.track, { backgroundColor: colors.surfaceSoft }]}>
                <View style={[styles.fill, { width: `${(expenses / maxFlow) * 100}%`, backgroundColor: colors.negative }]} />
              </View>
            </Panel>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{transactionScope === 'all' ? 'Semua riwayat transaksi' : 'Riwayat transaksi bulan ini'}</Text>
          {monthItems.length ? [...monthItems].sort((left, right) => right.date.localeCompare(left.date)).map((transaction) => (
            <Panel key={transaction.id}>
              <View style={styles.transactionRow}>
                <View style={[styles.kindMark, { backgroundColor: transaction.kind === 'income' ? colors.positive + '18' : colors.negative + '18' }]}>
                  <Text style={{ color: transaction.kind === 'income' ? colors.positive : colors.negative, fontWeight: '900' }}>{transaction.kind === 'income' ? '+' : '−'}</Text>
                </View>
                <View style={styles.transactionCopy}>
                  <Text style={[styles.category, { color: colors.text }]}>{transaction.category}</Text>
                  <Text style={[styles.caption, { color: colors.muted }]}>{transaction.date}{transaction.notes ? ` · ${transaction.notes}` : ''}</Text>
                </View>
                <Text style={[styles.amount, { color: transaction.kind === 'income' ? colors.positive : colors.negative }]}>
                  {transaction.kind === 'income' ? '+' : '−'}{money.format(transaction.amount)}
                </Text>
              </View>
              <View style={styles.actions}>
                <Button compact title="Edit" variant="secondary" onPress={() => openTransactionForm(transaction)} />
                <Button compact title="Hapus" variant="quiet" onPress={() => setDeleteId(transaction.id)} />
              </View>
            </Panel>
          )) : <EmptyState title="Belum ada transaksi" description="Catat pemasukan atau pengeluaran untuk bulan ini." />}
        </>
      ) : null}

      {tab === 'bills' ? (
        <>
          <Panel style={styles.billIntro}>
            <Text style={[styles.billIntroTitle, { color: colors.text }]}>Tagihan berulang</Text>
            <Text style={[styles.caption, { color: colors.muted }]}>Catat jatuh tempo bulanan dan tandai pembayaran untuk memasukkannya otomatis ke pengeluaran.</Text>
          </Panel>
          {billsLoading ? <LoadingState label="Memuat tagihan..." /> : null}
          {!billsLoading && bills.length ? bills.map((bill) => (
            <MonthlyBillCard
              bill={bill}
              key={bill.id}
              onTogglePaid={() => { void toggleBillPaid(bill); }}
              onEdit={() => { setEditingBill(bill); setBillError(''); setBillFormOpen(true); }}
              onDelete={() => setBillDeleteId(bill.id)}
            />
          )) : !billsLoading ? (
            <EmptyState title="Belum ada tagihan" description="Tambahkan tagihan berulang pertamamu untuk melacak tanggal jatuh tempo." />
          ) : null}
        </>
      ) : null}

      {tab === 'history' ? (
        <>
          <Panel style={styles.monthPanel}>
            <Pressable accessibilityRole="button" accessibilityLabel="Periode bulan sebelumnya" onPress={() => changeHistoryMonth(-1)} style={styles.monthArrow}>
              <Text style={[styles.monthArrowText, { color: colors.primary }]}>‹</Text>
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.text }]}>{formatMonth(`${historyRange.start.slice(0, 7)}-01`)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Periode bulan berikutnya" onPress={() => changeHistoryMonth(1)} style={styles.monthArrow}>
              <Text style={[styles.monthArrowText, { color: colors.primary }]}>›</Text>
            </Pressable>
          </Panel>
          <Panel>
            <Text style={[styles.rangeTitle, { color: colors.text }]}>Rentang tanggal laporan</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateCell}>
                <Text style={[styles.dateLabel, { color: colors.muted }]}>Dari</Text>
                {Platform.OS === 'web' ? (
                  <Field label="Tanggal mulai" value={historyRange.start} onChangeText={(value) => setHistoryRange((current) => ({ ...current, start: value }))} placeholder="YYYY-MM-DD" />
                ) : (
                  <Button compact title={historyRange.start} variant="secondary" onPress={() => chooseRangeDate('start')} />
                )}
              </View>
              <View style={styles.dateCell}>
                <Text style={[styles.dateLabel, { color: colors.muted }]}>Sampai</Text>
                {Platform.OS === 'web' ? (
                  <Field label="Tanggal akhir" value={historyRange.end} onChangeText={(value) => setHistoryRange((current) => ({ ...current, end: value }))} placeholder="YYYY-MM-DD" />
                ) : (
                  <Button compact title={historyRange.end} variant="secondary" onPress={() => chooseRangeDate('end')} />
                )}
              </View>
            </View>
          </Panel>
          <View style={styles.flowRow}>
            <Panel style={styles.flowCard}>
              <Text style={[styles.flowLabel, { color: colors.muted }]}>Pemasukan</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.flowValue, { color: colors.positive }]}>{money.format(historyIncome)}</Text>
            </Panel>
            <Panel style={styles.flowCard}>
              <Text style={[styles.flowLabel, { color: colors.muted }]}>Pengeluaran</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.flowValue, { color: colors.negative }]}>{money.format(historyExpenses)}</Text>
            </Panel>
          </View>
          <Panel style={styles.closingBalance}>
            <Text style={[styles.flowLabel, { color: colors.muted }]}>Saldo akhir hingga {historyRange.end}</Text>
            <Text style={[styles.flowValue, { color: colors.text }]}>{money.format(closingBalance)}</Text>
            <Text style={[styles.caption, { color: colors.muted }]}>Perubahan saldo pada periode: {money.format(reportBalance)}</Text>
          </Panel>
          <Button title={exporting ? 'Menyiapkan PDF…' : 'Download Laporan PDF'} disabled={exporting} onPress={() => { void downloadReport(); }} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Riwayat transaksi &amp; tagihan</Text>
          {reportRows.length ? reportRows.map((row, index) => (
            <Panel key={`${row.kind}-${row.date}-${row.description}-${index}`}>
              <View style={styles.transactionRow}>
                <View style={[styles.kindMark, { backgroundColor: row.kind === 'income' ? colors.positive + '18' : row.kind === 'expense' ? colors.negative + '18' : colors.primary + '18' }]}>
                  <Text style={{ color: row.kind === 'income' ? colors.positive : row.kind === 'expense' ? colors.negative : colors.primary, fontWeight: '900' }}>
                    {row.kind === 'income' ? '+' : row.kind === 'expense' ? '−' : '◷'}
                  </Text>
                </View>
                <View style={styles.transactionCopy}>
                  <Text style={[styles.category, { color: colors.text }]}>{row.description}</Text>
                  <Text style={[styles.caption, { color: colors.muted }]}>{row.date} · {row.category}</Text>
                  {row.kind === 'bill' ? <Text style={[styles.historyStatus, { color: row.status.endsWith('Lunas') ? colors.positive : colors.negative }]}>{row.status}</Text> : null}
                </View>
                <Text style={[styles.amount, { color: row.kind === 'income' ? colors.positive : row.kind === 'expense' ? colors.negative : colors.text }]}>
                  {row.kind === 'income' ? '+' : row.kind === 'expense' ? '−' : ''}{money.format(row.amount)}
                </Text>
              </View>
            </Panel>
          )) : <EmptyState title="Tidak ada riwayat" description="Tidak ada transaksi atau tagihan pada rentang tanggal yang dipilih." />}
        </>
      ) : null}

      <ModalSheet visible={formOpen} title={editingId ? 'Edit transaksi' : 'Transaksi baru'} onClose={() => setFormOpen(false)}>
        <ChoiceGroup label="Jenis transaksi" value={kind} options={transactionKinds} onChange={(value) => setKind(value as 'income' | 'expense')} />
        <Field label="Nominal (Rp)" value={amount} onChangeText={setAmount} placeholder="50000" keyboardType="numeric" error={transactionFieldErrors.amount} />
        <Field label="Kategori" value={category} onChangeText={setCategory} placeholder="Makan, transportasi, gaji..." error={transactionFieldErrors.category} />
        <Field label="Tanggal (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder={dateKey()} error={transactionFieldErrors.date} />
        <Field label="Catatan" value={notes} onChangeText={setNotes} placeholder="Opsional" multiline />
        <Button title={editingId ? 'Simpan perubahan' : 'Simpan transaksi'} onPress={saveTransaction} />
      </ModalSheet>

      {billFormOpen ? (
        <MonthlyBillForm
          key={editingBill?.id ?? 'new-monthly-bill'}
          visible
          bill={editingBill}
          error={billError}
          onClose={() => { setBillFormOpen(false); setEditingBill(null); }}
          onSave={saveBill}
        />
      ) : null}

      <ConfirmDialog
        visible={Boolean(deleteId)}
        title="Hapus transaksi?"
        message="Transaksi ini akan dihapus dari ringkasan keuangan."
        confirmLabel="Hapus"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteTransaction(deleteId); setDeleteId(null); }}
      />
      <ConfirmDialog
        visible={Boolean(billDeleteId)}
        title="Hapus tagihan?"
        message="Tagihan ini akan dihapus. Transaksi pengeluaran yang sudah tercatat tetap ada di riwayat."
        confirmLabel="Hapus"
        danger
        onCancel={() => setBillDeleteId(null)}
        onConfirm={() => { void removeBill(); }}
      />

      {Platform.OS === 'ios' && dateTarget ? (
        <Modal transparent animationType="slide" onRequestClose={() => setDateTarget(null)}>
          <View style={styles.pickerBackdrop}>
            <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
              <View style={styles.pickerActions}>
                <Button compact title="Batal" variant="quiet" onPress={() => setDateTarget(null)} />
                <Button compact title="Pilih tanggal" onPress={() => setDateTarget(null)} />
              </View>
              <DateTimePicker
                value={parseDate(historyRange[dateTarget])}
                mode="date"
                display="spinner"
                onChange={(_event, selected) => { if (selected && dateTarget) changeRangeDate(dateTarget, selected); }}
                themeVariant={data.theme}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  balanceCard: { paddingVertical: 20, overflow: 'hidden' },
  clockWatermark: { position: 'absolute', width: 118, height: 118, borderRadius: 59, borderWidth: 2, right: -15, top: -18, alignItems: 'center', justifyContent: 'center' },
  clockHand: { position: 'absolute', width: 2, height: 35, borderRadius: 1, top: 22 },
  clockHandShort: { position: 'absolute', width: 24, height: 2, borderRadius: 1, top: 56, left: 58, transform: [{ rotate: '-35deg' }] },
  clockCenter: { width: 7, height: 7, borderRadius: 4 },
  chronoLine: { height: 2, marginTop: 15, marginRight: 14, position: 'relative' },
  chronoDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, top: -2, left: '12%' },
  chronoDotMiddle: { left: '53%' },
  chronoDotEnd: { left: '91%' },
  kicker: { fontSize: 10, fontWeight: '800' },
  balance: { fontSize: 28, fontWeight: '800', marginTop: 9 },
  caption: { fontSize: 10, lineHeight: 16, marginTop: 4 },
  errorPanel: { paddingVertical: 12 },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4, marginBottom: 12 },
  tab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1, borderColor: 'transparent', borderRadius: 11 },
  tabText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  monthPanel: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  monthArrow: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  monthArrowText: { fontSize: 31, lineHeight: 34, fontWeight: '500' },
  monthLabel: { fontSize: 14, fontWeight: '800' },
  flowRow: { flexDirection: 'row', gap: 8 },
  flowCard: { flex: 1, minWidth: 0, padding: 12 },
  flowLabel: { fontSize: 10, fontWeight: '700' },
  flowValue: { fontSize: 15, fontWeight: '800', marginTop: 8 },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
  fill: { height: '100%' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 11, marginBottom: 10 },
  transactionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kindMark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  transactionCopy: { flex: 1, minWidth: 0 },
  category: { fontSize: 13, fontWeight: '800' },
  amount: { fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  empty: { textAlign: 'center', fontSize: 13, lineHeight: 19, paddingVertical: 8 },
  billIntro: { paddingVertical: 14 },
  billIntroTitle: { fontSize: 14, fontWeight: '800' },
  rangeTitle: { fontSize: 13, fontWeight: '800', marginBottom: 12 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateCell: { flex: 1, minWidth: 0 },
  dateLabel: { fontSize: 11, fontWeight: '700', marginBottom: 7 },
  closingBalance: { paddingVertical: 13 },
  historyStatus: { fontSize: 10, fontWeight: '800', marginTop: 3 },
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { paddingTop: 10, paddingBottom: 22, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  pickerActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
});
