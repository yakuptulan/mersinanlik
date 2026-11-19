// Ziyaretçi trafiği: Cloudflare Web Analytics (çerezsiz) verisinden son 7 gün ve önceki 7 gün.
// Toplam sayfa görüntüleme, nereden gelindiği (Google, doğrudan, sosyal medya…) ve Google'dan en çok gelen sayfalar.
// /durum/ raporunda gösterilir. Ek bir anahtar gerekmez (mevcut Cloudflare anahtarı kullanılır).
import fs from 'node:fs';

const hesap = process.env.CLOUDFLARE_ACCOUNT_ID;
const anahtar = process.env.CLOUDFLARE_API_TOKEN;
const DOSYA = 'data/trafik.json';
if (!hesap || !anahtar) {
  console.log('Trafik: Cloudflare bilgisi yok, atlandı.');
  process.exit(0);
}
let eski = {};
try {
  eski = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
} catch {}
if (eski.guncelleme && Date.now() - new Date(eski.guncelleme).getTime() < 3 * 36e5 && !process.argv.includes('--simdi')) {
  console.log('Trafik: güncel.');
  process.exit(0);
}
async function sor(bas, bit, boyut, adet = 30, ekFiltre = '') {
  const sorgu = `query($hesap: String!, $bas: Time!, $bit: Time!) {
  viewer { accounts(filter: { accountTag: $hesap }) {
    rumPageloadEventsAdaptiveGroups(limit: ${adet}, orderBy: [count_DESC], filter: { AND: [{ datetime_geq: $bas }, { datetime_lt: $bit }, { requestHost_like: "%mersinanlik.com" }${ekFiltre}] }) {
      count
      ${boyut ? `dimensions { ${boyut} }` : ''}
    }
  } }
}`;
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${anahtar}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sorgu, variables: { hesap, bas, bit } }),
    signal: AbortSignal.timeout(25000),
  });
  const j = await r.json();
  if (j.errors?.length) throw new Error(j.errors.map((e) => e.message).join('; ').slice(0, 200));
  return j.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];
}
const t = (gunOnce) => new Date(Date.now() - gunOnce * 864e5).toISOString();
const kaynakAdi = (host) => {
  const x = String(host || '').toLowerCase();
  if (!x || x.includes('mersinanlik.com')) return 'Doğrudan / site içi';
  if (/google\./.test(x)) return 'Google';
  if (/bing|yandex|duckduckgo|yahoo/.test(x)) return 'Diğer arama motorları';
  if (/facebook|fb\.|instagram|t\.co|twitter|x\.com|whatsapp|telegram|tiktok|linkedin/.test(x)) return 'Sosyal medya';
  return 'Diğer siteler';
};
try {
  const [buHafta, gecenHafta, kaynaklar, gunluk, googleSayfalar] = await Promise.all([
    sor(t(7), t(0), '', 1),
    sor(t(14), t(7), '', 1),
    sor(t(7), t(0), 'refererHost', 50),
    sor(t(14), t(0), 'date', 20),
    sor(t(7), t(0), 'requestPath', 15, ', { refererHost_like: "%google%" }'),
  ]);
  const kaynak = {};
  for (const k of kaynaklar) kaynak[kaynakAdi(k.dimensions.refererHost)] = (kaynak[kaynakAdi(k.dimensions.refererHost)] || 0) + k.count;
  const veri = {
    guncelleme: new Date().toISOString(),
    toplam: buHafta[0]?.count || 0,
    onceki: gecenHafta[0]?.count || 0,
    kaynaklar: Object.entries(kaynak).map(([ad, sayi]) => ({ ad, sayi })).sort((a, b) => b.sayi - a.sayi),
    gunluk: gunluk.map((g) => ({ tarih: g.dimensions.date, sayi: g.count })).sort((a, b) => a.tarih.localeCompare(b.tarih)),
    googleSayfalar: googleSayfalar.map((g) => ({ yol: String(g.dimensions.requestPath || '/').split('?')[0], sayi: g.count })),
  };
  fs.writeFileSync(DOSYA, JSON.stringify(veri, null, 1));
  console.log(`Trafik: 7 günde ${veri.toplam} görüntüleme (önceki 7 gün ${veri.onceki}); Google'dan ${kaynak.Google || 0}`);
} catch (e) {
  console.warn('! Trafik:', e.message);
}
