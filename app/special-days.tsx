import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";
import { useBudget } from "@/context/BudgetContext";
import {
  useSpecialDays,
  SpecialDay,
  Relation,
  EventType,
  daysUntil,
  getNextOccurrence,
  getMothersDayDate,
  getFathersDayDate,
} from "@/context/SpecialDaysContext";

const THIS_YEAR = new Date().getFullYear();
const SYSTEM_LIST = [
  { id: "sys_valentines", title: "Sevgililer Günü", monthDay: "02-14" },
  { id: "sys_womensday", title: "Kadınlar Günü", monthDay: "03-08" },
  { id: "sys_mothersday", title: "Anneler Günü", monthDay: getMothersDayDate(THIS_YEAR) },
  { id: "sys_fathersday", title: "Babalar Günü", monthDay: getFathersDayDate(THIS_YEAR) },
  { id: "sys_teachersday", title: "Öğretmenler Günü", monthDay: "11-24" },
  { id: "sys_republic", title: "Cumhuriyet Bayramı", monthDay: "10-29" },
  { id: "sys_newyear", title: "Yılbaşı", monthDay: "01-01" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + " ₺";
}

const RELATIONS: { key: Relation; labelTR: string; labelEN: string; icon: string }[] = [
  { key: "spouse", labelTR: "Eş", labelEN: "Spouse", icon: "heart" },
  { key: "partner", labelTR: "Sevgili", labelEN: "Partner", icon: "heart-half" },
  { key: "child", labelTR: "Çocuk", labelEN: "Child", icon: "happy-outline" },
  { key: "mother", labelTR: "Anne", labelEN: "Mother", icon: "woman-outline" },
  { key: "father", labelTR: "Baba", labelEN: "Father", icon: "man-outline" },
  { key: "sibling", labelTR: "Kardeş", labelEN: "Sibling", icon: "people-outline" },
  { key: "grandparent", labelTR: "Büyük Ebeveyn", labelEN: "Grandparent", icon: "accessibility-outline" },
  { key: "friend", labelTR: "Arkadaş", labelEN: "Friend", icon: "person-outline" },
  { key: "other", labelTR: "Diğer", labelEN: "Other", icon: "ellipsis-horizontal-outline" },
];

const EVENT_TYPES: { key: EventType; labelTR: string; labelEN: string }[] = [
  { key: "birthday", labelTR: "Doğum Günü", labelEN: "Birthday" },
  { key: "anniversary", labelTR: "Yıl Dönümü", labelEN: "Anniversary" },
  { key: "custom", labelTR: "Özel Gün", labelEN: "Special Day" },
];

const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function relationIcon(r: Relation): string {
  return RELATIONS.find((x) => x.key === r)?.icon ?? "gift-outline";
}

function relationColor(r: Relation): string {
  const map: Record<Relation, string> = {
    spouse: Colors.red,
    partner: Colors.red,
    child: Colors.blue,
    mother: Colors.purple,
    father: Colors.blue,
    sibling: Colors.orange,
    grandparent: Colors.tint,
    friend: Colors.yellow,
    other: Colors.textSecondary,
    holiday: Colors.orange,
  };
  return map[r] ?? Colors.tint;
}

function getBudgetMessage(
  day: SpecialDay,
  d: number,
  remaining: number,
  isEN: boolean
): string | null {
  if (!day.giftBudget || day.isSystemEvent) return null;
  const name = day.personName || day.title;
  const budget = day.giftBudget;

  if (d === 0) {
    return isEN
      ? `Today is ${name}'s special day! Gift budget: ${fmt(budget)}`
      : `Bugün ${name}'${getPersonSuffix(name, "in")} özel günü! Hediye bütçen: ${fmt(budget)}`;
  }
  if (d <= 3) {
    return isEN
      ? `${name}'s ${day.title} is in ${d} day${d > 1 ? "s" : ""}! Don't forget the gift (${fmt(budget)})`
      : `${name}'${getPersonSuffix(name, "in")} ${day.title} ${d} gün sonra! Hediyeyi unutma (${fmt(budget)})`;
  }
  if (d <= 7) {
    return isEN
      ? `${name}'s ${day.title} is next week. Gift budget: ${fmt(budget)}`
      : `${name}'${getPersonSuffix(name, "in")} ${day.title} haftaya. Hediye bütçen: ${fmt(budget)}`;
  }
  if (d <= 30) {
    if (remaining > 0 && remaining < budget) {
      return isEN
        ? `${name}'s ${day.title} is in ${d} days. Your gift budget (${fmt(budget)}) exceeds remaining balance. Spend carefully!`
        : `${name}'${getPersonSuffix(name, "in")} ${day.title} ${d} gün sonra. Hediye bütçen (${fmt(budget)}) kalan bakiyeni aşıyor. Bu ay dikkatli harcayın!`;
    }
    if (remaining >= budget) {
      return isEN
        ? `${name}'s ${day.title} is in ${d} days. You can afford the gift (${fmt(budget)}) — keep it up!`
        : `${name}'${getPersonSuffix(name, "in")} ${day.title} ${d} gün sonra. Hediye bütçeni karşılayacak bakiyen var (${fmt(budget)}), sürdür!`;
    }
    return isEN
      ? `${name}'s ${day.title} is in ${d} days. Set aside ${fmt(budget)} for a gift.`
      : `${name}'${getPersonSuffix(name, "in")} ${day.title} ${d} gün sonra. Hediye için ${fmt(budget)} ayır.`;
  }
  if (d <= 60) {
    return isEN
      ? `${name}'s ${day.title} is next month. Spend carefully this month to afford a better gift (${fmt(budget)}).`
      : `${name}'${getPersonSuffix(name, "in")} ${day.title} önümüzdeki ay. Bu ay biraz tutumlu giderek daha güzel bir hediye alabilirsin (${fmt(budget)}).`;
  }
  return null;
}

function getPersonSuffix(name: string, suffix: "in" | "nin"): string {
  if (!name) return "'";
  const vowels = "aeıioöuü";
  const last = name[name.length - 1].toLowerCase();
  const isVowel = vowels.includes(last);
  return isVowel ? "'" + "n" + suffix : "'" + suffix;
}

function daysUntilLabel(d: number, isEN: boolean): string {
  if (d === 0) return isEN ? "Today!" : "Bugün!";
  if (d === 1) return isEN ? "Tomorrow" : "Yarın";
  if (d <= 7) return isEN ? `${d} days` : `${d} gün`;
  if (d < 30) return isEN ? `${d} days` : `${d} gün`;
  const months = Math.round(d / 30);
  return isEN ? `~${months} mo` : `~${months} ay`;
}

function daysColor(d: number): string {
  if (d === 0) return Colors.red;
  if (d <= 7) return Colors.orange;
  if (d <= 30) return Colors.yellow;
  return Colors.textSecondary;
}

function ageLabel(day: SpecialDay, isEN: boolean): string | null {
  if (day.eventType !== "birthday" || !day.birthYear) return null;
  const next = getNextOccurrence(day.monthDay);
  const age = next.getFullYear() - day.birthYear;
  return isEN ? `Turning ${age}` : `${age} yaşına giriyor`;
}

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function SpecialDaysScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isEN = language === "en";
  const { specialDays, addSpecialDay, updateSpecialDay, deleteSpecialDay, getUpcoming } = useSpecialDays();
  const { remaining } = useBudget();

  const [tab, setTab] = useState<"upcoming" | "all">("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [editingDay, setEditingDay] = useState<SpecialDay | null>(null);

  const [formName, setFormName] = useState("");
  const [formRelation, setFormRelation] = useState<Relation>("friend");
  const [formEventType, setFormEventType] = useState<EventType>("birthday");
  const [formTitle, setFormTitle] = useState("");
  const [formMonth, setFormMonth] = useState(1);
  const [formDay, setFormDay] = useState(1);
  const [formYear, setFormYear] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formNote, setFormNote] = useState("");

  const upcoming = useMemo(() => getUpcoming(365), [specialDays]);

  const budgetMessages = useMemo(() =>
    upcoming
      .filter((e) => e.day.giftBudget && e.daysUntil <= 60)
      .map((e) => ({ msg: getBudgetMessage(e.day, e.daysUntil, remaining, isEN), event: e }))
      .filter((x) => x.msg !== null) as { msg: string; event: typeof upcoming[0] }[],
    [upcoming, remaining, isEN]
  );

  const userDays = useMemo(() =>
    specialDays.slice().sort((a, b) => daysUntil(a.monthDay) - daysUntil(b.monthDay)),
    [specialDays]
  );

  function openAdd() {
    setEditingDay(null);
    setFormName("");
    setFormRelation("friend");
    setFormEventType("birthday");
    setFormTitle(isEN ? "Birthday" : "Doğum Günü");
    const today = new Date();
    setFormMonth(today.getMonth() + 1);
    setFormDay(today.getDate());
    setFormYear("");
    setFormBudget("");
    setFormNote("");
    setShowForm(true);
  }

  function openEdit(day: SpecialDay) {
    if (day.isSystemEvent) return;
    setEditingDay(day);
    setFormName(day.personName);
    setFormRelation(day.relation);
    setFormEventType(day.eventType);
    setFormTitle(day.title);
    const [mm, dd] = day.monthDay.split("-").map(Number);
    setFormMonth(mm);
    setFormDay(dd);
    setFormYear(day.birthYear ? String(day.birthYear) : "");
    setFormBudget(day.giftBudget ? String(day.giftBudget) : "");
    setFormNote(day.note ?? "");
    setShowForm(true);
  }

  function handleEventTypeChange(et: EventType) {
    setFormEventType(et);
    if (et === "birthday") setFormTitle(isEN ? "Birthday" : "Doğum Günü");
    else if (et === "anniversary") setFormTitle(isEN ? "Anniversary" : "Yıl Dönümü");
    else setFormTitle("");
  }

  async function handleSave() {
    if (!formName.trim() && formRelation !== "holiday") {
      Alert.alert(isEN ? "Name required" : "İsim gerekli", isEN ? "Please enter a name." : "Lütfen bir isim girin.");
      return;
    }
    const monthDay = `${String(formMonth).padStart(2, "0")}-${String(formDay).padStart(2, "0")}`;
    const title = formTitle.trim() || (formEventType === "birthday" ? (isEN ? "Birthday" : "Doğum Günü") : (isEN ? "Special Day" : "Özel Gün"));
    const payload: Omit<SpecialDay, "id" | "notifIds"> = {
      personName: formName.trim(),
      relation: formRelation,
      eventType: formEventType,
      title,
      monthDay,
      birthYear: formYear ? parseInt(formYear, 10) : undefined,
      giftBudget: formBudget ? parseFloat(formBudget) : undefined,
      note: formNote.trim() || undefined,
    };

    if (editingDay) {
      await updateSpecialDay({ ...editingDay, ...payload });
    } else {
      await addSpecialDay(payload);
    }
    setShowForm(false);
  }

  async function handleDelete(day: SpecialDay) {
    Alert.alert(
      isEN ? "Delete?" : "Sil?",
      isEN ? `Remove ${day.personName} — ${day.title}?` : `${day.personName} — ${day.title} silinsin mi?`,
      [
        { text: isEN ? "Cancel" : "İptal", style: "cancel" },
        { text: isEN ? "Delete" : "Sil", style: "destructive", onPress: () => deleteSpecialDay(day.id) },
      ]
    );
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEN ? "Special Days" : "Özel Günler"}</Text>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color={Colors.tint} />
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, tab === "upcoming" && styles.tabBtnActive]}
          onPress={() => setTab("upcoming")}
        >
          <Text style={[styles.tabText, tab === "upcoming" && styles.tabTextActive]}>
            {isEN ? "Upcoming" : "Yaklaşan"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === "all" && styles.tabBtnActive]}
          onPress={() => setTab("all")}
        >
          <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>
            {isEN ? "My Days" : "Günlerim"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 40 }}
      >
        {budgetMessages.length > 0 && (
          <View style={{ marginTop: 16 }}>
            {budgetMessages.map(({ msg, event }) => (
              <Pressable
                key={event.day.id}
                style={[styles.alertCard, { borderLeftColor: daysColor(event.daysUntil) }]}
                onPress={() => !event.day.isSystemEvent && openEdit(event.day)}
              >
                <View style={styles.alertRow}>
                  <Ionicons name="bulb-outline" size={16} color={daysColor(event.daysUntil)} />
                  <Text style={styles.alertText}>{msg}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {tab === "upcoming" && (
          <View style={{ marginTop: 16 }}>
            {upcoming.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={32} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>{isEN ? "No upcoming events" : "Yaklaşan etkinlik yok"}</Text>
                <Text style={styles.emptySubtitle}>{isEN ? "Add birthdays and special days to get reminders" : "Hatırlatıcı almak için doğum günü ve özel günler ekleyin"}</Text>
              </View>
            )}
            {upcoming.map((evt) => (
              <EventCard
                key={evt.day.id}
                event={evt}
                isEN={isEN}
                onPress={() => openEdit(evt.day)}
                onLongPress={() => !evt.day.isSystemEvent && handleDelete(evt.day)}
              />
            ))}
          </View>
        )}

        {tab === "all" && (
          <View style={{ marginTop: 16 }}>
            {userDays.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="heart-outline" size={32} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>{isEN ? "No days added yet" : "Henüz gün eklenmedi"}</Text>
                <Pressable style={styles.emptyAddBtn} onPress={openAdd}>
                  <Ionicons name="add-circle" size={18} color={Colors.tint} />
                  <Text style={styles.emptyAddText}>{isEN ? "Add your first special day" : "İlk özel gününü ekle"}</Text>
                </Pressable>
              </View>
            )}
            {userDays.map((day) => {
              const d = daysUntil(day.monthDay);
              const next = getNextOccurrence(day.monthDay);
              return (
                <Pressable
                  key={day.id}
                  style={styles.listCard}
                  onPress={() => openEdit(day)}
                  onLongPress={() => handleDelete(day)}
                >
                  <View style={[styles.relIcon, { backgroundColor: relationColor(day.relation) + "20" }]}>
                    <Ionicons name={relationIcon(day.relation) as any} size={18} color={relationColor(day.relation)} />
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>{day.personName}</Text>
                    <Text style={styles.listSub}>
                      {day.title}
                      {day.birthYear ? ` · ${getNextOccurrence(day.monthDay).getFullYear() - day.birthYear} yaş` : ""}
                    </Text>
                    {day.giftBudget ? (
                      <Text style={styles.listBudget}>
                        <Ionicons name="gift-outline" size={11} color={Colors.tint} /> {fmt(day.giftBudget)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.listRight}>
                    <Text style={styles.listDate}>
                      {day.monthDay.split("-").reverse().join("/")}
                    </Text>
                    <Text style={[styles.listCountdown, { color: daysColor(d) }]}>
                      {daysUntilLabel(d, isEN)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{isEN ? "Fixed Holidays" : "Sabit Tatiller"}</Text>
            </View>
            {SYSTEM_LIST.map((sys) => {
              const d = daysUntil(sys.monthDay);
              return (
                <View key={sys.id} style={[styles.listCard, { opacity: 0.75 }]}>
                  <View style={[styles.relIcon, { backgroundColor: Colors.orange + "20" }]}>
                    <Ionicons name="star-outline" size={18} color={Colors.orange} />
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>{sys.title}</Text>
                    <Text style={styles.listSub}>{sys.monthDay.split("-").reverse().join(".")}</Text>
                  </View>
                  <View style={styles.listRight}>
                    <Text style={[styles.listCountdown, { color: daysColor(d) }]}>
                      {daysUntilLabel(d, isEN)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { paddingTop: Platform.OS === "web" ? 32 : 16, paddingBottom: bottomPadding + 24 }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingDay
                ? (isEN ? "Edit Day" : "Günü Düzenle")
                : (isEN ? "Add Special Day" : "Özel Gün Ekle")}
            </Text>
            <Pressable onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>{isEN ? "Person Name" : "Kişi Adı"}</Text>
            <TextInput
              style={styles.input}
              placeholder={isEN ? "e.g. Eşim, Anne, Selin..." : "ör. Eşim, Annem, Selin..."}
              placeholderTextColor={Colors.textTertiary}
              value={formName}
              onChangeText={setFormName}
            />

            <Text style={styles.fieldLabel}>{isEN ? "Relation" : "Yakınlık"}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {RELATIONS.map((r) => (
                <Pressable
                  key={r.key}
                  style={[styles.chip, formRelation === r.key && { backgroundColor: relationColor(r.key) + "30", borderColor: relationColor(r.key) }]}
                  onPress={() => setFormRelation(r.key)}
                >
                  <Ionicons name={r.icon as any} size={14} color={formRelation === r.key ? relationColor(r.key) : Colors.textSecondary} />
                  <Text style={[styles.chipText, formRelation === r.key && { color: relationColor(r.key) }]}>
                    {isEN ? r.labelEN : r.labelTR}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{isEN ? "Event Type" : "Etkinlik Türü"}</Text>
            <View style={styles.chipRow}>
              {EVENT_TYPES.map((et) => (
                <Pressable
                  key={et.key}
                  style={[styles.chip, formEventType === et.key && styles.chipActive]}
                  onPress={() => handleEventTypeChange(et.key)}
                >
                  <Text style={[styles.chipText, formEventType === et.key && styles.chipTextActive]}>
                    {isEN ? et.labelEN : et.labelTR}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{isEN ? "Event Title (optional)" : "Etkinlik Başlığı (isteğe bağlı)"}</Text>
            <TextInput
              style={styles.input}
              placeholder={isEN ? "e.g. Birthday, Anniversary..." : "ör. Doğum Günü, Yıl Dönümü..."}
              placeholderTextColor={Colors.textTertiary}
              value={formTitle}
              onChangeText={setFormTitle}
            />

            <Text style={styles.fieldLabel}>{isEN ? "Date" : "Tarih"}</Text>
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateSubLabel}>{isEN ? "Month" : "Ay"}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(isEN ? MONTHS_EN : MONTHS_TR).map((m, idx) => (
                    <Pressable
                      key={idx}
                      style={[styles.monthChip, formMonth === idx + 1 && styles.monthChipActive]}
                      onPress={() => { setFormMonth(idx + 1); if (formDay > DAYS_IN_MONTH[idx]) setFormDay(1); }}
                    >
                      <Text style={[styles.monthChipText, formMonth === idx + 1 && styles.monthChipTextActive]}>{m}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={styles.dateSubLabel}>{isEN ? "Day" : "Gün"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {Array.from({ length: DAYS_IN_MONTH[formMonth - 1] }, (_, i) => i + 1).map((d) => (
                  <Pressable
                    key={d}
                    style={[styles.dayChip, formDay === d && styles.dayChipActive]}
                    onPress={() => setFormDay(d)}
                  >
                    <Text style={[styles.dayChipText, formDay === d && styles.dayChipTextActive]}>{d}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {formEventType === "birthday" && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{isEN ? "Birth Year (optional — for age)" : "Doğum Yılı (isteğe bağlı — yaş için)"}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={isEN ? "e.g. 1990" : "ör. 1990"}
                  placeholderTextColor={Colors.textTertiary}
                  value={formYear}
                  onChangeText={setFormYear}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>{isEN ? "Gift Budget (₺, optional)" : "Hediye Bütçesi (₺, isteğe bağlı)"}</Text>
            <TextInput
              style={styles.input}
              placeholder={isEN ? "e.g. 500" : "ör. 500"}
              placeholderTextColor={Colors.textTertiary}
              value={formBudget}
              onChangeText={setFormBudget}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hintText}>
              {isEN
                ? "We'll warn you if your remaining budget is tight before the day."
                : "Gün yaklaşırken kalan bütçenize göre akıllı uyarı vereceğiz."}
            </Text>

            <Text style={styles.fieldLabel}>{isEN ? "Note (optional)" : "Not (isteğe bağlı)"}</Text>
            <TextInput
              style={[styles.input, { height: 72, textAlignVertical: "top" }]}
              placeholder={isEN ? "Reminder, ideas, wishes..." : "Hatırlatıcı, fikirler, dilekler..."}
              placeholderTextColor={Colors.textTertiary}
              value={formNote}
              onChangeText={setFormNote}
              multiline
            />

            {editingDay && (
              <Pressable style={styles.deleteBtn} onPress={() => { setShowForm(false); handleDelete(editingDay); }}>
                <Ionicons name="trash-outline" size={16} color={Colors.red} />
                <Text style={styles.deleteBtnText}>{isEN ? "Delete" : "Sil"}</Text>
              </Pressable>
            )}

            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{isEN ? "Save" : "Kaydet"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function EventCard({
  event,
  isEN,
  onPress,
  onLongPress,
}: {
  event: { day: SpecialDay; daysUntil: number; thisYearDate: Date };
  isEN: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { day, daysUntil: d, thisYearDate } = event;
  const color = relationColor(day.relation);
  const age = ageLabel(day, isEN);
  const isHoliday = day.isSystemEvent;

  return (
    <Pressable
      style={({ pressed }) => [styles.eventCard, { opacity: pressed ? 0.8 : 1 }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[styles.eventIconBox, { backgroundColor: color + "18" }]}>
        <Ionicons
          name={(isHoliday ? "star-outline" : relationIcon(day.relation)) as any}
          size={20}
          color={color}
        />
      </View>

      <View style={styles.eventInfo}>
        <View style={styles.eventTitleRow}>
          <Text style={styles.eventPersonName} numberOfLines={1}>
            {isHoliday ? day.title : `${day.personName}`}
          </Text>
          {!isHoliday && (
            <Text style={styles.eventEventType}>{day.title}</Text>
          )}
        </View>
        <Text style={styles.eventDate}>
          {`${thisYearDate.getDate()} ${isEN ? MONTHS_EN[thisYearDate.getMonth()] : MONTHS_TR[thisYearDate.getMonth()]}`}
          {age ? ` · ${age}` : ""}
        </Text>
        {day.giftBudget ? (
          <Text style={styles.eventBudget}>
            {isEN ? "Gift: " : "Hediye: "}{fmt(day.giftBudget)}
          </Text>
        ) : null}
        {day.note ? (
          <Text style={styles.eventNote} numberOfLines={1}>{day.note}</Text>
        ) : null}
      </View>

      <View style={styles.eventRight}>
        <Text style={[styles.eventCountdown, { color: daysColor(d) }]}>
          {daysUntilLabel(d, isEN)}
        </Text>
        {d === 0 && (
          <View style={[styles.todayBadge, { backgroundColor: Colors.red + "20" }]}>
            <Text style={[styles.todayBadgeText, { color: Colors.red }]}>
              {isEN ? "TODAY" : "BUGÜN"}
            </Text>
          </View>
        )}
        {d > 0 && d <= 7 && (
          <View style={[styles.todayBadge, { backgroundColor: Colors.orange + "20" }]}>
            <Text style={[styles.todayBadgeText, { color: Colors.orange }]}>
              {isEN ? "SOON" : "YAKINDA"}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  addBtn: { padding: 4 },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: Colors.card2,
    borderRadius: 10,
    padding: 3,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: Colors.background },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  tabTextActive: { fontFamily: "Inter_600SemiBold", color: Colors.text },

  alertCard: {
    backgroundColor: Colors.card2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.yellow,
  },
  alertRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  alertText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text, lineHeight: 18 },

  eventCard: {
    backgroundColor: Colors.card2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  eventIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  eventInfo: { flex: 1 },
  eventTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eventPersonName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  eventEventType: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  eventDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  eventBudget: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.tint, marginTop: 3 },
  eventNote: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  eventRight: { alignItems: "flex-end", gap: 4 },
  eventCountdown: { fontFamily: "Inter_700Bold", fontSize: 13 },
  todayBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  todayBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.5 },

  listCard: {
    backgroundColor: Colors.card2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  relIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  listInfo: { flex: 1 },
  listName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  listSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  listBudget: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.tint, marginTop: 2 },
  listRight: { alignItems: "flex-end" },
  listDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  listCountdown: { fontFamily: "Inter_700Bold", fontSize: 13, marginTop: 2 },

  sectionHeader: { marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.8 },

  emptyCard: {
    backgroundColor: Colors.card2,
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textTertiary, textAlign: "center" },
  emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  emptyAddText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.tint },

  modal: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },

  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: Colors.card2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 16,
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: -10,
    marginBottom: 16,
    lineHeight: 15,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.card2,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.tint + "20", borderColor: Colors.tint },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: Colors.tint },

  dateRow: { marginBottom: 4 },
  dateSubLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, marginBottom: 6 },
  monthChip: {
    backgroundColor: Colors.card2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthChipActive: { backgroundColor: Colors.tint + "20", borderColor: Colors.tint },
  monthChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  monthChipTextActive: { color: Colors.tint },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card2,
    marginRight: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayChipActive: { backgroundColor: Colors.tint + "20", borderColor: Colors.tint },
  dayChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.tint },

  saveBtn: {
    backgroundColor: Colors.tint,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#000" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.red + "40",
    marginTop: 8,
  },
  deleteBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.red },
});
