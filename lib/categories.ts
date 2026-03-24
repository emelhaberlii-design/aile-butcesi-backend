import { Language } from "./i18n";

export const CATEGORY_TR_TO_EN: Record<string, string> = {
  "Ev": "Housing",
  "Faturalar": "Bills",
  "Market": "Grocery",
  "Yemek Siparişi": "Food Delivery",
  "Araç Giderleri": "Vehicle",
  "Toplu Taşıma": "Transport",
  "Sağlık": "Health",
  "Eğlence": "Entertainment",
  "Çocuk/Bebek": "Kids/Baby",
  "Online Alışveriş": "Online Shopping",
  "Giyim": "Clothing",
  "Eğitim": "Education",
  "Kredi Ödemesi": "Loan Payment",
  "Diğer": "Other",
};

export const CATEGORY_EN_TO_TR: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TR_TO_EN).map(([tr, en]) => [en, tr])
);

export const SUBCATEGORY_TR_TO_EN: Record<string, string> = {
  // Ev / Housing
  "Kira": "Rent",
  "Aidat": "Building Fee",
  "Tadilat": "Renovation",
  "Temizlik": "Cleaning",
  "Mobilya/Dekor": "Furniture/Decor",
  // Faturalar / Bills
  "Elektrik": "Electricity",
  "Su": "Water",
  "Doğalgaz": "Natural Gas",
  "İnternet": "Internet",
  "Telefon": "Phone",
  "Abonelikler": "Subscriptions",
  // Market / Grocery
  "Süpermarket": "Supermarket",
  "Manav": "Produce Store",
  "Kasap": "Butcher",
  "Fırın": "Bakery",
  "Mahalle Bakkalı": "Corner Shop",
  // Yemek Siparişi / Food Delivery
  "Yemeksepeti": "Yemeksepeti",
  "Trendyol Yemek": "Trendyol Food",
  "Getir": "Getir",
  "Migros Yemek": "Migros Food",
  "GoFody": "GoFody",
  // Araç Giderleri / Vehicle
  "Yakıt": "Fuel",
  "Bakım/Onarım": "Maintenance",
  "Sigorta": "Insurance",
  "Kasko": "Casco",
  "MTV": "Motor Tax",
  "HGS/Geçiş": "Tolls/HGS",
  "Park": "Parking",
  // Toplu Taşıma / Transport
  "Otobüs": "Bus",
  "Metro": "Metro",
  "Tramvay": "Tram",
  "Minibüs": "Minibus",
  "Taksi": "Taxi",
  "Uçak": "Flight",
  "Tren": "Train",
  "Vapur": "Ferry",
  // Sağlık / Health
  "Eczane": "Pharmacy",
  "Doktor": "Doctor",
  "Hastane": "Hospital",
  "Psikolog": "Psychologist",
  "Psikiyatrist": "Psychiatrist",
  "Diş": "Dentist",
  "Spor Salonu": "Gym",
  // Eğlence / Entertainment
  "Sinema": "Cinema",
  "Konser": "Concert",
  "Restoran": "Restaurant",
  "Kafe": "Café",
  "Tatil": "Vacation",
  "Tiyatro": "Theatre",
  "Halısaha": "Five-a-side",
  "Spor Aktiviteleri": "Sports Activities",
  // Çocuk/Bebek / Kids
  "Bez": "Diapers",
  "Mama": "Baby Food",
  "Okul Taksiti": "School Fee",
  "Okul Alışverişi": "School Shopping",
  "Oyuncak": "Toys",
  "Çocuk Giyim": "Kids Clothing",
  "Çocuk Sağlık": "Kids Health",
  // Online Alışveriş / Online Shopping
  "Trendyol": "Trendyol",
  "Hepsiburada": "Hepsiburada",
  "Amazon": "Amazon",
  "N11": "N11",
  // Giyim / Clothing
  "Kıyafet": "Clothing",
  "Ayakkabı": "Shoes",
  "Aksesuar": "Accessories",
  // Eğitim / Education
  "Okul": "School",
  "Kurs": "Course",
  "Kitap": "Books",
  "Özel Ders": "Tutoring",
  // Kredi Ödemesi / Loan Payment
  "Konut Kredisi": "Mortgage",
  "Taşıt Kredisi": "Auto Loan",
  "İhtiyaç Kredisi": "Personal Loan",
  // Diğer / Other
  "Genel": "General",
  "Beklenmedik": "Unexpected",
  "Hediye": "Gift",
  "Diğer": "Other",
};

export const INCOME_CATEGORY_TR_TO_EN: Record<string, string> = {
  "Maaş": "Salary",
  "Serbest Çalışma": "Freelancing",
  "Kira Geliri": "Rental Income",
  "Yatırım Geliri": "Investment Income",
  "Yan Gelir": "Side Income",
  "Prim/Bonus": "Bonus/Premium",
  "Diğer": "Other",
};

// Sub-brands for subcategories (third level, optional)
export const SUBCATEGORY_BRANDS: Record<string, string[]> = {
  "Abonelikler": [
    // Video Streaming
    "Netflix",
    "Disney+",
    "Amazon Prime Video",
    "Apple TV+",
    "Exxen",
    "Gain",
    "BluTV",
    "BeinConnect",
    "Digitürk",
    "TRT İzle",
    "Puhu TV",
    "MUBI",
    // Müzik
    "Spotify",
    "Apple Music",
    "YouTube Music",
    "Deezer",
    "Tidal",
    // Oyun
    "YouTube Premium",
    "Apple Arcade",
    "Xbox Game Pass",
    "PlayStation Plus",
    "Google Play Pass",
    // Bulut & Depolama
    "iCloud",
    "Google One",
    "Dropbox",
    "OneDrive",
    // Üretkenlik & Yazılım
    "Microsoft 365",
    "Apple One",
    "Adobe CC",
    "Canva Pro",
    "Notion",
    "ChatGPT Plus",
    // Diğer
    "LinkedIn Premium",
    "Duolingo Plus",
    "Headspace",
    "Calm",
  ],
  "Süpermarket": [
    "A101", "BIM", "Migros", "Şok", "Happy Center",
    "Uysal Market", "Carrefour", "Metro", "Hakmar", "Macro Center",
  ],
};

// Fixed/non-negotiable expense subcategories — don't suggest reducing these
export const FIXED_SUBCATEGORIES = new Set([
  "Kira", "Aidat", "Konut Kredisi", "Taşıt Kredisi", "İhtiyaç Kredisi",
  "Elektrik", "Su", "Doğalgaz", "İnternet", "Telefon",
  "MTV", "Sigorta", "Kasko",
]);

// Fixed expense categories where reduction advice is unhelpful
export const FIXED_CATEGORIES = new Set(["Kredi Ödemesi"]);

export function localizeCategory(cat: string, lang: Language): string {
  if (lang === "tr") return cat;
  return CATEGORY_TR_TO_EN[cat] || cat;
}

export function localizeSubcategory(sub: string, lang: Language): string {
  if (lang === "tr") return sub;
  return SUBCATEGORY_TR_TO_EN[sub] || sub;
}

export function localizeIncomeCategory(cat: string, lang: Language): string {
  if (lang === "tr") return cat;
  return INCOME_CATEGORY_TR_TO_EN[cat] || cat;
}

export function deLocalizeCategory(displayCat: string, lang: Language): string {
  if (lang === "tr") return displayCat;
  return CATEGORY_EN_TO_TR[displayCat] || displayCat;
}

const TITLE_TO_CATEGORY: Array<{ keywords: RegExp; category: string; subcategory: string }> = [
  // Online Alışveriş
  { keywords: /trendyol/i, category: "Online Alışveriş", subcategory: "Trendyol" },
  { keywords: /hepsiburada/i, category: "Online Alışveriş", subcategory: "Hepsiburada" },
  { keywords: /amazon/i, category: "Online Alışveriş", subcategory: "Amazon" },
  { keywords: /n11/i, category: "Online Alışveriş", subcategory: "N11" },
  { keywords: /gittigidiyor|letgo|sahibinden/i, category: "Online Alışveriş", subcategory: "N11" },
  { keywords: /lcwaikiki|lc waikiki/i, category: "Giyim", subcategory: "Kıyafet" },
  { keywords: /zara|h&m|bershka|pull.?bear|mango|koton|defacto/i, category: "Giyim", subcategory: "Kıyafet" },
  { keywords: /adidas|nike|puma|flo|reebok|new balance/i, category: "Giyim", subcategory: "Ayakkabı" },
  // Market / Süpermarket
  { keywords: /\ba101\b|a\s*101/i, category: "Market", subcategory: "Süpermarket" },
  { keywords: /\bbim\b/i, category: "Market", subcategory: "Süpermarket" },
  { keywords: /migros/i, category: "Market", subcategory: "Süpermarket" },
  { keywords: /\bşok\b|\bsok\b/i, category: "Market", subcategory: "Süpermarket" },
  { keywords: /carrefour/i, category: "Market", subcategory: "Süpermarket" },
  { keywords: /\bmetro\b/i, category: "Market", subcategory: "Süpermarket" },
  { keywords: /hakmar|macro center|happy center/i, category: "Market", subcategory: "Süpermarket" },
  { keywords: /manav|meyve.?sebze/i, category: "Market", subcategory: "Manav" },
  { keywords: /kasap|et.?dükkân/i, category: "Market", subcategory: "Kasap" },
  { keywords: /fırın|ekmek/i, category: "Market", subcategory: "Fırın" },
  // Yemek Siparişi
  { keywords: /yemeksepeti/i, category: "Yemek Siparişi", subcategory: "Yemeksepeti" },
  { keywords: /trendyol\s*yemek/i, category: "Yemek Siparişi", subcategory: "Trendyol Yemek" },
  { keywords: /getir/i, category: "Yemek Siparişi", subcategory: "Getir" },
  { keywords: /gofody/i, category: "Yemek Siparişi", subcategory: "GoFody" },
  // Faturalar / Bills
  { keywords: /netflix/i, category: "Faturalar", subcategory: "Abonelikler" },
  { keywords: /spotify/i, category: "Faturalar", subcategory: "Abonelikler" },
  { keywords: /disney\+?/i, category: "Faturalar", subcategory: "Abonelikler" },
  { keywords: /youtube\s*(premium|music)/i, category: "Faturalar", subcategory: "Abonelikler" },
  { keywords: /apple\s*(tv|music|arcade|one|icloud)/i, category: "Faturalar", subcategory: "Abonelikler" },
  { keywords: /chatgpt|openai/i, category: "Faturalar", subcategory: "Abonelikler" },
  { keywords: /microsoft|office 365|m365/i, category: "Faturalar", subcategory: "Abonelikler" },
  { keywords: /elektrik/i, category: "Faturalar", subcategory: "Elektrik" },
  { keywords: /su\s*fat/i, category: "Faturalar", subcategory: "Su" },
  { keywords: /dogalgaz|doğalgaz|igdas|igdaş/i, category: "Faturalar", subcategory: "Doğalgaz" },
  { keywords: /turkcell|vodafone|türk\s*telekom|superonline|ttnet/i, category: "Faturalar", subcategory: "Telefon" },
  { keywords: /internet|fiber/i, category: "Faturalar", subcategory: "İnternet" },
  // Araç
  { keywords: /shell|bp|petrol\s*ofisi|opet|total|akaryakıt|akaryak/i, category: "Araç Giderleri", subcategory: "Yakıt" },
  { keywords: /hgs|ogm|otoyol|geçiş/i, category: "Araç Giderleri", subcategory: "HGS/Geçiş" },
  { keywords: /kasko|sigorta/i, category: "Araç Giderleri", subcategory: "Kasko" },
  { keywords: /oto\s*servis|bakım|onarım/i, category: "Araç Giderleri", subcategory: "Bakım/Onarım" },
  { keywords: /park/i, category: "Araç Giderleri", subcategory: "Park" },
  // Sağlık
  { keywords: /eczane|pharmacy/i, category: "Sağlık", subcategory: "Eczane" },
  { keywords: /hastane|hospital|klinik/i, category: "Sağlık", subcategory: "Hastane" },
  { keywords: /doktor|dr\./i, category: "Sağlık", subcategory: "Doktor" },
  { keywords: /diş|dis|dental/i, category: "Sağlık", subcategory: "Diş" },
  { keywords: /spor\s*salon|gym|fitness/i, category: "Sağlık", subcategory: "Spor Salonu" },
  // Eğlence
  { keywords: /sinema|cinema/i, category: "Eğlence", subcategory: "Sinema" },
  { keywords: /restoran|restaurant|steakhouse/i, category: "Eğlence", subcategory: "Restoran" },
  { keywords: /kafe|cafe|kahve|starbucks/i, category: "Eğlence", subcategory: "Kafe" },
  { keywords: /konsert?|konser/i, category: "Eğlence", subcategory: "Konser" },
  { keywords: /tiyatro/i, category: "Eğlence", subcategory: "Tiyatro" },
  // Toplu Taşıma
  { keywords: /taksi|uber|taxim|bitaksi/i, category: "Toplu Taşıma", subcategory: "Taksi" },
  { keywords: /pegasus|thy|türk\s*havayol|sunexpress|ajet/i, category: "Toplu Taşıma", subcategory: "Uçak" },
  // Ev
  { keywords: /kira/i, category: "Ev", subcategory: "Kira" },
  { keywords: /aidat/i, category: "Ev", subcategory: "Aidat" },
  { keywords: /ikea|mobilya/i, category: "Ev", subcategory: "Mobilya/Dekor" },
  // Eğitim
  { keywords: /udemy|coursera|ders|kurs|okul/i, category: "Eğitim", subcategory: "Kurs" },
  { keywords: /kitap/i, category: "Eğitim", subcategory: "Kitap" },
];

export function categoryFromTitle(title: string): { category: string; subcategory: string } | null {
  if (!title?.trim()) return null;
  for (const rule of TITLE_TO_CATEGORY) {
    if (rule.keywords.test(title)) {
      return { category: rule.category, subcategory: rule.subcategory };
    }
  }
  return null;
}
