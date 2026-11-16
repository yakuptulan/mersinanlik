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

export async function akaryakitGetir(ua, eski = null) {
  const r = await fetch(OPET, { headers: { 'User-Agent': ua, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} Opet`);
  const ilceler = opetCoz(await r.json());
  if (!Object.keys(ilceler).length) throw new Error('Opet listesi boş');
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
