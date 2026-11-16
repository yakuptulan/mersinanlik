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
for (const f of FOTOLAR) {
  const k400 = path.join(KLASOR, `${f.id}-400.webp`);
  const k800 = path.join(KLASOR, `${f.id}-800.webp`);
  if (fs.existsSync(k400) && fs.existsSync(k800)) continue;
  try {
    const res = await fetch(f.indir, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const veri = Buffer.from(await res.arrayBuffer());
    await sharp(veri).resize({ width: 800, height: 500, fit: 'cover' }).webp({ quality: 72 }).toFile(k800);
    await sharp(veri).resize({ width: 400, height: 300, fit: 'cover' }).webp({ quality: 70 }).toFile(k400);
    yeni++;
    await new Promise((r) => setTimeout(r, 300)); // sunucuya nazik ol
  } catch (e) {
    hata++;
    console.warn(`! ${f.id}: ${e.message}`);
  }
}
console.log(`Fotoğraflar: ${yeni} yeni indirildi, ${hata} hata, toplam ${FOTOLAR.length}.`);
