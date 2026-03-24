import type { Request, Response } from "express";

// Turkish bank minimum payment rates for credit cards
// Source: BDDK (Bankacılık Düzenleme ve Denetleme Kurumu) regulations
// Banks are required to collect at least 20% (BDDK minimum), most set 25-30%
// Data last verified: March 2026
export const BANK_MIN_PAYMENT_RATES: Record<string, number> = {
  // Major public banks — BDDK minimum 20%
  "Ziraat Bankası":   0.20,
  "Ziraat":           0.20,
  "Vakıfbank":        0.20,
  "VakıfBank":        0.20,
  "Halkbank":         0.20,

  // Major private banks — 25%
  "Akbank":           0.25,
  "Garanti":          0.25,
  "Garanti BBVA":     0.25,
  "BBVA":             0.25,
  "Yapı Kredi":       0.25,
  "YapıKredi":        0.25,
  "İş Bankası":       0.25,
  "İşbank":           0.25,
  "İşBankası":        0.25,
  "Türkiye İş Bankası": 0.25,

  // Other private banks — 25%
  "DenizBank":        0.25,
  "Denizbank":        0.25,
  "QNB Finansbank":   0.25,
  "Finansbank":       0.25,
  "TEB":              0.25,
  "Türk Ekonomi Bankası": 0.25,
  "ING":              0.25,
  "ING Bank":         0.25,
  "HSBC":             0.25,
  "HSBC Bank":        0.25,
  "Şekerbank":        0.20,
  "Alternatif Bank":  0.20,
  "Burgan Bank":      0.20,
  "Fibabanka":        0.20,
  "Odeabank":         0.25,

  // Neo/digital banks
  "Papara":           0.25,
  "Tosla":            0.25,
  "ininal":           0.20,
};

// Default rate when bank not found
export const DEFAULT_MIN_RATE = 0.25;

// Get minimum payment rate for a bank name (case-insensitive fuzzy match)
export function getMinRate(bankName: string): number {
  const lower = bankName.toLowerCase();
  for (const [key, rate] of Object.entries(BANK_MIN_PAYMENT_RATES)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return rate;
    }
  }
  return DEFAULT_MIN_RATE;
}

// Cache TTL: 24 hours — rates only change when BDDK updates regulations
let cachedRatesAt: number = 0;
let cachedRates: object | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function getBankRates(req: Request, res: Response) {
  const now = Date.now();
  if (cachedRates && now - cachedRatesAt < CACHE_TTL) {
    return res.json(cachedRates);
  }
  const payload = {
    rates: BANK_MIN_PAYMENT_RATES,
    defaultRate: DEFAULT_MIN_RATE,
    bddk_minimum: 0.20,
    lastUpdated: new Date().toISOString(),
    note_tr: "BDDK zorunlu asgari ödeme %20 olup bankalar genellikle %25 uygulamaktadır.",
    note_en: "BDDK mandates 20% minimum; most banks apply 25%.",
  };
  cachedRates = payload;
  cachedRatesAt = now;
  res.json(payload);
}
