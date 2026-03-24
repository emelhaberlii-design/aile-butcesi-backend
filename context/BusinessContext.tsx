import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type BusinessPaymentMethod = "cash" | "debit" | "credit";

export interface Workspace {
  id: string;
  professionKey: string;
  professionSub: string;
  customName: string;
}

export type RecurringFrequency = "daily" | "weekly" | "monthly";

export interface BusinessExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: BusinessPaymentMethod;
  note?: string;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringDay?: number;
  cardId?: string;
  workspaceId?: string;
  isInstallment?: boolean;
  installmentCount?: number;
}

export interface BusinessIncome {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringDay?: number;
  workspaceId?: string;
}

export interface BusinessCreditCard {
  id: string;
  bank: string;
  name: string;
  lastFourDigits?: string;
  limit?: number;
  statementDay: number;
  paymentDay: number;
  color: string;
  linkedFamilyCardId?: string;
}

interface BusinessContextValue {
  businessExpenses: BusinessExpense[];
  businessIncomes: BusinessIncome[];
  combinedWithBudget: boolean;
  profession: string;
  professionSub: string;
  professionCustomName: string;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  isLoading: boolean;
  setCombinedWithBudget: (val: boolean) => Promise<void>;
  setProfession: (val: string) => Promise<void>;
  setProfessionSub: (val: string) => Promise<void>;
  setProfessionCustomName: (val: string) => Promise<void>;
  addWorkspace: (ws: Omit<Workspace, "id">) => Promise<Workspace>;
  removeWorkspace: (id: string) => Promise<void>;
  setActiveWorkspaceId: (id: string) => Promise<void>;
  updateWorkspace: (id: string, updates: Partial<Omit<Workspace, "id">>) => Promise<void>;
  addBusinessExpense: (exp: Omit<BusinessExpense, "id">) => void;
  deleteBusinessExpense: (id: string) => void;
  addBusinessIncome: (inc: Omit<BusinessIncome, "id">) => void;
  deleteBusinessIncome: (id: string) => void;
  monthlyBusinessExpenses: number;
  monthlyBusinessIncomes: number;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  businessCreditCards: BusinessCreditCard[];
  addBusinessCreditCard: (card: Omit<BusinessCreditCard, "id">) => void;
  deleteBusinessCreditCard: (id: string) => void;
  linkFamilyCard: (familyCardId: string, bank: string, name: string, color: string) => void;
  unlinkFamilyCard: (familyCardId: string) => void;
  businessCardSpending: Record<string, number>;
  linkedFamilyCardSpending: Record<string, number>;
  separateCardTracking: boolean;
  setSeparateCardTracking: (val: boolean) => Promise<void>;
  getWorkspaceExpenses: (wsId: string) => BusinessExpense[];
  getWorkspaceIncomes: (wsId: string) => BusinessIncome[];
  getExpensesForLinkedFamilyCard: (familyCardId: string) => BusinessExpense[];
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

const KEYS = {
  EXPENSES: "@business_expenses",
  INCOMES: "@business_incomes",
  COMBINED: "@business_combined_with_budget",
  PROFESSION: "@business_profession",
  PROFESSION_SUB: "@business_profession_sub",
  PROFESSION_CUSTOM_NAME: "@business_profession_custom_name",
  CREDIT_CARDS: "@business_credit_cards",
  SEPARATE_CARD_TRACKING: "@business_separate_card_tracking",
  WORKSPACES: "@business_workspaces",
  ACTIVE_WORKSPACE: "@business_active_workspace",
};

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businessExpenses, setBusinessExpenses] = useState<BusinessExpense[]>([]);
  const [businessIncomes, setBusinessIncomes] = useState<BusinessIncome[]>([]);
  const [combinedWithBudget, setCombinedState] = useState(false);
  const [profession, setProfessionState] = useState("");
  const [professionSub, setProfessionSubState] = useState("");
  const [professionCustomName, setProfessionCustomNameState] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [businessCreditCards, setBusinessCreditCards] = useState<BusinessCreditCard[]>([]);
  const [separateCardTracking, setSeparateState] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [expJson, incJson, combined, prof, profSub, profCustom, cardsJson, separateJson, wsJson, activeWs] = await Promise.all([
        AsyncStorage.getItem(KEYS.EXPENSES),
        AsyncStorage.getItem(KEYS.INCOMES),
        AsyncStorage.getItem(KEYS.COMBINED),
        AsyncStorage.getItem(KEYS.PROFESSION),
        AsyncStorage.getItem(KEYS.PROFESSION_SUB),
        AsyncStorage.getItem(KEYS.PROFESSION_CUSTOM_NAME),
        AsyncStorage.getItem(KEYS.CREDIT_CARDS),
        AsyncStorage.getItem(KEYS.SEPARATE_CARD_TRACKING),
        AsyncStorage.getItem(KEYS.WORKSPACES),
        AsyncStorage.getItem(KEYS.ACTIVE_WORKSPACE),
      ]);
      if (expJson) setBusinessExpenses(JSON.parse(expJson));
      if (incJson) setBusinessIncomes(JSON.parse(incJson));
      if (combined !== null) setCombinedState(combined === "true");
      if (prof) setProfessionState(prof);
      if (profSub) setProfessionSubState(profSub);
      if (profCustom) setProfessionCustomNameState(profCustom);
      if (cardsJson) setBusinessCreditCards(JSON.parse(cardsJson));
      if (separateJson !== null) setSeparateState(separateJson === "true");
      
      let loadedWorkspaces: Workspace[] = [];
      if (wsJson) {
        loadedWorkspaces = JSON.parse(wsJson);
      }
      if (loadedWorkspaces.length === 0 && prof) {
        const defaultWs: Workspace = {
          id: genId(),
          professionKey: prof,
          professionSub: profSub || "",
          customName: profCustom || "",
        };
        loadedWorkspaces = [defaultWs];
        await AsyncStorage.setItem(KEYS.WORKSPACES, JSON.stringify(loadedWorkspaces));
        if (!activeWs) {
          await AsyncStorage.setItem(KEYS.ACTIVE_WORKSPACE, defaultWs.id);
          setActiveWorkspaceIdState(defaultWs.id);
        }
      }
      setWorkspaces(loadedWorkspaces);
      if (activeWs) {
        setActiveWorkspaceIdState(activeWs);
      } else if (loadedWorkspaces.length > 0) {
        setActiveWorkspaceIdState(loadedWorkspaces[0].id);
      }
    } catch {}
    setIsLoading(false);
  }

  async function setCombinedWithBudget(val: boolean) {
    setCombinedState(val);
    await AsyncStorage.setItem(KEYS.COMBINED, String(val));
  }

  async function setProfession(val: string) {
    setProfessionState(val);
    await AsyncStorage.setItem(KEYS.PROFESSION, val);
  }

  async function setProfessionSub(val: string) {
    setProfessionSubState(val);
    await AsyncStorage.setItem(KEYS.PROFESSION_SUB, val);
  }

  async function setProfessionCustomName(val: string) {
    setProfessionCustomNameState(val);
    await AsyncStorage.setItem(KEYS.PROFESSION_CUSTOM_NAME, val);
  }

  async function setSeparateCardTracking(val: boolean) {
    setSeparateState(val);
    await AsyncStorage.setItem(KEYS.SEPARATE_CARD_TRACKING, String(val));
  }

  async function addWorkspace(ws: Omit<Workspace, "id">): Promise<Workspace> {
    const newWs: Workspace = { ...ws, id: genId() };
    const updated = [...workspaces, newWs];
    setWorkspaces(updated);
    await AsyncStorage.setItem(KEYS.WORKSPACES, JSON.stringify(updated));
    if (updated.length === 1) {
      setActiveWorkspaceIdState(newWs.id);
      await AsyncStorage.setItem(KEYS.ACTIVE_WORKSPACE, newWs.id);
      setProfessionState(ws.professionKey);
      await AsyncStorage.setItem(KEYS.PROFESSION, ws.professionKey);
      setProfessionSubState(ws.professionSub);
      await AsyncStorage.setItem(KEYS.PROFESSION_SUB, ws.professionSub);
      if (ws.customName) {
        setProfessionCustomNameState(ws.customName);
        await AsyncStorage.setItem(KEYS.PROFESSION_CUSTOM_NAME, ws.customName);
      }
    }
    return newWs;
  }

  async function removeWorkspace(id: string) {
    const updated = workspaces.filter((w) => w.id !== id);
    setWorkspaces(updated);
    await AsyncStorage.setItem(KEYS.WORKSPACES, JSON.stringify(updated));
    if (activeWorkspaceId === id && updated.length > 0) {
      const next = updated[0];
      setActiveWorkspaceIdState(next.id);
      await AsyncStorage.setItem(KEYS.ACTIVE_WORKSPACE, next.id);
      setProfessionState(next.professionKey);
      await AsyncStorage.setItem(KEYS.PROFESSION, next.professionKey);
      setProfessionSubState(next.professionSub);
      await AsyncStorage.setItem(KEYS.PROFESSION_SUB, next.professionSub);
      setProfessionCustomNameState(next.customName);
      await AsyncStorage.setItem(KEYS.PROFESSION_CUSTOM_NAME, next.customName);
    }
    if (updated.length === 0) {
      setActiveWorkspaceIdState("");
      await AsyncStorage.removeItem(KEYS.ACTIVE_WORKSPACE);
    }
  }

  async function setActiveWorkspaceId(id: string) {
    setActiveWorkspaceIdState(id);
    await AsyncStorage.setItem(KEYS.ACTIVE_WORKSPACE, id);
    const ws = workspaces.find((w) => w.id === id);
    if (ws) {
      setProfessionState(ws.professionKey);
      await AsyncStorage.setItem(KEYS.PROFESSION, ws.professionKey);
      setProfessionSubState(ws.professionSub);
      await AsyncStorage.setItem(KEYS.PROFESSION_SUB, ws.professionSub);
      setProfessionCustomNameState(ws.customName);
      await AsyncStorage.setItem(KEYS.PROFESSION_CUSTOM_NAME, ws.customName);
    }
  }

  async function updateWorkspace(id: string, updates: Partial<Omit<Workspace, "id">>) {
    const updated = workspaces.map((w) => (w.id === id ? { ...w, ...updates } : w));
    setWorkspaces(updated);
    await AsyncStorage.setItem(KEYS.WORKSPACES, JSON.stringify(updated));
    if (id === activeWorkspaceId) {
      const ws = updated.find((w) => w.id === id);
      if (ws) {
        setProfessionState(ws.professionKey);
        await AsyncStorage.setItem(KEYS.PROFESSION, ws.professionKey);
        setProfessionSubState(ws.professionSub);
        await AsyncStorage.setItem(KEYS.PROFESSION_SUB, ws.professionSub);
        setProfessionCustomNameState(ws.customName);
        await AsyncStorage.setItem(KEYS.PROFESSION_CUSTOM_NAME, ws.customName);
      }
    }
  }

  function addBusinessExpense(exp: Omit<BusinessExpense, "id">) {
    setBusinessExpenses((prev) => {
      const updated = [{ ...exp, id: genId(), workspaceId: exp.workspaceId || activeWorkspaceId }, ...prev];
      AsyncStorage.setItem(KEYS.EXPENSES, JSON.stringify(updated));
      return updated;
    });
  }

  function deleteBusinessExpense(id: string) {
    setBusinessExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      AsyncStorage.setItem(KEYS.EXPENSES, JSON.stringify(updated));
      return updated;
    });
  }

  function addBusinessIncome(inc: Omit<BusinessIncome, "id">) {
    setBusinessIncomes((prev) => {
      const updated = [{ ...inc, id: genId(), workspaceId: inc.workspaceId || activeWorkspaceId }, ...prev];
      AsyncStorage.setItem(KEYS.INCOMES, JSON.stringify(updated));
      return updated;
    });
  }

  function deleteBusinessIncome(id: string) {
    setBusinessIncomes((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      AsyncStorage.setItem(KEYS.INCOMES, JSON.stringify(updated));
      return updated;
    });
  }

  function addBusinessCreditCard(card: Omit<BusinessCreditCard, "id">) {
    setBusinessCreditCards((prev) => {
      const updated = [...prev, { ...card, id: genId() }];
      AsyncStorage.setItem(KEYS.CREDIT_CARDS, JSON.stringify(updated));
      return updated;
    });
  }

  function deleteBusinessCreditCard(id: string) {
    setBusinessCreditCards((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      AsyncStorage.setItem(KEYS.CREDIT_CARDS, JSON.stringify(updated));
      return updated;
    });
  }

  function linkFamilyCard(familyCardId: string, bank: string, name: string, color: string) {
    const alreadyLinked = businessCreditCards.some((c) => c.linkedFamilyCardId === familyCardId);
    if (alreadyLinked) return;
    addBusinessCreditCard({
      bank,
      name: name || bank,
      color,
      statementDay: 1,
      paymentDay: 10,
      linkedFamilyCardId: familyCardId,
    });
  }

  function unlinkFamilyCard(familyCardId: string) {
    setBusinessCreditCards((prev) => {
      const updated = prev.filter((c) => c.linkedFamilyCardId !== familyCardId);
      AsyncStorage.setItem(KEYS.CREDIT_CARDS, JSON.stringify(updated));
      return updated;
    });
  }

  function getWorkspaceExpenses(wsId: string): BusinessExpense[] {
    return businessExpenses.filter((e) => (e.workspaceId || workspaces[0]?.id) === wsId);
  }

  function getWorkspaceIncomes(wsId: string): BusinessIncome[] {
    return businessIncomes.filter((i) => (i.workspaceId || workspaces[0]?.id) === wsId);
  }

  function getExpensesForLinkedFamilyCard(familyCardId: string): BusinessExpense[] {
    const bizCard = businessCreditCards.find((c) => c.linkedFamilyCardId === familyCardId);
    if (!bizCard) return [];
    return businessExpenses.filter((e) => e.cardId === bizCard.id);
  }

  const monthlyBusinessExpenses = businessExpenses
    .filter((e) => e.date.startsWith(selectedMonth) && (!activeWorkspaceId || (e.workspaceId || workspaces[0]?.id) === activeWorkspaceId))
    .reduce((s, e) => s + e.amount, 0);

  const monthlyBusinessIncomes = businessIncomes
    .filter((i) => i.date.startsWith(selectedMonth) && (!activeWorkspaceId || (i.workspaceId || workspaces[0]?.id) === activeWorkspaceId))
    .reduce((s, i) => s + i.amount, 0);

  const businessCardSpending = useMemo(() => {
    const spending: Record<string, number> = {};
    businessExpenses
      .filter((e) => e.date.startsWith(selectedMonth) && e.cardId)
      .forEach((e) => {
        spending[e.cardId!] = (spending[e.cardId!] || 0) + e.amount;
      });
    return spending;
  }, [businessExpenses, selectedMonth]);

  const linkedFamilyCardSpending = useMemo(() => {
    const spending: Record<string, number> = {};
    businessCreditCards
      .filter((c) => c.linkedFamilyCardId)
      .forEach((c) => {
        const bizSpent = businessCardSpending[c.id] || 0;
        if (bizSpent > 0 && c.linkedFamilyCardId) {
          spending[c.linkedFamilyCardId] = (spending[c.linkedFamilyCardId] || 0) + bizSpent;
        }
      });
    return spending;
  }, [businessCreditCards, businessCardSpending]);

  return (
    <BusinessContext.Provider
      value={{
        businessExpenses,
        businessIncomes,
        combinedWithBudget,
        profession,
        professionSub,
        professionCustomName,
        workspaces,
        activeWorkspaceId,
        isLoading,
        setCombinedWithBudget,
        setProfession,
        setProfessionSub,
        setProfessionCustomName,
        addWorkspace,
        removeWorkspace,
        setActiveWorkspaceId,
        updateWorkspace,
        addBusinessExpense,
        deleteBusinessExpense,
        addBusinessIncome,
        deleteBusinessIncome,
        monthlyBusinessExpenses,
        monthlyBusinessIncomes,
        selectedMonth,
        setSelectedMonth,
        businessCreditCards,
        addBusinessCreditCard,
        deleteBusinessCreditCard,
        linkFamilyCard,
        unlinkFamilyCard,
        businessCardSpending,
        linkedFamilyCardSpending,
        separateCardTracking,
        setSeparateCardTracking,
        getWorkspaceExpenses,
        getWorkspaceIncomes,
        getExpensesForLinkedFamilyCard,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessBudget() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusinessBudget must be used within BusinessProvider");
  return ctx;
}
