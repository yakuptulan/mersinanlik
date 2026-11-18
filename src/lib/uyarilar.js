// Site geneli uyarı bantlarının kararı (build sırasında)
import { SITE } from '../config.js';

const MERSIN = { lat: 36.8, lon: 34.63 };
export function mesafeKm(a, b) {
  const r = (x) => (x * Math.PI) / 180;
  const d1 = r(b.lat - a.lat);
  const d2 = r(b.lon - a.lon);
  const x = Math.sin(d1 / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(d2 / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
}

const saatMetni = (iso) => new Date(iso).toLocaleTimeString('tr-TR', { timeZone: SITE.timezone, hour: '2-digit', minute: '2-digit' });

// Mersin'e 150 km içinde 4 ve üzeri deprem: 4–4.9 için 3 saat, 5+ için 8 saat bant
export function depremUyarisi(depremler = [], simdi = Date.now()) {
  const adaylar = depremler
    .filter((d) => d.buyukluk >= 4)
    .filter((d) => (d.lat && d.lon ? mesafeKm(MERSIN, d) <= 150 : d.il === 'Mersin'))
    .map((d) => ({ ...d, bitis: new Date(d.tarih).getTime() + (d.buyukluk >= 5 ? 8 : 3) * 36e5 }))
    .filter((d) => d.bitis > simdi)
    .sort((a, b) => b.buyukluk - a.buyukluk);
  const d = adaylar[0];
  if (!d) return null;
  const yer = d.ilce && d.il ? `${d.il} ${d.ilce}` : d.yer;
  return {
    tur: 'deprem',
    ikon: '⚠️',
    baslik: `Deprem: ${yer}, ${d.buyukluk.toFixed(1)} büyüklüğünde`,
    metin: `Saat ${saatMetni(d.tarih)} · derinlik ${Math.round(d.derinlik)} km · AFAD verisi · ayrıntılar ve son depremler`,
    link: '/deprem/',
    bitis: d.bitis,
  };
}
