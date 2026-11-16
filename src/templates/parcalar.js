import fs from 'node:fs';
import { htmlKacis as h, slugify } from '../lib/text.js';
import { FOTOLAR } from '../fotolar.js';
import { KATEGORILER, GUNDEM, GENEL } from '../config.js';
import { ikon, katIkon } from './ikonlar.js';
import { saat, ilceAdi } from './layout.js';

// Kendi haber sayfası olan hikâyeler (kurum haberleri, kendi yazımızla)
export const kendiSayfasiVar = (hikaye) => Boolean(hikaye.metin);
export const haberYolu = (hikaye) => `/haber/${slugify(hikaye.baslik).slice(0, 70).replace(/-+$/, '')}-${hikaye.id}/`;
// Kart bağlantısı: kendi sayfası varsa oraya, yoksa kaynağa
function baglanti(hikaye) {
  return kendiSayfasiVar(hikaye)
    ? { href: haberYolu(hikaye), dis: '' }
    : { href: hikaye.kaynaklar[0].link, dis: ' rel="noopener nofollow" target="_blank"' };
}

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
// İndirilmiş fotoğraflar (public/foto). İnmeyen varsa o fotoğraf yerine çizim kullanılır.
const MEVCUT = FOTOLAR.filter((f) => fs.existsSync(new URL(`../../public/foto/${f.id}-400.webp`, import.meta.url)));
const havuz = (etiket) => MEVCUT.filter((f) => f.etiket === etiket);
// Bu konularda konunun fotoğrafı ilçe fotoğrafından daha anlatıcı
const KONU_ONCELIKLI = new Set(['spor', 'saglik', 'kaza', 'asayis', 'egitim', 'tarim', 'ekonomi', 'ulasim', 'hava', 'kultur', 'siyaset']);

function sayiOzeti(s) {
  let n = 0;
  for (const c of String(s)) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return n;
}

export function fotoSec(hikaye) {
  const kat = hikaye.genel ? 'genel' : hikaye.kategori;
  let liste = [];
  if (hikaye.genel) liste = KONU_ONCELIKLI.has(hikaye.kategori) ? havuz(hikaye.kategori) : [];
  if (!liste.length && KONU_ONCELIKLI.has(kat)) liste = havuz(kat);
  // Konunun fotoğrafı azsa (ör. siyasette tek fotoğraf) ilçe/Mersin fotoğraflarıyla karıştır ki tekrar etmesin
  if (liste.length < 3) {
    let yer = [];
    if (!hikaye.genel) for (const i of hikaye.ilceler) if ((yer = havuz(i)).length) break;
    if (!yer.length) yer = havuz(hikaye.genel ? 'genel' : 'mersin');
    liste = [...liste, ...yer];
  }
  if (!liste.length) return null;
  return liste[sayiOzeti(hikaye.id) % liste.length];
}

export function fotoKunye(f) {
  return `Foto: ${f.yazar} · ${f.lisans} · Wikimedia Commons`;
}

export function kapak(hikaye, kat, link, sinif = '', dis = ' rel="noopener nofollow" target="_blank"') {
  const buyukMu = sinif.includes('genis');
  // 1) Habere özel yapay zekâ görseli
  if (hikaye.gorsel && fs.existsSync(new URL(`../../public/uretilen/${hikaye.gorsel}`, import.meta.url))) {
    const kurum = hikaye.gorselKaynak && hikaye.gorselKaynak !== 'yz' ? hikaye.gorselKaynak : null;
    const etiket = kurum ? `Foto: ${h(kurum)}` : 'Temsili · YZ';
    return `<a class="kapak kapak-foto ${sinif}" href="${h(link)}"${dis} tabindex="-1" aria-hidden="true" title="${kurum ? `Fotoğraf: ${h(kurum)}` : 'Temsili görsel, yapay zekâ ile üretilmiştir'}">
<img src="/uretilen/${h(hikaye.gorsel)}" alt="${kurum ? '' : 'Temsili görsel (yapay zekâ ile üretildi)'}" loading="${buyukMu ? 'eager' : 'lazy'}" decoding="async" width="800" height="450">
<span class="kapak-rozet">${(katIkon[kat.slug] || katIkon.gundem)(buyukMu ? 26 : 20)}</span>${kurum ? `<span class="temsili kurum">${etiket}</span>` : ''}</a>`;
  }
  // 2) Kütüphaneden temsili fotoğraf
  const foto = fotoSec(hikaye);
  if (foto) {
    const buyuk = sinif.includes('genis');
    return `<a class="kapak kapak-foto ${sinif}" href="${h(link)}"${dis} tabindex="-1" aria-hidden="true" title="${h(fotoKunye(foto))}">
<img src="/foto/${foto.id}-${buyuk ? 800 : 400}.webp"${buyuk ? '' : ` srcset="/foto/${foto.id}-400.webp 400w, /foto/${foto.id}-800.webp 800w" sizes="(max-width: 900px) 104px, 176px"`} alt="" loading="${buyuk ? 'eager' : 'lazy'}" decoding="async" width="${buyuk ? 800 : 400}" height="${buyuk ? 500 : 300}">
<span class="kapak-rozet">${(katIkon[kat.slug] || katIkon.gundem)(buyuk ? 26 : 20)}</span>${buyuk ? `<span class="kunye">${h(fotoKunye(foto))}</span>` : ''}</a>`;
  }
  return kapakCizim(hikaye, kat, link, sinif, dis);
}

function kapakCizim(hikaye, kat, link, sinif = '', dis = ' rel="noopener nofollow" target="_blank"') {
  // Aynı ilçe tekrar edince sıkıcı olmasın: güneşin yeri habere göre değişir
  const v = parseInt(String(hikaye.id).slice(-2), 36) % 3;
  return `<a class="kapak kapak-v${v} ${sinif}" href="${h(link)}"${dis} tabindex="-1" aria-hidden="true" style="--gorsel:url(/gorsel/${kapakAdi(hikaye)}.svg)"><span class="kapak-gunes"></span><span class="kapak-cizim"></span><span class="kapak-rozet">${(katIkon[kat.slug] || katIkon.gundem)(20)}</span></a>`;
}

const katKutusu = (kat, boyut = 26) => `<span class="kat-ikon" aria-hidden="true">${(katIkon[kat.slug] || katIkon.gundem)(boyut)}</span>`;

function kaynakMetni(hikaye) {
  const adlar = [...new Set(hikaye.kaynaklar.map((k) => k.ad))];
  return adlar.length > 3 ? `${adlar.slice(0, 3).join(', ')} +${adlar.length - 3}` : adlar.join(', ');
}

export function ilceCipleri(hikaye) {
  const ilceler = hikaye.ilceler.length ? hikaye.ilceler : [];
  return [
    ...ilceler.slice(0, 2).map((s) => `<a class="cip" href="/ilce/${s}/">${h(ilceAdi(s))}</a>`),
    !ilceler.length && !hikaye.genel ? '<span class="cip">Mersin</span>' : '',
    `<a class="cip kat" href="/kategori/${katBilgi(hikaye).slug === 'genel' ? 'turkiye-dunya' : katBilgi(hikaye).slug}/">${h(katBilgi(hikaye).ad)}</a>`,
    hikaye.trend ? '<span class="cip trend" title="Google\'da bugün çok aranan konu">Çok aranan</span>' : '',
  ].join('');
}

export function haberKarti(hikaye) {
  const ana = hikaye.kaynaklar[0];
  // Ek kaynak linkleri: ana kaynakla aynı siteyi tekrar gösterme
  const goruldu = new Set([ana.ad]);
  const digerleri = hikaye.kaynaklar.slice(1).filter((k) => !goruldu.has(k.ad) && goruldu.add(k.ad)).slice(0, 3);
  const kat = katBilgi(hikaye);
  const b = baglanti(hikaye);
  return `<article class="haber" style="--kat:${kat.renk}">
${kapak(hikaye, kat, b.href, '', b.dis)}
<div class="icerik">
<div class="cipler">${ilceCipleri(hikaye)}<span class="zaman"><b>${saat(hikaye.ilkGorulme)}</b> · <span data-once="${hikaye.ilkGorulme}"></span></span></div>
<h3><a href="${h(b.href)}"${b.dis}>${h(hikaye.baslik)}</a></h3>
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
  const b = baglanti(hikaye);
  return `<article class="manset" style="--kat:${kat.renk}">
${kapak(hikaye, kat, b.href, 'kapak-genis', b.dis)}
<div class="cipler">${coklu ? '<span class="cip turuncu">● Gelişen olay</span>' : ''}${ilceCipleri(hikaye)}</div>
<h3><a href="${h(b.href)}"${b.dis}>${h(hikaye.baslik)}</a></h3>
${hikaye.ozet ? `<p>${h(hikaye.ozet)}</p>` : ''}
<div class="manset-alt">
<span class="kaynak-sayi"><strong>${hikaye.kaynaklar.length} kaynak</strong> yazdı · ${h(kaynakMetni(hikaye))} · <span data-once="${hikaye.ilkGorulme}">${saat(hikaye.ilkGorulme)}</span></span>
<a class="hap" href="${h(b.href)}"${b.dis}>Haberi oku<span class="daire">${ikon.ok(18)}</span></a>
</div>
</article>`;
}

// Izgara kartı: üstte görsel, altta başlık (ana sayfa kategori blokları)
export function kutuKarti(hikaye) {
  const kat = katBilgi(hikaye);
  const b = baglanti(hikaye);
  const yer = hikaye.ilceler.length ? ilceAdi(hikaye.ilceler[0]) : hikaye.genel ? '' : 'Mersin';
  return `<article class="kutu-haber" style="--kat:${kat.renk}">
${kapak(hikaye, kat, b.href, 'kapak-kutu', b.dis)}
<div class="kutu-haber-ic">
<span class="kutu-haber-ust">${yer ? `<b>${h(yer)}</b> · ` : ''}<span data-once="${hikaye.ilkGorulme}">${saat(hikaye.ilkGorulme)}</span></span>
<h3><a href="${h(b.href)}"${b.dis}>${h(hikaye.baslik)}</a></h3>
</div>
</article>`;
}

// Gündemdekiler: son 24 saatte en çok kaynağın yazdığı haberler, numaralı
export function gundemListesi(hikayeler) {
  return `<ol class="gundem-liste">${hikayeler
    .map((x, i) => {
      const b = baglanti(x);
      return `<li><span class="gundem-no">${i + 1}</span><span class="gundem-ic"><a href="${h(b.href)}"${b.dis}>${h(x.baslik)}</a><small>${new Set(x.kaynaklar.map((k) => k.ad)).size} kaynak · <span data-once="${x.ilkGorulme}">${saat(x.ilkGorulme)}</span></small></span></li>`;
    })
    .join('')}</ol>`;
}

export function haberListesi(hikayeler, bosMesaj = 'Şu an gösterilecek haber yok.') {
  return hikayeler.length ? hikayeler.map(haberKarti).join('\n') : `<div class="bos">${h(bosMesaj)}</div>`;
}

export const reklamAlani = (ad = 'yan') => `<div class="reklam" data-reklam="${ad}" aria-hidden="true">REKLAM</div>`;

// Paylaş düğmeleri (WhatsApp öncelikli; telefonda sistem paylaşımı da açılır)
export function paylasCubugu(url, baslik) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(baslik);
  return `<div class="paylas" data-paylas data-url="${h(url)}" data-baslik="${h(baslik)}">
<span class="paylas-baslik">Paylaş</span>
<a class="paylas-wa" href="https://wa.me/?text=${t}%20${u}" rel="noopener" target="_blank">WhatsApp</a>
<a href="https://x.com/intent/post?text=${t}&url=${u}" rel="noopener" target="_blank">X</a>
<a href="https://www.facebook.com/sharer/sharer.php?u=${u}" rel="noopener" target="_blank">Facebook</a>
<button type="button" data-kopyala>Linki kopyala</button>
</div>`;
}
