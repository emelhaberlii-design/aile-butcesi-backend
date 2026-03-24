import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useBudget, CurrencyCode } from "@/context/BudgetContext";
import { useLanguage } from "@/context/LanguageContext";
import { fmtCurrency, getCurrencySymbol } from "@/lib/currency";

function fmt(n: number, currency?: CurrencyCode): string {
  return fmtCurrency(n, currency || "TRY");
}

function addMonths(base: string, delta: number): string {
  const [y, m] = base.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthStr: string, language: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function ForecastScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isEN = language === "en";
  const {
    incomes,
    expenses,
    loans,
    creditCards,
    selectedMonth,
    spendingByCard,
  } = useBudget();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const nowStr = selectedMonth;

  const recurringIncomes = useMemo(
    () => incomes.filter((i) => i.isRecurring),
    [incomes]
  );

  const recurringExpenses = useMemo(
    () => expenses.filter((e) => e.isRecurring),
    [expenses]
  );

  const installmentExpenses = useMemo(
    () =>
      expenses.filter(
        (e) =>
          e.isInstallment &&
          e.installmentCount !== undefined &&
          e.installmentCurrent !== undefined &&
          e.installmentCurrent < e.installmentCount
      ),
    [expenses]
  );

  const cardNextMonth = useMemo(
    () =>
      creditCards.map((c) => ({
        ...c,
        thisMonthSpend: spendingByCard[c.id] ?? 0,
        prevDebt: c.currentDebt ?? 0,
        nextBill: (c.currentDebt ?? 0) + (spendingByCard[c.id] ?? 0),
      })),
    [creditCards, spendingByCard]
  );

  const totalCardDebt = useMemo(
    () => cardNextMonth.reduce((sum, c) => sum + c.nextBill, 0),
    [cardNextMonth]
  );

  // Build 5-month forecast starting from NEXT month (skip current month)
  const forecastMonths = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const monthStr = addMonths(nowStr, i + 1); // i+1: skip current month
      const [y, m] = monthStr.split("-").map(Number);

      const recIncome = recurringIncomes.reduce((s, inc) => s + inc.amount, 0);
      const recExpense = recurringExpenses.reduce((s, exp) => s + exp.amount, 0);

      const installmentExpense = installmentExpenses.reduce((s, exp) => {
        const expMonth = exp.date.substring(0, 7);
        const [ey, em] = expMonth.split("-").map(Number);
        const baseMonthIndex = (ey - 2000) * 12 + em;
        const targetMonthIndex = (y - 2000) * 12 + m;
        const monthOffset = targetMonthIndex - baseMonthIndex;
        const remainingInstallments = (exp.installmentCount ?? 0) - (exp.installmentCurrent ?? 1) + 1;
        if (monthOffset >= 0 && monthOffset < remainingInstallments) {
          return s + exp.amount;
        }
        return s;
      }, 0);

      const loanPayments = loans.reduce((s, l) => s + l.monthlyPayment, 0);

      // Credit card debt: add to NEXT month only (i=0 = next month)
      const cardDebtPayment = i === 0 ? totalCardDebt : 0;

      const totalExpense = recExpense + installmentExpense + loanPayments + cardDebtPayment;
      const net = recIncome - totalExpense;

      // Individual items for expanded view
      const activeInstallments = installmentExpenses.filter((exp) => {
        const expMonth = exp.date.substring(0, 7);
        const [ey, em] = expMonth.split("-").map(Number);
        const baseMonthIndex = (ey - 2000) * 12 + em;
        const targetMonthIndex = (y - 2000) * 12 + m;
        const monthOffset = targetMonthIndex - baseMonthIndex;
        const remainingInstallments = (exp.installmentCount ?? 0) - (exp.installmentCurrent ?? 1) + 1;
        return monthOffset >= 0 && monthOffset < remainingInstallments;
      });

      return {
        monthStr,
        label: getMonthLabel(monthStr, language),
        isNext: i === 0,
        recIncome,
        recExpense,
        installmentExpense,
        loanPayments,
        cardDebtPayment,
        totalExpense,
        net,
        month: m,
        activeInstallments,
      };
    });
  }, [nowStr, recurringIncomes, recurringExpenses, installmentExpenses, loans, totalCardDebt, language]);

  const hasData =
    recurringIncomes.length > 0 ||
    recurringExpenses.length > 0 ||
    loans.length > 0 ||
    installmentExpenses.length > 0;

  function toggleExpand(monthStr: string) {
    setExpandedMonth(prev => prev === monthStr ? null : monthStr);
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={14}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEN ? "Financial Forecast" : "Finansal Tahmin"}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.tint} />
          <Text style={styles.infoText}>
            {isEN
              ? "Based on recurring income, expenses, installments, and loans. Current month is excluded — only future months shown. Tap a month to see details."
              : "Tekrarlayan gelir, gider, taksit ve kredilerinize göre tahmin. İçinde bulunduğumuz ay dahil edilmez. Detaylar için aya dokunun."}
          </Text>
        </View>

        {totalCardDebt > 0 && (
          <View style={styles.debtCard}>
            <View style={styles.debtHeader}>
              <Ionicons name="card-outline" size={16} color={Colors.orange} />
              <Text style={styles.debtTitle}>
                {isEN ? "Credit Cards → next month billing" : "Kredi Kartları → gelecek ay borcu"}
              </Text>
            </View>
            <Text style={styles.debtAmount}>{fmt(totalCardDebt)}</Text>
            {cardNextMonth.filter((c) => c.nextBill > 0).map((card) => (
              <View key={card.id} style={[styles.debtCardBlock, { borderLeftColor: card.color }]}>
                <View style={styles.debtCardHeader}>
                  <View style={[styles.debtDot, { backgroundColor: card.color }]} />
                  <Text style={styles.debtCardName}>{card.bank} – {card.name}</Text>
                  <Text style={[styles.debtCardAmount, { color: card.color }]}>
                    {fmt(card.nextBill, card.currency)}
                  </Text>
                </View>
                {(card.thisMonthSpend > 0 || card.prevDebt > 0) && (
                  <View style={styles.debtCardBreakdown}>
                    {card.thisMonthSpend > 0 && (
                      <Text style={styles.debtCardDetail}>
                        {isEN ? "This month: " : "Bu ay: "}
                        <Text style={{ color: Colors.red }}>{fmt(card.thisMonthSpend, card.currency)}</Text>
                      </Text>
                    )}
                    {card.prevDebt > 0 && (
                      <Text style={styles.debtCardDetail}>
                        {isEN ? "Previous: " : "Önceki: "}
                        <Text style={{ color: Colors.orange }}>{fmt(card.prevDebt, card.currency)}</Text>
                      </Text>
                    )}
                    {(card.limit ?? 0) > 0 && (
                      <Text style={styles.debtCardDetail}>
                        {isEN ? "Limit: " : "Limit: "}
                        <Text style={{ color: Colors.textSecondary }}>{fmt(card.limit!, card.currency)}</Text>
                        {" · "}
                        <Text style={{ color: Colors.green }}>
                          {isEN ? "Remaining: " : "Kalan: "}{fmt(Math.max(0, (card.limit ?? 0) - card.nextBill), card.currency)}
                        </Text>
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {!hasData ? (
          <View style={styles.emptyState}>
            <Ionicons name="trending-up-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {isEN ? "No recurring items" : "Tekrarlayan öğe yok"}
            </Text>
            <Text style={styles.emptyText}>
              {isEN
                ? "Add recurring incomes, expenses, or loans to see your financial forecast."
                : "Tahmin görmek için tekrarlayan gelir, gider veya kredi ekleyin."}
            </Text>
          </View>
        ) : (
          forecastMonths.map((fm) => {
            const netColor = fm.net >= 0 ? Colors.green : Colors.red;
            const isExpanded = expandedMonth === fm.monthStr;
            return (
              <View
                key={fm.monthStr}
                style={[
                  styles.monthCard,
                  fm.isNext && { borderColor: Colors.tint + "60", borderWidth: 1.5 },
                ]}
              >
                {/* Header — tappable */}
                <Pressable
                  style={styles.monthCardHeader}
                  onPress={() => toggleExpand(fm.monthStr)}
                >
                  <View style={styles.monthLabelRow}>
                    <Text style={styles.monthName}>{fm.label}</Text>
                    {fm.isNext && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>
                          {isEN ? "Next Month" : "Gelecek Ay"}
                        </Text>
                      </View>
                    )}
                    {(fm.month === 1 || fm.month === 7) && (
                      <View style={styles.zamBadge}>
                        <Ionicons name="trending-up" size={10} color={Colors.orange} />
                        <Text style={styles.zamBadgeText}>
                          {isEN ? "Raise season" : "Zam dönemi"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.monthHeaderRight}>
                    <Text style={[styles.monthNet, { color: netColor }]}>
                      {fm.net >= 0 ? "+" : ""}{fmt(fm.net)}
                    </Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={Colors.textTertiary}
                    />
                  </View>
                </Pressable>

                {/* Summary row (always visible) */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: Colors.green }]} />
                    <Text style={styles.summaryLabel}>{isEN ? "Income" : "Gelir"}</Text>
                    <Text style={[styles.summaryAmt, { color: Colors.green }]}>+{fmt(fm.recIncome)}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: Colors.red }]} />
                    <Text style={styles.summaryLabel}>{isEN ? "Expense" : "Gider"}</Text>
                    <Text style={[styles.summaryAmt, { color: Colors.red }]}>-{fmt(fm.totalExpense)}</Text>
                  </View>
                </View>

                {/* Expanded detail */}
                {isExpanded && (
                  <View style={styles.breakdown}>
                    <View style={styles.breakdownDivider} />

                    {/* Recurring Incomes */}
                    {recurringIncomes.length > 0 && (
                      <View style={styles.breakdownGroup}>
                        <Text style={styles.breakdownGroupTitle}>
                          {isEN ? "Recurring Income" : "Tekrarlayan Gelirler"}
                        </Text>
                        {recurringIncomes.map((inc) => (
                          <View key={inc.id} style={styles.breakdownRow}>
                            <View style={styles.breakdownLeft}>
                              <View style={[styles.breakdownDot, { backgroundColor: Colors.green }]} />
                              <Text style={styles.breakdownLabel}>{inc.title}</Text>
                            </View>
                            <Text style={[styles.breakdownAmount, { color: Colors.green }]}>
                              +{fmt(inc.amount, inc.currency)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Recurring Expenses */}
                    {recurringExpenses.length > 0 && (
                      <View style={styles.breakdownGroup}>
                        <Text style={styles.breakdownGroupTitle}>
                          {isEN ? "Recurring Expenses" : "Tekrarlayan Giderler"}
                        </Text>
                        {recurringExpenses.map((exp) => (
                          <View key={exp.id} style={styles.breakdownRow}>
                            <View style={styles.breakdownLeft}>
                              <View style={[styles.breakdownDot, { backgroundColor: Colors.red }]} />
                              <Text style={styles.breakdownLabel}>{exp.title}</Text>
                            </View>
                            <Text style={[styles.breakdownAmount, { color: Colors.red }]}>
                              -{fmt(exp.amount, exp.currency)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Installments */}
                    {fm.activeInstallments.length > 0 && (
                      <View style={styles.breakdownGroup}>
                        <Text style={styles.breakdownGroupTitle}>
                          {isEN ? "Installments" : "Taksitler"}
                        </Text>
                        {fm.activeInstallments.map((exp) => (
                          <View key={exp.id} style={styles.breakdownRow}>
                            <View style={styles.breakdownLeft}>
                              <View style={[styles.breakdownDot, { backgroundColor: Colors.orange }]} />
                              <Text style={styles.breakdownLabel}>{exp.title}</Text>
                            </View>
                            <Text style={[styles.breakdownAmount, { color: Colors.orange }]}>
                              -{fmt(exp.amount, exp.currency)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Loans */}
                    {loans.length > 0 && (
                      <View style={styles.breakdownGroup}>
                        <Text style={styles.breakdownGroupTitle}>
                          {isEN ? "Loan Payments" : "Kredi Ödemeleri"}
                        </Text>
                        {loans.map((loan) => (
                          <View key={loan.id} style={styles.breakdownRow}>
                            <View style={styles.breakdownLeft}>
                              <View style={[styles.breakdownDot, { backgroundColor: Colors.purple }]} />
                              <Text style={styles.breakdownLabel}>{loan.title}</Text>
                            </View>
                            <Text style={[styles.breakdownAmount, { color: Colors.purple }]}>
                              -{fmt(loan.monthlyPayment, loan.currency)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Credit card debt (next month only) */}
                    {fm.cardDebtPayment > 0 && (
                      <View style={styles.breakdownGroup}>
                        <Text style={styles.breakdownGroupTitle}>
                          {isEN ? "Credit Card Debt Payment" : "Kredi Kartı Borç Ödemesi"}
                        </Text>
                        {creditCards.filter(c => (c.currentDebt ?? 0) > 0).map((card) => (
                          <View key={card.id} style={styles.breakdownRow}>
                            <View style={styles.breakdownLeft}>
                              <View style={[styles.breakdownDot, { backgroundColor: card.color }]} />
                              <Text style={styles.breakdownLabel}>{card.bank} – {card.name}</Text>
                            </View>
                            <Text style={[styles.breakdownAmount, { color: card.color }]}>
                              -{fmt(card.currentDebt ?? 0, card.currency)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Net */}
                    <View style={styles.breakdownNetRow}>
                      <Ionicons
                        name={fm.net >= 0 ? "trending-up" : "trending-down"}
                        size={14}
                        color={netColor}
                      />
                      <Text style={[styles.breakdownLabelBold, { color: netColor }]}>Net</Text>
                      <Text style={[styles.breakdownAmountBold, { color: netColor, marginLeft: "auto" as any }]}>
                        {fm.net >= 0 ? "+" : ""}{fmt(fm.net)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  scroll: { padding: 14, gap: 12 },

  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: Colors.tint + "12", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.tint + "30",
  },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 19 },

  debtCard: {
    backgroundColor: Colors.orange + "12", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.orange + "40", gap: 8,
  },
  debtHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  debtTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.orange, flex: 1 },
  debtAmount: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.orange },
  debtRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  debtCardBlock: { marginTop: 10, borderLeftWidth: 3, paddingLeft: 10, gap: 4 },
  debtCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  debtCardBreakdown: { gap: 2, paddingLeft: 16 },
  debtCardDetail: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  debtDot: { width: 8, height: 8, borderRadius: 4 },
  debtCardName: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  debtCardAmount: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  emptyState: { alignItems: "center", gap: 10, paddingVertical: 50 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textTertiary, textAlign: "center", maxWidth: 280, lineHeight: 20 },

  monthCard: {
    backgroundColor: Colors.card, borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
  },
  monthCardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 14,
  },
  monthLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  monthHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  currentBadge: {
    backgroundColor: Colors.tint + "20", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  currentBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.tint },
  zamBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: Colors.orange + "20", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  zamBadgeText: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.orange },
  monthNet: { fontFamily: "Inter_700Bold", fontSize: 17 },

  summaryRow: {
    flexDirection: "row", paddingHorizontal: 14, paddingBottom: 12, gap: 12,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10,
  },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1 },
  summaryAmt: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  breakdown: { paddingHorizontal: 14, paddingBottom: 14, gap: 0 },
  breakdownDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  breakdownGroup: { marginBottom: 12 },
  breakdownGroupTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
  },
  breakdownRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  breakdownLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  breakdownDot: { width: 7, height: 7, borderRadius: 3.5 },
  breakdownLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  breakdownLabelBold: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  breakdownAmount: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  breakdownAmountBold: { fontFamily: "Inter_700Bold", fontSize: 14 },
  breakdownNetRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4,
  },
});
