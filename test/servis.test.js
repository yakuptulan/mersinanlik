import { test } from 'node:test';
import assert from 'node:assert/strict';
import { truncgilCoz, coingeckoCoz } from '../src/lib/piyasa.js';
import { vakitCoz } from '../src/lib/namaz.js';
import { opetCoz } from '../src/lib/akaryakit.js';
import { trendCoz, trendEslesir } from '../src/lib/trend.js';

test('piyasa: Truncgil ve CoinGecko çözümleme', () => {
  const p = truncgilCoz({
    Update_Date: '2026-11-16 19:25:01',
    USD: { Buying: 50.38, Selling: 50.39, Change: 0.05, Type: 'Currency' },
    GRA: { Buying: 6252.58, Selling: 6253.55, Change: -0.43, Type: 'Gold' },
    XU100: { Selling: 11841.81, Change: -0.01, Type: 'Gold' },
    ONS: { Buying: 0, Selling: 0, Change: -0.48 },
  });
  assert.equal(p.kalemler.gram.satis, 6253.55);
  assert.equal(p.kalemler.gram.degisim, -0.43);
  assert.equal(p.kalemler.bist.satis, 11841.81);
  assert.equal(p.kalemler.usd.alis, 50.38);
  assert.equal(p.altinlar[0].ad, 'Gram altın');
  assert.deepEqual(coingeckoCoz({ bitcoin: { try: 3262845, usd: 64750, try_24h_change: 0.6853 } }), { satis: 3262845, usd: 64750, degisim: 0.69 });
  assert.equal(coingeckoCoz({}), null);
});

test('namaz: Diyanet satırı', () => {
  const v = vakitCoz({ MiladiTarihKisa: '16.11.2026', Imsak: '05:57', Gunes: '07:19', Ogle: '12:38', Ikindi: '15:25', Aksam: '17:48', Yatsi: '19:05' });
  assert.equal(v.tarih, '2026-11-16');
  assert.equal(v.ogle, '12:38');
});

test('akaryakıt: Opet ilçe listesi', () => {
  const s = opetCoz([
    { districtName: 'AKDENİZ', prices: [{ productCode: 'A100', amount: 72.99 }, { productCode: 'A121', amount: 97.1 }] },
    { districtName: 'ÇAMLIYAYLA', prices: [{ productCode: 'A100', amount: 73.2 }, { productCode: 'A128', amount: 97.3 }] },
  ]);
  assert.deepEqual(s.akdeniz, { benzin: 72.99, motorin: 97.1 });
  assert.deepEqual(s.camliyayla, { benzin: 73.2, motorin: 97.3 });
});

test('trendler: RSS ve başlık eşleşmesi', () => {
  const t = trendCoz('<rss><channel><item><title>galatasaray</title><ht:approx_traffic>200,000+</ht:approx_traffic></item><item><title>henry cavill</title></item></channel></rss>');
  assert.equal(t.length, 2);
  assert.equal(t[0].trafik, 200000);
  assert.ok(trendEslesir('galatasaray', "Galatasaray'ın yeni transferi belli oldu"));
  assert.ok(!trendEslesir('henry cavill', 'Henry Ford fabrikası'));
  assert.ok(!trendEslesir('ab', 'Abdullah'));
  assert.ok(!trendEslesir('gaz', "DSÖ'den Gazze'de hipotermi uyarısı"));
  assert.ok(!trendEslesir('çin', 'Halkla ilişkilerden çini ustalığına'));
  assert.ok(!trendEslesir('2. lig', "Fenerbahçe, Avrupa Ligi'nde yarın sahada"));
  assert.ok(!trendEslesir('istanbul', 'İstanbul için lodos uyarısı'));
  assert.ok(trendEslesir('juan mata', 'Juan Mata, 38 yaşında futbolculuk kariyerini noktaladı'));
  assert.ok(trendEslesir('zeki murat göle', 'Fenerbahçe Yardımcı Antrenörü Zeki Murat Göle kulübe veda etti'));
});

import { puanCoz, haftaCoz, milliCoz, takimAdi } from '../src/lib/spor.js';
test('spor: TFF tabloları', () => {
  const html = `<table><tr><td>1. Devre</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td></tr><tr><td>Takım</td><td>O</td></tr>
<tr><td><b><a href="x">1.GALATASARAY A.Ş.</a></b></td><td>11</td><td>9</td><td>1</td><td>1</td><td>27</td><td>15</td><td>12</td><td>28</td></tr>
<tr><td><a>2.YENİ MERSİN İDMANYURDU FUTBOL A.Ş.</a></td><td>11</td><td>7</td><td>0</td><td>4</td><td>16</td><td>10</td><td>6</td><td>21</td></tr></table>
<table><tr align="left"><td><b><span>15.11.2026</span>&nbsp;<span>13:00</span></b></td><td><a>ADANASPOR A.Ş.</a></td><td><a>4-0</a></td><td><a>1964 SİLİFKE SPOR KULÜBÜ</a></td><td>Detaylar</td></tr>
<tr><td>16.11.2026</td><td>EJDEROĞLU KIRŞEHİR FUTBOL SPOR KULÜBÜ</td><td>-</td><td>KARAMAN FUTBOL KULÜBÜ</td></tr></table>
<table><tr><td>TÜRKİYE</td><td>1-2</td><td>BELÇİKA</td><td>12.11.2026</td><td>UEFA ULUSLAR LİGİ</td><td>A Milli</td></tr></table>`;
  const p = puanCoz(html);
  assert.equal(p.length, 2);
  assert.equal(p[1].takim, 'Yeni Mersin İdmanyurdu');
  assert.equal(p[1].p, 21);
  assert.ok(p[1].mersin);
  const m = haftaCoz(html);
  assert.equal(m[0].saat, '13:00');
  assert.equal(m[0].skor, '4-0');
  assert.equal(m[0].dep, '1964 Silifke Spor');
  assert.ok(m[0].mersin);
  assert.equal(m[1].skor, null);
  assert.equal(milliCoz(html)[0].dep, 'Belçika');
  assert.equal(takimAdi('ARCA ÇORUM FK'), 'Arca Çorum FK');
});

import { listeCoz, ayrintiCoz } from '../src/lib/etkinlik.js';
test('etkinlik: liste ve tarih/yer okuma', () => {
  const l = listeCoz(`<div class="card h-100"> <a href="https://www.mersin.bel.tr/etkinlik/kilikya-yolu-1794382405"> <img src="https://www.mersin.bel.tr/uploads/images/a.jpeg" class="card-img-top" alt=""> </a> <div class="card-body"> <h5 class="card-title"> Tarihi Kilikya Yolu Yürüyüşü </h5> </div> </div>`);
  assert.equal(l.length, 1);
  assert.equal(l[0].baslik, 'Tarihi Kilikya Yolu Yürüyüşü');
  assert.ok(l[0].yayin.startsWith('2026-11'));
  const simdi = new Date('2026-11-16T12:00:00Z').getTime();
  assert.deepEqual(ayrintiCoz('Tarih: 14 Kasım Cumartesi Saat: 09.30 Yer: Gülek Kalesi. Başvuru için', simdi), { tarih: '2026-11-14', saat: '09:30', yer: 'Gülek Kalesi' });
  assert.equal(ayrintiCoz('3 Ocak konseri', simdi).tarih, '2027-01-03');
  assert.equal(ayrintiCoz('Etkinlik detayları', simdi).tarih, null);
});

import { uyariCoz } from '../src/lib/meteo.js';
test('meteoroloji: sadece Mersin ilçeleri', () => {
  const u = uyariCoz([
    { alertNo: 1, text: { yellow: 'Osmaniye çevrelerinde kuvvetli yağış' }, weather: { yellow: ['thunderstorm'] }, towns: { yellow: [93102, 98001] } },
    { alertNo: 2, text: { orange: 'Mersin\'in doğusunda çok kuvvetli yağış' }, weather: { orange: ['rain'], yellow: [] }, towns: { orange: [93306, 93313], yellow: [93301] } },
  ], 'bugun');
  assert.equal(u.length, 1);
  assert.equal(u[0].renk, 'orange');
  assert.deepEqual(u[0].ilceler, ['tarsus', 'yenisehir']);
  assert.deepEqual(u[0].hadiseler, ['Kuvvetli yağış']);
});
