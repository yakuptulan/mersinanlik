// IndexNow: yeni ve güncellenen sayfaları Bing/Yandex'e (ve Bing üzerinden ChatGPT aramasına) anında bildirir.
// Haberler: ilk yayında ve her güncellemede; diğer sayfalar: ilk görüldüğünde; ana sayfalar: 6 saatte bir.
import fs from 'node:fs';

const KEY = '80f6e499095c69c815d23414be96c60f';
const HOST = 'mersinanlik.com';
const DOSYA = 'data/indexnow.json';
const HUBLAR = ['/', '/son-depremler/', '/kar-tatili/', '/piyasalar/', '/piyasalar/gram-altin/', '/piyasalar/dolar/', '/akaryakit/', '/hava-durumu/iller/', '/namaz-vakti/', '/spor/', '/nobetci-eczane/', '/kesintiler/'];

let durum = { gonderilen: {}, hubSon: null };
try {
  durum = { ...durum, ...JSON.parse(fs.readFileSync(DOSYA, 'utf8')) };
} catch {}
const xml = fs.readFileSync('dist/sitemap.xml', 'utf8');
const kayitlar = [...xml.matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => ({ url: m[1], lastmod: m[2] || '' }));
const gonder = new Set();
for (const { url, lastmod } of kayitlar) {
  const yol = new URL(url).pathname;
  const onceki = durum.gonderilen[url];
  if (onceki === undefined) gonder.add(url);
  else if (yol.startsWith('/haber/') && onceki !== lastmod) gonder.add(url);
}
if (!durum.hubSon || Date.now() - new Date(durum.hubSon) > 6 * 36e5) {
  for (const y of HUBLAR) gonder.add(`https://${HOST}${y}`);
  durum.hubSon = new Date().toISOString();
}
const liste = [...gonder].slice(0, 9000);
if (!liste.length) {
  console.log('IndexNow: gönderilecek yeni sayfa yok');
  process.exit(0);
}
try {
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: liste }),
    signal: AbortSignal.timeout(30000),
  });
  console.log(`IndexNow: ${liste.length} adres gönderildi → HTTP ${r.status}`);
  if (r.status === 200 || r.status === 202) {
    const yeni = Object.fromEntries(kayitlar.map((k) => [k.url, k.lastmod]));
    durum.gonderilen = { ...durum.gonderilen, ...Object.fromEntries(liste.filter((u) => u in yeni).map((u) => [u, yeni[u]])) };
    // Site haritasından çıkan adresleri unut
    for (const u of Object.keys(durum.gonderilen)) if (!(u in yeni)) delete durum.gonderilen[u];
    fs.writeFileSync(DOSYA, JSON.stringify(durum));
  } else {
    console.warn('! IndexNow yanıtı:', (await r.text()).slice(0, 200));
  }
} catch (e) {
  console.warn('! IndexNow:', e.message);
}
