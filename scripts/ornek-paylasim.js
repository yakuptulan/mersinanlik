// Örnek paylaşımlar: güncel en önemli 3 Mersin haberi için en iyi modelle görsel üretir,
// Instagram kartını ve Facebook/Instagram metinlerini çıkarır, ornekler/ klasörüne koyar. Siteye yazmaz.
import fs from 'node:fs';
import path from 'node:path';
import { premiumUret } from '../src/lib/gorsel-uret.js';
import { kartCiz, facebookMetni, instagramMetni, sabahVerisi, sabahKartiCiz, AYAR } from '../src/sosyal.js';

const veri = JSON.parse(fs.readFileSync('data/haberler.json', 'utf8'));
const simdi = Date.now();
const secim = veri.hikayeler
  .filter((h) => h.durum === 'yayinda' && !h.genel && !(h.riskNedenleri || []).length && !AYAR.haricKategori.has(h.kategori) && h.ozet && h.baslik?.length >= 20)
  .filter((h) => simdi - Date.parse(h.ilkGorulme) < 24 * 36e5)
  .sort((a, b) => (b.kaynaklar.length * 2 - (simdi - Date.parse(b.ilkGorulme)) / 36e5) - (a.kaynaklar.length * 2 - (simdi - Date.parse(a.ilkGorulme)) / 36e5))
  .slice(0, 3);
fs.mkdirSync('ornekler', { recursive: true });
const liste = [];
for (const [i, h] of secim.entries()) {
  const kurumFoto = h.gorselKaynak && h.gorselKaynak !== 'yz';
  try {
    if (!kurumFoto) await premiumUret(h, '16:9', { pro: true });
    if (!kurumFoto) await premiumUret(h, '4:5', { pro: true });
  } catch (e) { console.log('Görsel olmadı:', e.message); }
  if (h.gorsel && fs.existsSync(path.join('public/uretilen', h.gorsel))) fs.copyFileSync(path.join('public/uretilen', h.gorsel), `ornekler/${i}-fb.webp`);
  await kartCiz(h, `ornekler/${i}-ig.jpg`, i % 2 ? 'b' : 'a');
  liste.push({ i, baslik: h.baslik, kurumFoto, fb: facebookMetni(h), ig: instagramMetni(h) });
  console.log('Tamam:', h.baslik);
}
try { await sabahKartiCiz(sabahVerisi(), 'ornekler/sabah.jpg'); } catch (e) { console.log('Sabah kartı:', e.message); }
fs.writeFileSync('ornekler/liste.json', JSON.stringify(liste, null, 1));
