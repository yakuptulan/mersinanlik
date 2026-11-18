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

const kelimeler = (s) => kucuk(s).replace(/[’`]/g, "'").replace(/[^a-zçğıöşüâîû0-9' ]/g, ' ').split(/\s+/).filter((k) => k.replace(/'.*/, '').length >= 3 || /^\d+$/.test(k));

// Tek başına çok genel olan aramalar: hemen her gün çok haberde geçer, haberi önemli yapmaz
const GENEL_TERIMLER = new Set(['gaz', 'çin', 'karar', 'sağlık', 'istanbul', 'ankara', 'izmir', 'türkiye', 'ukrayna', 'rusya', 'suriye', 'israil', 'iran', 'abd', 'amerika', 'avrupa', 'almanya', 'ingiltere', 'fransa', 'uçak', 'deprem', 'hava', 'hava durumu', 'altın', 'dolar', 'euro', 'borsa', 'maç', 'lig', 'süper lig', '1. lig', '2. lig', '3. lig', 'tutuklama', 'gözaltı', 'zeytin', 'gümrük', 'yapay zeka', 'yapay zekâ', 'okul', 'sınav', 'emekli', 'maaş', 'asgari ücret', 'kar', 'yağmur', 'fırtına', 'seçim', 'polis', 'ölüm', 'kaza']);

// Kelime ya aynen ya da kesme işaretiyle ek almış hâliyle geçmeli ("galatasaray" → "Galatasaray'ın";
// "çin" → "çini" ya da "gaz" → "Gazze" eşleşmez)
const ayniKelime = (b, t) => b === t || b.startsWith(t + "'");

// trafik: Google'daki yaklaşık arama sayısı. Tek kelimelik aramalar (tohum, tarım, basketbol gibi)
// ancak çok yüksek ilgi görüyorsa sayılır.
export function trendEslesir(trend, baslik, trafik = Infinity) {
  if (GENEL_TERIMLER.has(kucuk(trend).trim())) return false;
  const tk = kelimeler(trend).map((k) => k.replace(/'.*/, ''));
  if (!tk.length) return false;
  // Tek kelimelik arama ancak özel bir adsa (en az 5 harf) işe yarar
  if (tk.length === 1 && (tk[0].length < 5 || trafik < 50000)) return false;
  const bk = kelimeler(baslik);
  return tk.every((t) => bk.some((b) => ayniKelime(b, t)));
}

export async function trendGetir(ua) {
  const r = await fetch(TREND_RSS, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} Trends`);
  return trendCoz(await r.text());
}
