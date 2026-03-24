import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const MONTHS_TR = [
  "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
  "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık",
];
const MONTHS_EN = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_TR = ["Pt","Sl","Çr","Pr","Cm","Ct","Pz"];
const DAYS_EN = ["Mo","Tu","We","Th","Fr","Sa","Su"];

interface Props {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (date: string) => void;
  language: string;
  accentColor?: string;
}

function parseLocalDate(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

function fmtStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function displayDate(value: string, language: string): string {
  const d = parseLocalDate(value);
  if (!d) return value;
  const months = language === "tr" ? MONTHS_TR : MONTHS_EN;
  if (language === "tr") return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export { displayDate };

export function DatePickerModal({
  visible,
  value,
  onClose,
  onSelect,
  language,
  accentColor = Colors.tint,
}: Props) {
  const isTR = language === "tr";
  const today = new Date();
  const initial = parseLocalDate(value) ?? today;

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [tab, setTab] = useState<"calendar" | "manual">("calendar");
  const [manualText, setManualText] = useState(value);
  const [manualError, setManualError] = useState(false);

  useEffect(() => {
    if (visible) {
      const d = parseLocalDate(value) ?? today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setManualText(value);
      setManualError(false);
      setTab("calendar");
    }
  }, [visible, value]);

  const months = isTR ? MONTHS_TR : MONTHS_EN;
  const days = isTR ? DAYS_TR : DAYS_EN;
  const selected = parseLocalDate(value);

  function getGridCells(): (number | null)[] {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = (firstDow + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function handleDayPress(day: number) {
    onSelect(fmtStr(viewYear, viewMonth, day));
    onClose();
  }

  function handleManualConfirm() {
    const m = manualText.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) { setManualError(true); return; }
    setManualError(false);
    onSelect(manualText.trim());
    onClose();
  }

  const cells = getGridCells();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {/* Tabs */}
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabBtn, tab === "calendar" && { borderBottomColor: accentColor }]}
              onPress={() => setTab("calendar")}
            >
              <Ionicons name="calendar-outline" size={14} color={tab === "calendar" ? accentColor : Colors.textSecondary} />
              <Text style={[styles.tabText, tab === "calendar" && { color: accentColor, fontFamily: "Inter_600SemiBold" }]}>
                {isTR ? "Takvim" : "Calendar"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, tab === "manual" && { borderBottomColor: accentColor }]}
              onPress={() => setTab("manual")}
            >
              <Ionicons name="create-outline" size={14} color={tab === "manual" ? accentColor : Colors.textSecondary} />
              <Text style={[styles.tabText, tab === "manual" && { color: accentColor, fontFamily: "Inter_600SemiBold" }]}>
                {isTR ? "Manuel" : "Manual"}
              </Text>
            </Pressable>
          </View>

          {tab === "calendar" ? (
            <>
              {/* Month navigation */}
              <View style={styles.monthNav}>
                <Pressable onPress={prevMonth} hitSlop={14} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={20} color={Colors.text} />
                </Pressable>
                <Text style={styles.monthLabel}>{months[viewMonth]} {viewYear}</Text>
                <Pressable onPress={nextMonth} hitSlop={14} style={styles.navBtn}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.text} />
                </Pressable>
              </View>

              {/* Weekday labels */}
              <View style={styles.weekRow}>
                {days.map((d) => (
                  <Text key={d} style={styles.weekLabel}>{d}</Text>
                ))}
              </View>

              {/* Day grid */}
              <View style={styles.grid}>
                {cells.map((day, i) => {
                  if (day === null) return <View key={`e${i}`} style={styles.cell} />;
                  const isSelected =
                    selected &&
                    selected.getFullYear() === viewYear &&
                    selected.getMonth() === viewMonth &&
                    selected.getDate() === day;
                  const isToday =
                    today.getFullYear() === viewYear &&
                    today.getMonth() === viewMonth &&
                    today.getDate() === day;
                  return (
                    <Pressable
                      key={`d${day}-${i}`}
                      style={[
                        styles.cell,
                        isSelected && { backgroundColor: accentColor, borderRadius: 10 },
                        isToday && !isSelected && styles.todayCell,
                      ]}
                      onPress={() => handleDayPress(day)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && { color: Colors.background, fontFamily: "Inter_700Bold" },
                          isToday && !isSelected && { color: accentColor, fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Cancel */}
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>{isTR ? "Kapat" : "Close"}</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.manualSection}>
              <Text style={styles.manualHint}>
                {isTR ? "Format: YYYY-AA-GG (örn. 2026-03-15)" : "Format: YYYY-MM-DD (e.g. 2026-03-15)"}
              </Text>
              <TextInput
                style={[styles.manualInput, manualError && { borderColor: Colors.red }]}
                value={manualText}
                onChangeText={(t) => { setManualText(t); setManualError(false); }}
                placeholder="2026-03-15"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numbers-and-punctuation"
                autoFocus
                autoCorrect={false}
                onSubmitEditing={handleManualConfirm}
              />
              {manualError && (
                <Text style={styles.manualError}>
                  {isTR ? "Geçersiz format. YYYY-AA-GG kullanın." : "Invalid format. Use YYYY-MM-DD."}
                </Text>
              )}
              <Pressable style={[styles.confirmBtn, { backgroundColor: accentColor }]} onPress={handleManualConfirm}>
                <Text style={styles.confirmText}>{isTR ? "Tamam" : "Confirm"}</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  modal: {
    backgroundColor: Colors.card, borderRadius: 20, width: 320,
    paddingBottom: 16, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  tabRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  navBtn: { padding: 4 },
  monthLabel: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  weekRow: { flexDirection: "row", paddingHorizontal: 12, marginBottom: 4 },
  weekLabel: {
    width: CELL_SIZE, textAlign: "center",
    fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textTertiary,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 0 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: "center", justifyContent: "center" },
  todayCell: { borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  dayText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text },
  cancelBtn: { marginTop: 8, alignSelf: "center", padding: 10 },
  cancelText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  manualSection: { padding: 20, gap: 12 },
  manualHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, textAlign: "center" },
  manualInput: {
    backgroundColor: Colors.background, borderRadius: 12, padding: 14,
    fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, textAlign: "center", letterSpacing: 1,
  },
  manualError: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.red, textAlign: "center" },
  confirmBtn: { borderRadius: 12, padding: 14, alignItems: "center" },
  confirmText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.background },
});
