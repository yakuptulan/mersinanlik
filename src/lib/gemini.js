// Kısa özetleri Gemini ile yazar. Haberleri tek tek değil, toplu gönderir
// (ücretsiz kotayı ve aylık krediyi verimli kullanmak için).
//
// Ortam değişkenleri: GEMINI_API_KEY, GEMINI_MODEL (varsayılan: gemini-3.5-flash-lite)

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
// Model yoğunsa (503) sırayla bunlar denenir
const YEDEK_MODELLER = [MODEL, 'gemini-flash-lite-latest', 'gemini-flash-latest'];
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const TALIMAT = `Sen Mersin'de yayın yapan yerel bir haber sitesinin editörüsün.
Sana numaralı haberler vereceğim. Her birinde başlık ve kaynak metni var; bazılarında aynı olayı anlatan iki kaynağın metni ([Kaynak 1], [Kaynak 2]) birlikte verilir. Her biri için:
1) "ozet": Türkçe, tarafsız, 2 cümlelik kısa özet.
2) "metin": Metin yeterince bilgi içeriyorsa (en az 4-5 cümlelik bilgi), 3-4 paragraflık, 140-260 kelimelik bir haber yazısı.
   Paragrafları "\n\n" ile ayır. İlk paragraf ne, nerede, ne zaman sorularını cevaplasın. Bilgi azsa "metin" boş ("") olsun.
Kurallar:
- Metni kopyalama; cümle yapısını da taklit etme, tamamen kendi cümlelerinle, sade haber diliyle yaz. Birden fazla kaynak varsa bilgileri birleştir.
- Metinde olmayan hiçbir bilgiyi ekleme, yorum katma, tahmin yürütme. Kaynaklar çelişiyorsa çelişen ayrıntıyı yazma.
- Kurum duyurularındaki övgü ve slogan dilini kullanma.
- "Muhabirimiz", "DHA", "İHA", "AA", "haber merkezi", "sitemize" gibi kaynak sitenin kendisine ait ifadeleri kullanma.
- Suç, kaza ve adli olaylarda kişilerin tam adını yazma (baş harfleri kullanılabilir); resmî görevlileri görevleriyle an.
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
const CF_MODELLER = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/google/gemma-3-12b-it'];
async function cfYaz(icerik) {
  let sonHata = '';
  for (const model of CF_MODELLER) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: TALIMAT }, { role: 'user', content: icerik }], max_tokens: 1800, temperature: 0.2 }),
      signal: AbortSignal.timeout(100000),
    });
    if (!res.ok) {
      sonHata += ` | ${model} HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`;
      continue;
    }
    const r = (await res.json()).result?.response;
    try {
      return typeof r === 'string' ? jsonDizisi(r) : r;
    } catch {
      sonHata += ` | ${model}: JSON okunamadı: ${String(typeof r === 'string' ? r : JSON.stringify(r)).slice(0, 200)}`;
    }
  }
  throw new Error(`Cloudflare AI ${sonHata}`);
}

// Cloudflare ile yazarken küçük parçalar halinde gönder (zaman aşımı olmasın, kısmi başarı kaybolmasın)
async function cfToplu(metinler) {
  const sonuc = [];
  for (let i = 0; i < metinler.length; i += 2) {
    const parca = metinler.slice(i, i + 2);
    try {
      const r = sonucCoz(parca, await cfYaz(parca.map((m, j) => `${j + 1}) ${m.slice(0, 2500)}`).join('\n\n')));
      sonuc.push(...r);
    } catch (e) {
      console.warn(`! Cloudflare yazım: ${e.message.slice(0, 700)}`);
      sonuc.push(...parca.map(() => null));
    }
  }
  return sonuc;
}

function sonucCoz(metinler, sonuc) {
  return metinler.map((_, i) => {
    const s = (sonuc || []).find((x) => Number(x.no) === i + 1);
    return s?.ozet ? { ozet: String(s.ozet).trim(), metin: String(s.metin || '').trim() || null } : null;
  });
}

export async function topluOzetle(metinler) {
  if (!geminiHazirMi() || metinler.length === 0) return [];
  const icerik = metinler.map((m, i) => `${i + 1}) ${m.slice(0, 6500)}`).join('\n\n');
  if (!process.env.GEMINI_API_KEY) return cfToplu(metinler);
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
    return cfToplu(metinler);
  }
  const json = await res.json();
  return sonucCoz(metinler, jsonDizisi(json?.candidates?.[0]?.content?.parts?.[0]?.text || '[]'));
}

// Genel amaçlı: talimat + içerik → JSON (dizi ya da nesne). Önce Gemini, olmazsa Cloudflare.
export async function jsonYaz(talimat, icerik, { sicaklik = 0.7 } = {}) {
  const cozum = (t) => {
    const s = String(t || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const ilk = Math.min(...['[', '{'].map((c) => (s.indexOf(c) < 0 ? Infinity : s.indexOf(c))));
    const son = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'));
    return JSON.parse(ilk !== Infinity && son > ilk ? s.slice(ilk, son + 1) : s);
  };
  let hata = '';
  if (process.env.GEMINI_API_KEY) {
    for (const model of [...new Set(YEDEK_MODELLER)]) {
      for (let deneme = 0; deneme < 2; deneme++) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: talimat }] },
            contents: [{ role: 'user', parts: [{ text: icerik }] }],
            generationConfig: { temperature: sicaklik, responseMimeType: 'application/json' },
          }),
        });
        if (res.ok) {
          try {
            return cozum((await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text);
          } catch (e) {
            hata += ` | ${model}: JSON okunamadı`;
            break;
          }
        }
        hata += ` | ${model} HTTP ${res.status}`;
        if (![429, 500, 503].includes(res.status)) break;
        await bekle(4000);
      }
    }
  }
  if (cfHazir()) {
    for (const model of CF_MODELLER) {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: talimat }, { role: 'user', content: icerik }], max_tokens: 2500, temperature: sicaklik }),
        signal: AbortSignal.timeout(100000),
      });
      if (!res.ok) {
        hata += ` | ${model} HTTP ${res.status}`;
        continue;
      }
      const r = (await res.json()).result?.response;
      try {
        return typeof r === 'string' ? cozum(r) : r;
      } catch {
        hata += ` | ${model}: JSON okunamadı`;
      }
    }
  }
  throw new Error(`Yazım başarısız${hata}`);
}
