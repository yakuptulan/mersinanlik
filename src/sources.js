// Haber kaynakları
//
// kapsam:
//   'yerel'  → sadece Mersin haberi yayınlayan site; filtre gevşek (her haber Mersin sayılır)
//   'ulusal' → Türkiye geneli site; sadece Mersin veya ilçe adı geçen haberler alınır
//   'kurum'  → valilik, belediye gibi resmî kurum duyuruları
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
  {
    id: 'mersin-valiligi',
    ad: 'Mersin Valiliği',
    url: 'http://www.mersin.gov.tr/rss',
    tur: 'rss',
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    aktif: false,
  },
  {
    id: 'mersin-buyuksehir',
    ad: 'Mersin Büyükşehir Belediyesi',
    url: 'https://www.mersin.bel.tr/rss',
    tur: 'rss',
    kapsam: 'kurum',
    yapayZekaOzeti: true,
    aktif: false,
  },

  // --- Ulusal siteler (sadece başlık + link) ---
  {
    id: 'aa',
    ad: 'Anadolu Ajansı',
    url: 'https://www.aa.com.tr/tr/rss/default?cat=guncel',
    tur: 'rss',
    kapsam: 'ulusal',
    yapayZekaOzeti: false,
    aktif: false,
  },

  // --- Yerel siteler (sadece başlık + link) ---
  // Kaynak listesi bir sonraki adımda tek tek doğrulanıp doldurulacak.
];

export function aktifKaynaklar() {
  return KAYNAKLAR.filter((k) => k.aktif);
}
