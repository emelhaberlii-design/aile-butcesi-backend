import type { Request, Response } from "express";

const TROY_OUNCE_GRAMS = 31.1035;
const CACHE_DURATION = 10 * 60 * 1000;

export interface MarketPriceData {
  goldGram: number;
  silverGram: number;
  platinumGram: number;
  usd: number;
  eur: number;
  gbp: number;
  chf: number;
  jpy: number;
  cad: number;
  aud: number;
  lastUpdated: string;
  history: {
    goldGram: number[];
    usd: number[];
    eur: number[];
  };
}

let cache: { data: MarketPriceData; timestamp: number } | null = null;

async function fetchYahooData(symbol: string): Promise<{ price: number; history: number[] }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=30d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Yahoo Finance error for ${symbol}: ${res.status}`);
  const json = (await res.json()) as {
    chart: {
      result: Array<{
        meta: { regularMarketPrice: number };
        indicators: { quote: Array<{ close: (number | null)[] }> };
      }>;
    };
  };
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);
  const allCloses = result.indicators?.quote?.[0]?.close ?? [];
  const history = allCloses.filter((v): v is number => v !== null && !isNaN(v));
  const price = result.meta.regularMarketPrice ?? history[history.length - 1];
  if (!price) throw new Error(`No price for ${symbol}`);
  return { price, history: history.slice(-30) };
}

async function fetchYahoaSafe(symbol: string): Promise<number> {
  try {
    const d = await fetchYahooData(symbol);
    return d.price;
  } catch {
    return 0;
  }
}

export async function getMarketPrices(req: Request, res: Response) {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return res.json(cache.data);
    }

    const [xauData, xagData, plData, usdTryData, eurTryData, gbpTryData] = await Promise.all([
      fetchYahooData("GC=F"),
      fetchYahooData("SI=F"),
      fetchYahooData("PL=F"),
      fetchYahooData("USDTRY=X"),
      fetchYahooData("EURTRY=X"),
      fetchYahooData("GBPTRY=X"),
    ]);

    const [chfTry, jpyTry, cadTry, audTry] = await Promise.all([
      fetchYahoaSafe("CHFTRY=X"),
      fetchYahoaSafe("JPYTRY=X"),
      fetchYahoaSafe("CADTRY=X"),
      fetchYahoaSafe("AUDTRY=X"),
    ]);

    const currentUsdTry = usdTryData.price;

    const goldGramHistory = xauData.history.map(
      (xauUsd) => (xauUsd * currentUsdTry) / TROY_OUNCE_GRAMS
    );

    const data: MarketPriceData = {
      goldGram: (xauData.price * currentUsdTry) / TROY_OUNCE_GRAMS,
      silverGram: (xagData.price * currentUsdTry) / TROY_OUNCE_GRAMS,
      platinumGram: (plData.price * currentUsdTry) / TROY_OUNCE_GRAMS,
      usd: currentUsdTry,
      eur: eurTryData.price,
      gbp: gbpTryData.price,
      chf: chfTry || currentUsdTry * 1.1,
      jpy: jpyTry || currentUsdTry / 150,
      cad: cadTry || currentUsdTry * 0.73,
      aud: audTry || currentUsdTry * 0.65,
      lastUpdated: new Date().toISOString(),
      history: {
        goldGram: goldGramHistory,
        usd: usdTryData.history.slice(-30),
        eur: eurTryData.history.slice(-30),
      },
    };

    cache = { data, timestamp: Date.now() };
    return res.json(data);
  } catch (error) {
    console.error("Market prices fetch error:", error);
    if (cache) {
      return res.json({ ...cache.data, cached: true });
    }
    return res.status(503).json({ error: "Market prices unavailable" });
  }
}
