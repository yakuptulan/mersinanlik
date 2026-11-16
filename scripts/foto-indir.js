// Temsili fotoğrafları (src/fotolar.js) bir kez indirir ve küçültür:
//   public/foto/<id>-400.webp  (liste kartları)
//   public/foto/<id>-800.webp  (manşet)
// Zaten inen dosyalar atlanır. GitHub Actions'ta çalışır; indirilen dosyalar depoya kaydedilir.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { FOTOLAR } from '../src/fotolar.js';

const KLASOR = path.resolve('public/foto');
// Wikimedia, kendini tanıtan bir User-Agent ister
const UA = 'MersinAnlikBot/1.0 (https://mersinanlik.com; iletisim@mersinanlik.com)';

fs.mkdirSync(KLASOR, { recursive: true });
let yeni = 0;
let hata = 0;
let ustUste429 = 0;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function getir(url) {
  for (let deneme = 0; deneme < 3; deneme++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    if (res.status !== 429) return res;
    // Çok sık istek: sunucunun dediği kadar (en fazla 20 sn) bekle, tekrar dene
    await bekle(Math.min(Number(res.headers.get('retry-after')) || 5, 20) * 1000);
  }
  return { ok: false, status: 429 };
}

for (const f of FOTOLAR) {
  if (ustUste429 >= 3) {
    console.log('Wikimedia yavaşla diyor; kalanlar sonraki çalışmada indirilecek.');
    break;
  }
  const k400 = path.join(KLASOR, `${f.id}-400.webp`);
  const k800 = path.join(KLASOR, `${f.id}-800.webp`);
  if (fs.existsSync(k400) && fs.existsSync(k800)) continue;
  try {
    const res = await getir(f.indir);
    if (res.status === 429) ustUste429++;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ustUste429 = 0;
    const veri = Buffer.from(await res.arrayBuffer());
    await sharp(veri).resize({ width: 800, height: 500, fit: 'cover' }).webp({ quality: 72 }).toFile(k800);
    await sharp(veri).resize({ width: 400, height: 300, fit: 'cover' }).webp({ quality: 70 }).toFile(k400);
    yeni++;
    await bekle(1500); // sunucuya nazik ol
  } catch (e) {
    hata++;
    console.warn(`! ${f.id}: ${e.message}`);
  }
}
console.log(`Fotoğraflar: ${yeni} yeni indirildi, ${hata} hata, toplam ${FOTOLAR.length}.`);
