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
  // Google AdSense yayıncı kimliği (ör. 'ca-pub-1234567890123456'). Boşken reklam kodu ve reklam alanları hiç basılmaz;
  // doldurulunca otomatik reklam kodu her sayfaya, ads.txt de site köküne eklenir.
  adsense: 'ca-pub-1594680476579282',
  sosyal: {
    instagram: 'https://www.instagram.com/mersinanlikcom/',
    facebook: 'https://www.facebook.com/profile.php?id=61596502874985',
  },
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

// Her kategorinin rengi kartlarda ikon kutusu ve etiket rengi olarak kullanılır
export const KATEGORILER = [
  { slug: 'siyaset', renk: '#8E4EC6', ad: 'Siyaset', kelimeler: ['parti', 'chp', 'ak parti', 'mhp', 'dem parti', 'iyi parti', 'milletvekili', 'il başkan', 'ilçe başkan', 'teşkilat', 'özgür özel', 'erdoğan', 'bahçeli', 'kurultay', 'miting', 'seçim', 'kayyum', 'tbmm'] },
  { slug: 'asayis', renk: '#3E4C6E', ad: 'Asayiş', kelimeler: ['polis', 'jandarma', 'operasyon', 'gözaltı', 'tutuklan', 'şüpheli', 'hırsız', 'kaçakçı', 'uyuşturucu'] },
  { slug: 'kaza', renk: '#EF5F00', ad: 'Kaza', kelimeler: ['kazada', 'kazası', 'kazayla', 'çarpış', 'devrildi', 'yangın', 'yaralandı'] },
  { slug: 'belediye', renk: '#0588F0', ad: 'Belediye', kelimeler: ['belediye', 'büyükşehir', 'meclis', 'muhtar', 'asfalt', 'park'] },
  { slug: 'ekonomi', renk: '#C98A00', ad: 'Ekonomi', kelimeler: ['ekonomi', 'ihracat', 'liman', 'esnaf', 'fiyat', 'yatırım', 'ticaret', 'borsa', 'hibe'] },
  { slug: 'tarim', renk: '#5BA82B', ad: 'Tarım', kelimeler: ['hasat', 'üretici', 'çiftçi', 'tarım', 'narenciye', 'limon', 'portakal', 'muz', 'sera', 'hal fiyat'] },
  { slug: 'egitim', renk: '#6E56CF', ad: 'Eğitim', kelimeler: ['okul', 'öğrenci', 'öğretmen', 'üniversite', 'eğitim', 'sınav', 'kütüphane'] },
  { slug: 'saglik', renk: '#12A594', ad: 'Sağlık', kelimeler: ['hastane', 'sağlık', 'doktor', 'hasta', 'aşı'] },
  { slug: 'spor', renk: '#2B9A66', ad: 'Spor', kelimeler: ['maç', 'idmanyurdu', 'idman yurdu', 'lig', 'spor', 'şampiyon', 'basketbol', 'futbol', 'voleybol', 'belediye spor', 'belediyespor', 'puan', 'galibiyet', 'mağlubiyet', 'gol', 'turnuva', 'kulüp'] },
  { slug: 'ulasim', renk: '#0797B9', ad: 'Ulaşım', kelimeler: ['yolu', 'yolda', 'karayolu', 'trafik', 'otobüs', 'metro', 'feribot', 'havalimanı', 'köprü', 'otoyol'] },
  { slug: 'hava', renk: '#3E8EDE', ad: 'Hava', kelimeler: ['yağış', 'sağanak', 'fırtına', 'meteoroloji', 'hava durumu', 'selde', 'sel felaketi', 'su baskın'] },
  { slug: 'kultur', renk: '#D6409F', ad: 'Kültür-Sanat', kelimeler: ['festival', 'konser', 'sergi', 'tiyatro', 'etkinlik', 'müze'] },
];

// Kategorisi bulunamayan haber ve Türkiye/dünya haberleri
export const GUNDEM = { slug: 'gundem', renk: '#DC3E42', ad: 'Gündem' };
export const GENEL = { slug: 'genel', renk: '#475569', ad: 'Türkiye / Dünya' };

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
  // Yapay zekâ görseli: Cloudflare'in günlük ücretsiz kotası ~150 görsel; güvenli pay bırakıyoruz
  gunlukGorselLimiti: 36, // Cloudflare ücretsiz kota: görsel başına ~250 nöron, günde 10.000
  calismaBasinaGorsel: 2, // gün boyuna yayılsın
  // Kaliteli model (Vertex AI, 300 $ deneme kredisi, ~0,04 $/görsel): bütün Mersin haberleri
  premiumGunlukGorsel: 65, // Mersin haberleri önce, kalanı önemli Türkiye haberleri
  premiumCalismaBasina: 3,
};
