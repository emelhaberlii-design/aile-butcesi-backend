import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export interface SpendingLimit {
  id: string;
  category: string;
  limitType: "amount" | "percentage";
  limitValue: number;
  enabled: boolean;
  isRecurring: boolean;
  specificMonth?: string;
  notifiedAt50?: boolean;
  notifiedAt80?: boolean;
  notifiedAt100?: boolean;
  lastNotifMonth?: string;
}

export type LimitStatus = "safe" | "warning" | "danger" | "over";

export interface LimitUsage {
  spent: number;
  limitAmount: number;
  percent: number;
  status: LimitStatus;
}

interface SpendingLimitsContextValue {
  limits: SpendingLimit[];
  addLimit: (l: Omit<SpendingLimit, "id" | "notifiedAt50" | "notifiedAt80" | "notifiedAt100" | "lastNotifMonth">) => Promise<void>;
  updateLimit: (l: SpendingLimit) => Promise<void>;
  deleteLimit: (id: string) => Promise<void>;
  toggleLimit: (id: string) => Promise<void>;
  dismissedSuggestions: string[];
  dismissSuggestion: (key: string) => Promise<void>;
  acceptSuggestion: (key: string, limit: Omit<SpendingLimit, "id" | "notifiedAt50" | "notifiedAt80" | "notifiedAt100" | "lastNotifMonth">) => Promise<void>;
}

const STORAGE_KEY = "@spending_limits_v1";
const DISMISSED_KEY = "@spending_limits_dismissed_v1";

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function getLimitAmount(limit: SpendingLimit, monthlyIncome: number): number {
  if (limit.limitType === "amount") return limit.limitValue;
  return Math.round((limit.limitValue / 100) * monthlyIncome);
}

export function getLimitUsage(
  spent: number,
  limitAmount: number
): LimitUsage {
  const percent = limitAmount > 0 ? Math.min(1.5, spent / limitAmount) : 0;
  let status: LimitStatus = "safe";
  if (percent >= 1) status = "over";
  else if (percent >= 0.8) status = "danger";
  else if (percent >= 0.5) status = "warning";
  return { spent, limitAmount, percent, status };
}

export function statusColor(status: LimitStatus): string {
  if (status === "safe") return "#00C97A";
  if (status === "warning") return "#FF9F0A";
  if (status === "danger") return "#FF6B2B";
  return "#FF453A";
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function sendLimitNotif(title: string, body: string) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch { }
}

const SpendingLimitsContext = createContext<SpendingLimitsContextValue | undefined>(undefined);

export function SpendingLimitsProvider({ children }: { children: ReactNode }) {
  const [limits, setLimits] = useState<SpendingLimit[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(DISMISSED_KEY),
    ]).then(([raw, dismissedRaw]) => {
      if (raw) { try { setLimits(JSON.parse(raw)); } catch { } }
      if (dismissedRaw) { try { setDismissedSuggestions(JSON.parse(dismissedRaw)); } catch { } }
    });
  }, []);

  async function saveLimits(updated: SpendingLimit[]) {
    setLimits(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  async function addLimit(l: Omit<SpendingLimit, "id" | "notifiedAt50" | "notifiedAt80" | "notifiedAt100" | "lastNotifMonth">) {
    await saveLimits([...limits, { ...l, id: genId() }]);
  }

  async function updateLimit(l: SpendingLimit) {
    await saveLimits(limits.map((x) => (x.id === l.id ? l : x)));
  }

  async function deleteLimit(id: string) {
    await saveLimits(limits.filter((x) => x.id !== id));
  }

  async function toggleLimit(id: string) {
    await saveLimits(limits.map((x) => x.id === id ? { ...x, enabled: !x.enabled } : x));
  }

  async function dismissSuggestion(key: string) {
    const updated = [...dismissedSuggestions, key];
    setDismissedSuggestions(updated);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
  }

  async function acceptSuggestion(
    key: string,
    l: Omit<SpendingLimit, "id" | "notifiedAt50" | "notifiedAt80" | "notifiedAt100" | "lastNotifMonth">
  ) {
    const updated = [...dismissedSuggestions, key];
    setDismissedSuggestions(updated);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
    await addLimit(l);
  }

  return (
    <SpendingLimitsContext.Provider
      value={{ limits, addLimit, updateLimit, deleteLimit, toggleLimit, dismissedSuggestions, dismissSuggestion, acceptSuggestion }}
    >
      {children}
    </SpendingLimitsContext.Provider>
  );
}

const EMPTY_CTX: SpendingLimitsContextValue = {
  limits: [],
  addLimit: async () => {},
  updateLimit: async () => {},
  deleteLimit: async () => {},
  toggleLimit: async () => {},
  dismissedSuggestions: [],
  dismissSuggestion: async () => {},
  acceptSuggestion: async () => {},
};

export function useSpendingLimits(): SpendingLimitsContextValue {
  const ctx = useContext(SpendingLimitsContext);
  return ctx ?? EMPTY_CTX;
}
