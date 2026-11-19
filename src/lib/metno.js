// MET Norway (yr.no) locationforecast yanıtını özetler: şu an, saatlik (24 saat) ve günlük tahmin.
import { sembolMetni } from './sembol.js';

const TZ = 'Europe/Istanbul';
const gunu = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: TZ });
const saati = (d) => Number(new Date(d).toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));

export function metnoOzet(j, gunSayisi = 7) {
  const seri = j.properties.timeseries;
  const s0 = seri[0];
  const gunler = {};
  for (const s of seri) {
    const gun = gunu(s.time);
    const t = s.data.instant.details.air_temperature;
    const g = (gunler[gun] ??= { min: t, max: t, yagis: 0, sembol: null, yedek: null, ruzgar: 0 });
    g.min = Math.min(g.min, t);
    g.max = Math.max(g.max, t);
    g.ruzgar = Math.max(g.ruzgar, s.data.instant.details.wind_speed || 0);
    const kod = s.data.next_6_hours?.summary.symbol_code || s.data.next_1_hours?.summary.symbol_code;
    const sa = saati(s.time);
    if (sa >= 11 && sa <= 14 && kod) g.sembol = kod;
    if (!g.yedek && kod) g.yedek = kod;
    if (s.data.next_1_hours) g.yagis += s.data.next_1_hours.details?.precipitation_amount || 0;
    else if (s.data.next_6_hours && sa % 6 === 0) g.yagis += s.data.next_6_hours.details?.precipitation_amount || 0;
  }
  const saatlik = seri
    .filter((s) => s.data.next_1_hours && new Date(s.time) - new Date(s0.time) < 24 * 3600e3)
    .filter((_, i) => i % 3 === 0)
    .map((s) => ({ saat: saati(s.time), sicaklik: Math.round(s.data.instant.details.air_temperature), durum: sembolMetni(s.data.next_1_hours.summary.symbol_code) }));
  const d = s0.data.instant.details;
  return {
    sicaklik: Math.round(d.air_temperature),
    durum: sembolMetni(s0.data.next_1_hours?.summary.symbol_code || s0.data.next_6_hours?.summary.symbol_code),
    nem: Math.round(d.relative_humidity ?? 0),
    ruzgar: Math.round((d.wind_speed || 0) * 3.6),
    saatlik,
    gunler: Object.entries(gunler).slice(0, gunSayisi).map(([tarih, g]) => ({ tarih, min: Math.round(g.min), max: Math.round(g.max), yagis: Math.round(g.yagis * 10) / 10, ruzgar: Math.round(g.ruzgar * 3.6), durum: sembolMetni(g.sembol || g.yedek) })),
  };
}
