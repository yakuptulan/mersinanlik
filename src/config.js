// Mersin Anlık – genel ayarlar
// Bu dosyadaki değerler sitenin her yerinde kullanılır.

export const SITE = {
  name: 'Mersin Anlık',
  url: 'https://mersinanlik.com',
  slogan: "Mersin'de olan, anında burada.",
  description:
    "Mersin ve 13 ilçesinden son dakika haberleri, nöbetçi eczaneler, kesintiler, hava durumu ve depremler tek sayfada.",
  locale: 'tr_TR',
  timezone: 'Europe/Istanbul',
  email: 'iletisim@mersinanlik.com',
  defaultIlce: 'yenisehir',
};

// "belirsiz: true" olan isimler başka illerde de geçebilir (ör. Bursa Yenişehir)
// ya da günlük dilde başka anlama gelir (ör. Akdeniz denizi, Toros Dağları).
// Bu ilçeler ulusal kaynaklarda ancak yanında "Mersin" geçiyorsa sayılır.
export const ILCELER = [
  { slug: 'akdeniz', ad: 'Akdeniz', lat: 36.81, lon: 34.64, belirsiz: true },
  { slug: 'anamur', ad: 'Anamur', lat: 36.08, lon: 32.84 },
  { slug: 'aydincik', ad: 'Aydıncık', lat: 36.14, lon: 33.32, belirsiz: true },
  { slug: 'bozyazi', ad: 'Bozyazı', lat: 36.11, lon: 32.96 },
  { slug: 'camliyayla', ad: 'Çamlıyayla', lat: 37.17, lon: 34.6 },
  { slug: 'erdemli', ad: 'Erdemli', lat: 36.61, lon: 34.31 },
  { slug: 'gulnar', ad: 'Gülnar', lat: 36.34, lon: 33.4 },
  { slug: 'mezitli', ad: 'Mezitli', lat: 36.76, lon: 34.53 },
  { slug: 'mut', ad: 'Mut', lat: 36.64, lon: 33.44, belirsiz: true },
  { slug: 'silifke', ad: 'Silifke', lat: 36.38, lon: 33.93 },
  { slug: 'tarsus', ad: 'Tarsus', lat: 36.92, lon: 34.89 },
  { slug: 'toroslar', ad: 'Toroslar', lat: 36.84, lon: 34.6, belirsiz: true },
  { slug: 'yenisehir', ad: 'Yenişehir', lat: 36.78, lon: 34.58, belirsiz: true },
];

export const KATEGORILER = [
  { slug: 'asayis', ad: 'Asayiş', kelimeler: ['polis', 'jandarma', 'operasyon', 'gözaltı', 'tutuklan', 'şüpheli', 'hırsız', 'kaçakçı', 'uyuşturucu'] },
  { slug: 'kaza', ad: 'Kaza', kelimeler: ['kazada', 'kazası', 'kazayla', 'çarpış', 'devrildi', 'yangın', 'yaralandı'] },
  { slug: 'belediye', ad: 'Belediye', kelimeler: ['belediye', 'büyükşehir', 'meclis', 'muhtar', 'asfalt', 'park'] },
  { slug: 'ekonomi', ad: 'Ekonomi', kelimeler: ['ekonomi', 'ihracat', 'liman', 'esnaf', 'fiyat', 'yatırım', 'ticaret', 'borsa', 'hibe'] },
  { slug: 'tarim', ad: 'Tarım', kelimeler: ['hasat', 'üretici', 'çiftçi', 'tarım', 'narenciye', 'limon', 'portakal', 'muz', 'sera', 'hal fiyat'] },
  { slug: 'egitim', ad: 'Eğitim', kelimeler: ['okul', 'öğrenci', 'öğretmen', 'üniversite', 'eğitim', 'sınav', 'kütüphane'] },
  { slug: 'saglik', ad: 'Sağlık', kelimeler: ['hastane', 'sağlık', 'doktor', 'hasta', 'aşı'] },
  { slug: 'spor', ad: 'Spor', kelimeler: ['maç', 'idmanyurdu', 'idman yurdu', 'lig', 'spor', 'şampiyon', 'basketbol', 'futbol', 'voleybol'] },
  { slug: 'ulasim', ad: 'Ulaşım', kelimeler: ['yolu', 'yolda', 'karayolu', 'trafik', 'otobüs', 'metro', 'feribot', 'havalimanı', 'köprü', 'otoyol'] },
  { slug: 'hava', ad: 'Hava', kelimeler: ['yağış', 'sağanak', 'fırtına', 'meteoroloji', 'hava durumu', 'selde', 'sel felaketi', 'su baskın'] },
  { slug: 'kultur', ad: 'Kültür-Sanat', kelimeler: ['festival', 'konser', 'sergi', 'tiyatro', 'etkinlik', 'müze'] },
];

// Bu kelimelerden biri geçen haber otomatik yayınlanmaz; Telegram onayına düşer.
// Hukuki riskin büyük kısmı bu tür haberlerde: kişilik hakları, çocuklar, suç isnadı.
export const RISK_KELIMELERI = {
  // Sadece bu iki konu Telegram onayına gider. Kaza, ölüm, silahlı saldırı, gözaltı/tutuklama
  // ve siyaset haberleri onaysız yayınlanır (başlık kaynağın başlığıdır, link kaynağa gider).
  // Telegram kurulana kadar bu haberler yayınlanmaz, bekletilir.
  'intihar': ['intihar'],
  'istismar / taciz': ['istismar', 'taciz', 'tecavüz', 'fuhuş', 'cinsel saldırı'],
};

// Bir haber kaç saat "son dakika" sayılır, ana sayfada kaç saat tutulur
export const AYAR = {
  sonDakikaSaat: 2,
  // Mersin dışı (Türkiye/dünya) haber, en az bu kadar farklı site yazdıysa "önemli" sayılıp yayınlanır
  genelKaynakEsigi: 3,
  anaSayfaGenelSayisi: 5,
  saklamaGun: 7,
  anaSayfaHaberSayisi: 30,
  ilceHaberSayisi: 40,
  birlestirmeEsigi: 0.5, // iki başlığın kelime benzerliği bu orandan yüksekse aynı haber sayılır
  birlestirmeSaat: 48,
};
