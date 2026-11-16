// Kısa özetleri Gemini ile yazar. Haberleri tek tek değil, toplu gönderir
// (ücretsiz kotayı ve aylık krediyi verimli kullanmak için).
//
// Ortam değişkenleri: GEMINI_API_KEY, GEMINI_MODEL (varsayılan: gemini-3.5-flash-lite)

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
// Model yoğunsa (503) sırayla bunlar denenir
const YEDEK_MODELLER = [MODEL, 'gemini-flash-lite-latest', 'gemini-flash-latest'];
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const TALIMAT = `Sen Mersin'de yayın yapan yerel bir haber sitesinin editörüsün.
Sana numaralı haber metinleri vereceğim (çoğu belediye/kurum basın duyurusu). Her biri için iki şey yaz:
1) "ozet": Türkçe, tarafsız, 2 cümlelik kısa özet.
2) "metin": Metin yeterince bilgi içeriyorsa (en az 4-5 cümlelik bilgi), 3 paragraflık, 120-220 kelimelik kısa bir haber yazısı.
   Paragrafları "\n\n" ile ayır. İlk paragraf ne, nerede, ne zaman sorularını cevaplasın. Bilgi azsa "metin" boş ("") olsun.
Kurallar:
- Metni kopyalama, tamamen kendi cümlelerinle yaz; kurumun övgü ve slogan dilini kullanma, haber diliyle yaz.
- Metinde olmayan hiçbir bilgiyi ekleme, yorum katma, tahmin yürütme.
- Kişilerin tam adını yazma; gerekirse görevini yaz (ör. "Büyükşehir Belediye Başkanı").
- Yalnızca JSON döndür: [{"no": 1, "ozet": "...", "metin": "..."}, ...]`;

const cfHazir = () => Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);

export function geminiHazirMi() {
  return Boolean(process.env.GEMINI_API_KEY) || cfHazir();
}

// Yanıttaki JSON dizisini çıkar (model bazen ```json ... ``` ile sarar)
function jsonDizisi(yazi) {
  const t = String(yazi || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  const bas = t.indexOf('[');
  const son = t.lastIndexOf(']');
  return JSON.parse(bas >= 0 && son > bas ? t.slice(bas, son + 1) : t);
}

// Yedek: Cloudflare Workers AI (ücretsiz günlük kota)
async function cfYaz(icerik) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/google/gemma-3-12b-it`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: TALIMAT }, { role: 'user', content: icerik }], max_tokens: 3500, temperature: 0.2 }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Cloudflare AI HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const r = (await res.json()).result?.response;
  return typeof r === 'string' ? jsonDizisi(r) : r;
}

function sonucCoz(metinler, sonuc) {
  return metinler.map((_, i) => {
    const s = (sonuc || []).find((x) => Number(x.no) === i + 1);
    return s?.ozet ? { ozet: String(s.ozet).trim(), metin: String(s.metin || '').trim() || null } : null;
  });
}

export async function topluOzetle(metinler) {
  if (!geminiHazirMi() || metinler.length === 0) return [];
  const icerik = metinler.map((m, i) => `${i + 1}) ${m.slice(0, 4000)}`).join('\n\n');
  if (!process.env.GEMINI_API_KEY) return sonucCoz(metinler, await cfYaz(icerik));
  let res;
  let sonHata = '';
  for (const model of [...new Set(YEDEK_MODELLER)]) {
    for (let deneme = 0; deneme < 2; deneme++) {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: TALIMAT }] },
          contents: [{ role: 'user', parts: [{ text: icerik }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      });
      if (res.ok) break;
      sonHata = `${model} HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`;
      if (![429, 500, 503].includes(res.status)) break; // 404 vb. → sıradaki model
      await bekle(4000);
    }
    if (res.ok) break;
  }
  if (!res.ok) {
    if (!cfHazir()) throw new Error(`Gemini ${sonHata}`);
    console.warn(`! Gemini yoğun (${sonHata.slice(0, 60)}…), Cloudflare ile yazılıyor`);
    return sonucCoz(metinler, await cfYaz(icerik));
  }
  const json = await res.json();
  return sonucCoz(metinler, jsonDizisi(json?.candidates?.[0]?.content?.parts?.[0]?.text || '[]'));
}
