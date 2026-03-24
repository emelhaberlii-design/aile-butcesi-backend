import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Switch,
  Alert,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import Colors from "@/constants/colors";
import { useBudget, EXPENSE_CATEGORIES, CreditCard, MemberOwner, getMemberColor, formatInputAmount, parseInputAmount, RecurringFrequency } from "@/context/BudgetContext";
import { CurrencyCode, getCurrencySymbol } from "@/lib/currency";
import CurrencyPicker from "@/components/CurrencyPicker";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/context/LanguageContext";
import { localizeCategory, localizeSubcategory, SUBCATEGORY_BRANDS } from "@/lib/categories";
import { DatePickerModal, displayDate } from "@/components/DatePickerModal";

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateStringToISO(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return new Date().toISOString();
  const dt = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  return dt.toISOString();
}

const CATEGORY_ICONS: Record<string, string> = {
  "Ev": "home-outline",
  "Faturalar": "receipt-outline",
  "Market": "cart-outline",
  "Yemek Siparişi": "bicycle-outline",
  "Araç Giderleri": "car-outline",
  "Toplu Taşıma": "bus-outline",
  "Sağlık": "medical-outline",
  "Eğlence": "game-controller-outline",
  "Çocuk/Bebek": "happy-outline",
  "Online Alışveriş": "bag-outline",
  "Giyim": "shirt-outline",
  "Eğitim": "school-outline",
  "Kredi Ödemesi": "trending-down-outline",
  "Diğer": "ellipsis-horizontal-circle-outline",
};

const PRESET_INSTALLMENTS = [1, 2, 3, 6, 9, 12];

export default function AddExpenseScreen() {
  const insets = useSafeAreaInsets();
  const { addExpense, updateExpense, expenses, creditCards } = useBudget();
  const { user, familyMembers, addCustomMember } = useAuth();
  const { t, language } = useLanguage();
  const { cardId, editId, recurring: recurringParam } = useLocalSearchParams<{ cardId?: string; editId?: string; recurring?: string }>();

  const editingExpense = useMemo(() => editId ? expenses.find((e) => e.id === editId) : undefined, [editId, expenses]);
  const isEditMode = !!editingExpense;

  const categoryList = Object.keys(EXPENSE_CATEGORIES);

  const preSelectedCard = useMemo(() => {
    if (editingExpense?.creditCardId) return creditCards.find(c => c.id === editingExpense.creditCardId) ?? null;
    if (cardId) return creditCards.find(c => c.id === cardId) ?? null;
    return creditCards.length > 0 ? creditCards[0] : null;
  }, [cardId, editingExpense, creditCards]);

  function isoToInputDate(iso: string): string {
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return formatDateForInput(new Date());
    return formatDateForInput(dt);
  }

  const [title, setTitle] = useState(editingExpense?.title || "");
  const [amount, setAmount] = useState(editingExpense ? formatInputAmount(String(editingExpense.amount % 1 === 0 ? editingExpense.amount : editingExpense.amount.toFixed(2)).replace(".", ",")) : "");
  const [category, setCategory] = useState(editingExpense?.category || categoryList[0]);
  const [subcategory, setSubcategory] = useState(editingExpense?.subcategory || EXPENSE_CATEGORIES[editingExpense?.category || categoryList[0]]?.[0] || "");
  const [brand, setBrand] = useState<string | undefined>(editingExpense?.brand);
  const [date, setDate] = useState(editingExpense ? isoToInputDate(editingExpense.date) : formatDateForInput(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "debit" | "credit">(editingExpense?.paymentMethod || (cardId ? "credit" : "cash"));
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(preSelectedCard);
  const [isRecurring, setIsRecurring] = useState(editingExpense?.isRecurring || recurringParam === "1" || false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>(editingExpense?.recurringFrequency || "monthly");
  const [recurringDay, setRecurringDay] = useState(editingExpense?.recurringDay !== undefined ? String(editingExpense.recurringDay) : "1");
  const [recurringEndDate, setRecurringEndDate] = useState(editingExpense?.recurringEndDate || "");
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [installments, setInstallments] = useState(editingExpense?.installmentCount || 1);
  const [isManualInstallment, setIsManualInstallment] = useState(false);
  const [manualInstallmentText, setManualInstallmentText] = useState("");
  const [note, setNote] = useState(editingExpense?.note || "");
  const [currency, setCurrency] = useState<CurrencyCode>(editingExpense?.currency || "TRY");
  const [memberOwner, setMemberOwner] = useState<MemberOwner>(editingExpense?.memberOwner || user?.id || "shared");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  const subcategories = EXPENSE_CATEGORIES[category] || [];
  const brandOptions = SUBCATEGORY_BRANDS[subcategory] || [];

  const monthlyInstallment = useMemo(() => {
    if (installments <= 1) return null;
    const parsed = parseInputAmount(amount);
    if (!parsed) return null;
    return parsed / installments;
  }, [amount, installments]);

  function handleCategoryChange(cat: string) {
    setCategory(cat);
    const subs = EXPENSE_CATEGORIES[cat] || [];
    setSubcategory(subs[0] || "");
    setBrand(undefined);
    Haptics.selectionAsync();
  }

  function handleSubcategoryChange(sub: string) {
    setSubcategory(sub);
    setBrand(undefined);
    Haptics.selectionAsync();
  }

  function handlePresetInstallment(n: number) {
    setInstallments(n);
    setIsManualInstallment(false);
    setManualInstallmentText("");
    Haptics.selectionAsync();
  }

  function handleManualInstallmentChange(text: string) {
    setManualInstallmentText(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 2 && parsed <= 120) {
      setInstallments(parsed);
    }
  }

  function handleSubmit() {
    const parsedAmount = parseInputAmount(amount);
    if (!amount || parsedAmount <= 0) {
      Alert.alert(
        language === "tr" ? "Hata" : "Error",
        language === "tr" ? "Lütfen geçerli bir tutar girin." : "Please enter a valid amount."
      );
      return;
    }

    if (paymentMethod === "credit" && !selectedCard) {
      Alert.alert(
        language === "tr" ? "Kart Seçin" : "Select Card",
        language === "tr"
          ? "Lütfen bir kredi kartı seçin veya önce kart ekleyin."
          : "Please select a credit card or add one first."
      );
      return;
    }

    if (isRecurring && recurringFrequency === "monthly") {
      const day = parseInt(recurringDay, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        Alert.alert(language === "tr" ? "Hata" : "Error", language === "tr" ? "Tekrar günü 1–31 arasında olmalı." : "Recurring day must be 1–31.");
        return;
      }
    }
    if (isRecurring && recurringFrequency === "weekly") {
      const day = parseInt(recurringDay, 10);
      if (isNaN(day) || day < 0 || day > 6) {
        Alert.alert(language === "tr" ? "Hata" : "Error", language === "tr" ? "Geçersiz gün seçimi." : "Invalid day selection.");
        return;
      }
    }

    if (isEditMode && !editingExpense) {
      Alert.alert(language === "tr" ? "Hata" : "Error", language === "tr" ? "Düzenlenecek işlem bulunamadı." : "Transaction not found for editing.");
      return;
    }

    const finalTitle = title.trim() || brand || subcategory || category;
    const monthlyAmount = installments > 1 ? parsedAmount / installments : parsedAmount;

    let ownerName = "";
    if (memberOwner === "shared") {
      ownerName = language === "tr" ? "Ortak" : "Shared";
    } else if (memberOwner.startsWith("custom_")) {
      ownerName = memberOwner.replace("custom_", "");
    } else {
      ownerName = familyMembers.find((m) => m.id === memberOwner)?.name?.split(" ")[0]
        || user?.name?.split(" ")[0]
        || "";
    }

    const expenseData = {
      title: finalTitle,
      amount: monthlyAmount,
      category,
      subcategory,
      brand: brand || undefined,
      date: dateStringToISO(date),
      paymentMethod,
      creditCardId: paymentMethod === "credit" && selectedCard ? selectedCard.id : undefined,
      isRecurring: isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : undefined,
      recurringDay: isRecurring && recurringFrequency !== "daily" ? parseInt(recurringDay, 10) : undefined,
      recurringEndDate: isRecurring && recurringEndDate ? recurringEndDate : undefined,
      isInstallment: installments > 1,
      installmentCount: installments > 1 ? installments : undefined,
      installmentCurrent: installments > 1 ? 1 : undefined,
      note: note.trim() || undefined,
      memberOwner,
      memberOwnerName: ownerName,
      currency,
    };

    if (isEditMode && editingExpense) {
      updateExpense({ ...editingExpense, ...expenseData });
    } else {
      addExpense(expenseData);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const PAYMENT_OPTIONS: { key: "cash" | "debit" | "credit"; label: string; icon: string; color: string }[] = [
    { key: "cash", label: t("cashLabel"), icon: "cash-outline", color: Colors.green },
    { key: "debit", label: t("debitCardLabel"), icon: "card-outline", color: Colors.blue },
    { key: "credit", label: t("creditCardLabel"), icon: "card", color: Colors.purple },
  ];

  return (
    <View style={[styles.container, { backgroundColor: Colors.card }]}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>{isEditMode ? (language === "tr" ? "Gideri Düzenle" : "Edit Expense") : t("addExpenseTitle")}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <View style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={Colors.textSecondary} />
          </View>
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        bottomOffset={120}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
      >
        {/* Currency */}
        <Text style={styles.label}>{language === "tr" ? "Para Birimi" : "Currency"}</Text>
        <CurrencyPicker value={currency} onChange={setCurrency} />

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>{getCurrencySymbol(currency)}</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(v) => setAmount(formatInputAmount(v))}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="decimal-pad"
            autoFocus
          />
          {installments > 1 && monthlyInstallment !== null && (
            <View style={styles.installmentBadge}>
              <Text style={styles.installmentBadgeText}>
                {installments}×{new Intl.NumberFormat("tr-TR").format(Math.round(monthlyInstallment))}{getCurrencySymbol(currency)}
              </Text>
            </View>
          )}
        </View>

        {/* Category */}
        <Text style={styles.label}>{t("categoryLabel")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalChips}
        >
          {categoryList.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => handleCategoryChange(cat)}
            >
              <Ionicons
                name={(CATEGORY_ICONS[cat] || "ellipsis-horizontal-circle-outline") as any}
                size={14}
                color={category === cat ? Colors.background : Colors.textSecondary}
              />
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                {localizeCategory(cat, language)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Subcategory */}
        <Text style={styles.label}>{t("subcategoryLabel")}</Text>
        <View style={styles.chips}>
          {subcategories.map((sub) => (
            <Pressable
              key={sub}
              style={[styles.subChip, subcategory === sub && styles.subChipActive]}
              onPress={() => handleSubcategoryChange(sub)}
            >
              <Text style={[styles.subChipText, subcategory === sub && styles.subChipTextActive]}>
                {localizeSubcategory(sub, language)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Brand (sub-subcategory) — only shown when available */}
        {brandOptions.length > 0 && (
          <>
            <Text style={styles.labelBrand}>
              {language === "tr" ? "Marka / Platform" : "Brand / Platform"}
              <Text style={styles.optional}> ({language === "tr" ? "isteğe bağlı" : "optional"})</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalChips}
            >
              {brandOptions.map((b) => (
                <Pressable
                  key={b}
                  style={[styles.brandChip, brand === b && styles.brandChipActive]}
                  onPress={() => {
                    setBrand(brand === b ? undefined : b);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={[styles.brandChipText, brand === b && styles.brandChipTextActive]}>
                    {b}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* Title (optional) */}
        <Text style={styles.label}>
          {t("titleLabel")} <Text style={styles.optional}>({t("optional")})</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={brand || subcategory || category}
          placeholderTextColor={Colors.textTertiary}
        />

        {/* Date */}
        <Text style={styles.label}>{t("dateLabel")}</Text>
        <Pressable
          style={styles.datePicker}
          onPress={() => { setShowDatePicker(true); Haptics.selectionAsync(); }}
        >
          <Ionicons name="calendar-outline" size={18} color={Colors.red} />
          <Text style={styles.datePickerText}>{displayDate(date, language)}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
        </Pressable>

        {/* Installments */}
        <Text style={styles.label}>{t("installmentsLabel")}</Text>
        <View style={styles.installmentRow}>
          {PRESET_INSTALLMENTS.map((n) => (
            <Pressable
              key={n}
              style={[
                styles.installChip,
                installments === n && !isManualInstallment && styles.installChipActive,
              ]}
              onPress={() => handlePresetInstallment(n)}
            >
              <Text
                style={[
                  styles.installChipText,
                  installments === n && !isManualInstallment && styles.installChipTextActive,
                ]}
              >
                {n === 1 ? (language === "tr" ? "Tek" : "1×") : `${n}×`}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.installChip, isManualInstallment && styles.installChipActive]}
            onPress={() => {
              setIsManualInstallment(true);
              Haptics.selectionAsync();
            }}
          >
            <Text style={[styles.installChipText, isManualInstallment && styles.installChipTextActive]}>
              {language === "tr" ? "Manuel" : "Custom"}
            </Text>
          </Pressable>
        </View>

        {isManualInstallment && (
          <View style={styles.manualInstallmentRow}>
            <TextInput
              style={[styles.input, styles.manualInstallInput]}
              value={manualInstallmentText}
              onChangeText={handleManualInstallmentChange}
              placeholder={language === "tr" ? "Taksit sayısı (örn. 4, 7, 24)" : "Count (e.g. 4, 7, 24)"}
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              autoFocus
            />
            {installments > 1 && (
              <View style={styles.manualInstallBadge}>
                <Text style={styles.manualInstallBadgeText}>{installments}×</Text>
              </View>
            )}
          </View>
        )}

        {installments > 1 && monthlyInstallment !== null && (
          <View style={styles.installmentSummary}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.tint} />
            <Text style={styles.installmentSummaryText}>
              {language === "tr"
                ? `${installments} taksit × ${new Intl.NumberFormat("tr-TR").format(Math.round(monthlyInstallment))} ₺/ay`
                : `${installments} installments × ${new Intl.NumberFormat("tr-TR").format(Math.round(monthlyInstallment))} ₺/month`}
            </Text>
          </View>
        )}

        {/* Payment Method */}
        <Text style={styles.label}>{t("paymentMethodLabel")}</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_OPTIONS.map(({ key, label, icon, color }) => (
            <Pressable
              key={key}
              style={[styles.paymentBtn, paymentMethod === key && { backgroundColor: color + "20", borderColor: color + "60" }]}
              onPress={() => { setPaymentMethod(key); Haptics.selectionAsync(); }}
            >
              <Ionicons name={icon as any} size={18} color={paymentMethod === key ? color : Colors.textSecondary} />
              <Text style={[styles.paymentLabel, paymentMethod === key && { color }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Credit Card Selection */}
        {paymentMethod === "credit" && (
          <>
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>{t("selectCardLabel")}</Text>
              <Pressable
                style={styles.addCardInlineBtn}
                onPress={() => router.push("/manage-cards")}
              >
                <Ionicons name="add" size={13} color={Colors.purple} />
                <Text style={styles.addCardInlineText}>
                  {language === "tr" ? "Yeni Kart Ekle" : "Add New Card"}
                </Text>
              </Pressable>
            </View>
            {creditCards.length === 0 ? (
              <View style={styles.addCardPrompt}>
                <Ionicons name="card-outline" size={16} color={Colors.purple} />
                <Text style={styles.addCardPromptText}>
                  {language === "tr"
                    ? "Henüz kart yok. Yeni kart ekle butonuna tıklayın."
                    : "No cards yet. Tap Add New Card above."}
                </Text>
              </View>
            ) : (
              <View style={styles.chips}>
                {creditCards.map((card) => (
                  <Pressable
                    key={card.id}
                    style={[
                      styles.cardChip,
                      selectedCard?.id === card.id && styles.cardChipActive,
                    ]}
                    onPress={() => { setSelectedCard(card); Haptics.selectionAsync(); }}
                  >
                    <View style={[styles.cardDot, { backgroundColor: card.color }]} />
                    <Text style={[styles.cardChipText, selectedCard?.id === card.id && styles.cardChipTextActive]}>
                      {card.bank} - {card.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {/* Note */}
        <Text style={styles.label}>
          {t("noteLabel")} <Text style={styles.optional}>({t("optional")})</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={note}
          onChangeText={setNote}
          placeholder={language === "tr" ? "Açıklama ekle..." : "Add a note..."}
          placeholderTextColor={Colors.textTertiary}
          multiline
          numberOfLines={3}
        />

        {/* Member owner */}
        <Text style={styles.label}>{language === "tr" ? "Aile Bireyi" : "Family Member"}</Text>
        <View style={styles.memberRow}>
          {(() => {
            const memberOptions: { key: string; label: string; icon: string; color: string }[] = [];
            if (familyMembers.length > 1) {
              familyMembers.forEach((m, idx) => {
                memberOptions.push({
                  key: m.id,
                  label: m.name.split(" ")[0],
                  icon: m.id === user?.id ? "person" : "person-outline",
                  color: getMemberColor(idx),
                });
              });
            } else {
              memberOptions.push({
                key: user?.id || "self",
                label: user?.name ? user.name.split(" ")[0] : (language === "tr" ? "Ben" : "Me"),
                icon: "person",
                color: Colors.blue,
              });
            }
            const customs = user?.customMembers || [];
            customs.forEach((name, idx) => {
              memberOptions.push({
                key: `custom_${name}`,
                label: name,
                icon: "person-outline",
                color: getMemberColor(memberOptions.length + idx),
              });
            });
            memberOptions.push({
              key: "shared",
              label: language === "tr" ? "Ortak" : "Shared",
              icon: "people",
              color: Colors.green,
            });
            return memberOptions.map(({ key, label, icon, color }) => (
              <Pressable
                key={key}
                style={[styles.memberBtn, memberOwner === key && { backgroundColor: color + "20", borderColor: color + "60" }]}
                onPress={() => { setMemberOwner(key); Haptics.selectionAsync(); }}
              >
                <Ionicons name={icon as any} size={16} color={memberOwner === key ? color : Colors.textSecondary} />
                <Text style={[styles.memberLabel, memberOwner === key && { color }]}>{label}</Text>
              </Pressable>
            ));
          })()}
          <Pressable
            style={styles.addMemberBtn}
            onPress={() => { setNewMemberName(""); setShowAddMemberModal(true); }}
          >
            <Ionicons name="add-circle-outline" size={16} color={Colors.tint} />
            <Text style={styles.addMemberText}>{language === "tr" ? "Ekle" : "Add"}</Text>
          </Pressable>
        </View>

        {/* Recurring (only if not installment) */}
        {installments === 1 && (
          <>
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Ionicons name="repeat-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.switchLabel}>{t("recurringExpense")}</Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={(v) => { setIsRecurring(v); Haptics.selectionAsync(); }}
                trackColor={{ false: Colors.card2, true: Colors.red + "80" }}
                thumbColor={isRecurring ? Colors.red : Colors.textTertiary}
              />
            </View>
            {isRecurring && (
              <View style={styles.recurringCard}>
                <Text style={styles.recurringLabel}>{language === "tr" ? "Tekrar Sıklığı" : "Frequency"}</Text>
                <View style={styles.freqRow}>
                  {([
                    { key: "daily" as RecurringFrequency, tr: "Günlük", en: "Daily", icon: "today-outline" },
                    { key: "weekly" as RecurringFrequency, tr: "Haftalık", en: "Weekly", icon: "calendar-outline" },
                    { key: "monthly" as RecurringFrequency, tr: "Aylık", en: "Monthly", icon: "calendar-number-outline" },
                  ] as const).map((f) => (
                    <Pressable
                      key={f.key}
                      style={[styles.freqChip, recurringFrequency === f.key && styles.freqChipActive]}
                      onPress={() => { setRecurringFrequency(f.key); Haptics.selectionAsync(); }}
                    >
                      <Ionicons name={f.icon as any} size={14} color={recurringFrequency === f.key ? Colors.background : Colors.text} />
                      <Text style={[styles.freqChipText, recurringFrequency === f.key && styles.freqChipTextActive]}>
                        {language === "tr" ? f.tr : f.en}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {recurringFrequency === "weekly" && (
                  <>
                    <Text style={styles.recurringLabel}>{language === "tr" ? "Hangi Gün?" : "Which Day?"}</Text>
                    <View style={styles.freqRow}>
                      {([
                        { day: 1, tr: "Pzt", en: "Mon" }, { day: 2, tr: "Sal", en: "Tue" },
                        { day: 3, tr: "Çar", en: "Wed" }, { day: 4, tr: "Per", en: "Thu" },
                        { day: 5, tr: "Cum", en: "Fri" }, { day: 6, tr: "Cmt", en: "Sat" },
                        { day: 0, tr: "Paz", en: "Sun" },
                      ]).map((d) => (
                        <Pressable
                          key={d.day}
                          style={[styles.dayChip, parseInt(recurringDay) === d.day && styles.dayChipActive]}
                          onPress={() => { setRecurringDay(String(d.day)); Haptics.selectionAsync(); }}
                        >
                          <Text style={[styles.dayChipText, parseInt(recurringDay) === d.day && styles.dayChipTextActive]}>
                            {language === "tr" ? d.tr : d.en}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
                {recurringFrequency === "monthly" && (
                  <>
                    <Text style={styles.recurringLabel}>{t("recurringDayLabel")}</Text>
                    <TextInput
                      style={styles.recurringInput}
                      value={recurringDay}
                      onChangeText={setRecurringDay}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="1"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </>
                )}

                <View style={styles.endDateSection}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLeft}>
                      <Ionicons name="calendar-clear-outline" size={18} color={Colors.textSecondary} />
                      <Text style={styles.switchLabel}>{language === "tr" ? "Bitiş Tarihi" : "End Date"}</Text>
                    </View>
                    <Switch
                      value={!!recurringEndDate}
                      onValueChange={(v) => {
                        if (v) {
                          const d = new Date();
                          d.setMonth(d.getMonth() + 3);
                          setRecurringEndDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                          setShowEndDatePicker(true);
                        } else {
                          setRecurringEndDate("");
                          setShowEndDatePicker(false);
                        }
                        Haptics.selectionAsync();
                      }}
                      trackColor={{ false: Colors.card2, true: Colors.red + "80" }}
                      thumbColor={recurringEndDate ? Colors.red : Colors.textTertiary}
                    />
                  </View>
                  {!!recurringEndDate && (
                    <Pressable
                      style={styles.endDateBtn}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={Colors.tint} />
                      <Text style={styles.endDateText}>
                        {displayDate(recurringEndDate, language)}
                      </Text>
                      <Text style={styles.endDateHint}>
                        {language === "tr" ? "Değiştirmek için dokun" : "Tap to change"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </>
        )}

        <Pressable style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>{isEditMode ? (language === "tr" ? "Güncelle" : "Update") : t("addExpenseBtn")}</Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>

      <DatePickerModal
        visible={showDatePicker}
        value={date}
        onClose={() => setShowDatePicker(false)}
        onSelect={(d) => setDate(d)}
        language={language}
        accentColor={Colors.red}
      />

      <DatePickerModal
        visible={showEndDatePicker}
        value={recurringEndDate || formatDateForInput(new Date())}
        onClose={() => setShowEndDatePicker(false)}
        onSelect={(d) => { setRecurringEndDate(dateStringToISO(d).slice(0, 10)); setShowEndDatePicker(false); }}
        language={language}
        accentColor={Colors.red}
      />

      <Modal visible={showAddMemberModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{language === "tr" ? "Aile Bireyi Ekle" : "Add Family Member"}</Text>
              <TextInput
                style={styles.modalInput}
                value={newMemberName}
                onChangeText={setNewMemberName}
                placeholder={language === "tr" ? "ör. Fatma" : "e.g. Fatma"}
                placeholderTextColor={Colors.textTertiary}
                autoFocus
                autoCapitalize="words"
              />
              <View style={styles.modalButtons}>
                <Pressable style={styles.modalCancelBtn} onPress={() => setShowAddMemberModal(false)}>
                  <Text style={styles.modalCancelText}>{language === "tr" ? "İptal" : "Cancel"}</Text>
                </Pressable>
                <Pressable
                  style={styles.modalSaveBtn}
                  onPress={() => {
                    const name = newMemberName.trim();
                    if (!name) return;
                    addCustomMember(name);
                    setMemberOwner(`custom_${name}`);
                    setShowAddMemberModal(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                >
                  <Text style={styles.modalSaveText}>{language === "tr" ? "Ekle" : "Add"}</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginTop: 12, marginBottom: 6 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.card2, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 20, gap: 4 },
  amountContainer: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  currencySymbol: { fontFamily: "Inter_700Bold", fontSize: 32, color: Colors.red, marginRight: 8 },
  amountInput: { fontFamily: "Inter_700Bold", fontSize: 40, color: Colors.text, flex: 1 },
  installmentBadge: { backgroundColor: Colors.tint + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  installmentBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.tint },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, marginBottom: 8, marginTop: 12 },
  labelBrand: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.tint, marginBottom: 8, marginTop: 12 },
  optional: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary },
  horizontalChips: { flexDirection: "row", gap: 8, paddingBottom: 4, paddingRight: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.red, borderColor: Colors.red },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: Colors.background },
  subChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  subChipActive: { backgroundColor: Colors.red + "20", borderColor: Colors.red + "60" },
  subChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  subChipTextActive: { color: Colors.red },
  brandChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.tint + "40" },
  brandChipActive: { backgroundColor: Colors.tint + "20", borderColor: Colors.tint },
  brandChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.tint },
  brandChipTextActive: { color: Colors.tint, fontFamily: "Inter_600SemiBold" },
  installmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  installChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  installChipActive: { backgroundColor: Colors.tint + "20", borderColor: Colors.tint + "60" },
  installChipText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  installChipTextActive: { color: Colors.tint },
  manualInstallmentRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  manualInstallInput: { flex: 1, marginTop: 0 },
  manualInstallBadge: { backgroundColor: Colors.tint + "20", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  manualInstallBadgeText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.tint },
  installmentSummary: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.tint + "10", borderRadius: 10, padding: 10 },
  installmentSummaryText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.tint },
  paymentRow: { flexDirection: "row", gap: 8 },
  paymentBtn: { flex: 1, flexDirection: "column", alignItems: "center", gap: 4, padding: 12, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  paymentLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },
  memberRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  memberBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  memberLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  input: { backgroundColor: Colors.background, borderRadius: 12, padding: 14, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  textArea: { height: 80, textAlignVertical: "top" },
  cardChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  cardChipActive: { backgroundColor: Colors.purple + "20", borderColor: Colors.purple + "60" },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  cardChipTextActive: { color: Colors.purple },
  datePicker: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  datePickerText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.text },
  cardLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 12 },
  cardLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  addCardInlineBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.purple + "18", borderWidth: 1, borderColor: Colors.purple + "40" },
  addCardInlineText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.purple },
  addCardPrompt: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, backgroundColor: Colors.purple + "10", borderWidth: 1, borderColor: Colors.purple + "40" },
  addCardPromptText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.purple },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, marginTop: 12 },
  switchLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchLabel: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.text },
  submitBtn: { backgroundColor: Colors.red, borderRadius: 16, padding: 18, alignItems: "center", marginTop: 20 },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.background },
  addMemberBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.tint + "15", borderWidth: 1, borderColor: Colors.tint + "40", borderStyle: "dashed" },
  addMemberText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.tint },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  modalContent: { backgroundColor: Colors.card, borderRadius: 20, padding: 24 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, marginBottom: 16 },
  modalInput: { backgroundColor: Colors.background, borderRadius: 12, padding: 14, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: Colors.card2 },
  modalCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: Colors.tint },
  modalSaveText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.background },
  recurringCard: { backgroundColor: Colors.background, borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1, borderColor: Colors.red + "30" },
  recurringLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text, marginBottom: 8, marginTop: 4 },
  recurringInput: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, borderWidth: 1, borderColor: Colors.border, textAlign: "center", width: 80 },
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  freqChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  freqChipActive: { backgroundColor: Colors.red, borderColor: Colors.red },
  freqChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text },
  freqChipTextActive: { color: Colors.background },
  dayChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  dayChipActive: { backgroundColor: Colors.red + "20", borderColor: Colors.red + "60" },
  dayChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text },
  dayChipTextActive: { color: Colors.red },
  endDateSection: { marginTop: 12, gap: 8 },
  endDateBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  endDateText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  endDateHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, marginLeft: "auto" },
});
