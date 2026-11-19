// Servis verileri: hava durumu (13 ilçe) ve son depremler.
// Kaynaklar:
//  - Hava: MET Norway (api.met.no) – ticari kullanıma açık, kaynak gösterme şartıyla (CC BY 4.0)
//  - Deprem: AFAD (servisnet.afad.gov.tr)
//  - Nöbetçi eczane: Mersin Eczacı Odası (mersineczaciodasi.org.tr)
//  - Su kesintisi: MESKİ (online.meski.gov.tr)
//  - Elektrik kesintisi: Toroslar EDAŞ sorgusu robot doğrulaması (reCAPTCHA) istiyor,
//    bu yüzden otomatik okunmuyor; sitede resmî sayfaya link veriliyor.
// Hata olursa önceki veri korunur.

import fs from 'node:fs';
import path from 'node:path';
import { ILCELER } from './config.js';
import { eczaneleriGetir } from './lib/eczane.js';
import { suKesintileriniGetir } from './lib/kesinti.js';
import { piyasaGetir } from './lib/piyasa.js';
import { namazGetir } from './lib/namaz.js';
import { akaryakitGetir } from './lib/akaryakit.js';
import { sporGetir, liglerGetir } from './lib/spor.js';
import { etkinlikGetir } from './lib/etkinlik.js';
import { meteoGetir } from './lib/meteo.js';
import { yollariGetir } from './lib/yollar.js';
import { burcYaz } from './lib/burc.js';
import { okunanlarGetir } from './lib/okunanlar.js';
import { ulkeKodu } from './lib/bayrak.js';
import { sayacGetir } from './lib/sayac.js';
import { ucuslariGetir } from './lib/ucus.js';

const DOSYA = path.resolve('data/servisler.json');
const UA = 'mersinanlik.com iletisim@mersinanlik.com';

const SEMBOL = {
  clearsky: 'Açık', fair: 'Az bulutlu', partlycloudy: 'Parçalı bulutlu', cloudy: 'Bulutlu',
  fog: 'Sisli', lightrain: 'Hafif yağmurlu', rain: 'Yağmurlu', heavyrain: 'Kuvvetli yağmur',
  lightrainshowers: 'Hafif sağanak', rainshowers: 'Sağanak', heavyrainshowers: 'Kuvvetli sağanak',
  rainandthunder: 'Gök gürültülü yağmur', rainshowersandthunder: 'Gök gürültülü sağanak',
  heavyrainandthunder: 'Kuvvetli fırtına', lightsleet: 'Hafif karla karışık', sleet: 'Karla karışık',
  lightsnow: 'Hafif kar', snow: 'Kar', heavysnow: 'Yoğun kar', snowshowers: 'Kar sağanağı',
};

export function sembolMetni(kod = '') {
  const temel = String(kod).replace(/_(day|night|polartwilight)$/, '');
  return SEMBOL[temel] || 'Değişken';
}

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function istanbulTarih(d) {
  return new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
}

async function hava() {
  const sonuc = {};
  for (const ilce of ILCELER) {
    const j = await getJson(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${ilce.lat}&lon=${ilce.lon}`
    );
    const seri = j.properties.timeseries;
    const simdi = seri[0];
    const gunler = {};
    for (const s of seri) {
      const gun = istanbulTarih(s.time);
      const t = s.data.instant.details.air_temperature;
      gunler[gun] ??= { min: t, max: t, sembol: null };
      gunler[gun].min = Math.min(gunler[gun].min, t);
      gunler[gun].max = Math.max(gunler[gun].max, t);
      const saat = Number(new Date(s.time).toLocaleString('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false }));
      const kod = s.data.next_6_hours?.summary.symbol_code || s.data.next_1_hours?.summary.symbol_code;
      if (saat >= 11 && saat <= 14 && kod) gunler[gun].sembol = kod;
      // Öğle saati geçmişse (bugün) günün ilk tahmini yedek olarak kullanılır
      if (!gunler[gun].yedek && kod) gunler[gun].yedek = kod;
    }
    sonuc[ilce.slug] = {
      sicaklik: Math.round(simdi.data.instant.details.air_temperature),
      durum: sembolMetni(simdi.data.next_1_hours?.summary.symbol_code || simdi.data.next_6_hours?.summary.symbol_code),
      gunler: Object.entries(gunler).slice(0, 5).map(([tarih, g]) => ({
        tarih,
        min: Math.round(g.min),
        max: Math.round(g.max),
        durum: sembolMetni(g.sembol || g.yedek),
      })),
    };
  }
  return sonuc;
}

async function deprem() {
  const f = (d) => d.toISOString().slice(0, 19);
  const bitis = new Date();
  const baslangic = new Date(Date.now() - 7 * 864e5);
  const url =
    `https://servisnet.afad.gov.tr/apigateway/deprem/apiv2/event/filter?start=${f(baslangic)}&end=${f(bitis)}` +
    `&minlat=35.6&maxlat=37.5&minlon=32.2&maxlon=35.4&orderby=timedesc&limit=30&format=json`;
  const liste = await getJson(url);
  return liste.map((e) => ({
    buyukluk: Number(e.magnitude),
    yer: e.location,
    il: e.province,
    ilce: e.district,
    derinlik: Number(e.depth),
    lat: Number(e.latitude),
    lon: Number(e.longitude),
    tarih: new Date(`${e.date}Z`).toISOString(),
  }));
}

async function main() {
  let eski = {};
  try {
    eski = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
  } catch {}
  const yeni = { ...eski, guncelleme: new Date().toISOString() };
  try {
    yeni.hava = await hava();
  } catch (e) {
    console.warn('! Hava:', e.message);
  }
  try {
    yeni.deprem = await deprem();
  } catch (e) {
    console.warn('! Deprem:', e.message);
  }
  try {
    yeni.eczane = { guncelleme: new Date().toISOString(), liste: await eczaneleriGetir(UA) };
    console.log(`Eczane: ${yeni.eczane.liste.length}`);
  } catch (e) {
    console.warn('! Eczane:', e.message);
  }
  try {
    yeni.suKesintisi = { guncelleme: new Date().toISOString(), liste: await suKesintileriniGetir(UA) };
    console.log(`Su kesintisi: ${yeni.suKesintisi.liste.length}`);
  } catch (e) {
    console.warn('! Su kesintisi:', e.message);
  }
  try {
    yeni.piyasa = await piyasaGetir(UA);
    console.log(`Piyasa: gram altın ${yeni.piyasa.kalemler.gram?.satis}`);
  } catch (e) {
    console.warn('! Piyasa:', e.message);
  }
  // Namaz vakitleri ayda bir ay ileriye kadar yayınlanıyor: günde bir kez yeter
  const bugun = istanbulTarih(Date.now());
  if (!eski.namaz || istanbulTarih(eski.namaz.guncelleme) !== bugun || eski.namaz.eksik) {
    try {
      yeni.namaz = await namazGetir(UA, bugun, eski.namaz?.bolgeler);
      console.log(`Namaz vakitleri güncellendi (eksik bölge: ${yeni.namaz.eksik})`);
    } catch (e) {
      console.warn('! Namaz:', e.message);
    }
  }
  try {
    yeni.akaryakit = await akaryakitGetir(UA, eski.akaryakit);
    console.log(`Akaryakıt: ${Object.keys(yeni.akaryakit.ilceler).length} ilçe`);
  } catch (e) {
    console.warn('! Akaryakıt:', e.message);
  }
  // En çok okunanlar (Cloudflare Web Analytics)
  try {
    const o = await okunanlarGetir();
    if (o) yeni.okunanlar = o;
  } catch (e) {
    console.warn('! Okunanlar:', e.message);
  }
  // Meteorolojik uyarılar (MGM)
  try {
    yeni.meteo = await meteoGetir(UA);
    if (yeni.meteo.uyarilar.length) console.log(`⚠️  Meteoroloji uyarısı: ${yeni.meteo.uyarilar.length}`);
  } catch (e) {
    console.warn('! Meteoroloji:', e.message);
  }
  // Günlük burç yorumları (günde bir)
  if (eski.burc?.tarih !== bugun) {
    try {
      const tarihMetni = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long', timeZone: 'Europe/Istanbul' });
      yeni.burc = { tarih: bugun, yorumlar: await burcYaz(tarihMetni) };
      console.log('Burç yorumları yazıldı');
    } catch (e) {
      console.warn('! Burç:', e.message.slice(0, 200));
    }
  }
  // Etkinlikler (Mersin Büyükşehir): 3 saatte bir
  if (!eski.etkinlik || Date.now() - new Date(eski.etkinlik.guncelleme).getTime() > 170 * 60e3) {
    try {
      yeni.etkinlik = await etkinlikGetir(UA, eski.etkinlik?.liste);
      console.log(`Etkinlik: ${yeni.etkinlik.liste.length} (tarihli: ${yeni.etkinlik.liste.filter((e) => e.tarih).length})`);
    } catch (e) {
      console.warn('! Etkinlik:', e.message);
    }
  }
  // Spor (TFF): saatte bir yeter; maç saatlerinde her çalışmada (yarım saatte bir) yenilenir
  const bugunTR = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const macVakti = Object.entries(eski.spor?.ligler || {}).some(([kod, l]) =>
    (l.maclar || []).some((m) => {
      if (m.tarih !== bugunTR || !m.saat || !(kod === 'super-lig' || m.mersin)) return false;
      const t = new Date(`${m.tarih}T${m.saat}:00+03:00`).getTime();
      return Date.now() > t - 20 * 60e3 && Date.now() < t + 150 * 60e3;
    })
  );
  if (macVakti || !eski.spor || !eski.spor.ligler || (eski.spor.superLig?.puan?.length || 0) < 10 || Date.now() - new Date(eski.spor.guncelleme).getTime() > 55 * 60e3) {
    try {
      const spor = await sporGetir(UA);
      yeni.spor = { ...eski.spor, ...spor };
      yeni.spor.ligler = await liglerGetir(UA, eski.spor?.ligler || {});
      console.log(`Spor: Süper Lig ${spor.superLig?.puan?.length || 0} takım, 3. Lig ${spor.ucuncuLig?.puan?.length || 0}, milli ${spor.milli?.maclar?.length || 0} maç, ${Object.keys(yeni.spor.ligler).length} lig`);
    } catch (e) {
      console.warn('! Spor:', e.message);
    }
  }
  // Sayaçlar: deniz suyu ve hava kalitesi (her çalışmada, eskisi korunur)
  try {
    const sy = await sayacGetir(UA);
    yeni.sayac = { ...eski.sayac, ...Object.fromEntries(Object.entries(sy).filter(([, v]) => v != null)) };
  } catch (e) {
    console.warn('! Sayaçlar:', e.message);
  }
  // Kapalı ve çalışma yapılan yollar (KGM)
  try {
    yeni.yollar = await yollariGetir(UA);
    console.log(`Yollar (KGM): Mersin'de ${yeni.yollar.liste.length} kayıt`);
  } catch (e) {
    console.warn('! Yollar (KGM):', e.message);
  }
  // Çukurova Havalimanı uçuşları (her çalışmada; hata olursa eskisi kalır)
  try {
    yeni.ucus = await ucuslariGetir(UA);
    console.log(`Uçuşlar: ${yeni.ucus.giden.length} giden, ${yeni.ucus.gelen.length} gelen`);
  } catch (e) {
    console.warn('! Uçuşlar:', e.message);
  }
  // Milli maçlardaki ülkelerin bayrakları (bir kez indirilir)
  const kodlar = new Set((yeni.spor?.milli?.maclar || eski.spor?.milli?.maclar || []).flatMap((m) => [ulkeKodu(m.ev), ulkeKodu(m.dep)]).filter(Boolean));
  for (const kod of kodlar) {
    const dosya = path.resolve(`public/bayrak/${kod}.png`);
    if (fs.existsSync(dosya)) continue;
    try {
      const r = await fetch(`https://flagcdn.com/w80/${kod}.png`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      fs.mkdirSync(path.dirname(dosya), { recursive: true });
      fs.writeFileSync(dosya, Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      console.warn(`! Bayrak (${kod}): ${e.message}`);
    }
  }
  fs.mkdirSync(path.dirname(DOSYA), { recursive: true });
  fs.writeFileSync(DOSYA, JSON.stringify(yeni, null, 1));
  console.log('Servis verileri güncellendi.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
