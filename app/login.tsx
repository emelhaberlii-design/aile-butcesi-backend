import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

type Mode = "login" | "register" | "forgot";
type ForgotStep = "email" | "newPassword" | "done";

const MEMBER_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, checkEmailExists, resetPassword } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyMemberCount, setFamilyMemberCount] = useState(2);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");

  const isEN = language === "en";

  function switchMode(m: Mode) {
    setMode(m);
    setIdentifier("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setUsername("");
    setFamilyName("");
    setFamilyMemberCount(2);
    setShowPassword(false);
    setForgotEmail("");
    setForgotStep("email");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    Haptics.selectionAsync();
  }

  async function handleForgotEmailSubmit() {
    const email = forgotEmail.trim();
    if (!email) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Enter your email." : "E-posta adresinizi girin.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Enter a valid email." : "Geçerli bir e-posta girin.");
      return;
    }
    setLoading(true);
    const result = await checkEmailExists(email);
    setLoading(false);
    if (!result.success) {
      Alert.alert(isEN ? "Error" : "Hata", result.error || (isEN ? "No account found with this email." : "Hesap bulunamadı."));
      return;
    }
    setForgotStep("newPassword");
    Haptics.selectionAsync();
  }

  async function handleForgotPasswordSubmit() {
    if (forgotNewPassword.length < 6) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Password must be at least 6 characters." : "Şifre en az 6 karakter olmalı.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Passwords do not match." : "Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    const result = await resetPassword(forgotEmail.trim(), forgotNewPassword);
    setLoading(false);
    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(isEN ? "Error" : "Hata", result.error || (isEN ? "An error occurred." : "Bir hata oluştu."));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setForgotStep("done");
  }

  async function handleSubmit() {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert(isEN ? "Error" : "Hata", isEN ? "Please fill in all fields." : "Tüm alanları doldurun.");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        Alert.alert(isEN ? "Error" : "Hata", isEN ? "Enter your name." : "İsminizi girin.");
        return;
      }
      if (!username.trim()) {
        Alert.alert(isEN ? "Error" : "Hata", isEN ? "Choose a username." : "Kullanıcı adı seçin.");
        return;
      }
      if (username.trim().length < 3) {
        Alert.alert(isEN ? "Error" : "Hata", isEN ? "Username must be at least 3 characters." : "Kullanıcı adı en az 3 karakter olmalı.");
        return;
      }
      if (!/^[a-z0-9_]+$/.test(username.trim().toLowerCase())) {
        Alert.alert(isEN ? "Error" : "Hata", isEN ? "Username can only contain letters, numbers and underscore." : "Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir.");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier.trim())) {
        Alert.alert(isEN ? "Error" : "Hata", isEN ? "Please enter a valid email address." : "Geçerli bir e-posta adresi girin. (örn: ornek@email.com)");
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert(isEN ? "Error" : "Hata", isEN ? "Passwords do not match." : "Şifreler eşleşmiyor.");
        return;
      }
      if (password.length < 6) {
        Alert.alert(isEN ? "Error" : "Hata", isEN ? "Password must be at least 6 characters." : "Şifre en az 6 karakter olmalı.");
        return;
      }
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let result;
    if (mode === "login") {
      result = await login(identifier.trim(), password, rememberMe);
    } else {
      result = await register(
        name.trim(),
        username.trim().toLowerCase(),
        identifier.trim(),
        password,
        familyName.trim(),
        familyMemberCount
      );
    }

    setLoading(false);

    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(isEN ? "Error" : "Hata", result.error || (isEN ? "An error occurred." : "Bir hata oluştu."));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.langRow}>
            <Pressable
              style={[styles.langBtn, language === "tr" && styles.langBtnActive]}
              onPress={() => { setLanguage("tr"); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.langFlag]}>🇹🇷</Text>
              <Text style={[styles.langLabel, language === "tr" && styles.langLabelActive]}>Türkçe</Text>
            </Pressable>
            <Pressable
              style={[styles.langBtn, language === "en" && styles.langBtnActive]}
              onPress={() => { setLanguage("en"); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.langFlag]}>🇬🇧</Text>
              <Text style={[styles.langLabel, language === "en" && styles.langLabelActive]}>English</Text>
            </Pressable>
          </View>

          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Ionicons name="wallet-outline" size={40} color={Colors.tint} />
            </View>
            <Text style={styles.appName}>{isEN ? "Family Budget" : "Aile Bütçesi"}</Text>
            <Text style={styles.tagline}>
              {isEN ? "Manage your family finances together" : "Ailenizin bütçesini birlikte yönetin"}
            </Text>
          </View>

          {mode !== "forgot" && (
            <View style={styles.modeSwitcher}>
              <Pressable
                style={[styles.modeBtn, mode === "login" && styles.modeBtnActive]}
                onPress={() => switchMode("login")}
              >
                <Text style={[styles.modeBtnText, mode === "login" && styles.modeBtnTextActive]}>
                  {isEN ? "Log In" : "Giriş Yap"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, mode === "register" && styles.modeBtnActive]}
                onPress={() => switchMode("register")}
              >
                <Text style={[styles.modeBtnText, mode === "register" && styles.modeBtnTextActive]}>
                  {isEN ? "Sign Up" : "Kayıt Ol"}
                </Text>
              </Pressable>
            </View>
          )}

          {mode === "forgot" && (
            <View style={styles.forgotCard}>
              <Pressable style={styles.forgotBackBtn} onPress={() => switchMode("login")}>
                <Ionicons name="arrow-back" size={18} color={Colors.tint} />
                <Text style={styles.forgotBackText}>{isEN ? "Back to Login" : "Girişe Dön"}</Text>
              </Pressable>

              <View style={styles.forgotHeader}>
                <View style={styles.forgotIconCircle}>
                  <Ionicons name="lock-open-outline" size={28} color={Colors.tint} />
                </View>
                <Text style={styles.forgotTitle}>{isEN ? "Reset Password" : "Şifre Sıfırla"}</Text>
                <Text style={styles.forgotSubtitle}>
                  {forgotStep === "email"
                    ? (isEN ? "Enter your registered email address" : "Kayıtlı e-posta adresinizi girin")
                    : forgotStep === "newPassword"
                      ? (isEN ? "Create a new password" : "Yeni şifrenizi oluşturun")
                      : (isEN ? "Password updated successfully!" : "Şifreniz başarıyla güncellendi!")}
                </Text>
              </View>

              {forgotStep === "email" && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{isEN ? "Email" : "E-posta"}</Text>
                    <View style={styles.inputRow}>
                      <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
                      <TextInput
                        style={styles.input}
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        placeholder="ornek@email.com"
                        placeholderTextColor={Colors.textTertiary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus
                        returnKeyType="go"
                        onSubmitEditing={handleForgotEmailSubmit}
                      />
                    </View>
                  </View>
                  <Pressable
                    testID="forgot-continue-btn"
                    accessibilityRole="button"
                    style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                    disabled={loading}
                    onPress={handleForgotEmailSubmit}
                  >
                    {loading ? <ActivityIndicator color={Colors.background} /> : (
                      <Text style={styles.submitText}>{isEN ? "Continue" : "Devam Et"}</Text>
                    )}
                  </Pressable>
                </>
              )}

              {forgotStep === "newPassword" && (
                <>
                  <View style={styles.forgotEmailBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                    <Text style={styles.forgotEmailText}>{forgotEmail}</Text>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{isEN ? "New Password" : "Yeni Şifre"}</Text>
                    <View style={styles.inputRow}>
                      <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
                      <TextInput
                        style={styles.input}
                        value={forgotNewPassword}
                        onChangeText={setForgotNewPassword}
                        placeholder={isEN ? "Min. 6 characters" : "En az 6 karakter"}
                        placeholderTextColor={Colors.textTertiary}
                        secureTextEntry={!showPassword}
                        autoFocus
                      />
                      <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{isEN ? "Confirm New Password" : "Yeni Şifre Tekrar"}</Text>
                    <View style={styles.inputRow}>
                      <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
                      <TextInput
                        style={styles.input}
                        value={forgotConfirmPassword}
                        onChangeText={setForgotConfirmPassword}
                        placeholder={isEN ? "Re-enter new password" : "Yeni şifreyi tekrar girin"}
                        placeholderTextColor={Colors.textTertiary}
                        secureTextEntry={!showPassword}
                      />
                    </View>
                  </View>
                  <Pressable
                    testID="forgot-update-btn"
                    style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                    disabled={loading}
                    onPress={handleForgotPasswordSubmit}
                  >
                    {loading ? <ActivityIndicator color={Colors.background} /> : (
                      <Text style={styles.submitText}>{isEN ? "Update Password" : "Şifreyi Güncelle"}</Text>
                    )}
                  </Pressable>
                </>
              )}

              {forgotStep === "done" && (
                <>
                  <View style={styles.forgotSuccessIcon}>
                    <Ionicons name="checkmark-circle" size={56} color={Colors.green} />
                  </View>
                  <Pressable
                    style={styles.submitBtn}
                    onPress={() => switchMode("login")}
                  >
                    <Text style={styles.submitText}>{isEN ? "Back to Login" : "Giriş Ekranına Dön"}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          <View style={[styles.form, mode === "forgot" && { display: "none" }]}>
            {mode === "register" && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{isEN ? "Your Name" : "Adınız Soyadınız"}</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder={isEN ? "John Smith" : "Ahmet Yılmaz"}
                      placeholderTextColor={Colors.textTertiary}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{isEN ? "Username" : "Kullanıcı Adı"}</Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.atSign}>@</Text>
                    <TextInput
                      style={styles.input}
                      value={username}
                      onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder={isEN ? "john_smith" : "ahmet_yilmaz"}
                      placeholderTextColor={Colors.textTertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <Text style={styles.inputHint}>
                    {isEN ? "Letters, numbers and underscore only" : "Harf, rakam ve alt çizgi kullanabilirsiniz"}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{isEN ? "Family Name (Optional)" : "Aile Adı (İsteğe Bağlı)"}</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="home-outline" size={18} color={Colors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={familyName}
                      onChangeText={setFamilyName}
                      placeholder={isEN ? "Smith Family" : "Yılmaz Ailesi"}
                      placeholderTextColor={Colors.textTertiary}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{isEN ? "Family Size" : "Aile Üye Sayısı"}</Text>
                  <View style={styles.memberCountRow}>
                    {MEMBER_OPTIONS.map((n) => (
                      <Pressable
                        key={n}
                        style={[styles.memberBtn, familyMemberCount === n && styles.memberBtnActive]}
                        onPress={() => { setFamilyMemberCount(n); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.memberBtnText, familyMemberCount === n && styles.memberBtnTextActive]}>
                          {n}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.inputHint}>
                    {isEN
                      ? `${familyMemberCount} person${familyMemberCount > 1 ? "s" : ""} in this family`
                      : `Bu ailede ${familyMemberCount} kişi`}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {mode === "login"
                  ? (isEN ? "Email or Username" : "E-posta veya Kullanıcı Adı")
                  : (isEN ? "Email" : "E-posta")}
              </Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={mode === "login" ? (isEN ? "email or @username" : "e-posta veya @kullanici") : "ornek@email.com"}
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType={mode === "register" ? "email-address" : "default"}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{isEN ? "Password" : "Şifre"}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isEN ? "Min. 6 characters" : "En az 6 karakter"}
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={Colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{isEN ? "Confirm Password" : "Şifre Tekrar"}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={isEN ? "Re-enter password" : "Şifreyi tekrar girin"}
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>
            )}

            {mode === "login" && (
              <>
                <Pressable
                  style={styles.rememberRow}
                  onPress={() => { setRememberMe(!rememberMe); Haptics.selectionAsync(); }}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Ionicons name="checkmark" size={14} color={Colors.background} />}
                  </View>
                  <Text style={styles.rememberText}>
                    {isEN ? "Remember me" : "Beni hatırla"}
                  </Text>
                  <Text style={styles.rememberHint}>
                    {isEN ? "(Stay logged in)" : "(Oturumu açık tut)"}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.forgotLink}
                  onPress={() => switchMode("forgot")}
                >
                  <Ionicons name="key-outline" size={14} color={Colors.tint} />
                  <Text style={styles.forgotLinkText}>
                    {isEN ? "Forgot Password?" : "Şifremi Unuttum"}
                  </Text>
                </Pressable>
              </>
            )}

            {mode !== "forgot" && (
              <Pressable
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.background} />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === "login"
                      ? (isEN ? "Log In" : "Giriş Yap")
                      : (isEN ? "Create Account" : "Hesap Oluştur")}
                  </Text>
                )}
              </Pressable>
            )}
          </View>

          <View style={styles.features}>
            {[
              { icon: "people-outline", text: isEN ? "Share budget with your family" : "Aile ile bütçeyi paylaş" },
              { icon: "shield-checkmark-outline", text: isEN ? "Your data stays on your device" : "Verileriniz cihazınızda güvende" },
              { icon: "analytics-outline", text: isEN ? "AI-powered financial insights" : "AI destekli finansal analiz" },
            ].map(({ icon, text }) => (
              <View key={text} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={icon as any} size={16} color={Colors.tint} />
                </View>
                <Text style={styles.featureText}>{text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24 },
  langRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  langBtnActive: {
    backgroundColor: Colors.tint + "18",
    borderColor: Colors.tint,
  },
  langFlag: { fontSize: 18 },
  langLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  langLabelActive: {
    color: Colors.tint,
  },
  logoArea: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.tint + "20",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16, borderWidth: 1, borderColor: Colors.tint + "40",
  },
  appName: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.text, marginBottom: 6 },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
  modeSwitcher: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  modeBtnActive: { backgroundColor: Colors.tint },
  modeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.background },
  form: { gap: 4, marginBottom: 32 },
  inputGroup: { marginBottom: 12 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text },
  atSign: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.tint },
  inputHint: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary,
    marginTop: 5, marginLeft: 4,
  },
  memberCountRow: {
    flexDirection: "row", gap: 8, flexWrap: "wrap",
  },
  memberBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  memberBtnActive: { backgroundColor: Colors.tint, borderColor: Colors.tint },
  memberBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary },
  memberBtnTextActive: { color: Colors.background },
  rememberRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginBottom: 12, marginTop: 4,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.card,
  },
  checkboxActive: { backgroundColor: Colors.tint, borderColor: Colors.tint },
  rememberText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  rememberHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary },
  submitBtn: {
    backgroundColor: Colors.tint, borderRadius: 16, padding: 18,
    alignItems: "center", marginTop: 8,
  },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.background },
  forgotLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
    paddingVertical: 6,
  },
  forgotLinkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.tint,
  },
  forgotCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    gap: 4,
  },
  forgotBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  forgotBackText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.tint,
  },
  forgotHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  forgotIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.tint + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.tint + "40",
  },
  forgotTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
    marginBottom: 6,
  },
  forgotSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  forgotEmailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.green + "15",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.green + "30",
  },
  forgotEmailText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.green,
  },
  forgotSuccessIcon: {
    alignItems: "center",
    marginVertical: 16,
  },
  features: { gap: 12 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.tint + "20", alignItems: "center", justifyContent: "center",
  },
  featureText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
});
