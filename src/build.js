// Siteyi data/ klasöründeki verilerden üretir ve dist/ klasörüne yazar.
import fs from 'node:fs';
import path from 'node:path';
import { SITE, ILCELER } from './config.js';
import { yukle, yayindakiler, VERI_KLASORU } from './lib/store.js';
import { ilceAdi, uyarilariAyarla } from './templates/layout.js';
import { depremUyarisi, okulUyarisi } from './lib/uyarilar.js';
import { okulSayfasi } from './templates/okul.js';
import * as S from './templates/sayfalar.js';
import * as IS from './templates/ilceServis.js';
import { ulasimSayfasi } from './templates/ulasim.js';
import { arsivAySayfasi } from './templates/arsiv.js';
import { arsivYukle } from './lib/arsiv.js';
import * as R from './templates/rehber.js';
import * as B from './templates/bilgi.js';
import { LIGLER } from './lib/spor.js';
import { baslikTemizle, kategoriBul, htmlKacis } from './lib/text.js';
import { kendiSayfasiVar, sayfasiVar, haberYolu, kapakAdresi } from './templates/parcalar.js';
import { okunanlarEsle } from './lib/okunanlar.js';

const DIST = path.resolve('dist');

function yaz(yol, icerik) {
  const dosya = yol.endsWith('/') ? path.join(DIST, yol, 'index.html') : path.join(DIST, yol);
  fs.mkdirSync(path.dirname(dosya), { recursive: true });
  fs.writeFileSync(dosya, icerik);
}

function servisYukle() {
  try {
    return JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'servisler.json'), 'utf8'));
  } catch {
    return {};
  }
}

export function insaEt({ simdi = Date.now() } = {}) {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  fs.cpSync(path.resolve('public'), DIST, { recursive: true });

  const veri = yukle();
  // Eski kayıtlarda kalan TAMAMI BÜYÜK başlıklar da düzelsin
  // Kategori kuralları güncellendiyse eski kayıtlar da yeni kurala göre renklensin
  const hikayeler = yayindakiler(veri).map((x) => {
    const k = kategoriBul(x.baslik);
    return { ...x, baslik: baslikTemizle(x.baslik), kategori: k !== 'gundem' ? k : x.kategori };
  });
  const servis = servisYukle();
  let bilgiYazilari = [];
  try {
    bilgiYazilari = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'bilgi.json'), 'utf8')).yazilar || [];
  } catch {}
  servis.bilgi = bilgiYazilari;
  let ozetArsiv = [];
  try {
    ozetArsiv = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'ozet.json'), 'utf8')).arsiv || [];
  } catch {}
  servis.ozet = ozetArsiv[0] || null;
  // Meteoroloji uyarısı haberi (MGM verisi alınamazsa yedek): son 18 saatte Mersin'i ilgilendiren uyarı haberi
  servis.meteoHaber = hikayeler.find(
    (x) =>
      simdi - new Date(x.ilkGorulme).getTime() < 18 * 36e5 &&
      /(sarı|turuncu|kırmızı) kod|meteoroloji.{0,40}uyar|uyarı.{0,20}(yağış|sağanak|fırtına|sel)|(kuvvetli|şiddetli) (yağış|sağanak|rüzgar|fırtına)/i.test(x.baslik) &&
      (!x.genel || /mersin|akdeniz|doğu akdeniz|çukurova/i.test(x.baslik))
  ) || null;
  // Elektrik kesintisi haberleri (Toroslar EDAŞ listesi sadece doğrulamalı adres sorgusuyla alınabiliyor)
  servis.elektrikHaber = hikayeler
    .filter((x) => !x.genel && simdi - new Date(x.ilkGorulme).getTime() < 48 * 36e5 && /elektrik(ler)? kesinti|elektrik(ler)?\s.{0,20}kesil|elektriksiz kal/i.test(x.baslik))
    .slice(0, 3)
    .map((x) => ({ baslik: x.baslik, yol: sayfasiVar(x) ? haberYolu(x) : x.kaynaklar[0].link, ilkGorulme: x.ilkGorulme }));
  // En sıcak haberler: Mersin'den en son gelen 5 haber, yeniden eskiye
  servis.enCokOkunan = hikayeler
    .filter((x) => !x.genel)
    .sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme))
    .slice(0, 5)
    .map((x) => ({ yol: sayfasiVar(x) ? haberYolu(x) : x.kaynaklar[0].link, baslik: x.baslik, gorsel: kapakAdresi(x).src, zaman: x.ilkGorulme }));

  // Okul tatili kararları (haber bağlantısı canlı listeden ya da arşivden)
  let okul = { kararlar: [] };
  try {
    okul = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'okul.json'), 'utf8'));
  } catch {}
  for (const k of okul.kararlar) {
    const x = hikayeler.find((y) => y.id === k.haberId);
    k.link = x ? (sayfasiVar(x) ? haberYolu(x) : x.kaynaklar[0].link) : arsivYukle().find((y) => y.id === k.haberId)?.yol || '/okullar-tatil-mi/';
  }
  // Site geneli uyarı bantları
  uyarilariAyarla([depremUyarisi(servis.deprem, simdi), okulUyarisi(okul.kararlar, simdi)].filter(Boolean));

  const sayfalar = [];
  const ekle = (yol, html, haritaya = true) => {
    yaz(yol, html);
    if (haritaya) sayfalar.push(yol);
  };

  ekle('/', S.anaSayfa({ hikayeler, servis, simdi }));
  ekle('/ilceler/', S.ilcelerSayfasi());
  // Kendi haber sayfaları (kurum duyurularından kendi cümlelerimizle yazılanlar)
  const kendiHaberler = hikayeler.filter(kendiSayfasiVar);
  for (const hikaye of hikayeler.filter(sayfasiVar)) {
    const ilgili = hikayeler.filter((x) => x.id !== hikaye.id && (!hikaye.ilceler.length || x.ilceler.some((i) => hikaye.ilceler.includes(i)))).slice(0, 6);
    yaz(haberYolu(hikaye), S.haberSayfasi({ hikaye, ilgili, servis }));
  }
  // Kalıcı arşiv: canlı listeden düşmüş kendi haberlerimizin sayfaları ve aylık arşiv listeleri
  const canliIdler = new Set(hikayeler.map((x) => x.id));
  const arsiv = arsivYukle().filter((x) => !canliIdler.has(x.id));
  for (const hikaye of arsiv) {
    const ilgili = hikayeler.filter((x) => !x.genel && (!hikaye.ilceler.length || x.ilceler.some((i) => hikaye.ilceler.includes(i)))).slice(0, 6);
    yaz(hikaye.yol, S.haberSayfasi({ hikaye, ilgili, servis }));
  }
  const tumKendi = [...kendiHaberler.map((x) => ({ ...x, yol: haberYolu(x) })), ...arsiv].sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme));
  const aylar = [...new Set(tumKendi.map((x) => new Date(x.ilkGorulme).toLocaleDateString('sv-SE', { timeZone: SITE.timezone }).slice(0, 7)))];
  for (const ay of aylar) {
    const liste = tumKendi.filter((x) => new Date(x.ilkGorulme).toLocaleDateString('sv-SE', { timeZone: SITE.timezone }).startsWith(ay));
    ekle(`/arsiv/${ay}/`, arsivAySayfasi({ ay, hikayeler: liste, aylar, servis }));
  }
  if (aylar.length) yaz('/arsiv/index.html', `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/arsiv/${aylar[0]}/"><link rel="canonical" href="${SITE.url}/arsiv/${aylar[0]}/">`);
  servis.arsivSayisi = arsiv.length;
  for (const ilce of ILCELER) ekle(`/ilce/${ilce.slug}/`, S.ilceSayfasi({ ilce, hikayeler, servis, simdi }));
  ekle('/hava-durumu/', S.havaSayfasi({ servis }));
  ekle('/deprem/', S.depremSayfasi({ servis }));
  ekle('/nobetci-eczane/', S.eczaneSayfasi({ servis }));
  ekle('/kesintiler/', S.kesintiSayfasi({ servis }));
  ekle('/trafik/', S.trafikSayfasi({ servis }));
  ekle('/ulasim/', ulasimSayfasi({ servis, simdi }));
  ekle('/okullar-tatil-mi/', okulSayfasi({ okul, servis, simdi }));
  if (ozetArsiv.length) {
    ekle('/gunun-ozeti/', S.ozetSayfasi({ ozet: ozetArsiv[0], arsiv: ozetArsiv, hikayeler, servis, son: true }));
    for (const o of ozetArsiv) ekle(`/gunun-ozeti/${o.tarih}/`, S.ozetSayfasi({ ozet: o, arsiv: ozetArsiv, hikayeler, servis }));
  }
  for (const lig of LIGLER) if (servis.spor?.ligler?.[lig.kod]) ekle(`/spor/${lig.kod}/`, S.ligSayfasi({ servis, kod: lig.kod }));
  ekle('/piyasalar/', S.piyasaSayfasi({ servis }));
  ekle('/spor/', S.sporSayfasi({ servis, hikayeler }));
  ekle('/etkinlikler/', S.etkinlikSayfasi({ servis, simdi }));
  ekle('/burclar/', S.burcSayfasi({ servis }));
  ekle('/rehber/', R.rehberSayfasi({ servis }));
  ekle('/rehber/gezilecek-yerler/', R.gezilecekSayfasi({ servis }));
  ekle('/rehber/acil-telefonlar/', R.acilSayfasi({ servis }));
  ekle('/rehber/hastaneler/', R.hastaneSayfasi({ servis }));
  ekle('/tatil-takvimi/', R.tatilSayfasi({ servis, simdi }));
  // Merak edilenler
  ekle('/bilgi/', B.bilgiListeSayfasi({ yazilar: bilgiYazilari, servis }));
  for (const yazi of bilgiYazilari) ekle(B.bilgiYolu(yazi), B.bilgiSayfasi({ yazi, yazilar: bilgiYazilari, servis }));
  for (const kategori of S.KATEGORI_SAYFALARI) ekle(`/kategori/${kategori.slug}/`, S.kategoriSayfasi({ kategori, hikayeler, servis }));
  ekle('/namaz-vakitleri/', S.namazSayfasi({ servis, simdi }));
  for (const ilce of ILCELER) ekle(`/namaz-vakitleri/${ilce.slug}/`, S.namazIlceSayfasi({ ilce, servis, simdi }));
  ekle('/akaryakit-fiyatlari/', S.akaryakitSayfasi({ servis }));
  // İlçe bazlı servis sayfaları (Tarsus nöbetçi eczane, Erdemli hava durumu ...)
  for (const ilce of ILCELER) {
    ekle(`/nobetci-eczane/${ilce.slug}/`, IS.eczaneIlceSayfasi({ ilce, servis, simdi }));
    ekle(`/hava-durumu/${ilce.slug}/`, IS.havaIlceSayfasi({ ilce, servis, simdi }));
    ekle(`/kesintiler/${ilce.slug}/`, IS.kesintiIlceSayfasi({ ilce, servis, simdi }));
    ekle(`/akaryakit-fiyatlari/${ilce.slug}/`, IS.akaryakitIlceSayfasi({ ilce, servis, simdi }));
  }
  for (const { yol, html } of S.bilgiSayfalari()) ekle(yol, html);
  ekle('/menu/', S.menuSayfasi(), false);
  ekle('/ara/', S.araSayfasi(), false);
  yaz('/404.html', S.bulunamadiSayfasi());

  // Arama dizini (son 7 gün, sadece yayındaki haberler)
  yaz(
    '/arama.json',
    JSON.stringify(
      hikayeler.map((h) => ({
        b: h.baslik,
        l: h.kaynaklar[0].link,
        k: [...new Set(h.kaynaklar.map((k) => k.ad))].join(', '),
        i: h.ilceler.map(ilceAdi).join(', '),
        t: h.ilkGorulme,
      }))
    )
  );

  const bugun = new Date(simdi).toISOString().slice(0, 10);
  const haberUrlleri = tumKendi.map((x) => `<url><loc>${SITE.url}${x.yol}</loc><lastmod>${(x.sonGuncelleme || x.ilkGorulme).slice(0, 10)}</lastmod></url>`);
  yaz(
    '/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
      ...sayfalar.map((y) => `<url><loc>${SITE.url}${y}</loc><lastmod>${bugun}</lastmod></url>`),
      ...haberUrlleri,
    ].join('\n')}\n</urlset>\n`
  );
  // Google Haberler site haritası: son 48 saatte yayımlanan kendi haberlerimiz
  const son48 = kendiHaberler.filter((x) => simdi - new Date(x.ilkGorulme).getTime() < 48 * 3600e3);
  yaz(
    '/haber-sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${son48
      .map((x) => `<url><loc>${SITE.url}${haberYolu(x)}</loc><news:news><news:publication><news:name>${htmlKacis(SITE.name)}</news:name><news:language>tr</news:language></news:publication><news:publication_date>${x.ilkGorulme}</news:publication_date><news:title>${htmlKacis(x.baslik)}</news:title></news:news></url>`)
      .join('\n')}\n</urlset>\n`
  );
  // RSS: tüm yayındaki haberler (kendi sayfası olanlar kendi adresiyle, diğerleri kaynağıyla)
  const rssOgeleri = hikayeler.slice(0, 50).map((x) => {
    const link = sayfasiVar(x) ? SITE.url + haberYolu(x) : x.kaynaklar[0].link;
    return `<item><title>${htmlKacis(x.baslik)}</title><link>${htmlKacis(link)}</link><guid isPermaLink="false">${x.id}</guid><pubDate>${new Date(x.ilkGorulme).toUTCString()}</pubDate>${x.ozet ? `<description>${htmlKacis(x.ozet)}</description>` : ''}<source url="${htmlKacis(x.kaynaklar[0].link)}">${htmlKacis(x.kaynaklar[0].ad)}</source></item>`;
  });
  yaz(
    '/rss.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${htmlKacis(SITE.name)}</title><link>${SITE.url}/</link><description>${htmlKacis(SITE.description)}</description><language>tr</language>\n${rssOgeleri.join('\n')}\n</channel></rss>\n`
  );
  // Canlı yenileme için son haberler listesi (sayfa açıkken 2 dakikada bir okunur)
  yaz('/son.json', JSON.stringify(hikayeler.filter((x) => !x.genel).sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme)).slice(0, 20).map((x) => ({ id: x.id, b: x.baslik, z: x.ilkGorulme }))));
  yaz('/robots.txt', `User-agent: *\nAllow: /\nDisallow: /ara/\nDisallow: /menu/\n\nSitemap: ${SITE.url}/sitemap.xml\nSitemap: ${SITE.url}/haber-sitemap.xml\n`);
  // Cloudflare Pages: önbellek ayarları
  yaz(
    '/_headers',
    `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n/style.css\n  Cache-Control: public, max-age=31536000, immutable\n/app.js\n  Cache-Control: public, max-age=31536000, immutable\n`
  );

  return { sayfaSayisi: sayfalar.length + 3, haberSayisi: hikayeler.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = insaEt();
  console.log(`Site üretildi: ${r.sayfaSayisi} sayfa, ${r.haberSayisi} haber → dist/`);
}
