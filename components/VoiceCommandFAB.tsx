import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Platform,
  Alert,
  DeviceEventEmitter,
  PanResponder,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type AudioPlayer, type AudioRecorder } from "expo-audio";
import {
  createAudioPlayer,
  createAudioRecorder,
  setAudioMode,
  getRecordingPermissions,
  requestRecordingPermissions,
} from "@/lib/audio";
import * as FileSystem from "expo-file-system/legacy";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useBudget } from "@/context/BudgetContext";
import { useSavingsGoals } from "@/context/SavingsGoalsContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { getApiUrl } from "@/lib/query-client";
import { useInvestments } from "@/context/InvestmentContext";
import { useSpecialDays } from "@/context/SpecialDaysContext";
import { useSpendingLimits, getLimitAmount, getLimitUsage } from "@/context/SpendingLimitsContext";
import { useBusinessBudget } from "@/context/BusinessContext";
import { getFabEnabled, getTTSEnabled, getVADEnabled, type VoiceGender } from "@/lib/voiceSettings";

type State = "idle" | "recording" | "processing" | "result";

function fmt(n: number): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n) + " ₺";
}

export default function VoiceCommandFAB() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isEN = language === "en";
  const {
    monthlyIncome, monthlyExpenses, remaining, financialHealthScore,
    incomes, expenses, loans, creditCards, totalLoanPayments, savingsGoal,
    spendingByMember, spendingByCategory, selectedMonth,
    addExpense, addIncome, deleteExpense, deleteIncome, setSavingsGoal,
  } = useBudget();
  const { addGoal } = useSavingsGoals();
  const { addInvestment } = useInvestments();
  const { getUpcoming } = useSpecialDays();
  const { limits } = useSpendingLimits();
  const { combinedWithBudget, monthlyBusinessIncomes } = useBusinessBudget();
  const limitIncomeBase = combinedWithBudget ? monthlyIncome + monthlyBusinessIncomes : monthlyIncome;

  const [fabVisible, setFabVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [addedEntryType, setAddedEntryType] = useState<"expense" | "income" | null>(null);
  const [vadEnabled, setVadEnabled] = useState(true);

  const recordingRef = useRef<AudioRecorder | null>(null);
  const soundRef = useRef<AudioPlayer | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef = useRef<number | null>(null);

  const FAB_SIZE = 56;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        isDraggingRef.current = false;
        dragStartRef.current = { x: (pan.x as any)._value ?? 0, y: (pan.y as any)._value ?? 0 };
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5) {
          isDraggingRef.current = true;
        }
        const { width, height } = Dimensions.get("window");
        const baseRight = 20;
        const bottomBase = 90 + 34;
        const newX = dragStartRef.current.x + g.dx;
        const newY = dragStartRef.current.y + g.dy;
        const maxLeft = -(width - baseRight - FAB_SIZE);
        const maxUp = height - bottomBase - FAB_SIZE - 60;
        const maxDown = bottomBase - FAB_SIZE;
        pan.x.setValue(Math.max(maxLeft, Math.min(0, newX)));
        pan.y.setValue(Math.max(-maxUp, Math.min(maxDown, newY)));
      },
      onPanResponderRelease: () => {
        if (!isDraggingRef.current) {
          openFAB();
          return;
        }
        const { width } = Dimensions.get("window");
        const baseRight = 20;
        const currentX = (pan.x as any)._value ?? 0;
        const fabRightEdge = width - baseRight + currentX;
        const snapToRight = fabRightEdge >= width / 2;
        const targetX = snapToRight ? 0 : -(width - baseRight * 2 - FAB_SIZE);
        Animated.spring(pan.x, {
          toValue: targetX,
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();
      },
    })
  ).current;

  const VAD_SILENCE_DB = -28;
  const VAD_SILENCE_MS = 1400;

  useEffect(() => {
    if (Platform.OS === "web") return;
    getFabEnabled().then(setFabVisible);
    getVADEnabled().then(setVadEnabled);
    const sub = DeviceEventEmitter.addListener("fab_enabled_changed", (val: boolean) => {
      setFabVisible(val);
    });
    return () => {
      sub.remove();
      stopAudio();
      stopVAD();
    };
  }, []);

  function startVAD(recording: AudioRecorder) {
    silenceStartRef.current = null;
    vadIntervalRef.current = setInterval(async () => {
      if (!recordingRef.current) { stopVAD(); return; }
      try {
        if (!recording.isRecording) { stopVAD(); return; }
        const status = recording.getStatus();
        const level = status.metering ?? -160;
        if (level < VAD_SILENCE_DB) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > VAD_SILENCE_MS) {
            stopVAD();
            stopRecording();
          }
        } else {
          silenceStartRef.current = null;
        }
      } catch (_e) {}
    }, 200);
  }

  function stopVAD() {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    silenceStartRef.current = null;
  }

  async function stopAudio() {
    try {
      Speech.stop();
      if (soundRef.current) {
        soundRef.current.pause();
        soundRef.current.release();
        soundRef.current = null;
      }
    } catch (_e) {}
  }

  async function playTTSAudio(base64: string, _format: string = "mp3") {
    try {
      await stopAudio();
      await setAudioMode({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      const uri = (FileSystem.cacheDirectory ?? "") + `fab_tts.mp3`;
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const player = createAudioPlayer(uri);
      soundRef.current = player;
      player.addListener("playbackStatusUpdate", (status: any) => {
        if (status.playing === false && status.currentTime > 0 && status.currentTime >= (status.duration || 0) - 0.1) {
          player.release();
          soundRef.current = null;
        }
      });
      player.play();
    } catch (e) {
      console.error("FAB TTS playback error:", e);
    }
  }

  function splitIntoChunks(text: string, maxLen = 200): string[] {
    const sentences = text.match(/[^.!?…]+[.!?…]*/g) ?? [text];
    const chunks: string[] = [];
    let current = "";
    for (const sentence of sentences) {
      if ((current + sentence).length > maxLen && current.length > 0) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [text];
  }

  async function speakResponse(text: string, _g: VoiceGender) {
    if (!text?.trim()) return;
    try {
      const enabled = await getTTSEnabled();
      if (!enabled) return;
      Speech.stop();
      await setAudioMode({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      const chunks = splitIntoChunks(text, 200);
      const lang = language === "tr" ? "tr-TR" : "en-US";
      function speakChunk(index: number) {
        if (index >= chunks.length) return;
        Speech.speak(chunks[index], {
          language: lang,
          pitch: 1.05,
          rate: 0.9,
          volume: 1.0,
          onDone: () => speakChunk(index + 1),
          onError: () => {},
          onStopped: () => {},
        });
      }
      speakChunk(0);
    } catch (e) {
      console.error("FAB speak error:", e);
    }
  }

  const startPulse = useCallback(() => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseRef.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  async function openFAB() {
    if (Platform.OS === "web") {
      Alert.alert(
        isEN ? "Not Supported" : "Desteklenmiyor",
        isEN ? "Voice commands are not supported on web." : "Sesli komut web'de desteklenmez."
      );
      return;
    }
    setOpen(true);
    setState("idle");
    setTranscript("");
    setAiResponse("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startRecording();
  }

  function closeFAB() {
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    stopAudio();
    stopPulse();
    if (recordingRef.current) {
      recordingRef.current.stop().catch(() => {});
      recordingRef.current.release();
      recordingRef.current = null;
    }
    setOpen(false);
    setState("idle");
    setAddedEntryType(null);
  }

  async function startRecording() {
    try {
      const { status: existingStatus } = await getRecordingPermissions();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await requestRecordingPermissions();
        finalStatus = status;
        if (Platform.OS === "ios" && status === "granted") {
          await new Promise<void>(resolve => setTimeout(resolve, 400));
        }
      }
      if (finalStatus !== "granted") {
        Alert.alert(
          isEN ? "Microphone Permission" : "Mikrofon İzni Gerekli",
          isEN ? "Please allow microphone access in Settings to use voice commands." : "Sesli komutları kullanmak için Ayarlar'dan mikrofon iznini etkinleştirin."
        );
        setOpen(false);
        return;
      }
      await setAudioMode({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = createAudioRecorder(true);
      rec.record();
      recordingRef.current = rec;
      setState("recording");
      startPulse();
      if (vadEnabled) {
        setTimeout(() => startVAD(rec), 800);
      }
    } catch (e) {
      console.error("FAB record error:", e);
      closeFAB();
    }
  }

  async function stopRecording() {
    if (!recordingRef.current) return;
    stopVAD();
    stopPulse();
    setState("processing");
    try {
      await recordingRef.current.stop();
      const uri = recordingRef.current.uri;
      recordingRef.current.release();
      recordingRef.current = null;
      await setAudioMode({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      if (!uri) throw new Error("No URI");
      await sendAudio(uri);
    } catch (e) {
      console.error("FAB stop error (vad):", e);
      closeFAB();
    }
  }

  async function stopRecordingAndSend() {
    if (!recordingRef.current) return;
    stopVAD();
    stopPulse();
    setState("processing");
    try {
      await recordingRef.current.stop();
      const uri = recordingRef.current.uri;
      recordingRef.current.release();
      recordingRef.current = null;
      await setAudioMode({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      if (!uri) throw new Error("No URI");
      await sendAudio(uri);
    } catch (e) {
      console.error("FAB stop error:", e);
      closeFAB();
    }
  }

  async function sendAudio(uri: string) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const thisMonth = new Date().toISOString().substring(0, 7);
      const topCategories = Object.entries(
        expenses
          .filter((e) => e.date.substring(0, 7) === thisMonth)
          .reduce<Record<string, number>>((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
          }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, amount]) => ({ category, amount }));

      const upcoming = getUpcoming(30).slice(0, 5).map((d) => ({
        name: d.day.title, daysUntil: d.daysUntil, type: d.day.eventType,
      }));
      const totalSpentAll = Object.values(spendingByCategory).reduce((s, v) => s + v, 0);
      const limWarnings = limits
        .filter((l) => l.enabled && (l.isRecurring || l.specificMonth === selectedMonth))
        .map((l) => {
          const spent = l.category === "all" ? totalSpentAll : (spendingByCategory[l.category] ?? 0);
          const lAmt = getLimitAmount(l, limitIncomeBase);
          const usage = getLimitUsage(spent, lAmt);
          return { category: l.category === "all" ? (isEN ? "All" : "Tüm Harcamalar") : l.category, usagePercent: Math.round(usage.percent * 100), spent, limitAmount: lAmt };
        })
        .filter((l) => l.usagePercent >= 30)
        .slice(0, 5);

      const budgetContext = {
        language,
        monthlyIncome,
        monthlyExpenses,
        remaining,
        financialHealthScore,
        topCategories,
        recentExpenses: expenses.slice(-5).map((e) => ({
          title: e.title, amount: e.amount, category: e.category,
        })),
        recurringIncomes: incomes.filter((i) => i.isRecurring).map((i) => ({
          title: i.title, amount: i.amount, category: i.category,
        })),
        recurringExpenses: expenses.filter((e) => e.isRecurring).map((e) => ({
          title: e.title, amount: e.amount, category: e.category,
        })),
        loans: loans.map((l) => ({
          title: l.title, monthlyPayment: l.monthlyPayment, remainingAmount: l.remainingAmount,
        })),
        savingsGoal,
        totalLoanPayments,
        memberSpending: (spendingByMember.self > 0 || spendingByMember.spouse > 0)
          ? {
              selfName: user?.name?.split(" ")[0] || (isEN ? "Me" : "Ben"),
              spouseName: user?.spouseName?.split(" ")[0] || (isEN ? "Spouse" : "Eşim"),
              self: spendingByMember.self,
              spouse: spendingByMember.spouse,
              shared: spendingByMember.shared,
            }
          : undefined,
        upcomingSpecialDays: upcoming.length > 0 ? upcoming : undefined,
        spendingLimits: limWarnings.length > 0 ? limWarnings : undefined,
      };

      const apiUrl = new URL("/api/voice/financial-chat", getApiUrl()).toString();
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: base64, language, budgetContext, voiceGender: "female" }),
      });

      const data = await resp.json();
      const { transcript: tx, response: aiResp, intent, data: actionData, ttsAudio, ttsFormat } = data;

      setTranscript(tx || "");
      setAiResponse(aiResp || (isEN ? "Done." : "Tamam."));
      setState("result");

      if ((intent === "add_expense" || intent === "add_recurring_expense") && actionData?.amount) {
        const nowD = new Date();
        const isRec = intent === "add_recurring_expense" || actionData?.isRecurring === true;
        const rDay = actionData?.recurringDay ? Number(actionData.recurringDay) : nowD.getDate();
        const useDay = isRec ? rDay : nowD.getDate();
        const dateStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}-${String(useDay).padStart(2, "0")}`;
        const pm = actionData?.paymentMethod;
        const validPM: "cash" | "debit" | "credit" = pm === "credit" ? "credit" : pm === "debit" ? "debit" : "cash";
        const mo = actionData?.memberOwner;
        const validMO: "self" | "spouse" | "shared" = mo === "self" ? "self" : mo === "spouse" ? "spouse" : "shared";
        let creditCardId: string | undefined;
        if (validPM === "credit" && creditCards.length > 0) {
          const cardHint: string = String(actionData?.cardName || "");
          if (cardHint && creditCards.length > 1) {
            const lower = cardHint.toLowerCase();
            const matched = creditCards.find((c) =>
              c.name.toLowerCase().includes(lower) || c.bank.toLowerCase().includes(lower)
            );
            creditCardId = matched?.id ?? creditCards[0].id;
          } else {
            creditCardId = creditCards[0].id;
          }
        }
        addExpense({
          title: String(actionData.title || (isEN ? "Voice Entry" : "Sesli Giriş")),
          amount: Number(actionData.amount),
          category: String(actionData.category || "Diğer"),
          subcategory: String(actionData.subcategory || "Genel"),
          date: dateStr,
          isRecurring: isRec,
          recurringDay: isRec ? rDay : undefined,
          isInstallment: actionData?.isInstallment === true,
          installmentCount: actionData?.installmentCount ? Number(actionData.installmentCount) : undefined,
          paymentMethod: validPM,
          memberOwner: validMO,
          creditCardId,
        });
        setAddedEntryType("expense");
      } else if ((intent === "add_income" || intent === "add_recurring_income") && actionData?.amount) {
        const nowD = new Date();
        const isRec = intent === "add_recurring_income" || actionData?.isRecurring === true;
        const rDay = actionData?.recurringDay ? Number(actionData.recurringDay) : nowD.getDate();
        const useDay = isRec ? rDay : nowD.getDate();
        const dateStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}-${String(useDay).padStart(2, "0")}`;
        addIncome({
          title: String(actionData.title || (isEN ? "Voice Entry" : "Sesli Giriş")),
          amount: Number(actionData.amount),
          category: String(actionData.category || "Maaş"),
          date: dateStr,
          isRecurring: isRec,
          recurringDay: isRec ? rDay : undefined,
        });
        setAddedEntryType("income");
      } else if (intent === "delete_last_expense") {
        const sortedExp = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (sortedExp.length > 0) deleteExpense(sortedExp[0].id);
        setAddedEntryType(null);
      } else if (intent === "delete_last_income") {
        const sortedInc = [...incomes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (sortedInc.length > 0) deleteIncome(sortedInc[0].id);
        setAddedEntryType(null);
      } else if (intent === "add_savings_goal" && actionData?.title && actionData?.amount > 0) {
        const now = new Date();
        addGoal({
          title: actionData.title,
          targetAmount: actionData.amount,
          currency: "TL",
          deadlineMonths: 12,
          startYearMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        });
        setAddedEntryType(null);
      } else if (intent === "set_budget_goal" && actionData?.amount > 0) {
        setSavingsGoal(actionData.amount);
        setAddedEntryType(null);
      } else if (intent === "navigate_to" && actionData?.screen) {
        const screenMap: Record<string, string> = {
          cards: "/(tabs)/cards",
          loans: "/(tabs)/loans",
          investments: "/(tabs)/investments",
          goals: "/(tabs)/goals",
          report: "/report",
          transactions: "/(tabs)/transactions",
          forecast: "/forecast",
          settings: "/(tabs)/settings",
          home: "/(tabs)/",
          special_days: "/special-days",
          spending_limits: "/spending-limits",
          voice: "/voice-assistant",
        };
        const path = screenMap[actionData.screen];
        if (path) setTimeout(() => router.push(path as any), 1200);
        setAddedEntryType(null);
      } else if (intent === "add_investment" && actionData?.investmentType && actionData?.quantity > 0) {
        const typeLabels: Record<string, string> = {
          gold_gram_24k: isEN ? "Gold (24K)" : "Gram Altın 24 Ayar",
          gold_gram_22k: isEN ? "Gold (22K)" : "Gram Altın 22 Ayar",
          gold_ceyrek: isEN ? "Quarter Gold" : "Çeyrek Altın",
          gold_yarim: isEN ? "Half Gold" : "Yarım Altın",
          gold_tam: isEN ? "Full Gold" : "Tam Altın",
          usd: "USD", eur: "EUR",
          silver: isEN ? "Silver" : "Gümüş",
        };
        const unitLabels: Record<string, string> = {
          gold_gram_24k: "gr", gold_gram_22k: "gr",
          gold_ceyrek: isEN ? "pcs" : "adet", gold_yarim: isEN ? "pcs" : "adet", gold_tam: isEN ? "pcs" : "adet",
          usd: "$", eur: "€", silver: "gr",
        };
        addInvestment({
          type: actionData.investmentType,
          label: typeLabels[actionData.investmentType] || actionData.investmentType,
          quantity: Number(actionData.quantity),
          unit: unitLabels[actionData.investmentType] || "adet",
        });
        setAddedEntryType(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (ttsAudio) {
        await playTTSAudio(ttsAudio, ttsFormat || "mp3");
      } else {
        await speakResponse(String(aiResp || (isEN ? "Done." : "Tamam.")), "female");
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      autoCloseRef.current = setTimeout(closeFAB, 5000);
    } catch (e) {
      console.error("FAB send error:", e);
      const errMsg = isEN ? "Could not process. Please try again." : "İşlenemedi. Lütfen tekrar deneyin.";
      setAiResponse(errMsg);
      setState("result");
      autoCloseRef.current = setTimeout(closeFAB, 3000);
    }
  }

  const isWeb = Platform.OS as string === "web";
  if (!user || !fabVisible || isWeb) return null;

  const bottomOffset = insets.bottom + 90;

  return (
    <>
      {!open && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.fab,
            { bottom: bottomOffset },
            { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
          ]}
        >
          <Ionicons name="mic" size={26} color="#fff" />
        </Animated.View>
      )}

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <Pressable style={styles.overlayBg} onPress={closeFAB} />

          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />

            {state === "recording" && (
              <>
                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
                <Pressable style={styles.micBtn} onPress={stopRecordingAndSend}>
                  <Ionicons name="mic" size={34} color="#fff" />
                </Pressable>
                <Text style={styles.listeningText}>
                  {isEN ? "Listening... tap to stop" : "Dinliyorum... durdurmak için dokun"}
                </Text>
                <Text style={styles.hintText}>
                  {isEN
                    ? "Say: \"Add 500 TL grocery expense\" or ask a question"
                    : "Örn: \"500 TL market gideri ekle\" veya soru sor"}
                </Text>
              </>
            )}

            {state === "processing" && (
              <>
                <View style={[styles.micBtn, { backgroundColor: Colors.card2 }]}>
                  <Ionicons name="hourglass-outline" size={28} color={Colors.tint} />
                </View>
                <Text style={styles.listeningText}>
                  {isEN ? "Processing..." : "İşleniyor..."}
                </Text>
              </>
            )}

            {state === "result" && (
              <>
                <View style={[styles.micBtn, { backgroundColor: Colors.tint }]}>
                  <Ionicons name="checkmark" size={32} color="#fff" />
                </View>
                {transcript ? (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptLabel}>{isEN ? "You said:" : "Dedikleriniz:"}</Text>
                    <Text style={styles.transcriptText}>"{transcript}"</Text>
                  </View>
                ) : null}
                <View style={styles.responseBox}>
                  <Text style={styles.responseText}>{aiResponse}</Text>
                </View>
                {addedEntryType && (
                  <Pressable
                    style={styles.viewTransactionsBtn}
                    onPress={() => {
                      closeFAB();
                      router.push("/(tabs)/transactions");
                    }}
                  >
                    <Ionicons name="list-outline" size={15} color={Colors.tint} />
                    <Text style={styles.viewTransactionsBtnText}>
                      {addedEntryType === "expense"
                        ? (isEN ? "View in Transactions" : "İşlemlerde Görüntüle")
                        : (isEN ? "View in Transactions" : "İşlemlerde Görüntüle")}
                    </Text>
                    <Ionicons name="chevron-forward" size={13} color={Colors.tint} />
                  </Pressable>
                )}
                <Pressable style={styles.doneBtn} onPress={closeFAB}>
                  <Text style={styles.doneBtnText}>{isEN ? "Done" : "Tamam"}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.tint,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 24,
    gap: 14,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  pulseRing: {
    position: "absolute",
    top: 50,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.tint + "30",
  },
  micBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.tint,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  listeningText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
    marginBottom: 12,
  },
  transcriptBox: {
    backgroundColor: Colors.card2,
    borderRadius: 12,
    padding: 12,
    width: "100%",
    gap: 4,
  },
  transcriptLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  responseBox: {
    backgroundColor: Colors.tint + "18",
    borderRadius: 12,
    padding: 14,
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.tint + "40",
  },
  responseText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    textAlign: "center",
  },
  viewTransactionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.tint + "15",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.tint + "40",
    marginBottom: 6,
  },
  viewTransactionsBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.tint,
  },
  doneBtn: {
    backgroundColor: Colors.card2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  doneBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
