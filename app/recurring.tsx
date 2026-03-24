import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Alert,
  Animated,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useBudget, Income, Expense } from "@/context/BudgetContext";
import { useLanguage } from "@/context/LanguageContext";
import { CurrencyCode, getCurrencySymbol } from "@/lib/currency";

function formatAmount(amount: number, sym: string = "₺"): string {
  return new Intl.NumberFormat("tr-TR").format(Math.round(amount)) + " " + sym;
}

type RecurringItem = {
  id: string;
  type: "income" | "expense";
  title: string;
  amount: number;
  category: string;
  isRecurring: boolean;
  recurringFrequency?: "daily" | "weekly" | "monthly";
  recurringDay?: number;
  recurringEndDate?: string;
  date: string;
  currency?: CurrencyCode;
};

function SwipeableRow({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteThreshold = -80;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) translateX.setValue(Math.max(gs.dx, -100));
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < deleteThreshold) {
          Animated.spring(translateX, { toValue: -80, useNativeDriver: true, bounciness: 0 }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const handleDeletePress = () => {
    Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    onDelete();
  };

  return (
    <View style={swipeStyles.container}>
      <View style={swipeStyles.deleteContainer}>
        <Pressable style={swipeStyles.deleteBtn} onPress={handleDeletePress}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </Pressable>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  container: { position: "relative", overflow: "hidden", borderRadius: 14, marginBottom: 1 },
  deleteContainer: {
    position: "absolute", right: 0, top: 0, bottom: 0,
    width: 80, backgroundColor: Colors.red,
    justifyContent: "center", alignItems: "center",
    borderTopRightRadius: 14, borderBottomRightRadius: 14,
  },
  deleteBtn: { alignItems: "center", justifyContent: "center", flex: 1, width: "100%" },
});

function FrequencyBadge({ freq, language }: { freq?: string; language: string }) {
  const labels: Record<string, Record<string, string>> = {
    tr: { daily: "Günlük", weekly: "Haftalık", monthly: "Aylık" },
    en: { daily: "Daily", weekly: "Weekly", monthly: "Monthly" },
  };
  const label = labels[language]?.[freq || "monthly"] || freq || "Monthly";
  return (
    <View style={badgeStyles.badge}>
      <Ionicons name="repeat-outline" size={10} color={Colors.tint} />
      <Text style={badgeStyles.text}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: Colors.tint + "18", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  text: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.tint },
});

export default function RecurringScreen() {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { incomes, expenses, deleteIncome, deleteExpense } = useBudget();
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const recurringIncomes = useMemo(
    () => incomes.filter((i) => i.isRecurring),
    [incomes]
  );

  const recurringExpenses = useMemo(
    () => expenses.filter((e) => e.isRecurring),
    [expenses]
  );

  const items = useMemo(() => {
    const allItems: RecurringItem[] = [];
    if (filter !== "expense") {
      recurringIncomes.forEach((i) =>
        allItems.push({ ...i, type: "income", category: i.category })
      );
    }
    if (filter !== "income") {
      recurringExpenses.forEach((e) =>
        allItems.push({ ...e, type: "expense", category: e.category })
      );
    }
    return allItems.sort((a, b) => (a.recurringDay || 1) - (b.recurringDay || 1));
  }, [recurringIncomes, recurringExpenses, filter]);

  const totalRecurringIncome = useMemo(
    () => recurringIncomes.reduce((s, i) => s + i.amount, 0),
    [recurringIncomes]
  );
  const totalRecurringExpense = useMemo(
    () => recurringExpenses.reduce((s, e) => s + e.amount, 0),
    [recurringExpenses]
  );

  const handleDelete = (item: RecurringItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      t("recurringDeleteTitle"),
      t("recurringDeleteMsg"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("deleteBtn"),
          style: "destructive",
          onPress: () => {
            if (item.type === "income") deleteIncome(item.id);
            else deleteExpense(item.id);
          },
        },
      ]
    );
  };

  const handleEdit = (item: RecurringItem) => {
    Haptics.selectionAsync();
    if (item.type === "income") {
      router.push({ pathname: "/add-income", params: { editId: item.id } });
    } else {
      router.push({ pathname: "/add-expense", params: { editId: item.id } });
    }
  };

  const handleLongPress = (item: RecurringItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      item.title || item.category,
      language === "tr" ? "Ne yapmak istiyorsunuz?" : "What would you like to do?",
      [
        { text: t("edit"), onPress: () => handleEdit(item) },
        { text: t("deleteBtn"), style: "destructive", onPress: () => handleDelete(item) },
        { text: t("cancel"), style: "cancel" },
      ]
    );
  };

  const FILTERS: { key: "all" | "income" | "expense"; label: string }[] = [
    { key: "all", label: t("all") },
    { key: "income", label: t("incomeFilter") },
    { key: "expense", label: t("expenseFilter") },
  ];

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>{t("recurringTitle")}</Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              Alert.alert(
                language === "tr" ? "Yeni Düzenli İşlem" : "New Recurring Item",
                language === "tr" ? "Ne eklemek istiyorsunuz?" : "What would you like to add?",
                [
                  { text: language === "tr" ? "Gelir" : "Income", onPress: () => router.push({ pathname: "/add-income", params: { recurring: "1" } }) },
                  { text: language === "tr" ? "Gider" : "Expense", onPress: () => router.push({ pathname: "/add-expense", params: { recurring: "1" } }) },
                  { text: t("cancel"), style: "cancel" },
                ]
              );
            }}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color={Colors.tint} />
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: Colors.green + "30" }]}>
          <Ionicons name="trending-up" size={16} color={Colors.green} />
          <Text style={styles.summaryLabel}>{t("recurringIncomes")}</Text>
          <Text style={[styles.summaryValue, { color: Colors.green }]}>
            {formatAmount(totalRecurringIncome)}
          </Text>
          <Text style={styles.summaryCount}>{recurringIncomes.length}</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: Colors.red + "30" }]}>
          <Ionicons name="trending-down" size={16} color={Colors.red} />
          <Text style={styles.summaryLabel}>{t("recurringExpenses")}</Text>
          <Text style={[styles.summaryValue, { color: Colors.red }]}>
            {formatAmount(totalRecurringExpense)}
          </Text>
          <Text style={styles.summaryCount}>{recurringExpenses.length}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterActive]}
            onPress={() => { Haptics.selectionAsync(); setFilter(f.key); }}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === "web" ? 100 : 80,
        }}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={40} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>{t("noRecurringItems")}</Text>
            <Text style={styles.emptySub}>{t("noRecurringItemsSub")}</Text>
          </View>
        ) : (
          items.map((item) => (
            <SwipeableRow key={`${item.type}_${item.id}`} onDelete={() => handleDelete(item)}>
              <Pressable
                style={styles.itemCard}
                onPress={() => handleEdit(item)}
                onLongPress={() => handleLongPress(item)}
              >
                <View style={styles.itemLeft}>
                  <View
                    style={[
                      styles.itemIcon,
                      { backgroundColor: item.type === "income" ? Colors.green + "18" : Colors.red + "18" },
                    ]}
                  >
                    <Ionicons
                      name={item.type === "income" ? "arrow-up" : "arrow-down"}
                      size={16}
                      color={item.type === "income" ? Colors.green : Colors.red}
                    />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title || item.category}
                    </Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                      <FrequencyBadge freq={item.recurringFrequency} language={language} />
                      {item.recurringDay !== undefined && item.recurringFrequency === "monthly" && (
                        <Text style={styles.itemDay}>
                          {t("dayOfMonthFmt", { day: item.recurringDay })}
                        </Text>
                      )}
                      {item.recurringEndDate && (
                        <View style={styles.endDateBadge}>
                          <Ionicons name="calendar-clear-outline" size={9} color={Colors.orange} />
                          <Text style={styles.endDateBadgeText}>
                            {new Date(item.recurringEndDate).toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text
                    style={[
                      styles.itemAmount,
                      { color: item.type === "income" ? Colors.green : Colors.red },
                    ]}
                  >
                    {item.type === "income" ? "+" : "-"}{formatAmount(item.amount, getCurrencySymbol(item.currency || "TRY"))}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
                </View>
              </Pressable>
            </SwipeableRow>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.card, alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.tint + "18", alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 14,
    padding: 12, borderWidth: 1, alignItems: "center", gap: 4,
  },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  summaryValue: { fontFamily: "Inter_700Bold", fontSize: 15 },
  summaryCount: {
    fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary,
    backgroundColor: Colors.card2, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1,
  },
  filterRow: {
    flexDirection: "row", gap: 6, paddingHorizontal: 16, marginBottom: 12,
  },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  filterActive: { backgroundColor: Colors.tint + "18", borderColor: Colors.tint + "50" },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  filterTextActive: { color: Colors.tint },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textTertiary, textAlign: "center" },
  itemCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.card, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  itemIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  itemInfo: { flex: 1, gap: 3 },
  itemTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  itemMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  itemCategory: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  itemDay: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary },
  endDateBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: Colors.orange + "15", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  endDateBadgeText: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.orange },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  itemAmount: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
