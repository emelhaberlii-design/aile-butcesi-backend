import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export type Relation =
  | "spouse"
  | "child"
  | "mother"
  | "father"
  | "friend"
  | "sibling"
  | "partner"
  | "grandparent"
  | "other"
  | "holiday";

export type EventType = "birthday" | "anniversary" | "holiday" | "custom";

export interface SpecialDay {
  id: string;
  personName: string;
  relation: Relation;
  eventType: EventType;
  title: string;
  monthDay: string;
  birthYear?: number;
  giftBudget?: number;
  note?: string;
  isSystemEvent?: boolean;
  notifIds?: string[];
}

export interface UpcomingEvent {
  day: SpecialDay;
  daysUntil: number;
  thisYearDate: Date;
}

interface SpecialDaysContextValue {
  specialDays: SpecialDay[];
  addSpecialDay: (d: Omit<SpecialDay, "id" | "notifIds">) => Promise<void>;
  updateSpecialDay: (d: SpecialDay) => Promise<void>;
  deleteSpecialDay: (id: string) => Promise<void>;
  getUpcoming: (withinDays?: number) => UpcomingEvent[];
  getNextEvent: () => UpcomingEvent | null;
}

const STORAGE_KEY = "@special_days_v2";

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function getMothersDayDate(year: number): string {
  const may1 = new Date(year, 4, 1);
  const dow = may1.getDay();
  const firstSunday = dow === 0 ? 1 : 8 - dow;
  const secondSunday = firstSunday + 7;
  const mm = String(5).padStart(2, "0");
  const dd = String(secondSunday).padStart(2, "0");
  return `${mm}-${dd}`;
}

export function getFathersDayDate(year: number): string {
  const jun1 = new Date(year, 5, 1);
  const dow = jun1.getDay();
  const firstSunday = dow === 0 ? 1 : 8 - dow;
  const thirdSunday = firstSunday + 14;
  const mm = String(6).padStart(2, "0");
  const dd = String(thirdSunday).padStart(2, "0");
  return `${mm}-${dd}`;
}

const year = new Date().getFullYear();
const SYSTEM_EVENTS: SpecialDay[] = [
  {
    id: "sys_valentines",
    personName: "",
    relation: "holiday",
    eventType: "holiday",
    title: "Sevgililer Günü",
    monthDay: "02-14",
    isSystemEvent: true,
  },
  {
    id: "sys_womensday",
    personName: "",
    relation: "holiday",
    eventType: "holiday",
    title: "Kadınlar Günü",
    monthDay: "03-08",
    isSystemEvent: true,
  },
  {
    id: "sys_mothersday",
    personName: "",
    relation: "holiday",
    eventType: "holiday",
    title: "Anneler Günü",
    monthDay: getMothersDayDate(year),
    isSystemEvent: true,
  },
  {
    id: "sys_fathersday",
    personName: "",
    relation: "holiday",
    eventType: "holiday",
    title: "Babalar Günü",
    monthDay: getFathersDayDate(year),
    isSystemEvent: true,
  },
  {
    id: "sys_teachersday",
    personName: "",
    relation: "holiday",
    eventType: "holiday",
    title: "Öğretmenler Günü",
    monthDay: "11-24",
    isSystemEvent: true,
  },
  {
    id: "sys_newyear",
    personName: "",
    relation: "holiday",
    eventType: "holiday",
    title: "Yılbaşı",
    monthDay: "01-01",
    isSystemEvent: true,
  },
  {
    id: "sys_republic",
    personName: "",
    relation: "holiday",
    eventType: "holiday",
    title: "Cumhuriyet Bayramı",
    monthDay: "10-29",
    isSystemEvent: true,
  },
];

export function getNextOccurrence(monthDay: string): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [mm, dd] = monthDay.split("-").map(Number);
  const thisYear = new Date(today.getFullYear(), mm - 1, dd);
  thisYear.setHours(0, 0, 0, 0);
  if (thisYear >= today) return thisYear;
  return new Date(today.getFullYear() + 1, mm - 1, dd);
}

export function daysUntil(monthDay: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = getNextOccurrence(monthDay);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

async function scheduleEventNotifs(day: SpecialDay): Promise<string[]> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return [];

    const ids: string[] = [];
    const next = getNextOccurrence(day.monthDay);

    const dayLabel = day.isSystemEvent
      ? day.title
      : `${day.personName ? day.personName + " — " : ""}${day.title}`;

    const makeBody = (d: number) =>
      d === 0
        ? `Bugün özel bir gün! ${dayLabel}`
        : `${dayLabel} ${d} gün sonra!`;

    const sevenBefore = new Date(next.getTime() - 7 * 86400000);
    const oneBefore = new Date(next.getTime() - 86400000);
    const onDay = new Date(next.getTime());

    const dates = [
      { date: sevenBefore, body: makeBody(7) },
      { date: oneBefore, body: makeBody(1) },
      { date: onDay, body: makeBody(0) },
    ];

    const now = new Date();
    for (const { date, body } of dates) {
      date.setHours(9, 0, 0, 0);
      if (date > now) {
        const id = await Notifications.scheduleNotificationAsync({
          content: { title: "Özel Gün Hatırlatıcı", body, sound: true },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
        });
        ids.push(id);
      }
    }
    return ids;
  } catch {
    return [];
  }
}

async function cancelEventNotifs(day: SpecialDay): Promise<void> {
  if (!day.notifIds?.length) return;
  for (const id of day.notifIds) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch { }
  }
}

const SpecialDaysContext = createContext<SpecialDaysContextValue | undefined>(undefined);

export function SpecialDaysProvider({ children }: { children: ReactNode }) {
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setSpecialDays(JSON.parse(raw));
        } catch {
          setSpecialDays([]);
        }
      }
    });
  }, []);

  async function save(days: SpecialDay[]) {
    setSpecialDays(days);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(days));
  }

  async function addSpecialDay(d: Omit<SpecialDay, "id" | "notifIds">) {
    const newDay: SpecialDay = { ...d, id: genId() };
    const ids = await scheduleEventNotifs(newDay);
    newDay.notifIds = ids;
    await save([...specialDays, newDay]);
  }

  async function updateSpecialDay(d: SpecialDay) {
    await cancelEventNotifs(d);
    const ids = await scheduleEventNotifs(d);
    const updated = { ...d, notifIds: ids };
    await save(specialDays.map((s) => (s.id === d.id ? updated : s)));
  }

  async function deleteSpecialDay(id: string) {
    const found = specialDays.find((s) => s.id === id);
    if (found) await cancelEventNotifs(found);
    await save(specialDays.filter((s) => s.id !== id));
  }

  function getUpcoming(withinDays = 365): UpcomingEvent[] {
    const allDays = [...SYSTEM_EVENTS, ...specialDays];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allDays
      .map((day) => {
        const d = daysUntil(day.monthDay);
        return { day, daysUntil: d, thisYearDate: getNextOccurrence(day.monthDay) };
      })
      .filter((e) => e.daysUntil <= withinDays)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }

  function getNextEvent(): UpcomingEvent | null {
    const upcoming = getUpcoming(365);
    return upcoming.length > 0 ? upcoming[0] : null;
  }

  return (
    <SpecialDaysContext.Provider
      value={{ specialDays, addSpecialDay, updateSpecialDay, deleteSpecialDay, getUpcoming, getNextEvent }}
    >
      {children}
    </SpecialDaysContext.Provider>
  );
}

export function useSpecialDays(): SpecialDaysContextValue {
  const ctx = useContext(SpecialDaysContext);
  if (!ctx) throw new Error("useSpecialDays must be used within SpecialDaysProvider");
  return ctx;
}
