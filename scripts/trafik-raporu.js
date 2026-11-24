// Trafik raporu: Cloudflare ziyaret sayıları (son 7 gün) + Facebook/Instagram gönderi etkileşimi.
// Sadece toplam sayıları yazar.
import fs from 'node:fs';

const CF = process.env.CLOUDFLARE_API_TOKEN;
const HESAP = process.env.CLOUDFLARE_ACCOUNT_ID;
async function cf(sorgu, degiskenler) {
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: `Bearer ${CF}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sorgu, variables: degiskenler }) });
  return r.json();
}
const gun = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

// 1) Alan adı (zone) bul
try {
  const z = await (await fetch('https://api.cloudflare.com/client/v4/zones?name=mersinanlik.com', { headers: { Authorization: `Bearer ${CF}` } })).json();
  const zone = z.result?.[0]?.id;
  console.log('ZONE', zone ? 'bulundu' : `yok (${JSON.stringify(z.errors || '').slice(0, 120)})`);
  if (zone) {
    const s = await cf(`query($z:String!,$a:Date!,$b:Date!){viewer{zones(filter:{zoneTag:$z}){httpRequests1dGroups(limit:10,filter:{date_geq:$a,date_leq:$b},orderBy:[date_ASC]){dimensions{date} sum{requests pageViews} uniq{uniques}}}}}`, { z: zone, a: gun(7), b: gun(0) });
    if (s.errors) console.log('CF_HATA', JSON.stringify(s.errors).slice(0, 200));
    for (const g of s.data?.viewer?.zones?.[0]?.httpRequests1dGroups || []) console.log('GUN', g.dimensions.date, 'tekil', g.uniq.uniques, 'sayfa', g.sum.pageViews, 'istek', g.sum.requests);
  }
} catch (e) { console.log('CF_HATA', e.message); }

// 2) Sosyal medya etkileşimi
const T = process.env.META_TOKEN;
const graph = async (yol) => (await fetch(`https://graph.facebook.com/v23.0${yol}${yol.includes('?') ? '&' : '?'}access_token=${T}`)).json();
try {
  const d = JSON.parse(fs.readFileSync('data/sosyal.json', 'utf8'));
  const hesaplar = await graph('/me/accounts?fields=id,access_token,followers_count,fan_count,instagram_business_account{id,followers_count}');
  const s = hesaplar.data?.[0];
  console.log('FB_TAKIPCI', s?.followers_count, 'FB_BEGENI', s?.fan_count, 'IG_TAKIPCI', s?.instagram_business_account?.followers_count);
  let fb = { n: 0, begeni: 0, yorum: 0, paylasim: 0 };
  for (const g of (d.facebook || []).slice(-30)) {
    if (!g.gonderi) continue;
    const m = await (await fetch(`https://graph.facebook.com/v23.0/${g.gonderi}?fields=reactions.summary(true),comments.summary(true),shares&access_token=${s.access_token}`)).json();
    if (m.error) { console.log('FB_GONDERI_HATA', m.error.message.slice(0, 100)); break; }
    fb.n++; fb.begeni += m.reactions?.summary?.total_count || 0; fb.yorum += m.comments?.summary?.total_count || 0; fb.paylasim += m.shares?.count || 0;
  }
  console.log('FB_GONDERILER', JSON.stringify(fb));
  let ig = { n: 0, begeni: 0, yorum: 0 };
  for (const g of (d.instagram || []).slice(-30)) {
    if (!g.gonderi) continue;
    const m = await graph(`/${g.gonderi}?fields=like_count,comments_count`);
    if (m.error) continue;
    ig.n++; ig.begeni += m.like_count || 0; ig.yorum += m.comments_count || 0;
  }
  console.log('IG_GONDERILER', JSON.stringify(ig));
} catch (e) { console.log('SOSYAL_HATA', e.message); }
