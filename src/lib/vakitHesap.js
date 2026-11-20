// Diyanet yöntemiyle namaz vakti hesabı (Diyanet verisi alınamayan iller için yedek).
// Güneşin konumu standart astronomik formüllerle; imsak 18°, yatsı 17°, ikindi gölge katsayısı 1,
// Diyanet temkinleri: güneş -7 dk, öğle +5, ikindi +4, akşam +7.
const RAD = Math.PI / 180;
const sin = (d) => Math.sin(d * RAD), cos = (d) => Math.cos(d * RAD), tan = (d) => Math.tan(d * RAD);
const asin = (x) => Math.asin(x) / RAD, acos = (x) => Math.acos(x) / RAD, atan2 = (y, x) => Math.atan2(y, x) / RAD;
const nor = (a, b) => a - b * Math.floor(a / b);

function gunes(jd) {
  const D = jd - 2451545.0;
  const g = nor(357.529 + 0.98560028 * D, 360);
  const q = nor(280.459 + 0.98564736 * D, 360);
  const L = nor(q + 1.915 * sin(g) + 0.02 * sin(2 * g), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = nor(atan2(cos(e) * sin(L), cos(L)) / 15, 24);
  return { dek: asin(sin(e) * sin(L)), denk: q / 15 - RA };
}
const julian = (y, m, d) => {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
};

export function vakitHesapla(tarih, lat, lon, tz = 3) {
  const [y, m, d] = tarih.split('-').map(Number);
  const jd = julian(y, m, d) - lon / (15 * 24);
  const ogleSaat = (t) => nor(12 - gunes(jd + t / 24).denk, 24);
  const aci = (a, t, yon) => {
    const { dek } = gunes(jd + t / 24);
    const v = (1 / 15) * acos((-sin(a) - sin(dek) * sin(lat)) / (cos(dek) * cos(lat)));
    return ogleSaat(t) + (yon < 0 ? -v : v);
  };
  // İlk yaklaşım saatleri, ardından iki tur düzeltme
  let s = { imsak: 5, gunes: 6, ogle: 12, ikindi: 13, aksam: 18, yatsi: 18 };
  for (let i = 0; i < 2; i++) {
    s = {
      imsak: aci(18, s.imsak, -1),
      gunes: aci(0.833, s.gunes, -1),
      ogle: ogleSaat(s.ogle),
      ikindi: (() => { const { dek } = gunes(jd + s.ikindi / 24); const h = atan2(1, 1 + tan(Math.abs(lat - dek))); const v = (1 / 15) * acos((sin(h) - sin(dek) * sin(lat)) / (cos(dek) * cos(lat))); return ogleSaat(s.ikindi) + v; })(),
      aksam: aci(0.833, s.aksam, 1),
      yatsi: aci(17, s.yatsi, 1),
    };
  }
  const temkin = { imsak: 0, gunes: -7, ogle: 5, ikindi: 4, aksam: 7, yatsi: 0 };
  const fmt = (h) => {
    let dk = Math.round((h + tz - lon / 15) * 60);
    dk = nor(dk, 1440);
    return `${String(Math.floor(dk / 60)).padStart(2, '0')}:${String(dk % 60).padStart(2, '0')}`;
  };
  const o = { tarih };
  for (const k of Object.keys(s)) o[k] = fmt(s[k] + temkin[k] / 60);
  return o;
}

const HICRI = new Intl.DateTimeFormat('tr-TR-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
// Bugünden itibaren gün gün vakit listesi (Diyanet verisiyle aynı biçimde)
export function vakitListesi(lat, lon, gunSayisi = 31, baslangic = Date.now()) {
  const l = [];
  for (let i = 0; i < gunSayisi; i++) {
    const t = new Date(baslangic + i * 864e5);
    const tarih = t.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
    l.push({ ...vakitHesapla(tarih, lat, lon), hicri: HICRI.format(new Date(`${tarih}T12:00:00+03:00`)).replace(/^Hicri\s*/, '') });
  }
  return l;
}
