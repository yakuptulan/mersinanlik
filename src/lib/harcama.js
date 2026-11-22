// Google deneme kredisi (300 $ / 90 gün) için tahmini harcama defteri.
// Her ücretli çağrı buraya yazılır; günlük ve toplam tavan aşılırsa ücretli yol kapanır, ücretsiz yola düşülür.
// Fiyatlar Vertex AI liste fiyatları (USD), tahminidir; gerçek tutar Google faturalandırma sayfasında.
import fs from 'node:fs';

const DOSYA = 'data/harcama.json';
export const FIYAT = {
  gorsel: 0.039, // gemini-2.5-flash-image, 1 görsel
  proGorsel: 0.134, // gemini-3-pro-image, 1 görsel (1K)
  metinGirdi: 2 / 1e6, // gemini-3.1-pro-preview
  metinCikti: 12 / 1e6,
};
export const TAVAN = { gunluk: 3.2, toplam: 285, bitis: '2027-02-19' };

const trGun = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

function oku() {
  try { return JSON.parse(fs.readFileSync(DOSYA, 'utf8')); } catch { return { toplam: 0, gunler: {}, kalemler: {} }; }
}

export function bugunHarcanan() {
  return oku().gunler[trGun()] || 0;
}

// Bu tutar harcanabilir mi?
export function butceVar(tutar) {
  const d = oku();
  if (trGun() > TAVAN.bitis) return false;
  return (d.gunler[trGun()] || 0) + tutar <= TAVAN.gunluk && d.toplam + tutar <= TAVAN.toplam;
}

export function harcamaYaz(kalem, tutar) {
  const d = oku();
  const g = trGun();
  d.gunler[g] = +((d.gunler[g] || 0) + tutar).toFixed(4);
  d.toplam = +(d.toplam + tutar).toFixed(4);
  d.kalemler[kalem] = +((d.kalemler[kalem] || 0) + tutar).toFixed(4);
  // Sadece son 120 günü tut
  for (const k of Object.keys(d.gunler).sort().slice(0, -120)) delete d.gunler[k];
  fs.writeFileSync(DOSYA, JSON.stringify(d, null, 1));
}
