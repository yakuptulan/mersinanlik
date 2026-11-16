import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ilceBul, mersinIlgili, kategoriBul, riskBul, benzerlik, baslikTemizle, slugify, ayrilmaEki } from '../src/lib/text.js';
import { akisiCoz } from '../src/lib/rss.js';

test('ilçe bulma: ekli isimler ve belirsiz ilçeler', () => {
  assert.deepEqual(ilceBul("Tarsus'ta asfalt çalışması"), ['tarsus']);
  assert.deepEqual(ilceBul("Bursa Yenişehir'de festival"), []); // Mersin geçmiyor → sayılmaz
  assert.deepEqual(ilceBul("Mersin Yenişehir'de festival"), ['yenisehir']);
  assert.deepEqual(ilceBul("Yenişehir'de festival", { yerelKaynak: true }), ['yenisehir']);
  assert.deepEqual(ilceBul('Akdeniz kıyısında sıcak hava'), []); // deniz, ilçe değil
  assert.deepEqual(ilceBul("Mersin'in Akdeniz ilçesinde hibe"), ['akdeniz']);
  assert.deepEqual(ilceBul('Mutlu bir gün'), []);
  assert.deepEqual(ilceBul("Mersin Mut'ta zeytin hasadı"), ['mut']);
});

test('Mersin ilgisi', () => {
  assert.equal(mersinIlgili("MERSİN'DE yağış"), true);
  assert.equal(mersinIlgili('Ankara’da toplantı'), false);
});

test('kategori ve risk', () => {
  assert.equal(kategoriBul('Takım deplasmanda kazandı'), 'gundem'); // "kazandı" kaza sayılmamalı
  assert.equal(kategoriBul('Limon hasadı başladı, üreticiler memnun'), 'tarim');
  assert.deepEqual(riskBul('Kazada 1 kişi hayatını kaybetti'), ['ölüm / şiddet']);
  assert.deepEqual(riskBul('Kütüphane açılıyor'), []);
});

test('benzerlik: aynı haber farklı başlık', () => {
  assert.ok(benzerlik("Tarsus'ta 12 mahallede asfalt yenileme çalışması başladı", "Tarsus'ta 12 mahallede asfalt yenileme çalışmaları başladı") >= 0.5);
  assert.ok(benzerlik('Limon hasadı başladı', 'Asfalt çalışması başladı') < 0.5);
});

test('başlık temizleme ve slug', () => {
  assert.equal(baslikTemizle('Son dakika: Yağış uyarısı - Hürriyet', 'Hürriyet'), 'Yağış uyarısı');
  assert.equal(slugify('Çamlıyayla Gülnar'), 'camliyayla-gulnar');
});

test('RSS ve Atom çözümleme', () => {
  const rss = `<?xml version="1.0"?><rss version="2.0"><channel><item><title><![CDATA[Mersin'de yağış]]></title><link>https://a.example/1</link><description><![CDATA[<p>Uyarı yapıldı</p>]]></description><pubDate>Mon, 16 Nov 2026 10:00:00 +0300</pubDate></item></channel></rss>`;
  const r = akisiCoz(rss);
  assert.equal(r[0].baslik, "Mersin'de yağış");
  assert.equal(r[0].link, 'https://a.example/1');
  assert.equal(r[0].aciklama, 'Uyarı yapıldı');
  assert.equal(r[0].tarih, '2026-11-16T07:00:00.000Z');
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Tarsus haberi</title><link href="https://b.example/2"/><updated>2026-11-16T08:00:00Z</updated></entry></feed>`;
  assert.equal(akisiCoz(atom)[0].link, 'https://b.example/2');
});

test('ayrılma eki', () => {
  assert.equal(ayrilmaEki('Tarsus'), 'tan');
  assert.equal(ayrilmaEki('Erdemli'), 'den');
  assert.equal(ayrilmaEki('Mut'), 'tan');
  assert.equal(ayrilmaEki('Yenişehir'), 'den');
  assert.equal(ayrilmaEki('Anamur'), 'dan');
  assert.equal(ayrilmaEki('Çamlıyayla'), 'dan');
});
