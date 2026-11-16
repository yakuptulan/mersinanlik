// Kısa özetleri Gemini ile yazar. Haberleri tek tek değil, toplu gönderir
// (ücretsiz kotayı ve aylık krediyi verimli kullanmak için).
//
// Ortam değişkenleri: GEMINI_API_KEY, GEMINI_MODEL (varsayılan: gemini-2.5-flash-lite)

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

const TALIMAT = `Sen Mersin'de yayın yapan yerel bir haber sitesinin editörüsün.
Sana numaralı haber metinleri vereceğim. Her biri için Türkçe, tarafsız, 2 cümlelik kısa bir özet yaz.
Kurallar:
- Metni kopyalama, tamamen kendi cümlelerinle yaz.
- Metinde olmayan hiçbir bilgiyi ekleme, yorum katma.
- Kişilerin tam adını yazma; gerekirse görevini yaz (ör. "Büyükşehir Belediye Başkanı").
- Yalnızca JSON döndür: [{"no": 1, "ozet": "..."}, ...]`;

export function geminiHazirMi() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function topluOzetle(metinler) {
  if (!geminiHazirMi() || metinler.length === 0) return [];
  const icerik = metinler.map((m, i) => `${i + 1}) ${m.slice(0, 1500)}`).join('\n\n');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: TALIMAT }] },
      contents: [{ role: 'user', parts: [{ text: icerik }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const yazi = json?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const sonuc = JSON.parse(yazi);
  return metinler.map((_, i) => sonuc.find((s) => Number(s.no) === i + 1)?.ozet || null);
}
