import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

const MEMBER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const { user, familyMembers, joinFamily, updateProfile } = useAuth();
  const { language } = useLanguage();
  const isEN = language === "en";

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState<"members" | "join">("members");
  const [editingCount, setEditingCount] = useState(false);
  const [tempCount, setTempCount] = useState(user?.familyMemberCount ?? 2);

  async function handleCopyCode() {
    if (!user) return;
    await Clipboard.setStringAsync(user.familyCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      isEN ? "Copied!" : "Kopyalandı!",
      isEN ? `Family code copied: ${user.familyCode}` : `Aile kodu kopyalandı: ${user.familyCode}`
    );
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    if (joinCode.trim().toUpperCase() === user?.familyCode) {
      Alert.alert(
        isEN ? "Error" : "Hata",
        isEN ? "You cannot join your own family with this code." : "Kendi aile kodunuzu kullanamazsınız."
      );
      return;
    }
    setJoining(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await joinFamily(joinCode.trim().toUpperCase());
    setJoining(false);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        isEN ? "Joined!" : "Katıldınız!",
        isEN ? "You joined the family budget." : "Aile bütçesine katıldınız.",
        [{ text: isEN ? "Great!" : "Harika!", onPress: () => setTab("members") }]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(isEN ? "Error" : "Hata", result.error || "");
    }
  }

  function handleSaveMemberCount() {
    if (!user) return;
    updateProfile(user.name, user.familyName, tempCount);
    setEditingCount(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.card }]}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>{isEN ? "Family Account" : "Aile Hesabı"}</Text>
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
        {/* Family Name Card */}
        <View style={styles.familyCard}>
          <View style={styles.familyIconBox}>
            <Ionicons name="home-outline" size={24} color={Colors.tint} />
          </View>
          <View style={styles.familyCardInfo}>
            <Text style={styles.familyCardName}>{user?.familyName}</Text>
            <Text style={styles.familyCardSub}>
              {familyMembers.length} / {user?.familyMemberCount ?? 2} {isEN ? "member(s)" : "üye"}
            </Text>
          </View>
          {user?.role === "admin" && (
            <Pressable
              style={styles.editCountBtn}
              onPress={() => { setTempCount(user?.familyMemberCount ?? 2); setEditingCount(!editingCount); }}
            >
              <Ionicons name={editingCount ? "close" : "people-outline"} size={18} color={Colors.tint} />
            </Pressable>
          )}
        </View>

        {/* Member Count Editor */}
        {editingCount && user?.role === "admin" && (
          <View style={styles.countEditor}>
            <Text style={styles.countEditorTitle}>
              {isEN ? "Expected Family Size" : "Beklenen Üye Sayısı"}
            </Text>
            <View style={styles.memberCountRow}>
              {MEMBER_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  style={[styles.memberBtn, tempCount === n && styles.memberBtnActive]}
                  onPress={() => { setTempCount(n); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.memberBtnText, tempCount === n && styles.memberBtnTextActive]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.saveCountBtn} onPress={handleSaveMemberCount}>
              <Text style={styles.saveCountBtnText}>{isEN ? "Save" : "Kaydet"}</Text>
            </Pressable>
          </View>
        )}

        {/* Family Code */}
        {user?.role === "admin" && (
          <View style={styles.codeCard}>
            <View style={styles.codeHeader}>
              <Ionicons name="key-outline" size={16} color={Colors.yellow} />
              <Text style={styles.codeTitle}>
                {isEN ? "Family Code" : "Aile Kodu"}
              </Text>
            </View>
            <Text style={styles.codeValue}>{user.familyCode}</Text>
            <Text style={styles.codeHint}>
              {isEN
                ? "Share this code with family members to let them join your budget."
                : "Bu kodu aile üyelerinizle paylaşarak bütçenize katılmalarını sağlayın."}
            </Text>
            <Pressable style={styles.copyBtn} onPress={handleCopyCode}>
              <Ionicons name="copy-outline" size={16} color={Colors.background} />
              <Text style={styles.copyBtnText}>
                {isEN ? "Copy Code" : "Kodu Kopyala"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Tab Switcher */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === "members" && styles.tabActive]}
            onPress={() => { setTab("members"); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.tabText, tab === "members" && styles.tabTextActive]}>
              {isEN ? "Members" : "Üyeler"} ({familyMembers.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === "join" && styles.tabActive]}
            onPress={() => { setTab("join"); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.tabText, tab === "join" && styles.tabTextActive]}>
              {isEN ? "Join Family" : "Aileye Katıl"}
            </Text>
          </Pressable>
        </View>

        {tab === "members" ? (
          <View style={styles.membersList}>
            {familyMembers.map((member) => (
              <View key={member.id} style={styles.memberItem}>
                <View style={[styles.avatar, { backgroundColor: member.avatarColor || Colors.tint }]}>
                  <Text style={styles.avatarText}>
                    {(member.name || "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.name}
                    {member.id === user?.id ? ` (${isEN ? "You" : "Siz"})` : ""}
                  </Text>
                  <Text style={styles.memberEmail}>
                    {member.username ? `@${member.username}  ·  ` : ""}{member.email}
                  </Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: member.role === "admin" ? Colors.tint + "20" : Colors.card2 }]}>
                  <Text style={[styles.roleText, { color: member.role === "admin" ? Colors.tint : Colors.textSecondary }]}>
                    {member.role === "admin" ? (isEN ? "Admin" : "Yönetici") : (isEN ? "Member" : "Üye")}
                  </Text>
                </View>
              </View>
            ))}

            {familyMembers.length === 1 && (
              <View style={styles.emptyHint}>
                <Ionicons name="people-outline" size={32} color={Colors.textTertiary} />
                <Text style={styles.emptyHintText}>
                  {isEN
                    ? "No other members yet. Share your family code to invite family."
                    : "Henüz başka üye yok. Aile kodunuzu paylaşarak davet edin."}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.joinSection}>
            <Text style={styles.joinTitle}>
              {isEN ? "Enter Family Code" : "Aile Kodunu Girin"}
            </Text>
            <Text style={styles.joinSub}>
              {isEN
                ? "Enter the 6-character code shared by your family admin."
                : "Aile yöneticinizin paylaştığı 6 karakterlik kodu girin."}
            </Text>
            <TextInput
              style={styles.codeInput}
              value={joinCode}
              onChangeText={(v) => setJoinCode(v.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor={Colors.textTertiary}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable
              style={[styles.joinBtn, (joining || !joinCode.trim()) && { opacity: 0.6 }]}
              onPress={handleJoin}
              disabled={joining || !joinCode.trim()}
            >
              {joining ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.joinBtnText}>
                  {isEN ? "Join Family" : "Aileye Katıl"}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.blue} />
          <Text style={styles.infoText}>
            {isEN
              ? "Family members share the same budget data on this device. The member who creates the family is the admin."
              : "Aile üyeleri aynı cihazdaki bütçe verilerini paylaşır. Aileyi oluşturan kişi yönetici olur."}
          </Text>
        </View>
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
  content: { padding: 20, gap: 16 },
  familyCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.tint + "30" },
  familyIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.tint + "20", alignItems: "center", justifyContent: "center" },
  familyCardInfo: { flex: 1 },
  familyCardName: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.text, marginBottom: 2 },
  familyCardSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  editCountBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.tint + "15", alignItems: "center", justifyContent: "center" },
  countEditor: { backgroundColor: Colors.background, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.tint + "30" },
  countEditorTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  memberCountRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  memberBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  memberBtnActive: { backgroundColor: Colors.tint, borderColor: Colors.tint },
  memberBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary },
  memberBtnTextActive: { color: Colors.background },
  saveCountBtn: { backgroundColor: Colors.tint, borderRadius: 12, padding: 12, alignItems: "center" },
  saveCountBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.background },
  codeCard: { backgroundColor: Colors.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.yellow + "40" },
  codeHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  codeTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.yellow },
  codeValue: { fontFamily: "Inter_700Bold", fontSize: 36, color: Colors.text, letterSpacing: 4, textAlign: "center", marginBottom: 8 },
  codeHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, textAlign: "center", marginBottom: 14, lineHeight: 17 },
  copyBtn: { backgroundColor: Colors.yellow, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  copyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.background },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  tabActive: { backgroundColor: Colors.tint + "20", borderColor: Colors.tint + "60" },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  tabTextActive: { color: Colors.tint, fontFamily: "Inter_600SemiBold" },
  membersList: { gap: 8 },
  memberItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.background, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.background },
  memberInfo: { flex: 1 },
  memberName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  memberEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  roleText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  emptyHint: { alignItems: "center", padding: 24, gap: 10 },
  emptyHintText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 19 },
  joinSection: { gap: 10 },
  joinTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  joinSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  codeInput: { backgroundColor: Colors.background, borderRadius: 14, padding: 18, fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.text, borderWidth: 1, borderColor: Colors.border, textAlign: "center", letterSpacing: 6 },
  joinBtn: { backgroundColor: Colors.tint, borderRadius: 14, padding: 16, alignItems: "center" },
  joinBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.background },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: Colors.blue + "10", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.blue + "30" },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 17 },
});
