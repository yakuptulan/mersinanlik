// Google'da Türkiye'de o gün en çok arananlar (Google Trends günlük RSS).
// Türkiye/dünya haberlerinden çok aranan bir konuyla eşleşenler, kaynak sayısı eşiği
// beklenmeden yayınlanır ve "Çok aranan" diye işaretlenir.
import { duzMetin, kucuk } from './text.js';

export const TREND_RSS = 'https://trends.google.com/trending/rss?geo=TR';

export function trendCoz(xml) {
  return [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m) => ({
      baslik: duzMetin(m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').trim(),
      trafik: Number((m[1].match(/<ht:approx_traffic>([\d.,]+)/)?.[1] || '0').replace(/[.,]/g, '')),
    }))
    .filter((t) => t.baslik);
}

const kelimeler = (s) => kucuk(s).replace(/[^a-zçğıöşü0-9 ]/g, ' ').split(/\s+/).filter((k) => k.length >= 3);

// Trendin bütün kelimeleri başlıkta bir kelimenin başında geçiyorsa eşleşir ("galatasaray" → "Galatasaray'ın")
export function trendEslesir(trend, baslik) {
  const tk = kelimeler(trend);
  if (!tk.length) return false;
  const bk = kelimeler(baslik);
  return tk.every((t) => bk.some((b) => b.startsWith(t)));
}

export async function trendGetir(ua) {
  const r = await fetch(TREND_RSS, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} Trends`);
  return trendCoz(await r.text());
}
