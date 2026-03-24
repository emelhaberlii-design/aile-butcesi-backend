import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
  TextInput,
  ScrollView,
  Animated,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useBudget, Income, Expense, EXPENSE_CATEGORIES, INCOME_CATEGORIES, MemberOwner, getMemberColor } from "@/context/BudgetContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useBusinessBudget } from "@/context/BusinessContext";
import { localizeCategory } from "@/lib/categories";
import { getCurrencySymbol } from "@/lib/currency";

type Filter = "all" | "income" | "expense";
type TxItem = (Income & { type: "income" }) | (Expense & { type: "expense" });

function formatAmount(amount: number, currencySymbol: string = "₺"): string {
  return new Intl.NumberFormat("tr-TR").format(Math.round(amount)) + " " + currencySymbol;
}

function formatDate(dateStr: string, language: string): string {
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -100));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < deleteThreshold) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  const handleDeletePress = () => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    onDelete();
  };

  return (
    <View style={swipeStyles.container}>
      <View style={swipeStyles.deleteContainer}>
        <Pressable style={swipeStyles.deleteBtn} onPress={handleDeletePress}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={swipeStyles.deleteText}>Sil</Text>
        </Pressable>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 14,
  },
  deleteContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.red,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  deleteBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: 80,
    height: "100%" as any,
  },
  deleteText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
});

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { user, familyMembers } = useAuth();
  const isEN = language === "en";
  const {
    incomes,
    expenses,
    deleteIncome,
    deleteExpense,
    selectedMonth,
    monthlyIncome,
    monthlyExpenses,
    creditCards,
  } = useBudget();
  const biz = useBusinessBudget();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const allExpenseCategories = useMemo(() => Object.keys(EXPENSE_CATEGORIES), []);
  const allIncomeCategories = useMemo(() => INCOME_CATEGORIES, []);

  const visibleCategories = useMemo(() => {
    if (filter === "income") return allIncomeCategories;
    if (filter === "expense") return allExpenseCategories;
    return [...allExpenseCategories, ...allIncomeCategories.filter(c => !allExpenseCategories.includes(c))];
  }, [filter, allExpenseCategories, allIncomeCategories]);

  const allTransactions: TxItem[] = useMemo(() => {
    const q = search.trim().toLowerCase();

    const monthIncomes = incomes
      .filter((i) => i.date.substring(0, 7) === selectedMonth)
      .map((i) => ({ ...i, type: "income" as const }));
    const monthExpenses = expenses
      .filter((e) => e.date.substring(0, 7) === selectedMonth)
      .map((e) => ({ ...e, type: "expense" as const }));

    let all: TxItem[] = [...monthIncomes, ...monthExpenses];

    if (biz.combinedWithBudget) {
      const bizExpenses = biz.businessExpenses
        .filter((e) => e.date.substring(0, 7) === selectedMonth)
        .map((e) => ({
          id: `biz_exp_${e.id}`,
          title: e.title,
          amount: e.amount,
          category: e.category,
          subcategory: isEN ? "Business" : "İş Yeri",
          date: e.date,
          paymentMethod: e.paymentMethod as any,
          type: "expense" as const,
          isBusiness: true,
          memberOwner: "self" as MemberOwner,
          memberOwnerName: isEN ? "Business" : "İş Yeri",
        })) as any[];
      const bizIncomes = biz.businessIncomes
        .filter((i) => i.date.substring(0, 7) === selectedMonth)
        .map((i) => ({
          id: `biz_inc_${i.id}`,
          title: i.title,
          amount: i.amount,
          category: i.category,
          date: i.date,
          type: "income" as const,
          isBusiness: true,
        })) as any[];
      all = [...all, ...bizExpenses, ...bizIncomes];
    }

    if (filter === "income") all = all.filter((tx) => tx.type === "income");
    if (filter === "expense") all = all.filter((tx) => tx.type === "expense");

    if (categoryFilter) {
      all = all.filter((tx) => tx.category === categoryFilter);
    }

    if (q) {
      all = all.filter((tx) => {
        const inTitle = tx.title.toLowerCase().includes(q);
        const inCategory = tx.category.toLowerCase().includes(q);
        const inSubcategory = tx.type === "expense" && (tx as Expense).subcategory?.toLowerCase().includes(q);
        const inBrand = tx.type === "expense" && (tx as Expense).brand?.toLowerCase().includes(q);
        const locCat = localizeCategory(tx.category, language).toLowerCase().includes(q);
        const inBiz = isEN ? "business".includes(q) : "iş yeri".includes(q);
        return inTitle || inCategory || inSubcategory || inBrand || locCat || ((tx as any).isBusiness && inBiz);
      });
    }

    return all.sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });
  }, [incomes, expenses, selectedMonth, filter, categoryFilter, search, language, biz.combinedWithBudget, biz.businessExpenses, biz.businessIncomes, isEN]);

  function handleDelete(tx: TxItem) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      t("deleteTransaction"),
      t("deleteConfirm"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            if (tx.type === "income") deleteIncome(tx.id);
            else deleteExpense(tx.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  function getPaymentMethodInfo(tx: Expense): string {
    if (tx.paymentMethod === "credit" && tx.creditCardId) {
      const card = creditCards.find((c) => c.id === tx.creditCardId);
      return card ? `${card.bank} - ${card.name}` : t("creditCardLabel");
    }
    if (tx.paymentMethod === "debit") return t("debitCardLabel");
    return t("cashLabel");
  }

  function getMemberBadgeInfo(tx: TxItem): { label: string; color: string } | null {
    const owner = tx.memberOwner;
    if (!owner || owner === "shared") return null;

    if (tx.memberOwnerName) {
      const memberIdx = familyMembers.findIndex((m) => m.id === owner);
      const color = memberIdx >= 0 ? getMemberColor(memberIdx) : (owner === user?.id ? Colors.blue : Colors.purple);
      return { label: tx.memberOwnerName, color };
    }

    if (owner === "self") {
      return {
        label: user?.name?.split(" ")[0] || (isEN ? "Me" : "Ben"),
        color: Colors.blue,
      };
    }
    if (owner === "spouse" || owner.startsWith("custom_")) {
      return {
        label: owner.startsWith("custom_") ? owner.replace("custom_", "") : (isEN ? "Member" : "Üye"),
        color: Colors.purple,
      };
    }

    const member = familyMembers.find((m) => m.id === owner);
    if (member) {
      const memberIdx = familyMembers.findIndex((m) => m.id === owner);
      return {
        label: member.name.split(" ")[0],
        color: getMemberColor(memberIdx),
      };
    }

    return null;
  }

  const renderItem = useCallback(({ item: tx }: { item: TxItem }) => {
    const isIncome = tx.type === "income";
    const isBiz = (tx as any).isBusiness === true;
    const color = isBiz ? Colors.purple : (isIncome ? Colors.green : Colors.red);
    const badge = isBiz
      ? { label: isEN ? "Business" : "İş Yeri", color: Colors.purple }
      : getMemberBadgeInfo(tx);

    const content = (
      <Pressable
        style={({ pressed }) => [styles.txRow, { opacity: pressed ? 0.7 : 1 }]}
        onLongPress={() => { if (!isBiz) handleDelete(tx); }}
        onPress={() => { if (!isBiz) router.push({ pathname: "/transaction-detail", params: { id: tx.id, type: tx.type } }); }}
      >
        <View style={[styles.txIcon, { backgroundColor: color + "20" }]}>
          <Ionicons name={isBiz ? "briefcase" : (isIncome ? "arrow-down" : "arrow-up")} size={16} color={color} />
        </View>
        <View style={styles.txContent}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Text style={[styles.txTitle, { flex: 1 }]} numberOfLines={1}>{tx.title}</Text>
            {badge && (
              <View style={[styles.memberBadge, { backgroundColor: badge.color + "20" }]}>
                <Text style={[styles.memberBadgeText, { color: badge.color }]}>
                  {badge.label}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.txMeta} numberOfLines={1}>
            {isBiz
              ? `${tx.category} · ${isEN ? "Business" : "İş Yeri"} · ${formatDate(tx.date, language)}`
              : isIncome
                ? `${localizeCategory(tx.category, language)} · ${formatDate(tx.date, language)}`
                : `${localizeCategory(tx.category, language)} › ${(tx as Expense).subcategory}${(tx as Expense).brand ? ` · ${(tx as Expense).brand}` : ""} · ${formatDate(tx.date, language)}`}
          </Text>
          {!isIncome && !isBiz && (
            <Text style={styles.txPayment} numberOfLines={1}>
              {getPaymentMethodInfo(tx as Expense)}
              {(tx as Expense).isInstallment && (tx as Expense).installmentCount! > 1
                ? ` · ${(tx as Expense).installmentCurrent}/${(tx as Expense).installmentCount} ${t("installmentsLabel")}`
                : ""}
            </Text>
          )}
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color }]}>
            {isIncome ? "+" : "-"}{formatAmount(tx.amount, getCurrencySymbol(tx.currency || "TRY"))}
          </Text>
          {!isIncome && !isBiz && (tx as Expense).isInstallment && (tx as Expense).installmentCount! > 1 && (
            <Text style={styles.txInstallment}>
              {formatAmount(tx.amount, getCurrencySymbol(tx.currency || "TRY"))} × {(tx as Expense).installmentCount}
            </Text>
          )}
        </View>
      </Pressable>
    );

    if (isBiz) return content;

    return (
      <SwipeableRow onDelete={() => handleDelete(tx)}>
        {content}
      </SwipeableRow>
    );
  }, [familyMembers, user, language, creditCards, isEN]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: t("filterAll") },
    { key: "income", label: t("filterIncome") },
    { key: "expense", label: t("filterExpense") },
  ];

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t("transactionsTitle")}</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: Colors.green + "20" }]}
              onPress={() => { Haptics.selectionAsync(); router.push("/add-income"); }}
            >
              <Ionicons name="add" size={18} color={Colors.green} />
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: Colors.red + "20" }]}
              onPress={() => { Haptics.selectionAsync(); router.push("/add-expense"); }}
            >
              <Ionicons name="remove" size={18} color={Colors.red} />
            </Pressable>
          </View>
        </View>

        <View style={styles.summaryPills}>
          <View style={[styles.pill, { backgroundColor: Colors.green + "20" }]}>
            <Ionicons name="arrow-down" size={12} color={Colors.green} />
            <Text style={[styles.pillText, { color: Colors.green }]}>{formatAmount(monthlyIncome)}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: Colors.red + "20" }]}>
            <Ionicons name="arrow-up" size={12} color={Colors.red} />
            <Text style={[styles.pillText, { color: Colors.red }]}>{formatAmount(monthlyExpenses)}</Text>
          </View>
          <View style={[styles.pill, {
            backgroundColor: (monthlyIncome - monthlyExpenses) >= 0 ? Colors.tint + "20" : Colors.red + "20"
          }]}>
            <Text style={[styles.pillText, {
              color: (monthlyIncome - monthlyExpenses) >= 0 ? Colors.tint : Colors.red
            }]}>
              {(monthlyIncome - monthlyExpenses) >= 0 ? "+" : ""}{formatAmount(monthlyIncome - monthlyExpenses)}
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={Colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={language === "tr" ? "Ara... (başlık, kategori)" : "Search... (title, category)"}
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && Platform.OS !== "ios" && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {/* Type filters */}
        <View style={styles.filters}>
          {FILTERS.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[styles.filterBtn, filter === key && styles.filterBtnActive]}
              onPress={() => {
                setFilter(key);
                setCategoryFilter(null);
                Haptics.selectionAsync();
              }}
            >
              <Text style={[styles.filterLabel, filter === key && styles.filterLabelActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
        >
          <Pressable
            style={[styles.catChip, !categoryFilter && styles.catChipActive]}
            onPress={() => { setCategoryFilter(null); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.catChipText, !categoryFilter && styles.catChipTextActive]}>
              {language === "tr" ? "Tümü" : "All"}
            </Text>
          </Pressable>
          {visibleCategories.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.catChip, categoryFilter === cat && styles.catChipActive]}
              onPress={() => {
                setCategoryFilter(categoryFilter === cat ? null : cat);
                Haptics.selectionAsync();
              }}
            >
              <Text style={[styles.catChipText, categoryFilter === cat && styles.catChipTextActive]}>
                {localizeCategory(cat, language)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={allTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === "web" ? 120 : 100,
          paddingTop: 8,
          gap: 8,
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!allTransactions.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>
              {search || categoryFilter
                ? (language === "tr" ? "Sonuç bulunamadı" : "No results found")
                : t("noTransactions")}
            </Text>
            <Text style={styles.emptySubText}>
              {search || categoryFilter
                ? (language === "tr" ? "Farklı arama terimleri deneyin" : "Try different search terms")
                : t("noTransactionsSub")}
            </Text>
            {!search && !categoryFilter && (
              <View style={styles.emptyActions}>
                <Pressable
                  style={[styles.emptyBtn, { backgroundColor: Colors.green + "20", borderColor: Colors.green + "40" }]}
                  onPress={() => router.push("/add-income")}
                >
                  <Ionicons name="add" size={16} color={Colors.green} />
                  <Text style={[styles.emptyBtnText, { color: Colors.green }]}>{t("addIncomeBtn")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.emptyBtn, { backgroundColor: Colors.red + "20", borderColor: Colors.red + "40" }]}
                  onPress={() => router.push("/add-expense")}
                >
                  <Ionicons name="remove" size={16} color={Colors.red} />
                  <Text style={[styles.emptyBtnText, { color: Colors.red }]}>{t("addExpenseBtn")}</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
      />

      {allTransactions.length > 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            {allTransactions.length} {language === "tr" ? "işlem · Sola kaydır veya basılı tut → Sil" : "transactions · Swipe left or long press to delete"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 4 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.text },
  headerActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  summaryPills: { flexDirection: "row", gap: 8, marginBottom: 12 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  searchRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.card,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, gap: 8,
  },
  searchIcon: { marginRight: 0 },
  searchInput: {
    flex: 1, fontFamily: "Inter_400Regular", fontSize: 14,
    color: Colors.text, padding: 0,
  },
  filters: { flexDirection: "row", gap: 8, marginBottom: 8 },
  filterBtn: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.tint + "20", borderColor: Colors.tint + "60" },
  filterLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  filterLabelActive: { color: Colors.tint },
  categoryChips: { paddingBottom: 10, gap: 6, paddingRight: 8 },
  catChip: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.tint + "25", borderColor: Colors.tint + "70" },
  catChipText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  catChipTextActive: { color: Colors.tint, fontFamily: "Inter_600SemiBold" },
  txRow: {
    backgroundColor: Colors.card, borderRadius: 14, flexDirection: "row",
    alignItems: "center", padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border,
  },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txContent: { flex: 1 },
  txTitle: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  memberBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  memberBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  txMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginBottom: 1 },
  txPayment: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontFamily: "Inter_700Bold", fontSize: 15 },
  txInstallment: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary, marginTop: 8 },
  emptySubText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textTertiary, textAlign: "center" },
  emptyActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1,
  },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  hint: { paddingVertical: 8, alignItems: "center" },
  hintText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary },
});
