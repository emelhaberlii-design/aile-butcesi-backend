import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  TextInput,
  Image,
  Switch,
  DeviceEventEmitter,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useBudget } from "@/context/BudgetContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Language } from "@/lib/i18n";
import {
  requestNotificationPermission,
  scheduleDailyMotivation,
  cancelAllNotifications,
  getNotificationsEnabled,
  setNotificationsEnabled,
  getNotifTime,
  setNotifTime,
  schedulePaymentReminders,
  type PaymentItem,
  type FinancialContext,
} from "@/lib/notifications";

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("tr-TR").format(Math.round(amount)) + " ₺";
}

interface SettingRowProps {
  icon: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  onPress: () => void;
  isDestructive?: boolean;
  rightElement?: React.ReactNode;
}

function SettingRow({ icon, iconColor, label, subtitle, badge, badgeColor, onPress, isDestructive, rightElement }: SettingRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
    >
      <View style={[styles.rowIconBox, { backgroundColor: iconColor + "20" }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, isDestructive && { color: Colors.red }]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: (badgeColor || Colors.tint) + "20" }]}>
          <Text style={[styles.badgeText, { color: badgeColor || Colors.tint }]}>{badge}</Text>
        </View>
      ) : null}
      {rightElement || <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage } = useLanguage();
  const { user, familyMembers, logout, updateProfilePhoto } = useAuth();
  const {
    creditCards, loans, monthlyIncome, monthlyExpenses, totalLoanPayments,
    incomes, expenses, savingsGoal,
  } = useBudget();

  const [notificationsOn, setNotificationsOn] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifHour, setNotifHour] = useState(11);
  const [notifMinute, setNotifMinute] = useState(0);

  const isEN = language === "en";
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;

  useEffect(() => {
    getNotificationsEnabled().then(setNotificationsOn);
    getNotifTime().then(({ hour, minute }) => {
      setNotifHour(hour);
      setNotifMinute(minute);
    });
  }, []);

  function buildFinancialContext(): FinancialContext {
    return { 
      totalDebt: loans.reduce((s, l) => s + (l.remainingAmount ?? 0), 0), 
      totalCreditDebt: creditCards.reduce((s, c) => s + (c.currentDebt ?? 0), 0), 
      totalInvestment: 0, hasGoals: !!savingsGoal, savingsRate, monthlyIncome, monthlyExpenses 
    };
  }

  async function handleToggleNotifications(val: boolean) {
    if (Platform.OS === "web") return;
    setNotifLoading(true);
    try {
      if (val) {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleDailyMotivation(isEN, buildFinancialContext());
          setNotificationsOn(true);
          await setNotificationsEnabled(true);
        }
      } else {
        await cancelAllNotifications();
        setNotificationsOn(false);
        await setNotificationsEnabled(false);
      }
    } finally { setNotifLoading(false); }
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={styles.title}>{t("settingsTitle")}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        
        {/* Profil Kartı */}
        <Pressable style={styles.profileCard} onPress={() => {}}>
          <View style={[styles.avatar, { backgroundColor: user?.avatarColor || Colors.tint }]}>
            {user?.photoUri ? <Image source={{ uri: user.photoUri }} style={styles.avatarPhoto} /> : <Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text>}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.familyTag}>
              <Text style={styles.familyTagText}>{user?.familyName || "Aile Grubu"}</Text>
            </View>
          </View>
        </Pressable>

        {/* Dil Seçimi */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{t("languageLabel")}</Text>
          <View style={styles.groupCard}>
            <Pressable style={[styles.langBtn, language === 'tr' && styles.langBtnActive]} onPress={() => setLanguage('tr')}>
              <Text style={styles.langText}>Türkçe 🇹🇷</Text>
              {language === 'tr' && <Ionicons name="checkmark-circle" size={18} color={Colors.tint} />}
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable style={[styles.langBtn, language === 'en' && styles.langBtnActive]} onPress={() => setLanguage('en')}>
              <Text style={styles.langText}>English 🇬🇧</Text>
              {language === 'en' && <Ionicons name="checkmark-circle" size={18} color={Colors.tint} />}
            </Pressable>
          </View>
        </View>

        {/* Finansal Özellikler */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{isEN ? "Features" : "Özellikler"}</Text>
          <View style={styles.groupCard}>
            <SettingRow icon="people-outline" iconColor={Colors.tint} label={isEN ? "Family Account" : "Aile Hesabı"} subtitle={`${familyMembers.length} ${isEN ? "members" : "üye"}`} onPress={() => router.push("/family")} />
            <View style={styles.rowDivider} />
            <SettingRow icon="business-outline" iconColor={Colors.purple} label={isEN ? "My Business" : "İş Yerim"} subtitle={isEN ? "Business management" : "Kurumsal bütçe yönetimi"} onPress={() => router.push("/corporate")} />
            <View style={styles.rowDivider} />
            <SettingRow icon="scan-outline" iconColor={Colors.blue} label={isEN ? "Receipt Scan" : "Fiş Tarama"} subtitle="AI Destekli" onPress={() => router.push("/receipt-scan")} />
            <View style={styles.rowDivider} />
            <SettingRow icon="document-text-outline" iconColor={Colors.green} label={isEN ? "Reports" : "Bütçe Raporları"} subtitle="PDF / Excel" onPress={() => router.push("/report")} />
          </View>
        </View>

        {/* Gelir / Gider Yönetimi */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{t("financialMgmt")}</Text>
          <View style={styles.groupCard}>
            <SettingRow icon="card-outline" iconColor={Colors.purple} label={t("creditCardsMenu")} subtitle={`${creditCards.length} ${t("creditCardsMenu")}`} onPress={() => router.push("/manage-cards")} />
            <View style={styles.rowDivider} />
            <SettingRow icon="home-outline" iconColor={Colors.orange} label={t("loanTracking")} subtitle={formatAmount(totalLoanPayments)} onPress={() => router.push("/add-loan")} />
            <View style={styles.rowDivider} />
            <SettingRow icon="repeat-outline" iconColor={Colors.blue} label={t("recurringMenuLabel")} onPress={() => router.push("/recurring")} />
          </View>
        </View>

        {/* Uygulama Ayarları */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{t("appSection")}</Text>
          <View style={styles.groupCard}>
            <View style={styles.settingRow}>
              <View style={[styles.rowIconBox, { backgroundColor: Colors.blue + "20" }]}>
                <Ionicons name="notifications-outline" size={18} color={Colors.blue} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{isEN ? "Notifications" : "Bildirimler"}</Text>
              </View>
              <Switch value={notificationsOn} onValueChange={handleToggleNotifications} disabled={notifLoading} />
            </View>
            <View style={styles.rowDivider} />
            <SettingRow icon="log-out-outline" iconColor={Colors.red} label={isEN ? "Log Out" : "Çıkış Yap"} isDestructive onPress={logout} />
            <View style={styles.rowDivider} />
            {/* Apple Hesap Silme Butonu */}
            <SettingRow 
              icon="trash-outline" 
              iconColor={Colors.red} 
              label={isEN ? "Delete Account" : "Hesabımı Kalıcı Olarak Sil"} 
              isDestructive 
              onPress={() => {
                Alert.alert(
                  isEN ? "Delete Account" : "Hesabı Sil", 
                  isEN ? "Are you sure? This will permanently remove all your data." : "Emin misiniz? Tüm verileriniz kalıcı olarak silinecektir.",
                  [
                    { text: isEN ? "Cancel" : "Vazgeç", style: "cancel" },
                    { 
                      text: isEN ? "Delete" : "Sil", 
                      style: "destructive", 
                      onPress: async () => {
                        try {
                          const res = await fetch('/api/user', { method: 'DELETE' });
                          if(res.ok) {
                            logout();
                            router.replace('/login');
                          }
                        } catch (e) {
                          Alert.alert("Error", "İşlem şu an yapılamıyor.");
                        }
                      } 
                    }
                  ]
                );
              }} 
            />
          </View>
        </View>

        <Text style={styles.version}>v1.0.0 - KlinikTakip</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "bold", color: Colors.text },
  profileCard: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: Colors.card, borderRadius: 20, marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center" },
  avatarPhoto: { width: 64, height: 64, borderRadius: 32 },
  avatarText: { fontSize: 24, color: "#fff", fontWeight: "bold" },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileName: { fontSize: 18, fontWeight: "bold", color: Colors.text },
  profileEmail: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  familyTag: { backgroundColor: Colors.tint + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start", marginTop: 6 },
  familyTagText: { fontSize: 11, color: Colors.tint, fontWeight: "600" },
  group: { marginBottom: 24 },
  groupTitle: { fontSize: 13, fontWeight: "700", color: Colors.textTertiary, marginBottom: 10, marginLeft: 4, textTransform: "uppercase" },
  groupCard: { backgroundColor: Colors.card, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  settingRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  rowIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  rowContent: { flex: 1, marginLeft: 12 },
  rowLabel: { fontSize: 16, color: Colors.text, fontWeight: "500" },
  rowSubtitle: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 64 },
  langBtn: { flexDirection: "row", alignItems: "center", padding: 16, justifyContent: "space-between" },
  langBtnActive: { backgroundColor: Colors.tint + "05" },
  langText: { fontSize: 16, color: Colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 8 },
  badgeText: { fontSize: 12, fontWeight: "bold" },
  version: { textAlign: "center", color: Colors.textTertiary, fontSize: 12, marginTop: 20 }
});