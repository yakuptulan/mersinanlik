// Günde en fazla 2 "Merak edilenler" yazısı üretir (aralarında en az 5 saat). Workflow her çalıştığında çağrılır.
import fs from 'node:fs';
import path from 'node:path';
import { KONULAR } from './bilgi-konulari.js';
import { bilgiYaz, trendMaddesi } from './lib/bilgi.js';

const DOSYA = path.resolve('data/bilgi.json');
const GUNLUK = 4; // 2 genel konu + 2 gündem konusu
const ARALIK_SAAT = 3;

async function main() {
  let veri = { yazilar: [], denenen: {} };
  try {
    veri = { ...veri, ...JSON.parse(fs.readFileSync(DOSYA, 'utf8')) };
  } catch {}
  const simdi = Date.now();
  const saat = Number(new Date(simdi).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' }));
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const bugunku = veri.yazilar.filter((y) => new Date(y.tarih).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }) === bugun).length;
  const son = veri.yazilar.reduce((m, y) => Math.max(m, new Date(y.tarih).getTime()), 0);
  const zorla = process.argv.includes('--simdi');
  if (!zorla && (saat < 8 || saat > 22 || bugunku >= GUNLUK || simdi - son < ARALIK_SAAT * 36e5)) {
    console.log(`Bilgi: şimdi yazılmıyor (bugün ${bugunku}/${GUNLUK}, saat ${saat}).`);
    return;
  }
  const yapilan = new Set(veri.yazilar.map((y) => y.konu));
  const bugunkuGundem = veri.yazilar.filter((y) => y.trend && new Date(y.tarih).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }) === bugun).length;
  veri.trendDenenen ??= [];
  let konu = null;
  // 1) Önce Google'da bugün çok aranan bir konu (günde en fazla 2)
  if (bugunkuGundem < 2) {
    let trendler = [];
    try {
      trendler = JSON.parse(fs.readFileSync(path.resolve('data/durum.json'), 'utf8')).trendler?.liste || [];
    } catch {}
    for (const t of trendler.slice(0, 15)) {
      if (veri.trendDenenen.includes(t.baslik)) continue;
      veri.trendDenenen.push(t.baslik);
      try {
        const madde = await trendMaddesi(t.baslik);
        if (madde && !yapilan.has(madde)) {
          konu = { vikipedi: madde, tur: 'gundem', trend: t.baslik };
          break;
        }
      } catch (e) {
        console.warn(`! Gündem konusu (${t.baslik}): ${e.message}`);
      }
    }
    veri.trendDenenen = veri.trendDenenen.slice(-300);
  }
  // 2) Yoksa sıradaki konu (bu aya uygun mevsimlik konular önce)
  const ay = Number(new Date(simdi).toLocaleString('en-GB', { month: 'numeric', timeZone: 'Europe/Istanbul' }));
  const uygun = (k) => !yapilan.has(k.vikipedi) && (veri.denenen[k.vikipedi] || 0) < 2;
  if (!konu && bugunku - bugunkuGundem < 2) konu = KONULAR.find((k) => uygun(k) && k.aylar?.includes(ay)) || KONULAR.find((k) => uygun(k) && !k.aylar);
  if (!konu) {
    console.log('Bilgi: uygun konu yok.');
  } else {
    try {
      const yazi = await bilgiYaz(konu, new Set(veri.yazilar.map((y) => y.slug)));
      veri.yazilar.unshift(yazi);
      console.log(`📚 Bilgi yazısı: ${yazi.baslik} (${yazi.bolumler.length} bölüm${yazi.gorsel ? ', fotoğraflı' : ''}${konu.trend ? `, gündem: ${konu.trend}` : ''})`);
    } catch (e) {
      veri.denenen[konu.vikipedi] = (veri.denenen[konu.vikipedi] || 0) + 1;
      console.warn(`! Bilgi (${konu.vikipedi}): ${e.message.slice(0, 200)}`);
    }
  }
  fs.mkdirSync(path.dirname(DOSYA), { recursive: true });
  fs.writeFileSync(DOSYA, JSON.stringify(veri, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(0); // bilgi yazısı hatası güncellemeyi durdurmasın
});
