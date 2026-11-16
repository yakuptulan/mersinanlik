// Nöbetçi eczaneler: Mersin Eczacı Odası'nın resmî sayfasından okunur.
// Sayfa sunucuda hazır HTML olarak geliyor; her eczane bir "nobet-kart" bloğunda.
import { ILCELER } from '../config.js';
import { duzMetin, slugify, basHarfler } from './text.js';

export const ECZANE_URL = 'https://www.mersineczaciodasi.org.tr/nobetci-eczaneler';

// Sayfadaki bölge adını ilçe slug'ına çevirir ("GÜLNAR(GÜLPINAR)" → gulnar, "KIZKALESİ" → erdemli)
export function bolgeIlce(bolge = '') {
  const s = slugify(bolge);
  if (s.startsWith('kizkalesi')) return 'erdemli';
  const ilce = ILCELER.find((i) => s === i.slug || s.startsWith(i.slug));
  return ilce ? ilce.slug : null;
}

export function eczaneCoz(html = '') {
  const parcalar = html.split(/class="[^"]*nobet-kart/).slice(1);
  const sonuc = [];
  for (const p of parcalar) {
    const bas = p.match(/<strong>\s*([\s\S]*?)\s*<\/strong>\s*-\s*([^<]+)<\/h4>/);
    if (!bas) continue;
    const ad = basHarfler(duzMetin(bas[1]));
    const bolge = duzMetin(bas[2]);
    const adres = (p.match(/fa-home[^>]*><\/i>([\s\S]*?)<br/) || [])[1];
    const tarif = (p.match(/fa-arrows[^>]*><\/i>([\s\S]*?)<br/) || [])[1];
    const tel = (p.match(/href="tel:([\d+ ]+)"/) || [])[1];
    const konum = p.match(/maps\?q=([\d.]+),([\d.]+)/);
    const saat = (p.match(/fa-clock-o[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/) || [])[1];
    sonuc.push({
      ad,
      bolge,
      ilce: bolgeIlce(bolge),
      adres: adres ? duzMetin(adres) : '',
      tarif: tarif ? duzMetin(tarif) : '',
      telefon: tel ? tel.replace(/\s/g, '') : '',
      lat: konum ? Number(konum[1]) : null,
      lon: konum ? Number(konum[2]) : null,
      saat: saat ? duzMetin(saat) : '',
    });
  }
  return sonuc;
}

export async function eczaneleriGetir(ua) {
  const res = await fetch(ECZANE_URL, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const liste = eczaneCoz(await res.text());
  if (!liste.length) throw new Error('Sayfada eczane bulunamadı (yapı değişmiş olabilir)');
  return liste;
}

// "0324 358 73 75" biçimi
export function telefonGoster(t = '') {
  const d = t.replace(/\D/g, '');
  if (d.length !== 11) return t;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
}
