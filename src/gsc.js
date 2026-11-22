// Google Search Console: son 7 günde Google aramasından gelen tıklamalar (sayfa ve arama sorgusu bazında).
// Giriş: GitHub Actions anahtarsız Google girişiyle (Workload Identity) GSC_TOKEN verir.
// Servis hesabı gsc-okuyucu@mersinanlik.iam.gserviceaccount.com, Search Console'da "Sınırlı" kullanıcıdır.
// Yedek: GSC_ANAHTAR (servis hesabı JSON anahtarı) varsa onunla da çalışır; ikisi de yoksa sessizce atlar.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DOSYA = 'data/gsc.json';
const ham = process.env.GSC_ANAHTAR;
const hazirToken = process.env.GSC_TOKEN;
if (!ham && !hazirToken) {
  console.log('Search Console: anahtar yok, atlandı.');
  process.exit(0);
}
let eski = {};
try {
  eski = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
} catch {}
if (eski.guncelleme && Date.now() - new Date(eski.guncelleme).getTime() < 6 * 36e5 && !process.argv.includes('--simdi')) {
  console.log('Search Console: güncel.');
  process.exit(0);
}
async function tokenAl() {
  if (hazirToken) return { access_token: hazirToken };
  const anahtar = JSON.parse(ham);
  const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
  const simdi = Math.floor(Date.now() / 1000);
  const govde = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: anahtar.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: simdi, exp: simdi + 3600 })}`;
  const imza = crypto.createSign('RSA-SHA256').update(govde).sign(anahtar.private_key, 'base64url');
  return (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${govde}.${imza}` })).json();
}
const tok = await tokenAl();
if (!tok.access_token) {
  console.log('Search Console: giriş yapılamadı:', tok.error_description || tok.error);
  process.exit(0);
}
const gun = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
async function sorgu(mulk, boyut, baslangic, bitis, adet = 25) {
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(mulk)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate: baslangic, endDate: bitis, dimensions: boyut, rowLimit: adet }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `HTTP ${r.status}`);
  return j.rows || [];
}
let mulk = null;
let sonHata = '';
for (const m of ['sc-domain:mersinanlik.com', 'https://mersinanlik.com/', 'https://www.mersinanlik.com/']) {
  try {
    await sorgu(m, ['date'], gun(9), gun(2), 1);
    mulk = m;
    break;
  } catch (e) {
    sonHata = e.message;
  }
}
if (!mulk) {
  console.log('Search Console: mülke erişim yok:', sonHata);
  process.exit(0);
}
// Search Console verisi 2-3 gün gecikmeli gelir
const bas = gun(9), bit = gun(2), oncekiBas = gun(16), oncekiBit = gun(10);
const satir = (r) => ({ ad: r.keys[0], tiklama: r.clicks, gosterim: r.impressions, ctr: Math.round(r.ctr * 1000) / 10, sira: Math.round(r.position * 10) / 10 });
const toplam = async (b, e) => (await sorgu(mulk, [], b, e, 1))[0] || { clicks: 0, impressions: 0 };
const [sayfalar, sorgular, gunluk, buHafta, gecenHafta] = await Promise.all([
  sorgu(mulk, ['page'], bas, bit, 25),
  sorgu(mulk, ['query'], bas, bit, 25),
  sorgu(mulk, ['date'], gun(30), bit, 30),
  toplam(bas, bit),
  toplam(oncekiBas, oncekiBit),
]);
const veri = {
  guncelleme: new Date().toISOString(),
  mulk,
  aralik: { bas, bit },
  toplam: { tiklama: buHafta.clicks, gosterim: buHafta.impressions, oncekiTiklama: gecenHafta.clicks, oncekiGosterim: gecenHafta.impressions },
  sayfalar: sayfalar.map(satir).map((x) => ({ ...x, ad: x.ad.replace(/^https?:\/\/[^/]+/, '') })),
  sorgular: sorgular.map(satir),
  gunluk: gunluk.map((r) => ({ tarih: r.keys[0], tiklama: r.clicks, gosterim: r.impressions })),
};
fs.writeFileSync(DOSYA, JSON.stringify(veri, null, 1));
console.log(`Search Console: 7 günde ${veri.toplam.tiklama} tıklama, ${veri.toplam.gosterim} gösterim`);
