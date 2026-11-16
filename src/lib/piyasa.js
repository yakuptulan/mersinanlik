// Piyasa verileri: altın, gümüş, döviz, borsa (Truncgil Finans) ve Bitcoin (CoinGecko).
// İki kaynak da tarayıcıdan da okunabiliyor (CORS açık); sitede sayfa açıkken
// public/app.js fiyatları dakikada bir tazeler. Burada sayfa üretimi için anlık görüntü alınır.

export const TRUNCGIL = 'https://finans.truncgil.com/v4/today.json';
export const COINGECKO = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=try,usd&include_24hr_change=true';

// Sitede gösterilen kalemler (sıra önemli). k: Truncgil anahtarı
export const KALEMLER = [
  { kod: 'gram', ad: 'Gram altın', k: 'GRA' },
  { kod: 'ceyrek', ad: 'Çeyrek altın', k: 'CEYREKALTIN' },
  { kod: 'gumus', ad: 'Gümüş (gr)', k: 'GUMUS' },
  { kod: 'usd', ad: 'Dolar', k: 'USD' },
  { kod: 'eur', ad: 'Euro', k: 'EUR' },
  { kod: 'btc', ad: 'Bitcoin', k: null },
  { kod: 'bist', ad: 'BIST 100', k: 'XU100' },
];

// Ayrıntı sayfasında gösterilen ek altın türleri
export const ALTINLAR = [
  ['GRA', 'Gram altın'], ['CEYREKALTIN', 'Çeyrek altın'], ['YARIMALTIN', 'Yarım altın'], ['TAMALTIN', 'Tam altın'],
  ['CUMHURIYETALTINI', 'Cumhuriyet altını'], ['ATAALTIN', 'Ata altın'], ['RESATALTIN', 'Reşat altın'], ['YIA', '22 ayar bilezik (gr)'],
  ['18AYARALTIN', '18 ayar altın (gr)'], ['14AYARALTIN', '14 ayar altın (gr)'], ['HAS', 'Has altın (gr)'], ['GUMUS', 'Gümüş (gr)'],
];
export const DOVIZLER = [['USD', 'ABD doları'], ['EUR', 'Euro'], ['GBP', 'İngiliz sterlini'], ['CHF', 'İsviçre frangı'], ['SAR', 'Suudi riyali'], ['RUB', 'Rus rublesi']];

const sayi = (v) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/\./g, '').replace(',', '.')));

export function truncgilCoz(j) {
  const kalem = (k) => {
    const v = j?.[k];
    if (!v) return null;
    const fiyat = sayi(v.Selling) || sayi(v.Buying);
    if (!fiyat) return null;
    return { alis: sayi(v.Buying) || null, satis: fiyat, degisim: sayi(v.Change) || 0 };
  };
  const tablo = (liste) => liste.map(([k, ad]) => ({ k, ad, ...kalem(k) })).filter((x) => x.satis);
  return {
    kalemler: Object.fromEntries(KALEMLER.filter((x) => x.k).map((x) => [x.kod, kalem(x.k)]).filter(([, v]) => v)),
    altinlar: tablo(ALTINLAR),
    dovizler: tablo(DOVIZLER),
    kaynakSaati: j?.Update_Date || null,
  };
}

export function coingeckoCoz(j) {
  const b = j?.bitcoin;
  if (!b?.try) return null;
  return { satis: b.try, usd: b.usd, degisim: Number((b.try_24h_change || 0).toFixed(2)) };
}

export async function piyasaGetir(ua) {
  const al = async (u) => {
    const r = await fetch(u, { headers: { 'User-Agent': ua, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
    return r.json();
  };
  const sonuc = truncgilCoz(await al(TRUNCGIL));
  try {
    const btc = coingeckoCoz(await al(COINGECKO));
    if (btc) sonuc.kalemler.btc = btc;
  } catch (e) {
    console.warn('! Bitcoin:', e.message);
  }
  return { guncelleme: new Date().toISOString(), ...sonuc };
}
