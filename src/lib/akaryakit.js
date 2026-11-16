// Akaryakıt pompa fiyatları: Opet'in ilçe bazlı fiyat listesi (Mersin, il kodu 33).
import { slugify } from './text.js';

export const OPET = 'https://api.opet.com.tr/api/fuelprices/prices?ProvinceCode=33&IncludeAllProducts=true';

export function opetCoz(liste) {
  const sonuc = {};
  for (const d of liste || []) {
    const slug = slugify(String(d.districtName || '').toLocaleLowerCase('tr-TR'));
    const bul = (kod) => d.prices?.find((p) => p.productCode === kod)?.amount ?? null;
    const benzin = bul('A100');
    const motorin = bul('A121') ?? bul('A128');
    if (benzin || motorin) sonuc[slug] = { benzin, motorin };
  }
  return sonuc;
}

// LPG (otogaz): Opet satmıyor; Petrol Ofisi'nin Mersin ilçe tablosundaki "PO/gaz Otogaz" sütunu
export const PO = 'https://www.petrolofisi.com.tr/akaryakit-fiyatlari/mersin-akaryakit-fiyatlari';
export function poLpgCoz(html) {
  const basliklar = [...(html.match(/<thead[\s\S]*?<\/thead>/i)?.[0] || '').matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
  const sira = basliklar.findIndex((b) => /otogaz|lpg/i.test(b));
  if (sira < 1) return {};
  const sonuc = {};
  for (const m of html.matchAll(/<tr[^>]+data-disctrict-name="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const hucreler = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => x[1]);
    const deger = Number((hucreler[sira]?.match(/<span class="with-tax">([\d.,]+)<\/span>/)?.[1] || '').replace(',', '.'));
    const slug = slugify(m[1].toLocaleLowerCase('tr-TR').replace(/i̇/g, 'i'));
    if (deger > 5 && deger < 200) sonuc[slug] = deger;
  }
  return sonuc;
}

export async function akaryakitGetir(ua, eski = null) {
  const r = await fetch(OPET, { headers: { 'User-Agent': ua, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} Opet`);
  const ilceler = opetCoz(await r.json());
  if (!Object.keys(ilceler).length) throw new Error('Opet listesi boş');
  try {
    const p = await fetch(PO, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(20000) });
    if (!p.ok) throw new Error(`HTTP ${p.status}`);
    const lpg = poLpgCoz(await p.text());
    for (const [slug, f] of Object.entries(lpg)) if (ilceler[slug]) ilceler[slug].lpg = f;
    if (!Object.keys(lpg).length) throw new Error('tablo okunamadı');
  } catch (e) {
    console.warn(`! LPG (Petrol Ofisi): ${e.message}`);
    for (const [slug, f] of Object.entries(eski?.ilceler || {})) if (ilceler[slug] && f.lpg) ilceler[slug].lpg = f.lpg;
  }
  // Fiyat değiştiyse eskisini "önceki" olarak sakla (zam/indirim göstermek için)
  let onceki = eski?.onceki || null;
  let degisim = eski?.degisim || null;
  const m = ilceler.akdeniz || Object.values(ilceler)[0];
  const em = eski?.ilceler?.akdeniz || (eski?.ilceler && Object.values(eski.ilceler)[0]);
  if (em && (em.benzin !== m.benzin || em.motorin !== m.motorin)) {
    onceki = em;
    degisim = new Date().toISOString();
  }
  return { guncelleme: new Date().toISOString(), ilceler, onceki, degisim };
}
