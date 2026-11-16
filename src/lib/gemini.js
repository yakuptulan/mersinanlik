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

export function geminiHazirMi() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function topluOzetle(metinler) {
  if (!geminiHazirMi() || metinler.length === 0) return [];
  const icerik = metinler.map((m, i) => `${i + 1}) ${m.slice(0, 4000)}`).join('\n\n');
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
  if (!res.ok) throw new Error(`Gemini ${sonHata}`);
  const json = await res.json();
  const yazi = json?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const sonuc = JSON.parse(yazi);
  return metinler.map((_, i) => {
    const s = sonuc.find((x) => Number(x.no) === i + 1);
    return s?.ozet ? { ozet: s.ozet.trim(), metin: (s.metin || '').trim() || null } : null;
  });
}
