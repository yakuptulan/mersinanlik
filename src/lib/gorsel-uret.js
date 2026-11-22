// Habere özel temsili görseli yapay zekâ ile üretir.
// Öncelik: Cloudflare Workers AI (FLUX.1 schnell, günlük ücretsiz kota), yoksa Gemini.
// Görseller public/uretilen/<haber-id>.webp olarak saklanır ve sitede
// "Temsili · Yapay zekâ" etiketiyle gösterilir. Haber silinince görseli de silinir.
//
// Ortam değişkenleri: GEMINI_API_KEY, GEMINI_GORSEL_MODEL (varsayılan: gemini-2.5-flash-image)
// Maliyet kontrolü: config.js → AYAR.gunlukGorselLimiti

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ILCELER } from '../config.js';
import { jsonYaz } from './gemini.js';
import { yerFotosu } from '../fotolar.js';

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

// Birden fazla hesap kullanılabilir: GEMINI_API_KEY ve GEMINI_API_KEY_2.
// İlkinin kotası/kredisi bitince ikincisine geçilir.
const ANAHTARLAR = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean);
let sira = 0;

const CF_HESAP = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_ANAHTAR = process.env.CLOUDFLARE_API_TOKEN;
const CF_HAZIR = Boolean(CF_HESAP && CF_ANAHTAR) && process.env.GORSEL_SAGLAYICI !== 'gemini';

export function gorselUretimHazirMi() {
  return CF_HAZIR || ANAHTARLAR.length > 0;
}

// ---- Cloudflare Workers AI ----
async function cfCalistir(model, girdi) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_HESAP}/ai/run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_ANAHTAR}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(girdi),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`Cloudflare AI HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).result;
}

const SAHNE_TALIMATI = `You write prompts for an image generator for a Turkish local news website in Mersin, Turkey.
Given a Turkish news headline, describe ONE calm, realistic photo scene (max 45 words, English) that illustrates the TOPIC.
Rules: no real or identifiable people (people only small, from behind or far away); no text, signs, logos or flags; no blood, weapons, violence, injured people or bodies — for accidents/crime use symbolic scenes (emergency lights at a distance, an empty street with police tape, an ambulance parked); no children in negative contexts; nothing political (no party symbols, rallies).
The main subject must clearly show the news topic (e.g. the service, the building type, the vehicles, the activity). Local Mersin details (palm trees, sea, Taurus mountains, citrus orchards) only as background and only when natural — do not default to sea promenades or sunsets. Prefer ordinary daytime light.
Reply with the scene description only.`;

async function cfUret(hikaye) {
  // Sahne tarifini ücretsiz Gemini yazar (Cloudflare kotası sadece görsele harcansın)
  let sahne = hikaye.baslik;
  try {
    const j = await jsonYaz(`${SAHNE_TALIMATI}\nReturn JSON only: {"sahne": "..."}`, `Headline: "${hikaye.baslik}"\nCategory: ${hikaye.kategori}\nPlace: ${ilceMetni(hikaye)}${hikaye.ozet ? `\nSummary (Turkish): ${hikaye.ozet}` : ''}`, { sicaklik: 0.4, sadeceGemini: true });
    if (j?.sahne) sahne = String(j.sahne).trim();
  } catch {}
  const prompt = `${sahne}. Realistic editorial news photograph, natural daylight, wide shot, sharp focus, no text, no letters, no watermark.`;
  const sonuc = await cfCalistir('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 6 });
  if (!sonuc?.image) throw new Error('Görsel dönmedi');
  return { veri: Buffer.from(sonuc.image, 'base64'), prompt };
}

function ilceMetni(hikaye) {
  const adlar = hikaye.ilceler.map((s) => ILCELER.find((i) => i.slug === s)?.ad).filter(Boolean);
  return adlar.length ? `Mersin, ${adlar.join(', ')} district` : hikaye.genel ? 'Turkey' : 'Mersin';
}

export async function gorselUret(hikaye) {
  hikaye.gorselKaynak = 'yz';
  if (CF_HAZIR) {
    const { veri, prompt } = await cfUret(hikaye);
    return kaydet(hikaye, veri, prompt);
  }
  for (;;) {
    try {
      return await tekDeneme(hikaye, ANAHTARLAR[sira]);
    } catch (e) {
      // Kota/kredi bitti ve başka anahtar varsa onunla dene
      if (/HTTP (403|429)/.test(e.message) && sira < ANAHTARLAR.length - 1) {
        sira++;
        continue;
      }
      throw e;
    }
  }
}

async function tekDeneme(hikaye, anahtar) {
  const metin = `${KURALLAR}\n\nHeadline (Turkish): "${hikaye.baslik}"\nTopic category: ${hikaye.kategori}\nLocation: ${ilceMetni(hikaye)}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': anahtar },
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
  return kaydet(hikaye, Buffer.from(parca.inlineData.data, 'base64'));
}

// Kurumun kendi haber fotoğrafını indirip saklar
export async function kurumFotosuIndir(hikaye, url, kaynakAd) {
  const res = await fetch(url, { headers: { 'User-Agent': 'MersinAnlikBot/1.0 (+https://mersinanlik.com)' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Foto HTTP ${res.status}`);
  const dosya = await kaydet(hikaye, Buffer.from(await res.arrayBuffer()));
  hikaye.gorselKaynak = kaynakAd;
  return dosya;
}

async function kaydet(hikaye, veri, prompt = '') {
  fs.mkdirSync(URETILEN_KLASOR, { recursive: true });
  const dosya = `${hikaye.id}.webp`;
  await sharp(veri).resize({ width: 1200, height: 675, fit: 'cover' }).webp({ quality: 74 }).toFile(path.join(URETILEN_KLASOR, dosya));
  if (prompt) hikaye.gorselPrompt = prompt.slice(0, 400);
  return dosya;
}

// Hangi haberlere görsel üretilsin: yayındaki, Mersin haberi, son 12 saat;
// önce çok kaynaklı (önemli) olanlar, sonra en yeniler.
// Ücretsiz kota günde ~40 görsele yetiyor: öncelik birden çok sitenin yazdığı ya da kendi yazımız olan haberler
export function gorselAdaylari(hikayeler, simdi = Date.now()) {
  return hikayeler
    .filter((h) => h.durum === 'yayinda' && !h.gorsel && !h.gorselHatasi && !h.genel && !yerFotosu(h))
    .filter((h) => simdi - new Date(h.ilkGorulme).getTime() < 8 * 36e5)
    .filter((h) => new Set(h.kaynaklar.map((k) => k.ad)).size >= 2 || h.metin || h.trend)
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
  const dikey = path.join(URETILEN_KLASOR, 'dikey');
  if (fs.existsSync(dikey)) {
    const idler = new Set(hikayeler.map((h) => h.id));
    for (const f of fs.readdirSync(dikey)) if (f.endsWith('.webp') && !idler.has(f.replace('.webp', ''))) { fs.unlinkSync(path.join(dikey, f)); n++; }
  }
  return n;
}

// ---------- Kaliteli (ücretli) görsel: Gemini ----------
// Sadece sosyal medyada paylaşılacak ve manşete çıkan haberlerde kullanılır (günlük kota src/sosyal.js'te).
// Anahtar: GEMINI_GORSEL_KEY (faturalandırması açık ayrı proje). Model: GEMINI_PREMIUM_MODEL.
// Öncelik Vertex AI (VERTEX_TOKEN: GitHub'ın anahtarsız Google girişi; Google Cloud deneme kredisi buraya harcanabiliyor),
// yoksa AI Studio anahtarı (GEMINI_GORSEL_KEY).
const PREMIUM_ANAHTAR = process.env.GEMINI_GORSEL_KEY;
const VERTEX_TOKEN = process.env.VERTEX_TOKEN;
const VERTEX_PROJE = process.env.VERTEX_PROJE || 'mersinanlik';
const PREMIUM_MODEL = process.env.GEMINI_PREMIUM_MODEL || 'gemini-2.5-flash-image';
export const DIKEY_KLASOR = path.join(URETILEN_KLASOR, 'dikey');
export const premiumHazirMi = () => Boolean(VERTEX_TOKEN || PREMIUM_ANAHTAR);
export const premiumYolu = () => (VERTEX_TOKEN ? 'vertex' : PREMIUM_ANAHTAR ? 'ai-studio' : null);

async function premiumIste(metin, oran) {
  const vertex = Boolean(VERTEX_TOKEN);
  const url = vertex
    ? `https://aiplatform.googleapis.com/v1/projects/${VERTEX_PROJE}/locations/global/publishers/google/models/${PREMIUM_MODEL}:generateContent`
    : `https://generativelanguage.googleapis.com/v1beta/models/${PREMIUM_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(vertex ? { Authorization: `Bearer ${VERTEX_TOKEN}` } : { 'x-goog-api-key': PREMIUM_ANAHTAR }) },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: metin }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: oran } } }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Gemini görsel HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const parca = json?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!parca) throw new Error(`Görsel dönmedi (${json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason || 'bilinmiyor'})`);
  return Buffer.from(parca.inlineData.data, 'base64');
}

// oran: '16:9' (site ve Facebook) ya da '4:5' (Instagram kartı)
export async function premiumUret(hikaye, oran = '16:9') {
  let sahne = '';
  try {
    const j = await jsonYaz(`${SAHNE_TALIMATI}\nReturn JSON only: {"sahne": "..."}`, `Headline: "${hikaye.baslik}"\nCategory: ${hikaye.kategori}\nPlace: ${ilceMetni(hikaye)}${hikaye.ozet ? `\nSummary (Turkish): ${hikaye.ozet}` : ''}`, { sicaklik: 0.4, sadeceGemini: true });
    if (j?.sahne) sahne = String(j.sahne).trim();
  } catch {}
  const kurallar = oran === '16:9' ? KURALLAR : KURALLAR.replace('horizontal 16:9 composition', 'vertical 4:5 composition with the main subject in the upper two thirds');
  const metin = `${kurallar}\n\nHeadline (Turkish): "${hikaye.baslik}"\nTopic category: ${hikaye.kategori}\nLocation: ${ilceMetni(hikaye)}${sahne ? `\nScene to show: ${sahne}` : ''}\nQuality: high-end professional news photography, sharp detail, true-to-life colors, natural composition.`;
  const veri = await premiumIste(metin, oran);
  if (oran === '16:9') {
    fs.mkdirSync(URETILEN_KLASOR, { recursive: true });
    const dosya = `${hikaye.id}.webp`;
    await sharp(veri).resize({ width: 1200, height: 675, fit: 'cover' }).webp({ quality: 82 }).toFile(path.join(URETILEN_KLASOR, dosya));
    hikaye.gorsel = dosya;
    hikaye.gorselKaynak = 'yz';
    hikaye.gorselKalite = 'premium';
    if (sahne) hikaye.gorselPrompt = sahne.slice(0, 400);
    return path.join(URETILEN_KLASOR, dosya);
  }
  fs.mkdirSync(DIKEY_KLASOR, { recursive: true });
  const yol = path.join(DIKEY_KLASOR, `${hikaye.id}.webp`);
  await sharp(veri).resize({ width: 1080, height: 1350, fit: 'cover' }).webp({ quality: 84 }).toFile(yol);
  hikaye.dikeyGorsel = true;
  return yol;
}
