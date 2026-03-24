import * as fs from "fs";
import * as path from "path";

interface FamilyMember {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "member";
  avatarColor: string;
  familyName: string;
  joinedAt: string;
}

interface FamilyData {
  [familyCode: string]: FamilyMember[];
}

const DATA_FILE = path.join(process.cwd(), ".data", "families.json");

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData(): FamilyData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveData(data: FamilyData) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function registerFamily(
  familyCode: string,
  member: Omit<FamilyMember, "joinedAt" | "role">
): { success: boolean } {
  const data = loadData();
  if (!data[familyCode]) {
    data[familyCode] = [];
  }
  const exists = data[familyCode].some((m) => m.id === member.id);
  if (!exists) {
    data[familyCode].push({
      ...member,
      role: data[familyCode].length === 0 ? "admin" : "member",
      joinedAt: new Date().toISOString(),
    });
    saveData(data);
  }
  return { success: true };
}

export function joinFamilyByCode(
  familyCode: string,
  oldFamilyCode: string,
  member: Omit<FamilyMember, "joinedAt" | "role">
): { success: boolean; error?: string; familyName?: string } {
  const data = loadData();
  const upperCode = familyCode.toUpperCase();

  if (!data[upperCode] || data[upperCode].length === 0) {
    return { success: false, error: "Bu aile kodu bulunamadı. Kodu kontrol edin." };
  }

  if (upperCode === oldFamilyCode.toUpperCase()) {
    return { success: false, error: "Kendi aile kodunuzu kullanamazsınız." };
  }

  if (data[oldFamilyCode]) {
    data[oldFamilyCode] = data[oldFamilyCode].filter((m) => m.id !== member.id);
    if (data[oldFamilyCode].length === 0) delete data[oldFamilyCode];
  }

  const alreadyMember = data[upperCode].some((m) => m.id === member.id);
  if (!alreadyMember) {
    data[upperCode].push({
      ...member,
      role: "member",
      joinedAt: new Date().toISOString(),
    });
  }

  const familyName = data[upperCode][0]?.familyName || "";
  saveData(data);
  return { success: true, familyName };
}

export function getFamilyMembers(
  familyCode: string
): FamilyMember[] {
  const data = loadData();
  return data[familyCode.toUpperCase()] || [];
}

export function updateMemberInFamily(
  familyCode: string,
  memberId: string,
  updates: Partial<FamilyMember>
) {
  const data = loadData();
  const code = familyCode.toUpperCase();
  if (data[code]) {
    data[code] = data[code].map((m) =>
      m.id === memberId ? { ...m, ...updates } : m
    );
    saveData(data);
  }
}

export function checkFamilyCodeExists(familyCode: string): boolean {
  const data = loadData();
  const members = data[familyCode.toUpperCase()];
  return !!members && members.length > 0;
}
