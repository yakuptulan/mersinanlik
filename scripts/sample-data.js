// Ön izleme için örnek veri üretir (ornek-veri/ klasörüne; asla yayına çıkmaz).
// Gerçek toplayıcıyla aynı fonksiyonları kullanır: filtre, ilçe bulma, birleştirme, risk.
import fs from 'node:fs';
import path from 'node:path';

process.env.VERI_KLASORU = process.env.VERI_KLASORU || 'ornek-veri';
const { haberiDegerlendir, hikayeyeEkle, kaydet } = await import('../src/lib/store.js');

const K = (id, ad, kapsam, yapayZekaOzeti = false) => ({ id, ad, kapsam, yapayZekaOzeti });
const kaynaklar = {
  aa: K('aa', 'Anadolu Ajansı', 'ulusal'),
  dha: K('dha', 'DHA', 'ulusal'),
  iha: K('iha', 'İHA', 'ulusal'),
  hur: K('hurriyet', 'Hürriyet', 'ulusal'),
  yerel: K('yerel', 'Örnek Yerel Gazete', 'yerel'),
  vali: K('valilik', 'Mersin Valiliği', 'kurum', true),
};

const dk = (n) => new Date(Date.now() - n * 60000).toISOString();
const ham = [
  ['vali', 'Mersin Valiliğinden kuvvetli yağış uyarısı', 'Meteoroloji uyarısı sonrası valilik, akşam saatlerinde sağanak beklendiğini ve dere yataklarından uzak durulması gerektiğini duyurdu.', 25],
  ['aa', "Mersin'de kuvvetli yağış uyarısı: Valilik uyardı", '', 22],
  ['dha', 'Mersin Valiliği kuvvetli yağış uyarısı yaptı', '', 18],
  ['yerel', "Tarsus'ta 12 mahallede asfalt yenileme çalışması başladı", '', 20],
  ['iha', "Tarsus'ta 12 mahallede asfalt yenileme çalışmaları başladı", '', 17],
  ['aa', "Mersin'in Erdemli ilçesinde limon hasadı başladı", '', 45],
  ['hur', "Mezitli'de yeni halk kütüphanesi hafta sonu açılıyor", '', 70],
  ['yerel', 'Silifke-Taşucu yolunda bakım: tek şeritten kontrollü geçiş', '', 95],
  ['iha', "Mersin Akdeniz ilçesinde esnafa hibe başvuruları başladı", '', 130],
  ['dha', "Bursa Yenişehir'de festival başladı", '', 60], // Mersin değil – elenmeli
  ['aa', "Mersin'de trafik kazası: 1 kişi hayatını kaybetti", '', 35], // riskli – onaya düşmeli (yayınlanmaz)
  ['yerel', 'Yeni Mersin İdmanyurdu sahasında galip geldi', '', 160],
  ['vali', "Anamur'da muz üreticilerine sera desteği başvuruları başladı", 'İl tarım müdürlüğü, sera modernizasyonu desteği için başvuruların ay sonuna kadar alınacağını açıkladı.', 200],
];

const veri = { hikayeler: [] };
let elenen = 0;
for (const [kid, baslik, aciklama, once] of ham) {
  const kaynak = kaynaklar[kid] || kaynaklar.aa;
  const h = haberiDegerlendir({ baslik, aciklama, link: `https://ornek.example/${encodeURIComponent(baslik)}`, tarih: dk(once) }, kaynak);
  if (!h) { elenen++; continue; }
  hikayeyeEkle(veri, h, kaynak);
}
// Yapay zekâ özeti örneği (gerçekte Gemini yazar)
for (const h of veri.hikayeler) {
  if (h.ozetIcinMetin) { h.ozet = '[Örnek özet] ' + h.ozetIcinMetin.split('.')[0] + '.'; delete h.ozetIcinMetin; }
}
kaydet(veri);

const gun = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const havaOrnek = (s) => ({ sicaklik: s, durum: 'Parçalı bulutlu', gunler: [0, 1, 2, 3].map((i) => ({ tarih: gun(i), min: s - 8 + i, max: s + i, durum: i === 0 ? 'Sağanak' : 'Az bulutlu' })) });
const { ILCELER } = await import('../src/config.js');
fs.writeFileSync(
  path.join(process.env.VERI_KLASORU, 'servisler.json'),
  JSON.stringify({
    guncelleme: new Date().toISOString(),
    hava: Object.fromEntries(ILCELER.map((i, n) => [i.slug, havaOrnek(18 + (n % 5))])),
    deprem: [
      { buyukluk: 2.1, yer: 'Akdeniz (Mersin açıkları)', il: 'Mersin', ilce: '', derinlik: 7.2, tarih: dk(38) },
      { buyukluk: 1.7, yer: 'Aladağ (Adana)', il: 'Adana', ilce: 'Aladağ', derinlik: 11.7, tarih: dk(600) },
    ],
  }, null, 1)
);
console.log(`Örnek veri: ${veri.hikayeler.length} hikâye (${veri.hikayeler.filter((h) => h.durum === 'onay-bekliyor').length} onay bekliyor), ${elenen} haber Mersin dışı diye elendi.`);
