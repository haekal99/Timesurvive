import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ChoiceGroup, Field, ModalSheet, Panel, useColors } from '@/components/app-ui';
import type { MonthlyBill, MonthlyBillStatus } from '@/database/monthly-bills';
import { parseRupiahAmount } from '@/utils/validation';

const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const billStatuses = [
  { label: 'Belum lunas', value: 'unpaid' },
  { label: 'Lunas', value: 'paid' },
];

export function MonthlyBillForm({
  visible,
  bill,
  error,
  onClose,
  onSave,
}: {
  visible: boolean;
  bill: MonthlyBill | null;
  error: string;
  onClose: () => void;
  onSave: (draft: { name: string; amount: number; dueDay: number; category: string; status: MonthlyBillStatus }) => Promise<void>;
}) {
  const colors = useColors();
  const [name, setName] = useState(() => bill?.name ?? '');
  const [amount, setAmount] = useState(() => (bill ? String(bill.amount) : ''));
  const [dueDay, setDueDay] = useState(() => (bill ? String(bill.dueDay) : ''));
  const [category, setCategory] = useState(() => bill?.category ?? '');
  const [status, setStatus] = useState<MonthlyBillStatus>(() => bill?.status ?? 'unpaid');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; amount?: string; dueDay?: string; category?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const parsedAmount = parseRupiahAmount(amount);
    const parsedDueDay = Number(dueDay);
    const errors = {
      name: name.trim() ? undefined : 'Nama tagihan wajib diisi.',
      amount: parsedAmount !== null ? undefined : 'Masukkan nominal Rupiah positif, misalnya 250000.',
      dueDay: /^\d+$/.test(dueDay) && Number.isInteger(parsedDueDay) && parsedDueDay >= 1 && parsedDueDay <= 31
        ? undefined
        : 'Masukkan tanggal antara 1 dan 31.',
      category: category.trim() ? undefined : 'Kategori tagihan wajib diisi.',
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean) || parsedAmount === null) {
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        amount: parsedAmount,
        dueDay: parsedDueDay,
        category: category.trim(),
        status,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet visible={visible} title={bill ? 'Edit tagihan' : 'Tambah tagihan'} onClose={onClose}>
      <Field label="Nama tagihan" value={name} onChangeText={setName} placeholder="Contoh: Internet rumah" error={fieldErrors.name} />
      <Field label="Nominal (Rp)" value={amount} onChangeText={setAmount} placeholder="250000" keyboardType="numeric" error={fieldErrors.amount} />
      <Field label="Jatuh tempo setiap tanggal" value={dueDay} onChangeText={setDueDay} placeholder="1 - 31" keyboardType="numeric" error={fieldErrors.dueDay} />
      <Field label="Kategori" value={category} onChangeText={setCategory} placeholder="Rumah, utilitas, langganan..." error={fieldErrors.category} />
      <ChoiceGroup label="Status pembayaran" value={status} options={billStatuses} onChange={(value) => setStatus(value as MonthlyBillStatus)} />
      {error ? <Text style={[styles.formError, { color: colors.negative }]}>{error}</Text> : null}
      <Button title={bill ? 'Simpan perubahan' : 'Simpan tagihan'} loading={saving} disabled={saving} onPress={() => { void submit(); }} />
    </ModalSheet>
  );
}

export function MonthlyBillCard({
  bill,
  onEdit,
  onDelete,
  onTogglePaid,
}: {
  bill: MonthlyBill;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePaid: () => void;
}) {
  const colors = useColors();
  const paid = bill.status === 'paid';
  return (
    <Panel>
      <View style={styles.cardTop}>
        <View style={[styles.dueBadge, { backgroundColor: colors.primary + '16' }]}>
          <Text style={[styles.dueNumber, { color: colors.primary }]}>{String(bill.dueDay).padStart(2, '0')}</Text>
          <Text style={[styles.dueLabel, { color: colors.primary }]}>TGL</Text>
        </View>
        <View style={styles.billCopy}>
          <Text style={[styles.billName, { color: colors.text }]}>{bill.name}</Text>
          <Text style={[styles.billMeta, { color: colors.muted }]}>{bill.category} · Jatuh tempo tiap tanggal {bill.dueDay}</Text>
          {bill.paidDate ? <Text style={[styles.billMeta, { color: colors.muted }]}>Dibayar {bill.paidDate}</Text> : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: paid ? colors.positive + '18' : colors.negative + '18' }]}>
          <Text style={{ color: paid ? colors.positive : colors.negative, fontSize: 10, fontWeight: '800' }}>
            {paid ? 'LUNAS' : 'BELUM LUNAS'}
          </Text>
        </View>
      </View>
      <Text style={[styles.billAmount, { color: colors.text }]}>{money.format(bill.amount)}</Text>
      <View style={styles.actions}>
        <Button compact title={paid ? 'Tandai belum lunas' : 'Tandai lunas'} variant="secondary" onPress={onTogglePaid} />
        <Button compact title="Edit" variant="quiet" onPress={onEdit} />
        <Button compact title="Hapus" variant="quiet" onPress={onDelete} />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  formError: { fontSize: 12, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dueBadge: { width: 45, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dueNumber: { fontSize: 17, fontWeight: '900', lineHeight: 19 },
  dueLabel: { fontSize: 8, fontWeight: '800', marginTop: 1 },
  billCopy: { flex: 1, minWidth: 0 },
  billName: { fontSize: 14, fontWeight: '800' },
  billMeta: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6, maxWidth: 94 },
  billAmount: { fontSize: 18, fontWeight: '800', marginTop: 14 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 12 },
});
