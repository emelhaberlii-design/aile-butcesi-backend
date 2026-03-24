import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import Colors from "@/constants/colors";
import { useBudget, TURKISH_BANKS, INTERNATIONAL_BANKS, Loan, formatInputAmount, parseInputAmount } from "@/context/BudgetContext";
import { CurrencyCode, getCurrencySymbol } from "@/lib/currency";
import CurrencyPicker from "@/components/CurrencyPicker";
import { useLanguage } from "@/context/LanguageContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LOAN_TYPES = [
  { key: "konut", label: "Konut", labelEn: "Mortgage", icon: "home-outline" },
  { key: "tasit", label: "Taşıt", labelEn: "Vehicle", icon: "car-outline" },
  { key: "ihtiyac", label: "İhtiyaç", labelEn: "Personal", icon: "person-outline" },
  { key: "isyeri", label: "İş Yeri", labelEn: "Business", icon: "business-outline" },
  { key: "diger", label: "Diğer", labelEn: "Other", icon: "ellipsis-horizontal-circle-outline" },
];

export default function AddLoanScreen() {
  const insets = useSafeAreaInsets();
  const { loans, addLoan, deleteLoan, makeLoanPayment } = useBudget();
  const { t, language } = useLanguage();

  const isEN = language === "en";
  const bankList = isEN ? INTERNATIONAL_BANKS : TURKISH_BANKS;
  const [bank, setBank] = useState(bankList[0]);
  const [customBankName, setCustomBankName] = useState("");
  const [loanType, setLoanType] = useState("ihtiyac");
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [paymentDay, setPaymentDay] = useState("10");
  const [installmentCount, setInstallmentCount] = useState("");
  const [installmentPaidInput, setInstallmentPaidInput] = useState("");
  const [loanCurrency, setLoanCurrency] = useState<CurrencyCode>("TRY");
  const [showForm, setShowForm] = useState(loans.length === 0);

  const parsedCount = parseInt(installmentCount, 10);
  const parsedPaid = parseInt(installmentPaidInput, 10);
  const parsedMonthlyVal = parseInputAmount(monthlyPayment);

  const calculatedRemaining = useMemo(() => {
    if (!isNaN(parsedCount) && parsedCount > 0 && parsedMonthlyVal > 0) {
      const paid = !isNaN(parsedPaid) ? parsedPaid : 0;
      return Math.max(0, (parsedCount - paid) * parsedMonthlyVal);
    }
    return null;
  }, [parsedCount, parsedPaid, parsedMonthlyVal]);

  const calculatedMonthly = useMemo(() => {
    const total = parseInputAmount(totalAmount);
    const rate = parseFloat(interestRate.replace(",", "."));
    if (total > 0 && !isNaN(rate) && rate > 0) {
      const monthlyRate = rate / 100 / 12;
      const months = 120;
      return (total * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    }
    return null;
  }, [totalAmount, interestRate]);

  function handleAdd() {
    const parsedMonthly = parseInputAmount(monthlyPayment);
    if (!monthlyPayment || parsedMonthly <= 0) {
      Alert.alert(
        language === "tr" ? "Hata" : "Error",
        language === "tr" ? "Aylık ödeme tutarı girin." : "Please enter a monthly payment amount."
      );
      return;
    }
    const parsedInstallmentCount = parseInt(installmentCount, 10);
    if (isNaN(parsedInstallmentCount) || parsedInstallmentCount <= 0) {
      Alert.alert(
        language === "tr" ? "Hata" : "Error",
        language === "tr" ? "Toplam taksit sayısını girin." : "Please enter total installments."
      );
      return;
    }
    const selectedType = LOAN_TYPES.find((lt) => lt.key === loanType);
    if ((bank === "Diğer" || bank === "Other") && !customBankName.trim()) {
      Alert.alert(language === "tr" ? "Hata" : "Error", language === "tr" ? "Banka adını girin." : "Please enter a bank name.");
      return;
    }
    const finalBank = (bank === "Diğer" || bank === "Other") ? customBankName.trim() : bank;
    const finalTitle =
      title.trim() ||
      `${finalBank} ${language === "tr" ? selectedType?.label : selectedType?.labelEn}`;
    const parsedPaymentDay = parseInt(paymentDay, 10);

    const paid = !isNaN(parsedPaid) ? Math.max(0, Math.min(parsedPaid, parsedInstallmentCount)) : 0;
    const remaining = Math.max(0, (parsedInstallmentCount - paid) * parsedMonthly);
    const parsedTotal = parseInputAmount(totalAmount);
    const finalTotal = parsedTotal > 0 ? parsedTotal : parsedInstallmentCount * parsedMonthly;

    addLoan({
      title: finalTitle,
      bank: finalBank,
      totalAmount: finalTotal,
      remainingAmount: remaining,
      monthlyPayment: parsedMonthly,
      interestRate: parseFloat(interestRate.replace(",", ".")) || undefined,
      paymentDay: isNaN(parsedPaymentDay) ? 10 : parsedPaymentDay,
      installmentCount: parsedInstallmentCount,
      installmentPaid: paid,
      startDate: new Date().toISOString(),
      currency: loanCurrency,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTitle("");
    setTotalAmount("");
    setMonthlyPayment("");
    setInterestRate("");
    setInstallmentCount("");
    setInstallmentPaidInput("");
    setShowForm(false);
  }

  function handleRemove(loan: Loan) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      language === "tr" ? "Krediyi Sil" : "Remove Loan",
      language === "tr"
        ? `${loan.title} kredisini silmek istiyor musunuz?`
        : `Remove ${loan.title}?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            deleteLoan(loan.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.card }]}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>{t("loanTracking")}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <View style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={Colors.textSecondary} />
          </View>
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        bottomOffset={20}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* Existing Loans */}
        {loans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {language === "tr" ? "Mevcut Krediler" : "Current Loans"}
            </Text>
            {loans.map((loan) => {
              const paid = loan.installmentPaid || 0;
              const total = loan.installmentCount;
              const remaining = total ? total - paid : null;
              const progressPct = total && total > 0 ? paid / total : null;
              const fmt = (n: number) => new Intl.NumberFormat("tr-TR").format(Math.round(n));
              const isFullyPaid = total !== undefined && paid >= total;
              return (
                <View key={loan.id} style={styles.loanCard}>
                  <View style={styles.loanCardLeft}>
                    <View style={[styles.loanIcon, { backgroundColor: isFullyPaid ? Colors.tint + "20" : Colors.orange + "20" }]}>
                      <Ionicons name={isFullyPaid ? "checkmark-circle-outline" : "home-outline"} size={16} color={isFullyPaid ? Colors.tint : Colors.orange} />
                    </View>
                    <View style={styles.loanInfo}>
                      <Text style={styles.loanTitle}>{loan.title}</Text>
                      <Text style={styles.loanMeta}>
                        {loan.bank}{loan.interestRate ? ` · %${loan.interestRate}` : ""}
                      </Text>
                      {loan.remainingAmount > 0 && (
                        <Text style={styles.loanRemaining}>
                          {language === "tr" ? "Kalan borç:" : "Remaining:"}{" "}{new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(loan.remainingAmount)} {getCurrencySymbol(loan.currency || "TRY")}
                        </Text>
                      )}
                      {total && total > 0 ? (
                        <View style={styles.installmentRow}>
                          <Text style={styles.installmentText}>
                            {paid}/{total} {language === "tr" ? "taksit" : "installments"}
                          </Text>
                          {remaining !== null && remaining > 0 && (
                            <Text style={styles.installmentRemaining}>
                              {" · "}{remaining} {language === "tr" ? "kaldı" : "left"}
                            </Text>
                          )}
                        </View>
                      ) : null}
                      {progressPct !== null && (
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${Math.min(100, Math.round(progressPct * 100))}%` as any, backgroundColor: isFullyPaid ? Colors.tint : Colors.orange }]} />
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.loanCardRight}>
                    <Text style={styles.loanMonthly}>{new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(loan.monthlyPayment)} {getCurrencySymbol(loan.currency || "TRY")}</Text>
                    <Text style={styles.loanPerMonth}>{t("perMonth")}</Text>
                    {!isFullyPaid && (
                      <Pressable
                        style={styles.payBtn}
                        onPress={() => {
                          makeLoanPayment(loan.id);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }}
                      >
                        <Ionicons name="checkmark" size={11} color={Colors.background} />
                        <Text style={styles.payBtnText}>{language === "tr" ? "Ödedim" : "Paid"}</Text>
                      </Pressable>
                    )}
                    <Pressable style={styles.removeLoanBtn} onPress={() => handleRemove(loan)}>
                      <Ionicons name="trash-outline" size={14} color={Colors.red} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!showForm && (
          <Pressable
            style={styles.addToggleBtn}
            onPress={() => { setShowForm(true); Haptics.selectionAsync(); }}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.orange} />
            <Text style={styles.addToggleText}>
              {language === "tr" ? "Yeni Kredi Ekle" : "Add New Loan"}
            </Text>
          </Pressable>
        )}

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {language === "tr" ? "Yeni Kredi" : "New Loan"}
            </Text>

            {/* Loan Type */}
            <Text style={styles.label}>
              {language === "tr" ? "Kredi Türü" : "Loan Type"}
            </Text>
            <View style={styles.typeChips}>
              {LOAN_TYPES.map((lt) => (
                <Pressable
                  key={lt.key}
                  style={[styles.typeChip, loanType === lt.key && styles.typeChipActive]}
                  onPress={() => { setLoanType(lt.key); Haptics.selectionAsync(); }}
                >
                  <Ionicons
                    name={lt.icon as any}
                    size={14}
                    color={loanType === lt.key ? Colors.background : Colors.textSecondary}
                  />
                  <Text style={[styles.typeChipText, loanType === lt.key && styles.typeChipTextActive]}>
                    {language === "tr" ? lt.label : lt.labelEn}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Bank */}
            <Text style={styles.label}>{language === "tr" ? "Banka" : "Bank"}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankChips}>
              {bankList.map((b) => (
                <Pressable
                  key={b}
                  style={[styles.bankChip, bank === b && styles.bankChipActive]}
                  onPress={() => { setBank(b); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.bankChipText, bank === b && styles.bankChipTextActive]}>
                    {b}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {(bank === "Diğer" || bank === "Other") && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={customBankName}
                onChangeText={setCustomBankName}
                placeholder={language === "tr" ? "Banka adını yazın..." : "Enter bank name..."}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="words"
              />
            )}

            {/* Optional Title */}
            <Text style={styles.label}>
              {language === "tr" ? "Başlık (Opsiyonel)" : "Title (Optional)"}
            </Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={language === "tr" ? "ör. Ev Kredisi..." : "e.g. Home Loan..."}
              placeholderTextColor={Colors.textTertiary}
            />

            {/* Currency */}
            <Text style={styles.label}>{language === "tr" ? "Para Birimi" : "Currency"}</Text>
            <CurrencyPicker value={loanCurrency} onChange={setLoanCurrency} />

            {/* Monthly Payment */}
            <Text style={styles.label}>
              {language === "tr" ? `Aylık Taksit Tutarı (${getCurrencySymbol(loanCurrency)})` : `Monthly Payment (${getCurrencySymbol(loanCurrency)})`}
              {calculatedMonthly !== null && !monthlyPayment && (
                <Text style={styles.calculatedHint}>
                  {" "}≈ {new Intl.NumberFormat("tr-TR").format(Math.round(calculatedMonthly))} {getCurrencySymbol(loanCurrency)}
                </Text>
              )}
            </Text>
            <View style={styles.inputRow}>
              <Text style={styles.currencyPrefix}>{getCurrencySymbol(loanCurrency)}</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={monthlyPayment}
                onChangeText={(v) => setMonthlyPayment(formatInputAmount(v))}
                keyboardType="decimal-pad"
                placeholder={
                  calculatedMonthly
                    ? new Intl.NumberFormat("tr-TR").format(Math.round(calculatedMonthly))
                    : "3.500"
                }
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            {/* Installment Count */}
            <Text style={styles.label}>
              {language === "tr" ? "Toplam Taksit Sayısı" : "Total Installments"}
            </Text>
            <TextInput
              style={styles.input}
              value={installmentCount}
              onChangeText={setInstallmentCount}
              keyboardType="number-pad"
              maxLength={3}
              placeholder={language === "tr" ? "ör. 36" : "e.g. 36"}
              placeholderTextColor={Colors.textTertiary}
            />

            {/* Installment Paid */}
            <Text style={styles.label}>
              {language === "tr" ? "Kaç Taksit Ödedin?" : "Installments Paid?"}
            </Text>
            <TextInput
              style={styles.input}
              value={installmentPaidInput}
              onChangeText={setInstallmentPaidInput}
              keyboardType="number-pad"
              maxLength={3}
              placeholder={language === "tr" ? "ör. 6" : "e.g. 6"}
              placeholderTextColor={Colors.textTertiary}
            />

            {/* Calculated remaining preview */}
            {calculatedRemaining !== null && (
              <View style={styles.remainingPreview}>
                <Ionicons name="calculator-outline" size={16} color={Colors.tint} />
                <Text style={styles.remainingPreviewText}>
                  {language === "tr" ? "Kalan borç:" : "Remaining:"}{" "}
                  <Text style={{ color: Colors.orange, fontFamily: "Inter_700Bold" }}>
                    {new Intl.NumberFormat("tr-TR").format(Math.round(calculatedRemaining))} {getCurrencySymbol(loanCurrency)}
                  </Text>
                  {!isNaN(parsedCount) && !isNaN(parsedPaid) && (
                    <Text style={{ color: Colors.textTertiary }}>
                      {" "}({parsedCount - Math.min(parsedPaid, parsedCount)} {language === "tr" ? "taksit kaldı" : "left"})
                    </Text>
                  )}
                </Text>
              </View>
            )}

            {/* Total Amount */}
            <Text style={styles.label}>
              {language === "tr" ? "Toplam Kredi Tutarı (Opsiyonel)" : "Total Loan Amount (Optional)"}
            </Text>
            <View style={styles.inputRow}>
              <Text style={styles.currencyPrefix}>{getCurrencySymbol(loanCurrency)}</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={totalAmount}
                onChangeText={(v) => setTotalAmount(formatInputAmount(v))}
                keyboardType="decimal-pad"
                placeholder="1.000.000"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            {/* Interest Rate */}
            <Text style={styles.label}>
              {language === "tr" ? "Yıllık Faiz Oranı % (Opsiyonel)" : "Annual Interest Rate % (Optional)"}
            </Text>
            <View style={styles.inputRow}>
              <Text style={styles.currencyPrefix}>%</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="decimal-pad"
                placeholder="36"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            {/* Payment Day */}
            <Text style={styles.label}>
              {language === "tr" ? "Ödeme Günü" : "Payment Day"}
            </Text>
            <TextInput
              style={styles.input}
              value={paymentDay}
              onChangeText={setPaymentDay}
              keyboardType="number-pad"
              maxLength={2}
            />

            <View style={styles.formButtons}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => { setShowForm(false); Haptics.selectionAsync(); }}
              >
                <Text style={styles.cancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveText}>{t("save")}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginTop: 12, marginBottom: 6 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.card2, alignItems: "center", justifyContent: "center" },
  content: { padding: 20 },
  section: { marginBottom: 12 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary, marginBottom: 10 },
  loanCard: { backgroundColor: Colors.background, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  loanCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  loanIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  loanInfo: { flex: 1 },
  loanTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  loanMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  loanRemaining: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  loanCardRight: { alignItems: "flex-end", gap: 2 },
  loanMonthly: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.orange },
  loanPerMonth: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  removeLoanBtn: { marginTop: 4, padding: 4 },
  payBtn: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.tint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginTop: 4 },
  payBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.background },
  installmentRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  installmentText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.orange },
  installmentRemaining: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: Colors.border, marginTop: 4, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  addToggleBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.orange + "60", backgroundColor: Colors.orange + "08" },
  addToggleText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.orange },
  form: { backgroundColor: Colors.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  formTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text, marginBottom: 4 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, marginBottom: 8, marginTop: 12 },
  calculatedHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.tint },
  typeChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  typeChipActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  typeChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.background },
  bankChips: { flexDirection: "row", gap: 8, paddingBottom: 4, paddingRight: 16 },
  bankChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  bankChipActive: { backgroundColor: Colors.orange + "20", borderColor: Colors.orange + "60" },
  bankChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  bankChipTextActive: { color: Colors.orange },
  input: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  currencyPrefix: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.orange },
  formButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  saveBtn: { flex: 1, backgroundColor: Colors.orange, borderRadius: 12, padding: 14, alignItems: "center" },
  saveText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.background },
  remainingPreview: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.tint + "10", borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: Colors.tint + "30" },
  remainingPreviewText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text, flex: 1 },
});
