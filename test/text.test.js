import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ilceBul, mersinIlgili, kategoriBul, riskBul, benzerlik, baslikTemizle, slugify, ayrilmaEki, duzMetin } from '../src/lib/text.js';
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
  assert.deepEqual(riskBul('Trafik kazasında 1 kişi hayatını kaybetti'), []);
  assert.deepEqual(riskBul('Otomobil şarampole devrildi: 45 yaşındaki sürücü öldü'), []);
  assert.deepEqual(riskBul('Kazada 7 yaşındaki çocuk hayatını kaybetti'), []);
  assert.deepEqual(riskBul('Bıçaklı kavgada 1 kişi hayatını kaybetti'), []);
  assert.deepEqual(riskBul('Genç kadın intihar etti'), ['intihar']);
  assert.deepEqual(riskBul('Kaza sonrası sürücü gözaltına alındı'), []);
  assert.deepEqual(riskBul('CHP il başkanından açıklama'), []);
  assert.deepEqual(riskBul('Öğretmene taciz suçlaması'), ['istismar / taciz']);
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

test('karma kaynak filtresi ve sansür', async () => {
  const { haberiDegerlendir } = await import('../src/lib/store.js');
  const k = { kapsam: 'karma' };
  assert.equal(haberiDegerlendir({ baslik: 'Romelu Lukaku milli takımı bıraktı', link: 'https://a.com/1' }, k).genel, true);
  assert.equal(haberiDegerlendir({ baslik: "Toroslar'da kuaför hizmeti", link: 'https://a.com/9' }, k).genel, false);
  assert.ok(haberiDegerlendir({ baslik: "Toroslar'da kuaför hizmeti", link: 'https://a.com/2' }, k));
  assert.ok(haberiDegerlendir({ baslik: 'Vali Toros KKTC resepsiyonuna katıldı', link: 'https://a.com/3' }, k));
  assert.equal(haberiDegerlendir({ baslik: 'Mersin Sahili', link: 'https://a.com/galeri/5' }, k), null);
  const s = haberiDegerlendir({ baslik: "Mersin'de s*lahlı s*ldırı", link: 'https://a.com/4' }, k);
  assert.deepEqual(s.riskNedenleri, []);
  assert.deepEqual(riskBul("Tarsus'ta otomobil devrildi: 6 yaşındaki çocuk hayatını kaybetti"), []);
  assert.equal(duzMetin('Gülnar&amp;#039;a &#8217;'), 'Gülnar\'a ’');
});

test('eczane ve su kesintisi ayrıştırma', async () => {
  const fs = await import('node:fs');
  const { eczaneCoz, telefonGoster } = await import('../src/lib/eczane.js');
  const { suKesintiCoz } = await import('../src/lib/kesinti.js');
  const e = eczaneCoz(fs.readFileSync(new URL('./ornekler/eczane.html', import.meta.url), 'utf8'));
  assert.equal(e.length, 2);
  assert.equal(e[0].ad, 'Abay Eczanesi');
  assert.equal(e[0].ilce, 'mezitli');
  assert.equal(e[0].telefon, '03243587375');
  assert.equal(e[0].lat, 36.764217);
  assert.match(e[0].saat, /18:00/);
  assert.equal(e[1].ilce, 'gulnar');
  assert.equal(telefonGoster('03243587375'), '0324 358 73 75');
  const k = suKesintiCoz(fs.readFileSync(new URL('./ornekler/meski.html', import.meta.url), 'utf8'));
  assert.equal(k.length, 1);
  assert.equal(k[0].ilceler[0].ilce, 'mezitli');
  assert.deepEqual(k[0].ilceler[0].mahalleler, ['Çevlik']);
  assert.equal(k[0].bitis, '2026-11-16T13:00:00.000Z');
});

test('Türkiye/dünya haberi ancak 3 site yazınca yayınlanır', async () => {
  const { haberiDegerlendir, hikayeyeEkle, yayindakiler } = await import('../src/lib/store.js');
  const veri = { hikayeler: [] };
  const ekle = (ad, i) => {
    const kaynak = { id: ad, ad, kapsam: 'karma' };
    hikayeyeEkle(veri, haberiDegerlendir({ baslik: 'Ekim ayında ihracat yüzde 8,1 arttı', link: `https://${ad}/${i}` }, kaynak), kaynak);
  };
  ekle('a.com', 1);
  ekle('b.com', 2);
  assert.equal(yayindakiler(veri).length, 0);
  ekle('c.com', 3);
  assert.equal(yayindakiler(veri).length, 1);
  assert.equal(yayindakiler(veri)[0].genel, true);
});

test('büyük harf başlık düzeltme', () => {
  assert.equal(baslikTemizle('MERSİN’DE ARAÇ SAYISI 1 MİLYONA YAKLAŞTI!'), 'Mersin’de araç sayısı 1 milyona yaklaştı!');
  assert.equal(baslikTemizle("TOROSLAR BELEDİYESİNDEN ÖZEL BİREYLERE HİZMET"), 'Toroslar belediyesinden özel bireylere hizmet');
  assert.equal(baslikTemizle("Mersin'de MESKİ çalışması"), "Mersin'de MESKİ çalışması");
});
