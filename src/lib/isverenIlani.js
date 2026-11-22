// İşverenlerin sitedeki formdan gönderdiği ilanlar.
// Form (functions/api/ilan-ver.js) ilanı Telegram'a "Onayla / Reddet" düğmeleriyle yollar.
// Onaylanınca collect.js mesaj metnini buradan ayrıştırıp data/isveren-ilanlari.json'a yazar.
import fs from 'node:fs';

export const ISVEREN_DOSYA = 'data/isveren-ilanlari.json';
const ALANLAR = { 'İşyeri': 'isyeri', 'Pozisyon': 'pozisyon', 'İlçe': 'ilce', 'İlçe kodu': 'ilceSlug', 'Kişi': 'kisi', 'Çalışma': 'calisma', 'Son başvuru': 'sonBasvuru', 'Telefon': 'telefon', 'E-posta': 'eposta', 'Ücret': 'ucret' };
const BOLUMLER = { 'Açıklama:': 'aciklama', 'Aranan nitelikler:': 'nitelik' };

export function ilanMetniCoz(metin) {
  const sonuc = {};
  let bolum = null;
  for (const satir of String(metin).split('\n')) {
    if (/^━+$/.test(satir.trim())) { bolum = null; continue; }
    if (BOLUMLER[satir.trim()]) { bolum = BOLUMLER[satir.trim()]; sonuc[bolum] = ''; continue; }
    if (bolum) { sonuc[bolum] += (sonuc[bolum] ? '\n' : '') + satir; continue; }
    const m = satir.match(/^([^:]{2,20}):\s*(.*)$/);
    if (m && ALANLAR[m[1].trim()]) sonuc[ALANLAR[m[1].trim()]] = m[2].trim();
  }
  for (const k of ['aciklama', 'nitelik']) if (sonuc[k]) sonuc[k] = sonuc[k].trim();
  sonuc.kisi = Math.max(1, Math.min(99, parseInt(sonuc.kisi, 10) || 1));
  if (sonuc.eposta === '-') delete sonuc.eposta;
  if (sonuc.ucret === '-') delete sonuc.ucret;
  return sonuc.isyeri && sonuc.pozisyon && sonuc.telefon ? sonuc : null;
}

export function isverenIlanlariOku() {
  try { return JSON.parse(fs.readFileSync(ISVEREN_DOSYA, 'utf8')); } catch { return { ilanlar: [] }; }
}

export function isverenIlaniEkle(id, metin) {
  const ilan = ilanMetniCoz(metin);
  if (!ilan) return false;
  const v = isverenIlanlariOku();
  if (v.ilanlar.some((x) => x.id === id)) return true;
  v.ilanlar.unshift({ id, ...ilan, onay: new Date().toISOString() });
  // Süresi 30 günden fazla geçmiş olanları sil
  const sinir = Date.now() - 30 * 864e5;
  v.ilanlar = v.ilanlar.filter((x) => !x.sonBasvuru || Date.parse(`${x.sonBasvuru}T23:59:00+03:00`) > sinir);
  fs.writeFileSync(ISVEREN_DOSYA, JSON.stringify(v, null, 1));
  return true;
}
