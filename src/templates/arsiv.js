// Haber arşivi sayfaları: /arsiv/ (aylar) ve /arsiv/2026-11/ (o ayın haberleri, güne göre)
import { SITE } from '../config.js';
import { htmlKacis as h } from '../lib/text.js';
import { sayfa, saat } from './layout.js';
import { yanKutular } from './sayfalar.js';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const ayAdi = (ay) => `${AYLAR[+ay.slice(5, 7) - 1]} ${ay.slice(0, 4)}`;
const gunAdi = (g) => new Date(`${g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: SITE.timezone });
const gunu = (x) => new Date(x.ilkGorulme).toLocaleDateString('sv-SE', { timeZone: SITE.timezone });

export function arsivAySayfasi({ ay, hikayeler, aylar, servis }) {
  const gunler = new Map();
  for (const x of hikayeler) {
    const g = gunu(x);
    if (!gunler.has(g)) gunler.set(g, []);
    gunler.get(g).push(x);
  }
  const govde = [...gunler]
    .map(([g, liste]) => `<section class="arsiv-gun"><h2>${h(gunAdi(g))}</h2><ul class="arsiv-liste">${liste
      .map((x) => `<li><a href="${x.yol}">${h(x.baslik)}</a><small>${saat(x.ilkGorulme)}</small></li>`)
      .join('')}</ul></section>`)
    .join('');
  const aySecici = `<div class="ilce-cipleri" style="margin-bottom:22px">${aylar.map((a) => `<a class="cip${a === ay ? ' aktif' : ''}" href="/arsiv/${a}/">${ayAdi(a)}</a>`).join('')}</div>`;
  return sayfa({
    baslik: `${ayAdi(ay)} Mersin haberleri arşivi`,
    aciklama: `Mersin Anlık'ta ${ayAdi(ay)} ayında yayımlanan ${hikayeler.length} haber, güne göre.`,
    yol: `/arsiv/${ay}/`,
    ust: `<div class="su-an-bas"><div><h1>Haber arşivi</h1><p style="margin-top:8px">${ayAdi(ay)} · ${hikayeler.length} haber</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">${aySecici}${govde || '<div class="bos">Bu ay için arşivde haber yok.</div>'}</div>${yanKutular(servis)}</main>`,
  });
}
