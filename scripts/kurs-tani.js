// İŞKUR kurs sayfası tanı: sayfa yapısı, form alan adları ve çözülen kurs sayısı
import { iskurMersinKurslari } from '../src/lib/iskur.js';
const r = await fetch('https://esube.iskur.gov.tr/Kurs/KursOnAir.aspx?ProgramTur=1', { headers: { 'User-Agent': 'Mozilla/5.0' } });
const html = await r.text();
console.log('DURUM', r.status, 'UZUNLUK', html.length);
console.log('ALANLAR', [...html.matchAll(/name="([^"]*(?:Il|il|Search|Ara|Command)[^"]*)"/g)].map((m) => m[1]).slice(0, 20).join(' | '));
console.log('POPUP', (html.match(/PopupKursDetails/g) || []).length, 'BAŞLIK', (html.match(/<title>([^<]*)/) || [])[1]);
for (const t of [1, 3]) {
  try { const k = await iskurMersinKurslari(t); console.log('TUR', t, 'KURS', k.length, JSON.stringify(k.slice(0, 2))); } catch (e) { console.log('TUR', t, 'HATA', e.message); }
}
