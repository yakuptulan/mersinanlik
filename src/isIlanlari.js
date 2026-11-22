// Mersin iş ilanları: İŞKUR açık iş ilanlarını 3 saatte bir günceller.
// Çıktı: data/is-ilanlari.json
//   { guncelleme, toplam, ilanlar: { [no]: { no, pozisyon, ilce, ilceAd, acik, periyot, sekil, sonBasvuru, ilkGorulme, detay? } } }

import fs from 'node:fs';
import { ILCELER } from './config.js';
import { iskurMersinIlanlari, ilanDetayi } from './lib/iskur.js';

const DOSYA = new URL('../data/is-ilanlari.json', import.meta.url);
const ARALIK_SAAT = 3;
const DETAY_SINIRI = 60;

const veri = (() => { try { return JSON.parse(fs.readFileSync(DOSYA, 'utf8')); } catch { return { ilanlar: {} }; } })();
if (!process.env.ZORLA && veri.guncelleme && Date.now() - new Date(veri.guncelleme).getTime() < ARALIK_SAAT * 36e5) {
  console.log('İş ilanları: son güncelleme yakın, atlandı.');
  process.exit(0);
}

const sade = (s) => String(s).toLocaleLowerCase('tr-TR').split('/')[0].trim();
const ilceBul = (ham) => ILCELER.find((i) => sade(i.ad) === sade(ham));
const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

try {
  const { toplam, ilanlar } = await iskurMersinIlanlari();
  if (!ilanlar.length) throw new Error('ilan gelmedi');
  const yeni = {};
  for (const i of ilanlar) {
    if (i.sonBasvuru && i.sonBasvuru < bugun) continue;
    const eski = veri.ilanlar[i.no];
    const ilce = ilceBul(i.ilceHam);
    yeni[i.no] = { ...eski, ...i, ilce: ilce?.slug || null, ilceAd: ilce?.ad || null, ilkGorulme: eski?.ilkGorulme || new Date().toISOString() };
  }
  // Ayrıntısı eksik olanlar (yeniden eskiye), her çalışmada sınırlı sayıda
  const eksik = Object.values(yeni).filter((i) => !i.detay).sort((a, b) => b.no.localeCompare(a.no)).slice(0, DETAY_SINIRI);
  let alinan = 0;
  for (const i of eksik) {
    try {
      i.detay = await ilanDetayi(i.no, i.tur);
      alinan++;
    } catch (e) {
      console.warn(`! İlan ${i.no}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 900));
  }
  const yeniSayi = Object.keys(yeni).filter((n) => !veri.ilanlar[n]).length;
  fs.writeFileSync(DOSYA, JSON.stringify({ guncelleme: new Date().toISOString(), toplam, ilanlar: yeni }, null, 1));
  console.log(`İş ilanları: ${Object.keys(yeni).length} açık ilan (İŞKUR toplam ${toplam}), ${yeniSayi} yeni, ${alinan} ayrıntı alındı.`);
} catch (e) {
  console.warn(`! İş ilanları alınamadı: ${e.message}`);
}
