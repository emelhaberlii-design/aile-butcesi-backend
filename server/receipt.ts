import type { Request, Response } from "express";
import Tesseract from "tesseract.js";

const CATEGORY_KEYWORDS: Record<string, { keywords: string[]; subcategory: string }[]> = {
  "Market": [
    { keywords: ["a101", "bim", "şok", "migros", "carrefour", "file", "sok", "macro", "metro", "tansaş", "kipa", "süpermarket", "market", "bakkal"], subcategory: "Süpermarket" },
    { keywords: ["manav", "sebze", "meyve"], subcategory: "Manav" },
    { keywords: ["kasap", "et ", "tavuk"], subcategory: "Kasap" },
    { keywords: ["fırın", "ekmek", "pastane", "unlu"], subcategory: "Fırın" },
  ],
  "Faturalar": [
    { keywords: ["elektrik", "enerji", "edaş", "tedaş"], subcategory: "Elektrik" },
    { keywords: ["su ", "İski", "aski", "muski"], subcategory: "Su" },
    { keywords: ["doğalgaz", "igdaş", "başkentgaz"], subcategory: "Doğalgaz" },
    { keywords: ["internet", "turkcell", "vodafone", "türk telekom", "superonline"], subcategory: "İnternet" },
    { keywords: ["telefon", "gsm", "hat "], subcategory: "Telefon" },
  ],
  "Yemek Siparişi": [
    { keywords: ["yemeksepeti", "yemek sepeti"], subcategory: "Yemeksepeti" },
    { keywords: ["trendyol yemek"], subcategory: "Trendyol Yemek" },
    { keywords: ["getir"], subcategory: "Getir" },
    { keywords: ["restoran", "cafe", "kafe", "restaurant", "lokanta", "pizza", "burger", "kebap", "döner"], subcategory: "Yemeksepeti" },
  ],
  "Araç Giderleri": [
    { keywords: ["benzin", "motorin", "akaryakıt", "opet", "shell", "bp", "petrol", "total", "go "], subcategory: "Yakıt" },
    { keywords: ["oto yıkama", "bakım", "servis", "lastik", "yağ değişim"], subcategory: "Bakım/Onarım" },
    { keywords: ["sigorta", "poliçe"], subcategory: "Sigorta" },
    { keywords: ["hgs", "ogs", "köprü", "otoyol", "geçiş"], subcategory: "HGS/Geçiş" },
    { keywords: ["otopark", "park"], subcategory: "Park" },
  ],
  "Sağlık": [
    { keywords: ["eczane", "ilaç", "pharmacy"], subcategory: "İlaç" },
    { keywords: ["hastane", "klinik", "doktor", "muayene", "hospital"], subcategory: "Muayene" },
  ],
  "Giyim": [
    { keywords: ["lc waikiki", "defacto", "koton", "h&m", "zara", "mango", "boyner", "vakko", "mavi", "colins", "giyim"], subcategory: "Genel" },
  ],
  "Eğlence": [
    { keywords: ["sinema", "cinema", "bilet", "konser", "tiyatro"], subcategory: "Sinema" },
  ],
  "Online Alışveriş": [
    { keywords: ["trendyol", "hepsiburada", "amazon", "n11", "gittigidiyor", "sahibinden", "online"], subcategory: "Genel" },
  ],
  "Ev": [
    { keywords: ["kira", "aidat", "apartman"], subcategory: "Kira" },
    { keywords: ["mobilya", "ikea", "dekor", "ev "], subcategory: "Mobilya/Dekor" },
  ],
};

function extractAmount(text: string): number | null {
  const lines = text.split("\n");
  const totalPatterns = [
    /(?:toplam|total|genel\s*toplam|net\s*tutar|ödenecek|tutar|amount)\s*[:\-]?\s*[₺TL]*\s*([\d.,]+)/i,
    /(?:toplam|total|genel\s*toplam|net\s*tutar|ödenecek|tutar)\s*[:\-]?\s*\*?\s*([\d.,]+)/i,
  ];

  for (const pattern of totalPatterns) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const match = lines[i].match(pattern);
      if (match) {
        return parseTurkishAmount(match[1]);
      }
    }
  }

  const amountPattern = /[₺]\s*([\d.,]+)|([\d.,]+)\s*[₺TL]/g;
  const amounts: number[] = [];
  let m;
  while ((m = amountPattern.exec(text)) !== null) {
    const val = parseTurkishAmount(m[1] || m[2]);
    if (val && val > 0) amounts.push(val);
  }

  if (amounts.length > 0) {
    return Math.max(...amounts);
  }

  const standaloneAmounts = text.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g);
  if (standaloneAmounts) {
    const parsed = standaloneAmounts
      .map(parseTurkishAmount)
      .filter((v): v is number => v !== null && v > 0);
    if (parsed.length > 0) return Math.max(...parsed);
  }

  return null;
}

function parseTurkishAmount(str: string): number | null {
  if (!str) return null;
  let cleaned = str.trim();

  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, "");
  } else {
    cleaned = cleaned.replace(",", ".");
  }

  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function extractTitle(text: string): string | null {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 2);

  for (const line of lines.slice(0, 5)) {
    const cleaned = line.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s&.]/g, "").trim();
    if (cleaned.length >= 3 && cleaned.length <= 50) {
      return cleaned;
    }
  }

  return null;
}

function turkishLower(s: string): string {
  return s.replace(/İ/g, "i").replace(/I/g, "ı").toLocaleLowerCase("tr-TR");
}

function detectCategory(text: string): { category: string; subcategory: string } {
  const lower = turkishLower(text);

  for (const [category, matchers] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const matcher of matchers) {
      for (const keyword of matcher.keywords) {
        if (lower.includes(turkishLower(keyword))) {
          return { category, subcategory: matcher.subcategory };
        }
      }
    }
  }

  return { category: "Diğer", subcategory: "Genel" };
}

export async function scanReceipt(req: Request, res: Response) {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const mime = mimeType || "image/jpeg";
    const dataUrl = `data:${mime};base64,${imageBase64}`;

    const result = await Tesseract.recognize(dataUrl, "tur+eng", {
      logger: () => {},
    });

    const ocrText = result.data.text;

    if (!ocrText || ocrText.trim().length < 3) {
      return res.json({
        amount: null,
        title: null,
        category: null,
        subcategory: null,
        paymentMethod: null,
        ocrText: "",
      });
    }

    const amount = extractAmount(ocrText);
    const title = extractTitle(ocrText);
    const { category, subcategory } = detectCategory(ocrText);

    let paymentMethod: string | null = null;
    const lowerText = turkishLower(ocrText);
    if (lowerText.includes("kredi") || lowerText.includes("credit") || lowerText.includes("visa") || lowerText.includes("mastercard")) {
      paymentMethod = "credit";
    } else if (lowerText.includes("banka") || lowerText.includes("debit") || lowerText.includes("havale") || lowerText.includes("eft")) {
      paymentMethod = "debit";
    } else if (lowerText.includes("nakit") || lowerText.includes("cash")) {
      paymentMethod = "cash";
    }

    return res.json({
      amount,
      title,
      category,
      subcategory,
      paymentMethod,
      ocrText: ocrText.substring(0, 500),
    });
  } catch (err: any) {
    console.error("OCR processing error:", err);
    return res.status(500).json({
      error: "Fiş işlenirken bir hata oluştu. Lütfen bilgileri manuel girin.",
    });
  }
}
