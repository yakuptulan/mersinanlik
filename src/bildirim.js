// Sabah bildirimi (Benim Gündemim): abonelere her sabah 08.00'de kişisel kısa özet gönderir.
// Abonelikler Cloudflare KV'de (mersinanlik-bildirim) tutulur; site /api/abone ile yazar.
// VAPID anahtarları da aynı KV'de saklanır (ilk çalışmada üretilir). Açık anahtar data/bildirim.json'a yazılır.
// Cloudflare anahtarının "Workers KV Storage" izni yoksa adım sessizce atlanır.
import fs from 'node:fs';
import webpush from 'web-push';
import { yukle } from './lib/store.js';
import { ILCELER } from './config.js';

const HESAP = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const API = `https://api.cloudflare.com/client/v4/accounts/${HESAP}/storage/kv/namespaces`;
const H = { Authorization: `Bearer ${TOKEN}` };
const DOSYA = 'data/bildirim.json';
const TZ = 'Europe/Istanbul';
const ZORLA = process.argv.includes('--simdi');

async function kv(yol, ayar = {}) {
  const r = await fetch(`${API}${yol}`, { ...ayar, headers: { ...H, ...(ayar.headers || {}) }, signal: AbortSignal.timeout(20000) });
  return r;
}

async function main() {
  if (!HESAP || !TOKEN) return console.log('Bildirim: Cloudflare bilgisi yok, atlandı.');
  let durum = {};
  try {
    durum = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
  } catch {}
  // 1) KV alanı
  const l = await (await kv('?per_page=100')).json();
  if (!l.success) return console.log(`Bildirim: KV izni yok (${l.errors?.[0]?.message}). Cloudflare anahtarına "Workers KV Storage: Edit" izni eklenince çalışır.`);
  let ns = l.result.find((x) => x.title === 'mersinanlik-bildirim');
  if (!ns) ns = (await (await kv('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'mersinanlik-bildirim' }) })).json()).result;
  if (!ns?.id) return console.log('Bildirim: KV alanı oluşturulamadı.');
  // 2) VAPID anahtarları
  let vapid = null;
  const v = await kv(`/${ns.id}/values/vapid`);
  if (v.ok) vapid = JSON.parse(await v.text());
  else {
    const k = webpush.generateVAPIDKeys();
    vapid = { publicKey: k.publicKey, privateKey: k.privateKey };
    await kv(`/${ns.id}/values/vapid`, { method: 'PUT', body: JSON.stringify(vapid) });
    console.log('Bildirim: VAPID anahtarları üretildi.');
  }
  if (durum.publicKey !== vapid.publicKey || durum.kvId !== ns.id) {
    durum = { ...durum, publicKey: vapid.publicKey, kvId: ns.id };
    fs.writeFileSync(DOSYA, JSON.stringify(durum, null, 1));
  }
  // 3) Sabah 08.00–08.59 arası, günde bir kez gönder
  const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
  const saat = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }));
  if (!ZORLA && (saat !== 8 || durum.gonderilen === bugun)) return console.log('Bildirim: gönderim saati değil.');
  webpush.setVapidDetails('mailto:iletisim@mersinanlik.com', vapid.publicKey, vapid.privateKey);
  const anahtarlar = [];
  let imlec = '';
  do {
    const r = await (await kv(`/${ns.id}/keys?prefix=abone:&limit=1000${imlec ? `&cursor=${imlec}` : ''}`)).json();
    anahtarlar.push(...(r.result || []).map((x) => x.name));
    imlec = r.result_info?.cursor || '';
  } while (imlec);
  const veri = yukle();
  const simdi = Date.now();
  const son = veri.hikayeler.filter((x) => x.durum === 'yayinda' && !x.genel && simdi - new Date(x.ilkGorulme).getTime() < 24 * 36e5);
  const kaynakSayisi = (x) => new Set(x.kaynaklar.map((k) => k.ad)).size;
  let gonderilen = 0, silinen = 0;
  for (const ad of anahtarlar) {
    try {
      const kayit = JSON.parse(await (await kv(`/${ns.id}/values/${encodeURIComponent(ad)}`)).text());
      const t = kayit.tercih || {};
      const uygun = son
        .filter((x) => (!t.ilce?.length || !x.ilceler.length || x.ilceler.some((i) => t.ilce.includes(i))) && (!t.kategori?.length || t.kategori.includes(x.kategori)))
        .sort((a, b) => kaynakSayisi(b) - kaynakSayisi(a) || new Date(b.ilkGorulme) - new Date(a.ilkGorulme));
      if (!uygun.length) continue;
      const yer = t.ilce?.length ? t.ilce.map((s) => ILCELER.find((i) => i.slug === s)?.ad).filter(Boolean).slice(0, 2).join(' ve ') : 'Mersin';
      const yuk = JSON.stringify({ baslik: `Günaydın! ${yer} için ${uygun.length} yeni haber`, metin: uygun[0].baslik, url: '/gundemim/', etiket: `gundem-${bugun}` });
      await webpush.sendNotification(kayit.abonelik, yuk, { TTL: 4 * 3600, urgency: 'normal' });
      gonderilen++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await kv(`/${ns.id}/values/${encodeURIComponent(ad)}`, { method: 'DELETE' });
        silinen++;
      } else console.warn(`! Bildirim: ${e.message}`);
    }
  }
  durum.gonderilen = bugun;
  durum.son = { tarih: new Date().toISOString(), abone: anahtarlar.length, gonderilen, silinen };
  fs.writeFileSync(DOSYA, JSON.stringify(durum, null, 1));
  console.log(`Bildirim: ${anahtarlar.length} abone, ${gonderilen} gönderildi, ${silinen} geçersiz silindi.`);
}

main().catch((e) => console.error('Bildirim hatası:', e.message));
