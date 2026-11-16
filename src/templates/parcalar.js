import { htmlKacis as h } from '../lib/text.js';
import { KATEGORILER } from '../config.js';
import { ikon } from './ikonlar.js';
import { saat, ilceAdi } from './layout.js';

const katAdi = (slug) => KATEGORILER.find((k) => k.slug === slug)?.ad || 'Gündem';

function kaynakMetni(hikaye) {
  const adlar = [...new Set(hikaye.kaynaklar.map((k) => k.ad))];
  return adlar.length > 3 ? `${adlar.slice(0, 3).join(', ')} +${adlar.length - 3}` : adlar.join(', ');
}

function ilceCipleri(hikaye) {
  const ilceler = hikaye.ilceler.length ? hikaye.ilceler : [];
  return [
    ...ilceler.slice(0, 2).map((s) => `<a class="cip" href="/ilce/${s}/">${h(ilceAdi(s))}</a>`),
    !ilceler.length ? '<span class="cip">Mersin</span>' : '',
    `<span class="cip gri">${h(katAdi(hikaye.kategori))}</span>`,
  ].join('');
}

export function haberKarti(hikaye) {
  const ana = hikaye.kaynaklar[0];
  const digerleri = hikaye.kaynaklar.slice(1, 4);
  return `<article class="haber">
<div class="saat"><b>${saat(hikaye.ilkGorulme)}</b><span data-once="${hikaye.ilkGorulme}"></span></div>
<div class="icerik">
<div class="cipler">${ilceCipleri(hikaye)}</div>
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
  return `<article class="manset">
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
