// Günde en fazla 2 "Merak edilenler" yazısı üretir (aralarında en az 5 saat). Workflow her çalıştığında çağrılır.
import fs from 'node:fs';
import path from 'node:path';
import { KONULAR } from './bilgi-konulari.js';
import { bilgiYaz } from './lib/bilgi.js';

const DOSYA = path.resolve('data/bilgi.json');
const GUNLUK = 2;
const ARALIK_SAAT = 5;

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
  if (!zorla && (saat < 8 || saat > 21 || bugunku >= GUNLUK || simdi - son < ARALIK_SAAT * 36e5)) {
    console.log(`Bilgi: şimdi yazılmıyor (bugün ${bugunku}/${GUNLUK}, saat ${saat}).`);
    return;
  }
  const yapilan = new Set(veri.yazilar.map((y) => y.konu));
  const konu = KONULAR.find((k) => !yapilan.has(k.vikipedi) && (veri.denenen[k.vikipedi] || 0) < 2);
  if (!konu) {
    console.log('Bilgi: konu listesi bitti.');
    return;
  }
  try {
    const yazi = await bilgiYaz(konu, new Set(veri.yazilar.map((y) => y.slug)));
    veri.yazilar.unshift(yazi);
    console.log(`📚 Bilgi yazısı: ${yazi.baslik} (${yazi.bolumler.length} bölüm${yazi.gorsel ? ', fotoğraflı' : ''})`);
  } catch (e) {
    veri.denenen[konu.vikipedi] = (veri.denenen[konu.vikipedi] || 0) + 1;
    console.warn(`! Bilgi (${konu.vikipedi}): ${e.message.slice(0, 200)}`);
  }
  fs.mkdirSync(path.dirname(DOSYA), { recursive: true });
  fs.writeFileSync(DOSYA, JSON.stringify(veri, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(0); // bilgi yazısı hatası güncellemeyi durdurmasın
});
