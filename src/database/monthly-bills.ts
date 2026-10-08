import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LocalMonthlyBill, LocalMonthlyBillDraft, LocalMonthlyBillStatus } from '@/types';

export type MonthlyBill = LocalMonthlyBill;
export type MonthlyBillDraft = LocalMonthlyBillDraft;
export type MonthlyBillStatus = LocalMonthlyBillStatus;

const STORAGE_KEY = 'timesurvive.monthly-bills.v1';

function isMonthlyBill(value: unknown): value is MonthlyBill {
  if (!value || typeof value !== 'object') return false;
  const bill = value as Record<string, unknown>;
  return (
    typeof bill.id === 'string' &&
    typeof bill.name === 'string' &&
    typeof bill.amount === 'number' &&
    typeof bill.dueDay === 'number' &&
    typeof bill.category === 'string' &&
    (bill.status === 'paid' || bill.status === 'unpaid') &&
    (typeof bill.paidDate === 'string' || bill.paidDate === null) &&
    (typeof bill.paidTransactionId === 'string' || bill.paidTransactionId === null)
  );
}

async function readBills(): Promise<MonthlyBill[]> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isMonthlyBill)) {
    throw new Error('Data tagihan yang tersimpan tidak valid.');
  }
  return parsed;
}

async function writeBills(bills: MonthlyBill[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

export async function listMonthlyBills(): Promise<MonthlyBill[]> {
  return (await readBills()).sort((left, right) => left.dueDay - right.dueDay || left.name.localeCompare(right.name));
}

export async function createMonthlyBill(bill: MonthlyBillDraft): Promise<string> {
  const bills = await readBills();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  bills.push({ ...bill, id, paidDate: null, paidTransactionId: null });
  await writeBills(bills);
  return id;
}

export async function updateMonthlyBill(id: string, changes: MonthlyBillDraft): Promise<void> {
  const bills = await readBills();
  const index = bills.findIndex((bill) => bill.id === id);
  if (index < 0) throw new Error('Tagihan tidak ditemukan.');
  bills[index] = { ...bills[index], ...changes };
  await writeBills(bills);
}

export async function setMonthlyBillPaid(
  id: string,
  paidDate: string,
  paidTransactionId: string,
): Promise<void> {
  const bills = await readBills();
  const index = bills.findIndex((bill) => bill.id === id);
  if (index < 0) throw new Error('Tagihan tidak ditemukan.');
  bills[index] = { ...bills[index], status: 'paid', paidDate, paidTransactionId };
  await writeBills(bills);
}

export async function setMonthlyBillUnpaid(id: string): Promise<void> {
  const bills = await readBills();
  const index = bills.findIndex((bill) => bill.id === id);
  if (index < 0) throw new Error('Tagihan tidak ditemukan.');
  bills[index] = { ...bills[index], status: 'unpaid', paidDate: null, paidTransactionId: null };
  await writeBills(bills);
}

export async function deleteMonthlyBill(id: string): Promise<void> {
  const bills = await readBills();
  await writeBills(bills.filter((bill) => bill.id !== id));
}
