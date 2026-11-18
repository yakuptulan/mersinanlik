// Konu sayfaları: Mersin'de tekrar tekrar gündeme gelen başlıklar.
// Bir konunun sayfası, canlı liste + arşivde en az 3 haber olunca açılır.
// Desen kelime başında aranır ("aşı" → "taşıma"ya, "liman" → "kalimanı"na takılmaz)
const kelime = (alternatifler) => new RegExp(`(?<![a-zçğıöşüâîû])(${alternatifler})`, 'i');

export const KONULAR = [
  { slug: 'buyuksehir-belediyesi', ad: 'Mersin Büyükşehir Belediyesi', desen: kelime(`büyükşehir`), giris: 'Mersin Büyükşehir Belediyesi\'nin hizmetleri, meclis kararları, yol ve altyapı çalışmalarıyla ilgili haberler.' },
  { slug: 'liman-ve-denizcilik', ad: 'Liman ve denizcilik', desen: kelime(`mersin limanı|limanı'?n?|taşucu|gemi|denizcilik|feribot`), giris: 'Mersin Limanı, Taşucu ve denizcilikle ilgili gelişmeler.' },
  { slug: 'hizli-tren', ad: 'Hızlı tren ve demiryolu', desen: kelime(`hızlı tren|demiryolu|tren hattı|tren sefer`), giris: 'Mersin–Adana–Gaziantep hızlı tren hattı ve demiryolu çalışmalarıyla ilgili haberler.' },
  { slug: 'metro', ad: 'Mersin Metrosu', desen: kelime(`metro\b|metrosu`), giris: 'Mersin Metrosu projesindeki gelişmeler.' },
  { slug: 'akkuyu', ad: 'Akkuyu Nükleer Santrali', desen: kelime(`akkuyu|nükleer santral`), giris: 'Gülnar\'daki Akkuyu Nükleer Santrali ile ilgili haberler.' },
  { slug: 'havalimani', ad: 'Çukurova Havalimanı', desen: kelime(`havalimanı|havaalanı`), giris: 'Çukurova Uluslararası Havalimanı ile ilgili haberler. Güncel uçuşlar için ulaşım sayfasına bakabilirsiniz.' },
  { slug: 'yeni-mersin-idmanyurdu', ad: 'Yeni Mersin İdmanyurdu', desen: kelime(`yeni mersin idman ?yurdu|mersin idman ?yurdu|mersin İY`), giris: 'Yeni Mersin İdmanyurdu\'nun maçları, transferleri ve kulüp haberleri.' },
  { slug: 'tarsus-idman-yurdu', ad: 'Tarsus İdman Yurdu', desen: kelime(`tarsus idman ?yurdu`), giris: 'Tarsus İdman Yurdu\'nun maçları ve kulüp haberleri.' },
  { slug: 'tarim-ve-narenciye', ad: 'Tarım ve narenciye', desen: kelime(`tarım|çiftçi|hasat|narenciye|limon|portakal|mandalina|turunçgil|sera\b|zeytin|muz\b|üretici`), giris: 'Mersin\'in tarımı, narenciye hasadı, sera üretimi ve çiftçileri ilgilendiren haberler.' },
  { slug: 'turizm', ad: 'Turizm', desen: kelime(`turizm|turist|kızkalesi|cennet cehennem|tatilci|otel`), giris: 'Mersin\'de turizm, tarihi ve doğal güzellikler, tatil bölgeleriyle ilgili haberler.' },
  { slug: 'universiteler', ad: 'Üniversiteler', desen: kelime(`üniversite`), giris: 'Mersin, Tarsus, Toros ve Çağ üniversitelerinden haberler.' },
  { slug: 'egitim', ad: 'Okullar ve eğitim', desen: kelime(`okul|öğrenci|öğretmen|eğitim`), giris: 'Mersin\'deki okullar, öğrenciler ve eğitimle ilgili haberler.' },
  { slug: 'saglik', ad: 'Sağlık', desen: kelime(`hastane|sağlık|doktor|hekim|aşı(sı|ları|lama)?(?![a-zçğıöşü])`), giris: 'Mersin\'deki hastaneler ve sağlık hizmetleriyle ilgili haberler.' },
  { slug: 'kultur-sanat', ad: 'Kültür ve sanat', desen: kelime(`festival|konser|tiyatro|sergi|sinema|opera(sı)?(?![a-zçğıöşü])|bale(?![a-zçğıöşü])|kitap|müze`), giris: 'Mersin\'deki festivaller, konserler, tiyatro ve sergiler.' },
  { slug: 'ekonomi-ve-sanayi', ad: 'Ekonomi ve sanayi', desen: kelime(`ihracat|sanayi|osb|fabrika|yatırım|esnaf|ticaret`), giris: 'Mersin ekonomisi, ihracat, sanayi ve esnafla ilgili haberler.' },
  { slug: 'trafik-kazalari', ad: 'Trafik kazaları', desen: kelime(`kaza(da|sı|ya|lar|ları)?(?![a-zçğıöşü])|çarpış|devril|şarampol`), giris: 'Mersin ve ilçelerinde yaşanan trafik kazaları.' },
  { slug: 'yanginlar', ad: 'Yangınlar', desen: kelime(`yangın`), giris: 'Mersin\'de orman, ev ve iş yeri yangınları.' },
  { slug: 'sokak-hayvanlari', ad: 'Sokak hayvanları', desen: kelime(`sokak hayvan|sahipsiz|köpek|kedi|hayvan barına`), giris: 'Sokak hayvanları, barınaklar ve hayvan hakları ile ilgili haberler.' },
  { slug: 'deprem', ad: 'Deprem', desen: kelime(`deprem`), giris: 'Mersin ve çevresindeki depremlerle ilgili haberler. Anlık deprem listesi için deprem sayfasına bakabilirsiniz.' },
];

// Sadece başlığa bakılır; özetteki yan bilgiler haberi yanlış konuya sokmasın
export const konuBul = (x) => KONULAR.filter((k) => k.desen.test(x.baslik));
