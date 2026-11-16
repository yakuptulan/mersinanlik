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
});
