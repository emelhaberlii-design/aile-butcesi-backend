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

  // Ocak/Temmuz zam dönemi uyarısı
  useEffect(() => {
    checkZamUyarisi();
  }, []);

  async function checkZamUyarisi() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1=January, 7=July
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
          {
            text: isEN ? "Update Income" : "Gelirleri Güncelle",
            onPress: () => router.push("/add-income"),
          },
          {
            text: isEN ? "Later" : "Sonra",
            style: "cancel",
          },
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

  const savingsGoalProgress =
    savingsGoal > 0 ? Math.min(1, Math.max(0, displayRemaining / savingsGoal)) : 0;
  const savingsGoalReached = savingsGoal > 0 && displayRemaining >= savingsGoal;

  function changeMonth(delta: number) {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(newMonth);
    Haptics.selectionAsync();
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={{ paddingTop: topPadding }}>
        <AdBanner position="top" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 120 : 100 }}
        contentInsetAdjustmentBehavior="automatic"
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
          {creditCardPaymentTotal > 0 && (
            <Pressable
              style={styles.cardPaymentInfoRow}
              onPress={() => router.push("/manage-cards" as any)}
            >
              <Ionicons name="card-outline" size={12} color={Colors.purple} />
              <Text style={styles.cardPaymentInfoText}>
                {isEN
                  ? `Card payment included: ${formatAmount(creditCardPaymentTotal)}`
                  : `Kart ödemesi dahil: ${formatAmount(creditCardPaymentTotal)}`}
              </Text>
              <Ionicons name="chevron-forward" size={12} color={Colors.textSecondary} />
            </Pressable>
          )}

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, progressPercent * 100)}%` as any,
                  backgroundColor: budgetColor,
                },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>
              {t("spentFmt", { n: Math.round(progressPercent * 100) })}
            </Text>
            {projectedEndDate && (
              <Text style={styles.progressLabel}>
                {t("estimatedEndFmt", {
                  date:
                    projectedEndDate === "Ay sonu" ? t("endOfMonth") :
                    projectedEndDate === "Bu ay" ? t("thisMonth") :
                    projectedEndDate,
                })}
              </Text>
            )}
          </View>
        </View>

        {/* Spending Limit Warnings */}
        {limitWarnings.length > 0 && (
          <Pressable
            style={styles.limitWarningCard}
            onPress={() => router.push("/spending-limits" as any)}
          >
            <View style={styles.limitWarningHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="shield-checkmark-outline" size={15} color={Colors.orange} />
                <Text style={styles.limitWarningTitle}>
                  {isEN ? "Spending Limit Alerts" : "Harcama Limiti Uyarıları"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
            </View>
            {limitWarnings.map(({ limit, usage }) => {
              const color = statusColor(usage.status);
              const catName = limit.category === "all" ? (isEN ? "All Spending" : "Tüm Harcamalar") : limit.category;
              const pct = Math.round(usage.percent * 100);
              return (
                <View key={limit.id} style={styles.limitWarningRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={styles.limitWarningCat}>{catName}</Text>
                      <Text style={[styles.limitWarningPct, { color }]}>{pct}%</Text>
                    </View>
                    <View style={styles.limitMiniTrack}>
                      <View style={[styles.limitMiniFill, { width: `${Math.min(100, pct)}%` as any, backgroundColor: color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </Pressable>
        )}

        {/* Savings Goal Card */}
        {savingsGoal > 0 && (
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalHeaderLeft}>
                <Ionicons name="flag-outline" size={16} color={Colors.tint} />
                <Text style={styles.goalTitle}>
                  {language === "tr" ? "Tasarruf Hedefi" : "Savings Goal"}
                </Text>
              </View>
              <Text style={[styles.goalBadge, { color: savingsGoalReached ? Colors.green : Colors.textSecondary }]}>
                {savingsGoalReached
                  ? (language === "tr" ? "Ulaşıldı!" : "Reached!")
                  : `${Math.round(savingsGoalProgress * 100)}%`}
              </Text>
            </View>
            <View style={styles.goalProgressRow}>
              <Text style={styles.goalProgressText}>
                {formatAmount(Math.max(0, displayRemaining))}
              </Text>
              <Text style={styles.goalProgressSep}>/</Text>
              <Text style={styles.goalTarget}>{formatAmount(savingsGoal)}</Text>
            </View>
            <View style={styles.goalTrack}>
              <View
                style={[
                  styles.goalFill,
                  {
                    width: `${Math.min(100, savingsGoalProgress * 100)}%` as any,
                    backgroundColor: savingsGoalReached ? Colors.green : Colors.tint,
                  },
                ]}
              />
            </View>
            {!savingsGoalReached && displayRemaining < savingsGoal && (
              <Text style={styles.goalHint}>
                {language === "tr"
                  ? `Hedefe ulaşmak için ${formatAmount(savingsGoal - Math.max(0, displayRemaining))} daha tasarruf edin`
                  : `Save ${formatAmount(savingsGoal - Math.max(0, displayRemaining))} more to reach your goal`}
              </Text>
            )}
          </View>
        )}

        {/* Hedef Birikimim Card */}
        {primaryGoal && (() => {
          const s = getStats(primaryGoal);
          const pct = Math.round(s.progressPct * 100);
          const statusColor = s.isOverdue ? Colors.red : s.isOnTrack ? Colors.purple : Colors.orange;
          const statusLabel = s.isOverdue
            ? (isEN ? "Overdue" : "Süre Doldu")
            : s.isOnTrack
            ? (isEN ? "On Track" : "Yolunda")
            : (isEN ? "Behind" : "Geride");
          return (
            <Pressable
              style={[styles.hedefCard]}
              onPress={() => router.push("/savings-goals" as any)}
            >
              <View style={styles.goalHeader}>
                <View style={styles.goalHeaderLeft}>
                  <Ionicons name="bookmark-outline" size={16} color={Colors.purple} />
                  <Text style={[styles.goalTitle, { color: Colors.purple }]}>
                    {isEN ? "Savings Target" : "Hedef Birikimim"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ backgroundColor: statusColor + "20", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: statusColor }}>{statusLabel}</Text>
                  </View>
                  <Text style={[styles.goalBadge, { color: statusColor }]}>%{pct}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 8 }} numberOfLines={1}>
                {primaryGoal.title}
              </Text>
              <View style={styles.goalProgressRow}>
                <Text style={[styles.goalProgressText, { color: Colors.purple }]}>
                  {formatGoalAmount(s.savedAmount, primaryGoal.currency)}
                </Text>
                <Text style={styles.goalProgressSep}>/</Text>
                <Text style={styles.goalTarget}>
                  {formatGoalAmount(primaryGoal.targetAmount, primaryGoal.currency)}
                </Text>
              </View>
              <View style={[styles.goalTrack, { marginBottom: 6 }]}>
                <View
                  style={[
                    styles.goalFill,
                    {
                      width: `${Math.min(100, s.progressPct * 100)}%` as any,
                      backgroundColor: statusColor,
                    },
                  ]}
                />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.goalHint}>
                  {isEN ? `Remaining: ` : `Kalan: `}
                  <Text style={{ color: Colors.orange, fontFamily: "Inter_600SemiBold" }}>
                    {formatGoalAmount(s.remainingAmount, primaryGoal.currency)}
                  </Text>
                </Text>
                {s.monthsLeft > 0 && (
                  <Text style={styles.goalHint}>
                    {isEN ? `${s.monthsLeft} mo left` : `${s.monthsLeft} ay kaldı`}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })()}

        {/* Special Days Widget */}
        {upcomingSpecialDays.length > 0 && (
          <Pressable
            style={styles.specialDaysCard}
            onPress={() => router.push("/special-days" as any)}
          >
            <View style={styles.specialDaysHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="gift-outline" size={15} color={Colors.red} />
                <Text style={styles.specialDaysTitle}>
                  {isEN ? "Upcoming Special Days" : "Yaklaşan Özel Günler"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
            </View>
            {upcomingSpecialDays.map((evt) => {
              const d = evt.daysUntil;
              const countdownColor = d === 0 ? Colors.red : d <= 7 ? Colors.orange : Colors.yellow;
              const label = d === 0
                ? (isEN ? "Today!" : "Bugün!")
                : d === 1
                ? (isEN ? "Tomorrow" : "Yarın")
                : (isEN ? `${d} days` : `${d} gün`);
              const name = evt.day.isSystemEvent
                ? evt.day.title
                : `${evt.day.personName} — ${evt.day.title}`;
              return (
                <View key={evt.day.id} style={styles.specialDaysRow}>
                  <Text style={styles.specialDaysName} numberOfLines={1}>{name}</Text>
                  <Text style={[styles.specialDaysCountdown, { color: countdownColor }]}>{label}</Text>
                </View>
              );
            })}
          </Pressable>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.statValue}>{formatAmount(dailyAverage)}</Text>
            <Text style={styles.statLabel}>{t("dailyAvg")}</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Ionicons name="trending-up-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.statValue}>
              {displayIncome > 0 && displayRemaining >= 0
                ? `%${Math.round((displayRemaining / displayIncome) * 100)}`
                : "-%"}
            </Text>
            <Text style={styles.statLabel}>{t("savings")}</Text>
          </View>
          {totalLoanPayments > 0 && (
            <View style={[styles.statCard, { flex: 1 }]}>
              <Ionicons name="home-outline" size={16} color={Colors.orange} />
              <Text style={[styles.statValue, { color: Colors.orange }]}>
                {formatAmount(totalLoanPayments)}
              </Text>
              <Text style={styles.statLabel}>{t("loanPerMonth")}</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("quickAction")}</Text>
          <View style={styles.quickActions}>
            <QuickActionButton
              icon="add-circle"
              label={t("addIncomeBtn")}
              color={Colors.green}
              onPress={() => router.push("/add-income")}
            />
            <QuickActionButton
              icon="remove-circle"
              label={t("addExpenseBtn")}
              color={Colors.red}
              onPress={() => router.push("/add-expense")}
            />
            <QuickActionButton
              icon="card-outline"
              label={t("creditCardsBtn")}
              color={Colors.purple}
              onPress={() => router.push("/manage-cards")}
            />
            <QuickActionButton
              icon="home-outline"
              label={t("loansBtn")}
              color={Colors.orange}
              onPress={() => router.push("/add-loan")}
            />
            <QuickActionButton
              icon="bar-chart-outline"
              label={language === "tr" ? "Tahmin" : "Forecast"}
              color={Colors.tint}
              onPress={() => router.push("/forecast" as any)}
            />
            <QuickActionButton
              icon="flag-outline"
              label={language === "tr" ? "Hedeflerim" : "Goals"}
              color={Colors.purple}
              onPress={() => router.push("/savings-goals" as any)}
            />
            <QuickActionButton
              icon="wallet-outline"
              label={language === "tr" ? "Tasarruf Hedefi" : "Budget Goal"}
              color={Colors.tint}
              onPress={() => {
                setGoalInput(savingsGoal > 0 ? formatInputAmount(String(savingsGoal)) : "");
                setShowSavingsGoalModal(true);
                Haptics.selectionAsync();
              }}
            />
          </View>
        </View>

        {/* Member Spending Widget */}
        {Object.keys(spendingByMember.byMember).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isEN ? "Who Spent What?" : "Kim Ne Harcadı?"}</Text>
            <View style={styles.card}>
              {(() => {
                const entries = Object.entries(spendingByMember.byMember);
                const memberColors = [Colors.blue, Colors.purple, Colors.orange, Colors.red, Colors.tint];
                const memberIcons: Array<"person" | "person-outline" | "people"> = ["person", "person-outline", "person-outline", "person-outline", "person-outline"];
                const total = entries.reduce((s, [, v]) => s + v.amount, 0);
                return entries
                  .filter(([, v]) => v.amount > 0)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([key, { amount, name }], idx) => {
                    const color = key === "shared" ? Colors.green : (memberColors[idx % memberColors.length]);
                    const icon = key === "shared" ? "people" as const : (key === user?.id ? "person" as const : (memberIcons[idx % memberIcons.length]));
                    const displayName = key === user?.id ? (user?.name?.split(" ")[0] || name) : name;
                    const pct = total > 0 ? (amount / total) * 100 : 0;
                    return (
                      <View key={key} style={styles.memberSpendRow}>
                        <View style={styles.memberSpendLeft}>
                          <View style={[styles.memberSpendDot, { backgroundColor: color + "30" }]}>
                            <Ionicons name={icon} size={13} color={color} />
                          </View>
                          <Text style={styles.memberSpendName}>{displayName}</Text>
                        </View>
                        <View style={styles.memberSpendBarWrap}>
                          <View style={[styles.memberSpendBarFill, { width: `${Math.max(pct, 2)}%` as any, backgroundColor: color }]} />
                        </View>
                        <View style={styles.memberSpendRight}>
                          <Text style={[styles.memberSpendAmt, { color }]}>₺{amount.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</Text>
                          <Text style={styles.memberSpendPct}>{pct.toFixed(0)}%</Text>
                        </View>
                      </View>
                    );
                  });
              })()}
            </View>
          </View>
        )}

        {/* Upcoming Payments Widget */}
        {upcomingPayments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("upcomingPayments")}</Text>
            <View style={styles.card}>
              {upcomingPayments.map((payment, idx) => {
                const { icon, color } = getUpcomingIcon(payment.type);
                const daysText =
                  payment.daysLeft === 0 ? t("today") :
                  payment.daysLeft === 1 ? t("tomorrow") :
                  t("daysLeftFmt", { n: payment.daysLeft });
                return (
                  <View
                    key={idx}
                    style={[
                      styles.upcomingItem,
                      idx < upcomingPayments.length - 1 && styles.itemDivider,
                    ]}
                  >
                    <View style={styles.upcomingLeft}>
                      <View style={[styles.upcomingIcon, { backgroundColor: color + "20" }]}>
                        <Ionicons name={icon as any} size={14} color={color} />
                      </View>
                      <View>
                        <Text style={styles.upcomingTitle}>{payment.title}</Text>
                        <Text style={[styles.upcomingDays, {
                          color: payment.daysLeft <= 3 ? Colors.red :
                                 payment.daysLeft <= 7 ? Colors.orange : Colors.textSecondary
                        }]}>{daysText}</Text>
                      </View>
                    </View>
                    <Text style={[styles.upcomingAmount, { color }]}>
                      {payment.type === "income" ? "+" : "-"}{formatAmount(payment.amount, payment.currency)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Loan Overview */}
        {loans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("loansSection")}</Text>
            <View style={styles.card}>
              {loans.map((loan, idx) => (
                <View
                  key={loan.id}
                  style={[styles.loanItem, idx < loans.length - 1 && styles.itemDivider]}
                >
                  <View style={[styles.loanIcon, { backgroundColor: Colors.orange + "20" }]}>
                    <Ionicons name="home-outline" size={16} color={Colors.orange} />
                  </View>
                  <View style={styles.loanInfo}>
                    <Text style={styles.loanTitle}>{loan.title}</Text>
                    <Text style={styles.loanMeta}>
                      {loan.bank} · {language === "tr" ? `Her ayın ${loan.paymentDay}.` : `Due: ${loan.paymentDay}th`}
                    </Text>
                  </View>
                  <View style={styles.loanRight}>
                    <Text style={styles.loanMonthly}>{formatAmount(loan.monthlyPayment, loan.currency)}</Text>
                    <Text style={styles.loanRemaining}>
                      {language === "tr" ? "Kalan:" : "Left:"} {formatAmount(loan.remainingAmount, loan.currency)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("recentTransactions")}</Text>
            <Pressable onPress={() => router.push("/(tabs)/transactions")}>
              <Text style={styles.seeAll}>{t("seeAll")}</Text>
            </Pressable>
          </View>
          {combinedRecentTransactions.length === 0 ? (
            <View style={[styles.card, styles.emptyState]}>
              <Ionicons name="receipt-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>{t("noTransactions")}</Text>
              <Text style={styles.emptySubText}>{t("noTransactionsSub")}</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {combinedRecentTransactions.map((tx, idx) => {
                const isBiz = (tx as any).isBusiness === true;
                return (
                  <Pressable
                    key={tx.id}
                    style={({ pressed }) => [
                      styles.transactionItem,
                      idx < combinedRecentTransactions.length - 1 && styles.itemDivider,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={() => {
                      if (!isBiz) {
                        router.push({ pathname: "/transaction-detail", params: { id: tx.id, type: tx.type } });
                      }
                    }}
                  >
                    <View style={[styles.txIcon, {
                      backgroundColor: isBiz
                        ? Colors.purple + "20"
                        : tx.type === "income" ? Colors.green + "20" : Colors.card2,
                    }]}>
                      <Ionicons
                        name={isBiz ? "briefcase" : (tx.type === "income" ? "arrow-down" : "arrow-up")}
                        size={16}
                        color={isBiz ? Colors.purple : (tx.type === "income" ? Colors.green : Colors.textSecondary)}
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle} numberOfLines={1}>{tx.title}</Text>
                      <Text style={styles.txCategory} numberOfLines={1}>
                        {isBiz
                          ? `${tx.category} · ${isEN ? "Business" : "İş Yeri"}`
                          : tx.type === "income"
                            ? tx.category
                            : `${tx.category} · ${(tx as any).subcategory}`}
                      </Text>
                      <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "short", year: "numeric" })}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isBiz ? Colors.purple : (tx.type === "income" ? Colors.green : Colors.text) }]}>
                      {tx.type === "income" ? "+" : "-"}{new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(tx.amount)} {getCurrencySymbol(tx.currency || "TRY")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={{ paddingBottom: bottomPadding }}>
        <AdBanner position="bottom" />
      </View>

      {/* Savings Goal Modal */}
      <Modal visible={showSavingsGoalModal} transparent animationType="fade">
        <View style={styles.goalModalOverlay}>
          <View style={styles.goalModal}>
            <Text style={styles.goalModalTitle}>
              {isEN ? "Monthly Savings Goal" : "Aylık Tasarruf Hedefi"}
            </Text>
            <Text style={styles.goalModalSub}>
              {isEN
                ? "How much do you want to save this month?"
                : "Bu ay ne kadar tasarruf etmek istiyorsunuz?"}
            </Text>
            <View style={styles.goalInputRow}>
              <Text style={styles.goalCurrency}>₺</Text>
              <TextInput
                style={styles.goalInput}
                value={goalInput}
                onChangeText={(v) => setGoalInput(formatInputAmount(v))}
                keyboardType="decimal-pad"
                placeholder="5.000"
                placeholderTextColor={Colors.textTertiary}
                autoFocus
              />
            </View>
            <View style={styles.goalModalBtns}>
              <Pressable style={styles.goalCancelBtn} onPress={() => setShowSavingsGoalModal(false)}>
                <Text style={styles.goalCancelText}>{isEN ? "Cancel" : "İptal"}</Text>
              </Pressable>
              <Pressable
                style={styles.goalSaveBtn}
                onPress={() => {
                  const parsed = parseInputAmount(goalInput);
                  if (!isNaN(parsed) && parsed >= 0) {
                    setSavingsGoal(parsed);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                  setShowSavingsGoalModal(false);
                }}
              >
                <Text style={styles.goalSaveText}>{isEN ? "Save" : "Kaydet"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  appTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.text,
  },
  healthBadge: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  healthScore: { fontFamily: "Inter_700Bold", fontSize: 22 },
  healthLabel: { fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 1 },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 12,
  },
  monthArrow: { padding: 6 },
  monthLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    textTransform: "capitalize",
  },
  budgetCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  budgetRow: { flexDirection: "row", marginBottom: 20 },
  budgetItem: { flex: 1 },
  budgetItemHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  budgetItemLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  budgetItemAmount: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  budgetDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  remainingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  remainingLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
  remainingAmount: { fontFamily: "Inter_700Bold", fontSize: 20 },
  cardPaymentInfoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 4,
    marginBottom: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.purple + "10",
    borderRadius: 8,
    alignSelf: "flex-end" as const,
  },
  cardPaymentInfoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.purple,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.card2,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  goalCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.tint + "30",
    marginBottom: 12,
  },
  hedefCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.purple + "30",
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  goalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  goalTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  goalBadge: { fontFamily: "Inter_700Bold", fontSize: 13 },
  goalProgressRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 8 },
  goalProgressText: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.tint },
  goalProgressSep: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  goalTarget: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
  goalTrack: {
    height: 6,
    backgroundColor: Colors.card2,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  goalFill: { height: "100%", borderRadius: 3 },
  goalHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  limitWarningCard: {
    backgroundColor: Colors.card2,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.orange + "30",
  },
  limitWarningHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  limitWarningTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  limitWarningRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  limitWarningCat: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.text,
  },
  limitWarningPct: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  limitMiniTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  limitMiniFill: { height: "100%", borderRadius: 2 },
  specialDaysCard: {
    backgroundColor: Colors.card2,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.red + "30",
  },
  specialDaysHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  specialDaysTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  specialDaysRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  specialDaysName: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.text,
    marginRight: 12,
  },
  specialDaysCountdown: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.text },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  memberSpendRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  memberSpendLeft: { flexDirection: "row", alignItems: "center", gap: 8, width: 90 },
  memberSpendDot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  memberSpendName: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text },
  memberSpendBarWrap: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.background, overflow: "hidden" },
  memberSpendBarFill: { height: 6, borderRadius: 3 },
  memberSpendRight: { alignItems: "flex-end", minWidth: 70 },
  memberSpendAmt: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  memberSpendPct: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  seeAll: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.tint },
  card: {
    marginHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  quickActions: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 8 },
  quickAction: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.text,
    textAlign: "center",
  },
  upcomingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  upcomingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  upcomingIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  upcomingTitle: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  upcomingDays: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  upcomingAmount: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  loanItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  loanIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  loanInfo: { flex: 1 },
  loanTitle: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  loanMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  loanRight: { alignItems: "flex-end" },
  loanMonthly: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.orange },
  loanRemaining: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  transactionItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txTitle: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  txCategory: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  txDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  txAmount: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyState: { alignItems: "center", padding: 32, gap: 8 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
  emptySubText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textTertiary, textAlign: "center" },
  goalModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 },
  goalModal: { backgroundColor: Colors.card, borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, borderWidth: 1, borderColor: Colors.border },
  goalModalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, marginBottom: 6 },
  goalModalSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  goalInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  goalCurrency: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.tint },
  goalInput: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 32, color: Colors.text, borderBottomWidth: 2, borderBottomColor: Colors.tint, paddingBottom: 4 },
  goalModalBtns: { flexDirection: "row", gap: 12 },
  goalCancelBtn: { flex: 1, backgroundColor: Colors.card2, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  goalCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  goalSaveBtn: { flex: 1, backgroundColor: Colors.tint, borderRadius: 12, padding: 14, alignItems: "center" },
  goalSaveText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.background },
});
