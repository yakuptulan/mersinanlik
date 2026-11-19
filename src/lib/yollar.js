// Kapalı ve çalışma yapılan yollar: Karayolları Genel Müdürlüğü (yol.kgm.gov.tr/kapaliyollar) açık verisi.
// Sadece Mersin sınırlarına (yaklaşık kutu) değen kayıtlar alınır.
export const KGM_YOL = 'https://yol.kgm.gov.tr/kapaliyollar/api/workings/search';
export const KGM_SAYFA = 'https://yol.kgm.gov.tr/kapaliyollar';
const MERSIN = { minLon: 32.55, minLat: 35.95, maxLon: 35.15, maxLat: 37.45 };

export function mersinYollari(liste) {
  return (liste || [])
    .filter((y) => Array.isArray(y.extent) && y.extent.length === 4)
    .filter((y) => {
      const [x1, y1, x2, y2] = y.extent;
      return x2 >= MERSIN.minLon && x1 <= MERSIN.maxLon && y2 >= MERSIN.minLat && y1 <= MERSIN.maxLat;
    })
    .map((y) => ({
      id: y.id,
      neden: String(y.reason || '').trim(),
      yol: String(y.shortDescription || '').trim(),
      no: y.roadNo || '',
      km: y.startKm != null && y.endKm != null ? `${y.startKm}-${y.endKm}` : '',
      aciklama: String(y.explanation || '').trim(),
      baslangic: y.workTime || null,
      lat: (y.extent[1] + y.extent[3]) / 2,
      lon: (y.extent[0] + y.extent[2]) / 2,
    }));
}

export async function yollariGetir(ua) {
  const r = await fetch(KGM_YOL, { headers: { 'User-Agent': ua, Accept: 'application/json' }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} KGM`);
  const j = await r.json();
  return { guncelleme: new Date().toISOString(), liste: mersinYollari(j.data) };
}
