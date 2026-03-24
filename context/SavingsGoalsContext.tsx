import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type GoalCurrency = "TL" | "USD" | "EUR" | "gold_gram";

export interface SavingsContribution {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface SavingsTarget {
  id: string;
  title: string;
  targetAmount: number;
  currency: GoalCurrency;
  deadlineMonths: number;
  startYearMonth: string;
  contributions: SavingsContribution[];
  isCompleted: boolean;
}

export interface GoalStats {
  savedAmount: number;
  remainingAmount: number;
  progressPct: number;
  monthsElapsed: number;
  monthsLeft: number;
  requiredPerMonth: number;
  expectedSaved: number;
  isOnTrack: boolean;
  isOverdue: boolean;
}

interface SavingsGoalsContextValue {
  goals: SavingsTarget[];
  addGoal: (g: Omit<SavingsTarget, "id" | "contributions" | "isCompleted">) => void;
  updateGoal: (g: SavingsTarget) => void;
  deleteGoal: (id: string) => void;
  addContribution: (goalId: string, amount: number, note?: string) => void;
  deleteContribution: (goalId: string, contribId: string) => void;
  markCompleted: (goalId: string, done: boolean) => void;
  getStats: (goal: SavingsTarget) => GoalStats;
}

const STORAGE_KEY = "@budget_savings_goals_v1";

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthsFromStart(startYearMonth: string): number {
  const [sy, sm] = startYearMonth.split("-").map(Number);
  const now = new Date();
  const ny = now.getFullYear();
  const nm = now.getMonth() + 1;
  return Math.max(0, (ny - sy) * 12 + (nm - sm));
}

const SavingsGoalsContext = createContext<SavingsGoalsContextValue | null>(null);

export function SavingsGoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<SavingsTarget[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => { if (json) setGoals(JSON.parse(json)); })
      .catch(() => {});
  }, []);

  function persist(updated: SavingsTarget[]) {
    setGoals(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }

  function addGoal(g: Omit<SavingsTarget, "id" | "contributions" | "isCompleted">) {
    const newGoal: SavingsTarget = {
      ...g,
      id: genId(),
      contributions: [],
      isCompleted: false,
    };
    persist([newGoal, ...goals]);
  }

  function updateGoal(g: SavingsTarget) {
    persist(goals.map((x) => (x.id === g.id ? g : x)));
  }

  function deleteGoal(id: string) {
    persist(goals.filter((g) => g.id !== id));
  }

  function addContribution(goalId: string, amount: number, note?: string) {
    persist(
      goals.map((g) => {
        if (g.id !== goalId) return g;
        const contrib: SavingsContribution = {
          id: genId(),
          amount,
          date: new Date().toISOString().substring(0, 10),
          note,
        };
        const updated = { ...g, contributions: [contrib, ...g.contributions] };
        const savedAmount = updated.contributions.reduce((s, c) => s + c.amount, 0);
        if (savedAmount >= g.targetAmount) updated.isCompleted = true;
        return updated;
      })
    );
  }

  function deleteContribution(goalId: string, contribId: string) {
    persist(
      goals.map((g) =>
        g.id !== goalId
          ? g
          : { ...g, contributions: g.contributions.filter((c) => c.id !== contribId) }
      )
    );
  }

  function markCompleted(goalId: string, done: boolean) {
    persist(goals.map((g) => (g.id === goalId ? { ...g, isCompleted: done } : g)));
  }

  function getStats(goal: SavingsTarget): GoalStats {
    const savedAmount = goal.contributions.reduce((s, c) => s + c.amount, 0);
    const remainingAmount = Math.max(0, goal.targetAmount - savedAmount);
    const progressPct = goal.targetAmount > 0 ? Math.min(1, savedAmount / goal.targetAmount) : 0;
    const monthsElapsed = monthsFromStart(goal.startYearMonth);
    const monthsLeft = Math.max(0, goal.deadlineMonths - monthsElapsed);
    const requiredPerMonth = monthsLeft > 0 ? remainingAmount / monthsLeft : remainingAmount;
    const expectedSaved = goal.targetAmount > 0
      ? (goal.targetAmount / goal.deadlineMonths) * (monthsElapsed + 1)
      : 0;
    const isOnTrack = savedAmount >= Math.min(expectedSaved, goal.targetAmount);
    const isOverdue = monthsElapsed >= goal.deadlineMonths && savedAmount < goal.targetAmount;
    return {
      savedAmount,
      remainingAmount,
      progressPct,
      monthsElapsed,
      monthsLeft,
      requiredPerMonth,
      expectedSaved,
      isOnTrack,
      isOverdue,
    };
  }

  return (
    <SavingsGoalsContext.Provider
      value={{ goals, addGoal, updateGoal, deleteGoal, addContribution, deleteContribution, markCompleted, getStats }}
    >
      {children}
    </SavingsGoalsContext.Provider>
  );
}

export function useSavingsGoals() {
  const ctx = useContext(SavingsGoalsContext);
  if (!ctx) throw new Error("useSavingsGoals must be used within SavingsGoalsProvider");
  return ctx;
}
