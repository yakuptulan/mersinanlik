// Sabah bildirimi aboneliği: tarayıcının push aboneliğini ve seçtiği ilçe/konu tercihlerini KV'ye yazar.
// POST: abone ol / tercihleri güncelle · DELETE: abonelikten çık
const yanit = (veri, durum = 200) => new Response(JSON.stringify(veri), { status: durum, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function anahtar(endpoint) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return 'abone:' + [...new Uint8Array(h)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const temizDizi = (d) => (Array.isArray(d) ? d.filter((x) => typeof x === 'string' && /^[a-z0-9-]{2,40}$/.test(x)).slice(0, 30) : []);

export async function onRequestPost({ request, env }) {
  if (!env.ABONE) return yanit({ hata: 'hazir-degil' }, 503);
  let g;
  try {
    g = await request.json();
  } catch {
    return yanit({ hata: 'gecersiz' }, 400);
  }
  const a = g?.abonelik;
  if (!a || typeof a.endpoint !== 'string' || !/^https:\/\//.test(a.endpoint) || a.endpoint.length > 800 || !a.keys?.p256dh || !a.keys?.auth) return yanit({ hata: 'gecersiz' }, 400);
  const kayit = {
    abonelik: { endpoint: a.endpoint, keys: { p256dh: String(a.keys.p256dh).slice(0, 200), auth: String(a.keys.auth).slice(0, 100) } },
    tercih: { ilce: temizDizi(g.tercih?.ilce), kategori: temizDizi(g.tercih?.kategori) },
    tarih: new Date().toISOString(),
  };
  await env.ABONE.put(await anahtar(a.endpoint), JSON.stringify(kayit));
  return yanit({ tamam: true });
}

export async function onRequestDelete({ request, env }) {
  if (!env.ABONE) return yanit({ hata: 'hazir-degil' }, 503);
  try {
    const g = await request.json();
    if (typeof g?.endpoint === 'string') await env.ABONE.delete(await anahtar(g.endpoint));
  } catch {}
  return yanit({ tamam: true });
}
