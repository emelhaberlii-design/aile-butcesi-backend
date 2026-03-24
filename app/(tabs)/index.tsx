import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Animated,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { useBudget, formatInputAmount, parseInputAmount, CurrencyCode } from "@/context/BudgetContext";
import { getCurrencySymbol, fmtCurrency } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSavingsGoals, GoalCurrency } from "@/context/SavingsGoalsContext";
import { useBusinessBudget } from "@/context/BusinessContext";
import { AdBanner } from "@/components/AdBanner";
import { useSpecialDays } from "@/context/SpecialDaysContext";
import { useSpendingLimits, getLimitAmount, getLimitUsage, statusColor } from "@/context/SpendingLimitsContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const ACTION_BTN_WIDTH = (SCREEN_WIDTH - 32 - 3 * 8) / 4;

function formatAmount(amount: number, currency?: CurrencyCode): string {
  return fmtCurrency(amount, currency || "TRY");
}

function formatByCurrency(byCurrency: Record<string, number>): string {
  const entries = Object.entries(byCurrency).filter(([, v]) => v !== 0);
  if (entries.length === 0) return fmtCurrency(0, "TRY");
  return entries.map(([c, v]) => fmtCurrency(v, c as CurrencyCode)).join(" + ");
}

const CURRENCY_SYMBOLS: Record<GoalCurrency, string> = { TL: "₺", USD: "$", EUR: "€", gold_gram: "gr" };
function formatGoalAmount(amount: number, currency: GoalCurrency): string {
  const formatted = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: currency === "gold_gram" ? 2 : 0 }).format(amount);
  if (currency === "TL") return `${formatted} ₺`;
  if (currency === "gold_gram") return `${formatted} gram`;
  return `${CURRENCY_SYMBOLS[currency]}${formatted}`;
}

function getMonthLabel(month: string, language: string): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1, 1);
  return date.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

function getHealthColor(score: number): string {
  if (score >= 70) return Colors.green;
  if (score >= 40) return Colors.yellow;
  if (score >= 20) return Colors.orange;
  return Colors.red;
}

function getBudgetColor(remaining: number, total: number): string {
  if (total === 0) return Colors.green;
  const ratio = remaining / total;
  if (ratio >= 0.4) return Colors.green;
  if (ratio >= 0.2) return Colors.yellow;
  if (ratio >= 0) return Colors.orange;
  return Colors.red;
}

function getUpcomingIcon(type: "income" | "expense" | "loan" | "creditcard") {
  switch (type) {
    case "income": return { icon: "arrow-down", color: Colors.green };
    case "expense": return { icon: "arrow-up", color: Colors.red };
    case "loan": return { icon: "home-outline", color: Colors.orange };
    case "creditcard": return { icon: "card-outline", color: Colors.purple };
  }
}

interface QuickActionButtonProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

function QuickActionButton({ icon, label, color, onPress }: QuickActionButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }], width: ACTION_BTN_WIDTH }}>
      <Pressable style={[styles.quickAction, { borderColor: color + "33" }]} onPress={handlePress}>
        <View style={[styles.quickActionIcon, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <Text style={styles.quickActionLabel} numberOfLines={1}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const isEN = language === "en";
  const {
    selectedMonth,
    setSelectedMonth,
    monthlyIncome,
    monthlyExpenses,
    remaining,
    incomeByCurrency,
    expensesByCurrency,
    remainingByCurrency,
    financialHealthScore,
    dailyAverage,
    projectedEndDate,
    upcomingPayments,
    recentTransactions,
    loans,
    totalLoanPayments,
    savingsGoal,
    setSavingsGoal,
    spendingByMember,
    spendingByCategory,
    creditCardPaymentTotal,
  } = useBudget();
  const { user } = useAuth();
  const biz = useBusinessBudget();
  const { combinedWithBudget, monthlyBusinessExpenses, monthlyBusinessIncomes } = biz;
  const { getUpcoming } = useSpecialDays();
  const upcomingSpecialDays = getUpcoming(30).slice(0, 3);

  const { limits } = useSpendingLimits();
  const limitIncomeBase = combinedWithBudget ? monthlyIncome + monthlyBusinessIncomes : monthlyIncome;
  const _totalSpentForLimits = Object.values(spendingByCategory).reduce((s, v) => s + v, 0);
  
  const limitWarnings = limits
    .filter((l) => {
      if (!l.enabled) return false;
      if (!l.isRecurring && l.specificMonth !== selectedMonth) return false;
      const spent = l.category === "all" ? _totalSpentForLimits : (spendingByCategory[l.category] ?? 0);
      const lAmt = getLimitAmount(l, limitIncomeBase);
      const usage = getLimitUsage(spent, lAmt);
      return usage.percent >= 0.5;
    })
    .map((l) => {
      const spent = l.category === "all" ? _totalSpentForLimits : (spendingByCategory[l.category] ?? 0);
      const lAmt = getLimitAmount(l, limitIncomeBase);
      const usage = getLimitUsage(spent, lAmt);
      return { limit: l, usage };
    })
    .slice(0, 3);

  const displayIncome = monthlyIncome + (combinedWithBudget ? monthlyBusinessIncomes : 0);
  const displayExpenses = monthlyExpenses + (combinedWithBudget ? monthlyBusinessExpenses : 0);
  const displayRemaining = remaining + (combinedWithBudget ? monthlyBusinessIncomes - monthlyBusinessExpenses : 0);

  const combinedRecentTransactions = useMemo(() => {
    if (!combinedWithBudget) return recentTransactions;
    const bizExpenses = biz.businessExpenses
      .filter((e) => e.date.startsWith(selectedMonth))
      .map((e) => ({
        id: `biz_exp_${e.id}`,
        title: e.title,
        amount: e.amount,
        category: e.category,
        subcategory: isEN ? "Business" : "İş Yeri",
        date: e.date,
        type: "expense" as const,
        isBusiness: true,
      }));
    const bizIncomes = biz.businessIncomes
      .filter((i) => i.date.startsWith(selectedMonth))
      .map((i) => ({
        id: `biz_inc_${i.id}`,
        title: i.title,
        amount: i.amount,
        category: i.category,
        date: i.date,
        type: "income" as const,
        isBusiness: true,
      }));
    const all = [
      ...recentTransactions.map((tx) => ({ ...tx, isBusiness: false })),
      ...bizExpenses,
      ...bizIncomes,
    ];
    return all
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);
  }, [recentTransactions, biz.businessExpenses, biz.businessIncomes, combinedWithBudget, selectedMonth, isEN]);

  const [showSavingsGoalModal, setShowSavingsGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const { goals, getStats } = useSavingsGoals();
  const primaryGoal = goals.find((g) => !g.isCompleted);

  useEffect(() => {
    checkZamUyarisi();
  }, []);

  async function checkZamUyarisi() {
    const now = new Date();
    const month = now.getMonth() + 1;
    if (month !== 1 && month !== 7) return;
    const key = `@budget_zam_uyarisi_${now.getFullYear()}_${month}`;
    try {
      const seen = await AsyncStorage.getItem(key);
      if (seen) return;
      await AsyncStorage.setItem(key, "1");
      const monthName = month === 1 ? (isEN ? "January" : "Ocak") : (isEN ? "July" : "Temmuz");
      Alert.alert(
        isEN ? `${monthName} — Raise Season` : `${monthName} — Zam Dönemi`,
        isEN
          ? `It's ${monthName}! This is typically a salary raise period in Turkey. Would you like to update your income records?`
          : `${monthName} ayındasınız! Bu dönem Türkiye'de genellikle maaş zam ayıdır. Gelir kayıtlarınızı güncellemek ister misiniz?`,
        [
          { text: isEN ? "Update Income" : "Gelirleri Güncelle", onPress: () => router.push("/add-income") },
          { text: isEN ? "Later" : "Sonra", style: "cancel" },
        ]
      );
    } catch {}
  }

  const progressPercent = displayIncome > 0 ? Math.min(1, displayExpenses / displayIncome) : 0;
  const healthColor = getHealthColor(financialHealthScore);
  const healthLabel =
    financialHealthScore >= 70 ? t("healthGood") :
    financialHealthScore >= 40 ? t("healthMedium") :
    financialHealthScore >= 20 ? t("healthLow") : t("healthCritical");
  const budgetColor = getBudgetColor(displayRemaining, displayIncome);

  const savingsGoalProgress = savingsGoal > 0 ? Math.min(1, Math.max(0, displayRemaining / savingsGoal)) : 0;
  const savingsGoalReached = savingsGoal > 0 && displayRemaining >= savingsGoal;

  function changeMonth(delta: number) {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(newMonth);
    Haptics.selectionAsync();
  }

  const handleSaveGoal = async () => {
    const val = parseInputAmount(goalInput);
    if (isNaN(val)) return;
    await setSavingsGoal(val);
    setShowSavingsGoalModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={{ paddingTop: topPadding }}>
        <AdBanner position="top" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 120 : 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t("greeting")}</Text>
            <Text style={styles.appTitle}>{t("appTitle")}</Text>
          </View>
          <View style={[styles.healthBadge, { backgroundColor: healthColor + "20", borderColor: healthColor + "40" }]}>
            <Text style={[styles.healthScore, { color: healthColor }]}>{financialHealthScore}</Text>
            <Text style={[styles.healthLabel, { color: healthColor }]}>{healthLabel}</Text>
          </View>
        </View>

        {/* Month selector */}
        <View style={styles.monthSelector}>
          <Pressable onPress={() => changeMonth(-1)} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.monthLabel}>{getMonthLabel(selectedMonth, language)}</Text>
          <Pressable onPress={() => changeMonth(1)} style={styles.monthArrow}>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Main Budget Card */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetRow}>
            <View style={styles.budgetItem}>
              <View style={styles.budgetItemHeader}>
                <View style={[styles.dot, { backgroundColor: Colors.green }]} />
                <Text style={styles.budgetItemLabel}>{t("income")}</Text>
              </View>
              <Text style={styles.budgetItemAmount}>{formatByCurrency(incomeByCurrency)}</Text>
            </View>
            <View style={styles.budgetDivider} />
            <View style={styles.budgetItem}>
              <View style={styles.budgetItemHeader}>
                <View style={[styles.dot, { backgroundColor: Colors.red }]} />
                <Text style={styles.budgetItemLabel}>{t("expenses")}</Text>
              </View>
              <Text style={styles.budgetItemAmount}>{formatByCurrency(expensesByCurrency)}</Text>
            </View>
          </View>

          <View style={styles.remainingRow}>
            <Text style={styles.remainingLabel}>{t("remaining")}{combinedWithBudget ? " *" : ""}</Text>
            <Text style={[styles.remainingAmount, { color: budgetColor }]}>
              {formatByCurrency(remainingByCurrency)}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, progressPercent * 100)}%`, backgroundColor: budgetColor }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>{t("spentFmt", { n: Math.round(progressPercent * 100) })}</Text>
            {projectedEndDate && (
              <Text style={styles.progressLabel}>
                {t("estimatedEndFmt", { date: projectedEndDate === "Ay sonu" ? t("endOfMonth") : projectedEndDate })}
              </Text>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("quickAction")}</Text>
          <View style={styles.quickActions}>
            <QuickActionButton icon="add-circle" label={t("addIncomeBtn")} color={Colors.green} onPress={() => router.push("/add-income")} />
            <QuickActionButton icon="remove-circle" label={t("addExpenseBtn")} color={Colors.red} onPress={() => router.push("/add-expense")} />
            <QuickActionButton icon="card-outline" label={t("creditCardsBtn")} color={Colors.purple} onPress={() => router.push("/manage-cards")} />
            <QuickActionButton icon="home-outline" label={t("loansBtn")} color={Colors.orange} onPress={() => router.push("/add-loan")} />
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("recentTransactions")}</Text>
          <View style={styles.card}>
            {combinedRecentTransactions.map((tx, idx) => (
              <View key={tx.id} style={[styles.transactionItem, idx < combinedRecentTransactions.length - 1 && styles.itemDivider]}>
                <View style={styles.transactionLeft}>
                  <View style={[styles.transactionIcon, { backgroundColor: tx.type === "income" ? Colors.green + "20" : Colors.red + "20" }]}>
                    <Ionicons name={tx.type === "income" ? "arrow-down" : "arrow-up"} size={14} color={tx.type === "income" ? Colors.green : Colors.red} />
                  </View>
                  <View>
                    <Text style={styles.transactionTitle}>{tx.title}</Text>
                    <Text style={styles.transactionMeta}>{tx.category} · {tx.date}</Text>
                  </View>
                </View>
                <Text style={[styles.transactionAmount, { color: tx.type === "income" ? Colors.green : Colors.red }]}>
                  {tx.type === "income" ? "+" : "-"}{formatAmount(tx.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Savings Goal Modal */}
      <Modal visible={showSavingsGoalModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEN ? "Set Monthly Savings Goal" : "Aylık Tasarruf Hedefi Belirle"}</Text>
            <TextInput
              style={styles.modalInput}
              value={goalInput}
              onChangeText={(text) => setGoalInput(formatInputAmount(text))}
              placeholder="0,00"
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowSavingsGoalModal(false)}>
                <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveGoal}>
                <Text style={styles.saveBtnText}>{t("save")}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 16 },
  greeting: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  appTitle: { fontSize: 24, color: Colors.text, fontFamily: "Inter_700Bold" },
  healthBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  healthScore: { fontSize: 18, fontFamily: "Inter_700Bold" },
  healthLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  monthSelector: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginVertical: 20 },
  monthArrow: { padding: 8 },
  monthLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, marginHorizontal: 20 },
  budgetCard: { backgroundColor: Colors.card, marginHorizontal: 16, borderRadius: 24, padding: 20, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  budgetRow: { flexDirection: "row", marginBottom: 20 },
  budgetItem: { flex: 1 },
  budgetItemHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  budgetItemLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  budgetItemAmount: { fontSize: 16, color: Colors.text, fontFamily: "Inter_700Bold" },
  budgetDivider: { width: 1, height: "100%", backgroundColor: Colors.border, mx: 15 },
  remainingRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 15, marginBottom: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  remainingLabel: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  remainingAmount: { fontSize: 24, fontFamily: "Inter_800ExtraBold" },
  progressTrack: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 11, color: Colors.textTertiary, fontFamily: "Inter_400Regular" },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 12 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickAction: { padding: 12, borderRadius: 16, backgroundColor: Colors.card, borderWidth: 1, alignItems: "center" },
  quickActionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  quickActionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.text },
  card: { backgroundColor: Colors.card, borderRadius: 20, padding: 16 },
  transactionItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  transactionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  transactionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  transactionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  transactionMeta: { fontSize: 12, color: Colors.textSecondary },
  transactionAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: Colors.card, borderRadius: 24, padding: 24, alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 20, textAlign: "center" },
  modalInput: { width: "100%", height: 60, backgroundColor: Colors.background, borderRadius: 16, fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center", color: Colors.tint, marginBottom: 20 },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveBtn: { backgroundColor: Colors.tint },
  saveBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  cancelBtn: { backgroundColor: Colors.border },
  cancelBtnText: { color: Colors.textSecondary, fontFamily: "Inter_600SemiBold" },
});