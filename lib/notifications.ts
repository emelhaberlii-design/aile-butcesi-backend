import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "@budget_notifications_enabled";
const NOTIF_HOUR_KEY = "@budget_notif_hour";
const NOTIF_MINUTE_KEY = "@budget_notif_minute";
const NOTIF_RANDOM_KEY = "@budget_notif_random";

let handlerSet = false;
function ensureHandler() {
  if (handlerSet || Platform.OS === "web") return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerSet = true;
  } catch (_e) {}
}

export interface FinancialContext {
  totalDebt: number;
  totalCreditDebt: number;
  totalInvestment: number;
  hasGoals: boolean;
  savingsRate: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

const GENERIC_TR = [
  "Bugün küçük tasarruflar, yarın büyük özgürlükler. Harcamalarını gözden geçir!",
  "Birikim yapmak bir alışkanlık meselesi. Bu ay hedefine bir adım daha at.",
  "Gereksiz abonelikleri iptal ettin mi? Her ay birkaç yüz lira kurtarabilirsin.",
  "Ev yemeği hem sağlıklı hem ekonomik. Bugün yemek siparişinden tasarruf et!",
  "Bu ay harcamalarına bak — hangi kategoride fazla harcıyorsun?",
  "Tasarruf etmek gelirini artırmakla değil, harcamaları azaltmakla başlar.",
  "Küçük tutarlar toplanır. Günde 50 TL tasarruf = Yılda 18.000 TL!",
  "Alışveriş yapmadan önce bir gece düşün — gerçekten ihtiyacın var mı?",
  "Yatırım yapmak için doğru zaman HER ZAMAN bugündür. Küçükten başla.",
  "Faturalarını ödedikten sonra kalan parayı hemen birikim hesabına aktar.",
  "Acil fon oluşturmak en iyi yatırım. 3 aylık giderin kadar birikim hedefle.",
  "Araç sigortanı ve telefon faturanı karşılaştır — daha iyisi olabilir.",
  "Yakıt tasarrufu için toplu ulaşımı dene. Hem cepte hem çevreye iyi.",
  "Çocuğuna finansal okuryazarlık öğret — en değerli miras budur.",
  "Hedefsiz para, kolayca harcanır. Bugün bir tasarruf hedefi belirle!",
  "Kredi kartı limitin gelir değil, borç kaynağıdır. Dikkatli kullan.",
  "Süpermarket'e tok git, listene bak. Gereksiz alışverişin önüne geç.",
  "Altın ve döviz birikimi enflasyona karşı kalkan olabilir. Araştır!",
  "Aile bütçesini düzenli gözden geçirmek, sürpriz giderleri önler.",
  "Tasarruf hesabı faizi düşük görünse de bileşik faiz zamanla mucize yaratır.",
  "Unutulmuş abonelikler birikim hırsızlarıdır. Bugün kontrol et.",
  "Hediye alırken bütçeni aşma. Düşünceli hediyeler pahalı olmak zorunda değil.",
  "Emeklilik planlaması asla erken başlanmaz. Bugün düşün!",
  "Bu ay bir şey almak yerine bir şey satsaydın ne olurdu? Dene!",
  "Kira artışına hazırlıklı mısın? Alternatif planlarını şimdiden yap.",
  "Yılbaşı, Ramazan, bayram... Özel dönemlere önceden bütçe ayır.",
  "Sağlık harcamalarını azaltmanın en iyi yolu sağlıklı yaşam. Spor yap!",
  "Her ay küçük bir miktarı kenara koymak, büyük farklar yaratır.",
  "Paramı nereye harcıyorum? diye sormak finansal özgürlüğün ilk adımıdır.",
  "Bugün bir harcamanı ertele, tasarruf et. Yarın kendine teşekkür edersin.",
  "Finansal stres az para ile değil, kontrolsüz para ile gelir. Kontrol et!",
  "Bir finans hedefi koy; beyin kendiliğinden çözüm üretmeye başlar.",
  "Parayı yönetmek bir beceri — her gün pratik yaparak gelişir.",
  "Bugün 1 gereksiz harcamadan vazgeç. Küçük adım, büyük alışkanlık.",
  "Düzenli gelire güvenmek güzel, ama yedek planın olsun. Tasarruf et!",
];

const DEBT_HEAVY_TR = [
  "Borcun fazla görünebilir, ama merak etme — birlikte kontrol altına alacağız. Küçük adımlarla başla!",
  "Herkesin borcu olur, önemli olan onu yönetmek. Sen doğru yoldasın, devam et!",
  "Borç yüküyle ezilmiş hissediyorsan bil ki bu geçici. Her ödeme seni özgürlüğe yaklaştırıyor.",
  "En küçük borcunu öde, küçük zaferlerin büyük motivasyon getirir. Hadi başla!",
  "Borçları birer birer ele alıyoruz — kar topu gibi eriyecekler. Sabırla devam!",
  "Bugün borç ödemek, yarın özgür olmak demek. Her lira sayılır!",
  "Kredi kartı borcunu zamanında öde — faiz seni değil, sen faizi kontrol et.",
  "Borcun seni değil, sen borcu yönetiyorsun. Bu farkındalık bile büyük bir güç!",
  "Zor günler geçici, finansal özgürlük kalıcı. Borçlarını düzenli öde, bitecek!",
  "Her ay biraz daha borç kapatmak küçük görünür ama sonu mutlaka gelir. Devam!",
  "Borcunu bilmek çözmenin ilk adımı. Bu uygulamayı kullandığın için harika bir başlangıç yaptın!",
];

const INVESTMENT_GOOD_TR = [
  "Portföyün harika görünüyor! Bu tempoda devam et, yatırımların seni büyütüyor.",
  "Yatırımların çalışıyor, tebrikler! Düzenli eklemeye devam etmek kazancını katlayacak.",
  "Finansal geleceğini inşa ediyorsun. Portföyün büyüdükçe özgürlüğün de büyüyor!",
  "Yatırım yapıyor olman seni pek çok insanın önüne koyuyor. Harika gidiyorsun!",
  "Bileşik faizin sihri zamanla çalışır. Sen doğru yapıyorsun, sadece sabret!",
  "Piyasalar iniş çıkış yapar ama sen uzun vadede kazanıyorsun. Paniklemeden devam!",
  "Altın, döviz, hisse... Çeşitlendirme yapıyorsun — bu çok akıllıca bir strateji!",
  "Yatırım portföyün büyüdükçe enflasyon seni daha az etkiliyor. Süper gidiyorsun!",
  "Her yatırım fırsatı değerlendirmen gelecekteki ben'ine verdiğin bir hediye!",
];

const GOAL_FOCUSED_TR = [
  "Hedefine birlikte ulaşacağız! Çok iyi ilerliyorsun, devam et!",
  "Birikim hedefin seni motive etsin — her kuruş hedefe bir adım daha yaklaştırıyor.",
  "Hayalin gerçek olacak! Hedefine düzenli katkı yapmaya devam et.",
  "Tatil, ev, araba... Hedeflerin için birikim yapmak en akıllı plan. Devam!",
  "Küçük birikimler büyük hayalleri gerçek yapar. Hedefine inanıyoruz!",
  "Bu ay hedefe ne kadar ekleyebildin? Her lira önemli, küçük de olsa biriktir!",
  "Hedefin sana uzak görünse de düzenli birikim mucize yaratır. Vazgeçme!",
  "Birikim hedefi koymak finansal olgunluğun işareti. Çok güzel gidiyorsun!",
];

const SAVINGS_GOOD_TR = [
  "Tasarruf oranın mükemmel! Bu alışkanlığını koru, finansal özgürlük yakın.",
  "Gelirinin güzel bir kısmını biriktiriyorsun. Bu tempo seni çok ileri götürecek!",
  "Harcamalarını kontrol altında tutuyorsun — bu disiplin paha biçilemez!",
];

const MOTIVATIONAL_TR: string[] = [
  ...GENERIC_TR,
  ...DEBT_HEAVY_TR,
  ...INVESTMENT_GOOD_TR,
  ...GOAL_FOCUSED_TR,
  ...SAVINGS_GOOD_TR,
];

const GENERIC_EN = [
  "Small savings today, big freedom tomorrow. Review your expenses!",
  "Saving is a habit. Take one more step toward your goal this month.",
  "Have you cancelled unnecessary subscriptions? You could save hundreds monthly.",
  "Home cooking is healthy and economical. Skip the food delivery today!",
  "Look at this month's spending — which category is eating your budget?",
  "Saving starts not with earning more, but spending less.",
  "Small amounts add up. Save a little each day — it compounds fast!",
  "Sleep on a purchase before making it — do you really need it?",
  "The right time to invest is ALWAYS today. Start small.",
  "After paying bills, transfer the rest straight to savings.",
  "An emergency fund is the best investment. Aim for 3 months of expenses.",
  "Compare your car insurance and phone bill — there may be better deals.",
  "Try public transport for fuel savings — good for wallet and planet.",
  "Teach your child financial literacy — the most valuable inheritance.",
  "Money without a goal is easily spent. Set a savings goal today!",
  "Your credit card limit is not income — it's debt. Use wisely.",
  "Shop on a full stomach with a list. Avoid impulse buying.",
  "Gold and FX savings can shield against inflation. Research it!",
  "Regular budget reviews prevent surprise expenses.",
  "Savings account interest seems low, but compound interest works miracles.",
  "Forgotten subscriptions are savings thieves. Check today.",
  "Don't overspend on gifts. Thoughtful gifts don't have to be expensive.",
  "Retirement planning is never too early. Think about it today!",
  "What if you sold something instead of buying this month? Try it!",
  "Ready for a rent increase? Make alternative plans now.",
  "Budget for holidays, special occasions, and big events in advance.",
  "The best way to reduce health costs is healthy living. Exercise!",
  "Ask yourself: where does my money go? That awareness is powerful.",
  "Delay one purchase today, save it. Tomorrow you'll thank yourself.",
  "Financial stress comes from lack of control, not lack of money.",
];

const DEBT_HEAVY_EN = [
  "Debt can feel overwhelming, but don't worry — we'll tackle it together, step by step!",
  "Everyone carries debt at some point. What matters is managing it. You're on the right track!",
  "Feeling the weight of debt? It's temporary. Every payment brings you closer to freedom.",
  "Pay off your smallest debt first — small wins bring big motivation. Let's go!",
  "We're chipping away at debt one by one. It'll melt away like snow. Keep going!",
  "Paying debt today means being free tomorrow. Every lira counts!",
  "Pay your credit card on time — you control interest, not the other way around.",
  "You manage your debt, it doesn't manage you. That awareness alone is powerful!",
  "Hard days are temporary, financial freedom is lasting. Keep paying, it will end!",
  "Knowing your debt is the first step to solving it. Great that you're tracking it!",
];

const INVESTMENT_GOOD_EN = [
  "Your portfolio looks great! Keep this pace — your investments are growing.",
  "Your investments are working for you. Keep adding regularly to multiply your gains!",
  "You're building your financial future. As your portfolio grows, so does your freedom!",
  "Investing puts you ahead of most people. You're doing amazing!",
  "Compound growth takes time to work its magic. You're doing it right — just be patient!",
  "Markets go up and down, but you're winning long-term. Stay the course!",
  "Diversifying across gold, forex, stocks — that's a smart strategy!",
  "Every investment opportunity you seize is a gift to your future self!",
];

const GOAL_FOCUSED_EN = [
  "We'll reach your goal together! You're making great progress — keep it up!",
  "Let your savings goal motivate you — every cent gets you one step closer.",
  "Your dream will come true! Keep contributing regularly to your goal.",
  "Vacation, home, car... Saving for goals is the smartest plan. Keep going!",
  "Small savings make big dreams real. We believe in your goal!",
  "How much did you add to your goal this month? Every bit matters!",
  "Your goal may seem far, but consistent saving works miracles. Don't give up!",
];

const SAVINGS_GOOD_EN = [
  "Your savings rate is excellent! Keep this habit — financial freedom is near.",
  "You're saving a great portion of your income. This pace will take you far!",
  "You're keeping spending under control — that discipline is priceless!",
];

const MOTIVATIONAL_EN: string[] = [
  ...GENERIC_EN,
  ...DEBT_HEAVY_EN,
  ...INVESTMENT_GOOD_EN,
  ...GOAL_FOCUSED_EN,
  ...SAVINGS_GOOD_EN,
];

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  ensureHandler();
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (_e) {
    return false;
  }
}

export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}

export async function getNotifTime(): Promise<{ hour: number; minute: number }> {
  try {
    const h = await AsyncStorage.getItem(NOTIF_HOUR_KEY);
    const m = await AsyncStorage.getItem(NOTIF_MINUTE_KEY);
    return { hour: h !== null ? parseInt(h) : 11, minute: m !== null ? parseInt(m) : 0 };
  } catch {
    return { hour: 11, minute: 0 };
  }
}

export async function setNotifTime(hour: number, minute: number): Promise<void> {
  await AsyncStorage.setItem(NOTIF_HOUR_KEY, String(hour));
  await AsyncStorage.setItem(NOTIF_MINUTE_KEY, String(minute));
}

export async function getNotifRandom(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(NOTIF_RANDOM_KEY);
    return v === "true";
  } catch {
    return false;
  }
}

export async function setNotifRandom(random: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIF_RANDOM_KEY, random ? "true" : "false");
}

function pickMessages(isEN: boolean, ctx?: FinancialContext): string[] {
  const generic = isEN ? GENERIC_EN : GENERIC_TR;
  if (!ctx) return generic;

  const pool: string[] = [...generic];

  const debtTotal = (ctx.totalDebt ?? 0) + (ctx.totalCreditDebt ?? 0);
  if (debtTotal > 0 && ctx.monthlyIncome > 0 && debtTotal > ctx.monthlyIncome * 2) {
    const debtMsgs = isEN ? DEBT_HEAVY_EN : DEBT_HEAVY_TR;
    pool.push(...debtMsgs, ...debtMsgs);
  }

  if (ctx.totalInvestment > 0 && ctx.monthlyIncome > 0 && ctx.totalInvestment > ctx.monthlyIncome * 2) {
    const invMsgs = isEN ? INVESTMENT_GOOD_EN : INVESTMENT_GOOD_TR;
    pool.push(...invMsgs, ...invMsgs);
  }

  if (ctx.hasGoals) {
    const goalMsgs = isEN ? GOAL_FOCUSED_EN : GOAL_FOCUSED_TR;
    pool.push(...goalMsgs);
  }

  if (ctx.savingsRate > 20) {
    const savMsgs = isEN ? SAVINGS_GOOD_EN : SAVINGS_GOOD_TR;
    pool.push(...savMsgs, ...savMsgs);
  }

  return pool;
}

function getDayOfYear(): number {
  return Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
}

export async function scheduleDailyMotivation(
  isEN: boolean,
  ctx?: FinancialContext
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const isRandom = await getNotifRandom();
  const messages = pickMessages(isEN, ctx);

  if (isRandom) {
    await scheduleRandomMotivation(isEN, ctx);
    await setNotificationsEnabled(true);
    return true;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const { hour, minute } = await getNotifTime();
  const dayOfYear = getDayOfYear();
  const msg = messages[dayOfYear % messages.length];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: isEN ? "Family Budget" : "Aile Bütçesi",
      body: msg,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  await setNotificationsEnabled(true);
  return true;
}

export async function scheduleRandomMotivation(
  isEN: boolean,
  ctx?: FinancialContext
): Promise<void> {
  if (Platform.OS === "web") return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const messages = pickMessages(isEN, ctx);
  const now = new Date();
  const DAYS_AHEAD = 60;

  for (let i = 1; i <= DAYS_AHEAD; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);

    const randomHour = 7 + Math.floor(Math.random() * 14);
    const randomMinute = Math.floor(Math.random() * 60);
    date.setHours(randomHour, randomMinute, 0, 0);

    const msgIndex = (getDayOfYear() + i) % messages.length;
    const msg = messages[msgIndex];

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isEN ? "Family Budget" : "Aile Bütçesi",
          body: msg,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
    } catch (_e) {}
  }
}

export interface PaymentItem {
  title: string;
  amount: number;
  type: "income" | "expense" | "loan" | "creditcard";
  recurringDay: number;
}

export async function schedulePaymentReminders(
  items: PaymentItem[],
  isEN: boolean
): Promise<void> {
  if (Platform.OS === "web") return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  for (const item of items) {
    const day = item.recurringDay;
    if (!day || day < 1 || day > 31) continue;

    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const d = new Date();
      d.setMonth(d.getMonth() + monthOffset);
      d.setDate(day);
      d.setHours(8, 0, 0, 0);

      if (d <= new Date()) continue;

      const fmt = (n: number) =>
        new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n) + " ₺";

      let body = "";
      if (item.type === "income") {
        body = isEN
          ? `Your "${item.title}" (${fmt(item.amount)}) should arrive today.`
          : `"${item.title}" geliriniz (${fmt(item.amount)}) bugün yatması bekleniyor.`;
      } else if (item.type === "expense") {
        body = isEN
          ? `Recurring payment due today: "${item.title}" — ${fmt(item.amount)}`
          : `Bugün tekrarlayan ödeme: "${item.title}" — ${fmt(item.amount)}`;
      } else if (item.type === "loan") {
        body = isEN
          ? `Loan payment due today: "${item.title}" — ${fmt(item.amount)}`
          : `Bugün kredi ödemesi: "${item.title}" — ${fmt(item.amount)}`;
      } else if (item.type === "creditcard") {
        body = isEN
          ? `Credit card payment due today: "${item.title}" — ${fmt(item.amount)}`
          : `Bugün kredi kartı ödemesi: "${item.title}" — ${fmt(item.amount)}`;
      }

      if (!body) continue;

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: isEN ? "Payment Reminder" : "Ödeme Hatırlatıcısı",
            body,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: d,
          },
        });
      } catch {}
    }
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await setNotificationsEnabled(false);
}

export async function rescheduleAll(
  isEN: boolean,
  paymentItems: PaymentItem[],
  ctx?: FinancialContext
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const enabled = await getNotificationsEnabled();
  if (!enabled) return false;

  const isRandom = await getNotifRandom();
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (isRandom) {
    await scheduleRandomMotivation(isEN, ctx);
  } else {
    await scheduleDailyMotivation(isEN, ctx);
  }
  await schedulePaymentReminders(paymentItems, isEN);
  return true;
}
