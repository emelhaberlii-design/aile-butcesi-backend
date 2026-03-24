import * as fs from "fs";
import * as path from "path";

interface BudgetItem {
  id: string;
  [key: string]: unknown;
}

interface FamilyBudget {
  incomes: BudgetItem[];
  expenses: BudgetItem[];
  creditCards: BudgetItem[];
  loans: BudgetItem[];
  savingsGoal: number;
  lastUpdated: string;
}

interface BudgetStore {
  [familyCode: string]: FamilyBudget;
}

const DATA_FILE = path.join(process.cwd(), ".data", "budgets.json");

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadStore(): BudgetStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveStore(data: BudgetStore) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function emptyBudget(): FamilyBudget {
  return {
    incomes: [],
    expenses: [],
    creditCards: [],
    loans: [],
    savingsGoal: 0,
    lastUpdated: new Date().toISOString(),
  };
}

export function getFamilyBudget(familyCode: string): FamilyBudget {
  const store = loadStore();
  return store[familyCode.toUpperCase()] || emptyBudget();
}

export function syncFamilyBudget(
  familyCode: string,
  data: {
    incomes?: BudgetItem[];
    expenses?: BudgetItem[];
    creditCards?: BudgetItem[];
    loans?: BudgetItem[];
    savingsGoal?: number;
  }
): FamilyBudget {
  const store = loadStore();
  const code = familyCode.toUpperCase();
  const existing = store[code] || emptyBudget();

  const mergeById = (
    server: BudgetItem[],
    incoming: BudgetItem[]
  ): BudgetItem[] => {
    const map = new Map<string, BudgetItem>();
    server.forEach((item) => map.set(item.id, item));
    incoming.forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  };

  if (data.incomes) existing.incomes = mergeById(existing.incomes, data.incomes);
  if (data.expenses) existing.expenses = mergeById(existing.expenses, data.expenses);
  if (data.creditCards) existing.creditCards = mergeById(existing.creditCards, data.creditCards);
  if (data.loans) existing.loans = mergeById(existing.loans, data.loans);
  if (data.savingsGoal !== undefined) existing.savingsGoal = data.savingsGoal;
  existing.lastUpdated = new Date().toISOString();

  store[code] = existing;
  saveStore(store);
  return existing;
}

export function addBudgetItem(
  familyCode: string,
  type: "incomes" | "expenses" | "creditCards" | "loans",
  item: BudgetItem
): void {
  const store = loadStore();
  const code = familyCode.toUpperCase();
  if (!store[code]) store[code] = emptyBudget();
  const exists = store[code][type].some((i) => i.id === item.id);
  if (!exists) {
    store[code][type].push(item);
  } else {
    store[code][type] = store[code][type].map((i) => (i.id === item.id ? item : i));
  }
  store[code].lastUpdated = new Date().toISOString();
  saveStore(store);
}

export function deleteBudgetItem(
  familyCode: string,
  type: "incomes" | "expenses" | "creditCards" | "loans",
  itemId: string
): void {
  const store = loadStore();
  const code = familyCode.toUpperCase();
  if (!store[code]) return;
  store[code][type] = store[code][type].filter((i) => i.id !== itemId);
  store[code].lastUpdated = new Date().toISOString();
  saveStore(store);
}

export function updateBudgetItem(
  familyCode: string,
  type: "incomes" | "expenses" | "creditCards" | "loans",
  item: BudgetItem
): void {
  const store = loadStore();
  const code = familyCode.toUpperCase();
  if (!store[code]) return;
  store[code][type] = store[code][type].map((i) => (i.id === item.id ? item : i));
  store[code].lastUpdated = new Date().toISOString();
  saveStore(store);
}

export function setSavingsGoal(familyCode: string, amount: number): void {
  const store = loadStore();
  const code = familyCode.toUpperCase();
  if (!store[code]) store[code] = emptyBudget();
  store[code].savingsGoal = amount;
  store[code].lastUpdated = new Date().toISOString();
  saveStore(store);
}
