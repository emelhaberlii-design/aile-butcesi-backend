import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  familyCode: string;
  familyName: string;
  familyMemberCount: number;
  role: "admin" | "member";
  avatarColor: string;
  photoUri?: string;
  spouseName?: string;
  customMembers?: string[];
}

interface FamilyMember {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "member";
  avatarColor: string;
  joinedAt: string;
}

interface AuthContextValue {
  user: User | null;
  familyMembers: FamilyMember[];
  isLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, username: string, email: string, password: string, familyName: string, familyMemberCount: number) => Promise<{ success: boolean; error?: string }>;
  checkEmailExists: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  joinFamily: (familyCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (name: string, familyName: string, familyMemberCount?: number, spouseName?: string) => void;
  addCustomMember: (memberName: string) => void;
  removeCustomMember: (memberName: string) => void;
  updateProfilePhoto: (photoUri: string | undefined) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEYS = {
  USERS_DB: "@auth_users_db",
  CURRENT_USER: "@auth_current_user",
  FAMILY_MEMBERS: "@auth_family_members",
};

const AVATAR_COLORS = ["#00C97A", "#0A84FF", "#BF5AF2", "#FF9F0A", "#FF453A", "#5AC8FA"];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateFamilyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function generateUsername(name: string): string {
  const base = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  return base + Math.floor(Math.random() * 1000);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const userJson = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (userJson) {
        const loadedUser = JSON.parse(userJson) as User;
        if (!loadedUser.username) {
          loadedUser.username = generateUsername(loadedUser.name);
        }
        if (!loadedUser.familyMemberCount) {
          loadedUser.familyMemberCount = 2;
        }
        setUser(loadedUser);
        await loadFamilyMembers(loadedUser.familyCode);
      }
    } catch (e) {
      console.error("Auth load error", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFamilyMembers(familyCode: string) {
    try {
      const url = new URL(`/api/family/members/${familyCode.toUpperCase()}`, getApiUrl());
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.members && data.members.length > 0) {
          setFamilyMembers(data.members);
          return;
        }
      }
    } catch {}
    try {
      const dbJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      if (!dbJson) return;
      const db: User[] = JSON.parse(dbJson);
      const members: FamilyMember[] = db
        .filter((u) => u.familyCode === familyCode)
        .map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username || generateUsername(u.name),
          email: u.email,
          role: u.role,
          avatarColor: u.avatarColor,
          joinedAt: new Date().toISOString(),
        }));
      setFamilyMembers(members);
    } catch {}
  }

  async function getDB(): Promise<User[]> {
    const dbJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
    return dbJson ? JSON.parse(dbJson) : [];
  }

  async function saveDB(db: User[]) {
    await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(db));
  }

  async function login(
    identifier: string,
    password: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDB();
      const normalizedIdentifier = identifier.toLowerCase().trim();
      const found = db.find(
        (u) =>
          u.email.toLowerCase() === normalizedIdentifier ||
          (u.username && u.username.toLowerCase() === normalizedIdentifier)
      );
      if (!found) {
        return { success: false, error: "Bu e-posta veya kullanıcı adıyla kayıtlı hesap bulunamadı." };
      }
      const storedHash = await AsyncStorage.getItem(`@auth_pwd_${found.id}`);
      if (storedHash !== password) {
        return { success: false, error: "Şifre hatalı. Lütfen tekrar deneyin." };
      }
      const userWithDefaults: User = {
        ...found,
        username: found.username || generateUsername(found.name),
        familyMemberCount: found.familyMemberCount || 2,
      };
      setUser(userWithDefaults);
      if (rememberMe) {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userWithDefaults));
      }
      await loadFamilyMembers(userWithDefaults.familyCode);
      return { success: true };
    } catch (e) {
      return { success: false, error: "Giriş sırasında hata oluştu." };
    }
  }

  async function register(
    name: string,
    username: string,
    email: string,
    password: string,
    familyName: string,
    familyMemberCount: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDB();
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim().toLowerCase();

      if (db.find((u) => u.email.toLowerCase() === normalizedEmail)) {
        return { success: false, error: "Bu e-posta zaten kayıtlı. Giriş yapın." };
      }
      if (db.find((u) => u.username && u.username.toLowerCase() === normalizedUsername)) {
        return { success: false, error: "Bu kullanıcı adı zaten kullanılıyor. Farklı bir tane seçin." };
      }

      const newUser: User = {
        id: generateId(),
        name: name.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        familyCode: generateFamilyCode(),
        familyName: familyName.trim() || `${name.trim()}'nin Ailesi`,
        familyMemberCount: familyMemberCount || 2,
        role: "admin",
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      };

      await AsyncStorage.setItem(`@auth_pwd_${newUser.id}`, password);
      await saveDB([...db, newUser]);
      setUser(newUser);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
      setFamilyMembers([{
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        role: "admin",
        avatarColor: newUser.avatarColor,
        joinedAt: new Date().toISOString(),
      }]);
      try {
        const url = new URL("/api/family/register", getApiUrl());
        await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            familyCode: newUser.familyCode,
            member: {
              id: newUser.id,
              name: newUser.name,
              username: newUser.username,
              email: newUser.email,
              avatarColor: newUser.avatarColor,
              familyName: newUser.familyName,
            },
          }),
        });
      } catch {}
      return { success: true };
    } catch (e) {
      return { success: false, error: "Kayıt sırasında hata oluştu." };
    }
  }

  async function checkEmailExists(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDB();
      const normalizedEmail = email.trim().toLowerCase();
      const found = db.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (!found) {
        return { success: false, error: "Bu e-posta adresiyle kayıtlı hesap bulunamadı." };
      }
      return { success: true };
    } catch {
      return { success: false, error: "Bir hata oluştu." };
    }
  }

  async function resetPassword(email: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDB();
      const normalizedEmail = email.trim().toLowerCase();
      const found = db.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (!found) {
        return { success: false, error: "Bu e-posta adresiyle kayıtlı hesap bulunamadı." };
      }
      await AsyncStorage.setItem(`@auth_pwd_${found.id}`, newPassword);
      return { success: true };
    } catch {
      return { success: false, error: "Şifre sıfırlama sırasında hata oluştu." };
    }
  }

  async function joinFamily(familyCode: string): Promise<{ success: boolean; error?: string }> {
    if (!user) return { success: false, error: "Giriş yapın." };
    const upperCode = familyCode.toUpperCase();
    try {
      const joinUrl = new URL("/api/family/join", getApiUrl());
      const serverRes = await fetch(joinUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCode: upperCode,
          oldFamilyCode: user.familyCode,
          member: {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            avatarColor: user.avatarColor,
            familyName: user.familyName,
          },
        }),
      });
      const serverData = await serverRes.json();
      if (!serverData.success) {
        return { success: false, error: serverData.error || "Aileye katılırken hata oluştu." };
      }
      const updatedUser = { ...user, familyCode: upperCode, role: "member" as const };
      const db = await getDB();
      const updatedDB = db.map((u) => (u.id === user.id ? updatedUser : u));
      await saveDB(updatedDB);
      setUser(updatedUser);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      await loadFamilyMembers(upperCode);
      return { success: true };
    } catch {
      try {
        const db = await getDB();
        const familyExists = db.some((u) => u.familyCode === upperCode);
        if (!familyExists) {
          return { success: false, error: "Bu aile kodu bulunamadı. Kodu kontrol edin." };
        }
        const updatedUser = { ...user, familyCode: upperCode, role: "member" as const };
        const updatedDB = db.map((u) => (u.id === user.id ? updatedUser : u));
        await saveDB(updatedDB);
        setUser(updatedUser);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
        await loadFamilyMembers(upperCode);
        return { success: true };
      } catch {
        return { success: false, error: "Aileye katılırken hata oluştu." };
      }
    }
  }

  function logout() {
    setUser(null);
    setFamilyMembers([]);
    AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  async function updateProfile(name: string, familyName: string, familyMemberCount?: number, spouseName?: string) {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      name,
      familyName,
      familyMemberCount: familyMemberCount ?? user.familyMemberCount,
      spouseName: spouseName !== undefined ? spouseName : user.spouseName,
    };
    const db = await getDB();
    const updatedDB = db.map((u) => (u.id === user.id ? updatedUser : u));
    await saveDB(updatedDB);
    setUser(updatedUser);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
  }

  async function addCustomMember(memberName: string) {
    if (!user) return;
    const current = user.customMembers || [];
    if (current.includes(memberName)) return;
    const updatedUser: User = { ...user, customMembers: [...current, memberName] };
    const db = await getDB();
    const updatedDB = db.map((u) => (u.id === user.id ? updatedUser : u));
    await saveDB(updatedDB);
    setUser(updatedUser);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
  }

  async function removeCustomMember(memberName: string) {
    if (!user) return;
    const current = user.customMembers || [];
    const updatedUser: User = { ...user, customMembers: current.filter((m) => m !== memberName) };
    const db = await getDB();
    const updatedDB = db.map((u) => (u.id === user.id ? updatedUser : u));
    await saveDB(updatedDB);
    setUser(updatedUser);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
  }

  async function updateProfilePhoto(photoUri: string | undefined) {
    if (!user) return;
    const updatedUser = { ...user, photoUri };
    const db = await getDB();
    const updatedDB = db.map((u) => (u.id === user.id ? updatedUser : u));
    await saveDB(updatedDB);
    setUser(updatedUser);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
  }

  return (
    <AuthContext.Provider value={{ user, familyMembers, isLoading, login, register, checkEmailExists, resetPassword, joinFamily, logout, updateProfile, addCustomMember, removeCustomMember, updateProfilePhoto }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
