import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useBudget, TURKISH_BANKS, INTERNATIONAL_BANKS, CARD_COLORS, CreditCard, CardPaymentPreference, formatInputAmount, parseInputAmount } from "@/context/BudgetContext";
import { CurrencyCode, getCurrencySymbol } from "@/lib/currency";
import CurrencyPicker from "@/components/CurrencyPicker";
import { useBusinessBudget } from "@/context/BusinessContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function fmt(n: number, sym: string = "₺"): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n) + " " + sym;
}

function UsageBar({ spent, limit, color }: { spent: number; limit: number; color: string }) {
  const pct = limit > 0 ? Math.min(1, spent / limit) : 0;
  const barColor = pct >= 0.9 ? Colors.red : pct >= 0.7 ? Colors.orange : pct >= 0.5 ? Colors.yellow : color;
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
    </View>
  );
}
const barStyles = StyleSheet.create({
  track: { height: 5, backgroundColor: Colors.border, borderRadius: 3, marginTop: 6 },
  fill: { height: 5, borderRadius: 3 },
});

export default function ManageCardsScreen() {
  const insets = useSafeAreaInsets();
  const { creditCards, addCreditCard, deleteCreditCard, updateCreditCard, spendingByCard, expenses, toTRY } = useBudget();
  const biz = useBusinessBudget();
  const { t, language } = useLanguage();
  const isEN = language === "en";

  const bankList = isEN ? INTERNATIONAL_BANKS : TURKISH_BANKS;
  const [bank, setBank] = useState(bankList[0]);
  const [customBankName, setCustomBankName] = useState("");
  const [cardName, setCardName] = useState("");
  const [limit, setLimit] = useState("");
  const [paymentDay, setPaymentDay] = useState("10");
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [cardCurrency, setCardCurrency] = useState<CurrencyCode>("TRY");
  const [showForm, setShowForm] = useState(creditCards.length === 0);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);

  const [debtModalCard, setDebtModalCard] = useState<CreditCard | null>(null);
  const [debtText, setDebtText] = useState("");
  const [limitText, setLimitText] = useState("");
  const [debtModalTab, setDebtModalTab] = useState<"debt" | "limit">("debt");
  const [cardDetailTab, setCardDetailTab] = useState<Record<string, "thisMonth" | "lastMonth" | "installments">>({});

  function handleAdd() {
    if (!cardName.trim()) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Please enter a card name." : "Kart adı girin.");
      return;
    }
    const parsedLimit = parseInputAmount(limit);
    if (limit && parsedLimit < 0) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Please enter a valid limit." : "Geçerli bir limit girin.");
      return;
    }
    const parsedDay = parseInt(paymentDay, 10);
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Payment day must be 1–31." : "Ödeme günü 1–31 arasında olmalı.");
      return;
    }
    if ((bank === "Diğer" || bank === "Other") && !customBankName.trim()) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Please enter a bank name." : "Banka adını girin.");
      return;
    }
    const finalBank = (bank === "Diğer" || bank === "Other") ? customBankName.trim() : bank;
    addCreditCard({
      bank: finalBank,
      name: cardName.trim(),
      limit: parsedLimit || 0,
      statementDay: Math.max(1, parsedDay - 10 > 0 ? parsedDay - 10 : 20),
      paymentDay: parsedDay,
      color,
      currency: cardCurrency,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCardName("");
    setLimit("");
    setShowForm(false);
  }

  function openDebtModal(card: CreditCard, tab: "debt" | "limit" = "debt") {
    setDebtModalCard(card);
    setDebtText(card.currentDebt ? formatInputAmount(String(card.currentDebt)) : "");
    setLimitText(card.limit ? formatInputAmount(String(card.limit)) : "");
    setDebtModalTab(tab);
    Haptics.selectionAsync();
  }

  function handleSave() {
    if (!debtModalCard) return;
    const debt = parseInputAmount(debtText);
    const lim = parseInputAmount(limitText);
    updateCreditCard({ ...debtModalCard, currentDebt: debt < 0 ? 0 : debt, limit: lim < 0 ? 0 : lim });
    setDebtModalCard(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleRemove(card: CreditCard) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      isEN ? "Remove Card" : "Kartı Sil",
      isEN ? `Remove ${card.bank} - ${card.name}?` : `${card.bank} - ${card.name} kartını silmek istiyor musunuz?`,
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: () => { deleteCreditCard(card.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
      ]
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.card }]}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>{t("creditCardsMenu")}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <View style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={Colors.textSecondary} />
          </View>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Existing Cards */}
        {creditCards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {isEN ? "Saved Cards" : "Kayıtlı Kartlar"}
            </Text>
            {creditCards.map((card) => {
              const familySpent = spendingByCard[card.id] ?? 0;
              const bizSpent = biz.linkedFamilyCardSpending[card.id] ?? 0;
              const spent = familySpent + bizSpent;
              const prevDebt = toTRY(card.currentDebt ?? 0, card.currency);
              const cardLimit = toTRY(card.limit ?? 0, card.currency);
              const totalSpent = spent + prevDebt;
              const remaining = cardLimit > 0 ? Math.max(0, cardLimit - totalSpent) : null;
              const isExpanded = selectedCard?.id === card.id;
              const nextMonthBill = spent + prevDebt;

              return (
                <Pressable
                  key={card.id}
                  style={[styles.cardItem, { borderLeftColor: card.color }]}
                  onPress={() => setSelectedCard(isExpanded ? null : card)}
                >
                  {/* Card Header */}
                  <View style={styles.cardRow}>
                    <View style={[styles.cardBankBadge, { backgroundColor: card.color + "20" }]}>
                      <Ionicons name="card" size={18} color={card.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardBank}>{card.bank}</Text>
                      <Text style={styles.cardName}>{card.name}</Text>
                    </View>
                    <View style={styles.cardRight}>
                      <Text style={styles.cardDay}>
                        {isEN ? `Due: ${card.paymentDay}th` : `Her ayın ${card.paymentDay}.`}
                      </Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={Colors.textTertiary}
                      />
                    </View>
                  </View>

                  {/* Spending Summary Row */}
                  <View style={styles.spendRow}>
                    <View style={styles.spendItem}>
                      <Text style={styles.spendLabel}>{isEN ? "This month" : "Bu ay"}</Text>
                      <Text style={[styles.spendValue, { color: spent > 0 ? Colors.red : Colors.textSecondary }]}>
                        {fmt(spent)}
                      </Text>
                    </View>
                    {prevDebt > 0 && (
                      <View style={styles.spendItem}>
                        <Text style={styles.spendLabel}>{isEN ? "Prev debt" : "Önceki borç"}</Text>
                        <Text style={[styles.spendValue, { color: Colors.orange }]}>{fmt(prevDebt)}</Text>
                      </View>
                    )}
                    <View style={styles.spendItem}>
                      <Text style={styles.spendLabel}>{isEN ? "Total due" : "Toplam borç"}</Text>
                      <Text style={[styles.spendValue, { color: nextMonthBill > 0 ? Colors.purple : Colors.textSecondary }]}>
                        {fmt(nextMonthBill)}
                      </Text>
                    </View>
                    {cardLimit > 0 && remaining !== null && (
                      <View style={styles.spendItem}>
                        <Text style={styles.spendLabel}>{isEN ? "Remaining" : "Kalan limit"}</Text>
                        <Text style={[styles.spendValue, { color: remaining < cardLimit * 0.2 ? Colors.red : Colors.green }]}>
                          {fmt(remaining)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Limit usage bar */}
                  {cardLimit > 0 && (
                    <View style={styles.limitRow}>
                      <Text style={styles.limitText}>
                        {fmt(totalSpent, getCurrencySymbol(card.currency || "TRY"))} / {fmt(cardLimit, getCurrencySymbol(card.currency || "TRY"))} {isEN ? "limit" : "limit"}
                        {" · "}{Math.round((totalSpent / cardLimit) * 100)}%
                      </Text>
                      <UsageBar spent={totalSpent} limit={cardLimit} color={card.color} />
                    </View>
                  )}

                  {/* Expanded detail */}
                  {isExpanded && (() => {
                    const now = new Date();
                    const thisYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastYM = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}`;
                    const familyCardExpenses = expenses.filter((e) => e.creditCardId === card.id && e.paymentMethod === "credit");
                    const bizCardExpenses = biz.getExpensesForLinkedFamilyCard(card.id).map((be) => ({
                      id: be.id,
                      title: `🏢 ${be.title}`,
                      amount: be.amount,
                      category: be.category,
                      subcategory: "",
                      date: be.date,
                      paymentMethod: "credit" as const,
                      creditCardId: card.id,
                      memberOwner: "self",
                      memberOwnerName: isEN ? "Business" : "İş Yeri",
                      isInstallment: be.isInstallment ?? false,
                      installmentCount: be.installmentCount,
                    }));
                    const cardExpenses = [...familyCardExpenses, ...bizCardExpenses];
                    const thisMonthExp = cardExpenses.filter((e) => e.date.startsWith(thisYM));
                    const lastMonthExp = cardExpenses.filter((e) => e.date.startsWith(lastYM));
                    const installmentsExp = cardExpenses.filter((e) => e.isInstallment === true);
                    const activeTab = cardDetailTab[card.id] ?? "thisMonth";
                    const tabExpenses = activeTab === "thisMonth" ? thisMonthExp : activeTab === "lastMonth" ? lastMonthExp : installmentsExp;

                    return (
                      <View style={styles.expandedDetail}>
                        <View style={styles.detailDivider} />

                        {/* ── Ödeme Özeti ─────────────────────────────── */}
                        <View style={styles.paymentSummaryCard}>
                          <View style={styles.paymentSummaryHeader}>
                            <Ionicons name="calendar-outline" size={14} color={Colors.purple} />
                            <Text style={styles.paymentSummaryTitle}>
                              {isEN
                                ? `Payment due on the ${card.paymentDay}th`
                                : `Her ayın ${card.paymentDay}. günü ödeme`}
                            </Text>
                          </View>

                          {/* Breakdown rows */}
                          <View style={styles.payBreakdown}>
                            <View style={styles.payBreakRow}>
                              <Text style={styles.payBreakLabel}>
                                {isEN ? "New spending (this month)" : "Bu ay yeni harcama"}
                              </Text>
                              <Text style={[styles.payBreakValue, { color: Colors.red }]}>{fmt(spent)}</Text>
                            </View>

                            {prevDebt > 0 && (
                              <View style={styles.payBreakRow}>
                                <View style={styles.payBreakLabelRow}>
                                  <Ionicons name="alert-circle-outline" size={12} color={Colors.orange} />
                                  <Text style={[styles.payBreakLabel, { color: Colors.orange }]}>
                                    {isEN ? "Carried over from previous month" : "Önceki aydan devir borç"}
                                  </Text>
                                </View>
                                <Text style={[styles.payBreakValue, { color: Colors.orange }]}>{fmt(prevDebt)}</Text>
                              </View>
                            )}

                            <View style={[styles.payBreakRow, styles.payBreakTotal]}>
                              <Text style={styles.payBreakTotalLabel}>
                                {isEN ? "Total amount due" : "Toplam ödenmesi gereken"}
                              </Text>
                              <Text style={[styles.payBreakTotalValue, { color: Colors.purple }]}>
                                {fmt(nextMonthBill)}
                              </Text>
                            </View>
                          </View>

                          {nextMonthBill > 0 && (
                            <View>
                              <Text style={styles.payPrefTitle}>
                                {isEN ? "Payment Plan" : "Ödeme Planı"}
                              </Text>
                              <View style={styles.payPrefRow}>
                                {([
                                  { key: "full" as CardPaymentPreference, label: isEN ? "Full" : "Tam", icon: "checkmark-circle" as const, color: Colors.tint, amount: nextMonthBill, note: isEN ? "No interest" : "Faiz yok" },
                                  { key: "minimum" as CardPaymentPreference, label: isEN ? "Min (20%)" : "Asgari (%20)", icon: "remove-circle" as const, color: Colors.orange, amount: Math.ceil(nextMonthBill * 0.20), note: isEN ? "Interest accrues" : "Faiz işler" },
                                  { key: "percentage" as CardPaymentPreference, label: isEN ? "%" : "%", icon: "pie-chart" as const, color: "#5856D6", amount: Math.ceil(nextMonthBill * ((card.paymentPercentage ?? 50) / 100)), note: `%${card.paymentPercentage ?? 50}` },
                                  { key: "custom" as CardPaymentPreference, label: isEN ? "Custom" : "Özel", icon: "create" as const, color: Colors.purple, amount: card.customPaymentAmount ?? 0, note: isEN ? "Set amount" : "Tutar belirle" },
                                ] as const).map((opt) => {
                                  const isActive = (card.paymentPreference ?? "full") === opt.key;
                                  return (
                                    <Pressable
                                      key={opt.key}
                                      style={[styles.payPrefCard, isActive && { borderColor: opt.color, backgroundColor: opt.color + "15" }]}
                                      onPress={() => {
                                        if (opt.key === "custom" || opt.key === "percentage") {
                                          updateCreditCard({ ...card, paymentPreference: opt.key });
                                          Haptics.selectionAsync();
                                        } else {
                                          Alert.alert(
                                            isEN ? "Confirm Payment Plan" : "Ödeme Planını Onayla",
                                            isEN
                                              ? `Pay ${fmt(opt.amount)} (${opt.label}) for ${card.bank} - ${card.name}?`
                                              : `${card.bank} - ${card.name} için ${fmt(opt.amount)} (${opt.label}) ödemek istediğinize emin misiniz?`,
                                            [
                                              { text: isEN ? "Cancel" : "İptal", style: "cancel" },
                                              {
                                                text: isEN ? "Confirm" : "Onayla",
                                                onPress: () => {
                                                  updateCreditCard({ ...card, paymentPreference: opt.key });
                                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                },
                                              },
                                            ]
                                          );
                                        }
                                      }}
                                    >
                                      <Ionicons name={opt.icon} size={18} color={isActive ? opt.color : Colors.textSecondary} />
                                      <Text style={[styles.payPrefLabel, isActive && { color: opt.color }]}>{opt.label}</Text>
                                      <Text style={[styles.payPrefAmt, isActive && { color: opt.color }]}>{fmt(opt.amount)}</Text>
                                      <Text style={styles.payPrefNote}>{opt.note}</Text>
                                    </Pressable>
                                  );
                                })}
                              </View>
                              {(card.paymentPreference === "percentage") && (
                                <View style={styles.customPayRow}>
                                  <Text style={styles.customPayLabel}>{isEN ? "Payment percentage:" : "Ödeme yüzdesi:"}</Text>
                                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 }}>
                                    {[25, 30, 40, 50, 60, 75].map((pct) => {
                                      const isActive = (card.paymentPercentage ?? 50) === pct;
                                      return (
                                        <Pressable
                                          key={pct}
                                          style={[styles.pctChip, isActive && styles.pctChipActive]}
                                          onPress={() => {
                                            Alert.alert(
                                              isEN ? "Confirm" : "Onayla",
                                              isEN
                                                ? `Pay ${pct}% (${fmt(Math.ceil(nextMonthBill * pct / 100))}) of your bill?`
                                                : `Faturanın %${pct}'ini (${fmt(Math.ceil(nextMonthBill * pct / 100))}) ödemek istediğinize emin misiniz?`,
                                              [
                                                { text: isEN ? "Cancel" : "İptal", style: "cancel" },
                                                {
                                                  text: isEN ? "Confirm" : "Onayla",
                                                  onPress: () => {
                                                    updateCreditCard({ ...card, paymentPreference: "percentage", paymentPercentage: pct });
                                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                  },
                                                },
                                              ]
                                            );
                                          }}
                                        >
                                          <Text style={[styles.pctChipText, isActive && styles.pctChipTextActive]}>%{pct}</Text>
                                        </Pressable>
                                      );
                                    })}
                                  </View>
                                </View>
                              )}
                              {(card.paymentPreference === "custom") && (
                                <View style={styles.customPayRow}>
                                  <Text style={styles.customPayLabel}>{isEN ? "Payment amount:" : "Ödeme tutarı:"}</Text>
                                  <TextInput
                                    style={styles.customPayInput}
                                    keyboardType="numeric"
                                    value={card.customPaymentAmount ? formatInputAmount(String(card.customPaymentAmount)) : ""}
                                    onChangeText={(v) => {
                                      const parsed = parseInputAmount(v);
                                      updateCreditCard({ ...card, paymentPreference: "custom", customPaymentAmount: parsed > 0 ? Math.min(parsed, nextMonthBill) : 0 });
                                    }}
                                    placeholder={isEN ? "Enter amount" : "Tutar girin"}
                                    placeholderTextColor={Colors.textSecondary}
                                  />
                                </View>
                              )}
                            </View>
                          )}
                        </View>

                        {/* Info rows */}
                        {[
                          { label: isEN ? "Bank" : "Banka", value: card.bank },
                          { label: isEN ? "Card Name" : "Kart Adı", value: card.name },
                          cardLimit > 0 ? { label: isEN ? "Credit Limit" : "Kredi Limiti", value: fmt(cardLimit) } : null,
                          cardLimit > 0 && remaining !== null ? { label: isEN ? "Remaining Credit" : "Kullanılabilir Limit", value: fmt(remaining), valueColor: remaining < cardLimit * 0.2 ? Colors.red : Colors.green } : null,
                        ].filter(Boolean).map((row: any, i) => (
                          <View key={i} style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{row.label}</Text>
                            <Text style={[styles.detailValue, row.valueColor ? { color: row.valueColor } : {}]}>
                              {row.value}
                            </Text>
                          </View>
                        ))}

                        {/* Action buttons */}
                        <Pressable
                          style={[styles.addExpenseBtn, { borderColor: Colors.tint + "50", backgroundColor: Colors.tint + "15" }]}
                          onPress={() => router.push({ pathname: "/add-expense", params: { cardId: card.id } })}
                        >
                          <Ionicons name="add-circle-outline" size={16} color={Colors.tint} />
                          <Text style={[styles.addExpenseBtnText, { color: Colors.tint }]}>
                            {isEN ? "Add Expense to This Card" : "Bu Karta Harcama Ekle"}
                          </Text>
                        </Pressable>

                        <View style={styles.actionBtns}>
                          <Pressable
                            style={[styles.actionBtn, { borderColor: Colors.orange + "60" }]}
                            onPress={() => openDebtModal(card, "debt")}
                          >
                            <Ionicons name="alert-circle-outline" size={15} color={Colors.orange} />
                            <Text style={[styles.actionBtnText, { color: Colors.orange }]}>
                              {isEN ? "Edit Debt" : "Borç Düzenle"}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.actionBtn, { borderColor: Colors.blue + "60" }]}
                            onPress={() => openDebtModal(card, "limit")}
                          >
                            <Ionicons name="resize-outline" size={15} color={Colors.blue} />
                            <Text style={[styles.actionBtnText, { color: Colors.blue }]}>
                              {isEN ? "Edit Limit" : "Limit Düzenle"}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.actionBtn, { borderColor: Colors.red + "60" }]}
                            onPress={() => handleRemove(card)}
                          >
                            <Ionicons name="trash-outline" size={15} color={Colors.red} />
                            <Text style={[styles.actionBtnText, { color: Colors.red }]}>
                              {isEN ? "Delete" : "Sil"}
                            </Text>
                          </Pressable>
                        </View>

                        {/* Expense History Tabs */}
                        <View style={styles.expTabSection}>
                          <View style={styles.expTabRow}>
                            {(["thisMonth", "lastMonth", "installments"] as const).map((tab) => {
                              const labels: Record<string, string[]> = {
                                thisMonth:    [isEN ? "This Month" : "Bu Ay",        String(thisMonthExp.length)],
                                lastMonth:    [isEN ? "Last Month" : "Geçen Ay",     String(lastMonthExp.length)],
                                installments: [isEN ? "Installments" : "Taksitli",   String(installmentsExp.length)],
                              };
                              const isActive = activeTab === tab;
                              return (
                                <Pressable
                                  key={tab}
                                  style={[styles.expTab, isActive && { borderBottomColor: card.color, borderBottomWidth: 2 }]}
                                  onPress={() => { setCardDetailTab((prev) => ({ ...prev, [card.id]: tab })); Haptics.selectionAsync(); }}
                                >
                                  <Text style={[styles.expTabText, isActive && { color: card.color, fontFamily: "Inter_600SemiBold" }]}>
                                    {labels[tab][0]}
                                  </Text>
                                  {Number(labels[tab][1]) > 0 && (
                                    <View style={[styles.expTabBadge, { backgroundColor: isActive ? card.color : Colors.textTertiary }]}>
                                      <Text style={styles.expTabBadgeText}>{labels[tab][1]}</Text>
                                    </View>
                                  )}
                                </Pressable>
                              );
                            })}
                          </View>

                          {tabExpenses.length === 0 ? (
                            <Text style={styles.expEmpty}>
                              {activeTab === "installments"
                                ? (isEN ? "No installment expenses for this card." : "Bu karta ait taksitli harcama yok.")
                                : (isEN ? "No expenses found for this period." : "Bu dönemde harcama bulunamadı.")}
                            </Text>
                          ) : (
                            tabExpenses
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((exp) => (
                                <View key={exp.id} style={styles.expRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.expTitle}>{exp.title}</Text>
                                    <Text style={styles.expMeta}>
                                      {exp.category}
                                      {exp.memberOwner && exp.memberOwner !== "shared" ? ` · ${exp.memberOwnerName || (exp.memberOwner === "self" ? (isEN ? "Me" : "Ben") : (exp.memberOwner.startsWith("custom_") ? exp.memberOwner.replace("custom_", "") : (isEN ? "Member" : "Üye")))}` : ""}
                                      {exp.isInstallment && exp.installmentCount ? ` · ${exp.installmentCount}x taksit` : ""}
                                    </Text>
                                  </View>
                                  <View style={{ alignItems: "flex-end" }}>
                                    <Text style={[styles.expAmount, { color: Colors.red }]}>{fmt(exp.amount, getCurrencySymbol(exp.currency || "TRY"))}</Text>
                                    <Text style={styles.expDate}>{exp.date}</Text>
                                  </View>
                                </View>
                              ))
                          )}

                          {tabExpenses.length > 0 && (
                            <View style={styles.expTotal}>
                              <Text style={styles.expTotalLabel}>{isEN ? "Total" : "Toplam"}</Text>
                              <Text style={[styles.expTotalValue, { color: Colors.red }]}>
                                {fmt(tabExpenses.reduce((s, e) => s + toTRY(e.amount, e.currency), 0))}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })()}
                </Pressable>
              );
            })}

            {/* Summary card */}
            {creditCards.length > 1 && (() => {
              const totalSpent = creditCards.reduce((s, c) => s + (spendingByCard[c.id] ?? 0) + (biz.linkedFamilyCardSpending[c.id] ?? 0), 0);
              const totalPrevDebt = creditCards.reduce((s, c) => s + toTRY(c.currentDebt ?? 0, c.currency), 0);
              const totalNextBill = totalSpent + totalPrevDebt;
              const totalPlannedPayment = creditCards.reduce((s, c) => {
                const due = (spendingByCard[c.id] ?? 0) + (biz.linkedFamilyCardSpending[c.id] ?? 0) + toTRY(c.currentDebt ?? 0, c.currency);
                if (due <= 0) return s;
                const pref = c.paymentPreference ?? "full";
                if (pref === "full") return s + due;
                if (pref === "minimum") return s + Math.ceil(due * 0.20);
                if (pref === "percentage") return s + Math.ceil(due * ((c.paymentPercentage ?? 100) / 100));
                return s + Math.min(toTRY(c.customPaymentAmount ?? due, c.currency), due);
              }, 0);
              return (
                <View style={styles.summaryCard}>
                  <Ionicons name="card-outline" size={16} color={Colors.purple} />
                  <Text style={styles.summaryTitle}>
                    {isEN ? "Total — All Cards" : "Tüm Kartlar Toplamı"}
                  </Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>{isEN ? "Spent" : "Harcandı"}</Text>
                      <Text style={[styles.summaryValue, { color: Colors.red }]}>{fmt(totalSpent)}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>{isEN ? "Total Due" : "Toplam Borç"}</Text>
                      <Text style={[styles.summaryValue, { color: Colors.purple }]}>{fmt(totalNextBill)}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>{isEN ? "Planned Pay" : "Planlanan Ödeme"}</Text>
                      <Text style={[styles.summaryValue, { color: Colors.tint }]}>{fmt(totalPlannedPayment)}</Text>
                    </View>
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        {/* Add Card Toggle */}
        {!showForm && (
          <Pressable
            style={styles.addToggleBtn}
            onPress={() => { setShowForm(true); Haptics.selectionAsync(); }}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.purple} />
            <Text style={styles.addToggleText}>
              {isEN ? "Add New Card" : "Yeni Kart Ekle"}
            </Text>
          </Pressable>
        )}

        {/* Add Card Form */}
        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {isEN ? "Add New Card" : "Yeni Kart Ekle"}
            </Text>

            <Text style={styles.label}>{isEN ? "Bank" : "Banka"}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankChips}>
              {bankList.map((b) => (
                <Pressable key={b} style={[styles.bankChip, bank === b && styles.bankChipActive]} onPress={() => { setBank(b); Haptics.selectionAsync(); }}>
                  <Text style={[styles.bankChipText, bank === b && styles.bankChipTextActive]}>{b}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {(bank === "Diğer" || bank === "Other") && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={customBankName}
                onChangeText={setCustomBankName}
                placeholder={isEN ? "Enter bank name..." : "Banka adını yazın..."}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="words"
              />
            )}

            <Text style={styles.label}>{isEN ? "Card Name" : "Kart Adı"}</Text>
            <TextInput
              style={styles.input}
              value={cardName}
              onChangeText={setCardName}
              placeholder={isEN ? "e.g. Rewards, Miles..." : "ör. Bonus, Miles..."}
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.label}>{isEN ? "Currency" : "Para Birimi"}</Text>
            <CurrencyPicker value={cardCurrency} onChange={setCardCurrency} />

            <Text style={styles.label}>{isEN ? "Credit Limit (Optional)" : "Kredi Limiti (Opsiyonel)"}</Text>
            <View style={styles.inputRow}>
              <Text style={styles.currencyPrefix}>{getCurrencySymbol(cardCurrency)}</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={limit}
                onChangeText={(v) => setLimit(formatInputAmount(v))}
                placeholder="50.000"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.label}>{isEN ? "Payment Day (1–31)" : "Ödeme Günü (1–31)"}</Text>
            <TextInput
              style={styles.input}
              value={paymentDay}
              onChangeText={setPaymentDay}
              keyboardType="number-pad"
              maxLength={2}
            />

            <Text style={styles.label}>{isEN ? "Card Color" : "Kart Rengi"}</Text>
            <View style={styles.colorRow}>
              {CARD_COLORS.map((c) => (
                <Pressable key={c} style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]} onPress={() => { setColor(c); Haptics.selectionAsync(); }}>
                  {color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                </Pressable>
              ))}
            </View>

            <View style={[styles.cardPreview, { borderLeftColor: color, borderLeftWidth: 4 }]}>
              <View style={[styles.cardPreviewDot, { backgroundColor: color }]} />
              <Text style={styles.cardPreviewBank}>{bank}</Text>
              <Text style={styles.cardPreviewName}>{cardName || (isEN ? "Card Name" : "Kart Adı")}</Text>
            </View>

            <View style={styles.formButtons}>
              <Pressable style={styles.cancelBtn} onPress={() => { setShowForm(false); Haptics.selectionAsync(); }}>
                <Text style={styles.cancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveText}>{t("save")}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Debt / Limit Edit Modal */}
      <Modal visible={debtModalCard !== null} transparent animationType="fade" onRequestClose={() => setDebtModalCard(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDebtModalCard(null)}>
          <Pressable style={styles.debtModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.debtModalTitle}>
              {isEN ? "Edit Card" : "Kart Düzenle"}
            </Text>
            {debtModalCard && (
              <Text style={styles.debtModalSub}>{debtModalCard.bank} – {debtModalCard.name}</Text>
            )}

            {/* Tab */}
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, debtModalTab === "debt" && styles.tabActive]}
                onPress={() => setDebtModalTab("debt")}
              >
                <Text style={[styles.tabText, debtModalTab === "debt" && styles.tabTextActive]}>
                  {isEN ? "Carried-Over Debt" : "Devir Borç"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, debtModalTab === "limit" && styles.tabActive]}
                onPress={() => setDebtModalTab("limit")}
              >
                <Text style={[styles.tabText, debtModalTab === "limit" && styles.tabTextActive]}>
                  {isEN ? "Credit Limit" : "Kredi Limiti"}
                </Text>
              </Pressable>
            </View>

            {debtModalTab === "debt" ? (
              <>
                <Text style={styles.debtModalHint}>
                  {isEN
                    ? "Enter the balance carried over from your previous statement. This will be added to this month's new spending to calculate your total payment due."
                    : "Önceki dönem ekstrenizdeki devir borcunu girin. Bu tutar, bu ayki yeni harcamalarınıza eklenerek ödeme tarihindeki toplam borcunuz hesaplanır."}
                </Text>
                <View style={styles.debtInputRow}>
                  <Text style={styles.debtCurrency}>{getCurrencySymbol(debtModalCard?.currency || "TRY")}</Text>
                  <TextInput
                    style={styles.debtInput}
                    value={debtText}
                    onChangeText={(v) => setDebtText(formatInputAmount(v))}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="decimal-pad"
                    autoFocus={debtModalTab === "debt"}
                    onSubmitEditing={handleSave}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.debtModalHint}>
                  {isEN ? "Total credit limit for this card." : "Bu kartın toplam kredi limiti."}
                </Text>
                <View style={styles.debtInputRow}>
                  <Text style={styles.debtCurrency}>{getCurrencySymbol(debtModalCard?.currency || "TRY")}</Text>
                  <TextInput
                    style={styles.debtInput}
                    value={limitText}
                    onChangeText={(v) => setLimitText(formatInputAmount(v))}
                    placeholder="50.000"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="decimal-pad"
                    autoFocus={debtModalTab === "limit"}
                    onSubmitEditing={handleSave}
                  />
                </View>
              </>
            )}

            <View style={styles.debtModalBtns}>
              <Pressable style={styles.debtCancelBtn} onPress={() => setDebtModalCard(null)}>
                <Text style={styles.debtCancelText}>{isEN ? "Cancel" : "Vazgeç"}</Text>
              </Pressable>
              <Pressable style={styles.debtSaveBtn} onPress={handleSave}>
                <Text style={styles.debtSaveText}>{isEN ? "Save" : "Kaydet"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
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
  content: { padding: 16, gap: 8 },
  section: { gap: 8 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },

  cardItem: {
    backgroundColor: Colors.background, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardBankBadge: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardBank: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  cardName: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  cardDay: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },

  spendRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  spendItem: { flex: 1, minWidth: 70 },
  spendLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary },
  spendValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text, marginTop: 2 },

  limitRow: { marginTop: 6 },
  limitText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },

  expandedDetail: { marginTop: 12 },
  detailDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  detailTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  detailLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  detailValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },

  addExpenseBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 12, marginBottom: 4,
  },
  addExpenseBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  actionBtns: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    borderRadius: 10, borderWidth: 1, paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  actionBtnText: { fontFamily: "Inter_500Medium", fontSize: 12 },

  summaryCard: {
    backgroundColor: Colors.card2, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  summaryTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary },
  summaryValue: { fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 2 },

  addToggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, padding: 16,
    borderRadius: 14, borderWidth: 1, borderStyle: "dashed",
    borderColor: Colors.purple + "60", backgroundColor: Colors.purple + "08",
  },
  addToggleText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.purple },
  form: { backgroundColor: Colors.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  formTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text, marginBottom: 12 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, marginBottom: 8, marginTop: 12 },
  bankChips: { flexDirection: "row", gap: 8, paddingBottom: 4, paddingRight: 16 },
  bankChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  bankChipActive: { backgroundColor: Colors.purple + "20", borderColor: Colors.purple + "60" },
  bankChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  bankChipTextActive: { color: Colors.purple },
  input: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  currencyPrefix: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.purple },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  colorDotActive: { borderWidth: 2, borderColor: Colors.text },
  cardPreview: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  cardPreviewDot: { width: 10, height: 10, borderRadius: 5 },
  cardPreviewBank: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  cardPreviewName: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1 },
  formButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  saveBtn: { flex: 1, backgroundColor: Colors.purple, borderRadius: 12, padding: 14, alignItems: "center" },
  saveText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  debtModal: { backgroundColor: Colors.card, borderRadius: 20, width: 320, padding: 24, gap: 10, borderWidth: 1, borderColor: Colors.border },
  debtModalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  debtModalSub: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
  tabRow: { flexDirection: "row", backgroundColor: Colors.background, borderRadius: 10, padding: 3, gap: 2 },
  tab: { flex: 1, borderRadius: 8, padding: 8, alignItems: "center" },
  tabActive: { backgroundColor: Colors.card2 },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textTertiary },
  tabTextActive: { color: Colors.text },
  debtModalHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary, lineHeight: 18 },
  debtInputRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  debtCurrency: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.orange },
  debtInput: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text },
  debtModalBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  debtCancelBtn: { flex: 1, backgroundColor: Colors.background, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  debtCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  debtSaveBtn: { flex: 1, backgroundColor: Colors.orange, borderRadius: 12, padding: 14, alignItems: "center" },
  debtSaveText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.background },

  // Payment summary card
  paymentSummaryCard: {
    backgroundColor: Colors.card2, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  paymentSummaryHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  paymentSummaryTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.purple },
  payBreakdown: { gap: 0 },
  payBreakRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.border + "60",
  },
  payBreakLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  payBreakLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1 },
  payBreakValue: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  payBreakTotal: {
    borderBottomWidth: 0, marginTop: 4, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: Colors.purple + "30",
  },
  payBreakTotalLabel: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.text },
  payBreakTotalValue: { fontFamily: "Inter_700Bold", fontSize: 16 },
  payAmtRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  payAmtCard: {
    flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 4,
  },
  payAmtLabel: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  payAmtValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  payAmtNote: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary, textAlign: "center" },
  payPrefTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text, marginTop: 14, marginBottom: 8,
  },
  payPrefRow: { flexDirection: "row", gap: 6 },
  payPrefCard: {
    flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.card, padding: 6, alignItems: "center", gap: 2,
  },
  payPrefLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  payPrefAmt: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.text, textAlign: "center" },
  payPrefNote: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textTertiary, textAlign: "center" },
  customPayRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10,
    backgroundColor: Colors.card2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  customPayLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  customPayInput: {
    flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text,
    backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },

  pctChip: {
    borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.card, paddingHorizontal: 12, paddingVertical: 6,
  },
  pctChipActive: {
    borderColor: "#5856D6", backgroundColor: "#5856D615",
  },
  pctChipText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  pctChipTextActive: { color: "#5856D6" },

  expTabSection: { marginTop: 14, gap: 8 },
  expTabRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  expTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  expTabText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textTertiary },
  expTabBadge: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: "center" },
  expTabBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
  expEmpty: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textTertiary, textAlign: "center", paddingVertical: 16 },
  expRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border + "60",
  },
  expTitle: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text },
  expMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  expAmount: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  expDate: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textTertiary, marginTop: 1 },
  expTotal: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  expTotalLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  expTotalValue: { fontFamily: "Inter_700Bold", fontSize: 15 },
});
