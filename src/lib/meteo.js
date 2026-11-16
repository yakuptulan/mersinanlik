// Meteorolojik uyarılar: Meteoroloji Genel Müdürlüğü (MGM) bugün/yarın il-ilçe renk kodlu uyarıları.
// Sadece Mersin ilçelerini (MGM merkez kodu 933xx) kapsayan uyarılar alınır.

export const MGM_ILCE = {
  93301: 'akdeniz', 93310: 'anamur', 93307: 'aydincik', 93308: 'bozyazi', 93302: 'erdemli', 93303: 'gulnar',
  93311: 'mezitli', 93304: 'mut', 93305: 'silifke', 93306: 'tarsus', 93312: 'toroslar', 93313: 'yenisehir', 93309: 'camliyayla',
};
export const HADISE = {
  thunderstorm: 'Gök gürültülü sağanak', rain: 'Kuvvetli yağış', snow: 'Kar', wind: 'Kuvvetli rüzgâr', fog: 'Sis',
  hot: 'Aşırı sıcak', cold: 'Aşırı soğuk', ice: 'Buzlanma ve don', avalanche: 'Çığ', dust: 'Toz taşınımı', agricultural: 'Zirai don',
};
const RENKLER = ['red', 'orange', 'yellow'];

export function uyariCoz(liste, gun) {
  const sonuc = [];
  for (const u of liste || []) {
    for (const renk of RENKLER) {
      const ilceler = (u.towns?.[renk] || []).map((k) => MGM_ILCE[k]).filter(Boolean);
      if (!ilceler.length) continue;
      sonuc.push({
        no: u.alertNo,
        gun,
        renk,
        hadiseler: (u.weather?.[renk] || []).map((w) => HADISE[w] || w),
        ilceler: [...new Set(ilceler)],
        metin: String(u.text?.[renk] || '').replace(/\s+/g, ' ').trim(),
        baslangic: u.begin || null,
        bitis: u.end || null,
      });
      break; // aynı uyarının en yüksek rengi yeter
    }
  }
  return sonuc;
}

export async function meteoGetir(ua) {
  const al = async (gun) => {
    const r = await fetch(`https://servis.mgm.gov.tr/web/meteoalarm/${gun}`, { headers: { 'User-Agent': ua, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status} MGM ${gun}`);
    return r.json();
  };
  // Günler birbirinden bağımsız: biri hata verirse diğeri yine alınır; geçici hatada bir kez daha denenir
  const uyarilar = [];
  let basari = 0;
  for (const [gun, ad] of [['today', 'bugun'], ['tomorrow', 'yarin']]) {
    for (let deneme = 0; deneme < 2; deneme++) {
      try {
        uyarilar.push(...uyariCoz(await al(gun), ad));
        basari++;
        break;
      } catch (e) {
        if (deneme) console.warn(`! Meteoroloji (${gun}): ${e.message}`);
        else await new Promise((x) => setTimeout(x, 3000));
      }
    }
  }
  if (!basari) throw new Error('MGM uyarıları alınamadı');
  return { guncelleme: new Date().toISOString(), uyarilar };
}
