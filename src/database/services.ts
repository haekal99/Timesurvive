import type { CoreDatabaseExport } from '@/types';

export function exportCoreDatabase(): Promise<CoreDatabaseExport> {
  return Promise.resolve({
    users: [],
    dailyLogs: [],
    gamingLogs: [],
    goldLogs: [],
    monthlyBills: [],
  });
}
