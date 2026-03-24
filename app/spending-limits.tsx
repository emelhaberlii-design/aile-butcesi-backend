import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Platform,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";
import { useBudget, EXPENSE_CATEGORIES } from "@/context/BudgetContext";
import { useBusinessBudget } from "@/context/BusinessContext";
import {
  useSpendingLimits,
  SpendingLimit,
  getLimitAmount,
  getLimitUsage,
  statusColor,
  getCurrentYearMonth,
} from "@/context/SpendingLimitsContext";

function fmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + " ₺";
}

const ALL_CATS = Object.keys(EXPENSE_CATEGORIES);

const CAT_ICON: Record<string, string> = {
  "Ev": "home-outline",
  "Faturalar": "flash-outline",
  "Market": "basket-outline",
  "Yemek Siparişi": "fast-food-outline",
  "Araç Giderleri": "car-outline",
  "Toplu Taşıma": "bus-outline",
  "Sağlık": "medkit-outline",
  "Eğlence": "musical-notes-outline",
  "Çocuk/Bebek": "happy-outline",
  "Online Alışveriş": "laptop-outline",
  "Giyim": "shirt-outline",
  "Eğitim": "book-outline",
  "Kredi Ödemesi": "card-outline",
  "Diğer": "ellipsis-horizontal-outline",
};

function catIcon(c: string): string {
  return CAT_ICON[c] ?? "ellipsis-horizontal-outline";
}

function statusLabel(pct: number, isEN: boolean): string {
  if (pct >= 1) return isEN ? "Limit exceeded!" : "Limit aşıldı!";
  if (pct >= 0.8) return isEN ? "Almost at limit" : "Limite çok yakın";
  if (pct >= 0.5) return isEN ? "Halfway" : "Yarı doldu";
  return isEN ? "On track" : "İyi gidiyor";
}

interface Suggestion {
  key: string;
  category: string;
  prevSpent: number;
  prevPct: number;
  suggestedPct: number;
  labelTR: string;
  labelEN: string;
}

function generateSuggestions(
  prevSpending: Record<string, number>,
  currentIncome: number,
  existingLimitCategories: string[],
  dismissedKeys: string[],
  month: string
): Suggestion[] {
  if (currentIncome <= 0) return [];
  const results: Suggestion[] = [];

  for (const [cat, spent] of Object.entries(prevSpending)) {
    if (!ALL_CATS.includes(cat)) continue;
    const pct = (spent / currentIncome) * 100;
    const key = `sugg_${month}_${cat}`;
    if (dismissedKeys.includes(key)) continue;
    if (existingLimitCategories.includes(cat)) continue;

    if (pct >= 15) {
      const suggested = Math.max(5, Math.round(pct * 0.85));
      results.push({
        key,
        category: cat,
        prevSpent: spent,
        prevPct: Math.round(pct),
        suggestedPct: suggested,
        labelTR: `Geçen ay "${cat}" için gelirinizin %${Math.round(pct)}'ini harcadınız (${fmt(spent)}). Bu ay %${suggested} ile sınırlandırmaya ne dersiniz?`,
        labelEN: `Last month you spent ${Math.round(pct)}% of income on "${cat}" (${fmt(spent)}). Want to cap it at ${suggested}% this month?`,
      });
    }
  }

  return results.slice(0, 3);
}

export default function SpendingLimitsScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isEN = language === "en";
  const {
    monthlyIncome,
    spendingByCategory,
    previousMonthSpending,
    selectedMonth,
  } = useBudget();
  const { combinedWithBudget, monthlyBusinessIncomes } = useBusinessBudget();
  const limitIncomeBase = combinedWithBudget ? monthlyIncome + monthlyBusinessIncomes : monthlyIncome;
  const {
    limits,
    addLimit,
    updateLimit,
    deleteLimit,
    toggleLimit,
    dismissedSuggestions,
    dismissSuggestion,
    acceptSuggestion,
  } = useSpendingLimits();

  const [showForm, setShowForm] = useState(false);
  const [editingLimit, setEditingLimit] = useState<SpendingLimit | null>(null);

  const [formCategory, setFormCategory] = useState<string>("all");
  const [formLimitType, setFormLimitType] = useState<"amount" | "percentage">("percentage");
  const [formValue, setFormValue] = useState("");
  const [formRecurring, setFormRecurring] = useState(true);

  const currentMonth = getCurrentYearMonth();
  const isCurrentMonth = selectedMonth === currentMonth;

  const activeLimits = useMemo(
    () =>
      limits.filter((l) => {
        if (!l.enabled) return false;
        if (l.isRecurring) return true;
        return l.specificMonth === selectedMonth;
      }),
    [limits, selectedMonth]
  );

  const inactiveLimits = useMemo(
    () => limits.filter((l) => !activeLimits.includes(l)),
    [limits, activeLimits]
  );

  const limitCategories = useMemo(() => limits.map((l) => l.category), [limits]);

  const suggestions = useMemo(
    () =>
      generateSuggestions(
        previousMonthSpending,
        limitIncomeBase,
        limitCategories,
        dismissedSuggestions,
        currentMonth
      ),
    [previousMonthSpending, limitIncomeBase, limitCategories, dismissedSuggestions, currentMonth]
  );

  function getSpent(category: string): number {
    if (category === "all") {
      return Object.values(spendingByCategory).reduce((s, v) => s + v, 0);
    }
    return spendingByCategory[category] ?? 0;
  }

  function openAdd() {
    setEditingLimit(null);
    setFormCategory("all");
    setFormLimitType("percentage");
    setFormValue("");
    setFormRecurring(true);
    setShowForm(true);
  }

  function openEdit(l: SpendingLimit) {
    setEditingLimit(l);
    setFormCategory(l.category);
    setFormLimitType(l.limitType);
    setFormValue(String(l.limitValue));
    setFormRecurring(l.isRecurring);
    setShowForm(true);
  }

  async function handleSave() {
    const val = parseFloat(formValue);
    if (!formValue || isNaN(val) || val <= 0) {
      Alert.alert(isEN ? "Invalid value" : "Geçersiz değer");
      return;
    }
    if (formLimitType === "percentage" && val > 100) {
      Alert.alert(isEN ? "Max 100%" : "Maksimum %100");
      return;
    }
    const payload: Omit<SpendingLimit, "id" | "notifiedAt50" | "notifiedAt80" | "notifiedAt100" | "lastNotifMonth"> = {
      category: formCategory,
      limitType: formLimitType,
      limitValue: val,
      enabled: true,
      isRecurring: formRecurring,
      specificMonth: formRecurring ? undefined : currentMonth,
    };
    if (editingLimit) {
      await updateLimit({ ...editingLimit, ...payload });
    } else {
      await addLimit(payload);
    }
    setShowForm(false);
  }

  async function handleDelete(l: SpendingLimit) {
    Alert.alert(
      isEN ? "Delete limit?" : "Limit silinsin mi?",
      catLabel(l.category, isEN) + " — " + (l.limitType === "percentage" ? `%${l.limitValue}` : fmt(l.limitValue)),
      [
        { text: isEN ? "Cancel" : "İptal", style: "cancel" },
        { text: isEN ? "Delete" : "Sil", style: "destructive", onPress: () => deleteLimit(l.id) },
      ]
    );
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEN ? "Spending Limits" : "Harcama Limitleri"}</Text>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color={Colors.tint} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 40 }}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.blue} />
          <Text style={styles.infoText}>
            {isEN
              ? "Limits are visual warnings only — spending is never blocked. You'll get alerts at 50%, 80%, and 100%."
              : "Limitler yalnızca görsel uyarıdır — hiçbir zaman harcamanızı engelleyemeyiz. %50, %80 ve %100'de bildirim alırsınız."}
          </Text>
        </View>

        {/* Smart Suggestions */}
        {suggestions.length > 0 && isCurrentMonth && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>{isEN ? "Smart Suggestions" : "Akıllı Öneriler"}</Text>
            {suggestions.map((s) => (
              <View key={s.key} style={styles.suggestionCard}>
                <View style={styles.suggestionIconRow}>
                  <Ionicons name={catIcon(s.category) as any} size={16} color={Colors.orange} />
                  <Text style={styles.suggestionCat}>{s.category}</Text>
                  <View style={styles.suggestionBadge}>
                    <Text style={styles.suggestionBadgeText}>%{s.prevPct}</Text>
                  </View>
                </View>
                <Text style={styles.suggestionText}>{isEN ? s.labelEN : s.labelTR}</Text>
                <View style={styles.suggestionBtns}>
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() =>
                      acceptSuggestion(s.key, {
                        category: s.category,
                        limitType: "percentage",
                        limitValue: s.suggestedPct,
                        enabled: true,
                        isRecurring: true,
                      })
                    }
                  >
                    <Ionicons name="checkmark" size={14} color="#000" />
                    <Text style={styles.acceptBtnText}>
                      {isEN ? `Apply (${s.suggestedPct}%)` : `Uygula (%${s.suggestedPct})`}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.dismissBtn} onPress={() => dismissSuggestion(s.key)}>
                    <Text style={styles.dismissBtnText}>{isEN ? "Dismiss" : "Reddet"}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Active Limits */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>
            {isEN ? "Active Limits" : "Aktif Limitler"}
            {activeLimits.length > 0 && (
              <Text style={styles.sectionCount}> ({activeLimits.length})</Text>
            )}
          </Text>
          {activeLimits.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="shield-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>{isEN ? "No active limits" : "Aktif limit yok"}</Text>
              <Text style={styles.emptySubtitle}>
                {isEN
                  ? "Set spending limits per category to stay on budget"
                  : "Bütçenizi aşmamak için kategori bazlı limit belirleyin"}
              </Text>
              <Pressable style={styles.emptyAddBtn} onPress={openAdd}>
                <Ionicons name="add-circle" size={18} color={Colors.tint} />
                <Text style={styles.emptyAddText}>{isEN ? "Add your first limit" : "İlk limitini ekle"}</Text>
              </Pressable>
            </View>
          )}
          {activeLimits.map((l) => {
            const spent = getSpent(l.category);
            const limitAmt = getLimitAmount(l, limitIncomeBase);
            const usage = getLimitUsage(spent, limitAmt);
            const color = statusColor(usage.status);
            const pctDisplay = Math.round(usage.percent * 100);
            const catName = catLabel(l.category, isEN);
            return (
              <Pressable key={l.id} style={styles.limitCard} onPress={() => openEdit(l)} onLongPress={() => handleDelete(l)}>
                <View style={styles.limitCardTop}>
                  <View style={styles.limitCardLeft}>
                    <View style={[styles.limitIcon, { backgroundColor: color + "20" }]}>
                      <Ionicons name={l.category === "all" ? "wallet-outline" : catIcon(l.category) as any} size={18} color={color} />
                    </View>
                    <View>
                      <Text style={styles.limitCatName}>{catName}</Text>
                      <Text style={styles.limitSubtitle}>
                        {l.limitType === "percentage"
                          ? `${isEN ? "Max" : "Maks"} %${l.limitValue} · ${fmt(limitAmt)}`
                          : `${isEN ? "Max" : "Maks"} ${fmt(limitAmt)}`}
                        {" · "}
                        {l.isRecurring
                          ? (isEN ? "Every month" : "Her ay")
                          : (isEN ? "This month" : "Bu ay")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.limitCardRight}>
                    <Text style={[styles.limitPct, { color }]}>{pctDisplay}%</Text>
                    <Text style={[styles.limitStatusLabel, { color }]}>{statusLabel(usage.percent, isEN)}</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, pctDisplay)}%` as any,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>

                <View style={styles.limitAmounts}>
                  <Text style={styles.limitSpent}>
                    {isEN ? "Spent: " : "Harcandı: "}<Text style={{ color }}>{fmt(spent)}</Text>
                  </Text>
                  <Text style={styles.limitRemaining}>
                    {usage.status === "over"
                      ? <Text style={{ color: Colors.red }}>+{fmt(spent - limitAmt)} {isEN ? "over" : "fazla"}</Text>
                      : <Text style={{ color: Colors.textSecondary }}>{fmt(limitAmt - spent)} {isEN ? "left" : "kaldı"}</Text>}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Inactive / Disabled */}
        {inactiveLimits.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>{isEN ? "Paused" : "Duraklatıldı"}</Text>
            {inactiveLimits.map((l) => (
              <View key={l.id} style={[styles.limitCard, { opacity: 0.5 }]}>
                <View style={styles.limitCardTop}>
                  <View style={styles.limitCardLeft}>
                    <View style={[styles.limitIcon, { backgroundColor: Colors.border }]}>
                      <Ionicons name={l.category === "all" ? "wallet-outline" : catIcon(l.category) as any} size={18} color={Colors.textTertiary} />
                    </View>
                    <View>
                      <Text style={styles.limitCatName}>{catLabel(l.category, isEN)}</Text>
                      <Text style={styles.limitSubtitle}>
                        {l.limitType === "percentage" ? `%${l.limitValue}` : fmt(l.limitValue)}
                      </Text>
                    </View>
                  </View>
                  <Pressable style={styles.enableBtn} onPress={() => toggleLimit(l.id)}>
                    <Text style={styles.enableBtnText}>{isEN ? "Enable" : "Aç"}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { paddingTop: Platform.OS === "web" ? 32 : 16, paddingBottom: bottomPadding + 24 }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingLimit
                ? (isEN ? "Edit Limit" : "Limiti Düzenle")
                : (isEN ? "New Spending Limit" : "Yeni Harcama Limiti")}
            </Text>
            <Pressable onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>{isEN ? "Category" : "Kategori"}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <Pressable
                style={[styles.catChip, formCategory === "all" && styles.catChipActive]}
                onPress={() => setFormCategory("all")}
              >
                <Ionicons name="wallet-outline" size={14} color={formCategory === "all" ? Colors.tint : Colors.textSecondary} />
                <Text style={[styles.catChipText, formCategory === "all" && styles.catChipTextActive]}>
                  {isEN ? "All Spending" : "Tüm Harcamalar"}
                </Text>
              </Pressable>
              {ALL_CATS.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.catChip, formCategory === cat && styles.catChipActive]}
                  onPress={() => setFormCategory(cat)}
                >
                  <Ionicons name={catIcon(cat) as any} size={14} color={formCategory === cat ? Colors.tint : Colors.textSecondary} />
                  <Text style={[styles.catChipText, formCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{isEN ? "Limit Type" : "Limit Türü"}</Text>
            <View style={styles.typeRow}>
              <Pressable
                style={[styles.typeBtn, formLimitType === "percentage" && styles.typeBtnActive]}
                onPress={() => setFormLimitType("percentage")}
              >
                <Ionicons name="pie-chart-outline" size={16} color={formLimitType === "percentage" ? Colors.tint : Colors.textSecondary} />
                <Text style={[styles.typeBtnText, formLimitType === "percentage" && styles.typeBtnTextActive]}>
                  {isEN ? "% of Income" : "Gelirin %'si"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.typeBtn, formLimitType === "amount" && styles.typeBtnActive]}
                onPress={() => setFormLimitType("amount")}
              >
                <Ionicons name="cash-outline" size={16} color={formLimitType === "amount" ? Colors.tint : Colors.textSecondary} />
                <Text style={[styles.typeBtnText, formLimitType === "amount" && styles.typeBtnTextActive]}>
                  {isEN ? "Fixed Amount (₺)" : "Sabit Tutar (₺)"}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
              {formLimitType === "percentage"
                ? (isEN ? "Percentage (0-100)" : "Yüzde (0-100)")
                : (isEN ? "Amount (₺)" : "Tutar (₺)")}
            </Text>
            <View style={styles.inputRow}>
              {formLimitType === "amount" && <Text style={styles.inputPrefix}>₺</Text>}
              <TextInput
                style={[styles.input, formLimitType === "percentage" && { flex: 1 }]}
                placeholder={formLimitType === "percentage" ? "10" : "5000"}
                placeholderTextColor={Colors.textTertiary}
                value={formValue}
                onChangeText={setFormValue}
                keyboardType="decimal-pad"
              />
              {formLimitType === "percentage" && <Text style={styles.inputSuffix}>%</Text>}
            </View>

            {formLimitType === "percentage" && limitIncomeBase > 0 && formValue && !isNaN(parseFloat(formValue)) && (
              <Text style={styles.previewText}>
                = {fmt(Math.round((parseFloat(formValue) / 100) * limitIncomeBase))} / {isEN ? "month" : "ay"}
              </Text>
            )}

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>{isEN ? "Apply every month" : "Her ay uygula"}</Text>
                <Text style={styles.toggleSub}>
                  {formRecurring
                    ? (isEN ? "Recurring — applies to all future months" : "Tekrarlayan — gelecek tüm aylara uygulanır")
                    : (isEN ? "One-time — this month only" : "Tek seferlik — sadece bu ay için")}
                </Text>
              </View>
              <Switch
                value={formRecurring}
                onValueChange={setFormRecurring}
                trackColor={{ false: Colors.border, true: Colors.tint + "60" }}
                thumbColor={formRecurring ? Colors.tint : Colors.textTertiary}
              />
            </View>

            {editingLimit && (
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>{isEN ? "Enabled" : "Aktif"}</Text>
                </View>
                <Switch
                  value={editingLimit.enabled}
                  onValueChange={() => updateLimit({ ...editingLimit, enabled: !editingLimit.enabled })}
                  trackColor={{ false: Colors.border, true: Colors.tint + "60" }}
                  thumbColor={editingLimit.enabled ? Colors.tint : Colors.textTertiary}
                />
              </View>
            )}

            {editingLimit && (
              <Pressable style={styles.deleteBtn} onPress={() => { setShowForm(false); handleDelete(editingLimit); }}>
                <Ionicons name="trash-outline" size={16} color={Colors.red} />
                <Text style={styles.deleteBtnText}>{isEN ? "Delete Limit" : "Limiti Sil"}</Text>
              </Pressable>
            )}

            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{isEN ? "Save Limit" : "Limiti Kaydet"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function catLabel(cat: string, isEN: boolean): string {
  if (cat === "all") return isEN ? "All Spending" : "Tüm Harcamalar";
  return cat;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  addBtn: { padding: 4 },

  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.blue + "15",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.blue + "30",
  },
  infoText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionCount: { color: Colors.textTertiary },

  suggestionCard: {
    backgroundColor: Colors.card2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.orange,
  },
  suggestionIconRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  suggestionCat: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text, flex: 1 },
  suggestionBadge: { backgroundColor: Colors.orange + "25", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  suggestionBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.orange },
  suggestionText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  suggestionBtns: { flexDirection: "row", gap: 8 },
  acceptBtn: {
    flex: 1,
    backgroundColor: Colors.tint,
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  acceptBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#000" },
  dismissBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dismissBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },

  limitCard: {
    backgroundColor: Colors.card2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  limitCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  limitCardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  limitCardRight: { alignItems: "flex-end" },
  limitIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  limitCatName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  limitSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  limitPct: { fontFamily: "Inter_700Bold", fontSize: 18 },
  limitStatusLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },

  progressTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 3 },

  limitAmounts: { flexDirection: "row", justifyContent: "space-between" },
  limitSpent: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  limitRemaining: { fontFamily: "Inter_400Regular", fontSize: 12 },

  enableBtn: {
    backgroundColor: Colors.tint + "20",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  enableBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.tint },

  emptyCard: {
    backgroundColor: Colors.card2,
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textTertiary, textAlign: "center" },
  emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  emptyAddText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.tint },

  modal: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },

  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.card2,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.tint + "20", borderColor: Colors.tint },
  catChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  catChipTextActive: { color: Colors.tint },

  typeRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.card2,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeBtnActive: { backgroundColor: Colors.tint + "20", borderColor: Colors.tint },
  typeBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  typeBtnTextActive: { color: Colors.tint },

  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card2, borderRadius: 10, paddingHorizontal: 14, marginBottom: 6 },
  inputPrefix: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary, marginRight: 4 },
  inputSuffix: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary, marginLeft: 4 },
  input: { flex: 1, paddingVertical: 13, fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.text },
  previewText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.tint, marginBottom: 16 },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card2,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  toggleLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  toggleSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2, maxWidth: 220 },

  saveBtn: { backgroundColor: Colors.tint, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 16, marginBottom: 8 },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#000" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.red + "40", marginTop: 8 },
  deleteBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.red },
});
