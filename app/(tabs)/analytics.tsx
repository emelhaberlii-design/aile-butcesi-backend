import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path, Rect, Text as SvgText, Line, G } from "react-native-svg";
import Colors from "@/constants/colors";
import { useBudget, CATEGORY_GROUPS, CurrencyCode } from "@/context/BudgetContext";
import { useLanguage } from "@/context/LanguageContext";
import { FIXED_CATEGORIES } from "@/lib/categories";
import { getApiUrl } from "@/lib/query-client";
import { fmtCurrency } from "@/lib/currency";

function formatAmount(amount: number, currency?: CurrencyCode): string {
  return fmtCurrency(amount, currency || "TRY");
}

function formatByCurrency(byCurrency: Record<string, number>): string {
  const entries = Object.entries(byCurrency).filter(([, v]) => Math.abs(v) >= 0.01);
  if (entries.length === 0) return fmtCurrency(0, "TRY");
  return entries.map(([c, v]) => fmtCurrency(v, c as CurrencyCode)).join("  ");
}

function getNetColor(byCurrency: Record<string, number>, toTRY: (amount: number, currency?: CurrencyCode) => number): string {
  const total = Object.entries(byCurrency).reduce((s, [c, v]) => s + toTRY(v, c as CurrencyCode), 0);
  return total >= 0 ? Colors.green : Colors.red;
}

function localizeForInsight(cat: string, lang: string): string {
  const map: Record<string, string> = {
    "Ev": "Housing", "Faturalar": "Bills", "Market": "Grocery",
    "Yemek Siparişi": "Food Delivery", "Araç Giderleri": "Vehicle",
    "Toplu Taşıma": "Transport", "Sağlık": "Health",
    "Eğlence": "Entertainment", "Online Alışveriş": "Online Shopping",
    "Giyim": "Clothing", "Eğitim": "Education",
    "Kredi Ödemesi": "Loan Payment", "Diğer": "Other",
  };
  if (lang === "en") return map[cat] || cat;
  return cat;
}

const CATEGORY_COLORS = [
  Colors.tint, Colors.blue, Colors.purple, Colors.yellow, Colors.orange,
  Colors.red, "#5AC8FA", "#FF6B6B", "#4ECDC4", "#45B7D1",
];

const PAYMENT_METHOD_ICONS: Record<string, string> = {
  cash: "cash-outline",
  debit: "card-outline",
  credit: "card",
};

const DEFAULT_RATE = 0.25;
const BANK_RATES_CACHE: Record<string, number> = {};
let bankRatesFetched = false;

async function fetchBankRates() {
  if (bankRatesFetched) return;
  try {
    const url = new URL("/api/bank-rates", getApiUrl());
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      if (data.rates) Object.assign(BANK_RATES_CACHE, data.rates);
      bankRatesFetched = true;
    }
  } catch {}
}

function getMinRate(bankName: string): number {
  if (!bankName) return DEFAULT_RATE;
  const lower = bankName.toLowerCase();
  for (const [key, rate] of Object.entries(BANK_RATES_CACHE)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return rate as number;
    }
  }
  return DEFAULT_RATE;
}

function DonutChart({
  data,
  size = 160,
  strokeWidth = 24,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumAngle = -90;
  const arcs = data.map((d) => {
    const angle = (d.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
    return { ...d, path, pct: Math.round((d.value / total) * 100) };
  });

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={radius} fill="none" stroke={Colors.card2} strokeWidth={strokeWidth} />
        {arcs.map((arc, i) => (
          <Path
            key={i}
            d={arc.path}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ))}
        {centerLabel && (
          <SvgText
            x={cx}
            y={cy - 6}
            fill={Colors.textSecondary}
            fontSize={11}
            fontWeight="400"
            textAnchor="middle"
          >
            {centerLabel}
          </SvgText>
        )}
        {centerValue && (
          <SvgText
            x={cx}
            y={cy + 14}
            fill={Colors.text}
            fontSize={16}
            fontWeight="700"
            textAnchor="middle"
          >
            {centerValue}
          </SvgText>
        )}
      </Svg>
      <View style={donutStyles.legend}>
        {arcs.filter((a) => a.pct >= 3).slice(0, 6).map((a, i) => (
          <View key={i} style={donutStyles.legendItem}>
            <View style={[donutStyles.legendDot, { backgroundColor: a.color }]} />
            <Text style={donutStyles.legendLabel} numberOfLines={1}>{a.label}</Text>
            <Text style={donutStyles.legendPct}>%{a.pct}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const donutStyles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, maxWidth: 70 },
  legendPct: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.text },
});

function BarChart({
  bars,
  height = 120,
}: {
  bars: { label: string; value: number; color: string }[];
  height?: number;
}) {
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const barWidth = 32;
  const gap = 20;
  const chartWidth = bars.length * (barWidth + gap);
  const chartHeight = height;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={Math.max(chartWidth, 200)} height={chartHeight + 30}>
        {bars.map((bar, i) => {
          const barH = (bar.value / maxVal) * (chartHeight - 20);
          const x = i * (barWidth + gap) + gap;
          const y = chartHeight - barH;
          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={6}
                fill={bar.color}
              />
              <SvgText
                x={x + barWidth / 2}
                y={y - 6}
                fill={Colors.text}
                fontSize={10}
                fontWeight="600"
                textAnchor="middle"
              >
                {formatAmount(bar.value)}
              </SvgText>
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight + 16}
                fill={Colors.textSecondary}
                fontSize={10}
                fontWeight="400"
                textAnchor="middle"
              >
                {bar.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function RatioGauge({
  label,
  value,
  ideal,
  max = 100,
  unit = "%",
  thresholds,
  language,
  invertColor,
}: {
  label: string;
  value: number;
  ideal: string;
  max?: number;
  unit?: string;
  thresholds: { good: number; warn: number };
  language: string;
  invertColor?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = invertColor
    ? (value >= 20 ? Colors.green : value >= 10 ? Colors.yellow : Colors.red)
    : (value <= thresholds.good ? Colors.green : value <= thresholds.warn ? Colors.yellow : Colors.red);
  const statusLabel = invertColor
    ? (value >= 20
        ? (language === "tr" ? "Sağlıklı" : "Healthy")
        : value >= 10
          ? (language === "tr" ? "Dikkat" : "Warning")
          : (language === "tr" ? "Tehlikeli" : "Dangerous"))
    : (value <= thresholds.good
        ? (language === "tr" ? "Sağlıklı" : "Healthy")
        : value <= thresholds.warn
          ? (language === "tr" ? "Dikkat" : "Warning")
          : (language === "tr" ? "Tehlikeli" : "Dangerous"));

  return (
    <View style={gaugeStyles.card}>
      <View style={gaugeStyles.header}>
        <Text style={gaugeStyles.label}>{label}</Text>
        <View style={[gaugeStyles.statusBadge, { backgroundColor: color + "18" }]}>
          <Text style={[gaugeStyles.statusText, { color }]}>{statusLabel}</Text>
        </View>
      </View>
      <View style={gaugeStyles.valueRow}>
        <Text style={[gaugeStyles.value, { color }]}>{unit === "%" ? `%${Math.round(value)}` : formatAmount(value)}</Text>
      </View>
      <View style={gaugeStyles.track}>
        <View style={[gaugeStyles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={gaugeStyles.ideal}>
        {language === "tr" ? `İdeal: ${ideal}` : `Ideal: ${ideal}`}
      </Text>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, flex: 1, minWidth: "45%" as any,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  valueRow: { marginBottom: 8 },
  value: { fontFamily: "Inter_700Bold", fontSize: 20 },
  track: { height: 4, backgroundColor: Colors.card2, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  fill: { height: "100%", borderRadius: 2 },
  ideal: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary },
});

function CategoryBar({
  category,
  amount,
  total,
  color,
  prevAmount,
}: {
  category: string;
  amount: number;
  total: number;
  color: string;
  prevAmount?: number;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  const change =
    prevAmount !== undefined && prevAmount > 0
      ? Math.round(((amount - prevAmount) / prevAmount) * 100)
      : undefined;

  return (
    <View style={catStyles.row}>
      <View style={catStyles.labelRow}>
        <Text style={catStyles.catName}>{category}</Text>
        <View style={catStyles.rightRow}>
          {change !== undefined && Math.abs(change) >= 5 && (
            <View
              style={[
                catStyles.changeBadge,
                { backgroundColor: change > 0 ? Colors.red + "20" : Colors.green + "20" },
              ]}
            >
              <Ionicons
                name={change > 0 ? "trending-up" : "trending-down"}
                size={10}
                color={change > 0 ? Colors.red : Colors.green}
              />
              <Text
                style={[
                  catStyles.changeText,
                  { color: change > 0 ? Colors.red : Colors.green },
                ]}
              >
                {change > 0 ? "+" : ""}{change}%
              </Text>
            </View>
          )}
          <Text style={catStyles.catAmount}>{formatAmount(amount)}</Text>
        </View>
      </View>
      <View style={catStyles.track}>
        <View
          style={[catStyles.fill, { width: `${Math.min(100, pct)}%` as any, backgroundColor: color }]}
        />
      </View>
      <Text style={catStyles.pct}>{Math.round(pct)}%</Text>
    </View>
  );
}

const catStyles = StyleSheet.create({
  row: { marginBottom: 14 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  rightRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  catName: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text, flex: 1 },
  catAmount: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  track: { height: 6, backgroundColor: Colors.card2, borderRadius: 3, overflow: "hidden", marginBottom: 3 },
  fill: { height: "100%", borderRadius: 3 },
  pct: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, textAlign: "right" },
  changeBadge: {
    flexDirection: "row", alignItems: "center", gap: 2,
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
  },
  changeText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
});

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const {
    monthlyIncome,
    monthlyExpenses,
    remaining,
    spendingByCategory,
    spendingByCard,
    financialHealthScore,
    creditCardSpending,
    expenses,
    incomes,
    loans,
    creditCards,
    totalLoanPayments,
    selectedMonth,
    dailyAverage,
    projectedEndDate,
    previousMonthSpending,
    savingsGoal,
    toTRY,
  } = useBudget();

  const [bankRatesReady, setBankRatesReady] = useState(bankRatesFetched);

  useEffect(() => {
    fetchBankRates().then(() => setBankRatesReady(true));
  }, []);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const sortedCategories = useMemo(
    () => Object.entries(spendingByCategory).sort(([, a], [, b]) => b - a),
    [spendingByCategory]
  );

  const groupedSpending = useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(CATEGORY_GROUPS).forEach(([groupName, cats]) => {
      const total = cats.reduce((sum, cat) => sum + (spendingByCategory[cat] || 0), 0);
      if (total > 0) result[groupName] = total;
    });
    return Object.entries(result).sort(([, a], [, b]) => b - a);
  }, [spendingByCategory]);

  const paymentMethods = useMemo(() => {
    const monthExpenses = expenses.filter((e) => e.date.substring(0, 7) === selectedMonth);
    const map: Record<string, number> = { cash: 0, debit: 0, credit: 0 };
    monthExpenses.forEach((e) => {
      map[e.paymentMethod] = (map[e.paymentMethod] || 0) + e.amount;
    });
    return map;
  }, [expenses, selectedMonth]);

  const cardSpendingList = useMemo(
    () =>
      Object.entries(spendingByCard)
        .map(([cardId, amount]) => ({ card: creditCards.find((c) => c.id === cardId), amount }))
        .filter((x) => x.card),
    [spendingByCard, creditCards]
  );

  const savingsRate = useMemo(() =>
    monthlyIncome > 0 ? (Math.max(0, remaining) / monthlyIncome) * 100 : 0,
  [monthlyIncome, remaining]);

  const expenseRatio = useMemo(() =>
    monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0,
  [monthlyIncome, monthlyExpenses]);

  const debtBurden = useMemo(() =>
    monthlyIncome > 0 ? ((totalLoanPayments + creditCardSpending) / monthlyIncome) * 100 : 0,
  [monthlyIncome, totalLoanPayments, creditCardSpending]);

  const creditUtil = useMemo(() => {
    const totalLimit = creditCards.reduce((s, c) => s + (c.limit || 0), 0);
    return totalLimit > 0 ? (creditCardSpending / totalLimit) * 100 : 0;
  }, [creditCards, creditCardSpending]);

  const fixedVsVariable = useMemo(() => {
    const fixedCats = new Set(["Ev", "Kredi Ödemesi", "Faturalar"]);
    let fixed = 0;
    let variable = 0;
    Object.entries(spendingByCategory).forEach(([cat, amt]) => {
      if (fixedCats.has(cat)) fixed += amt;
      else variable += amt;
    });
    fixed += totalLoanPayments;
    return { fixed, variable, total: fixed + variable };
  }, [spendingByCategory, totalLoanPayments]);

  const donutData = useMemo(() =>
    sortedCategories.slice(0, 8).map(([cat, amt], i) => ({
      label: cat,
      value: amt,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    })),
  [sortedCategories]);

  const yearEndForecast = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthsLeft = 11 - currentMonth;
    const yearEnd = new Date(currentYear, 11, 31);
    const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    function projectRecurringByCurrency(items: (typeof incomes[0] | typeof expenses[0])[]) {
      const map: Record<string, number> = {};
      items.forEach((item) => {
        if (!item.isRecurring) return;
        const cur = (item as any).currency || "TRY";
        const endStr = (item as any).recurringEndDate;
        const endDate = endStr ? new Date(endStr + "T23:59:59") : yearEnd;
        const effectiveEnd = endDate < yearEnd ? endDate : yearEnd;
        if (effectiveEnd <= now) return;

        const freq = item.recurringFrequency || "monthly";
        const msLeft = effectiveEnd.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

        let projected = 0;
        if (freq === "daily") {
          projected = item.amount * daysLeft;
        } else if (freq === "weekly") {
          projected = item.amount * Math.floor(daysLeft / 7);
        } else {
          let monthCount = 0;
          const startMonth = currentMonth;
          const endMonth = effectiveEnd.getFullYear() === currentYear ? effectiveEnd.getMonth() : 11;
          for (let m = startMonth + 1; m <= endMonth; m++) monthCount++;
          projected = item.amount * monthCount;
        }
        map[cur] = (map[cur] || 0) + projected;
      });
      return map;
    }

    function sumByCurrency(items: (typeof incomes[0] | typeof expenses[0])[]) {
      const map: Record<string, number> = {};
      items.forEach((item) => {
        const cur = (item as any).currency || "TRY";
        map[cur] = (map[cur] || 0) + item.amount;
      });
      return map;
    }

    function addMaps(a: Record<string, number>, b: Record<string, number>) {
      const result: Record<string, number> = { ...a };
      Object.entries(b).forEach(([c, v]) => { result[c] = (result[c] || 0) + v; });
      return result;
    }

    function subtractMaps(a: Record<string, number>, b: Record<string, number>) {
      const result: Record<string, number> = { ...a };
      Object.entries(b).forEach(([c, v]) => { result[c] = (result[c] || 0) - v; });
      return result;
    }

    const recurringIncomeFuture = projectRecurringByCurrency(incomes);
    const recurringExpenseFuture = projectRecurringByCurrency(expenses);

    const ytdIncomes = incomes.filter((i) => {
      const d = i.date.slice(0, 10);
      return d.startsWith(String(currentYear)) && d <= todayStr;
    });
    const ytdExpenses = expenses.filter((e) => {
      const d = e.date.slice(0, 10);
      return d.startsWith(String(currentYear)) && d <= todayStr;
    });

    const totalIncomeYTDByCur = sumByCurrency(ytdIncomes);
    const totalExpenseYTDByCur = sumByCurrency(ytdExpenses);

    const projectedTotalIncomeByCur = addMaps(totalIncomeYTDByCur, recurringIncomeFuture);
    const projectedTotalExpenseByCur = addMaps(totalExpenseYTDByCur, recurringExpenseFuture);
    const projectedNetByCur = subtractMaps(projectedTotalIncomeByCur, projectedTotalExpenseByCur);

    const monthsElapsed = currentMonth + 1;
    const projectedByAvgIncomeByCur: Record<string, number> = {};
    const projectedByAvgExpenseByCur: Record<string, number> = {};
    const allCurrencies = new Set([...Object.keys(totalIncomeYTDByCur), ...Object.keys(totalExpenseYTDByCur)]);
    allCurrencies.forEach((c) => {
      const incYTD = totalIncomeYTDByCur[c] || 0;
      const expYTD = totalExpenseYTDByCur[c] || 0;
      const avgInc = monthsElapsed > 0 ? incYTD / monthsElapsed : 0;
      const avgExp = monthsElapsed > 0 ? expYTD / monthsElapsed : 0;
      projectedByAvgIncomeByCur[c] = incYTD + (avgInc * monthsLeft);
      projectedByAvgExpenseByCur[c] = expYTD + (avgExp * monthsLeft);
    });
    const projectedByAvgNetByCur = subtractMaps(projectedByAvgIncomeByCur, projectedByAvgExpenseByCur);

    return {
      monthsLeft,
      totalIncomeYTDByCur,
      totalExpenseYTDByCur,
      projectedTotalIncomeByCur,
      projectedTotalExpenseByCur,
      projectedNetByCur,
      projectedByAvgIncomeByCur,
      projectedByAvgExpenseByCur,
      projectedByAvgNetByCur,
      currentYear,
    };
  }, [incomes, expenses]);

  const dailySpending = useMemo(() => {
    const monthExpenses = expenses.filter((e) => e.date.substring(0, 7) === selectedMonth);
    const byDay: Record<number, number> = {};
    monthExpenses.forEach((e) => {
      const day = new Date(e.date).getDate();
      byDay[day] = (byDay[day] || 0) + e.amount;
    });
    return byDay;
  }, [expenses, selectedMonth]);

  const insights = useMemo(() => {
    const result: string[] = [];
    if (monthlyIncome === 0) {
      return [t("insightAddIncome")];
    }

    if (projectedEndDate && projectedEndDate !== "Ay sonu" && projectedEndDate !== "Bu ay") {
      result.push(t("insightBudgetEndFmt", { date: projectedEndDate }));
    }

    if (savingsGoal > 0 && remaining < savingsGoal && monthlyIncome > 0) {
      const shortfall = savingsGoal - Math.max(0, remaining);
      const now = new Date();
      const [sy, sm] = (selectedMonth || "").split("-").map(Number);
      const isCurrentMonth = sy === now.getFullYear() && sm === now.getMonth() + 1;
      const daysLeftInMonth = isCurrentMonth
        ? new Date(sy, sm, 0).getDate() - now.getDate()
        : 0;

      if (daysLeftInMonth > 0) {
        const dailyNeeded = shortfall / daysLeftInMonth;
        result.push(
          language === "tr"
            ? `Tasarruf hedefinize ${formatAmount(shortfall)} kaldı. Ay sonuna kadar günde ${formatAmount(Math.ceil(dailyNeeded))} biriktirmelisiniz (${daysLeftInMonth} gün).`
            : `${formatAmount(shortfall)} left to reach your goal. Save ${formatAmount(Math.ceil(dailyNeeded))}/day for the remaining ${daysLeftInMonth} days.`
        );
      } else if (monthlyExpenses > 0) {
        const pctNeeded = Math.round((shortfall / monthlyExpenses) * 100);
        result.push(
          language === "tr"
            ? `Hedefinize ulaşmak için giderlerinizi %${pctNeeded} azaltmanız gerekiyor.`
            : `You need to reduce expenses by ${pctNeeded}% to reach your savings goal.`
        );
      } else {
        result.push(
          language === "tr"
            ? `Tasarruf hedefinize ${formatAmount(shortfall)} daha gerekiyor.`
            : `You need ${formatAmount(shortfall)} more to reach your savings goal.`
        );
      }
    }
    if (savingsGoal > 0 && remaining >= savingsGoal) {
      const surplus = remaining - savingsGoal;
      result.push(
        language === "tr"
          ? `Tasarruf hedefinize ulaştınız! ${formatAmount(remaining)} biriktirdiniz${surplus > 0 ? ` (hedefin ${formatAmount(surplus)} üstünde)` : ""}.`
          : `You've reached your savings goal! You saved ${formatAmount(remaining)}${surplus > 0 ? ` (${formatAmount(surplus)} over target)` : ""}.`
      );
    }

    const biggestIncreases = Object.entries(spendingByCategory)
      .filter(([cat, amount]) => {
        const prev = previousMonthSpending[cat] || 0;
        return prev > 0 && amount > 0 && (amount - prev) / prev > 0.15;
      })
      .sort(([, a], [, b]) => {
        const prevA = previousMonthSpending[Object.keys(spendingByCategory)[0]] || 0;
        const prevB = previousMonthSpending[Object.keys(spendingByCategory)[1]] || 0;
        return (b - prevB) - (a - prevA);
      })
      .slice(0, 2);

    biggestIncreases.forEach(([cat, amount]) => {
      const prev = previousMonthSpending[cat] || 0;
      const pct = Math.round(((amount - prev) / prev) * 100);
      result.push(t("insightIncreaseFmt", { cat, pct }));
    });

    const categories = Object.entries(spendingByCategory).sort(([, a], [, b]) => b - a);
    const variableCategories = categories.filter(([cat]) => !FIXED_CATEGORIES.has(cat) && cat !== "Ev" && cat !== "Kredi Ödemesi");

    if (categories.length > 0 && result.length < 3) {
      const [topCat, topAmount] = categories[0];
      const pct = Math.round((topAmount / monthlyExpenses) * 100);
      if ((topCat === "Ev" || FIXED_CATEGORIES.has(topCat)) && variableCategories.length > 0) {
        const [varCat, varAmount] = variableCategories[0];
        const varPct = Math.round((varAmount / monthlyExpenses) * 100);
        result.push(
          language === "tr"
            ? `En büyük gideriniz ${topCat} (%${pct}) — büyük kısmı sabittir. Değişken giderlerinizde ${localizeForInsight(varCat, language)} %${varPct} pay alıyor.`
            : `Your largest expense is ${localizeForInsight(topCat, "en")} (${pct}%) — mostly fixed. Among variable costs, ${localizeForInsight(varCat, "en")} is ${varPct}% of spending.`
        );
      } else {
        result.push(t("insightTopCatFmt", { pct, cat: topCat }));
      }
    }

    const sr = remaining / monthlyIncome;
    if (sr >= 0.2) {
      result.push(t("insightGoodSavingsFmt", { pct: Math.round(sr * 100) }));
    } else if (sr < 0) {
      result.push(t("insightOverspentFmt", { amount: formatAmount(Math.abs(remaining)) }));
    } else {
      result.push(t("insightLowSavingsFmt", { pct: Math.round(sr * 100) }));
    }

    const creditRatio = creditCardSpending / monthlyIncome;
    if (creditRatio > 0.4) {
      result.push(t("insightHighCreditFmt", { pct: Math.round(creditRatio * 100) }));
    }

    const loanRatio = totalLoanPayments / monthlyIncome;
    if (loanRatio > 0.3) {
      result.push(
        language === "tr"
          ? `Kredi ödemeleriniz gelirinizin %${Math.round(loanRatio * 100)}'ini oluşturuyor. Bu sabit bir yük — ek gelir veya erken ödeme fırsatını değerlendirin.`
          : `Loan payments take ${Math.round(loanRatio * 100)}% of your income. This is a fixed burden — consider extra income or early repayment options.`
      );
    }

    const foodDelivery = spendingByCategory["Yemek Siparişi"] || 0;
    if (foodDelivery > 0 && foodDelivery / monthlyIncome >= 0.06 && result.length < 5) {
      const fdPct = Math.round((foodDelivery / monthlyIncome) * 100);
      result.push(t("insightFoodDeliveryFmt", { pct: fdPct }));
    }

    if (variableCategories.length > 0 && result.length < 5) {
      const [varCat, varAmount] = variableCategories[0];
      const saving = Math.round(varAmount * 0.1);
      if (saving > 0) {
        result.push(t("insightReduceFmt", { cat: varCat, amount: formatAmount(saving) }));
      }
    }

    return result.slice(0, 5);
  }, [
    spendingByCategory, monthlyIncome, monthlyExpenses, remaining,
    creditCardSpending, totalLoanPayments, dailyAverage, projectedEndDate,
    previousMonthSpending, savingsGoal, selectedMonth, t, language,
  ]);

  const healthColor =
    financialHealthScore >= 70 ? Colors.green :
    financialHealthScore >= 40 ? Colors.yellow :
    financialHealthScore >= 20 ? Colors.orange : Colors.red;

  const PAYMENT_LABELS: Record<string, string> = {
    cash: t("cashLabel"),
    debit: t("debitCardLabel"),
    credit: t("creditCardLabel"),
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={styles.title}>{t("reportsTitle")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === "web" ? 120 : 100,
        }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Financial Health */}
        <View style={styles.healthCard}>
          <View style={styles.healthLeft}>
            <Text style={styles.healthTitle}>{t("financialHealth")}</Text>
            <View style={styles.healthLegend}>
              {[
                { color: Colors.green, label: t("legendGood") },
                { color: Colors.yellow, label: t("legendMedium") },
                { color: Colors.red, label: t("legendCritical") },
              ].map(({ color, label }) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[styles.healthScoreCircle, { borderColor: healthColor + "60" }]}>
            <Text style={[styles.healthScoreNum, { color: healthColor }]}>{financialHealthScore}</Text>
            <Text style={[styles.healthScoreMax, { color: healthColor }]}>/100</Text>
          </View>
        </View>

        {/* Overview Row */}
        <View style={styles.overviewRow}>
          {[
            { label: t("income"), value: monthlyIncome, color: Colors.green },
            { label: t("expenses"), value: monthlyExpenses, color: Colors.red },
            { label: t("netLabel"), value: remaining, color: remaining >= 0 ? Colors.tint : Colors.red },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>{label}</Text>
              <Text style={[styles.overviewValue, { color }]}>{formatAmount(value)}</Text>
            </View>
          ))}
        </View>

        {/* Income vs Expense Bar Chart */}
        {monthlyIncome > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="bar-chart-outline" size={16} color={Colors.blue} />
              <Text style={styles.sectionTitle}>{t("incomeVsExpense")}</Text>
            </View>
            <View style={styles.card}>
              <BarChart
                bars={[
                  { label: t("income"), value: monthlyIncome, color: Colors.green },
                  { label: t("expenses"), value: monthlyExpenses, color: Colors.red },
                  { label: t("netLabel"), value: Math.max(0, remaining), color: Colors.tint },
                ]}
              />
            </View>
          </View>
        )}

        {/* Financial Ratios */}
        {monthlyIncome > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="analytics-outline" size={16} color={Colors.purple} />
              <Text style={styles.sectionTitle}>{t("financialRatios")}</Text>
            </View>
            <View style={styles.ratioGrid}>
              <RatioGauge
                label={t("savingsRateLabel")}
                value={savingsRate}
                ideal="≥%20"
                thresholds={{ good: 100, warn: 100 }}
                language={language}
                invertColor
              />
              <RatioGauge
                label={t("expenseRatioLabel")}
                value={expenseRatio}
                ideal="≤%80"
                thresholds={{ good: 80, warn: 95 }}
                language={language}
              />
            </View>
            <View style={[styles.ratioGrid, { marginTop: 8 }]}>
              <RatioGauge
                label={t("debtBurdenLabel")}
                value={debtBurden}
                ideal="≤%36"
                thresholds={{ good: 36, warn: 50 }}
                language={language}
              />
              {creditCards.length > 0 && (
                <RatioGauge
                  label={t("creditUtilLabel")}
                  value={creditUtil}
                  ideal="≤%30"
                  thresholds={{ good: 30, warn: 50 }}
                  language={language}
                />
              )}
            </View>

          </View>
        )}

        {/* Fixed vs Variable Expenses */}
        {fixedVsVariable.total > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="git-compare-outline" size={16} color={Colors.orange} />
              <Text style={styles.sectionTitle}>{t("fixedVsVariable")}</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.fvRow}>
                <View style={styles.fvItem}>
                  <View style={[styles.fvDot, { backgroundColor: Colors.orange }]} />
                  <Text style={styles.fvLabel}>{t("fixedExpenses")}</Text>
                  <Text style={[styles.fvValue, { color: Colors.orange }]}>{formatAmount(fixedVsVariable.fixed)}</Text>
                  <Text style={styles.fvPct}>
                    %{fixedVsVariable.total > 0 ? Math.round((fixedVsVariable.fixed / fixedVsVariable.total) * 100) : 0}
                  </Text>
                </View>
                <View style={styles.fvItem}>
                  <View style={[styles.fvDot, { backgroundColor: Colors.blue }]} />
                  <Text style={styles.fvLabel}>{t("variableExpenses")}</Text>
                  <Text style={[styles.fvValue, { color: Colors.blue }]}>{formatAmount(fixedVsVariable.variable)}</Text>
                  <Text style={styles.fvPct}>
                    %{fixedVsVariable.total > 0 ? Math.round((fixedVsVariable.variable / fixedVsVariable.total) * 100) : 0}
                  </Text>
                </View>
              </View>
              <View style={styles.fvTrack}>
                <View
                  style={[
                    styles.fvFillLeft,
                    {
                      width: `${fixedVsVariable.total > 0 ? (fixedVsVariable.fixed / fixedVsVariable.total) * 100 : 50}%` as any,
                      backgroundColor: Colors.orange,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.fvFillRight,
                    {
                      width: `${fixedVsVariable.total > 0 ? (fixedVsVariable.variable / fixedVsVariable.total) * 100 : 50}%` as any,
                      backgroundColor: Colors.blue,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Spending Distribution Donut */}
        {donutData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pie-chart-outline" size={16} color={Colors.tint} />
              <Text style={styles.sectionTitle}>{t("spendingDistribution")}</Text>
            </View>
            <View style={styles.card}>
              <DonutChart
                data={donutData}
                centerLabel={language === "tr" ? "Toplam" : "Total"}
                centerValue={formatAmount(monthlyExpenses)}
              />
            </View>
          </View>
        )}

        {/* Savings Goal Progress (if set) */}
        {savingsGoal > 0 && (() => {
          const goalPct = Math.min(100, Math.max(0, (remaining / savingsGoal) * 100));
          const shortfall = savingsGoal - Math.max(0, remaining);
          const now = new Date();
          const [sy, sm] = (selectedMonth || "").split("-").map(Number);
          const isCurrentMonth = sy === now.getFullYear() && sm === now.getMonth() + 1;
          const daysInMonth = new Date(sy, sm, 0).getDate();
          const daysLeft = isCurrentMonth ? daysInMonth - now.getDate() : 0;
          const dailyNeeded = daysLeft > 0 && shortfall > 0 ? shortfall / daysLeft : 0;
          const projectedSavings = isCurrentMonth && dailyAverage > 0
            ? remaining - (dailyAverage * daysLeft)
            : remaining;
          const willReachGoal = projectedSavings >= savingsGoal;
          const savingsRateGoal = monthlyIncome > 0 ? Math.round((Math.max(0, remaining) / monthlyIncome) * 100) : 0;

          return (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="flag-outline" size={16} color={Colors.tint} />
                <Text style={styles.sectionTitle}>
                  {language === "tr" ? "Tasarruf Hedefi" : "Savings Goal"}
                </Text>
              </View>
              <View style={styles.goalCard}>
                <View style={styles.goalRow}>
                  <View>
                    <Text style={styles.goalLabel}>
                      {language === "tr" ? "Mevcut Tasarruf" : "Current Savings"}
                    </Text>
                    <Text style={[styles.goalValue, { color: remaining >= 0 ? Colors.tint : Colors.red }]}>
                      {formatAmount(Math.max(0, remaining))}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.goalLabel}>
                      {language === "tr" ? "Hedef" : "Target"}
                    </Text>
                    <Text style={styles.goalTarget}>{formatAmount(savingsGoal)}</Text>
                  </View>
                </View>
                <View style={styles.goalTrack}>
                  <View
                    style={[
                      styles.goalFill,
                      {
                        width: `${goalPct}%` as any,
                        backgroundColor: remaining >= savingsGoal ? Colors.green : Colors.tint,
                      },
                    ]}
                  />
                </View>

                <View style={styles.goalStatsGrid}>
                  <View style={styles.goalStatItem}>
                    <Text style={styles.goalStatLabel}>{language === "tr" ? "İlerleme" : "Progress"}</Text>
                    <Text style={[styles.goalStatValue, { color: Colors.tint }]}>{`%${Math.round(goalPct)}`}</Text>
                  </View>
                  <View style={styles.goalStatItem}>
                    <Text style={styles.goalStatLabel}>{language === "tr" ? "Tasarruf Oranı" : "Savings Rate"}</Text>
                    <Text style={[styles.goalStatValue, { color: savingsRateGoal >= 20 ? Colors.green : Colors.orange }]}>{`%${savingsRateGoal}`}</Text>
                  </View>
                  {shortfall > 0 && daysLeft > 0 && (
                    <View style={styles.goalStatItem}>
                      <Text style={styles.goalStatLabel}>{language === "tr" ? "Günlük Hedef" : "Daily Target"}</Text>
                      <Text style={[styles.goalStatValue, { color: Colors.blue }]}>{formatAmount(Math.ceil(dailyNeeded))}</Text>
                    </View>
                  )}
                  {shortfall > 0 && (
                    <View style={styles.goalStatItem}>
                      <Text style={styles.goalStatLabel}>{language === "tr" ? "Kalan" : "Remaining"}</Text>
                      <Text style={[styles.goalStatValue, { color: Colors.red }]}>{formatAmount(shortfall)}</Text>
                    </View>
                  )}
                </View>

                {isCurrentMonth && shortfall > 0 && (
                  <View style={[styles.goalProjection, { backgroundColor: willReachGoal ? Colors.green + "15" : Colors.orange + "15", borderColor: willReachGoal ? Colors.green + "40" : Colors.orange + "40" }]}>
                    <Ionicons name={willReachGoal ? "checkmark-circle-outline" : "alert-circle-outline"} size={16} color={willReachGoal ? Colors.green : Colors.orange} />
                    <Text style={[styles.goalProjectionText, { color: willReachGoal ? Colors.green : Colors.orange }]}>
                      {language === "tr"
                        ? willReachGoal
                          ? "Bu gidişle ay sonunda hedefinize ulaşabilirsiniz!"
                          : `Bu harcama hızıyla ay sonunda tahmini tasarrufunuz ${formatAmount(Math.max(0, projectedSavings))} olacak.`
                        : willReachGoal
                          ? "At this pace, you can reach your goal by month end!"
                          : `At current spending rate, projected savings: ${formatAmount(Math.max(0, projectedSavings))}.`}
                    </Text>
                  </View>
                )}

                {remaining >= savingsGoal && (
                  <View style={[styles.goalProjection, { backgroundColor: Colors.green + "15", borderColor: Colors.green + "40" }]}>
                    <Ionicons name="trophy-outline" size={16} color={Colors.green} />
                    <Text style={[styles.goalProjectionText, { color: Colors.green }]}>
                      {language === "tr"
                        ? `Tebrikler! Hedefinize ulaştınız — ${formatAmount(remaining - savingsGoal)} fazladan biriktirdiniz.`
                        : `Congratulations! Goal reached — ${formatAmount(remaining - savingsGoal)} extra saved.`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* Financial Analysis (computed insights — no AI) */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="bulb-outline" size={16} color={Colors.yellow} />
            <Text style={styles.sectionTitle}>{t("aiAnalysis")}</Text>
          </View>
          <View style={styles.insightsCard}>
            {insights.map((insight, idx) => (
              <View
                key={idx}
                style={[styles.insightItem, idx < insights.length - 1 && styles.itemDivider]}
              >
                <View style={styles.insightDot} />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Year-End Forecast */}
        {monthlyIncome > 0 && yearEndForecast.monthsLeft > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="telescope-outline" size={16} color={Colors.blue} />
              <Text style={styles.sectionTitle}>
                {language === "tr" ? `${yearEndForecast.currentYear} Sene Sonu Tahmini` : `${yearEndForecast.currentYear} Year-End Forecast`}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.forecastSubtitle}>
                {language === "tr"
                  ? `${yearEndForecast.monthsLeft} ay kaldı — düzenli işlemlere ve ortalamalara göre tahmin`
                  : `${yearEndForecast.monthsLeft} months left — forecast based on recurring items & averages`}
              </Text>

              <View style={styles.forecastRow}>
                <View style={styles.forecastItem}>
                  <Text style={styles.forecastLabel}>{language === "tr" ? "Bu Yıl Gelir (Şimdiye Kadar)" : "Income YTD"}</Text>
                  <Text style={[styles.forecastValue, { color: Colors.green }]}>{formatByCurrency(yearEndForecast.totalIncomeYTDByCur)}</Text>
                </View>
                <View style={styles.forecastItem}>
                  <Text style={styles.forecastLabel}>{language === "tr" ? "Bu Yıl Gider (Şimdiye Kadar)" : "Expenses YTD"}</Text>
                  <Text style={[styles.forecastValue, { color: Colors.red }]}>{formatByCurrency(yearEndForecast.totalExpenseYTDByCur)}</Text>
                </View>
              </View>

              <View style={[styles.forecastDivider]} />

              <Text style={styles.forecastSectionLabel}>
                {language === "tr" ? "Düzenli İşlemlere Göre" : "Based on Recurring Items"}
              </Text>
              <View style={styles.forecastRow}>
                <View style={styles.forecastItem}>
                  <Text style={styles.forecastLabel}>{language === "tr" ? "Tahmini Yıllık Gelir" : "Projected Annual Income"}</Text>
                  <Text style={[styles.forecastValue, { color: Colors.green }]}>{formatByCurrency(yearEndForecast.projectedTotalIncomeByCur)}</Text>
                </View>
                <View style={styles.forecastItem}>
                  <Text style={styles.forecastLabel}>{language === "tr" ? "Tahmini Yıllık Gider" : "Projected Annual Expenses"}</Text>
                  <Text style={[styles.forecastValue, { color: Colors.red }]}>{formatByCurrency(yearEndForecast.projectedTotalExpenseByCur)}</Text>
                </View>
              </View>
              <View style={[styles.forecastNetRow, { backgroundColor: getNetColor(yearEndForecast.projectedNetByCur, toTRY) + "12" }]}>
                <Text style={styles.forecastNetLabel}>{language === "tr" ? "Tahmini Net" : "Projected Net"}</Text>
                <Text style={[styles.forecastNetValue, { color: getNetColor(yearEndForecast.projectedNetByCur, toTRY) }]}>
                  {formatByCurrency(yearEndForecast.projectedNetByCur)}
                </Text>
              </View>

              <View style={[styles.forecastDivider]} />

              <Text style={styles.forecastSectionLabel}>
                {language === "tr" ? "Aylık Ortalamaya Göre" : "Based on Monthly Averages"}
              </Text>
              <View style={styles.forecastRow}>
                <View style={styles.forecastItem}>
                  <Text style={styles.forecastLabel}>{language === "tr" ? "Tahmini Yıllık Gelir" : "Projected Annual Income"}</Text>
                  <Text style={[styles.forecastValue, { color: Colors.green }]}>{formatByCurrency(yearEndForecast.projectedByAvgIncomeByCur)}</Text>
                </View>
                <View style={styles.forecastItem}>
                  <Text style={styles.forecastLabel}>{language === "tr" ? "Tahmini Yıllık Gider" : "Projected Annual Expenses"}</Text>
                  <Text style={[styles.forecastValue, { color: Colors.red }]}>{formatByCurrency(yearEndForecast.projectedByAvgExpenseByCur)}</Text>
                </View>
              </View>
              <View style={[styles.forecastNetRow, { backgroundColor: getNetColor(yearEndForecast.projectedByAvgNetByCur, toTRY) + "12" }]}>
                <Text style={styles.forecastNetLabel}>{language === "tr" ? "Tahmini Net" : "Projected Net"}</Text>
                <Text style={[styles.forecastNetValue, { color: getNetColor(yearEndForecast.projectedByAvgNetByCur, toTRY) }]}>
                  {formatByCurrency(yearEndForecast.projectedByAvgNetByCur)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Daily Spending Mini Chart */}
        {Object.keys(dailySpending).length > 0 && (() => {
          const days = Object.keys(dailySpending).map(Number).sort((a, b) => a - b);
          const maxDay = Math.max(...days);
          const maxAmt = Math.max(...Object.values(dailySpending), 1);
          const chartW = 320;
          const chartH = 80;
          const barW = Math.max(4, Math.min(12, (chartW - 20) / maxDay - 2));

          return (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.tint} />
                <Text style={styles.sectionTitle}>
                  {language === "tr" ? "Günlük Harcama" : "Daily Spending"}
                </Text>
              </View>
              <View style={[styles.card, { alignItems: "center" as const }]}>
                <Svg width={chartW} height={chartH + 20}>
                  <Line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke={Colors.border} strokeWidth={1} />
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map((day) => {
                    const val = dailySpending[day] || 0;
                    const h = val > 0 ? (val / maxAmt) * (chartH - 10) : 0;
                    const x = ((day - 1) / Math.max(maxDay - 1, 1)) * (chartW - barW - 10) + 5;
                    return (
                      <G key={day}>
                        <Rect
                          x={x}
                          y={chartH - h}
                          width={barW}
                          height={h}
                          rx={2}
                          fill={val > dailyAverage * 1.5 ? Colors.red : val > dailyAverage ? Colors.yellow : Colors.tint}
                          opacity={0.8}
                        />
                        {day === 1 || day === maxDay || day % 5 === 0 ? (
                          <SvgText
                            x={x + barW / 2}
                            y={chartH + 14}
                            fill={Colors.textSecondary}
                            fontSize={8}
                            textAnchor="middle"
                          >
                            {day}
                          </SvgText>
                        ) : null}
                      </G>
                    );
                  })}
                  {dailyAverage > 0 && (
                    <Line
                      x1={0}
                      y1={chartH - (dailyAverage / maxAmt) * (chartH - 10)}
                      x2={chartW}
                      y2={chartH - (dailyAverage / maxAmt) * (chartH - 10)}
                      stroke={Colors.yellow}
                      strokeWidth={1}
                      strokeDasharray="4,4"
                    />
                  )}
                </Svg>
                {dailyAverage > 0 && (
                  <View style={styles.dailyAvgRow}>
                    <View style={[styles.dailyAvgLine, { backgroundColor: Colors.yellow }]} />
                    <Text style={styles.dailyAvgLabel}>
                      {language === "tr" ? "Günlük Ort:" : "Daily Avg:"} {formatAmount(dailyAverage)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* Category Groups */}
        {groupedSpending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="layers-outline" size={16} color={Colors.tint} />
              <Text style={styles.sectionTitle}>{t("categoryGroups")}</Text>
            </View>
            <View style={styles.card}>
              {groupedSpending.map(([group, amount], idx) => (
                <CategoryBar
                  key={group}
                  category={group}
                  amount={amount}
                  total={monthlyExpenses}
                  color={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Detailed Category Spending */}
        {sortedCategories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pie-chart-outline" size={16} color={Colors.blue} />
              <Text style={styles.sectionTitle}>{t("categoryDetail")}</Text>
            </View>
            <View style={styles.card}>
              {sortedCategories.map(([cat, amount], idx) => (
                <CategoryBar
                  key={cat}
                  category={cat}
                  amount={amount}
                  total={monthlyExpenses}
                  color={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                  prevAmount={previousMonthSpending[cat]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Payment Method Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="card-outline" size={16} color={Colors.purple} />
            <Text style={styles.sectionTitle}>{t("paymentMethods")}</Text>
          </View>
          <View style={styles.paymentGrid}>
            {Object.entries(paymentMethods).map(([method, amount]) => (
              <View key={method} style={styles.paymentCard}>
                <Ionicons
                  name={PAYMENT_METHOD_ICONS[method] as any}
                  size={20}
                  color={
                    method === "cash" ? Colors.green :
                    method === "debit" ? Colors.blue : Colors.purple
                  }
                />
                <Text style={styles.paymentLabel}>{PAYMENT_LABELS[method]}</Text>
                <Text style={styles.paymentAmount}>{formatAmount(amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Per-card spending + minimum payment warning */}
        {cardSpendingList.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="card" size={16} color={Colors.purple} />
              <Text style={styles.sectionTitle}>{t("cardSpending")}</Text>
            </View>

            {creditCardSpending > 0 && (() => {
              const totalMin = cardSpendingList.reduce((s, { card, amount }) => {
                const rate = getMinRate(card?.bank ?? "");
                return s + amount * rate;
              }, 0);
              const afterMin = creditCardSpending - totalMin;
              const severity =
                creditCardSpending / (monthlyIncome || 1) > 0.5 ? "danger" :
                creditCardSpending / (monthlyIncome || 1) > 0.3 ? "warn" : "ok";
              const bg = severity === "danger" ? Colors.red + "18" : severity === "warn" ? Colors.orange + "18" : Colors.tint + "12";
              const borderC = severity === "danger" ? Colors.red + "50" : severity === "warn" ? Colors.orange + "50" : Colors.tint + "40";
              const iconC = severity === "danger" ? Colors.red : severity === "warn" ? Colors.orange : Colors.tint;
              return (
                <View style={[styles.ccWarnCard, { backgroundColor: bg, borderColor: borderC }]}>
                  <View style={styles.ccWarnRow}>
                    <Ionicons name={severity === "ok" ? "checkmark-circle-outline" : "warning-outline"} size={18} color={iconC} />
                    <Text style={[styles.ccWarnTitle, { color: iconC }]}>
                      {language === "tr"
                        ? severity === "ok" ? "Kart Harcaması Normal" : severity === "warn" ? "Dikkat: Yüksek Kart Harcaması" : "Uyarı: Kritik Kart Borcu"
                        : severity === "ok" ? "Card Spending in Check" : severity === "warn" ? "Caution: High Card Spending" : "Alert: Critical Card Debt"}
                    </Text>
                  </View>
                  <Text style={styles.ccWarnBody}>
                    {language === "tr"
                      ? `Bu ay kredi kartı harcamanız ${formatAmount(creditCardSpending)}. Toplam asgari ödeme tahmini ${formatAmount(totalMin)} — ana borcun ${formatAmount(afterMin)} kısmı sonraki aya devredebilir.`
                      : `This month's credit card spending: ${formatAmount(creditCardSpending)}. Estimated total minimum payment: ${formatAmount(totalMin)} — up to ${formatAmount(afterMin)} may roll over to next month.`}
                  </Text>
                  {severity !== "ok" && (
                    <Text style={[styles.ccWarnNote, { color: iconC }]}>
                      {language === "tr"
                        ? `Gelirinizin %${Math.round((creditCardSpending / (monthlyIncome || 1)) * 100)}'ini kart harcamalarına harcıyorsunuz. Bütçenizi gözden geçirin.`
                        : `You're spending ${Math.round((creditCardSpending / (monthlyIncome || 1)) * 100)}% of your income on credit cards. Review your budget.`}
                    </Text>
                  )}
                </View>
              );
            })()}

            <View style={styles.cardsListCard}>
              {cardSpendingList.map(({ card, amount }, idx) => {
                if (!card) return null;
                const rate = getMinRate(card.bank);
                const minPayment = amount * rate;
                const mainDebt = amount - minPayment;
                const rateLabel = `%${Math.round(rate * 100)}`;
                return (
                  <View
                    key={card.id}
                    style={[styles.cardSpendRow, idx < cardSpendingList.length - 1 && styles.itemDivider]}
                  >
                    <View style={[styles.cardStripe, { backgroundColor: card.color }]} />
                    <View style={styles.cardSpendInfo}>
                      <Text style={styles.cardSpendBank}>{card.bank}</Text>
                      <Text style={styles.cardSpendName}>{card.name}</Text>
                      <Text style={styles.cardSpendRateLabel}>
                        {language === "tr" ? `Asgari oran: ${rateLabel}` : `Min. rate: ${rateLabel}`}
                      </Text>
                    </View>
                    <View style={styles.cardSpendAmounts}>
                      <Text style={styles.cardSpendTotal}>{formatAmount(amount)}</Text>
                      <Text style={styles.cardSpendMin}>
                        {language === "tr" ? "Asgari: " : "Min: "}{formatAmount(minPayment)}
                      </Text>
                      {mainDebt > 0 && (
                        <Text style={styles.cardSpendDebt}>
                          {language === "tr" ? "Devir: " : "Rollover: "}{formatAmount(mainDebt)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <Text style={styles.ccBdkkNote}>
              {language === "tr"
                ? "Asgari ödeme oranları BDDK düzenlemelerine ve bankaya göre belirlenir. Gerçek tutarlar kart ekstrenizde görünür."
                : "Minimum payment rates are set by BDDK regulations and vary by bank. Check your statement for exact amounts."}
            </Text>
          </View>
        )}

        {/* Loans Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="home-outline" size={16} color={Colors.orange} />
            <Text style={styles.sectionTitle}>{t("loanPaymentsTitle")}</Text>
            <Pressable
              style={styles.addSmallBtn}
              onPress={() => { Haptics.selectionAsync(); router.push("/add-loan"); }}
            >
              <Ionicons name="add" size={14} color={Colors.orange} />
            </Pressable>
          </View>
          {loans.length === 0 ? (
            <Pressable style={styles.addLoanBox} onPress={() => router.push("/add-loan")}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.orange} />
              <Text style={styles.addLoanText}>{t("addLoanPrompt")}</Text>
            </Pressable>
          ) : (
            <View style={styles.card}>
              {loans.map((loan, idx) => (
                <View key={loan.id} style={[styles.loanRow, idx < loans.length - 1 && styles.itemDivider]}>
                  <View style={styles.loanLeft}>
                    <Text style={styles.loanTitle}>{loan.title}</Text>
                    <Text style={styles.loanMeta}>
                      {loan.bank}
                      {loan.interestRate ? ` · %${loan.interestRate}` : ""}
                    </Text>
                    {loan.totalAmount > 0 && (
                      <>
                        <View style={styles.loanProgress}>
                          <View
                            style={[
                              styles.loanProgressFill,
                              {
                                width: `${Math.max(2, ((loan.totalAmount - loan.remainingAmount) / loan.totalAmount) * 100)}%` as any,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.loanProgressLabel}>
                          {language === "tr" ? "Kalan:" : "Left:"} {formatAmount(loan.remainingAmount, loan.currency)}
                        </Text>
                      </>
                    )}
                  </View>
                  <View style={styles.loanRight}>
                    <Text style={styles.loanPayment}>{formatAmount(loan.monthlyPayment, loan.currency)}</Text>
                    <Text style={styles.loanPaymentLabel}>{t("perMonth")}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.loanTotalRow}>
                <Text style={styles.loanTotalLabel}>{t("totalMonthlyLoans")}</Text>
                <Text style={styles.loanTotalAmount}>{formatAmount(totalLoanPayments)}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.text },
  healthCard: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  healthLeft: { flex: 1 },
  healthTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 8 },
  healthLegend: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  healthScoreCircle: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 2.5,
    alignItems: "center", justifyContent: "center", marginLeft: 12,
  },
  healthScoreNum: { fontFamily: "Inter_700Bold", fontSize: 24 },
  healthScoreMax: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: -2 },
  overviewRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  overviewCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: Colors.border,
  },
  overviewLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginBottom: 6 },
  overviewValue: { fontFamily: "Inter_700Bold", fontSize: 13 },
  section: { marginBottom: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, flex: 1 },
  addSmallBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.orange + "20",
    alignItems: "center", justifyContent: "center",
  },
  ratioGrid: { flexDirection: "row", gap: 8 },
  fvRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  fvItem: { alignItems: "center", gap: 4, flex: 1 },
  fvDot: { width: 10, height: 10, borderRadius: 5 },
  fvLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  fvValue: { fontFamily: "Inter_700Bold", fontSize: 15 },
  fvPct: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.text },
  fvTrack: { height: 8, borderRadius: 4, overflow: "hidden", flexDirection: "row" },
  fvFillLeft: { height: "100%", borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  fvFillRight: { height: "100%", borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  dailyAvgRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  dailyAvgLine: { width: 16, height: 2, borderRadius: 1 },
  dailyAvgLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  insightsCard: {
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  insightItem: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 10 },
  insightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.yellow, marginTop: 5 },
  insightText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text, lineHeight: 19, flex: 1 },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  card: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  goalCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1,
    borderColor: Colors.tint + "30",
  },
  goalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  goalLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  goalValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  goalTarget: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  goalTrack: { height: 6, backgroundColor: Colors.card2, borderRadius: 3, overflow: "hidden", marginBottom: 8 },
  goalFill: { height: "100%", borderRadius: 3 },
  goalStatsGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 4,
  },
  goalStatItem: {
    flex: 1, minWidth: "40%" as any, backgroundColor: Colors.background,
    borderRadius: 10, padding: 10, alignItems: "center",
  },
  goalStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  goalStatValue: { fontFamily: "Inter_700Bold", fontSize: 15 },
  goalProjection: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 8,
    borderRadius: 10, padding: 10, borderWidth: 1,
  },
  goalProjectionText: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 18, flex: 1 },
  paymentGrid: { flexDirection: "row", gap: 8 },
  paymentCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border,
  },
  paymentLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },
  paymentAmount: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text, textAlign: "center" },
  cardsListCard: {
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  cardSpendRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  cardStripe: { width: 4, alignSelf: "stretch", borderRadius: 2, marginRight: 12 },
  cardSpendInfo: { flex: 1 },
  cardSpendBank: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  cardSpendName: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  cardSpendAmounts: { alignItems: "flex-end" },
  cardSpendTotal: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.text },
  cardSpendMin: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  cardSpendDebt: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.orange, marginTop: 1 },
  cardSpendRateLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  ccWarnCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8, marginBottom: 8 },
  ccWarnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ccWarnTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 },
  ccWarnBody: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  ccWarnNote: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 18 },
  ccBdkkNote: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, lineHeight: 17, marginTop: 4 },
  loanRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, gap: 12 },
  loanLeft: { flex: 1 },
  loanTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 2 },
  loanMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  loanProgress: { height: 4, backgroundColor: Colors.card2, borderRadius: 2, overflow: "hidden", marginBottom: 4 },
  loanProgressFill: { height: "100%", backgroundColor: Colors.orange, borderRadius: 2 },
  loanProgressLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  loanRight: { alignItems: "flex-end", paddingTop: 2 },
  loanPayment: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.orange },
  loanPaymentLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  loanTotalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  loanTotalLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  loanTotalAmount: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.orange },
  addLoanBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14,
    padding: 16, gap: 10, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.orange + "60",
  },
  addLoanText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.orange },
  forecastSubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  forecastRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  forecastItem: { flex: 1, backgroundColor: Colors.background, borderRadius: 10, padding: 10 },
  forecastLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  forecastValue: { fontFamily: "Inter_700Bold", fontSize: 14 },
  forecastDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  forecastSectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text, marginBottom: 8 },
  forecastNetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 10, padding: 12, marginTop: 4 },
  forecastNetLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text },
  forecastNetValue: { fontFamily: "Inter_700Bold", fontSize: 16 },
});
