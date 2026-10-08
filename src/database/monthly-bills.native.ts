import * as SQLite from 'expo-sqlite';
import type { LocalMonthlyBill, LocalMonthlyBillDraft, LocalMonthlyBillStatus } from '@/types';

export type MonthlyBill = LocalMonthlyBill;
export type MonthlyBillDraft = LocalMonthlyBillDraft;
export type MonthlyBillStatus = LocalMonthlyBillStatus;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function logAndRethrow<T>(operation: string, task: () => Promise<T>): Promise<T> {
  return task().catch((error: unknown) => {
    console.error(`[TimeSurvive database] ${operation} failed`, error);
    throw error;
  });
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync('timesurvive.db');
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS monthly_bills (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
          category TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid')),
          paid_date TEXT,
          paid_transaction_id TEXT
        );
      `);
      return database;
    })().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function listMonthlyBills(): Promise<MonthlyBill[]> {
  return logAndRethrow('listMonthlyBills', async () => {
    const database = await getDatabase();
    const rows = await database.getAllAsync<{
      id: string;
      name: string;
      amount: number;
      due_day: number;
      category: string;
      status: MonthlyBillStatus;
      paid_date: string | null;
      paid_transaction_id: string | null;
    }>('SELECT * FROM monthly_bills ORDER BY due_day, name COLLATE NOCASE');
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      dueDay: row.due_day,
      category: row.category,
      status: row.status,
      paidDate: row.paid_date,
      paidTransactionId: row.paid_transaction_id,
    }));
  });
}

export async function createMonthlyBill(bill: MonthlyBillDraft): Promise<string> {
  return logAndRethrow('createMonthlyBill', async () => {
    const database = await getDatabase();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await database.runAsync(
      'INSERT INTO monthly_bills (id, name, amount, due_day, category, status) VALUES (?, ?, ?, ?, ?, ?)',
      id,
      bill.name,
      bill.amount,
      bill.dueDay,
      bill.category,
      bill.status,
    );
    return id;
  });
}

export async function updateMonthlyBill(id: string, bill: MonthlyBillDraft): Promise<void> {
  return logAndRethrow('updateMonthlyBill', async () => {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE monthly_bills SET name = ?, amount = ?, due_day = ?, category = ?, status = ? WHERE id = ?',
      bill.name,
      bill.amount,
      bill.dueDay,
      bill.category,
      bill.status,
      id,
    );
  });
}

export async function setMonthlyBillPaid(
  id: string,
  paidDate: string,
  paidTransactionId: string,
): Promise<void> {
  return logAndRethrow('setMonthlyBillPaid', async () => {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE monthly_bills SET status = ?, paid_date = ?, paid_transaction_id = ? WHERE id = ?',
      'paid',
      paidDate,
      paidTransactionId,
      id,
    );
  });
}

export async function setMonthlyBillUnpaid(id: string): Promise<void> {
  return logAndRethrow('setMonthlyBillUnpaid', async () => {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE monthly_bills SET status = ?, paid_date = NULL, paid_transaction_id = NULL WHERE id = ?',
      'unpaid',
      id,
    );
  });
}

export async function deleteMonthlyBill(id: string): Promise<void> {
  return logAndRethrow('deleteMonthlyBill', async () => {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM monthly_bills WHERE id = ?', id);
  });
}
