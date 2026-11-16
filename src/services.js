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
      if (saat >= 11 && saat <= 14 && s.data.next_6_hours) gunler[gun].sembol = s.data.next_6_hours.summary.symbol_code;
    }
    sonuc[ilce.slug] = {
      sicaklik: Math.round(simdi.data.instant.details.air_temperature),
      durum: sembolMetni(simdi.data.next_1_hours?.summary.symbol_code || simdi.data.next_6_hours?.summary.symbol_code),
      gunler: Object.entries(gunler).slice(0, 5).map(([tarih, g]) => ({
        tarih,
        min: Math.round(g.min),
        max: Math.round(g.max),
        durum: sembolMetni(g.sembol),
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
