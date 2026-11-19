// 81 il için veri: akaryakıt pompa fiyatları (Opet) ve namaz/iftar vakitleri (Diyanet, ezanvakti aracılığıyla).
// Kaynaklara yük bindirmemek için her çalışmada birkaç il güncellenir (döngüsel); data/ulusal.json'da tutulur.
import fs from 'node:fs';
import { opetCoz, OPET } from './lib/akaryakit.js';
import { vakitCoz } from './lib/namaz.js';
import { metnoOzet } from './lib/metno.js';
import ILLER from './iller.json' with { type: 'json' };

const UA = 'MersinAnlikBot/1.0 (+https://mersinanlik.com; iletisim@mersinanlik.com)';
const DOSYA = 'data/ulusal.json';
const YAKIT_ADET = Number(process.env.YAKIT_ADET || 14);
const HAVA_ADET = Number(process.env.HAVA_ADET || 27);
const NAMAZ_ISTEK = Number(process.env.NAMAZ_ISTEK || 14);
const bekle = (ms) => new Promise((x) => setTimeout(x, ms));
const sade = (s) => String(s).toLocaleUpperCase('tr-TR').replace(/[^A-ZÇĞİÖŞÜ]/g, '');
const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

let veri = { akaryakit: {}, namaz: {}, diyanet: { tarananSehir: [], ilce: {} } };
try {
  veri = { ...veri, ...JSON.parse(fs.readFileSync(DOSYA, 'utf8')) };
} catch {}
veri.diyanet ||= { tarananSehir: [], ilce: {} };
veri.hava ||= {};

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

// ---------- Hava: met.no, her çalışmada en eski 27 il (81 il ~1,5 saatte bir yenilenir) ----------
const havaSira = [...ILLER].filter((i) => i.slug !== 'mersin').sort((a, b) => String(veri.hava[a.slug]?.guncelleme || '').localeCompare(String(veri.hava[b.slug]?.guncelleme || '')));
let havaTamam = 0;
for (const il of havaSira.slice(0, HAVA_ADET)) {
  try {
    const r = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${il.lat}&lon=${il.lon}`, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    veri.hava[il.slug] = { guncelleme: new Date().toISOString(), ...metnoOzet(await r.json()) };
    havaTamam++;
  } catch (e) {
    console.warn(`! Hava ${il.ad}: ${e.message}`);
  }
  await bekle(400);
}

// ---------- Piyasa geçmişi: her gün için son görülen satış fiyatı (altın/döviz sayfalarındaki grafik) ----------
const GECMIS = 'data/piyasa-gecmis.json';
let gecmis = { gunler: {} };
try {
  gecmis = JSON.parse(fs.readFileSync(GECMIS, 'utf8'));
} catch {}
try {
  const p = JSON.parse(fs.readFileSync('data/servisler.json', 'utf8')).piyasa;
  if (p?.guncelleme && Date.now() - new Date(p.guncelleme) < 6 * 3600e3) {
    const gun = new Date(p.guncelleme).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
    const kayit = {};
    for (const x of [...(p.altinlar || []), ...(p.dovizler || [])]) if (x.satis) kayit[x.k] = x.satis;
    gecmis.gunler[gun] = kayit;
    const gunler = Object.keys(gecmis.gunler).sort();
    for (const g of gunler.slice(0, Math.max(0, gunler.length - 400))) delete gecmis.gunler[g];
    fs.writeFileSync(GECMIS, JSON.stringify(gecmis));
  }
} catch (e) {
  console.warn('! Piyasa geçmişi:', e.message);
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
let ardisikHata = 0;
for (let s = 500; s <= 580 && istek < NAMAZ_ISTEK && Object.keys(veri.diyanet.ilce).length < 81; s++) {
  veri.diyanet.hata ||= {};
  if (veri.diyanet.tarananSehir.includes(s) || (veri.diyanet.hata[s] || 0) >= 3) continue;
  try {
    const ilceler = await ezan(`/ilceler/${s}`);
    if (!ilceler) break;
    const merkez = ilceler.find((x) => ilAdlari.has(sade(x.IlceAdi)));
    if (merkez) veri.diyanet.ilce[ilAdlari.get(sade(merkez.IlceAdi))] = merkez.IlceID;
    veri.diyanet.tarananSehir.push(s);
    ardisikHata = 0;
  } catch (e) {
    console.warn(`! Diyanet şehir ${s}: ${e.message}`);
    veri.diyanet.hata[s] = (veri.diyanet.hata[s] || 0) + 1;
    if (++ardisikHata >= 3) break; // art arda engellendiyse sonraki çalışmaya bırak; bu kod sonra yeniden denenir
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
console.log(`Ulusal: hava ${havaTamam} il (toplam ${Object.keys(veri.hava).length}/80), akaryakıt ${yakitTamam} il güncellendi (toplam ${Object.keys(veri.akaryakit).length}/81), Diyanet kodu ${Object.keys(veri.diyanet.ilce).length}/81, namaz ${namazTamam} il güncellendi (toplam ${Object.keys(veri.namaz).length})`);
