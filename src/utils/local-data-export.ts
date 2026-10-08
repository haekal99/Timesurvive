import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { listMonthlyBills } from '@/database/monthly-bills';
import { exportCoreDatabase } from '@/database';
import type { LocalDataExport, LocalDataExportFormat, PersistedAppData } from '@/types';

function csvCell(value: string | number) {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(data: LocalDataExport) {
  const lines = ['record_type,id,date,details'];
  const addRecord = (type: string, id: string, date: string, details: object) => {
    lines.push([type, id, date, JSON.stringify(details)].map(csvCell).join(','));
  };

  if (data.profile) {
    addRecord('profile', data.profile.email, data.profile.joinedAt, data.profile);
  }
  for (const routine of data.routines) {
    addRecord('routine', routine.id, routine.date, routine);
  }
  for (const game of data.games) {
    addRecord('game', game.id, game.date, game);
  }
  for (const transaction of data.transactions) {
    addRecord('transaction', transaction.id, transaction.date, transaction);
  }
  for (const bill of data.monthlyBills) {
    addRecord('monthly_bill', bill.id, '', bill);
  }
  for (const day of data.completedDays) {
    addRecord('completed_day', day, day, { date: day });
  }
  for (const user of data.sqliteDatabase.users) {
    addRecord('sqlite_user', String(user.id), user.createdAt, user);
  }
  for (const log of data.sqliteDatabase.dailyLogs) {
    addRecord('sqlite_daily_log', String(log.id), log.date, log);
  }
  for (const log of data.sqliteDatabase.gamingLogs) {
    addRecord('sqlite_gaming_log', String(log.id), log.date, log);
  }
  for (const log of data.sqliteDatabase.goldLogs) {
    addRecord('sqlite_gold_log', String(log.id), log.date, log);
  }
  for (const bill of data.sqliteDatabase.monthlyBills) {
    addRecord('sqlite_monthly_bill', String(bill.id), '', bill);
  }
  return lines.join('\r\n');
}

export async function exportLocalData(data: PersistedAppData, format: LocalDataExportFormat): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Ekspor file lokal tersedia di aplikasi Android dan iOS.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Fitur berbagi file tidak tersedia di perangkat ini.');
  }

  const bills = await listMonthlyBills();
  const sqliteDatabase = await exportCoreDatabase();
  const snapshot: LocalDataExport = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: data.profile
      ? {
          username: data.profile.username,
          email: data.profile.email,
          role: data.profile.role,
          joinedAt: data.profile.joinedAt,
        }
      : null,
    routines: data.routines,
    games: data.games,
    transactions: data.transactions,
    monthlyBills: bills,
    completedDays: data.completedDays,
    sqliteDatabase,
  };
  const extension = format === 'json' ? 'json' : 'csv';
  const content =
    format === 'json'
      ? JSON.stringify(snapshot, null, 2)
      : toCsv(snapshot);
  const file = new File(Paths.cache, `timesurvive-backup-${Date.now()}.${extension}`);
  file.create({ overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Ekspor data TimeSurvive',
    mimeType: format === 'json' ? 'application/json' : 'text/csv',
    UTI: format === 'json' ? 'public.json' : 'public.comma-separated-values-text',
  });
}
