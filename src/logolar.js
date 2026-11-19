// Kulüp logoları: resmî TFF kulüp sayfalarındaki logo (fys.tff.org) küçük boyutta kendi sunucumuza alınır.
// Logolar takımı tanıtmak için puan tablosu ve maç kartlarında küçük boyutta kullanılır.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { sayfa } from './lib/spor.js';

const UA = 'MersinAnlikBot/1.0 (+https://mersinanlik.com; iletisim@mersinanlik.com)';
const VERI = path.resolve('data/logolar.json');
const KLASOR = path.resolve('public/logo');
const CALISMA_BASINA = Number(process.env.LOGO_ADET || 25);

const servis = JSON.parse(fs.readFileSync('data/servisler.json', 'utf8'));
let logolar = {};
try {
  logolar = JSON.parse(fs.readFileSync(VERI, 'utf8'));
} catch {}

const kimlikler = new Map();
// Önce Süper Lig ve Mersin'in ligi
const sira = (k) => (k === 'super-lig' ? 0 : k === '3-lig-3' ? 1 : 2);
for (const [, lig] of Object.entries(servis.spor?.ligler || {}).sort((a, b) => sira(a[0]) - sira(b[0]))) for (const [ad, id] of Object.entries(lig.kulup || {})) kimlikler.set(id, ad);
const eksik = [...kimlikler].filter(([id]) => !logolar[id] || (!logolar[id].dosya && Date.now() - new Date(logolar[id].denendi || 0) > 7 * 864e5)).slice(0, CALISMA_BASINA);
fs.mkdirSync(KLASOR, { recursive: true });
let yeni = 0;
for (const [id, ad] of eksik) {
  try {
    const html = await sayfa(`https://www.tff.org/Default.aspx?pageID=28&kulupID=${id}`, UA);
    const m = html.match(/https?:\/\/fys\.tff\.org\/TFFUploadFolder\/KulupLogolari[\\/][^"'\s>]+/i);
    if (!m) throw new Error('logo yok');
    const url = m[0].replace(/\\/g, '/');
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const dosya = `${id}.webp`;
    await sharp(Buffer.from(await r.arrayBuffer())).trim({ threshold: 12 }).resize(96, 96, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).webp({ quality: 82 }).toFile(path.join(KLASOR, dosya));
    logolar[id] = { ad, dosya };
    yeni++;
  } catch (e) {
    logolar[id] = { ad, dosya: null, denendi: new Date().toISOString() };
    console.warn(`! Logo (${ad}): ${e.message}`);
  }
  await new Promise((x) => setTimeout(x, 1200));
}
fs.writeFileSync(VERI, JSON.stringify(logolar, null, 1));
console.log(`Kulüp logoları: ${yeni} yeni, toplam ${Object.values(logolar).filter((x) => x.dosya).length}`);
