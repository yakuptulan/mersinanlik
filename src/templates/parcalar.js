import fs from 'node:fs';
import { htmlKacis as h, slugify } from '../lib/text.js';
import { FOTOLAR } from '../fotolar.js';
import { KATEGORILER, GUNDEM, GENEL } from '../config.js';
import { ikon, katIkon } from './ikonlar.js';
import { saat, ilceAdi } from './layout.js';

// Kendi yazımız olan hikâyeler (aramaya açık, site haritasında)
export const kendiSayfasiVar = (hikaye) => Boolean(hikaye.metin);
// Her haberin sitede bir sayfası var. Yazımız henüz hazır değilse sayfa kısa haber olarak açılır,
// ayrıntılar için kaynağa bağlantı verir (arama motorlarına kapalı tutulur).
export const sayfasiVar = () => true;
export const haberYolu = (hikaye) => `/haber/${slugify(hikaye.baslik).slice(0, 70).replace(/-+$/, '')}-${hikaye.id}/`;
// Kart bağlantısı: kendi sayfası varsa oraya, yoksa kaynağa
function baglanti(hikaye) {
  return sayfasiVar(hikaye)
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
  const kat = katBilgi(hikaye);
  const b = baglanti(hikaye);
  return `<article class="haber" style="--kat:${kat.renk}">
${kapak(hikaye, kat, b.href, '', b.dis)}
<div class="icerik">
<div class="cipler">${ilceCipleri(hikaye)}<span class="zaman"><b>${saat(hikaye.ilkGorulme)}</b> · <span data-once="${hikaye.ilkGorulme}"></span></span></div>
<h3><a href="${h(b.href)}"${b.dis}>${h(hikaye.baslik)}</a></h3>
${hikaye.ozet ? `<p>${h(hikaye.ozet)}</p>` : ''}
</div>
</article>`;
}

export function mansetKarti(hikaye) {
  const coklu = hikaye.kaynaklar.length > 1;
  const kat = katBilgi(hikaye);
  const b = baglanti(hikaye);
  return `<article class="manset" style="--kat:${kat.renk}">
${kapak(hikaye, kat, b.href, 'kapak-genis', b.dis)}
<div class="cipler">${coklu ? '<span class="cip turuncu">● Gelişen olay</span>' : ''}${ilceCipleri(hikaye)}</div>
<h3><a href="${h(b.href)}"${b.dis}>${h(hikaye.baslik)}</a></h3>
${hikaye.ozet ? `<p>${h(hikaye.ozet)}</p>` : ''}
<div class="manset-alt">
<span class="kaynak-sayi"><strong>${saat(hikaye.ilkGorulme)}</strong> · <span data-once="${hikaye.ilkGorulme}"></span></span>
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

// Google'da "tercih edilen kaynak" yapma bağlantısı (Google'ın resmî bağlantı biçimi)
export const googleKaynak = () => `<a class="google-kaynak" href="https://www.google.com/preferences/source?q=mersinanlik.com" rel="noopener" target="_blank"><span class="g-harf" aria-hidden="true">G</span><span><b>Google'da Mersin Anlık'ı tercih edilen kaynağın yap</b><small>Haberlerimiz Google aramalarında sana daha çok çıksın</small></span></a>`;

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
</div>
${googleKaynak()}`;
}

// Haberin kapak görselinin adresi (manşet kaydırıcısı için)
export function kapakAdresi(hikaye) {
  if (hikaye.kapak && fs.existsSync(new URL(`../../public/kapak/${hikaye.kapak}.webp`, import.meta.url))) return { src: `/kapak/${hikaye.kapak}.webp`, kurum: null, kapak: true };
  if (hikaye.gorsel && fs.existsSync(new URL(`../../public/uretilen/${hikaye.gorsel}`, import.meta.url))) return { src: `/uretilen/${hikaye.gorsel}`, kurum: hikaye.gorselKaynak && hikaye.gorselKaynak !== 'yz' ? hikaye.gorselKaynak : null };
  const foto = fotoSec(hikaye);
  if (foto) return { src: `/foto/${foto.id}-800.webp`, kurum: null };
  return { src: `/gorsel/${kapakAdi(hikaye)}.svg`, kurum: null, cizim: true };
}

// Manşet: en önemli 10 haber, birkaç saniyede bir değişir
export function mansetKaydirici(hikayeler) {
  if (!hikayeler.length) return '<div class="bos">Haberler toplanıyor…</div>';
  return `<section class="manset-kaydirici" data-kaydirici aria-roledescription="carousel" aria-label="Manşet haberleri">
<div class="mk-sahne">
${hikayeler
  .map((x, i) => {
    const kat = katBilgi(x);
    const b = baglanti(x);
    const g = kapakAdresi(x);
    const yer = x.ilceler.length ? ilceAdi(x.ilceler[0]) : x.genel ? '' : 'Mersin';
    return `<article class="mk-slayt${i ? '' : ' aktif'}" data-slayt aria-roledescription="slide" aria-label="${i + 1} / ${hikayeler.length}"${i ? ' aria-hidden="true"' : ''} style="--kat:${kat.renk}">
<a class="mk-link" href="${h(b.href)}"${b.dis}${i ? ' tabindex="-1"' : ''}>
<img class="mk-gorsel${g.cizim ? ' cizim' : ''}" src="${h(g.src)}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" width="800" height="450">
<span class="mk-golge"></span>
<span class="mk-ic"><span class="mk-cipler"><span class="mk-kat">${(katIkon[kat.slug] || katIkon.gundem)(16)} ${h(kat.ad)}</span>${yer ? `<span class="mk-yer">${h(yer)}</span>` : ''}</span>
<h3>${h(x.baslik)}</h3></span>
</a>${g.kurum ? `<span class="mk-kunye">Foto: ${h(g.kurum)}</span>` : ''}
</article>`;
  })
  .join('\n')}
<button class="mk-ok mk-geri" type="button" data-kaydir="-1" aria-label="Önceki haber">${ikon.ok(20)}</button>
<button class="mk-ok mk-ileri" type="button" data-kaydir="1" aria-label="Sonraki haber">${ikon.ok(20)}</button>
<span class="mk-ilerleme" aria-hidden="true"><span data-ilerleme></span></span>
</div>
<div class="mk-noktalar" role="tablist">${hikayeler.map((_, i) => `<button type="button" data-git="${i}" aria-label="${i + 1}. manşet"${i ? '' : ' aria-current="true"'}>${i + 1}</button>`).join('')}</div>
</section>`;
}

// Bölümler: kategori kısa kartları (son 24 saatteki haber sayısı ve son başlık)
export function bolumKartlari(bolumler) {
  return `<div class="bolum-kartlar">${bolumler
    .map((b, i) => `<a class="bolum-kart" href="${h(b.href)}" style="--kat:${b.renk};--sira:${i}">
<span class="bk-ikon">${(katIkon[b.ikon] || katIkon.gundem)(22)}</span>
<span class="bk-ad">${h(b.ad)}</span>
<span class="bk-sayi">${b.sayi} haber</span>
${b.son ? `<span class="bk-son">${h(b.son)}</span>` : ''}
</a>`)
    .join('')}</div>`;
}

// Görselin üstüne yazılı kare kart (Kaçırmayın bölümü)
export function kareKart(x, buyuk = false) {
  const kat = katBilgi(x);
  const b = baglanti(x);
  const g = kapakAdresi(x);
  return `<a class="kare-kart${buyuk ? ' buyuk' : ''}" href="${h(b.href)}"${b.dis} style="--kat:${kat.renk}">
<img class="${g.cizim ? 'cizim' : ''}" src="${h(g.src)}" alt="" loading="lazy" decoding="async" width="800" height="450">
<span class="kk-golge"></span>
<span class="kk-rozet">${h(kat.ad)}</span>
<span class="kk-ic"><b>${h(x.baslik)}</b><small><span data-once="${x.ilkGorulme}">${saat(x.ilkGorulme)}</span></small></span>
</a>`;
}

// Küçük yatay kart: küçük görsel + başlık (üst şerit)
export function kisaKart(x) {
  const kat = katBilgi(x);
  const b = baglanti(x);
  const g = kapakAdresi(x);
  return `<a class="kisa-kart" href="${h(b.href)}"${b.dis} style="--kat:${kat.renk}">
<img class="${g.cizim ? 'cizim' : ''}" src="${h(g.src)}" alt="" loading="lazy" decoding="async" width="160" height="120">
<span><b>${h(x.baslik)}</b><small><i>${h(kat.ad)}</i> · <span data-once="${x.ilkGorulme}">${saat(x.ilkGorulme)}</span></small></span>
</a>`;
}
