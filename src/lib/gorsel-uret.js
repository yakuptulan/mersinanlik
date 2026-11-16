// Habere özel temsili görseli yapay zekâ ile üretir (Gemini görsel modeli).
// Görseller public/uretilen/<haber-id>.webp olarak saklanır ve sitede
// "Temsili · Yapay zekâ" etiketiyle gösterilir. Haber silinince görseli de silinir.
//
// Ortam değişkenleri: GEMINI_API_KEY, GEMINI_GORSEL_MODEL (varsayılan: gemini-2.5-flash-image)
// Maliyet kontrolü: config.js → AYAR.gunlukGorselLimiti

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ILCELER } from '../config.js';

const MODEL = process.env.GEMINI_GORSEL_MODEL || 'gemini-2.5-flash-image';
export const URETILEN_KLASOR = path.resolve('public/uretilen');

const KURALLAR = `Create a single news-style illustrative image for the Turkish local news headline below.
Rules (must follow):
- Setting: Mersin, a Mediterranean coastal city in southern Turkey (palm trees, sea, Taurus mountains, Turkish street signs without readable text) unless the headline is clearly about somewhere else.
- Show the TOPIC of the news, not a specific real event. Realistic editorial photo style, natural light, horizontal 16:9 composition, no borders.
- Do NOT depict any real, identifiable person (no politicians, officials, celebrities, athletes). People only as anonymous figures: from behind, at a distance, or out of focus.
- NO text, letters, numbers, logos, watermarks, captions or brand names anywhere in the image.
- NO blood, injuries, dead bodies, weapons being used, violence or fear. For accidents, crime or disasters show a calm, symbolic scene instead (e.g. emergency vehicle lights at a distance, police tape on an empty street, an ambulance parked outside a hospital).
- NO children in any sensitive or negative context.
- Nothing political or partisan: no party flags, symbols or rallies with banners.`;

export function gorselUretimHazirMi() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function ilceMetni(hikaye) {
  const adlar = hikaye.ilceler.map((s) => ILCELER.find((i) => i.slug === s)?.ad).filter(Boolean);
  return adlar.length ? `Mersin, ${adlar.join(', ')} district` : hikaye.genel ? 'Turkey' : 'Mersin';
}

export async function gorselUret(hikaye) {
  const metin = `${KURALLAR}\n\nHeadline (Turkish): "${hikaye.baslik}"\nTopic category: ${hikaye.kategori}\nLocation: ${ilceMetni(hikaye)}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: metin }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`Gemini görsel HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const parca = json?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!parca) throw new Error(`Görsel dönmedi (${json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason || 'bilinmiyor'})`);
  fs.mkdirSync(URETILEN_KLASOR, { recursive: true });
  const dosya = `${hikaye.id}.webp`;
  await sharp(Buffer.from(parca.inlineData.data, 'base64'))
    .resize({ width: 800, height: 450, fit: 'cover' })
    .webp({ quality: 74 })
    .toFile(path.join(URETILEN_KLASOR, dosya));
  return dosya;
}

// Hangi haberlere görsel üretilsin: yayındaki, Mersin haberi, son 12 saat;
// önce çok kaynaklı (önemli) olanlar, sonra en yeniler.
export function gorselAdaylari(hikayeler, simdi = Date.now()) {
  return hikayeler
    .filter((h) => h.durum === 'yayinda' && !h.gorsel && !h.gorselHatasi && !h.genel)
    .filter((h) => simdi - new Date(h.ilkGorulme).getTime() < 12 * 36e5)
    .sort((a, b) => b.kaynaklar.length - a.kaynaklar.length || new Date(b.ilkGorulme) - new Date(a.ilkGorulme));
}

// Artık hiçbir habere ait olmayan görselleri siler (7 günü dolan haberler)
export function sahipsizleriSil(hikayeler) {
  if (!fs.existsSync(URETILEN_KLASOR)) return 0;
  const kullanilan = new Set(hikayeler.map((h) => h.gorsel).filter(Boolean));
  let n = 0;
  for (const f of fs.readdirSync(URETILEN_KLASOR)) {
    if (f.endsWith('.webp') && !kullanilan.has(f)) {
      fs.unlinkSync(path.join(URETILEN_KLASOR, f));
      n++;
    }
  }
  return n;
}
