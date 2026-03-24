import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
  ScrollView,
  Image,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useBudget, EXPENSE_CATEGORIES, formatInputAmount, parseInputAmount, CurrencyCode } from "@/context/BudgetContext";
import { useLanguage } from "@/context/LanguageContext";
import { localizeCategory, localizeSubcategory } from "@/lib/categories";
import { getApiUrl } from "@/lib/query-client";

type ScanState = "idle" | "analyzing" | "form";

interface FormData {
  title: string;
  amount: string;
  category: string;
  subcategory: string;
  paymentMethod: "cash" | "debit" | "credit";
}

const DEFAULT_FORM: FormData = {
  title: "",
  amount: "",
  category: Object.keys(EXPENSE_CATEGORIES)[0],
  subcategory: Object.values(EXPENSE_CATEGORIES)[0][0],
  paymentMethod: "cash",
};

export default function ReceiptScanScreen() {
  const insets = useSafeAreaInsets();
  const { addExpense } = useBudget();
  const { language } = useLanguage();
  const isEN = language === "en";

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [ocrPartial, setOcrPartial] = useState<Partial<FormData>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const categoryList = Object.keys(EXPENSE_CATEGORIES);

  async function analyzeImage(uri: string, base64: string | null | undefined, mimeType: string) {
    setScanState("analyzing");
    setPhotoUri(uri);

    try {
      let b64 = base64;

      // On web, fetch the blob URI and convert to base64
      if (!b64 && Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (!b64) {
        throw new Error("Could not read image data");
      }

      const apiBase = getApiUrl();
      const endpoint = new URL("/api/receipt-scan", apiBase).toString();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, mimeType }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.error || `Server error ${res.status}`;
        Alert.alert(
          isEN ? "Unavailable" : "Kullanılamıyor",
          isEN ? "Receipt scanning is temporarily unavailable. Please enter the details manually." : "Fiş tarama geçici olarak kullanılamıyor. Lütfen bilgileri manuel olarak girin."
        );
        setScanState("form");
        return;
      }

      const data = await res.json() as {
        amount: number | null;
        title: string | null;
        category: string | null;
        subcategory: string | null;
        paymentMethod: string | null;
      };

      const resolvedCategory = data.category && EXPENSE_CATEGORIES[data.category]
        ? data.category
        : DEFAULT_FORM.category;
      const resolvedSub = data.subcategory && EXPENSE_CATEGORIES[resolvedCategory]?.includes(data.subcategory)
        ? data.subcategory
        : EXPENSE_CATEGORIES[resolvedCategory][0];

      const filled: Partial<FormData> = {};
      if (data.amount) filled.amount = String(data.amount);
      if (data.title) filled.title = data.title;
      filled.category = resolvedCategory;
      filled.subcategory = resolvedSub;
      if (data.paymentMethod === "cash" || data.paymentMethod === "debit" || data.paymentMethod === "credit") {
        filled.paymentMethod = data.paymentMethod;
      }

      setOcrPartial(filled);
      setForm((prev) => ({ ...prev, ...filled }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (err) {
      console.warn("Receipt analysis failed:", err);
      // Fall through to manual form — no crash
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    setScanState("form");
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }

  async function requestAndLaunchCamera() {
    if (Platform.OS === "web") {
      await pickFromGallery();
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        isEN ? "Camera Permission Required" : "Kamera İzni Gerekli",
        isEN
          ? "Please allow camera access in device settings to scan receipts."
          : "Fiş taramak için cihaz ayarlarından kamera iznini etkinleştirin.",
        [{ text: "OK" }]
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [3, 4],
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await analyzeImage(asset.uri, asset.base64, asset.mimeType || "image/jpeg");
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        isEN ? "Gallery Permission Required" : "Galeri İzni Gerekli",
        isEN
          ? "Please allow gallery access to pick a receipt photo."
          : "Fiş fotoğrafı seçmek için galeri iznini etkinleştirin.",
        [{ text: "OK" }]
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [3, 4],
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await analyzeImage(asset.uri, asset.base64, asset.mimeType || "image/jpeg");
    }
  }

  function handleCategoryChange(cat: string) {
    const firstSub = EXPENSE_CATEGORIES[cat]?.[0] || "";
    setForm((p) => ({ ...p, category: cat, subcategory: firstSub }));
    Haptics.selectionAsync();
  }

  function handleAdd() {
    const parsed = parseInputAmount(form.amount);
    if (!form.amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert(
        isEN ? "Enter Amount" : "Tutarı Girin",
        isEN ? "Please enter the receipt amount." : "Fişin tutarını girin."
      );
      return;
    }
    addExpense({
      title: form.title.trim() || form.subcategory,
      amount: parsed,
      category: form.category,
      subcategory: form.subcategory,
      date: new Date().toISOString(),
      paymentMethod: form.paymentMethod,
      isRecurring: false,
      isInstallment: false,
      currency: "TRY" as CurrencyCode,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      isEN ? "Added!" : "Eklendi!",
      isEN ? "Expense saved successfully." : "Gider kaydedildi.",
      [{ text: "OK", onPress: () => router.back() }]
    );
  }

  function reset() {
    setScanState("idle");
    setPhotoUri(null);
    setOcrPartial({});
    fadeAnim.setValue(0);
    setForm(DEFAULT_FORM);
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.card }]}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>{isEN ? "Receipt Entry" : "Fiş ile Gider Ekle"}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <View style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={Colors.textSecondary} />
          </View>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Idle State */}
        {scanState === "idle" && (
          <>
            <View style={styles.cameraBox}>
              <Ionicons name="scan-outline" size={52} color={Colors.tint} />
              <Text style={styles.cameraIdleTitle}>
                {isEN ? "Scan Your Receipt" : "Fişi veya Faturayı Tara"}
              </Text>
              <Text style={styles.cameraIdleSub}>
                {isEN
                  ? "Optical scanning reads amount, merchant and category automatically."
                  : "Görsel tarama tutarı, işyerini ve kategoriyi otomatik okuyacak."}
              </Text>
            </View>

            <Pressable style={styles.scanBtn} onPress={requestAndLaunchCamera}>
              <Ionicons name="scan" size={22} color={Colors.background} />
              <Text style={styles.scanBtnText}>{isEN ? "Scan Receipt" : "Fiş Tara"}</Text>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable style={styles.galleryBtn} onPress={pickFromGallery}>
                <Ionicons name="images-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.galleryBtnText}>{isEN ? "From Gallery" : "Galeriden Seç"}</Text>
              </Pressable>
              <Pressable style={styles.cameraBtn} onPress={requestAndLaunchCamera}>
                <Ionicons name="camera-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.galleryBtnText}>{isEN ? "Take Photo" : "Fotoğraf Çek"}</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Analyzing State */}
        {scanState === "analyzing" && (
          <View style={styles.analyzingBox}>
            {photoUri && (
              <Image source={{ uri: photoUri }} style={styles.analyzingImage} resizeMode="contain" />
            )}
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator size="large" color={Colors.tint} />
              <Text style={styles.analyzingText}>
                {isEN ? "Reading receipt..." : "Fiş okunuyor..."}
              </Text>
              <Text style={styles.analyzingSubText}>
                {isEN ? "Detecting amount and category" : "Tutar ve kategori tespit ediliyor"}
              </Text>
            </View>
          </View>
        )}

        {/* Form State — after OCR analysis */}
        {scanState === "form" && photoUri && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Receipt Photo */}
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.receiptImage} resizeMode="contain" />
              <Pressable style={styles.retakeBtn} onPress={reset}>
                <Ionicons name="camera-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.retakeBtnText}>{isEN ? "Retake" : "Yeniden Çek"}</Text>
              </Pressable>
            </View>

            {Object.keys(ocrPartial).length > 0 ? (
              <View style={styles.ocrSuccessBox}>
                <Ionicons name="checkmark-circle-outline" size={15} color={Colors.tint} />
                <Text style={styles.ocrSuccessText}>
                  {isEN
                    ? "Scan detected the details — please verify before saving."
                    : "Tarama bilgileri algıladı — kaydetmeden önce kontrol edin."}
                </Text>
              </View>
            ) : (
              <View style={styles.ocrFailBox}>
                <Ionicons name="create-outline" size={15} color={Colors.yellow} />
                <Text style={styles.ocrFailText}>
                  {isEN
                    ? "Could not read the receipt automatically — please fill in manually."
                    : "Fiş okunamadı — lütfen bilgileri manuel girin."}
                </Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.formCard}>
              {/* Amount */}
              <Text style={styles.fieldLabel}>
                {isEN ? "Amount" : "Tutar"}
                <Text style={styles.required}> *</Text>
              </Text>
              <View style={[styles.amountRow, ocrPartial.amount ? styles.amountRowOCR : null]}>
                <Text style={styles.currencySymbol}>₺</Text>

                <TextInput
                  style={styles.amountInput}
                  value={form.amount}
                  onChangeText={(v) => setForm((p) => ({ ...p, amount: formatInputAmount(v) }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  autoFocus={!ocrPartial.amount}
                />
                {!!ocrPartial.amount && (
                  <View style={styles.ocrTag}>
                    <Text style={styles.ocrTagText}>OCR</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              <Text style={styles.fieldLabel}>
                {isEN ? "Description" : "Açıklama"}
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  value={form.title}
                  onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
                  placeholder={isEN ? "e.g. Therapy session" : "örn. Psikoloji seansı"}
                  placeholderTextColor={Colors.textTertiary}
                />
                {!!ocrPartial.title && (
                  <View style={[styles.ocrTag, { marginLeft: 6 }]}>
                    <Text style={styles.ocrTagText}>OCR</Text>
                  </View>
                )}
              </View>

              {/* Category */}
              <Text style={styles.fieldLabel}>
                {isEN ? "Category" : "Kategori"}
                {ocrPartial.category ? (
                  <Text style={styles.ocrInlineTag}>{isEN ? " (OCR)" : " (Tarama)"}</Text>
                ) : null}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                keyboardShouldPersistTaps="handled"
              >
                {categoryList.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.chip, form.category === cat && styles.chipActive]}
                    onPress={() => handleCategoryChange(cat)}
                  >
                    <Text style={[styles.chipText, form.category === cat && styles.chipTextActive]}>
                      {localizeCategory(cat, language)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Subcategory */}
              <Text style={styles.fieldLabel}>{isEN ? "Subcategory" : "Alt Kategori"}</Text>
              <View style={styles.subChipRow}>
                {(EXPENSE_CATEGORIES[form.category] || []).map((sub) => (
                  <Pressable
                    key={sub}
                    style={[styles.subChip, form.subcategory === sub && styles.subChipActive]}
                    onPress={() => { setForm((p) => ({ ...p, subcategory: sub })); Haptics.selectionAsync(); }}
                  >
                    <Text style={[styles.subChipText, form.subcategory === sub && styles.subChipTextActive]}>
                      {localizeSubcategory(sub, language)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Payment Method */}
              <Text style={styles.fieldLabel}>{isEN ? "Payment Method" : "Ödeme Yöntemi"}</Text>
              <View style={styles.paymentRow}>
                {[
                  { key: "cash" as const, label: isEN ? "Cash" : "Nakit", icon: "cash-outline", color: Colors.green },
                  { key: "debit" as const, label: isEN ? "Debit" : "Banka", icon: "card-outline", color: Colors.blue },
                  { key: "credit" as const, label: isEN ? "Credit" : "Kredi", icon: "card", color: Colors.purple },
                ].map(({ key, label, icon, color }) => (
                  <Pressable
                    key={key}
                    style={[styles.payBtn, form.paymentMethod === key && { backgroundColor: color + "20", borderColor: color }]}
                    onPress={() => { setForm((p) => ({ ...p, paymentMethod: key })); Haptics.selectionAsync(); }}
                  >
                    <Ionicons name={icon as any} size={16} color={form.paymentMethod === key ? color : Colors.textSecondary} />
                    <Text style={[styles.payBtnText, form.paymentMethod === key && { color }]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Submit */}
            <Pressable style={styles.addBtn} onPress={handleAdd}>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.background} />
              <Text style={styles.addBtnText}>{isEN ? "Save Expense" : "Gideri Kaydet"}</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginTop: 12, marginBottom: 6 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.card2, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 14 },

  cameraBox: {
    height: 180, backgroundColor: Colors.background, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24,
  },
  cameraIdleTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text, textAlign: "center" },
  cameraIdleSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 18 },

  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: Colors.tint, borderRadius: 16, paddingVertical: 16 },
  scanBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.background },

  actionRow: { flexDirection: "row", gap: 10 },
  galleryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.card2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 13, borderWidth: 1, borderColor: Colors.border },
  galleryBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  cameraBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.card2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 13, borderWidth: 1, borderColor: Colors.border },
  cameraBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },

  analyzingBox: { borderRadius: 16, overflow: "hidden", position: "relative", minHeight: 260 },
  analyzingImage: { width: "100%", height: 260, backgroundColor: Colors.background },
  analyzingOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(10,10,10,0.75)",
    alignItems: "center", justifyContent: "center", gap: 12,
  },
  analyzingText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  analyzingSubText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },

  photoContainer: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.border, position: "relative" },
  receiptImage: { width: "100%", height: 220, backgroundColor: Colors.background },
  retakeBtn: { position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  retakeBtnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },

  ocrSuccessBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.tint + "15", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.tint + "30" },
  ocrSuccessText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.tint, flex: 1, lineHeight: 17 },
  ocrFailBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.yellow + "15", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.yellow + "30" },
  ocrFailText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.yellow, flex: 1, lineHeight: 17 },

  formCard: { backgroundColor: Colors.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 4 },

  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary, marginBottom: 6, marginTop: 10 },
  ocrInlineTag: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.tint },
  required: { color: Colors.red },
  fieldInput: { backgroundColor: Colors.card2, borderRadius: 10, padding: 12, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  inputRow: { flexDirection: "row", alignItems: "center" },

  amountRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.card2, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  amountRowOCR: { borderColor: Colors.tint + "60", backgroundColor: Colors.tint + "08" },
  currencySymbol: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.tint },
  amountInput: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 34, color: Colors.text },

  ocrTag: { backgroundColor: Colors.tint + "20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  ocrTagText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.tint },

  chipRow: { flexDirection: "row", gap: 6, paddingBottom: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.tint + "20", borderColor: Colors.tint + "60" },
  chipText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  chipTextActive: { color: Colors.tint, fontFamily: "Inter_600SemiBold" },

  subChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  subChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.border },
  subChipActive: { backgroundColor: Colors.blue + "20", borderColor: Colors.blue + "60" },
  subChipText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  subChipTextActive: { color: Colors.blue, fontFamily: "Inter_600SemiBold" },

  paymentRow: { flexDirection: "row", gap: 8 },
  payBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, padding: 10, borderRadius: 10, backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.border },
  payBtnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },

  addBtn: { backgroundColor: Colors.tint, borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  addBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.background },
});
