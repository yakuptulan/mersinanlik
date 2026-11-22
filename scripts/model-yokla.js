// Vertex AI'da hangi modellerin açık olduğunu dener (metin: kısa istek; görsel: ilk başarılıda durur).
const T = process.env.VERTEX_TOKEN;
const url = (m) => `https://aiplatform.googleapis.com/v1/projects/mersinanlik/locations/global/publishers/google/models/${m}:generateContent`;
async function dene(m, govde) {
  const r = await fetch(url(m), { method: 'POST', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' }, body: JSON.stringify(govde), signal: AbortSignal.timeout(120000) });
  const t = await r.text();
  let kullanim = '';
  try { kullanim = JSON.stringify(JSON.parse(t).usageMetadata); } catch {}
  console.log(`${m}: HTTP ${r.status} ${r.ok ? kullanim : t.slice(0, 140).replace(/\s+/g, ' ')}`);
  return r.ok;
}
const metin = { contents: [{ role: 'user', parts: [{ text: 'Mersin hangi bölgede? Tek cümle.' }] }] };
for (const m of ['gemini-3.1-pro', 'gemini-3.1-pro-preview', 'gemini-3.5-pro-preview', 'gemini-pro-latest', 'gemini-3.5-flash']) await dene(m, metin);
if (process.env.GORSEL_YOKLA) {
const gorsel = { contents: [{ role: 'user', parts: [{ text: 'A calm photo of palm trees on a Mediterranean promenade, no text.' }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '4:5' } } };
for (const m of ['gemini-3.5-pro-image', 'gemini-3-pro-image', 'gemini-3-pro-image-preview', 'gemini-3.5-flash-image', 'gemini-3-flash-image']) if (await dene(m, gorsel)) break;
}
