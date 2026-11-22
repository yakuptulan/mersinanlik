// Metin modeli erişim denemesi: aynı istek farklı model/ayarlarla
const T = process.env.VERTEX_TOKEN;
const url = (m) => `https://aiplatform.googleapis.com/v1/projects/mersinanlik/locations/global/publishers/google/models/${m}:generateContent`;
const uzun = 'Mersin haberi. '.repeat(400);
for (const [m, cfg] of [
  ['gemini-3.1-pro-preview', {}],
  ['gemini-3.1-pro-preview', { thinkingConfig: { thinkingLevel: 'low' } }],
  ['gemini-3.1-pro-preview', { responseMimeType: 'application/json' }],
  ['gemini-3.5-flash', { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'low' } }],
]) {
  const r = await fetch(url(m), { method: 'POST', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: 'Kısa cevap ver, JSON: {"cevap": "..."}' }] }, contents: [{ role: 'user', parts: [{ text: uzun + ' Bu metin kaç kelime?' }] }], generationConfig: { temperature: 0.2, ...cfg } }) });
  const t = await r.text();
  console.log(`YOKLA ${m} ${JSON.stringify(cfg)}: HTTP ${r.status} ${r.ok ? JSON.stringify(JSON.parse(t).usageMetadata) : t.slice(0, 260).replace(/\s+/g, ' ')}`);
}
