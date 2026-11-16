// En çok okunanlar: Cloudflare Web Analytics (çerezsiz) verisinden son 24 saatin en çok açılan sayfaları.
// API anahtarında "Account Analytics: Read" izni gerekir.

export async function okunanlarGetir() {
  const hesap = process.env.CLOUDFLARE_ACCOUNT_ID;
  const anahtar = process.env.CLOUDFLARE_API_TOKEN;
  if (!hesap || !anahtar) return null;
  const sorgu = `query($hesap: String!, $bas: Time!) {
  viewer { accounts(filter: { accountTag: $hesap }) {
    rumPageloadEventsAdaptiveGroups(limit: 40, orderBy: [count_DESC], filter: { AND: [{ datetime_geq: $bas }, { requestHost_like: "%mersinanlik.com" }] }) {
      count
      dimensions { requestPath }
    }
  } }
}`;
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${anahtar}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sorgu, variables: { hesap, bas: new Date(Date.now() - 24 * 36e5).toISOString() } }),
    signal: AbortSignal.timeout(20000),
  });
  const j = await res.json();
  if (j.errors?.length) throw new Error(j.errors.map((e) => e.message).join('; ').slice(0, 200));
  const satirlar = j.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];
  // Aynı sayfanın / ile ve / olmadan hâllerini birleştir
  const toplam = {};
  for (const s of satirlar) {
    let yol = String(s.dimensions?.requestPath || '/').split('?')[0];
    if (!yol.endsWith('/') && !/\.[a-z0-9]+$/i.test(yol)) yol += '/';
    toplam[yol] = (toplam[yol] || 0) + s.count;
  }
  return {
    guncelleme: new Date().toISOString(),
    liste: Object.entries(toplam)
      .map(([yol, sayi]) => ({ yol, sayi }))
      .sort((a, b) => b.sayi - a.sayi),
  };
}

const SABIT = {
  '/piyasalar/': 'Altın, döviz ve Bitcoin fiyatları',
  '/nobetci-eczane/': 'Bugün nöbetçi eczaneler',
  '/kesintiler/': 'Su ve elektrik kesintileri',
  '/hava-durumu/': 'Mersin hava durumu',
  '/deprem/': 'Son depremler',
  '/namaz-vakitleri/': 'Namaz vakitleri',
  '/akaryakit-fiyatlari/': 'Akaryakıt fiyatları',
  '/spor/': 'Spor: Mersin takımları ve Süper Lig',
  '/etkinlikler/': "Bu hafta Mersin'de",
  '/burclar/': 'Günlük burç yorumları',
  '/tatil-takvimi/': 'Okul ve resmî tatil takvimi',
  '/rehber/gezilecek-yerler/': "Mersin'de gezilecek yerler",
  '/rehber/acil-telefonlar/': 'Acil telefon numaraları',
  '/rehber/hastaneler/': 'Mersin hastaneleri',
};

// Yolları sitede gösterilecek başlıklara çevirir (ana sayfa ve teknik sayfalar hariç)
export function okunanlarEsle(okunanlar, hikayeler, haberYolu, ilceler, enFazla = 5) {
  const haberler = new Map(hikayeler.filter((x) => x.metin || x.ozet).map((x) => [haberYolu(x), x.baslik]));
  const sonuc = [];
  for (const { yol, sayi } of okunanlar?.liste || []) {
    let baslik = haberler.get(yol) || SABIT[yol];
    const ilce = yol.match(/^\/ilce\/([a-z]+)\/$/)?.[1];
    if (!baslik && ilce) baslik = `${ilceler.find((i) => i.slug === ilce)?.ad || ilce} haberleri`;
    const nIlce = yol.match(/^\/namaz-vakitleri\/([a-z]+)\/$/)?.[1];
    if (!baslik && nIlce) baslik = `${ilceler.find((i) => i.slug === nIlce)?.ad || nIlce} namaz vakitleri`;
    if (baslik) sonuc.push({ yol, baslik, sayi });
    if (sonuc.length === enFazla) break;
  }
  return sonuc;
}
