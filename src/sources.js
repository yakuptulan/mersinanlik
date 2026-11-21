// Haber kaynakları
//
// kapsam:
//   'yerel'  → sadece Mersin haberi yayınlayan site; filtre gevşek (her haber Mersin sayılır)
//   'ulusal' → Türkiye geneli site; sadece Mersin veya ilçe adı geçen haberler alınır
//   'kurum'  → valilik, belediye gibi resmî kurum duyuruları
//   'karma'  → yerel site ama ulusal ajans haberi de yayınlıyor; Mersin/ilçe/yerel işaret aranır
//
// yapayZekaOzeti:
//   true  → kısa özeti yapay zekâ kendi cümleleriyle yazar (kurum duyuruları, izin veren siteler)
//   false → sadece başlık + kaynak linki gösterilir. robots.txt dosyasında yapay zekâ
//           botlarını engelleyen siteler (ör. Hürriyet) her zaman false olmalı.
//
// aktif: false olan kaynaklar atlanır. Yeni kaynak eklerken önce false ekleyip
// `npm run collect -- --dene <id>` ile deneyin.

export const KAYNAKLAR = [
  // --- Haber ajansları (sadece başlık + link; fotoğraf ve metin kullanılmaz) ---
  {
    id: 'dha-mersin',
    ad: 'DHA',
    tur: 'html',
    liste: 'https://www.dha.com.tr/mersin-haber/',
    linkDesen: 'dha\\.com\\.tr/yerel-haberler/mersin/[a-z]+/[a-z0-9-]+-\\d{6,}$',
    ilceLinkten: true,
    enFazla: 10,
    kapsam: 'yerel',
    yapayZekaOzeti: false,
    fotoKullan: false,
    aktif: true,
  },
  {
    id: 'iha-mersin',
    ad: 'İHA',
    tur: 'html',
    liste: 'https://www.iha.com.tr/mersin-haberleri',
    linkDesen: 'iha\\.com\\.tr/mersin-haberleri/[a-z0-9-]+-\\d{6,}$',
    enFazla: 10,
    kapsam: 'yerel',
    yapayZekaOzeti: false,
    fotoKullan: false,
    aktif: false, // GitHub sunucularına 403 veriyor
  },
  {
    id: 'haberturk-mersin',
    ad: 'Habertürk',
    tur: 'html',
    // Habertürk'ün Mersin sayfası AA, DHA ve İHA'nın geçtiği tüm Mersin haberlerini yayınlıyor (İHA'ya doğrudan erişilemiyor)
    liste: ['https://www.haberturk.com/mersin-haberleri', 'https://www.haberturk.com/mersin-haberleri?page=2'],
    baslikH1: true,
    linkDesen: 'yerel-haberler\\.haberturk\\.com/mersin-haberleri/[a-z0-9-]+-\\d{8,}$',
    enFazla: 24,
    kapsam: 'yerel',
    yapayZekaOzeti: false,
    fotoKullan: false,
    aktif: true,
  },
  {
    id: 'trt-mersin',
    ad: 'TRT Haber',
    tur: 'html',
    liste: 'https://www.trthaber.com/yerelhaberler/mersin/',
    linkDesen: 'trthaber\\.com/haber/[a-z-]+/[a-z0-9-]*(mersin|tarsus|erdemli|silifke|anamur|mezitli|toroslar|yenisehir|akdeniz|gulnar|bozyazi|aydincik|camliyayla|mut)[a-z0-9-]*-\\d{6}\\.html$',
    enFazla: 8,
    kapsam: 'yerel',
    yapayZekaOzeti: false,
    fotoKullan: false,
    aktif: false, // haber listesi sunucudan okunduğunda linkler gelmiyor (Kasım 2026)
  },
  {
    id: 'mersingundem',
    ad: 'Mersin Gündem',
    tur: 'html',
    liste: 'https://mersingundem.com/',
    baslikH1: true,
    linkDesen: 'mersingundem\\.com/haber/\\d+/[a-z0-9-]+\\.html$',
    enFazla: 8,
    kapsam: 'karma',
    yapayZekaOzeti: false,
    fotoKullan: false,
    aktif: true,
  },
  // --- Resmî kurumlar (haber sayfası okunur, fotoğrafı "Foto: Kurum" diye kullanılır) ---
  {
    id: 'mersin-buyuksehir',
    ad: 'Mersin Büyükşehir Belediyesi',
    tur: 'html',
    liste: 'https://www.mersin.bel.tr/haberler',
    linkDesen: '/haber/[a-z0-9-]+-\\d{10}$',
    gorselDesen: '/uploads/images/',
    enFazla: 8,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: true,
  },
  {
    id: 'yenisehir-belediyesi',
    ad: 'Yenişehir Belediyesi',
    tur: 'html',
    liste: 'https://yenisehir.bel.tr/',
    linkDesen: 'yenisehir\\.bel\\.tr/haber/[a-z0-9-]+$',
    enFazla: 8,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: true,
  },
  {
    id: 'tarsus-belediyesi',
    ad: 'Tarsus Belediyesi',
    tur: 'html',
    liste: 'https://www.tarsus.bel.tr/',
    linkDesen: '/haberler/haber/[a-z0-9-]{10,}$',
    gorselDuzelt: ['http://localhost:8080', 'https://www.tarsus.bel.tr'],
    enFazla: 8,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: false, // site haber listesini tarayıcıda sonradan yüklüyor; sunucudan okunamıyor
  },
  {
    id: 'erdemli-belediyesi',
    ad: 'Erdemli Belediyesi',
    tur: 'html',
    liste: 'https://www.erdemli.bel.tr/',
    linkDesen: '/haber/.+-\\d{8}\\.html$',
    gorselDesen: 'uploads/haberler/kapak/',
    gorselKokten: true,
    gorselIlk: true,
    enFazla: 8,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: true,
  },
  {
    id: 'mut-belediyesi',
    ad: 'Mut Belediyesi',
    tur: 'html',
    liste: 'https://mut.bel.tr/',
    linkDesen: 'mut\\.bel\\.tr/haberler/[a-z0-9-]{10,}$',
    gorselDesen: 'storage/thumbnails/',
    gorselIlk: true,
    enFazla: 8,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: true,
  },
  // --- Kasım 2026 eklenen resmî kaynaklar (robots.txt serbest) ---
  {
    id: 'akdeniz-belediyesi',
    ad: 'Akdeniz Belediyesi',
    tur: 'html',
    liste: 'https://www.akdeniz.bel.tr/',
    linkDesen: 'akdeniz\\.bel\\.tr/Default/HaberDetay/\\d+$',
    baslikEtiket: 'h3',
    gorselDesen: '/Upload/haberimg/',
    gorselIlk: true,
    tarihMetinden: true,
    enFazla: 6,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: true,
  },
  {
    id: 'meski-haber',
    ad: 'MESKİ',
    tur: 'html',
    liste: 'https://www.meski.gov.tr/pages/Haberler.xhtml',
    linkDesen: 'meski\\.gov\\.tr/pages/HaberMansetDetay\\.xhtml\\?haberMansetId=\\d+$',
    enFazla: 6,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: false,
  },
  {
    id: 'camliyayla-belediyesi',
    ad: 'Çamlıyayla Belediyesi',
    tur: 'html',
    liste: 'https://www.camliyayla.bel.tr/sayfa/Haberler',
    linkDesen: 'camliyayla\\.bel\\.tr/haber/[a-z0-9-]{8,}/\\d+/?$',
    enFazla: 5,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: false,
  },
  {
    id: 'bozyazi-belediyesi',
    ad: 'Bozyazı Belediyesi',
    tur: 'html',
    liste: 'https://www.bozyazi.bel.tr/sayfa/Haberler',
    linkDesen: 'bozyazi\\.bel\\.tr/haber/[a-z0-9-]{8,}/\\d+/?$',
    enFazla: 5,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: false,
  },
  {
    id: 'ktb-mersin',
    ad: 'Mersin İl Kültür ve Turizm Müdürlüğü',
    tur: 'html',
    liste: 'https://mersin.ktb.gov.tr/TR-477152/2026-yili-haber-arsivi.html',
    linkDesen: 'mersin\\.ktb\\.gov\\.tr/TR-(4[89]\\d{4}|[5-9]\\d{5})/[a-z0-9-]+\\.html$',
    baslikEtiket: 'title',
    enFazla: 5,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: false,
  },
  { id: 'anamur-belediyesi', ad: 'Anamur Belediyesi', url: 'https://anamur.bel.tr/feed/', tur: 'rss', kapsam: 'kurum', yapayZekaOzeti: true, aktif: false },
  {
    id: 'mersin-universitesi',
    ad: 'Mersin Üniversitesi',
    tur: 'html',
    liste: 'https://www.mersin.edu.tr/haberler',
    linkDesen: 'mersin\\.edu\\.tr/tr/haberler/[a-z0-9-]+-n-\\d+$',
    enFazla: 6,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: true,
  },
  {
    id: 'tarim-mersin',
    ad: 'Mersin İl Tarım ve Orman Müdürlüğü',
    tur: 'html',
    liste: 'https://mersin.tarimorman.gov.tr/',
    linkDesen: 'mersin\\.tarimorman\\.gov\\.tr/Haber/\\d+/',
    gorselDesen: '/FotografGalerisi/',
    gorselIlk: true,
    baslikEtiket: 'title',
    tarihMetinden: true,
    enFazla: 5,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: true,
  },
  {
    id: 'mersin-ticaret-borsasi',
    ad: 'Mersin Ticaret Borsası',
    tur: 'html',
    liste: 'https://mersintb.org.tr/haberler',
    linkDesen: 'mersintb\\.org\\.tr/detay-duyuru-haber\\?id=\\d+&TipId=1$',
    enFazla: 5,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    baslikEtiket: 'h2',
    fotoKullan: false, // sitede 'izinsiz kullanılamaz' notu var; sadece metinden kendi haberimizi yazarız
    aktif: false, // GitHub sunucularından bağlantı zaman aşımına uğruyor (Kasım 2026)
  },
  {
    id: 'tarsus-universitesi',
    ad: 'Tarsus Üniversitesi',
    tur: 'html',
    liste: 'https://www.tarsus.edu.tr/Website/Haberler/277/1/tum-haberler',
    linkDesen: 'tarsus\\.edu\\.tr/Website/Haberler/\\d{4,}/1/[^?]+$',
    gorselDesen: '/Images/Uploads/MyContents/\\d',
    baslikEtiket: 'title',
    tarihGorselden: true,
    enFazla: 5,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: true,
  },
  {
    id: 'toros-universitesi',
    ad: 'Toros Üniversitesi',
    tur: 'html',
    liste: 'https://www.toros.edu.tr/guncel-haberler',
    linkDesen: 'toros\\.edu\\.tr/guncel-haberler/[a-z0-9-]{10,}$',
    gorselDesen: '/storage/photos/',
    gorselIlk: true,
    tarihMetinden: true,
    enFazla: 5,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: true,
  },
  {
    id: 'il-saglik',
    ad: 'Mersin İl Sağlık Müdürlüğü',
    tur: 'html',
    liste: 'https://mersinism.saglik.gov.tr/',
    // Ana sayfada sabit sayfalar da var; haberlerin numarası 396000 üstü
    linkDesen: 'mersinism\\.saglik\\.gov\\.tr/TR-(39[6-9]\\d{3}|[4-9]\\d{5})/[a-z0-9-]+\\.html$',
    baslikEtiket: 'title',
    tarihGorselden: true,
    gorselIlk: true,
    // /Resim/<no>/1/ haberin kendi fotoğrafı; /0/ olanlar site geneli duyuru görselleri
    gorselDesen: 'dosyaism\\.saglik\\.gov\\.tr/Resim/\\d+/1/',
    enFazla: 6,
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    fotoKullan: true,
    aktif: true,
  },
  // Denendi (Kasım 2026): Bozyazı ve Çamlıyayla belediyeleri çok seyrek ve metinsiz haber giriyor;
  // MESKİ haber sayfasında başlık bulunamadı; İl Kültür Turizm ana sayfası bakanlık haberleri veriyor.
  // Denendi (Kasım 2026, robots.txt): Valilik, Emniyet, Silifke ve Gülnar belediyeleri, Milliyet, Posta, Google Haberler
  // tüm botları engelliyor; İl Milli Eğitim ve NTV yapay zekâ botlarını engelliyor → kullanılmıyor.
  // Denendi (Kasım 2026): Valilik haber listesi ayrıştırılamadı; Mezitli ve Anamur siteleri
  // içeriği tarayıcıda sonradan yüklüyor; Akdeniz'de haber fotoğrafı bilgisi yok;
  // Toroslar'ın güvenlik sertifikası hatalı; Silifke'de güncel haber yok.

  // --- Yerel siteler (sadece başlık + link) ---
  // Hepsi Mersin haberlerinin yanında ajans kaynaklı ulusal haber de yayınlıyor,
  // bu yüzden 'karma': başlık/özette Mersin, ilçe ya da yerel bir işaret aranır.
  // robots.txt kontrolü: hiçbiri yapay zekâ botlarını engellemiyor; yine de
  // telif güvenliği için özet yazdırmıyoruz (yapayZekaOzeti: false).
  // İmece: GitHub sunucularından gelen isteğe 403 veriyor (bot engeli) → kapalı
  { id: 'imece', ad: 'İmece Gazetesi', url: 'https://www.imecegazetesi.com/rss', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: false },
  { id: 'mersinportal', ad: 'Mersin Portal', url: 'https://www.mersinportal.com/rss', haricDesen: '/(video|foto-galeri)/', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: true },
  { id: 'mersintime', ad: 'Mersin Time', url: 'https://www.mersintime.com/rss', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: true },
  { id: 'mersinobjektif', ad: 'Mersin Objektif', url: 'https://www.mersinobjektif.com.tr/rss', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: true },
  // İş'te Mersin: GitHub sunucularından gelen isteğe 403 veriyor (bot engeli) → kapalı
  { id: 'istemersin', ad: "İş'te Mersin", url: 'https://www.istemersin.com/rss', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: false },
  { id: 'cukurova', ad: 'Çukurova Gazetesi', url: 'https://cukurovagazetesi.com/rss', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: true },
  { id: 'mersinhabermerkezi', ad: 'Mersin Haber Merkezi', url: 'https://www.mersinhabermerkezi.com/rss', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: true },

  // --- Ulusal (sadece başlıkta/özette Mersin geçenler) ---
  { id: 'aa-guncel', ad: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=guncel', tur: 'rss', kapsam: 'ulusal', yapayZekaOzeti: false, aktif: true },
  { id: 'aa-yasam', ad: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=yasam', tur: 'rss', kapsam: 'ulusal', yapayZekaOzeti: false, aktif: true },

  // Denendi, kullanılamadı (Kasım 2026):
  //   mersinhaber.com → Cloudflare bot koruması (403)
  //   mersinhaberci.com, mersinhakimiyet.com, tarsusakdeniz.com, mersinhalkhaber.com,
  //   mersingazetesi.com, mersinizhaber.com → RSS akışı bulunamadı
  //   iha.com.tr → robots.txt yapay zekâ botlarını engelliyor, RSS yok
];

export function aktifKaynaklar() {
  return KAYNAKLAR.filter((k) => k.aktif);
}
