// Siteyi data/ klasöründeki verilerden üretir ve dist/ klasörüne yazar.
import fs from 'node:fs';
import path from 'node:path';
import { SITE, ILCELER } from './config.js';
import { yukle, yayindakiler, VERI_KLASORU } from './lib/store.js';
import { ilceAdi } from './templates/layout.js';
import * as S from './templates/sayfalar.js';
import * as R from './templates/rehber.js';
import { baslikTemizle, kategoriBul, htmlKacis } from './lib/text.js';
import { kendiSayfasiVar, haberYolu } from './templates/parcalar.js';

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

  const sayfalar = [];
  const ekle = (yol, html, haritaya = true) => {
    yaz(yol, html);
    if (haritaya) sayfalar.push(yol);
  };

  ekle('/', S.anaSayfa({ hikayeler, servis, simdi }));
  ekle('/ilceler/', S.ilcelerSayfasi());
  // Kendi haber sayfaları (kurum duyurularından kendi cümlelerimizle yazılanlar)
  const kendiHaberler = hikayeler.filter(kendiSayfasiVar);
  for (const hikaye of kendiHaberler) {
    const ilgili = hikayeler.filter((x) => x.id !== hikaye.id && (!hikaye.ilceler.length || x.ilceler.some((i) => hikaye.ilceler.includes(i)))).slice(0, 6);
    yaz(haberYolu(hikaye), S.haberSayfasi({ hikaye, ilgili, servis }));
  }
  for (const ilce of ILCELER) ekle(`/ilce/${ilce.slug}/`, S.ilceSayfasi({ ilce, hikayeler, servis, simdi }));
  ekle('/hava-durumu/', S.havaSayfasi({ servis }));
  ekle('/deprem/', S.depremSayfasi({ servis }));
  ekle('/nobetci-eczane/', S.eczaneSayfasi({ servis }));
  ekle('/kesintiler/', S.kesintiSayfasi({ servis }));
  ekle('/piyasalar/', S.piyasaSayfasi({ servis }));
  ekle('/spor/', S.sporSayfasi({ servis, hikayeler }));
  ekle('/etkinlikler/', S.etkinlikSayfasi({ servis, simdi }));
  ekle('/burclar/', S.burcSayfasi({ servis }));
  ekle('/rehber/', R.rehberSayfasi({ servis }));
  ekle('/rehber/gezilecek-yerler/', R.gezilecekSayfasi({ servis }));
  ekle('/rehber/acil-telefonlar/', R.acilSayfasi({ servis }));
  ekle('/rehber/hastaneler/', R.hastaneSayfasi({ servis }));
  for (const kategori of S.KATEGORI_SAYFALARI) ekle(`/kategori/${kategori.slug}/`, S.kategoriSayfasi({ kategori, hikayeler, servis }));
  ekle('/namaz-vakitleri/', S.namazSayfasi({ servis, simdi }));
  for (const ilce of ILCELER) ekle(`/namaz-vakitleri/${ilce.slug}/`, S.namazIlceSayfasi({ ilce, servis, simdi }));
  ekle('/akaryakit-fiyatlari/', S.akaryakitSayfasi({ servis }));
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
  const haberUrlleri = kendiHaberler.map((x) => `<url><loc>${SITE.url}${haberYolu(x)}</loc><lastmod>${(x.sonGuncelleme || x.ilkGorulme).slice(0, 10)}</lastmod></url>`);
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
    const link = kendiSayfasiVar(x) ? SITE.url + haberYolu(x) : x.kaynaklar[0].link;
    return `<item><title>${htmlKacis(x.baslik)}</title><link>${htmlKacis(link)}</link><guid isPermaLink="false">${x.id}</guid><pubDate>${new Date(x.ilkGorulme).toUTCString()}</pubDate>${x.ozet ? `<description>${htmlKacis(x.ozet)}</description>` : ''}<source url="${htmlKacis(x.kaynaklar[0].link)}">${htmlKacis(x.kaynaklar[0].ad)}</source></item>`;
  });
  yaz(
    '/rss.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${htmlKacis(SITE.name)}</title><link>${SITE.url}/</link><description>${htmlKacis(SITE.description)}</description><language>tr</language>\n${rssOgeleri.join('\n')}\n</channel></rss>\n`
  );
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
