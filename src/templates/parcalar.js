import { htmlKacis as h } from '../lib/text.js';
import { KATEGORILER, GUNDEM, GENEL } from '../config.js';
import { ikon, katIkon } from './ikonlar.js';
import { saat, ilceAdi } from './layout.js';

const katAdi = (slug) => KATEGORILER.find((k) => k.slug === slug)?.ad || 'Gündem';

// Haberin görsel kimliği: Türkiye/dünya haberi gri-mavi, diğerleri kendi kategori rengi
export function katBilgi(hikaye) {
  if (hikaye.genel) return GENEL;
  return KATEGORILER.find((k) => k.slug === hikaye.kategori) || GUNDEM;
}
// Kapak çizimi: ilçenin simge silueti + kategori rengi (public/gorsel/*.svg, scripts/kapaklar.js)
const CIZIMLI = new Set(['akdeniz', 'yenisehir', 'mezitli', 'toroslar', 'tarsus', 'erdemli', 'silifke', 'anamur', 'bozyazi', 'aydincik', 'gulnar', 'mut', 'camliyayla']);
function kapakAdi(hikaye) {
  if (hikaye.genel) return 'genel';
  const ilce = hikaye.ilceler.find((s) => CIZIMLI.has(s));
  if (ilce) return ilce;
  const n = parseInt(String(hikaye.id).slice(0, 3), 36) % 3;
  return ['mersin', 'mersin2', 'mersin3'][n];
}
function kapak(hikaye, kat, link, sinif = '') {
  // Aynı ilçe tekrar edince sıkıcı olmasın: güneşin yeri habere göre değişir
  const v = parseInt(String(hikaye.id).slice(-2), 36) % 3;
  return `<a class="kapak kapak-v${v} ${sinif}" href="${h(link)}" rel="noopener nofollow" target="_blank" tabindex="-1" aria-hidden="true" style="--gorsel:url(/gorsel/${kapakAdi(hikaye)}.svg)"><span class="kapak-gunes"></span><span class="kapak-cizim"></span><span class="kapak-rozet">${(katIkon[kat.slug] || katIkon.gundem)(20)}</span></a>`;
}

const katKutusu = (kat, boyut = 26) => `<span class="kat-ikon" aria-hidden="true">${(katIkon[kat.slug] || katIkon.gundem)(boyut)}</span>`;

function kaynakMetni(hikaye) {
  const adlar = [...new Set(hikaye.kaynaklar.map((k) => k.ad))];
  return adlar.length > 3 ? `${adlar.slice(0, 3).join(', ')} +${adlar.length - 3}` : adlar.join(', ');
}

function ilceCipleri(hikaye) {
  const ilceler = hikaye.ilceler.length ? hikaye.ilceler : [];
  return [
    ...ilceler.slice(0, 2).map((s) => `<a class="cip" href="/ilce/${s}/">${h(ilceAdi(s))}</a>`),
    !ilceler.length && !hikaye.genel ? '<span class="cip">Mersin</span>' : '',
    `<span class="cip kat">${h(katBilgi(hikaye).ad)}</span>`,
  ].join('');
}

export function haberKarti(hikaye) {
  const ana = hikaye.kaynaklar[0];
  // Ek kaynak linkleri: ana kaynakla aynı siteyi tekrar gösterme
  const goruldu = new Set([ana.ad]);
  const digerleri = hikaye.kaynaklar.slice(1).filter((k) => !goruldu.has(k.ad) && goruldu.add(k.ad)).slice(0, 3);
  const kat = katBilgi(hikaye);
  return `<article class="haber" style="--kat:${kat.renk}">
${kapak(hikaye, kat, ana.link)}
<div class="icerik">
<div class="cipler">${ilceCipleri(hikaye)}<span class="zaman"><b>${saat(hikaye.ilkGorulme)}</b> · <span data-once="${hikaye.ilkGorulme}"></span></span></div>
<h3><a href="${h(ana.link)}" rel="noopener nofollow" target="_blank">${h(hikaye.baslik)}</a></h3>
${hikaye.ozet ? `<p>${h(hikaye.ozet)}</p>` : ''}
<span class="kaynak">Kaynak: <strong>${h(kaynakMetni(hikaye))}</strong> · <a href="${h(ana.link)}" rel="noopener nofollow" target="_blank">Haberin tamamı kaynağında →</a>${
    digerleri.length ? ` · Diğer kaynaklar: ${digerleri.map((k) => `<a href="${h(k.link)}" rel="noopener nofollow" target="_blank">${h(k.ad)}</a>`).join(', ')}` : ''
  }</span>
</div>
</article>`;
}

export function mansetKarti(hikaye) {
  const ana = hikaye.kaynaklar[0];
  const coklu = hikaye.kaynaklar.length > 1;
  const kat = katBilgi(hikaye);
  return `<article class="manset" style="--kat:${kat.renk}">
${kapak(hikaye, kat, ana.link, 'kapak-genis')}
<div class="cipler">${coklu ? '<span class="cip turuncu">● Gelişen olay</span>' : ''}${ilceCipleri(hikaye)}</div>
<h3><a href="${h(ana.link)}" rel="noopener nofollow" target="_blank">${h(hikaye.baslik)}</a></h3>
${hikaye.ozet ? `<p>${h(hikaye.ozet)}</p>` : ''}
<div class="manset-alt">
<span class="kaynak-sayi"><strong>${hikaye.kaynaklar.length} kaynak</strong> yazdı · ${h(kaynakMetni(hikaye))} · <span data-once="${hikaye.ilkGorulme}">${saat(hikaye.ilkGorulme)}</span></span>
<a class="hap" href="${h(ana.link)}" rel="noopener nofollow" target="_blank">Haberi oku<span class="daire">${ikon.ok(18)}</span></a>
</div>
</article>`;
}

export function haberListesi(hikayeler, bosMesaj = 'Şu an gösterilecek haber yok.') {
  return hikayeler.length ? hikayeler.map(haberKarti).join('\n') : `<div class="bos">${h(bosMesaj)}</div>`;
}

export const reklamAlani = (ad = 'yan') => `<div class="reklam" data-reklam="${ad}" aria-hidden="true">REKLAM</div>`;
