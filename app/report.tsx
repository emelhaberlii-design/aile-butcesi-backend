import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useBudget } from "@/context/BudgetContext";
import { useBusinessBudget } from "@/context/BusinessContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useSavingsGoals } from "@/context/SavingsGoalsContext";

type Period = "daily" | "weekly" | "monthly" | "sixmonth" | "yearly";

function fmt(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(Math.round(n)) + " ₺";
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

function getPeriodRange(period: Period): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);
  let label = "";

  if (period === "daily") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    end.setHours(23, 59, 59);
    label = fmtDate(now);
  } else if (period === "weekly") {
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0);
    end.setHours(23, 59, 59);
    label = `${fmtDate(start)} – ${fmtDate(end)}`;
  } else if (period === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    end.setHours(23, 59, 59);
    label = now.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  } else if (period === "sixmonth") {
    start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0);
    end.setHours(23, 59, 59);
    label = `${fmtDate(start)} – ${fmtDate(end)}`;
  } else {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    end.setHours(23, 59, 59);
    label = `${now.getFullYear()} Yılı`;
  }
  return { start, end, label };
}

interface BusinessReportData {
  professionName: string;
  bizIncome: number;
  bizExpense: number;
  bizNet: number;
  bizExpenses: Array<{ title: string; amount: number; date: string; category: string }>;
  bizIncomes: Array<{ title: string; amount: number; date: string; category: string }>;
}

function generateHTML(
  period: Period,
  periodLabel: string,
  userName: string,
  familyName: string,
  totalIncome: number,
  totalExpense: number,
  remaining: number,
  categoryBreakdown: Array<{ cat: string; amount: number; pct: number }>,
  allExpenses: Array<{ title: string; amount: number; date: string; category: string; subcategory: string }>,
  allIncomes: Array<{ title: string; amount: number; date: string; category: string }>,
  creditCardTotal: number,
  loanTotal: number,
  goalsCount: number,
  isEN: boolean,
  cardDetails?: Array<{ name: string; bank: string; color: string; prevDebt: number; thisMonthSpend: number; nextBill: number }>,
  memberSpending?: { selfName: string; spouseName: string; self: number; spouse: number; shared: number },
  reportMode?: "family" | "business" | "both",
  businessData?: BusinessReportData,
): string {
  const periodNames: Record<Period, string> = {
    daily: isEN ? "Daily Report" : "Günlük Rapor",
    weekly: isEN ? "Weekly Report" : "Haftalık Rapor",
    monthly: isEN ? "Monthly Report" : "Aylık Rapor",
    sixmonth: isEN ? "6-Month Report" : "6 Aylık Rapor",
    yearly: isEN ? "Annual Report" : "Yıllık Rapor",
  };

  const mode = reportMode || "family";
  const showFamily = mode === "family" || mode === "both";
  const showBiz = (mode === "business" || mode === "both") && businessData;

  const txRows = allExpenses.map(tx => `
    <tr>
      <td>${tx.date}</td>
      <td>${tx.title}${tx.subcategory ? `<br><span style="color:#555;font-size:11px">${tx.subcategory}</span>` : ""}</td>
      <td>${tx.category}</td>
      <td style="text-align:right;color:#C0392B;font-weight:600">${fmt(tx.amount)}</td>
    </tr>
  `).join("");

  const incomeRows = allIncomes.map(i => `
    <tr>
      <td>${i.date}</td>
      <td>${i.title}</td>
      <td>${i.category}</td>
      <td style="text-align:right;color:#27AE60;font-weight:600">${fmt(i.amount)}</td>
    </tr>
  `).join("");

  const cardRows = (cardDetails ?? []).filter(c => c.nextBill > 0).map(c => `
    <tr>
      <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color};margin-right:6px"></span>${c.bank} – ${c.name}</td>
      <td style="text-align:right;color:#333">${fmt(c.thisMonthSpend)}</td>
      <td style="text-align:right;color:#E67E22">${fmt(c.prevDebt)}</td>
      <td style="text-align:right;font-weight:700;color:#C0392B">${fmt(c.nextBill)}</td>
    </tr>
  `).join("");

  const bizExpRows = showBiz ? businessData!.bizExpenses.map(e => `
    <tr>
      <td>${e.date}</td>
      <td>${e.title}</td>
      <td>${e.category}</td>
      <td style="text-align:right;color:#C0392B;font-weight:600">${fmt(e.amount)}</td>
    </tr>
  `).join("") : "";

  const bizIncRows = showBiz ? businessData!.bizIncomes.map(i => `
    <tr>
      <td>${i.date}</td>
      <td>${i.title}</td>
      <td>${i.category}</td>
      <td style="text-align:right;color:#27AE60;font-weight:600">${fmt(i.amount)}</td>
    </tr>
  `).join("") : "";

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Aile Bütçesi Raporu</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; background:#f7f7f7; color:#000; padding:0; line-height:1.5; }
  .page { max-width:720px; margin:0 auto; background:#fff; padding:44px 40px 56px; }
  .header { border-bottom:3px solid #1a1a1a; padding-bottom:20px; margin-bottom:30px; }
  .app-name { font-size:12px; font-weight:700; color:#27AE60; letter-spacing:2px; text-transform:uppercase; }
  .report-title { font-size:28px; font-weight:900; color:#000; margin:8px 0 4px; }
  .period-label { font-size:14px; color:#333; font-weight:500; }
  .meta { font-size:12px; color:#555; margin-top:10px; }
  .summary-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin:28px 0; }
  .sum-card { background:#fafafa; border-radius:12px; padding:20px 16px; border:1px solid #e0e0e0; }
  .sum-label { font-size:11px; color:#333; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px; }
  .sum-value { font-size:22px; font-weight:900; color:#000; }
  .income { color:#27AE60; }
  .expense { color:#C0392B; }
  .positive { color:#27AE60; }
  .negative { color:#C0392B; }
  .section { margin:30px 0; }
  .section-title { font-size:15px; font-weight:900; color:#000; margin-bottom:14px; padding-bottom:8px; border-bottom:2px solid #1a1a1a; text-transform:uppercase; letter-spacing:0.5px; }
  .biz-section-title { font-size:15px; font-weight:900; color:#000; margin-bottom:14px; padding-bottom:8px; border-bottom:2px solid #E67E22; text-transform:uppercase; letter-spacing:0.5px; }
  .biz-header { background:linear-gradient(135deg, #FFF3E0, #FFE0B2); border-radius:12px; padding:20px; margin-bottom:20px; border:1px solid #FFB74D; }
  .biz-header-title { font-size:18px; font-weight:900; color:#000; }
  .biz-header-sub { font-size:13px; color:#333; margin-top:4px; }
  table { width:100%; border-collapse:collapse; }
  th { text-align:left; font-size:11px; color:#000; font-weight:700; text-transform:uppercase; padding:10px 4px; border-bottom:2px solid #222; letter-spacing:0.3px; }
  td { padding:10px 4px; font-size:13px; color:#000; border-bottom:1px solid #e8e8e8; }
  .bar-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
  .bar-label { font-size:13px; width:130px; color:#000; font-weight:500; }
  .bar-bg { flex:1; height:8px; background:#e8e8e8; border-radius:4px; }
  .bar-fill { height:8px; background:#27AE60; border-radius:4px; }
  .bar-amount { font-size:13px; width:90px; text-align:right; color:#000; font-weight:700; }
  .bar-pct { font-size:11px; width:40px; text-align:right; color:#555; }
  .debt-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .debt-card { background:#FFF5F5; border-radius:12px; padding:18px; border:1px solid #FFCDD2; }
  .debt-card-label { font-size:11px; color:#333; font-weight:600; margin-bottom:4px; text-transform:uppercase; }
  .debt-card-value { font-size:20px; font-weight:900; color:#C0392B; }
  .footer { margin-top:40px; padding-top:20px; border-top:2px solid #e0e0e0; font-size:11px; color:#888; text-align:center; }
  .divider-line { border:none; border-top:3px solid #E67E22; margin:36px 0; }
  @media print { body { background:#fff; } .page { padding:20px; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="app-name">Aile Bütçesi</div>
    <div class="report-title">${periodNames[period]}</div>
    <div class="period-label">${periodLabel}</div>
    <div class="meta">${familyName} · ${userName} · ${new Date().toLocaleDateString("tr-TR", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" })}</div>
  </div>

  ${showFamily ? `
  <div class="summary-grid">
    <div class="sum-card">
      <div class="sum-label">${isEN ? "Income" : "Gelir"}</div>
      <div class="sum-value income">${fmt(totalIncome)}</div>
    </div>
    <div class="sum-card">
      <div class="sum-label">${isEN ? "Expense" : "Gider"}</div>
      <div class="sum-value expense">${fmt(totalExpense)}</div>
    </div>
    <div class="sum-card">
      <div class="sum-label">${isEN ? "Balance" : "Net"}</div>
      <div class="sum-value ${remaining >= 0 ? "positive" : "negative"}">${fmt(remaining)}</div>
    </div>
  </div>

  ${categoryBreakdown.length > 0 ? `
  <div class="section">
    <div class="section-title">${isEN ? "Spending by Category" : "Kategoriye Göre Harcama"}</div>
    ${categoryBreakdown.map(c => `
      <div class="bar-row">
        <div class="bar-label">${c.cat}</div>
        <div class="bar-bg"><div class="bar-fill" style="width:${Math.min(c.pct, 100)}%"></div></div>
        <div class="bar-amount">${fmt(c.amount)}</div>
        <div class="bar-pct">${c.pct.toFixed(0)}%</div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${allExpenses.length > 0 ? `
  <div class="section">
    <div class="section-title">${isEN ? "All Expenses" : "Tüm Giderler"} (${allExpenses.length})</div>
    <table>
      <tr>
        <th>${isEN ? "Date" : "Tarih"}</th>
        <th>${isEN ? "Description" : "Açıklama"}</th>
        <th>${isEN ? "Category" : "Kategori"}</th>
        <th style="text-align:right">${isEN ? "Amount" : "Tutar"}</th>
      </tr>
      ${txRows}
    </table>
  </div>
  ` : ""}

  ${allIncomes.length > 0 ? `
  <div class="section">
    <div class="section-title">${isEN ? "All Income" : "Tüm Gelirler"} (${allIncomes.length})</div>
    <table>
      <tr>
        <th>${isEN ? "Date" : "Tarih"}</th>
        <th>${isEN ? "Description" : "Açıklama"}</th>
        <th>${isEN ? "Category" : "Kategori"}</th>
        <th style="text-align:right">${isEN ? "Amount" : "Tutar"}</th>
      </tr>
      ${incomeRows}
    </table>
  </div>
  ` : ""}

  ${memberSpending && (memberSpending.self > 0 || memberSpending.spouse > 0) ? `
  <div class="section">
    <div class="section-title">${isEN ? "Spending by Family Member" : "Kişiye Göre Harcama"}</div>
    <table>
      <tr>
        <th>${isEN ? "Member" : "Kişi"}</th>
        <th style="text-align:right">${isEN ? "Amount" : "Tutar"}</th>
        <th style="text-align:right">${isEN ? "Share" : "Pay"}</th>
      </tr>
      ${(() => {
        const total = memberSpending.self + memberSpending.spouse + memberSpending.shared;
        return [
          { name: memberSpending.selfName, amount: memberSpending.self },
          { name: memberSpending.spouseName, amount: memberSpending.spouse },
          { name: isEN ? "Shared" : "Ortak", amount: memberSpending.shared },
        ].filter(r => r.amount > 0).map(r => `
          <tr>
            <td style="font-weight:600">${r.name}</td>
            <td style="text-align:right;font-weight:600">${fmt(r.amount)}</td>
            <td style="text-align:right">${total > 0 ? ((r.amount / total) * 100).toFixed(1) : 0}%</td>
          </tr>
        `).join("");
      })()}
    </table>
  </div>
  ` : ""}

  ${(creditCardTotal > 0 || loanTotal > 0) ? `
  <div class="section">
    <div class="section-title">${isEN ? "Debt Overview" : "Borç Durumu"}</div>
    <div class="debt-grid">
      ${creditCardTotal > 0 ? `<div class="debt-card"><div class="debt-card-label">${isEN ? "Credit Card Total" : "Kredi Kartı Toplam"}</div><div class="debt-card-value">${fmt(creditCardTotal)}</div></div>` : ""}
      ${loanTotal > 0 ? `<div class="debt-card"><div class="debt-card-label">${isEN ? "Loan Payments" : "Kredi Ödemeleri"}</div><div class="debt-card-value">${fmt(loanTotal)}</div></div>` : ""}
    </div>
    ${cardRows ? `
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <thead>
        <tr>
          <th style="text-align:left;padding:10px 4px">${isEN ? "Card" : "Kart"}</th>
          <th style="text-align:right;padding:10px 4px">${isEN ? "This Month" : "Bu Ay"}</th>
          <th style="text-align:right;padding:10px 4px">${isEN ? "Previous" : "Önceki Borç"}</th>
          <th style="text-align:right;padding:10px 4px">${isEN ? "Next Bill" : "Gelecek Ay"}</th>
        </tr>
      </thead>
      <tbody>${cardRows}</tbody>
    </table>` : ""}
  </div>
  ` : ""}

  ${goalsCount > 0 ? `
  <div class="section">
    <div class="section-title">${isEN ? "Savings Goals" : "Birikim Hedefleri"}</div>
    <p style="font-size:14px;color:#000">${isEN ? `${goalsCount} active goal(s) being tracked.` : `${goalsCount} aktif birikim hedefi takip ediliyor.`}</p>
  </div>
  ` : ""}
  ` : ""}

  ${showBiz && businessData ? `
  ${showFamily ? `<hr class="divider-line">` : ""}
  <div class="biz-header">
    <div class="biz-header-title">🏢 ${isEN ? "Business Report" : "İş Yeri Raporu"}</div>
    <div class="biz-header-sub">${businessData.professionName}</div>
  </div>

  <div class="summary-grid">
    <div class="sum-card" style="border-color:#27AE60">
      <div class="sum-label">${isEN ? "Business Income" : "İş Geliri"}</div>
      <div class="sum-value income">${fmt(businessData.bizIncome)}</div>
    </div>
    <div class="sum-card" style="border-color:#C0392B">
      <div class="sum-label">${isEN ? "Business Expense" : "İş Gideri"}</div>
      <div class="sum-value expense">${fmt(businessData.bizExpense)}</div>
    </div>
    <div class="sum-card" style="border-color:${businessData.bizNet >= 0 ? '#27AE60' : '#C0392B'}">
      <div class="sum-label">${isEN ? "Net Profit" : "Net Kar"}</div>
      <div class="sum-value ${businessData.bizNet >= 0 ? 'positive' : 'negative'}">${fmt(businessData.bizNet)}</div>
    </div>
  </div>

  ${businessData.bizExpenses.length > 0 ? `
  <div class="section">
    <div class="biz-section-title">${isEN ? "Business Expenses" : "İş Giderleri"} (${businessData.bizExpenses.length})</div>
    <table>
      <tr>
        <th>${isEN ? "Date" : "Tarih"}</th>
        <th>${isEN ? "Description" : "Açıklama"}</th>
        <th>${isEN ? "Category" : "Kategori"}</th>
        <th style="text-align:right">${isEN ? "Amount" : "Tutar"}</th>
      </tr>
      ${bizExpRows}
    </table>
  </div>
  ` : ""}

  ${businessData.bizIncomes.length > 0 ? `
  <div class="section">
    <div class="biz-section-title">${isEN ? "Business Income" : "İş Gelirleri"} (${businessData.bizIncomes.length})</div>
    <table>
      <tr>
        <th>${isEN ? "Date" : "Tarih"}</th>
        <th>${isEN ? "Description" : "Açıklama"}</th>
        <th>${isEN ? "Category" : "Kategori"}</th>
        <th style="text-align:right">${isEN ? "Amount" : "Tutar"}</th>
      </tr>
      ${bizIncRows}
    </table>
  </div>
  ` : ""}
  ` : ""}

  <div class="footer">
    ${isEN ? "Generated by Aile Bütçesi App" : "Aile Bütçesi Uygulaması tarafından oluşturuldu"} · ${new Date().getFullYear()}
  </div>
</div>
</body>
</html>`;
}

const PERIODS: { key: Period; labelTR: string; labelEN: string; icon: string }[] = [
  { key: "daily", labelTR: "Günlük", labelEN: "Daily", icon: "today-outline" },
  { key: "weekly", labelTR: "Haftalık", labelEN: "Weekly", icon: "calendar-outline" },
  { key: "monthly", labelTR: "Aylık", labelEN: "Monthly", icon: "calendar-number-outline" },
  { key: "sixmonth", labelTR: "6 Aylık", labelEN: "6-Month", icon: "stats-chart-outline" },
  { key: "yearly", labelTR: "Yıllık", labelEN: "Annual", icon: "bar-chart-outline" },
];

type ReportMode = "family" | "business" | "both";

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { incomes, expenses, creditCards, loans, spendingByCard, spendingByMember } = useBudget();
  const biz = useBusinessBudget();
  const { goals } = useSavingsGoals();
  const isEN = language === "en";
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("monthly");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportMode, setReportMode] = useState<ReportMode>("family");
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { start, end, label } = useMemo(() => getPeriodRange(selectedPeriod), [selectedPeriod]);

  const periodIncomes = useMemo(() =>
    incomes.filter(i => { const d = new Date(i.date); return d >= start && d <= end; }),
    [incomes, start, end]
  );
  const periodExpenses = useMemo(() =>
    expenses.filter(e => { const d = new Date(e.date); return d >= start && d <= end; }),
    [expenses, start, end]
  );

  const totalIncome = useMemo(() => periodIncomes.reduce((s, i) => s + i.amount, 0), [periodIncomes]);
  const totalExpense = useMemo(() => periodExpenses.reduce((s, e) => s + e.amount, 0), [periodExpenses]);
  const remaining = totalIncome - totalExpense;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    periodExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({ cat, amount, pct: totalExpense > 0 ? (amount / totalExpense) * 100 : 0 }));
  }, [periodExpenses, totalExpense]);

  const allExpensesSorted = useMemo(() =>
    [...periodExpenses]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(e => ({
        title: e.title,
        amount: e.amount,
        date: new Date(e.date).toLocaleDateString("tr-TR"),
        category: e.category,
        subcategory: e.subcategory || "",
      })),
    [periodExpenses]
  );

  const allIncomesSorted = useMemo(() =>
    [...periodIncomes]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(i => ({
        title: i.title,
        amount: i.amount,
        date: new Date(i.date).toLocaleDateString("tr-TR"),
        category: i.category,
      })),
    [periodIncomes]
  );

  const cardDetailsForReport = useMemo(() =>
    creditCards.map((c) => ({
      name: c.name,
      bank: c.bank,
      color: c.color,
      prevDebt: c.currentDebt ?? 0,
      thisMonthSpend: spendingByCard[c.id] ?? 0,
      nextBill: (c.currentDebt ?? 0) + (spendingByCard[c.id] ?? 0),
    })),
    [creditCards, spendingByCard]
  );

  const creditCardTotal = useMemo(() =>
    cardDetailsForReport.reduce((s, c) => s + c.nextBill, 0),
    [cardDetailsForReport]
  );
  const loanTotal = useMemo(() =>
    loans.reduce((s, l) => s + l.monthlyPayment, 0),
    [loans]
  );

  async function handleGenerate(action: "share" | "print" | "email") {
    setIsGenerating(true);
    Haptics.selectionAsync();
    try {
      const byMemberEntries = Object.entries(spendingByMember.byMember).filter(([, v]) => v.amount > 0);
    const memberSpendForReport = byMemberEntries.length > 0
        ? {
            selfName: user?.name?.split(" ")[0] || (isEN ? "Me" : "Ben"),
            spouseName: byMemberEntries.find(([k]) => k !== user?.id && k !== "shared")?.[1]?.name || (isEN ? "Member" : "Üye"),
            self: spendingByMember.self,
            spouse: spendingByMember.spouse,
            shared: spendingByMember.shared,
          }
        : undefined;
      let bizDataForReport: BusinessReportData | undefined;
      if (reportMode === "business" || reportMode === "both") {
        const bizExps = biz.businessExpenses.filter((e) => {
          const d = new Date(e.date);
          return d >= start && d <= end;
        });
        const bizIncs = biz.businessIncomes.filter((i) => {
          const d = new Date(i.date);
          return d >= start && d <= end;
        });
        const profName = biz.professionCustomName || biz.profession || (isEN ? "Business" : "İş Yeri");
        bizDataForReport = {
          professionName: profName,
          bizIncome: bizIncs.reduce((s, i) => s + i.amount, 0),
          bizExpense: bizExps.reduce((s, e) => s + e.amount, 0),
          bizNet: bizIncs.reduce((s, i) => s + i.amount, 0) - bizExps.reduce((s, e) => s + e.amount, 0),
          bizExpenses: bizExps.sort((a, b) => b.date.localeCompare(a.date)).map((e) => ({
            title: e.title, amount: e.amount, date: new Date(e.date).toLocaleDateString("tr-TR"), category: e.category,
          })),
          bizIncomes: bizIncs.sort((a, b) => b.date.localeCompare(a.date)).map((i) => ({
            title: i.title, amount: i.amount, date: new Date(i.date).toLocaleDateString("tr-TR"), category: i.category,
          })),
        };
      }

      const html = generateHTML(
        selectedPeriod, label,
        user?.name || "Kullanıcı",
        user?.familyName || "Aile",
        totalIncome, totalExpense, remaining,
        categoryBreakdown, allExpensesSorted, allIncomesSorted,
        creditCardTotal, loanTotal,
        goals.length, isEN, cardDetailsForReport, memberSpendForReport,
        reportMode, bizDataForReport,
      );

      const copyToCacheAsPdf = async (uri: string) => {
        const pdfName = `budget_report_${selectedPeriod}_${Date.now()}.pdf`;
        const dest = FileSystem.cacheDirectory + pdfName;
        await FileSystem.copyAsync({ from: uri, to: dest });
        return dest;
      };

      if (action === "email" && Platform.OS !== "web") {
        const available = await MailComposer.isAvailableAsync();
        if (available) {
          const { uri } = await Print.printToFileAsync({ html });
          const dest = await copyToCacheAsPdf(uri);
          await MailComposer.composeAsync({
            recipients: user?.email ? [user.email] : [],
            subject: isEN
              ? `${user?.familyName || "Family"} Budget Report - ${label}`
              : `${user?.familyName || "Aile"} Bütçe Raporu - ${label}`,
            body: isEN
              ? "Please find the budget report attached."
              : "Bütçe raporu ekte bulunmaktadır.",
            attachments: [dest],
          });
        } else {
          Alert.alert(
            isEN ? "Not Available" : "Kullanılamıyor",
            isEN ? "Email is not available on this device. Using share instead." : "Bu cihazda e-posta kullanılamıyor. Paylaşım kullanılıyor.",
          );
          const { uri } = await Print.printToFileAsync({ html });
          const dest = await copyToCacheAsPdf(uri);
          await Sharing.shareAsync(dest, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
        }
      } else if (action === "print" || Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          const dest = await copyToCacheAsPdf(uri);
          await Sharing.shareAsync(dest, {
            mimeType: "application/pdf",
            dialogTitle: isEN ? "Share Budget Report" : "Bütçe Raporunu Paylaş",
            UTI: "com.adobe.pdf",
          });
        } else {
          await Print.printAsync({ html });
        }
      }
    } catch (e: any) {
      if (e?.message?.includes("cancel") || e?.message?.includes("dismiss") || e?.code === "ERR_SHARING_ABORTED") {
        return;
      }
      Alert.alert(
        isEN ? "Error" : "Hata",
        isEN ? "Could not generate report." : "Rapor oluşturulamadı.",
        [{ text: "OK" }]
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const periodName = isEN
    ? PERIODS.find(p => p.key === selectedPeriod)?.labelEN
    : PERIODS.find(p => p.key === selectedPeriod)?.labelTR;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>{isEN ? "Budget Report" : "Bütçe Raporu"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Platform.OS === "web" ? 120 : 100 }}
      >
        <Text style={styles.sectionLabel}>{isEN ? "Select Period" : "Dönem Seç"}</Text>
        <View style={styles.periodGrid}>
          {PERIODS.map(p => (
            <Pressable
              key={p.key}
              style={[styles.periodBtn, selectedPeriod === p.key && styles.periodBtnActive]}
              onPress={() => { setSelectedPeriod(p.key); Haptics.selectionAsync(); }}
            >
              <Ionicons
                name={p.icon as any}
                size={18}
                color={selectedPeriod === p.key ? Colors.background : Colors.textSecondary}
              />
              <Text style={[styles.periodBtnText, selectedPeriod === p.key && styles.periodBtnTextActive]}>
                {isEN ? p.labelEN : p.labelTR}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.periodRangeCard}>
          <Ionicons name="calendar-outline" size={16} color={Colors.tint} />
          <Text style={styles.periodRangeText}>{label}</Text>
        </View>

        {biz.profession ? (
          <>
            <Text style={styles.sectionLabel}>{isEN ? "Report Content" : "Rapor İçeriği"}</Text>
            <View style={styles.modeRow}>
              {([
                { key: "family" as ReportMode, labelTR: "Sadece Aile", labelEN: "Family Only", icon: "home-outline" },
                { key: "business" as ReportMode, labelTR: "Sadece İş Yeri", labelEN: "Business Only", icon: "briefcase-outline" },
                { key: "both" as ReportMode, labelTR: "Aile + İş Yeri", labelEN: "Both", icon: "albums-outline" },
              ]).map((m) => (
                <Pressable
                  key={m.key}
                  style={[styles.modeBtn, reportMode === m.key && styles.modeBtnActive]}
                  onPress={() => { setReportMode(m.key); Haptics.selectionAsync(); }}
                >
                  <Ionicons name={m.icon as any} size={16} color={reportMode === m.key ? Colors.background : Colors.textSecondary} />
                  <Text style={[styles.modeBtnText, reportMode === m.key && styles.modeBtnTextActive]}>
                    {isEN ? m.labelEN : m.labelTR}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.summaryGrid}>
          <View style={[styles.sumCard, { borderColor: Colors.green + "40" }]}>
            <Text style={styles.sumLabel}>{isEN ? "Income" : "Gelir"}</Text>
            <Text style={[styles.sumValue, { color: Colors.green }]}>{fmt(totalIncome)}</Text>
            <Text style={styles.sumSub}>{periodIncomes.length} {isEN ? "record" : "kayıt"}</Text>
          </View>
          <View style={[styles.sumCard, { borderColor: Colors.red + "40" }]}>
            <Text style={styles.sumLabel}>{isEN ? "Expense" : "Gider"}</Text>
            <Text style={[styles.sumValue, { color: Colors.red }]}>{fmt(totalExpense)}</Text>
            <Text style={styles.sumSub}>{periodExpenses.length} {isEN ? "record" : "kayıt"}</Text>
          </View>
          <View style={[styles.sumCard, { borderColor: remaining >= 0 ? Colors.green + "40" : Colors.red + "40", flex: 1 }]}>
            <Text style={styles.sumLabel}>{isEN ? "Net Balance" : "Net"}</Text>
            <Text style={[styles.sumValue, { color: remaining >= 0 ? Colors.green : Colors.red }]}>{fmt(remaining)}</Text>
            <Text style={styles.sumSub}>{remaining >= 0 ? (isEN ? "Surplus" : "Fazla") : (isEN ? "Deficit" : "Açık")}</Text>
          </View>
        </View>

        {categoryBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{isEN ? "By Category" : "Kategoriye Göre"}</Text>
            <View style={styles.categoryCard}>
              {categoryBreakdown.map((c, i) => (
                <View key={c.cat}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.catRow}>
                    <Text style={styles.catName}>{c.cat}</Text>
                    <View style={styles.barWrap}>
                      <View style={[styles.barFill, { width: `${Math.min(c.pct, 100)}%` as any }]} />
                    </View>
                    <Text style={styles.catAmount}>{fmt(c.amount)}</Text>
                    <Text style={styles.catPct}>{c.pct.toFixed(0)}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {allExpensesSorted.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              {isEN ? "All Expenses" : "Tüm Giderler"} ({allExpensesSorted.length})
            </Text>
            <View style={styles.categoryCard}>
              {allExpensesSorted.map((e, i) => (
                <View key={i}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.txRow}>
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle} numberOfLines={1}>{e.title}</Text>
                      <Text style={styles.txSub}>{e.category}{e.subcategory ? ` › ${e.subcategory}` : ""} · {e.date}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: Colors.red }]}>{fmt(e.amount)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {allIncomesSorted.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              {isEN ? "All Income" : "Tüm Gelirler"} ({allIncomesSorted.length})
            </Text>
            <View style={styles.categoryCard}>
              {allIncomesSorted.map((i, idx) => (
                <View key={idx}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.txRow}>
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle} numberOfLines={1}>{i.title}</Text>
                      <Text style={styles.txSub}>{i.category} · {i.date}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: Colors.green }]}>{fmt(i.amount)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {(totalIncome === 0 && totalExpense === 0) && (
          <View style={styles.emptyCard}>
            <Ionicons name="document-outline" size={36} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>{isEN ? "No data for this period" : "Bu dönem için veri yok"}</Text>
            <Text style={styles.emptySub}>{isEN ? "Add income or expenses to generate a report." : "Rapor oluşturmak için gelir veya gider ekleyin."}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>{isEN ? "Export" : "Dışa Aktar"}</Text>
        <View style={styles.exportCard}>
          <Pressable
            style={[styles.exportBtn, { backgroundColor: Colors.tint }]}
            onPress={() => handleGenerate("share")}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <Ionicons name="share-outline" size={20} color={Colors.background} />
            )}
            <Text style={styles.exportBtnText}>
              {isGenerating
                ? (isEN ? "Generating..." : "Oluşturuluyor...")
                : (isEN ? `Share ${periodName} Report as PDF` : `${periodName} Raporu PDF Paylaş`)}
            </Text>
          </Pressable>
          {Platform.OS !== "web" && (
            <Pressable
              style={[styles.exportBtn, { backgroundColor: "#D44638" }]}
              onPress={() => handleGenerate("email")}
              disabled={isGenerating}
            >
              <Ionicons name="mail-outline" size={20} color={Colors.background} />
              <Text style={styles.exportBtnText}>
                {isEN ? "Send via Email" : "E-posta ile Gönder"}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.exportBtn, { backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.border }]}
            onPress={() => handleGenerate("print")}
            disabled={isGenerating}
          >
            <Ionicons name="print-outline" size={20} color={Colors.text} />
            <Text style={[styles.exportBtnText, { color: Colors.text }]}>
              {isEN ? "Print / Open in PDF Viewer" : "Yazdır / PDF Görüntüleyici"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingBottom: 16, justifyContent: "space-between",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  sectionLabel: {
    fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.text,
    marginBottom: 10, marginTop: 20, paddingHorizontal: 4,
    textTransform: "uppercase" as const, letterSpacing: 0.6,
  },
  periodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  periodBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  periodBtnActive: { backgroundColor: Colors.tint, borderColor: Colors.tint },
  periodBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  periodBtnTextActive: { color: Colors.background },
  periodRangeCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.tint + "15", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  periodRangeText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.tint },
  summaryGrid: { flexDirection: "row", gap: 10, marginBottom: 4 },
  sumCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 16,
    padding: 14, borderWidth: 1,
  },
  sumLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.text, marginBottom: 4, opacity: 0.7 },
  sumValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  sumSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 3 },
  categoryCard: {
    backgroundColor: Colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 4,
    overflow: "hidden",
  },
  catRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  catName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text, width: 100 },
  barWrap: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: Colors.tint, borderRadius: 3 },
  catAmount: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text, width: 80, textAlign: "right" },
  catPct: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, width: 32, textAlign: "right" },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  txRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  txInfo: { flex: 1 },
  txTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  txSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  txAmount: { fontFamily: "Inter_700Bold", fontSize: 14 },
  emptyCard: {
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1,
    borderColor: Colors.border, padding: 36, alignItems: "center", marginVertical: 16,
  },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary, marginTop: 12 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textTertiary, marginTop: 6, textAlign: "center" },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, minWidth: 100,
  },
  modeBtnActive: { backgroundColor: Colors.tint, borderColor: Colors.tint },
  modeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.background },
  exportCard: { gap: 10, marginBottom: 16 },
  exportBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20,
  },
  exportBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.background },
});
