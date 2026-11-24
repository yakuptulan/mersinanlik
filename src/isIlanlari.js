// Mersin iş ilanları: İŞKUR açık iş ilanlarını 3 saatte bir günceller.
// Çıktı: data/is-ilanlari.json
//   { guncelleme, toplam, ilanlar: { [no]: { no, pozisyon, ilce, ilceAd, acik, periyot, sekil, sonBasvuru, ilkGorulme, detay? } } }

import fs from 'node:fs';
import { ILCELER } from './config.js';
import { iskurMersinIlanlari, ilanDetayi, iskurMersinKurslari, KURS_TURLERI } from './lib/iskur.js';

const DOSYA = new URL('../data/is-ilanlari.json', import.meta.url);
const ARALIK_SAAT = 3;
const DETAY_SINIRI = 60;

const veri = (() => { try { return JSON.parse(fs.readFileSync(DOSYA, 'utf8')); } catch { return { ilanlar: {} }; } })();
const BASLANGIC = Date.now();
const gecen = () => Date.now() - BASLANGIC;
// Süre dolarsa en son kaydedilebilir durum yazılır (o ana kadar alınan liste ve ayrıntılar kaybolmasın)
let sonDurum = null;
if (!process.env.ZORLA && veri.guncelleme && Date.now() - new Date(veri.guncelleme).getTime() < ARALIK_SAAT * 36e5) {
  console.log('İş ilanları: son güncelleme yakın, atlandı.');
  process.exit(0);
}
// İŞKUR erişilemezse her 30 dakikada bir boşuna beklemeyelim: başarısız denemeden sonra 1 saat ara
if (!process.env.ZORLA && veri.basarisizDeneme && Date.now() - new Date(veri.basarisizDeneme).getTime() < 36e5) {
  console.log('İş ilanları: son deneme başarısızdı, 1 saat bekleniyor.');
  process.exit(0);
}
// Tüm adım için üst süre: 3 dakikada bitmezse yarıda bırak, eldeki veri korunur
setTimeout(() => {
  console.warn(`! İş ilanları: süre doldu (3 dk)${sonDurum ? ', o ana kadar alınanlar kaydedildi' : ', bu tur atlandı'}.`);
  try { fs.writeFileSync(DOSYA, JSON.stringify(sonDurum || { ...veri, basarisizDeneme: new Date().toISOString() }, null, 1)); } catch {}
  process.exit(0);
}, 180e3).unref();

const sade = (s) => String(s).toLocaleLowerCase('tr-TR').split('/')[0].trim();
const ilceBul = (ham) => ILCELER.find((i) => sade(i.ad) === sade(ham));
const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

try {
  const { toplam, ilanlar } = await iskurMersinIlanlari();
  // Kamu kurumlarının Mersin'deki işçi alımları (genelde az; varsa listeye girer, kamu diye işaretlenir)
  try {
    const kamu = await iskurMersinIlanlari({ kamu: true, maxSayfa: 10 });
    ilanlar.push(...kamu.ilanlar.map((i) => ({ ...i, kamu: true })));
    if (kamu.ilanlar.length) console.log(`İş ilanları: ${kamu.ilanlar.length} kamu ilanı`);
  } catch (e) {
    console.warn(`! Kamu ilanları: ${e.message}`);
  }
  if (!ilanlar.length) throw new Error('ilan gelmedi');
  const yeni = {};
  for (const i of ilanlar) {
    if (i.sonBasvuru && i.sonBasvuru < bugun) continue;
    const eski = veri.ilanlar[i.no];
    const ilce = ilceBul(i.ilceHam);
    yeni[i.no] = { ...eski, ...i, ilce: ilce?.slug || null, ilceAd: ilce?.ad || null, ilkGorulme: eski?.ilkGorulme || new Date().toISOString() };
  }
  console.log(`İş ilanları: liste alındı (${Math.round(gecen() / 1000)} sn)`);
  sonDurum = { guncelleme: new Date().toISOString(), toplam, ilanlar: yeni, kurslar: veri.kurslar || [] };
  // Ayrıntısı eksik olanlar (yeniden eskiye), her çalışmada sınırlı sayıda ve süre bütçesiyle
  const eksik = Object.values(yeni).filter((i) => !i.detay).sort((a, b) => b.no.localeCompare(a.no)).slice(0, DETAY_SINIRI);
  let alinan = 0;
  for (const i of eksik) {
    if (gecen() > 120e3) break; // kalan süre kurslara ve kayda kalsın
    try {
      i.detay = await ilanDetayi(i.no, i.tur);
      alinan++;
    } catch (e) {
      console.warn(`! İlan ${i.no}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 900));
  }
  // Mersin'deki İŞKUR kursları ve işbaşı eğitim programları.
  // Not: İŞKUR'un kurs sayfası sunucumuzdan gelen istekleri reddediyor ("Request Rejected"); zorlamıyoruz.
  // Sayfada bunun yerine İŞKUR'un kurs aramasına bağlantı veriliyor. KURS_CEK=1 ile yeniden denenebilir.
  let kurslar = veri.kurslar || [];
  if (process.env.KURS_CEK === '1' && gecen() < 140e3) try {
    const k = [];
    for (const tur of Object.keys(KURS_TURLERI)) {
      for (const x of await iskurMersinKurslari(Number(tur))) {
        const ilce = ilceBul(x.ilceHam);
        k.push({ ...x, programTur: Number(tur), ilce: ilce?.slug || null, ilceAd: ilce?.ad || null, ilkGorulme: kurslar.find((e) => e.no === x.no)?.ilkGorulme || new Date().toISOString() });
      }
    }
    kurslar = k.filter((x) => !x.sonBasvuru || x.sonBasvuru >= bugun);
    console.log(`İŞKUR kursları (Mersin): ${kurslar.length}`);
  } catch (e) {
    console.warn(`! Kurslar: ${e.message}`);
  }
  const yeniSayi = Object.keys(yeni).filter((n) => !veri.ilanlar[n]).length;
  fs.writeFileSync(DOSYA, JSON.stringify({ guncelleme: new Date().toISOString(), toplam, ilanlar: yeni, kurslar }, null, 1));
  console.log(`İş ilanları: ${Object.keys(yeni).length} açık ilan (İŞKUR toplam ${toplam}), ${yeniSayi} yeni, ${alinan} ayrıntı alındı.`);
} catch (e) {
  console.warn(`! İş ilanları alınamadı: ${e.message}`);
  fs.writeFileSync(DOSYA, JSON.stringify({ ...veri, basarisizDeneme: new Date().toISOString() }, null, 1));
}
