import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

import type {
  AddDailyLogInput,
  AddGoldTransactionInput,
  AddGamingLogInput,
  AddMonthlyBillInput,
  DailyLog,
  GoldLog,
  GamingLog,
  MonthlyBill,
  RegisterUserInput,
  UpdateDailyLogInput,
  UpdateUserProfileInput,
  UserProfile,
} from '@/database/models';
import type { CoreDatabaseExport } from '@/types';

const DATABASE_NAME = 'timesurvive-core.db';
const DATABASE_VERSION = 1;

type UserRow = {
  id: number;
  username: string;
  email: string;
  password: string;
  role_category: UserProfile['roleCategory'];
  avatar_url: string | null;
  created_at: string;
};

type DailyLogRow = {
  id: number;
  user_id: number;
  title: string;
  time_start: string;
  time_end: string | null;
  date: string;
  is_completed: number;
};

type GamingLogRow = {
  id: number;
  user_id: number;
  game_title: string;
  duration_minutes: number;
  platform: string | null;
  rating: number | null;
  notes: string | null;
  date: string;
};

type GoldLogRow = {
  id: number;
  user_id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  notes: string | null;
  date: string;
};

type MonthlyBillRow = {
  id: number;
  user_id: number;
  bill_name: string;
  amount: number;
  due_day: number;
  category: string | null;
  status: 'paid' | 'unpaid';
  last_paid_date: string | null;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function logAndRethrow<T>(operation: string, task: () => Promise<T>): Promise<T> {
  return task().catch((error: unknown) => {
    console.error(`[TimeSurvive database] ${operation} failed`, error);
    throw error;
  });
}

function createSchema(database: SQLite.SQLiteDatabase) {
  return database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role_category TEXT DEFAULT 'General',
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      time_start TEXT NOT NULL,
      time_end TEXT,
      date DATE NOT NULL,
      is_completed INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gaming_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_title TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      platform TEXT,
      rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
      notes TEXT,
      date DATE NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gold_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount REAL NOT NULL CHECK (amount > 0),
      category TEXT NOT NULL,
      notes TEXT,
      date DATE NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS monthly_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bill_name TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
      category TEXT,
      status TEXT DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
      last_paid_date DATE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date, time_start);
    CREATE INDEX IF NOT EXISTS idx_gaming_logs_user_date ON gaming_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_gold_logs_user_date ON gold_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_monthly_bills_user_due ON monthly_bills(user_id, due_day);
  `);
}

async function ensureDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await database.execAsync('PRAGMA foreign_keys = ON;');
      await createSchema(database);
      await database.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
      return database;
    })().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export function initDatabase(): Promise<void> {
  return logAndRethrow('initDatabase', async () => {
    await ensureDatabase();
  });
}

export function exportCoreDatabase(): Promise<CoreDatabaseExport> {
  return logAndRethrow('exportCoreDatabase', async () => {
    const database = await getDatabase();
    const [users, dailyLogs, gamingLogs, goldLogs, monthlyBills] = await Promise.all([
      database.getAllAsync<Omit<UserRow, 'password'>>(
        `SELECT id, username, email, role_category, avatar_url, created_at FROM users ORDER BY id`,
      ),
      database.getAllAsync<DailyLogRow>('SELECT * FROM daily_logs ORDER BY date, time_start, id'),
      database.getAllAsync<GamingLogRow>('SELECT * FROM gaming_logs ORDER BY date, id'),
      database.getAllAsync<GoldLogRow>('SELECT * FROM gold_logs ORDER BY date, id'),
      database.getAllAsync<MonthlyBillRow>('SELECT * FROM monthly_bills ORDER BY due_day, id'),
    ]);
    return {
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        roleCategory: user.role_category,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      })),
      dailyLogs: dailyLogs.map(toDailyLog),
      gamingLogs: gamingLogs.map(toGamingLog),
      goldLogs: goldLogs.map(toGoldLog),
      monthlyBills: monthlyBills.map(toMonthlyBill),
    };
  });
}

async function getDatabase() {
  return ensureDatabase();
}

function toUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    roleCategory: row.role_category,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

function toDailyLog(row: DailyLogRow): DailyLog {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    timeStart: row.time_start,
    timeEnd: row.time_end,
    date: row.date,
    isCompleted: row.is_completed === 1,
  };
}

function toGamingLog(row: GamingLogRow): GamingLog {
  return {
    id: row.id,
    userId: row.user_id,
    gameTitle: row.game_title,
    durationMinutes: row.duration_minutes,
    platform: row.platform,
    rating: row.rating,
    notes: row.notes,
    date: row.date,
  };
}

function toGoldLog(row: GoldLogRow): GoldLog {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: row.amount,
    category: row.category,
    notes: row.notes,
    date: row.date,
  };
}

function toMonthlyBill(row: MonthlyBillRow): MonthlyBill {
  return {
    id: row.id,
    userId: row.user_id,
    billName: row.bill_name,
    amount: row.amount,
    dueDay: row.due_day,
    category: row.category,
    status: row.status,
    lastPaidDate: row.last_paid_date,
  };
}

function passwordHash(password: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

function randomSalt() {
  return Array.from(Crypto.getRandomBytes(16), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function equalSecret(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function validateDate(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must use YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} must be a valid calendar date.`);
  }
}

function validatePositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number.');
  }
}

export function registerUser(input: RegisterUserInput): Promise<number> {
  return logAndRethrow('registerUser', async () => {
    const username = input.username.trim();
    const email = input.email.trim().toLowerCase();
    if (!username || !email || input.password.length < 8) {
      throw new Error('Username, email, and a password of at least 8 characters are required.');
    }
    const database = await getDatabase();
    const salt = randomSalt();
    const password = `${salt}:${await passwordHash(input.password, salt)}`;
    const result = await database.runAsync(
      `INSERT INTO users (username, email, password, role_category, avatar_url)
       VALUES (?, ?, ?, ?, ?)`,
      username,
      email,
      password,
      input.roleCategory ?? 'General',
      input.avatarUrl ?? null,
    );
    return result.lastInsertRowId;
  });
}

export function loginUser(identifier: string, password: string): Promise<UserProfile | null> {
  return logAndRethrow('loginUser', async () => {
    const database = await getDatabase();
    const user = await database.getFirstAsync<UserRow>(
      `SELECT id, username, email, password, role_category, avatar_url, created_at
       FROM users WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE`,
      identifier.trim(),
      identifier.trim(),
    );
    if (!user) return null;
    const [salt, expectedHash] = user.password.split(':');
    if (!salt || !expectedHash || !equalSecret(await passwordHash(password, salt), expectedHash)) return null;
    return toUserProfile(user);
  });
}

export function getUserProfile(userId: number): Promise<UserProfile | null> {
  return logAndRethrow('getUserProfile', async () => {
    const database = await getDatabase();
    const user = await database.getFirstAsync<UserRow>(
      `SELECT id, username, email, password, role_category, avatar_url, created_at
       FROM users WHERE id = ?`,
      userId,
    );
    return user ? toUserProfile(user) : null;
  });
}

export function updateUserProfile(userId: number, changes: UpdateUserProfileInput): Promise<void> {
  return logAndRethrow('updateUserProfile', async () => {
    const fields: string[] = [];
    const values: (string | null | number)[] = [];
    if (changes.username !== undefined) {
      if (!changes.username.trim()) throw new Error('Username cannot be empty.');
      fields.push('username = ?');
      values.push(changes.username.trim());
    }
    if (changes.email !== undefined) {
      if (!changes.email.trim()) throw new Error('Email cannot be empty.');
      fields.push('email = ?');
      values.push(changes.email.trim().toLowerCase());
    }
    if (changes.roleCategory !== undefined) {
      fields.push('role_category = ?');
      values.push(changes.roleCategory);
    }
    if (changes.avatarUrl !== undefined) {
      fields.push('avatar_url = ?');
      values.push(changes.avatarUrl);
    }
    if (fields.length === 0) return;
    const database = await getDatabase();
    const result = await database.runAsync(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      ...values,
      userId,
    );
    if (result.changes === 0) throw new Error(`User ${userId} was not found.`);
  });
}

export function getDailyLogsByDate(userId: number, date: string): Promise<DailyLog[]> {
  return logAndRethrow('getDailyLogsByDate', async () => {
    validateDate(date, 'date');
    const database = await getDatabase();
    const rows = await database.getAllAsync<DailyLogRow>(
      'SELECT * FROM daily_logs WHERE user_id = ? AND date = ? ORDER BY time_start, id',
      userId,
      date,
    );
    return rows.map(toDailyLog);
  });
}

export function addDailyLog(input: AddDailyLogInput): Promise<number> {
  return logAndRethrow('addDailyLog', async () => {
    validateDate(input.date, 'date');
    if (!input.title.trim() || !input.timeStart.trim()) throw new Error('Title and start time are required.');
    const database = await getDatabase();
    const result = await database.runAsync(
      `INSERT INTO daily_logs (user_id, title, time_start, time_end, date, is_completed)
       VALUES (?, ?, ?, ?, ?, ?)`,
      input.userId,
      input.title.trim(),
      input.timeStart,
      input.timeEnd ?? null,
      input.date,
      input.isCompleted ? 1 : 0,
    );
    return result.lastInsertRowId;
  });
}

export function toggleDailyLogStatus(id: number, isCompleted: boolean): Promise<void> {
  return logAndRethrow('toggleDailyLogStatus', async () => {
    const database = await getDatabase();
    const result = await database.runAsync(
      'UPDATE daily_logs SET is_completed = ? WHERE id = ?',
      isCompleted ? 1 : 0,
      id,
    );
    if (result.changes === 0) throw new Error(`Daily log ${id} was not found.`);
  });
}

export function updateDailyLog(id: number, changes: UpdateDailyLogInput): Promise<void> {
  return logAndRethrow('updateDailyLog', async () => {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (changes.title !== undefined) {
      if (!changes.title.trim()) throw new Error('Title cannot be empty.');
      fields.push('title = ?');
      values.push(changes.title.trim());
    }
    if (changes.timeStart !== undefined) {
      fields.push('time_start = ?');
      values.push(changes.timeStart);
    }
    if (changes.timeEnd !== undefined) {
      fields.push('time_end = ?');
      values.push(changes.timeEnd);
    }
    if (changes.date !== undefined) {
      validateDate(changes.date, 'date');
      fields.push('date = ?');
      values.push(changes.date);
    }
    if (changes.isCompleted !== undefined) {
      fields.push('is_completed = ?');
      values.push(changes.isCompleted ? 1 : 0);
    }
    if (!fields.length) return;
    const database = await getDatabase();
    const result = await database.runAsync(
      `UPDATE daily_logs SET ${fields.join(', ')} WHERE id = ?`,
      ...values,
      id,
    );
    if (result.changes === 0) throw new Error(`Daily log ${id} was not found.`);
  });
}

export function deleteDailyLog(id: number): Promise<void> {
  return logAndRethrow('deleteDailyLog', async () => {
    const database = await getDatabase();
    const result = await database.runAsync('DELETE FROM daily_logs WHERE id = ?', id);
    if (result.changes === 0) throw new Error(`Daily log ${id} was not found.`);
  });
}

export function getGamingLogsByDate(userId: number, date: string): Promise<GamingLog[]> {
  return logAndRethrow('getGamingLogsByDate', async () => {
    validateDate(date, 'date');
    const database = await getDatabase();
    const rows = await database.getAllAsync<GamingLogRow>(
      'SELECT * FROM gaming_logs WHERE user_id = ? AND date = ? ORDER BY id DESC',
      userId,
      date,
    );
    return rows.map(toGamingLog);
  });
}

export function addGamingLog(input: AddGamingLogInput): Promise<number> {
  return logAndRethrow('addGamingLog', async () => {
    validateDate(input.date, 'date');
    if (!input.gameTitle.trim()) throw new Error('Game title is required.');
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
      throw new Error('Duration must be a positive whole number of minutes.');
    }
    if (input.rating !== null && (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)) {
      throw new Error('Rating must be between 1 and 5.');
    }
    const database = await getDatabase();
    const result = await database.runAsync(
      `INSERT INTO gaming_logs (user_id, game_title, duration_minutes, platform, rating, notes, date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.userId,
      input.gameTitle.trim(),
      input.durationMinutes,
      input.platform,
      input.rating,
      input.notes,
      input.date,
    );
    return result.lastInsertRowId;
  });
}

export function getTotalGamingTimeToday(userId: number, date: string): Promise<number> {
  return logAndRethrow('getTotalGamingTimeToday', async () => {
    validateDate(date, 'date');
    const database = await getDatabase();
    const row = await database.getFirstAsync<{ total_minutes: number | null }>(
      'SELECT SUM(duration_minutes) AS total_minutes FROM gaming_logs WHERE user_id = ? AND date = ?',
      userId,
      date,
    );
    return row?.total_minutes ?? 0;
  });
}

export function deleteGamingLog(id: number): Promise<void> {
  return logAndRethrow('deleteGamingLog', async () => {
    const database = await getDatabase();
    const result = await database.runAsync('DELETE FROM gaming_logs WHERE id = ?', id);
    if (result.changes === 0) throw new Error(`Gaming log ${id} was not found.`);
  });
}

export function getGoldLogsByDateRange(userId: number, startDate: string, endDate: string): Promise<GoldLog[]> {
  return logAndRethrow('getGoldLogsByDateRange', async () => {
    validateDate(startDate, 'startDate');
    validateDate(endDate, 'endDate');
    if (startDate > endDate) throw new Error('startDate must be on or before endDate.');
    const database = await getDatabase();
    const rows = await database.getAllAsync<GoldLogRow>(
      `SELECT * FROM gold_logs WHERE user_id = ? AND date BETWEEN ? AND ?
       ORDER BY date DESC, id DESC`,
      userId,
      startDate,
      endDate,
    );
    return rows.map(toGoldLog);
  });
}

export function addGoldTransaction(input: AddGoldTransactionInput): Promise<number> {
  return logAndRethrow('addGoldTransaction', async () => {
    validateDate(input.date, 'date');
    validatePositiveAmount(input.amount);
    if (!input.category.trim()) throw new Error('Transaction category is required.');
    const database = await getDatabase();
    const result = await database.runAsync(
      `INSERT INTO gold_logs (user_id, type, amount, category, notes, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      input.userId,
      input.type,
      input.amount,
      input.category.trim(),
      input.notes,
      input.date,
    );
    return result.lastInsertRowId;
  });
}

export function getWalletBalance(userId: number): Promise<number> {
  return logAndRethrow('getWalletBalance', async () => {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ balance: number | null }>(
      `SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS balance
       FROM gold_logs WHERE user_id = ?`,
      userId,
    );
    return result?.balance ?? 0;
  });
}

export function deleteGoldTransaction(id: number): Promise<void> {
  return logAndRethrow('deleteGoldTransaction', async () => {
    const database = await getDatabase();
    const result = await database.runAsync('DELETE FROM gold_logs WHERE id = ?', id);
    if (result.changes === 0) throw new Error(`Gold transaction ${id} was not found.`);
  });
}

export function getMonthlyBills(userId: number): Promise<MonthlyBill[]> {
  return logAndRethrow('getMonthlyBills', async () => {
    const database = await getDatabase();
    const rows = await database.getAllAsync<MonthlyBillRow>(
      'SELECT * FROM monthly_bills WHERE user_id = ? ORDER BY due_day, id',
      userId,
    );
    return rows.map(toMonthlyBill);
  });
}

export function addMonthlyBill(input: AddMonthlyBillInput): Promise<number> {
  return logAndRethrow('addMonthlyBill', async () => {
    validatePositiveAmount(input.amount);
    if (!input.billName.trim()) throw new Error('Bill name is required.');
    if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) {
      throw new Error('dueDay must be an integer between 1 and 31.');
    }
    const database = await getDatabase();
    const result = await database.runAsync(
      `INSERT INTO monthly_bills (user_id, bill_name, amount, due_day, category, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      input.userId,
      input.billName.trim(),
      input.amount,
      input.dueDay,
      input.category,
      input.status ?? 'unpaid',
    );
    return result.lastInsertRowId;
  });
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function markBillAsPaid(
  billId: number,
  userId: number,
  paidDate = localDateKey(new Date()),
): Promise<void> {
  return logAndRethrow('markBillAsPaid', async () => {
    validateDate(paidDate, 'paidDate');
    const database = await getDatabase();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const bill = await transaction.getFirstAsync<MonthlyBillRow>(
        'SELECT * FROM monthly_bills WHERE id = ? AND user_id = ?',
        billId,
        userId,
      );
      if (!bill) throw new Error(`Monthly bill ${billId} was not found for user ${userId}.`);
      if (bill.status === 'paid') throw new Error(`Monthly bill ${billId} has already been paid.`);
      await transaction.runAsync(
        'UPDATE monthly_bills SET status = ?, last_paid_date = ? WHERE id = ? AND user_id = ?',
        'paid',
        paidDate,
        billId,
        userId,
      );
      await transaction.runAsync(
        `INSERT INTO gold_logs (user_id, type, amount, category, notes, date)
         VALUES (?, 'expense', ?, ?, ?, ?)`,
        userId,
        bill.amount,
        bill.category ?? 'Tagihan',
        `Pembayaran tagihan: ${bill.bill_name}`,
        paidDate,
      );
    });
  });
}

export function deleteMonthlyBill(billId: number, userId: number): Promise<void> {
  return logAndRethrow('deleteMonthlyBill', async () => {
    const database = await getDatabase();
    const result = await database.runAsync(
      'DELETE FROM monthly_bills WHERE id = ? AND user_id = ?',
      billId,
      userId,
    );
    if (result.changes === 0) throw new Error(`Monthly bill ${billId} was not found for user ${userId}.`);
  });
}
