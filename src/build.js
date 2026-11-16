// Siteyi data/ klasöründeki verilerden üretir ve dist/ klasörüne yazar.
import fs from 'node:fs';
import path from 'node:path';
import { SITE, ILCELER } from './config.js';
import { yukle, yayindakiler, VERI_KLASORU } from './lib/store.js';
import { ilceAdi } from './templates/layout.js';
import * as S from './templates/sayfalar.js';

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
  const hikayeler = yayindakiler(veri);
  const servis = servisYukle();

  const sayfalar = [];
  const ekle = (yol, html, haritaya = true) => {
    yaz(yol, html);
    if (haritaya) sayfalar.push(yol);
  };

  ekle('/', S.anaSayfa({ hikayeler, servis, simdi }));
  ekle('/ilceler/', S.ilcelerSayfasi());
  for (const ilce of ILCELER) ekle(`/ilce/${ilce.slug}/`, S.ilceSayfasi({ ilce, hikayeler, servis, simdi }));
  ekle('/hava-durumu/', S.havaSayfasi({ servis }));
  ekle('/deprem/', S.depremSayfasi({ servis }));
  ekle('/nobetci-eczane/', S.eczaneSayfasi({ servis }));
  ekle('/kesintiler/', S.kesintiSayfasi({ servis }));
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
  yaz(
    '/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sayfalar
      .map((y) => `<url><loc>${SITE.url}${y}</loc><lastmod>${bugun}</lastmod></url>`)
      .join('\n')}\n</urlset>\n`
  );
  yaz('/robots.txt', `User-agent: *\nAllow: /\nDisallow: /ara/\nDisallow: /menu/\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
  // Cloudflare Pages: önbellek ayarları
  yaz(
    '/_headers',
    `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n/style.css\n  Cache-Control: public, max-age=3600\n/app.js\n  Cache-Control: public, max-age=3600\n`
  );

  return { sayfaSayisi: sayfalar.length + 3, haberSayisi: hikayeler.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = insaEt();
  console.log(`Site üretildi: ${r.sayfaSayisi} sayfa, ${r.haberSayisi} haber → dist/`);
}
