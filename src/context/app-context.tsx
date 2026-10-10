import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import type { ThemeMode } from '@/constants/app-theme';
import { initDatabase } from '@/database/init';
import type {
  AppGameSession,
  AppRoutine,
  AppTransaction,
  AppUserProfile,
  AppUserRole,
  DailyEvaluation,
  PersistedAppData,
} from '@/types';

export type UserRole = AppUserRole;
export type Routine = AppRoutine;
export type GameSession = AppGameSession;
export type Transaction = AppTransaction;
export type UserProfile = AppUserProfile;
type AppData = PersistedAppData;

type RoutineDraft = Omit<Routine, 'id' | 'done'>;
type GameDraft = Omit<GameSession, 'id'>;
type TransactionDraft = Omit<Transaction, 'id'>;

const STORAGE_KEY = 'timesurvive.app-data.v1';

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultRoutines(date = dateKey()): Routine[] {
  return [
    { id: 'routine-wake', time: '03:00', title: 'Bangun tidur', done: false, date },
    { id: 'routine-prayer', time: '03:30 - 05:00', title: 'Tahajud & ngaji', done: false, date },
    { id: 'routine-morning', time: '05:30', title: 'Persiapan pagi', done: false, date },
    { id: 'routine-study', time: '08:00 - 10:00', title: 'Belajar', done: false, date },
    { id: 'routine-rest', time: '10:00 - 10:30', title: 'Rehat & peregangan', done: false, date },
    { id: 'routine-noon', time: '13:00', title: 'Ibadah & makan siang', done: false, date },
    { id: 'routine-move', time: '16:00 - 17:00', title: 'Olahraga', done: false, date },
    { id: 'routine-review', time: '20:30', title: 'Review harian', done: false, date },
  ];
}

function freshData(): AppData {
  return {
    theme: 'light',
    profile: null,
    accountProfile: null,
    accountEmail: null,
    passwordSalt: null,
    passwordDigest: null,
    routines: defaultRoutines(),
    routineDay: dateKey(),
    games: [],
    transactions: [],
    dailyEvaluations: {},
    completedDays: [],
  };
}

function normalizeDailyEvaluations(value: unknown): Record<string, DailyEvaluation> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([date, evaluation]) => {
      if (!evaluation || typeof evaluation !== 'object') return [];
      const entry = evaluation as Record<string, unknown>;
      if (
        typeof entry.completed !== 'string' ||
        typeof entry.obstacles !== 'string' ||
        typeof entry.nextSteps !== 'string'
      ) {
        return [];
      }
      return [[date, {
        completed: entry.completed,
        obstacles: entry.obstacles,
        nextSteps: entry.nextSteps,
      }]];
    }),
  );
}

export function createRecordId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function digestPassword(salt: string, password: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

type AppContextValue = {
  data: AppData;
  ready: boolean;
  persistenceError: string | null;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  register: (profile: Omit<UserProfile, 'joinedAt'>, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  resetPassword: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profile: Partial<Omit<UserProfile, 'joinedAt'>>) => void;
  deleteAccount: () => void;
  addRoutine: (routine: RoutineDraft & { date: string }) => void;
  updateRoutine: (id: string, changes: Partial<RoutineDraft & Pick<Routine, 'done'>>) => void;
  deleteRoutine: (id: string) => void;
  saveDailyEvaluation: (date: string, evaluation: DailyEvaluation) => void;
  addGame: (game: GameDraft) => void;
  updateGame: (id: string, changes: Partial<GameDraft>) => void;
  deleteGame: (id: string) => void;
  addTransaction: (transaction: TransactionDraft, id?: string) => void;
  updateTransaction: (id: string, changes: Partial<TransactionDraft>) => void;
  deleteTransaction: (id: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(freshData);
  const [ready, setReady] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const persistenceQueue = useRef(Promise.resolve());
  const persistenceRevision = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        await initDatabase();
      } catch (error) {
        console.error('[TimeSurvive] Failed to initialize the local database.', error);
        if (!cancelled) {
          setInitializationError(
            `Database lokal gagal disiapkan: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<AppData>;
          const base = freshData();
          const loaded: AppData = {
            ...base,
            ...parsed,
            theme: parsed.theme === 'dark' ? 'dark' : 'light',
            accountProfile: parsed.accountProfile ?? parsed.profile ?? null,
            routines: Array.isArray(parsed.routines)
              ? parsed.routines.map((routine) => ({
                  ...routine,
                  date: routine.date ?? parsed.routineDay ?? dateKey(),
                }))
              : base.routines,
            games: Array.isArray(parsed.games) ? parsed.games : [],
            transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
            dailyEvaluations: normalizeDailyEvaluations(parsed.dailyEvaluations),
            completedDays: Array.isArray(parsed.completedDays) ? parsed.completedDays : [],
          };
          loaded.routineDay = dateKey();
          setData(loaded);
        }
      } catch (error) {
        console.error('[TimeSurvive] Failed to load local app data.', error);
        if (!cancelled) {
          setInitializationError(
            `Data lokal gagal dimuat: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        setData(freshData());
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const revision = ++persistenceRevision.current;
    persistenceQueue.current = persistenceQueue.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)))
      .then(() => {
        if (!cancelled && revision === persistenceRevision.current) setPersistenceError(null);
      })
      .catch((error: unknown) => {
        console.error('[TimeSurvive] Failed to save local app data.', error);
        if (!cancelled && revision === persistenceRevision.current) {
          setPersistenceError(
            `Perubahan belum tersimpan di perangkat: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [data, ready]);

  const setTheme = (theme: ThemeMode) => setData((current) => ({ ...current, theme }));
  const toggleTheme = () =>
    setData((current) => ({ ...current, theme: current.theme === 'light' ? 'dark' : 'light' }));

  const register: AppContextValue['register'] = async (profile, password) => {
    const normalized = { ...profile, email: profile.email.trim().toLowerCase(), joinedAt: dateKey() };
    const passwordSalt = bytesToHex(Crypto.getRandomBytes(16));
    const passwordDigest = await digestPassword(passwordSalt, password);
    setData((current) => ({
      ...current,
      profile: normalized,
      accountProfile: normalized,
      accountEmail: normalized.email,
      passwordSalt,
      passwordDigest,
    }));
    return true;
  };

  const login: AppContextValue['login'] = async (identifier, password) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const normalizedEmail =
      normalizedIdentifier === data.accountProfile?.username.trim().toLowerCase()
        ? data.accountEmail
        : normalizedIdentifier;
    if (
      !password.trim() ||
      !data.accountEmail ||
      !normalizedEmail ||
      normalizedEmail !== data.accountEmail ||
      !data.passwordSalt ||
      !data.passwordDigest
    ) {
      return false;
    }
    if ((await digestPassword(data.passwordSalt, password)) !== data.passwordDigest) return false;
    setData((current) =>
      current.profile
        ? current
        : {
            ...current,
            profile: current.accountProfile ?? {
              username: normalizedEmail.split('@')[0],
              email: normalizedEmail,
              role: 'General',
              joinedAt: dateKey(),
            },
          },
    );
    return true;
  };

  const resetPassword: AppContextValue['resetPassword'] = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!data.accountEmail || normalizedEmail !== data.accountEmail || password.length < 8) {
      return false;
    }
    const passwordSalt = bytesToHex(Crypto.getRandomBytes(16));
    const passwordDigest = await digestPassword(passwordSalt, password);
    setData((current) => ({ ...current, passwordSalt, passwordDigest }));
    return true;
  };

  const logout = () => setData((current) => ({ ...current, profile: null }));

  const updateProfile: AppContextValue['updateProfile'] = (changes) =>
    setData((current) => {
      if (!current.profile) return current;
      const profile = { ...current.profile, ...changes };
      return {
        ...current,
        profile,
        accountProfile: profile,
        accountEmail: profile.email.trim().toLowerCase(),
      };
    });

  const deleteAccount = () => setData(freshData());

  const addRoutine = (routine: RoutineDraft & { date: string }) =>
    setData((current) => ({
      ...current,
      routines: [...current.routines, { ...routine, id: createRecordId(), done: false }].sort(
        (left, right) => left.time.localeCompare(right.time),
      ),
    }));

  const updateRoutine: AppContextValue['updateRoutine'] = (id, changes) =>
    setData((current) => {
      const routines = current.routines
        .map((routine) => (routine.id === id ? { ...routine, ...changes } : routine))
        .sort((left, right) => left.time.localeCompare(right.time));
      const changedRoutine = routines.find((routine) => routine.id === id);
      const date = changedRoutine?.date ?? dateKey();
      const sameDay = routines.filter((routine) => routine.date === date);
      const completedDays =
        sameDay.length > 0 && sameDay.every((routine) => routine.done)
          ? [...new Set([...current.completedDays, date])]
          : current.completedDays.filter((completedDate) => completedDate !== date);
      return { ...current, routines, routineDay: dateKey(), completedDays };
    });

  const deleteRoutine = (id: string) =>
    setData((current) => ({
      ...current,
      routines: current.routines.filter((routine) => routine.id !== id),
    }));

  const saveDailyEvaluation = (date: string, evaluation: DailyEvaluation) =>
    setData((current) => {
      const dailyEvaluations = { ...current.dailyEvaluations };
      const saved = {
        completed: evaluation.completed.trim(),
        obstacles: evaluation.obstacles.trim(),
        nextSteps: evaluation.nextSteps.trim(),
      };
      if (Object.values(saved).every((value) => !value)) {
        delete dailyEvaluations[date];
      } else {
        dailyEvaluations[date] = saved;
      }
      return { ...current, dailyEvaluations };
    });

  const addGame = (game: GameDraft) =>
    setData((current) => ({ ...current, games: [{ ...game, id: createRecordId() }, ...current.games] }));
  const updateGame: AppContextValue['updateGame'] = (id, changes) =>
    setData((current) => ({
      ...current,
      games: current.games.map((game) => (game.id === id ? { ...game, ...changes } : game)),
    }));
  const deleteGame = (id: string) =>
    setData((current) => ({ ...current, games: current.games.filter((game) => game.id !== id) }));

  const addTransaction: AppContextValue['addTransaction'] = (transaction, id) =>
    setData((current) => ({
      ...current,
      transactions: [{ ...transaction, id: id ?? createRecordId() }, ...current.transactions],
    }));
  const updateTransaction: AppContextValue['updateTransaction'] = (id, changes) =>
    setData((current) => ({
      ...current,
      transactions: current.transactions.map((transaction) =>
        transaction.id === id ? { ...transaction, ...changes } : transaction,
      ),
    }));
  const deleteTransaction = (id: string) =>
    setData((current) => ({
      ...current,
      transactions: current.transactions.filter((transaction) => transaction.id !== id),
    }));

  return (
    <AppContext.Provider
      value={{
        data,
        ready,
        persistenceError: initializationError ?? persistenceError,
        setTheme,
        toggleTheme,
        register,
        login,
        resetPassword,
        logout,
        updateProfile,
        deleteAccount,
        addRoutine,
        updateRoutine,
        deleteRoutine,
        saveDailyEvaluation,
        addGame,
        updateGame,
        deleteGame,
        addTransaction,
        updateTransaction,
        deleteTransaction,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export function getStreak(completedDays: string[]) {
  const completed = new Set(completedDays);
  const today = new Date();
  if (!completed.has(dateKey(today))) today.setDate(today.getDate() - 1);
  let streak = 0;
  while (completed.has(dateKey(today))) {
    streak += 1;
    today.setDate(today.getDate() - 1);
  }
  return streak;
}