export type ThemeMode = 'light' | 'dark';

export type UserRoleCategory = 'General' | 'Gamer' | 'Professional';

export type UserProfile = {
  id: number;
  username: string;
  email: string;
  roleCategory: UserRoleCategory;
  avatarUrl: string | null;
  createdAt: string;
};

export type RegisterUserInput = {
  username: string;
  email: string;
  password: string;
  roleCategory?: UserRoleCategory;
  avatarUrl?: string | null;
};

export type UpdateUserProfileInput = Partial<
  Pick<UserProfile, 'username' | 'email' | 'roleCategory' | 'avatarUrl'>
>;

export type DailyLog = {
  id: number;
  userId: number;
  title: string;
  timeStart: string;
  timeEnd: string | null;
  date: string;
  isCompleted: boolean;
};

export type AddDailyLogInput = Omit<DailyLog, 'id' | 'isCompleted'> & { isCompleted?: boolean };
export type UpdateDailyLogInput = Partial<
  Pick<DailyLog, 'title' | 'timeStart' | 'timeEnd' | 'date' | 'isCompleted'>
>;

export type GamingLog = {
  id: number;
  userId: number;
  gameTitle: string;
  durationMinutes: number;
  platform: string | null;
  rating: number | null;
  notes: string | null;
  date: string;
};

export type AddGamingLogInput = Omit<GamingLog, 'id'>;
export type GoldTransactionType = 'income' | 'expense';

export type GoldLog = {
  id: number;
  userId: number;
  type: GoldTransactionType;
  amount: number;
  category: string;
  notes: string | null;
  date: string;
};

export type AddGoldTransactionInput = Omit<GoldLog, 'id'>;
export type MonthlyBillStatus = 'paid' | 'unpaid';

export type MonthlyBill = {
  id: number;
  userId: number;
  billName: string;
  amount: number;
  dueDay: number;
  category: string | null;
  status: MonthlyBillStatus;
  lastPaidDate: string | null;
};

export type AddMonthlyBillInput = Omit<MonthlyBill, 'id' | 'status' | 'lastPaidDate'> & {
  status?: MonthlyBillStatus;
};

export type AppUserRole = 'General' | 'Gamer' | 'Professional';

export type AppRoutine = {
  id: string;
  time: string;
  title: string;
  done: boolean;
  date: string;
};

export type AppGameSession = {
  id: string;
  title: string;
  minutes: number;
  platform: string;
  rating: number;
  notes: string;
  date: string;
};

export type AppTransaction = {
  id: string;
  kind: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  notes: string;
};

export type DailyEvaluation = {
  completed: string;
  obstacles: string;
  nextSteps: string;
};

export type AppUserProfile = {
  username: string;
  email: string;
  role: AppUserRole;
  joinedAt: string;
  avatarUri?: string | null;
};

export type PersistedAppData = {
  theme: ThemeMode;
  profile: AppUserProfile | null;
  accountProfile: AppUserProfile | null;
  accountEmail: string | null;
  passwordSalt: string | null;
  passwordDigest: string | null;
  routines: AppRoutine[];
  routineDay: string;
  games: AppGameSession[];
  transactions: AppTransaction[];
  dailyEvaluations: Record<string, DailyEvaluation>;
  completedDays: string[];
};

export type LocalMonthlyBillStatus = 'paid' | 'unpaid';

export type LocalMonthlyBill = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  status: LocalMonthlyBillStatus;
  paidDate: string | null;
  paidTransactionId: string | null;
};

export type LocalMonthlyBillDraft = Omit<LocalMonthlyBill, 'id' | 'paidDate' | 'paidTransactionId'>;

export type FinanceReportRow = {
  date: string;
  category: string;
  description: string;
  amount: number;
  status: string;
  kind: 'income' | 'expense' | 'bill';
};

export type FinanceReport = {
  startDate: string;
  endDate: string;
  income: number;
  expenses: number;
  balance: number;
  bills: LocalMonthlyBill[];
  rows: FinanceReportRow[];
};

export type LocalDataExport = {
  schemaVersion: 1;
  exportedAt: string;
  profile: Pick<AppUserProfile, 'username' | 'email' | 'role' | 'joinedAt'> | null;
  routines: AppRoutine[];
  games: AppGameSession[];
  transactions: AppTransaction[];
  dailyEvaluations: Record<string, DailyEvaluation>;
  monthlyBills: LocalMonthlyBill[];
  completedDays: string[];
  sqliteDatabase: CoreDatabaseExport;
};

export type LocalDataExportFormat = 'json' | 'csv';

export type CoreDatabaseExport = {
  users: UserProfile[];
  dailyLogs: DailyLog[];
  gamingLogs: GamingLog[];
  goldLogs: GoldLog[];
  monthlyBills: MonthlyBill[];
};
