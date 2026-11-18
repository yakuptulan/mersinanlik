import fs from 'node:fs';
import crypto from 'node:crypto';
import { SITE, ILCELER } from '../config.js';
import { htmlKacis as h } from '../lib/text.js';
import { ikon, logoIsaret } from './ikonlar.js';
import { temaBul, temaSahnesi } from './temalar.js';

// CSS/JS değişince tarayıcı eski dosyayı kullanmasın diye adrese içerik özeti eklenir
const surum = (dosya) => {
  try {
    return crypto.createHash('md5').update(fs.readFileSync(new URL(`../../public/${dosya}`, import.meta.url))).digest('hex').slice(0, 8);
  } catch {
    return '1';
  }
};
const CSS_SURUM = surum('style.css');
const JS_SURUM = surum('app.js');

const MENU = [
  ['/', 'Gündem'],
  ['/kategori/asayis/', 'Asayiş'],
  ['/kategori/belediye/', 'Belediye'],
  ['/kategori/ekonomi/', 'Ekonomi'],
  ['/kategori/yasam/', 'Yaşam'],
  ['/spor/', 'Spor'],
  ['/kategori/turkiye-dunya/', 'Dünya'],
  ['/bilgi/', 'Merak edilenler'],
  ['/piyasalar/', 'Piyasalar'],
];

export function saat(iso) {
  return new Date(iso).toLocaleTimeString('tr-TR', { timeZone: SITE.timezone, hour: '2-digit', minute: '2-digit' });
}

export function tarihUzun(iso) {
  return new Date(iso).toLocaleDateString('tr-TR', { timeZone: SITE.timezone, day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
}

export function ilceAdi(slug) {
  return ILCELER.find((i) => i.slug === slug)?.ad || slug;
}

// Hangi menü düğmesi seçili görünsün (alt sayfalar ve haberler de kendi bölümünü işaretler)
function menuAktif(aktif) {
  if (MENU.some(([u]) => u === aktif)) return aktif;
  if (!aktif) return null;
  const k = aktif.match(/^\/kategori\/([a-z-]+)\//)?.[1];
  if (k) {
    if (['kultur', 'saglik', 'egitim', 'tarim', 'hava'].includes(k)) return '/kategori/yasam/';
    if (['genel', 'turkiye-dunya'].includes(k)) return '/kategori/turkiye-dunya/';
    if (['gundem', 'kaza', 'ulasim', 'siyaset', 'tum-haberler'].includes(k)) return '/';
  }
  return MENU.find(([u]) => u !== '/' && aktif.startsWith(u))?.[0] || null;
}

function ustSatir(aktif) {
  aktif = menuAktif(aktif);
  return `<div class="ust-satir">
<a class="logo" href="/" aria-label="${SITE.name} ana sayfa"><img src="/logo.webp" width="96" height="64" alt="${SITE.name}"></a>
<nav class="menu" aria-label="Ana menü">${MENU.map(([u, ad]) => `<a href="${u}"${u === aktif ? ' aria-current="page"' : ''}>${ad}</a>`).join('')}</nav>
<span class="ust-dugmeler"><a class="ara-dugme" href="/ara/" aria-label="Sitede ara">${ikon.ara(22)}</a></span>
</div>`;
}

const ILCE_ADLARI = Object.fromEntries(ILCELER.map((i) => [i.slug, i.ad]));
const guvenliJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

const KURULUS = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: SITE.name,
  url: SITE.url + '/',
  logo: { '@type': 'ImageObject', url: SITE.url + '/logo-kare.png', width: 512, height: 512 },
  email: SITE.email,
  areaServed: 'Mersin',
  publishingPrinciples: SITE.url + '/yayin-ilkeleri/',
};

// Site geneli uyarı bantları (deprem, okul tatili). build.js her üretimde ayarlar.
// bitis geçince sayfa açıkken de kendiliğinden gizlenir.
let UYARILAR = [];
export function uyarilariAyarla(liste = []) {
  UYARILAR = liste;
}
function uyariBantlari() {
  if (!UYARILAR.length) return '';
  return UYARILAR.map(
    (u) => `<a class="uyari-bandi ${u.tur}" href="${u.link}" data-bitis="${u.bitis}"><span class="kap"><span class="uyari-ikon" aria-hidden="true">${u.ikon}</span><span class="uyari-metin"><strong>${h(u.baslik)}</strong> ${h(u.metin)}</span><span class="uyari-ok" aria-hidden="true">→</span></span></a>`
  ).join('') + '<script>document.querySelectorAll(".uyari-bandi[data-bitis]").forEach(function(b){if(Date.now()>+b.dataset.bitis)b.remove()})</script>';
}

export function sayfa({ baslik, aciklama = SITE.description, yol = '/', aktif = yol, ust = '', icerik, noindex = false, jsonLd = null, hava = null, ekVeri = null, gorsel = null, tur = 'website', tema = undefined }) {
  const t = temaSahnesi(tema === undefined ? temaBul(yol) : tema);
  const tamBaslik = baslik ? `${baslik} | ${SITE.name}` : `${SITE.name} – Mersin son dakika haberleri`;
  const kanonik = SITE.url + yol;
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<script>document.documentElement.classList.add("js")</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(tamBaslik)}</title>
<meta name="description" content="${h(aciklama)}">
<link rel="canonical" href="${kanonik}">
${noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">'}
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${h(tamBaslik)}">
<meta property="og:description" content="${h(aciklama)}">
<meta property="og:url" content="${kanonik}">
<meta property="og:locale" content="${SITE.locale}">
<meta property="og:type" content="${tur}">
${gorsel ? `<meta property="og:image" content="${h(gorsel)}">` : `<meta property="og:image" content="${SITE.url}/paylasim.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">`}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0A1530">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-48.png" type="image/png" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">

<link rel="alternate" type="application/rss+xml" title="${SITE.name}" href="/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css?v=${CSS_SURUM}">
<script type="application/ld+json">${guvenliJson(KURULUS)}</script>
${jsonLd ? `<script type="application/ld+json">${guvenliJson(jsonLd)}</script>` : ''}
</head>
<body>
${uyariBantlari()}
<header class="ust${ust ? '' : ' kisa'}${t.sinif}"${t.stil}>
${t.sahne}${yol === '/' ? '<div class="kure-sahne" aria-hidden="true"><img src="/kure.svg" alt="" width="640" height="640" fetchpriority="low"></div>' : ''}
<div class="kap">
${ustSatir(aktif)}
${ust}
</div>
</header>
${icerik}
<footer class="alt-bilgi">
<div class="kap">
<div style="max-width:460px">
<a class="logo" href="/"><img src="/logo.webp" width="84" height="56" alt="${SITE.name}" loading="lazy"></a>
<p>${h(SITE.slogan)}</p>
<p><small>Haberler kaynak gösterilerek derlenir; haberin tamamı her zaman kaynağında okunabilir. Kaynağı yazılmayan görseller temsilidir ve bir kısmı yapay zekâ ile üretilmiştir (<a href="/gorsel-kaynaklari/" style="color:inherit">ayrıntılar</a>).</small></p>
</div>
<nav class="alt-menu" aria-label="Alt menü">
<a href="/gundemim/">Benim Gündemim</a><a href="/nobetci-eczane/">Nöbetçi eczane</a><a href="/kesintiler/">Kesintiler</a><a href="/hava-durumu/">Hava durumu</a><a href="/deprem/">Deprem</a><a href="/trafik/">Trafik haritası</a><a href="/ilceler/">İlçeler</a><a href="/bilgi/">Merak edilenler</a><a href="/rehber/">Mersin rehberi</a><a href="/etkinlikler/">Etkinlikler</a><a href="/spor/">Spor</a><a href="/burclar/">Burçlar</a><a href="/tatil-takvimi/">Tatil takvimi</a><a href="/piyasalar/">Altın ve döviz</a><a href="/namaz-vakitleri/">Namaz vakitleri</a><a href="/akaryakit-fiyatlari/">Akaryakıt</a>
<a href="/kunye/">Künye</a><a href="/iletisim/">İletişim</a><a href="/kaynaklarimiz/">Kaynaklarımız</a><a href="/arsiv/">Haber arşivi</a>
<a href="/yayin-ilkeleri/">Yayın ilkeleri</a><a href="/gizlilik/">Gizlilik</a><a href="/cerez-politikasi/">Çerez politikası</a><a href="/gorsel-kaynaklari/">Görsel kaynakları</a>
</nav>
</div>
</footer>
<nav class="mobil-menu" aria-label="Alt gezinme">
<a href="/"${aktif === '/' ? ' aria-current="page"' : ''}>${ikon.ev(26)}Ana sayfa</a>
<a href="/ilceler/" data-ilcem>${ikon.konum(26)}İlçem</a>
<a href="/nobetci-eczane/"${aktif === '/nobetci-eczane/' ? ' aria-current="page"' : ''}>${ikon.eczane(26)}Eczane</a>
<a href="/kesintiler/"${aktif === '/kesintiler/' ? ' aria-current="page"' : ''}>${ikon.damla(26)}Kesinti</a>
<a href="/menu/">${ikon.menu(26)}Menü</a>
</nav>
<script>window.__ILCE_ADLARI__=${guvenliJson(ILCE_ADLARI)};${hava ? `window.__HAVA__=${guvenliJson(hava)};` : ''}${ekVeri ? Object.entries(ekVeri).map(([k, v]) => `window.${k}=${guvenliJson(v)};`).join('') : ''}</script>
<script src="/app.js?v=${JS_SURUM}" defer></script>
</body>
</html>`;
}
