import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import {
  useSavingsGoals,
  SavingsTarget,
  GoalCurrency,
} from "@/context/SavingsGoalsContext";
import { useBudget, formatInputAmount, parseInputAmount } from "@/context/BudgetContext";
import { useLanguage } from "@/context/LanguageContext";

const CURRENCY_META: Record<GoalCurrency, { label: string; symbol: string; color: string }> = {
  TL:        { label: "Türk Lirası", symbol: "₺", color: Colors.tint },
  USD:       { label: "Amerikan Doları", symbol: "$", color: "#85C1E9" },
  EUR:       { label: "Euro", symbol: "€", color: "#76D7C4" },
  gold_gram: { label: "Gram Altın", symbol: "gr", color: "#FFD700" },
};

function fmt(n: number, currency: GoalCurrency): string {
  const { symbol } = CURRENCY_META[currency];
  const formatted = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: currency === "gold_gram" ? 2 : 0 }).format(n);
  return currency === "TL" ? `${formatted} ₺` : currency === "gold_gram" ? `${formatted} gram` : `${symbol}${formatted}`;
}

function fmtTL(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(Math.round(n)) + " ₺";
}

type MotivationQuote = { pct: number; tr: string[]; en: string[] };

const MOTIVATION_QUOTES: MotivationQuote[] = [
  {
    pct: 0,
    tr: [
      "Her yolculuk tek bir adımla başlar. İlk katkını yap!",
      "Bugün küçük bir adım, yarın büyük bir fark yaratır.",
      "Hedefin seni bekliyor. Başlamak için mükemmel gün bugün.",
      "Birikimler bir damlayla başlar. Sen de başla!",
      "İlk katkı en önemlisi. Devam etmek kolaylaşır.",
      "Hayal ettiğin gelecek bir katkıyla başlıyor.",
    ],
    en: [
      "Every journey begins with a single step. Make your first contribution!",
      "A small step today creates a big difference tomorrow.",
      "Your goal is waiting. Today is the perfect day to start.",
      "Savings start with a single drop. Get started!",
      "The first contribution is the most important. It gets easier.",
      "Your dream future starts with one contribution.",
    ],
  },
  {
    pct: 10,
    tr: [
      "Harika başlangıç! %10'u geçtin, devam et!",
      "İlk %10 en zorlu kısımdı. Artık ivme kazandın!",
      "Küçük bir başlangıç, büyük bir adım. Bravo!",
      "Düzenlilik başarının yarısıdır. Yolundasın!",
      "Her katkı seni hedefe biraz daha yaklaştırıyor.",
    ],
    en: [
      "Great start! You've crossed 10%, keep going!",
      "The first 10% was the hardest. Now you have momentum!",
      "A small start is a big step. Bravo!",
      "Consistency is half of success. You're on track!",
      "Every contribution brings you closer to your goal.",
    ],
  },
  {
    pct: 25,
    tr: [
      "Çeyreğe ulaştın! Tempoyu koru.",
      "Dörtte birini tamamladın. Güçlü bir başlangıç!",
      "Her %25 seni daha da motive etmeli. Harika gidiyorsun!",
      "Sabır ve tutarlılık işe yarıyor. Devam et!",
      "Hedefin dörtte biri geride. Yıkılmaz görünüyorsun!",
    ],
    en: [
      "Quarter done! Keep the pace.",
      "You've completed a quarter. A strong start!",
      "Every 25% should motivate you more. You're doing great!",
      "Patience and consistency are working. Keep going!",
      "A quarter of the goal is behind you. You look unstoppable!",
    ],
  },
  {
    pct: 50,
    tr: [
      "Yarı yoldasın! En zorlu kısım geride kaldı.",
      "Tam ortadasın! Hedefe olan mesafe giderek azalıyor.",
      "Yarıya geldin — bu kadar koyabilirsen kalanı da koyarsın!",
      "Başarı yüzde ellide bile görünüyor. Müthiş iş!",
      "Bitiş çizgisi artık başlangıç kadar uzakta. Devam et!",
      "Hedefe yarı yoldan sonra koşmak çok daha kolay!",
    ],
    en: [
      "Halfway there! The hardest part is behind you.",
      "You're right in the middle! The distance to the goal keeps shrinking.",
      "If you could save this much, you can save the rest!",
      "Success is visible even at fifty percent. Amazing work!",
      "The finish line is now as close as the start was far. Keep going!",
      "Running to the goal from the halfway point is much easier!",
    ],
  },
  {
    pct: 75,
    tr: [
      "Neredeyse bitti! %75'i tamamladın, vazgeçme!",
      "Dörtte üçünü tamamladın. Son viraj!",
      "Bu noktaya kadar geldiysen bırakmak olmaz!",
      "Azaldıkça heyecan artar. Bitiş yakın!",
      "Hedefin %25 ötesinde seni bekliyor. Devam!",
    ],
    en: [
      "Almost there! 75% done, don't give up!",
      "Three quarters complete. Final turn!",
      "If you've come this far, quitting is not an option!",
      "The excitement grows as the distance decreases. Finish is near!",
      "Your goal is waiting just 25% away. Keep going!",
    ],
  },
  {
    pct: 90,
    tr: [
      "Son düzlüğe girdin! Bitiş çizgisi görünüyor.",
      "Artık son %10'a kaldı. Güçlü bitir!",
      "Buraya kadar geldin, şimdi en güzel kısım başlıyor.",
      "Neredeyse bitti. Her katkı artık çok değerli!",
      "Son sprint başladı. Tam güç!",
    ],
    en: [
      "Final stretch! The finish line is in sight.",
      "Only the last 10% remains. Finish strong!",
      "You've come this far, now the best part begins.",
      "Almost done. Every contribution counts even more now!",
      "Final sprint has begun. Full power!",
    ],
  },
  {
    pct: 100,
    tr: [
      "Hedefe ulaştın! Tebrikler!",
      "Başardın! Disiplin ve azmin meyve verdi.",
      "Hedef tamamlandı! Kendine iyi bak, ödülü hak ettin.",
      "Bu başarıyı kutlamayı unut! Bir sonraki hedef seni bekliyor.",
      "Rakamlar yalan söylemez: Disiplinlisin!",
    ],
    en: [
      "Goal reached! Congratulations!",
      "You did it! Discipline and determination paid off.",
      "Goal complete! Take care of yourself, you earned the reward.",
      "Don't forget to celebrate this success! The next goal awaits.",
      "Numbers don't lie: You are disciplined!",
    ],
  },
];

function getMotivation(pct: number, isEN: boolean): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  let group = MOTIVATION_QUOTES[0];
  for (const q of MOTIVATION_QUOTES) {
    if (pct * 100 >= q.pct) group = q;
  }
  const arr = isEN ? group.en : group.tr;
  return arr[dayOfYear % arr.length];
}

function monthLabel(months: number, isEN: boolean): string {
  if (isEN) return months === 1 ? "1 month" : `${months} months`;
  return months === 1 ? "1 ay" : `${months} ay`;
}

export default function SavingsGoalsScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isEN = language === "en";
  const { goals, addGoal, deleteGoal, addContribution, deleteContribution, markCompleted, getStats } = useSavingsGoals();
  const { spendingByCategory, remaining, monthlyExpenses, selectedMonth } = useBudget();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [showNewGoal, setShowNewGoal] = useState(false);
  const [showContrib, setShowContrib] = useState<string | null>(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCurrency, setNewCurrency] = useState<GoalCurrency>("TL");
  const [newMonths, setNewMonths] = useState("12");

  const [contribAmount, setContribAmount] = useState("");
  const [contribNote, setContribNote] = useState("");

  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);

  // Smart tips from budget data
  const tips = useMemo(() => {
    const list: string[] = [];
    const entertainment = spendingByCategory["Eğlence"] || 0;
    const foodDelivery = spendingByCategory["Yemek Siparişi"] || 0;
    const shopping = spendingByCategory["Online Alışveriş"] || 0;
    if (entertainment > 0) list.push(isEN
      ? `You spent ${fmtTL(entertainment)} on entertainment this month — consider putting part of it toward your goal.`
      : `Bu ay eğlenceye ${fmtTL(entertainment)} harcadın — bir kısmını hedefe aktarabilirsin.`);
    if (foodDelivery > 0) list.push(isEN
      ? `${fmtTL(foodDelivery)} went to food delivery — cooking at home could free up budget for savings.`
      : `Yemek siparişine ${fmtTL(foodDelivery)} harcadın — evde yemek yaparak birikim için alan açabilirsin.`);
    if (shopping > 0) list.push(isEN
      ? `Online shopping: ${fmtTL(shopping)} this month. Each saved purchase helps your goal.`
      : `Online alışverişe bu ay ${fmtTL(shopping)} harcandı. Her ertelenen alışveriş hedefe gider.`);
    if (remaining > 0) list.push(isEN
      ? `You have ${fmtTL(remaining)} left over this month — add it to your savings!`
      : `Bu ay ${fmtTL(remaining)} fark var — bunu kumbarana ekle!`);
    return list.slice(0, 3);
  }, [spendingByCategory, remaining, isEN]);

  function handleCreateGoal() {
    const amount = parseInputAmount(newAmount);
    const months = parseInt(newMonths, 10);
    if (!newTitle.trim()) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Enter a goal name." : "Hedef adı girin.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Enter a valid target amount." : "Geçerli bir hedef tutarı girin.");
      return;
    }
    if (isNaN(months) || months <= 0 || months > 360) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Enter a valid timeframe (1–360 months)." : "Geçerli bir süre girin (1–360 ay).");
      return;
    }
    const now = new Date();
    const startYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    addGoal({ title: newTitle.trim(), targetAmount: amount, currency: newCurrency, deadlineMonths: months, startYearMonth });
    setNewTitle(""); setNewAmount(""); setNewMonths("12"); setNewCurrency("TL");
    setShowNewGoal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleAddContrib(goalId: string) {
    const amount = parseInputAmount(contribAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Enter a valid amount." : "Geçerli bir tutar girin.");
      return;
    }
    addContribution(goalId, amount, contribNote.trim() || undefined);
    setContribAmount(""); setContribNote(""); setShowContrib(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleDeleteGoal(goal: SavingsTarget) {
    Alert.alert(
      isEN ? "Delete Goal" : "Hedefi Sil",
      isEN ? `Delete "${goal.title}"?` : `"${goal.title}" silinsin mi?`,
      [
        { text: isEN ? "Cancel" : "Vazgeç", style: "cancel" },
        { text: isEN ? "Delete" : "Sil", style: "destructive", onPress: () => deleteGoal(goal.id) },
      ]
    );
  }

  function GoalCard({ goal }: { goal: SavingsTarget }) {
    const stats = getStats(goal);
    const meta = CURRENCY_META[goal.currency];
    const isExpanded = expandedGoal === goal.id;
    const motivationText = getMotivation(stats.progressPct, isEN);

    const statusColor = goal.isCompleted ? Colors.tint
      : stats.isOverdue ? Colors.red
      : stats.isOnTrack ? Colors.tint : Colors.orange;

    const statusLabel = goal.isCompleted
      ? (isEN ? "Completed" : "Tamamlandı")
      : stats.isOverdue
      ? (isEN ? "Overdue" : "Süre Doldu")
      : stats.isOnTrack
      ? (isEN ? "On Track" : "Yolunda")
      : (isEN ? "Behind" : "Geride");

    return (
      <View style={[styles.goalCard, { borderLeftColor: meta.color }]}>
        <Pressable
          style={styles.goalCardHeader}
          onPress={() => { setExpandedGoal(isExpanded ? null : goal.id); Haptics.selectionAsync(); }}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.goalTitleRow}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
            <Text style={styles.goalSubtitle}>
              {fmt(stats.savedAmount, goal.currency)} / {fmt(goal.targetAmount, goal.currency)}
              {"  ·  "}
              {isEN ? `${goal.deadlineMonths}mo` : `${goal.deadlineMonths} ay`}
            </Text>
            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, {
                  width: `${Math.min(100, stats.progressPct * 100)}%` as any,
                  backgroundColor: statusColor,
                }]}
              />
            </View>
            <Text style={[styles.progressPctText, { color: statusColor }]}>
              %{Math.round(stats.progressPct * 100)}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.textSecondary}
            style={{ marginLeft: 8 }}
          />
        </Pressable>

        {isExpanded && (
          <View style={styles.goalDetail}>
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCell}>
                <Text style={styles.statCellLabel}>{isEN ? "Saved" : "Birikim"}</Text>
                <Text style={[styles.statCellValue, { color: Colors.tint }]}>{fmt(stats.savedAmount, goal.currency)}</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statCellLabel}>{isEN ? "Remaining" : "Kalan"}</Text>
                <Text style={[styles.statCellValue, { color: Colors.orange }]}>{fmt(stats.remainingAmount, goal.currency)}</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statCellLabel}>{isEN ? "Months Left" : "Kalan Ay"}</Text>
                <Text style={[styles.statCellValue, { color: Colors.blue }]}>
                  {stats.isOverdue ? (isEN ? "Overdue" : "Doldu") : monthLabel(stats.monthsLeft, isEN)}
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statCellLabel}>{isEN ? "Monthly Need" : "Aylık Gerek"}</Text>
                <Text style={[styles.statCellValue, { color: stats.requiredPerMonth > 0 ? Colors.purple : Colors.tint }]}>
                  {stats.monthsLeft > 0 ? fmt(stats.requiredPerMonth, goal.currency) : (isEN ? "Done!" : "Tamam!")}
                </Text>
              </View>
            </View>

            {/* Motivation */}
            <View style={[styles.motivationBox, { borderColor: meta.color + "40", backgroundColor: meta.color + "10" }]}>
              <Ionicons name="star-outline" size={14} color={meta.color} />
              <Text style={[styles.motivationText, { color: meta.color }]}>{motivationText}</Text>
            </View>

            {/* On-track note */}
            {!goal.isCompleted && (
              <View style={[styles.trackNote, { backgroundColor: (stats.isOnTrack ? Colors.tint : Colors.orange) + "12" }]}>
                <Ionicons
                  name={stats.isOnTrack ? "trending-up-outline" : "trending-down-outline"}
                  size={14}
                  color={stats.isOnTrack ? Colors.tint : Colors.orange}
                />
                <Text style={[styles.trackNoteText, { color: stats.isOnTrack ? Colors.tint : Colors.orange }]}>
                  {stats.isOnTrack
                    ? (isEN
                        ? `Great! You're on track. Expected ${fmt(stats.expectedSaved, goal.currency)} saved by now.`
                        : `Harika! Hedefinizdesiniz. Şu ana kadar beklenen birikim: ${fmt(stats.expectedSaved, goal.currency)}.`)
                    : (isEN
                        ? `You're behind schedule. Try adding ${fmt(Math.max(0, stats.expectedSaved - stats.savedAmount), goal.currency)} to catch up.`
                        : `Hedefin gerisine düştünüz. Yakalamak için ${fmt(Math.max(0, stats.expectedSaved - stats.savedAmount), goal.currency)} eklemeyi deneyin.`)
                  }
                </Text>
              </View>
            )}

            {/* Contributions list */}
            {goal.contributions.length > 0 && (
              <View style={styles.contribList}>
                <Text style={styles.contribListTitle}>{isEN ? "Contributions" : "Katkılar"}</Text>
                {goal.contributions.slice(0, 5).map((c) => (
                  <View key={c.id} style={styles.contribRow}>
                    <View style={styles.contribLeft}>
                      <Text style={styles.contribAmount}>{fmt(c.amount, goal.currency)}</Text>
                      {c.note && <Text style={styles.contribNote}>{c.note}</Text>}
                    </View>
                    <View style={styles.contribRight}>
                      <Text style={styles.contribDate}>{c.date}</Text>
                      <Pressable onPress={() => deleteContribution(goal.id, c.id)} hitSlop={10}>
                        <Ionicons name="trash-outline" size={14} color={Colors.red} />
                      </Pressable>
                    </View>
                  </View>
                ))}
                {goal.contributions.length > 5 && (
                  <Text style={styles.moreContribs}>
                    {isEN ? `+${goal.contributions.length - 5} more` : `+${goal.contributions.length - 5} daha fazla`}
                  </Text>
                )}
              </View>
            )}

            {/* Action buttons */}
            {!goal.isCompleted && (
              <Pressable
                style={[styles.addContribBtn, { borderColor: meta.color }]}
                onPress={() => { setContribAmount(""); setContribNote(""); setShowContrib(goal.id); }}
              >
                <Ionicons name="add-circle" size={16} color={meta.color} />
                <Text style={[styles.addContribText, { color: meta.color }]}>
                  {isEN ? "Add Contribution" : "Katkı Ekle"}
                </Text>
              </Pressable>
            )}

            {goal.isCompleted && (
              <Pressable
                style={styles.reactivateBtn}
                onPress={() => { markCompleted(goal.id, false); Haptics.selectionAsync(); }}
              >
                <Text style={styles.reactivateBtnText}>{isEN ? "Reactivate Goal" : "Hedefi Yeniden Aç"}</Text>
              </Pressable>
            )}

            <Pressable style={styles.deleteBtn} onPress={() => handleDeleteGoal(goal)}>
              <Ionicons name="trash-outline" size={14} color={Colors.red} />
              <Text style={styles.deleteBtnText}>{isEN ? "Delete Goal" : "Hedefi Sil"}</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  const activeGoalForContrib = goals.find((g) => g.id === showContrib);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={14}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEN ? "Savings Goals" : "Hedef Birikimim"}</Text>
        <Pressable
          style={styles.newGoalBtn}
          onPress={() => { setShowNewGoal(true); Haptics.selectionAsync(); }}
        >
          <Ionicons name="add" size={18} color={Colors.tint} />
          <Text style={styles.newGoalBtnText}>{isEN ? "New Goal" : "Yeni Hedef"}</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Smart Tips */}
        {tips.length > 0 && activeGoals.length > 0 && (
          <View style={styles.tipsCard}>
            <View style={styles.tipsTitleRow}>
              <Ionicons name="bulb-outline" size={15} color={Colors.yellow} />
              <Text style={styles.tipsTitle}>{isEN ? "Smart Tips" : "Akıllı Öneriler"}</Text>
            </View>
            {tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Active goals */}
        {activeGoals.length === 0 && completedGoals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>{isEN ? "No savings goals yet" : "Henüz hedef yok"}</Text>
            <Text style={styles.emptyText}>
              {isEN
                ? "Set a goal — whether it's a car, vacation, or emergency fund — and track your progress month by month."
                : "Bir araba, tatil veya acil fon için hedef belirle ve ilerlemeyi ay ay takip et."}
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => { setShowNewGoal(true); Haptics.selectionAsync(); }}
            >
              <Ionicons name="add-circle" size={18} color={Colors.tint} />
              <Text style={styles.emptyBtnText}>{isEN ? "Create First Goal" : "İlk Hedefi Oluştur"}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {activeGoals.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{isEN ? "Active Goals" : "Aktif Hedefler"}</Text>
                {activeGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
              </View>
            )}

            {completedGoals.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{isEN ? "Completed" : "Tamamlananlar"}</Text>
                {completedGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* New Goal Modal */}
      <Modal visible={showNewGoal} transparent animationType="slide" onRequestClose={() => { Keyboard.dismiss(); setShowNewGoal(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={() => { Keyboard.dismiss(); setShowNewGoal(false); }}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                <Text style={styles.sheetTitle}>{isEN ? "New Savings Goal" : "Yeni Birikim Hedefi"}</Text>

                <Text style={[styles.fieldLabel, { marginTop: 8 }]}>{isEN ? "Goal Name" : "Hedef Adı"}</Text>
                <TextInput
                  style={styles.input}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder={isEN ? 'e.g. "New Car", "Vacation"' : '"Araba", "Tatil", "Acil Fon"'}
                  placeholderTextColor={Colors.textTertiary}
                  returnKeyType="next"
                />

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{isEN ? "Target Amount" : "Hedef Tutar"}</Text>
                <TextInput
                  style={styles.input}
                  value={newAmount}
                  onChangeText={(v) => setNewAmount(formatInputAmount(v))}
                  placeholder={isEN ? "e.g. 500.000" : "örn. 500.000"}
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{isEN ? "Currency" : "Para Birimi"}</Text>
                <View style={styles.currencyRow}>
                  {(["TL", "USD", "EUR", "gold_gram"] as GoalCurrency[]).map((c) => {
                    const m = CURRENCY_META[c];
                    return (
                      <Pressable
                        key={c}
                        style={[styles.currencyChip, newCurrency === c && { borderColor: m.color, backgroundColor: m.color + "18" }]}
                        onPress={() => { setNewCurrency(c); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.currencyChipSymbol, { color: newCurrency === c ? m.color : Colors.textSecondary }]}>{m.symbol}</Text>
                        <Text style={[styles.currencyChipLabel, newCurrency === c && { color: m.color }]}>
                          {c === "gold_gram" ? (isEN ? "Gold" : "Altın") : c}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{isEN ? "Timeframe (months)" : "Süre (ay)"}</Text>
                <View style={styles.monthsRow}>
                  {[3, 6, 12, 24, 36].map((m) => (
                    <Pressable
                      key={m}
                      style={[styles.monthChip, newMonths === String(m) && styles.monthChipActive]}
                      onPress={() => { setNewMonths(String(m)); Keyboard.dismiss(); Haptics.selectionAsync(); }}
                    >
                      <Text style={[styles.monthChipText, newMonths === String(m) && styles.monthChipTextActive]}>
                        {monthLabel(m, isEN)}
                      </Text>
                    </Pressable>
                  ))}
                  <TextInput
                    style={[styles.monthInput, newMonths && ![3,6,12,24,36].map(String).includes(newMonths) && styles.monthInputActive]}
                    value={[3,6,12,24,36].map(String).includes(newMonths) ? "" : newMonths}
                    onChangeText={setNewMonths}
                    placeholder={isEN ? "Custom" : "Özel"}
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                {newAmount && newMonths && parseInputAmount(newAmount) > 0 && !isNaN(parseInt(newMonths)) && (
                  <View style={[styles.previewBox, { marginTop: 12 }]}>
                    <Ionicons name="calculator-outline" size={14} color={Colors.tint} />
                    <Text style={styles.previewText}>
                      {isEN
                        ? `Monthly contribution needed: ${fmt(parseInputAmount(newAmount) / parseInt(newMonths), newCurrency)}`
                        : `Aylık gereken katkı: ${fmt(parseInputAmount(newAmount) / parseInt(newMonths), newCurrency)}`}
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={[styles.sheetBtns, { marginTop: 12, paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
                <Pressable style={styles.cancelBtn} onPress={() => { Keyboard.dismiss(); setShowNewGoal(false); }}>
                  <Text style={styles.cancelBtnText}>{isEN ? "Cancel" : "Vazgeç"}</Text>
                </Pressable>
                <Pressable style={styles.createBtn} onPress={() => { Keyboard.dismiss(); handleCreateGoal(); }}>
                  <Text style={styles.createBtnText}>{isEN ? "Create Goal" : "Hedef Oluştur"}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Contribution Modal */}
      <Modal visible={showContrib !== null} transparent animationType="slide" onRequestClose={() => { Keyboard.dismiss(); setShowContrib(null); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={() => { Keyboard.dismiss(); setShowContrib(null); }}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>
                {isEN ? "Add Contribution" : "Katkı Ekle"}
                {activeGoalForContrib ? ` — ${activeGoalForContrib.title}` : ""}
              </Text>

              {activeGoalForContrib && (
                <View style={styles.contribGoalInfo}>
                  <Text style={styles.contribGoalInfoText}>
                    {isEN
                      ? `Target: ${fmt(activeGoalForContrib.targetAmount, activeGoalForContrib.currency)}`
                      : `Hedef: ${fmt(activeGoalForContrib.targetAmount, activeGoalForContrib.currency)}`}
                  </Text>
                  {(() => {
                    const s = getStats(activeGoalForContrib);
                    return (
                      <Text style={styles.contribGoalInfoSub}>
                        {isEN
                          ? `Remaining: ${fmt(s.remainingAmount, activeGoalForContrib.currency)}`
                          : `Kalan: ${fmt(s.remainingAmount, activeGoalForContrib.currency)}`}
                      </Text>
                    );
                  })()}
                </View>
              )}

              <Text style={styles.fieldLabel}>
                {isEN ? "Amount" : "Tutar"}
                {activeGoalForContrib ? ` (${CURRENCY_META[activeGoalForContrib.currency].symbol})` : ""}
              </Text>
              <TextInput
                style={styles.input}
                value={contribAmount}
                onChangeText={(v) => setContribAmount(formatInputAmount(v))}
                placeholder={isEN ? "Enter amount" : "Tutar girin"}
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                autoFocus
                returnKeyType="next"
              />

              <Text style={[styles.fieldLabel, { marginTop: 8 }]}>{isEN ? "Note (optional)" : "Not (isteğe bağlı)"}</Text>
              <TextInput
                style={styles.input}
                value={contribNote}
                onChangeText={setContribNote}
                placeholder={isEN ? 'e.g. "From salary"' : '"Maaştan", "Kenarda kaldı"'}
                placeholderTextColor={Colors.textTertiary}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              <View style={[styles.sheetBtns, { marginTop: 12, paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
                <Pressable style={styles.cancelBtn} onPress={() => { Keyboard.dismiss(); setShowContrib(null); }}>
                  <Text style={styles.cancelBtnText}>{isEN ? "Cancel" : "Vazgeç"}</Text>
                </Pressable>
                <Pressable
                  style={[styles.createBtn, { backgroundColor: activeGoalForContrib ? CURRENCY_META[activeGoalForContrib.currency].color : Colors.tint }]}
                  onPress={() => { Keyboard.dismiss(); showContrib && handleAddContrib(showContrib); }}
                >
                  <Text style={styles.createBtnText}>{isEN ? "Add" : "Ekle"}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, marginLeft: 12 },
  newGoalBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.tint + "18", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.tint + "40" },
  newGoalBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.tint },
  scroll: { padding: 16, gap: 14 },

  // Tips
  tipsCard: { backgroundColor: Colors.yellow + "12", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.yellow + "30", gap: 8 },
  tipsTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tipsTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.yellow },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.yellow, marginTop: 7 },
  tipText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 20 },

  // Section
  section: { gap: 10 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },

  // Goal card
  goalCard: {
    backgroundColor: Colors.card, borderRadius: 16, borderLeftWidth: 4,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  goalCardHeader: { flexDirection: "row", alignItems: "center", padding: 14 },
  goalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  goalTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  statusBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  goalSubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  progressTrack: { height: 6, backgroundColor: Colors.background, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: "100%", borderRadius: 3 },
  progressPctText: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "right" },

  // Goal detail (expanded)
  goalDetail: { paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 10 },
  statCell: { flex: 1, minWidth: "45%", backgroundColor: Colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  statCellLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, marginBottom: 4 },
  statCellValue: { fontFamily: "Inter_700Bold", fontSize: 14 },

  // Motivation
  motivationBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  motivationText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1, lineHeight: 20 },

  // Track note
  trackNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, padding: 10 },
  trackNoteText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },

  // Contributions
  contribList: { backgroundColor: Colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  contribListTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text, marginBottom: 2 },
  contribRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  contribLeft: { flex: 1 },
  contribAmount: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  contribNote: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary },
  contribRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  contribDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary },
  moreContribs: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, textAlign: "center" },

  // Buttons
  addContribBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 12, padding: 12 },
  addContribText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  reactivateBtn: { backgroundColor: Colors.tint + "18", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.tint + "40" },
  reactivateBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.tint },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  deleteBtnText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.red },

  // Empty state
  emptyState: { alignItems: "center", gap: 14, paddingVertical: 48 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, maxWidth: 300 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.tint + "18", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: Colors.tint + "40" },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.tint },

  // Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.background, borderRadius: 12, padding: 14,
    fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  currencyRow: { flexDirection: "row", gap: 8 },
  currencyChip: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  currencyChipSymbol: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textSecondary },
  currencyChipLabel: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary },
  monthsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  monthChipActive: { borderColor: Colors.tint, backgroundColor: Colors.tint + "18" },
  monthChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  monthChipTextActive: { color: Colors.tint, fontFamily: "Inter_600SemiBold" },
  monthInput: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text, minWidth: 60 },
  monthInputActive: { borderColor: Colors.tint, backgroundColor: Colors.tint + "18" },
  previewBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.tint + "12", borderRadius: 10, padding: 10 },
  previewText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.tint, flex: 1 },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: Colors.background, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  createBtn: { flex: 1, backgroundColor: Colors.tint, borderRadius: 12, padding: 14, alignItems: "center" },
  createBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.background },
  contribGoalInfo: { backgroundColor: Colors.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.border },
  contribGoalInfoText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  contribGoalInfoSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
});
