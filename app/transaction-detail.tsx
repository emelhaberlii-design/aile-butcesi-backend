import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useBudget, Expense, Income } from "@/context/BudgetContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { localizeCategory } from "@/lib/categories";
import { getCurrencySymbol } from "@/lib/currency";

function formatAmount(amount: number, currencySymbol: string = "₺"): string {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " " + currencySymbol;
}

function formatFullDate(dateStr: string, language: string): string {
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TransactionDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const { incomes, expenses, creditCards } = useBudget();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isEN = language === "en";

  const isIncome = type === "income";
  const tx: Income | Expense | undefined = isIncome
    ? incomes.find((i) => i.id === id)
    : expenses.find((e) => e.id === id);

  if (!tx) {
    return (
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>{isEN ? "Transaction not found" : "İşlem bulunamadı"}</Text>
        </View>
      </View>
    );
  }

  const expense = !isIncome ? (tx as Expense) : null;
  const color = isIncome ? Colors.green : Colors.red;

  function getPaymentLabel(): string {
    if (isIncome) return isEN ? "Income" : "Gelir";
    if (!expense) return "";
    if (expense.paymentMethod === "credit") {
      const card = creditCards.find((c) => c.id === expense.creditCardId);
      return card ? `${card.bank} - ${card.name}` : (isEN ? "Credit Card" : "Kredi Kartı");
    }
    if (expense.paymentMethod === "debit") return isEN ? "Bank/Debit Card" : "Banka Kartı";
    return isEN ? "Cash" : "Nakit";
  }

  function getPaymentIcon(): keyof typeof Ionicons.glyphMap {
    if (isIncome) return "arrow-down-circle";
    if (!expense) return "cash-outline";
    if (expense.paymentMethod === "credit") return "card";
    if (expense.paymentMethod === "debit") return "card-outline";
    return "cash-outline";
  }

  function getMemberName(): string | null {
    const owner = tx!.memberOwner;
    if (!owner || owner === "shared") return null;
    if (tx!.memberOwnerName) return tx!.memberOwnerName;
    if (owner === "self") return user?.name?.split(" ")[0] || (isEN ? "Me" : "Ben");
    if (owner.startsWith("custom_")) return owner.replace("custom_", "");
    return isEN ? "Member" : "Üye";
  }

  const memberName = getMemberName();

  const rows: { icon: keyof typeof Ionicons.glyphMap; iconColor: string; label: string; value: string }[] = [];

  rows.push({
    icon: "pricetag",
    iconColor: Colors.tint,
    label: isEN ? "Amount" : "Tutar",
    value: `${isIncome ? "+" : "-"}${formatAmount(tx.amount, getCurrencySymbol(tx.currency || "TRY"))}`,
  });

  rows.push({
    icon: "calendar",
    iconColor: Colors.blue,
    label: isEN ? "Date" : "Tarih",
    value: formatFullDate(tx.date, language),
  });

  rows.push({
    icon: "folder",
    iconColor: Colors.orange,
    label: isEN ? "Category" : "Kategori",
    value: isIncome
      ? localizeCategory(tx.category, language)
      : `${localizeCategory(tx.category, language)} › ${localizeCategory((tx as Expense).subcategory, language)}`,
  });

  if (expense?.brand) {
    rows.push({
      icon: "bookmark",
      iconColor: Colors.purple,
      label: isEN ? "Brand" : "Marka",
      value: expense.brand,
    });
  }

  rows.push({
    icon: getPaymentIcon(),
    iconColor: isIncome ? Colors.green : Colors.yellow,
    label: isEN ? "Payment Method" : "Ödeme Yöntemi",
    value: getPaymentLabel(),
  });

  if (memberName) {
    rows.push({
      icon: "person",
      iconColor: Colors.purple,
      label: isEN ? "Person" : "Kişi",
      value: memberName,
    });
  }

  if (expense?.isInstallment && expense.installmentCount && expense.installmentCount > 1) {
    rows.push({
      icon: "layers",
      iconColor: Colors.orange,
      label: isEN ? "Installments" : "Taksit",
      value: `${expense.installmentCurrent || 1}/${expense.installmentCount}`,
    });
    rows.push({
      icon: "calculator",
      iconColor: Colors.red,
      label: isEN ? "Total Installment Cost" : "Toplam Taksit Tutarı",
      value: formatAmount(tx.amount * expense.installmentCount, getCurrencySymbol(tx.currency || "TRY")),
    });
  }

  if (tx.isRecurring) {
    const freqLabel = tx.recurringFrequency === "daily"
      ? (isEN ? "Daily" : "Günlük")
      : tx.recurringFrequency === "weekly"
        ? (isEN ? "Weekly" : "Haftalık")
        : (isEN ? "Monthly" : "Aylık");
    rows.push({
      icon: "repeat",
      iconColor: Colors.tint,
      label: isEN ? "Recurring" : "Tekrarlayan",
      value: freqLabel,
    });
  }

  if (tx.creatorName) {
    rows.push({
      icon: "create",
      iconColor: Colors.textSecondary,
      label: isEN ? "Added By" : "Ekleyen",
      value: tx.creatorName,
    });
  }

  if (tx.note) {
    rows.push({
      icon: "document-text",
      iconColor: Colors.textSecondary,
      label: isEN ? "Note" : "Not",
      value: tx.note,
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.handle} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerBadge, { backgroundColor: color + "15" }]}>
          <Ionicons name={isIncome ? "arrow-down-circle" : "arrow-up-circle"} size={36} color={color} />
          <Text style={[styles.headerType, { color }]}>{isIncome ? (isEN ? "INCOME" : "GELİR") : (isEN ? "EXPENSE" : "GİDER")}</Text>
        </View>

        <Text style={styles.title}>{tx.title}</Text>
        <Text style={[styles.amount, { color }]}>{isIncome ? "+" : "-"}{formatAmount(tx.amount, getCurrencySymbol(tx.currency || "TRY"))}</Text>
        <Text style={styles.dateSubtitle}>{formatFullDate(tx.date, language)}</Text>

        <View style={styles.card}>
          {rows.map((row, idx) => (
            <View key={idx} style={[styles.detailRow, idx < rows.length - 1 && styles.rowDivider]}>
              <View style={styles.detailLeft}>
                <View style={[styles.detailIcon, { backgroundColor: row.iconColor + "20" }]}>
                  <Ionicons name={row.icon} size={16} color={row.iconColor} />
                </View>
                <Text style={styles.detailLabel}>{row.label}</Text>
              </View>
              <Text
                style={[
                  styles.detailValue,
                  row.label === (isEN ? "Amount" : "Tutar") && { color, fontFamily: "Inter_700Bold" as const },
                ]}
                numberOfLines={2}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          style={styles.editBtn}
          onPress={() => {
            router.back();
            setTimeout(() => {
              if (isIncome) {
                router.push({ pathname: "/add-income", params: { editId: tx.id } });
              } else {
                router.push({ pathname: "/add-expense", params: { editId: tx.id } });
              }
            }, 300);
          }}
        >
          <Ionicons name="create-outline" size={18} color={Colors.text} />
          <Text style={styles.editBtnText}>{isEN ? "Edit" : "Düzenle"}</Text>
        </Pressable>

        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>{isEN ? "Close" : "Kapat"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === "web" ? 54 : 40,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  headerType: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    letterSpacing: 1,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  amount: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 4,
  },
  dateSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    textAlign: "right",
    maxWidth: "50%",
  },
  editBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.tint + "18",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.tint + "40",
  },
  editBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  closeBtn: {
    marginTop: 10,
    backgroundColor: Colors.card2,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
