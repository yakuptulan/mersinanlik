// 81 il için veri: akaryakıt pompa fiyatları (Opet) ve namaz/iftar vakitleri (Diyanet, ezanvakti aracılığıyla).
// Kaynaklara yük bindirmemek için her çalışmada birkaç il güncellenir (döngüsel); data/ulusal.json'da tutulur.
import fs from 'node:fs';
import { opetCoz, OPET } from './lib/akaryakit.js';
import { vakitCoz } from './lib/namaz.js';
import ILLER from './iller.json' with { type: 'json' };

const UA = 'MersinAnlikBot/1.0 (+https://mersinanlik.com; iletisim@mersinanlik.com)';
const DOSYA = 'data/ulusal.json';
const YAKIT_ADET = Number(process.env.YAKIT_ADET || 14);
const NAMAZ_ISTEK = Number(process.env.NAMAZ_ISTEK || 8);
const bekle = (ms) => new Promise((x) => setTimeout(x, ms));
const sade = (s) => String(s).toLocaleUpperCase('tr-TR').replace(/[^A-ZÇĞİÖŞÜ]/g, '');
const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

let veri = { akaryakit: {}, namaz: {}, diyanet: { tarananSehir: [], ilce: {} } };
try {
  veri = { ...veri, ...JSON.parse(fs.readFileSync(DOSYA, 'utf8')) };
} catch {}
veri.diyanet ||= { tarananSehir: [], ilce: {} };

// ---------- Akaryakıt: en eski güncellenen illerden başla ----------
const yakitSira = [...ILLER].sort((a, b) => String(veri.akaryakit[a.slug]?.guncelleme || '').localeCompare(String(veri.akaryakit[b.slug]?.guncelleme || '')));
let yakitTamam = 0;
for (const il of yakitSira.slice(0, YAKIT_ADET)) {
  try {
    const r = await fetch(OPET.replace('ProvinceCode=33', `ProvinceCode=${Number(il.kod)}`), { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ilceler = opetCoz(await r.json());
    if (!Object.keys(ilceler).length) throw new Error('boş liste');
    const eski = veri.akaryakit[il.slug];
    const merkezi = (x) => x?.ilceler?.[il.slug] || x?.ilceler?.merkez || (x?.ilceler && Object.values(x.ilceler)[0]);
    const yeni = { guncelleme: new Date().toISOString(), ilceler, onceki: eski?.onceki || null, degisim: eski?.degisim || null };
    const m = merkezi(yeni);
    const em = merkezi(eski);
    if (em && m && (em.benzin !== m.benzin || em.motorin !== m.motorin)) {
      yeni.onceki = { benzin: em.benzin, motorin: em.motorin };
      yeni.degisim = new Date().toISOString();
    }
    veri.akaryakit[il.slug] = yeni;
    yakitTamam++;
  } catch (e) {
    console.warn(`! Akaryakıt ${il.ad}: ${e.message}`);
  }
  await bekle(900);
}

// ---------- Namaz: önce il merkezlerinin Diyanet kodlarını bul, sonra vakitleri al ----------
let istek = 0;
async function ezan(yol) {
  if (istek >= NAMAZ_ISTEK) return null;
  istek++;
  await bekle(3500);
  const r = await fetch(`https://ezanvakti.emushaf.net${yol}`, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
const ilAdlari = new Map(ILLER.map((i) => [sade(i.ad), i.slug]));
ilAdlari.set(sade('AFYON'), 'afyonkarahisar');
ilAdlari.set(sade('K.MARAS'), 'kahramanmaras');
ilAdlari.set(sade('KAHRAMANMARAS'), 'kahramanmaras');
// Türkiye'nin Diyanet şehir kodları 500–580 aralığında
for (let s = 500; s <= 580 && istek < NAMAZ_ISTEK && Object.keys(veri.diyanet.ilce).length < 81; s++) {
  if (veri.diyanet.tarananSehir.includes(s)) continue;
  try {
    const ilceler = await ezan(`/ilceler/${s}`);
    if (!ilceler) break;
    const merkez = ilceler.find((x) => ilAdlari.has(sade(x.IlceAdi)));
    if (merkez) veri.diyanet.ilce[ilAdlari.get(sade(merkez.IlceAdi))] = merkez.IlceID;
    veri.diyanet.tarananSehir.push(s);
  } catch (e) {
    console.warn(`! Diyanet şehir ${s}: ${e.message}`);
    break; // engellendiyse sonraki çalışmaya bırak
  }
}
// Vakitler: elinde 10 günden az ileri tarih kalan iller
const namazSira = Object.entries(veri.diyanet.ilce)
  .map(([slug, id]) => ({ slug, id, kalan: (veri.namaz[slug]?.vakitler || []).filter((v) => v.tarih >= bugun).length }))
  .filter((x) => x.kalan < 10)
  .sort((a, b) => a.kalan - b.kalan);
let namazTamam = 0;
for (const x of namazSira) {
  if (istek >= NAMAZ_ISTEK) break;
  try {
    const liste = await ezan(`/vakitler/${x.id}`);
    if (!liste) break;
    veri.namaz[x.slug] = { guncelleme: new Date().toISOString(), vakitler: liste.map(vakitCoz).filter((v) => v && v.tarih >= bugun).slice(0, 31) };
    namazTamam++;
  } catch (e) {
    console.warn(`! Namaz ${x.slug}: ${e.message}`);
    break;
  }
}
// Eski günleri at
for (const n of Object.values(veri.namaz)) n.vakitler = (n.vakitler || []).filter((v) => v.tarih >= bugun);

fs.writeFileSync(DOSYA, JSON.stringify(veri));
console.log(`Ulusal: akaryakıt ${yakitTamam} il güncellendi (toplam ${Object.keys(veri.akaryakit).length}/81), Diyanet kodu ${Object.keys(veri.diyanet.ilce).length}/81, namaz ${namazTamam} il güncellendi (toplam ${Object.keys(veri.namaz).length})`);
