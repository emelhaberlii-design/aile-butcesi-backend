export type CurrencyCode = "TRY" | "USD" | "EUR" | "GBP";

export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string; labelEn: string }[] = [
  { code: "TRY", symbol: "₺", label: "Türk Lirası", labelEn: "Turkish Lira" },
  { code: "USD", symbol: "$", label: "Amerikan Doları", labelEn: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro", labelEn: "Euro" },
  { code: "GBP", symbol: "£", label: "İngiliz Sterlini", labelEn: "British Pound" },
];

export function getCurrencySymbol(code: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol || "₺";
}

export function getCurrencyLabel(code: CurrencyCode, lang: "tr" | "en" = "tr"): string {
  const c = CURRENCIES.find((cur) => cur.code === code);
  return lang === "tr" ? (c?.label || code) : (c?.labelEn || code);
}

export function fmtCurrency(amount: number, currency: CurrencyCode = "TRY", decimals: number = 0): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(amount));
  const sign = amount < 0 ? "-" : "";
  return `${sign}${formatted} ${symbol}`;
}
