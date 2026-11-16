// Su kesintileri: MESKİ'nin resmî kesinti sayfası.
// Sayfa, tüm kesintileri gizli bir div içinde JSON olarak taşıyor (id="divAllInterruptions").
import { duzMetin, basHarfler } from './text.js';
import { bolgeIlce } from './eczane.js';

export const MESKI_URL = 'https://online.meski.gov.tr/meta/subscription/interruptions';

function htmlCoz(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// MESKİ tarihleri Türkiye saatinde ve saat dilimi bilgisi olmadan gelir
function trTarih(s) {
  if (!s) return null;
  return new Date(`${s.slice(0, 19)}+03:00`).toISOString();
}

export function suKesintiCoz(html = '') {
  const m = html.match(/id="divAllInterruptions"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) return null;
  const ham = JSON.parse(htmlCoz(m[1].trim()) || '[]');
  return ham.map((k) => {
    const ilceler = (k.districtList || []).map((d) => ({
      ilce: bolgeIlce(d.district),
      ad: basHarfler(duzMetin(d.district)),
      mahalleler: (d.quarterList || []).map((q) => basHarfler(duzMetin(q.quarter))),
    }));
    return {
      tur: 'su',
      baslik: duzMetin(k.value || 'Su kesintisi'),
      aciklama: duzMetin(k.webSiteDescription || k.description || k.cause || ''),
      baslangic: trTarih(k.startDate || k.planningStartDate),
      bitis: trTarih(k.finishDate || k.planningFinishDate),
      ilceler,
    };
  });
}

export async function suKesintileriniGetir(ua) {
  const res = await fetch(MESKI_URL, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const liste = suKesintiCoz(await res.text());
  if (!liste) throw new Error('Kesinti verisi bulunamadı (yapı değişmiş olabilir)');
  return liste;
}
