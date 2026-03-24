import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { CurrencyCode } from "@/lib/currency";
export type { CurrencyCode };

export type PaymentMethod = "cash" | "debit" | "credit";

export const TURKISH_BANKS = [
  "Akbank",
  "Garanti BBVA",
  "Yapı Kredi",
  "Ziraat Bankası",
  "İş Bankası",
  "Vakıfbank",
  "Halkbank",
  "DenizBank",
  "QNB Finansbank",
  "TEB",
  "ING",
  "Enpara",
  "HSBC",
  "Şekerbank",
  "Anadolubank",
  "Fibabanka",
  "Kuveyt Türk",
  "Türkiye Finans",
  "Albaraka Türk",
  "Alternatifbank",
  "ICBC Turkey",
  "Odeabank",
  "Burgan Bank",
  "Türk Ekonomi Bankası",
  "Diğer",
];

export const CARD_COLORS = [
  "#0A84FF",
  "#00C97A",
  "#BF5AF2",
  "#FF9F0A",
  "#FF453A",
  "#5AC8FA",
  "#FF6B6B",
  "#4ECDC4",
];

export type CardPaymentPreference = "full" | "minimum" | "custom" | "percentage";

export interface CreditCard {
  id: string;
  bank: string;
  name: string;
  lastFourDigits?: string;
  limit?: number;
  statementDay: number;
  paymentDay: number;
  color: string;
  currentDebt?: number;
  paymentPreference?: CardPaymentPreference;
  customPaymentAmount?: number;
  paymentPercentage?: number;
  currency?: CurrencyCode;
}

export const INTERNATIONAL_BANKS = [
  "Chase",
  "Bank of America",
  "Wells Fargo",
  "Citibank",
  "Capital One",
  "HSBC",
  "Barclays",
  "Lloyds Bank",
  "NatWest",
  "Santander",
  "Deutsche Bank",
  "BNP Paribas",
  "ING",
  "Rabobank",
  "UniCredit",
  "Commerzbank",
  "Société Générale",
  "Credit Suisse",
  "UBS",
  "Revolut",
  "N26",
  "Monzo",
  "Other",
];

export interface Loan {
  id: string;
  title: string;
  bank?: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  paymentDay: number;
  interestRate?: number;
  installmentCount?: number;
  installmentPaid?: number;
  startDate: string;
  note?: string;
  currency?: CurrencyCode;
}

export type MemberOwner = string;

export type RecurringFrequency = "daily" | "weekly" | "monthly";

export interface Income {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringDay?: number;
  recurringEndDate?: string;
  note?: string;
  memberOwner?: MemberOwner;
  memberOwnerName?: string;
  creatorId?: string;
  creatorName?: string;
  visibility?: "shared" | "private";
  currency?: CurrencyCode;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  subcategory: string;
  brand?: string;
  date: string;
  paymentMethod: PaymentMethod;
  creditCardId?: string;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringDay?: number;
  recurringEndDate?: string;
  isInstallment: boolean;
  installmentTotal?: number;
  installmentCount?: number;
  installmentCurrent?: number;
  note?: string;
  memberOwner?: MemberOwner;
  memberOwnerName?: string;
  creatorId?: string;
  creatorName?: string;
  visibility?: "shared" | "private";
  loanId?: string;
  currency?: CurrencyCode;
}

export function formatInputAmount(value: string): string {
  let cleaned = value.replace(/\./g, "").replace(/[^0-9,]/g, "");
  const parts = cleaned.split(",");
  let intPart = parts[0] || "";
  intPart = intPart.replace(/^0+(?=\d)/, "");
  let formatted = "";
  for (let i = intPart.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) formatted = "." + formatted;
    formatted = intPart[i] + formatted;
  }
  if (parts.length > 1) {
    const decimalPart = parts[1].slice(0, 2);
    formatted += "," + decimalPart;
  }
  return formatted;
}

export function parseInputAmount(value: string): number {
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export const INCOME_CATEGORIES = [
  "Maaş",
  "Eş Maaşı",
  "Ek Gelir",
  "Yatırım Geliri",
  "Kira Geliri",
  "Diğer",
];

export const EXPENSE_CATEGORIES: Record<string, string[]> = {
  "Ev": ["Kira", "Aidat", "Tadilat", "Temizlik", "Mobilya/Dekor", "Diğer"],
  "Faturalar": ["Elektrik", "Su", "Doğalgaz", "İnternet", "Telefon", "Abonelikler", "Diğer"],
  "Market": ["Süpermarket", "Manav", "Kasap", "Fırın", "Mahalle Bakkalı", "Diğer"],
  "Yemek Siparişi": ["Yemeksepeti", "Trendyol Yemek", "Getir", "Migros Yemek", "GoFody", "Diğer"],
  "Araç Giderleri": ["Yakıt", "Bakım/Onarım", "Sigorta", "Kasko", "MTV", "HGS/Geçiş", "Park", "Diğer"],
  "Toplu Taşıma": ["Otobüs", "Metro", "Tramvay", "Minibüs", "Taksi", "Uçak", "Tren", "Vapur", "Diğer"],
  "Sağlık": ["Eczane", "Doktor", "Hastane", "Psikolog", "Psikiyatrist", "Diş", "Spor Salonu", "Diğer"],
  "Eğlence": ["Sinema", "Konser", "Restoran", "Kafe", "Tatil", "Tiyatro", "Halısaha", "Spor Aktiviteleri", "Diğer"],
  "Çocuk/Bebek": ["Bez", "Mama", "Okul Taksiti", "Okul Alışverişi", "Oyuncak", "Çocuk Giyim", "Çocuk Sağlık", "Diğer"],
  "Online Alışveriş": ["Trendyol", "Hepsiburada", "Amazon", "N11", "Diğer"],
  "Giyim": ["Kıyafet", "Ayakkabı", "Aksesuar", "Diğer"],
  "Eğitim": ["Okul", "Kurs", "Kitap", "Özel Ders", "Diğer"],
  "Kredi Ödemesi": ["Konut Kredisi", "Taşıt Kredisi", "İhtiyaç Kredisi", "Diğer"],
  "Diğer": ["Genel", "Beklenmedik", "Hediye", "Diğer"],
};

export const CATEGORY_GROUPS: Record<string, string[]> = {
  "Gıda & Market": ["Market", "Yemek Siparişi"],
  "Ulaşım": ["Toplu Taşıma"],
  "Araç Giderleri": ["Araç Giderleri"],
  "Faturalar": ["Faturalar"],
  "Alışveriş": ["Online Alışveriş", "Giyim"],
  "Ev & Yaşam": ["Ev", "Sağlık", "Eğitim"],
  "Eğlence": ["Eğlence"],
  "Finansal": ["Kredi Ödemesi"],
};

const STORAGE_KEYS = {
  INCOMES: "@budget_incomes",
  EXPENSES: "@budget_expenses",
  SELECTED_MONTH: "@budget_selected_month",
  CREDIT_CARDS: "@budget_credit_cards",
  LOANS: "@budget_loans",
  SAVINGS_GOAL: "@budget_savings_goal",
  SYNCED: "@budget_synced",
};

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const MEMBER_COLORS = [
  "#0A84FF",
  "#BF5AF2",
  "#FF9F0A",
  "#FF453A",
  "#5AC8FA",
  "#00C97A",
  "#FF6B6B",
  "#4ECDC4",
];

export function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

interface BudgetContextValue {
  incomes: Income[];
  expenses: Expense[];
  creditCards: CreditCard[];
  loans: Loan[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  addIncome: (income: Omit<Income, "id">) => void;
  updateIncome: (income: Income) => void;
  deleteIncome: (id: string) => void;
  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  addCreditCard: (card: Omit<CreditCard, "id">) => void;
  updateCreditCard: (card: CreditCard) => void;
  deleteCreditCard: (id: string) => void;
  addLoan: (loan: Omit<Loan, "id">) => void;
  updateLoan: (loan: Loan) => void;
  deleteLoan: (id: string) => void;
  makeLoanPayment: (id: string) => void;
  monthlyIncome: number;
  monthlyExpenses: number;
  remaining: number;
  incomeByCurrency: Record<string, number>;
  expensesByCurrency: Record<string, number>;
  remainingByCurrency: Record<string, number>;
  spendingByCategory: Record<string, number>;
  spendingByCard: Record<string, number>;
  incomeByCategory: Record<string, number>;
  spendingByMember: { self: number; spouse: number; shared: number; selfByCategory: Record<string, number>; spouseByCategory: Record<string, number>; byMember: Record<string, { amount: number; name: string; byCategory: Record<string, number> }> };
  financialHealthScore: number;
  dailyAverage: number;
  projectedEndDate: string | null;
  upcomingPayments: Array<{
    title: string;
    amount: number;
    currency?: CurrencyCode;
    daysLeft: number;
    type: "income" | "expense" | "loan" | "creditcard";
  }>;
  recentTransactions: Array<(Income & { type: "income" }) | (Expense & { type: "expense" })>;
  creditCardSpending: number;
  creditCardPaymentTotal: number;
  totalLoanPayments: number;
  previousMonthSpending: Record<string, number>;
  savingsGoal: number;
  setSavingsGoal: (amount: number) => void;
  isLoading: boolean;
  refreshFromServer: () => Promise<void>;
  exchangeRates: Record<string, number>;
  toTRY: (amount: number, currency?: CurrencyCode) => number;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [savingsGoal, setSavingsGoalState] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ TRY: 1, USD: 34, EUR: 37, GBP: 43 });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncedRef = useRef(false);

  const familyCode = user?.familyCode;
  const userId = user?.id;
  const userName = user?.name;

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    loadData();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [familyCode]);

  useEffect(() => {
    async function fetchRates() {
      try {
        const url = new URL("/api/market-prices", getApiUrl());
        const res = await fetch(url.toString());
        const data = await res.json();
        if (data && data.usd && data.eur && data.gbp) {
          setExchangeRates({ TRY: 1, USD: data.usd, EUR: data.eur, GBP: data.gbp });
        }
      } catch {}
    }
    fetchRates();
    const iv = setInterval(fetchRates, 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const toTRY = useCallback(
    (amount: number, currency?: CurrencyCode): number => {
      if (!currency || currency === "TRY") return amount;
      return amount * (exchangeRates[currency] || 1);
    },
    [exchangeRates]
  );

  async function serverFetch(path: string, options?: RequestInit) {
    try {
      const url = new URL(path, getApiUrl());
      const res = await fetch(url.toString(), {
        ...options,
        headers: { "Content-Type": "application/json", ...options?.headers },
      });
      return await res.json();
    } catch {
      return null;
    }
  }

  function visibleItems<T extends { visibility?: string; creatorId?: string }>(items: T[]): T[] {
    if (!userId) return items;
    return items.filter(
      (item) => item.visibility !== "private" || item.creatorId === userId
    );
  }

  async function loadData() {
    try {
      const [incomesJson, expensesJson, monthJson, cardsJson, loansJson, goalJson, syncedJson] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.INCOMES),
          AsyncStorage.getItem(STORAGE_KEYS.EXPENSES),
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_MONTH),
          AsyncStorage.getItem(STORAGE_KEYS.CREDIT_CARDS),
          AsyncStorage.getItem(STORAGE_KEYS.LOANS),
          AsyncStorage.getItem(STORAGE_KEYS.SAVINGS_GOAL),
          AsyncStorage.getItem(STORAGE_KEYS.SYNCED),
        ]);

      let localIncomes: Income[] = incomesJson ? JSON.parse(incomesJson) : [];
      let localExpenses: Expense[] = expensesJson ? JSON.parse(expensesJson) : [];
      let localCards: CreditCard[] = cardsJson ? JSON.parse(cardsJson) : [];
      let localLoans: Loan[] = loansJson ? JSON.parse(loansJson) : [];
      let localGoal = goalJson ? parseFloat(goalJson) || 0 : 0;

      if (monthJson) setSelectedMonth(monthJson);

      if (familyCode) {
        const alreadySynced = syncedJson === familyCode;

        if (!alreadySynced) {
          const ownIncomes = localIncomes.filter((i) => !i.creatorId || i.creatorId === userId);
          const ownExpenses = localExpenses.filter((e) => !e.creatorId || e.creatorId === userId);
          const hasOwnData = ownIncomes.length > 0 || ownExpenses.length > 0 || localCards.length > 0 || localLoans.length > 0;

          if (hasOwnData) {
            const tagged = <T extends { creatorId?: string; creatorName?: string }>(items: T[]): T[] =>
              items.map((item) => ({
                ...item,
                creatorId: item.creatorId || userId,
                creatorName: item.creatorName || userName,
              }));
            const serverResult = await serverFetch("/api/budget/sync", {
              method: "POST",
              body: JSON.stringify({
                familyCode,
                incomes: tagged(ownIncomes),
                expenses: tagged(ownExpenses),
                creditCards: localCards,
                loans: localLoans,
                savingsGoal: localGoal,
              }),
            });

            if (serverResult && serverResult.incomes) {
              localIncomes = serverResult.incomes;
              localExpenses = serverResult.expenses;
              localCards = serverResult.creditCards;
              localLoans = serverResult.loans;
              localGoal = serverResult.savingsGoal || 0;
            }
          } else {
            const serverBudget = await serverFetch(`/api/budget/${familyCode}`);
            if (serverBudget && serverBudget.incomes) {
              localIncomes = serverBudget.incomes;
              localExpenses = serverBudget.expenses;
              localCards = serverBudget.creditCards;
              localLoans = serverBudget.loans;
              localGoal = serverBudget.savingsGoal || 0;
            }
          }
          await AsyncStorage.setItem(STORAGE_KEYS.SYNCED, familyCode);
          syncedRef.current = true;
        } else {
          const serverBudget = await serverFetch(`/api/budget/${familyCode}`);
          if (serverBudget && serverBudget.incomes) {
            localIncomes = serverBudget.incomes;
            localExpenses = serverBudget.expenses;
            localCards = serverBudget.creditCards;
            localLoans = serverBudget.loans;
            localGoal = serverBudget.savingsGoal || 0;
            syncedRef.current = true;
          }
        }

        if (!pollRef.current) {
          pollRef.current = setInterval(() => refreshFromServer(), 15000);
        }
      }

      setIncomes(localIncomes);
      setExpenses(localExpenses);
      setCreditCards(localCards);
      setLoans(localLoans);
      setSavingsGoalState(localGoal);

      await Promise.all([
        save(STORAGE_KEYS.INCOMES, localIncomes),
        save(STORAGE_KEYS.EXPENSES, localExpenses),
        save(STORAGE_KEYS.CREDIT_CARDS, localCards),
        save(STORAGE_KEYS.LOANS, localLoans),
      ]);
    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setIsLoading(false);
    }
  }

  const refreshFromServer = useCallback(async () => {
    if (!familyCode) return;
    try {
      const serverBudget = await serverFetch(`/api/budget/${familyCode}`);
      if (serverBudget && serverBudget.incomes) {
        setIncomes(serverBudget.incomes);
        setExpenses(serverBudget.expenses);
        setCreditCards(serverBudget.creditCards);
        setLoans(serverBudget.loans);
        if (serverBudget.savingsGoal !== undefined) setSavingsGoalState(serverBudget.savingsGoal);
        await Promise.all([
          save(STORAGE_KEYS.INCOMES, serverBudget.incomes),
          save(STORAGE_KEYS.EXPENSES, serverBudget.expenses),
          save(STORAGE_KEYS.CREDIT_CARDS, serverBudget.creditCards),
          save(STORAGE_KEYS.LOANS, serverBudget.loans),
        ]);
      }
    } catch {}
  }, [familyCode]);

  function setSavingsGoal(amount: number) {
    setSavingsGoalState(amount);
    save(STORAGE_KEYS.SAVINGS_GOAL, amount);
    if (familyCode) {
      serverFetch("/api/budget/savings-goal", {
        method: "PUT",
        body: JSON.stringify({ familyCode, amount }),
      });
    }
  }

  async function save(key: string, data: unknown) {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  }

  function addIncome(income: Omit<Income, "id">) {
    const newIncome: Income = {
      ...income,
      id: genId(),
      creatorId: income.creatorId || userId || undefined,
      creatorName: income.creatorName || userName || undefined,
      visibility: income.visibility || "shared",
    };
    const updated = [newIncome, ...incomes];
    setIncomes(updated);
    save(STORAGE_KEYS.INCOMES, updated);
    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "POST",
        body: JSON.stringify({ familyCode, type: "incomes", item: newIncome }),
      });
    }
  }

  function updateIncome(income: Income) {
    const updated = incomes.map((i) => (i.id === income.id ? income : i));
    setIncomes(updated);
    save(STORAGE_KEYS.INCOMES, updated);
    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "PUT",
        body: JSON.stringify({ familyCode, type: "incomes", item: income }),
      });
    }
  }

  function deleteIncome(id: string) {
    const updated = incomes.filter((i) => i.id !== id);
    setIncomes(updated);
    save(STORAGE_KEYS.INCOMES, updated);
    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "DELETE",
        body: JSON.stringify({ familyCode, type: "incomes", itemId: id }),
      });
    }
  }

  function addExpense(expense: Omit<Expense, "id">) {
    const newExpense: Expense = {
      ...expense,
      id: genId(),
      creatorId: expense.creatorId || userId || undefined,
      creatorName: expense.creatorName || userName || undefined,
      visibility: expense.visibility || "shared",
    };
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    save(STORAGE_KEYS.EXPENSES, updated);
    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "POST",
        body: JSON.stringify({ familyCode, type: "expenses", item: newExpense }),
      });
    }
  }

  function updateExpense(expense: Expense) {
    const updated = expenses.map((e) => (e.id === expense.id ? expense : e));
    setExpenses(updated);
    save(STORAGE_KEYS.EXPENSES, updated);
    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "PUT",
        body: JSON.stringify({ familyCode, type: "expenses", item: expense }),
      });
    }
  }

  function deleteExpense(id: string) {
    const expenseToDelete = expenses.find((e) => e.id === id);
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    save(STORAGE_KEYS.EXPENSES, updated);

    let matchedLoanId = expenseToDelete?.loanId;
    if (!matchedLoanId && expenseToDelete?.category === "Kredi Ödemesi" && expenseToDelete?.title) {
      const titlePrefix = expenseToDelete.title.replace(" Taksit Ödemesi", "");
      const matchedLoan = loans.find((l) => l.title === titlePrefix);
      if (matchedLoan) matchedLoanId = matchedLoan.id;
    }
    if (matchedLoanId) {
      const loanId = matchedLoanId;
      const updatedLoans = loans.map((l) => {
        if (l.id !== loanId) return l;
        const newPaid = Math.max(0, (l.installmentPaid || 0) - 1);
        const newRemaining = l.installmentCount
          ? (l.installmentCount - newPaid) * l.monthlyPayment
          : l.remainingAmount + l.monthlyPayment;
        return { ...l, installmentPaid: newPaid, remainingAmount: Math.max(0, newRemaining) };
      });
      setLoans(updatedLoans);
      save(STORAGE_KEYS.LOANS, updatedLoans);
      if (familyCode) {
        const updatedLoan = updatedLoans.find((l) => l.id === loanId);
        if (updatedLoan) {
          serverFetch("/api/budget/item", {
            method: "PUT",
            body: JSON.stringify({ familyCode, type: "loans", item: updatedLoan }),
          });
        }
      }
    }

    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "DELETE",
        body: JSON.stringify({ familyCode, type: "expenses", itemId: id }),
      });
    }
  }

  function addCreditCard(card: Omit<CreditCard, "id">) {
    const newCard = { ...card, id: genId() };
    const updated = [...creditCards, newCard];
    setCreditCards(updated);
    save(STORAGE_KEYS.CREDIT_CARDS, updated);
    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "POST",
        body: JSON.stringify({ familyCode, type: "creditCards", item: newCard }),
      });
    }
  }
  function updateCreditCard(card: CreditCard) {
    const updated = creditCards.map((c) => (c.id === card.id ? card : c));
    setCreditCards(updated);
    save(STORAGE_KEYS.CREDIT_CARDS, updated);
    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "PUT",
        body: JSON.stringify({ familyCode, type: "creditCards", item: card }),
      });
    }
  }
  function deleteCreditCard(id: string) {
    const updated = creditCards.filter((c) => c.id !== id);
    setCreditCards(updated);
    save(STORAGE_KEYS.CREDIT_CARDS, updated);
    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "DELETE",
        body: JSON.stringify({ familyCode, type: "creditCards", itemId: id }),
      });
    }
  }

  function addLoan(loan: Omit<Loan, "id">) {
    const newLoan = { ...loan, id: genId() };
    const updated = [...loans, newLoan];
    setLoans(updated);
    save(STORAGE_KEYS.LOANS, updated);
    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "POST",
        body: JSON.stringify({ familyCode, type: "loans", item: newLoan }),
      });
    }
  }
  function updateLoan(loan: Loan) {
    const updated = loans.map((l) => (l.id === loan.id ? loan : l));
    setLoans(updated);
    save(STORAGE_KEYS.LOANS, updated);
    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "PUT",
        body: JSON.stringify({ familyCode, type: "loans", item: loan }),
      });
    }
  }
  function deleteLoan(id: string) {
    const updated = loans.filter((l) => l.id !== id);
    setLoans(updated);
    save(STORAGE_KEYS.LOANS, updated);
    if (familyCode) {
      serverFetch("/api/budget/item", {
        method: "DELETE",
        body: JSON.stringify({ familyCode, type: "loans", itemId: id }),
      });
    }
  }
  function makeLoanPayment(id: string) {
    const loan = loans.find((l) => l.id === id);
    if (!loan) return;
    const newPaid = (loan.installmentPaid || 0) + 1;
    const newRemaining = loan.installmentCount
      ? Math.max(0, (loan.installmentCount - newPaid) * loan.monthlyPayment)
      : Math.max(0, loan.remainingAmount - loan.monthlyPayment);
    const updated = loans.map((l) =>
      l.id !== id ? l : { ...l, installmentPaid: newPaid, remainingAmount: newRemaining }
    );
    setLoans(updated);
    save(STORAGE_KEYS.LOANS, updated);

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const newExpense: Expense = {
      id: genId(),
      title: `${loan.title} Taksit Ödemesi`,
      amount: loan.monthlyPayment,
      category: "Kredi Ödemesi",
      subcategory: "İhtiyaç Kredisi",
      date: dateStr,
      paymentMethod: "debit",
      isRecurring: false,
      isInstallment: false,
      creatorId: userId || undefined,
      creatorName: userName || undefined,
      visibility: "shared",
      loanId: id,
      currency: loan.currency,
    };
    const updatedExpenses = [...expenses, newExpense];
    setExpenses(updatedExpenses);
    save(STORAGE_KEYS.EXPENSES, updatedExpenses);

    if (familyCode) {
      const updatedLoan = updated.find((l) => l.id === id);
      if (updatedLoan) {
        serverFetch("/api/budget/item", {
          method: "PUT",
          body: JSON.stringify({ familyCode, type: "loans", item: updatedLoan }),
        });
      }
      serverFetch("/api/budget/item", {
        method: "POST",
        body: JSON.stringify({ familyCode, type: "expenses", item: newExpense }),
      });
    }
  }

  const visibleIncomes = useMemo(() => visibleItems(incomes), [incomes, userId]);
  const visibleExpenses = useMemo(() => visibleItems(expenses), [expenses, userId]);

  const filteredIncomes = useMemo(
    () => visibleIncomes.filter((i) => i.date.substring(0, 7) === selectedMonth),
    [visibleIncomes, selectedMonth]
  );
  const filteredExpenses = useMemo(
    () => visibleExpenses.filter((e) => e.date.substring(0, 7) === selectedMonth),
    [visibleExpenses, selectedMonth]
  );

  const monthlyIncome = useMemo(
    () => filteredIncomes.reduce((sum, i) => sum + toTRY(i.amount, i.currency), 0),
    [filteredIncomes, toTRY]
  );
  const monthlyExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + toTRY(e.amount, e.currency), 0),
    [filteredExpenses, toTRY]
  );

  const incomeByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    filteredIncomes.forEach((i) => {
      const c = i.currency || "TRY";
      map[c] = (map[c] || 0) + i.amount;
    });
    return map;
  }, [filteredIncomes]);

  const expensesByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const c = e.currency || "TRY";
      map[c] = (map[c] || 0) + e.amount;
    });
    return map;
  }, [filteredExpenses]);

  const remainingByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    const allCurrencies = new Set([...Object.keys(incomeByCurrency), ...Object.keys(expensesByCurrency)]);
    allCurrencies.forEach((c) => {
      const inc = incomeByCurrency[c] || 0;
      const exp = expensesByCurrency[c] || 0;
      const diff = inc - exp;
      if (diff !== 0 || inc > 0 || exp > 0) {
        map[c] = diff;
      }
    });
    return map;
  }, [incomeByCurrency, expensesByCurrency]);

  const totalLoanPayments = useMemo(
    () => loans.reduce((sum, l) => sum + toTRY(l.monthlyPayment, l.currency), 0),
    [loans, toTRY]
  );

  const nonCreditExpenses = useMemo(
    () => filteredExpenses.filter((e) => e.paymentMethod !== "credit").reduce((sum, e) => sum + toTRY(e.amount, e.currency), 0),
    [filteredExpenses, toTRY]
  );

  const creditCardPaymentTotal = useMemo(() => {
    return creditCards.reduce((sum, card) => {
      const cardSpend = filteredExpenses
        .filter((e) => e.paymentMethod === "credit" && e.creditCardId === card.id)
        .reduce((s, e) => s + toTRY(e.amount, e.currency), 0);
      const debtInTRY = toTRY(card.currentDebt ?? 0, card.currency);
      const totalDue = cardSpend + debtInTRY;
      if (totalDue <= 0) return sum;
      const pref = card.paymentPreference ?? "full";
      if (pref === "full") return sum + totalDue;
      if (pref === "minimum") return sum + Math.ceil(totalDue * 0.20);
      if (pref === "percentage") return sum + Math.ceil(totalDue * ((card.paymentPercentage ?? 100) / 100));
      const customInTRY = toTRY(card.customPaymentAmount ?? 0, card.currency);
      return sum + Math.min(customInTRY || totalDue, totalDue);
    }, 0);
  }, [creditCards, filteredExpenses, toTRY]);

  const remaining = monthlyIncome - nonCreditExpenses - creditCardPaymentTotal;

  const spendingByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + toTRY(e.amount, e.currency);
    });
    return map;
  }, [filteredExpenses, toTRY]);

  const previousMonthSpending = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const map: Record<string, number> = {};
    visibleExpenses
      .filter((e) => e.date.substring(0, 7) === prevMonth)
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + toTRY(e.amount, e.currency);
      });
    return map;
  }, [visibleExpenses, selectedMonth, toTRY]);

  const spendingByCard = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses
      .filter((e) => e.paymentMethod === "credit" && e.creditCardId)
      .forEach((e) => {
        const cardId = e.creditCardId!;
        map[cardId] = (map[cardId] || 0) + toTRY(e.amount, e.currency);
      });
    return map;
  }, [filteredExpenses, toTRY]);

  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredIncomes.forEach((i) => {
      map[i.category] = (map[i.category] || 0) + toTRY(i.amount, i.currency);
    });
    return map;
  }, [filteredIncomes, toTRY]);

  const spendingByMember = useMemo(() => {
    let self = 0, spouse = 0, shared = 0;
    const selfByCategory: Record<string, number> = {};
    const spouseByCategory: Record<string, number> = {};
    const byMember: Record<string, { amount: number; name: string; byCategory: Record<string, number> }> = {};
    filteredExpenses.forEach((e) => {
      const amt = toTRY(e.amount, e.currency);
      const owner = e.memberOwner ?? "shared";
      if (owner === "self" || owner === userId) {
        self += amt;
        selfByCategory[e.category] = (selfByCategory[e.category] || 0) + amt;
      } else if (owner === "shared") {
        shared += amt;
      } else {
        spouse += amt;
        spouseByCategory[e.category] = (spouseByCategory[e.category] || 0) + amt;
      }
      const memberKey = (owner === "self" || owner === userId) ? userId || "self" : owner;
      const memberName = (owner === "self" || owner === userId) ? (e.memberOwnerName || "Ben") : (owner === "shared" ? "Ortak" : (e.memberOwnerName || owner));
      if (!byMember[memberKey]) {
        byMember[memberKey] = { amount: 0, name: memberName, byCategory: {} };
      }
      byMember[memberKey].amount += amt;
      byMember[memberKey].byCategory[e.category] = (byMember[memberKey].byCategory[e.category] || 0) + amt;
    });
    return { self, spouse, shared, selfByCategory, spouseByCategory, byMember };
  }, [filteredExpenses, userId, toTRY]);

  const creditCardSpending = useMemo(
    () =>
      filteredExpenses
        .filter((e) => e.paymentMethod === "credit")
        .reduce((sum, e) => sum + toTRY(e.amount, e.currency), 0),
    [filteredExpenses, toTRY]
  );

  const financialHealthScore = useMemo(() => {
    if (monthlyIncome === 0) return 0;
    const savingsRate = remaining / monthlyIncome;
    let score: number;
    if (savingsRate >= 0) {
      score = savingsRate * 100;
    } else {
      score = Math.max(0, 100 + savingsRate * 100);
    }
    const creditRatio = creditCardSpending / monthlyIncome;
    if (creditRatio > 0.6) score -= 15;
    else if (creditRatio > 0.4) score -= 10;
    else if (creditRatio > 0.25) score -= 5;
    const loanRatio = totalLoanPayments / monthlyIncome;
    if (loanRatio > 0.5) score -= 15;
    else if (creditRatio > 0.35) score -= 10;
    else if (loanRatio > 0.2) score -= 5;
    const recurringExpenses = filteredExpenses
      .filter((e) => e.isRecurring)
      .reduce((sum, e) => sum + toTRY(e.amount, e.currency), 0);
    const recurringRatio = recurringExpenses / monthlyIncome;
    if (recurringRatio > 0.7) score -= 10;
    else if (recurringRatio > 0.5) score -= 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [monthlyIncome, remaining, creditCardSpending, totalLoanPayments, filteredExpenses, toTRY]);

  const dailyAverage = useMemo(() => {
    const now = new Date();
    const [year, month] = selectedMonth.split("-").map(Number);
    const isCurrentMonth =
      year === now.getFullYear() && month === now.getMonth() + 1;
    const daysElapsed = isCurrentMonth
      ? now.getDate()
      : new Date(year, month, 0).getDate();
    if (daysElapsed === 0) return 0;
    return monthlyExpenses / daysElapsed;
  }, [monthlyExpenses, selectedMonth]);

  const projectedEndDate = useMemo(() => {
    if (monthlyIncome === 0) return null;
    const now = new Date();
    const [year, month] = selectedMonth.split("-").map(Number);
    const isCurrentMonth =
      year === now.getFullYear() && month === now.getMonth() + 1;
    if (!isCurrentMonth) return null;
    const today = now.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const alreadyPaidRecurring = filteredExpenses
      .filter((e) => e.isRecurring && e.recurringDay !== undefined && e.recurringDay <= today)
      .reduce((sum, e) => sum + toTRY(e.amount, e.currency), 0);
    const upcomingRecurring = filteredExpenses
      .filter((e) => e.isRecurring && e.recurringDay !== undefined && e.recurringDay > today)
      .reduce((sum, e) => sum + toTRY(e.amount, e.currency), 0);
    const upcomingLoanCost = loans
      .filter((l) => l.paymentDay > today)
      .reduce((sum, l) => sum + toTRY(l.monthlyPayment, l.currency), 0);
    const variableSpentToDate = monthlyExpenses - alreadyPaidRecurring - upcomingRecurring;
    const variableDailyAvg = today > 0 && variableSpentToDate > 0
      ? variableSpentToDate / today
      : 0;
    const upcomingObligations = upcomingLoanCost + upcomingRecurring;
    const adjustedRemaining = remaining - upcomingObligations;
    if (adjustedRemaining <= 0) return "Bu ay";
    if (variableDailyAvg <= 0) {
      return daysInMonth - today > 0 ? "Ay sonu" : null;
    }
    const daysCanLast = adjustedRemaining / variableDailyAvg;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Math.floor(daysCanLast));
    const endDay = endDate.getDate();
    const endMonth = endDate.getMonth();
    if (endMonth > now.getMonth()) return "Ay sonu";
    return `${endDay} ${endDate.toLocaleDateString("tr-TR", { month: "long" })}`;
  }, [monthlyIncome, monthlyExpenses, remaining, filteredExpenses, loans, selectedMonth, toTRY]);

  const upcomingPayments = useMemo(() => {
    const now = new Date();
    const today = now.getDate();
    const result: Array<{
      title: string;
      amount: number;
      currency?: CurrencyCode;
      daysLeft: number;
      type: "income" | "expense" | "loan" | "creditcard";
    }> = [];
    visibleIncomes
      .filter((i) => i.isRecurring && i.recurringDay !== undefined)
      .forEach((i) => {
        const day = i.recurringDay!;
        let daysLeft = day - today;
        if (daysLeft < 0) daysLeft += 30;
        if (daysLeft <= 14) {
          result.push({ title: i.title, amount: i.amount, currency: i.currency, daysLeft, type: "income" });
        }
      });
    visibleExpenses
      .filter((e) => e.isRecurring && e.recurringDay !== undefined && e.paymentMethod !== "credit")
      .forEach((e) => {
        const day = e.recurringDay!;
        let daysLeft = day - today;
        if (daysLeft < 0) daysLeft += 30;
        if (daysLeft <= 14) {
          result.push({ title: e.title, amount: e.amount, currency: e.currency, daysLeft, type: "expense" });
        }
      });
    loans.forEach((l) => {
      let daysLeft = l.paymentDay - today;
      if (daysLeft < 0) daysLeft += 30;
      if (daysLeft <= 14) {
        result.push({
          title: `${l.title} Kredisi`,
          amount: l.monthlyPayment,
          currency: l.currency,
          daysLeft,
          type: "loan",
        });
      }
    });
    creditCards.forEach((c) => {
      let daysLeft = c.paymentDay - today;
      if (daysLeft < 0) daysLeft += 30;
      if (daysLeft <= 14) {
        const cardSpend = spendingByCard[c.id] || 0;
        const totalDue = cardSpend + toTRY(c.currentDebt ?? 0, c.currency);
        if (totalDue > 0) {
          const pref = c.paymentPreference ?? "full";
          let payAmt = totalDue;
          if (pref === "minimum") payAmt = Math.ceil(totalDue * 0.20);
          else if (pref === "percentage") payAmt = Math.ceil(totalDue * ((c.paymentPercentage ?? 100) / 100));
          else if (pref === "custom") payAmt = Math.min(c.customPaymentAmount ?? totalDue, totalDue);
          result.push({
            title: `${c.bank} ${c.name}`,
            amount: payAmt,
            daysLeft,
            type: "creditcard",
          });
        }
      }
    });
    return result.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 6);
  }, [visibleIncomes, visibleExpenses, loans, creditCards, spendingByCard, toTRY]);

  const recentTransactions = useMemo(() => {
    const all = [
      ...filteredIncomes.map((i) => ({ ...i, type: "income" as const })),
      ...filteredExpenses.map((e) => ({ ...e, type: "expense" as const })),
    ];
    return all
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [filteredIncomes, filteredExpenses]);

  const value = useMemo(
    () => ({
      incomes: visibleIncomes,
      expenses: visibleExpenses,
      creditCards,
      loans,
      selectedMonth,
      setSelectedMonth,
      addIncome,
      updateIncome,
      deleteIncome,
      addExpense,
      updateExpense,
      deleteExpense,
      addCreditCard,
      updateCreditCard,
      deleteCreditCard,
      addLoan,
      updateLoan,
      deleteLoan,
      makeLoanPayment,
      monthlyIncome,
      monthlyExpenses,
      remaining,
      incomeByCurrency,
      expensesByCurrency,
      remainingByCurrency,
      spendingByCategory,
      spendingByCard,
      incomeByCategory,
      spendingByMember,
      financialHealthScore,
      dailyAverage,
      projectedEndDate,
      upcomingPayments,
      recentTransactions,
      creditCardSpending,
      creditCardPaymentTotal,
      totalLoanPayments,
      previousMonthSpending,
      savingsGoal,
      setSavingsGoal,
      isLoading,
      refreshFromServer,
      exchangeRates,
      toTRY,
    }),
    [
      visibleIncomes,
      visibleExpenses,
      creditCards,
      loans,
      selectedMonth,
      monthlyIncome,
      monthlyExpenses,
      remaining,
      incomeByCurrency,
      expensesByCurrency,
      remainingByCurrency,
      spendingByCategory,
      spendingByCard,
      incomeByCategory,
      spendingByMember,
      financialHealthScore,
      dailyAverage,
      projectedEndDate,
      upcomingPayments,
      recentTransactions,
      creditCardSpending,
      creditCardPaymentTotal,
      totalLoanPayments,
      previousMonthSpending,
      savingsGoal,
      isLoading,
      refreshFromServer,
      exchangeRates,
      toTRY,
    ]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget must be used within BudgetProvider");
  return ctx;
}
