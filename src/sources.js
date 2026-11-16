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
  // --- Resmî kurumlar ---
  // Valilik ve Büyükşehir'in RSS akışı yok (Kasım 2026'da kontrol edildi).
  // İleride duyuru sayfaları ayrıca okunabilir.

  // --- Yerel siteler (sadece başlık + link) ---
  // Hepsi Mersin haberlerinin yanında ajans kaynaklı ulusal haber de yayınlıyor,
  // bu yüzden 'karma': başlık/özette Mersin, ilçe ya da yerel bir işaret aranır.
  // robots.txt kontrolü: hiçbiri yapay zekâ botlarını engellemiyor; yine de
  // telif güvenliği için özet yazdırmıyoruz (yapayZekaOzeti: false).
  { id: 'imece', ad: 'İmece Gazetesi', url: 'https://www.imecegazetesi.com/rss', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: true },
  { id: 'mersinportal', ad: 'Mersin Portal', url: 'https://www.mersinportal.com/rss', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: true },
  { id: 'mersintime', ad: 'Mersin Time', url: 'https://www.mersintime.com/rss', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: true },
  { id: 'mersinobjektif', ad: 'Mersin Objektif', url: 'https://www.mersinobjektif.com.tr/rss', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: true },
  { id: 'istemersin', ad: "İş'te Mersin", url: 'https://www.istemersin.com/rss', tur: 'rss', kapsam: 'karma', yapayZekaOzeti: false, aktif: true },
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
