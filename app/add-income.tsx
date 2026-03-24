import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Switch,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import Colors from "@/constants/colors";
import { useBudget, INCOME_CATEGORIES, MemberOwner, getMemberColor, formatInputAmount, parseInputAmount, RecurringFrequency } from "@/context/BudgetContext";
import { CurrencyCode, getCurrencySymbol } from "@/lib/currency";
import CurrencyPicker from "@/components/CurrencyPicker";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/context/LanguageContext";
import { localizeIncomeCategory } from "@/lib/categories";
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

const INCOME_ICONS: Record<string, string> = {
  "Maaş": "briefcase-outline",
  "Serbest Çalışma": "laptop-outline",
  "Kira Geliri": "home-outline",
  "Yatırım Geliri": "trending-up-outline",
  "Yan Gelir": "cash-outline",
  "Prim/Bonus": "star-outline",
  "Diğer": "ellipsis-horizontal-circle-outline",
};

export default function AddIncomeScreen() {
  const insets = useSafeAreaInsets();
  const { addIncome, updateIncome, incomes } = useBudget();
  const { user, familyMembers, addCustomMember } = useAuth();
  const { t, language } = useLanguage();
  const { editId, recurring: recurringParam } = useLocalSearchParams<{ editId?: string; recurring?: string }>();

  const editingIncome = useMemo(() => editId ? incomes.find((i) => i.id === editId) : undefined, [editId, incomes]);
  const isEditMode = !!editingIncome;

  function isoToInputDate(iso: string): string {
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return formatDateForInput(new Date());
    return formatDateForInput(dt);
  }

  const [title, setTitle] = useState(editingIncome?.title || "");
  const [amount, setAmount] = useState(editingIncome ? formatInputAmount(String(editingIncome.amount % 1 === 0 ? editingIncome.amount : editingIncome.amount.toFixed(2)).replace(".", ",")) : "");
  const [category, setCategory] = useState(editingIncome?.category || INCOME_CATEGORIES[0]);
  const [date, setDate] = useState(editingIncome ? isoToInputDate(editingIncome.date) : formatDateForInput(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(editingIncome?.isRecurring || recurringParam === "1" || false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>(editingIncome?.recurringFrequency || "monthly");
  const [recurringDay, setRecurringDay] = useState(editingIncome?.recurringDay !== undefined ? String(editingIncome.recurringDay) : "1");
  const [recurringEndDate, setRecurringEndDate] = useState(editingIncome?.recurringEndDate || "");
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [note, setNote] = useState(editingIncome?.note || "");
  const [currency, setCurrency] = useState<CurrencyCode>(editingIncome?.currency || "TRY");
  const [memberOwner, setMemberOwner] = useState<MemberOwner>(editingIncome?.memberOwner || user?.id || "self");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  function handleSubmit() {
    const parsedAmount = parseInputAmount(amount);
    if (!amount || parsedAmount <= 0) {
      Alert.alert(
        language === "tr" ? "Hata" : "Error",
        language === "tr" ? "Lütfen geçerli bir tutar girin." : "Please enter a valid amount."
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

    if (isEditMode && !editingIncome) {
      Alert.alert(language === "tr" ? "Hata" : "Error", language === "tr" ? "Düzenlenecek işlem bulunamadı." : "Transaction not found for editing.");
      return;
    }

    const finalTitle = title.trim() || category;

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

    const incomeData = {
      title: finalTitle,
      amount: parsedAmount,
      category,
      date: dateStringToISO(date),
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : undefined,
      recurringDay: isRecurring && recurringFrequency !== "daily" ? parseInt(recurringDay, 10) : undefined,
      recurringEndDate: isRecurring && recurringEndDate ? recurringEndDate : undefined,
      note: note.trim() || undefined,
      memberOwner,
      memberOwnerName: ownerName,
      currency,
    };

    if (isEditMode && editingIncome) {
      updateIncome({ ...editingIncome, ...incomeData });
    } else {
      addIncome(incomeData);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.card }]}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>{isEditMode ? (language === "tr" ? "Geliri Düzenle" : "Edit Income") : t("addIncomeTitle")}</Text>
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
        </View>

        {/* Category */}
        <Text style={styles.label}>{t("categoryLabel")}</Text>
        <View style={styles.chips}>
          {INCOME_CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => {
                setCategory(cat);
                Haptics.selectionAsync();
              }}
            >
              <Ionicons
                name={(INCOME_ICONS[cat] || "cash-outline") as any}
                size={14}
                color={category === cat ? Colors.background : Colors.textSecondary}
              />
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                {localizeIncomeCategory(cat, language)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Title (optional) */}
        <Text style={styles.label}>
          {t("titleLabel")} <Text style={styles.optional}>({t("optional")})</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={category}
          placeholderTextColor={Colors.textTertiary}
        />

        {/* Date */}
        <Text style={styles.label}>{t("dateLabel")}</Text>
        <Pressable
          style={styles.datePicker}
          onPress={() => { setShowDatePicker(true); Haptics.selectionAsync(); }}
        >
          <Ionicons name="calendar-outline" size={18} color={Colors.green} />
          <Text style={styles.datePickerText}>{displayDate(date, language)}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
        </Pressable>

        {/* Note (optional) */}
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

        {/* Recurring */}
        <View style={styles.switchRow}>
          <View style={styles.switchLeft}>
            <Ionicons name="repeat-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.switchLabel}>{t("recurringIncome")}</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={(v) => {
              setIsRecurring(v);
              Haptics.selectionAsync();
            }}
            trackColor={{ false: Colors.card2, true: Colors.green + "80" }}
            thumbColor={isRecurring ? Colors.green : Colors.textTertiary}
          />
        </View>

        {isRecurring && (
          <>
            <Text style={styles.label}>{language === "tr" ? "Tekrar Sıklığı" : "Frequency"}</Text>
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
                  <Ionicons name={f.icon as any} size={14} color={recurringFrequency === f.key ? Colors.background : Colors.textSecondary} />
                  <Text style={[styles.freqChipText, recurringFrequency === f.key && styles.freqChipTextActive]}>
                    {language === "tr" ? f.tr : f.en}
                  </Text>
                </Pressable>
              ))}
            </View>
            {recurringFrequency === "weekly" && (
              <>
                <Text style={styles.label}>{language === "tr" ? "Hangi Gün?" : "Which Day?"}</Text>
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
                <Text style={styles.label}>{t("recurringDayLabel")}</Text>
                <TextInput
                  style={styles.input}
                  value={recurringDay}
                  onChangeText={setRecurringDay}
                  keyboardType="number-pad"
                  maxLength={2}
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
                  trackColor={{ false: Colors.card2, true: Colors.green + "80" }}
                  thumbColor={recurringEndDate ? Colors.green : Colors.textTertiary}
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
          </>
        )}

        {/* Submit */}
        <Pressable style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>{isEditMode ? (language === "tr" ? "Güncelle" : "Update") : t("addIncomeBtn")}</Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>

      <DatePickerModal
        visible={showDatePicker}
        value={date}
        onClose={() => setShowDatePicker(false)}
        onSelect={(d) => setDate(d)}
        language={language}
        accentColor={Colors.green}
      />

      <DatePickerModal
        visible={showEndDatePicker}
        value={recurringEndDate || formatDateForInput(new Date())}
        onClose={() => setShowEndDatePicker(false)}
        onSelect={(d) => { setRecurringEndDate(dateStringToISO(d).slice(0, 10)); setShowEndDatePicker(false); }}
        language={language}
        accentColor={Colors.green}
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
  currencySymbol: { fontFamily: "Inter_700Bold", fontSize: 32, color: Colors.green, marginRight: 8 },
  amountInput: { fontFamily: "Inter_700Bold", fontSize: 40, color: Colors.text, flex: 1 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, marginBottom: 8, marginTop: 12 },
  optional: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: Colors.background },
  input: { backgroundColor: Colors.background, borderRadius: 12, padding: 14, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  textArea: { height: 80, textAlignVertical: "top" },
  datePicker: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  datePickerText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.text },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, marginTop: 12 },
  switchLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchLabel: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.text },
  submitBtn: { backgroundColor: Colors.green, borderRadius: 16, padding: 18, alignItems: "center", marginTop: 20 },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.background },
  memberRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  memberBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  memberLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
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
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  freqChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  freqChipActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  freqChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  freqChipTextActive: { color: Colors.background },
  dayChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  dayChipActive: { backgroundColor: Colors.green + "20", borderColor: Colors.green + "60" },
  dayChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.green },
  endDateSection: { marginTop: 12, gap: 8 },
  endDateBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  endDateText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  endDateHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, marginLeft: "auto" },
});
