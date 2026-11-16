// "Merak edilenler" (Bilgi) yazıları: Türkçe Vikipedi maddesinden, yapay zekâ desteğiyle kendi cümlelerimizle
// listeli bilgi yazısı. Fotoğraf: maddenin Wikimedia Commons görseli (sadece serbest lisanslılar, künyesiyle).
// Metin Vikipedi'den türetildiği için CC BY-SA 4.0 ile paylaşılır ve kaynak gösterilir.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { jsonYaz } from './gemini.js';
import { slugify, duzMetin } from './text.js';

const UA = 'MersinAnlikBot/1.0 (+https://mersinanlik.com; iletisim@mersinanlik.com)';
const KLASOR = path.resolve('public/bilgi');

async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url.slice(0, 80)}`);
  return r.json();
}

export async function vikipediGetir(baslik) {
  const j = await json(`https://tr.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages|info&explaintext=1&redirects=1&piprop=name&inprop=url&titles=${encodeURIComponent(baslik)}`);
  const s = Object.values(j.query?.pages || {})[0];
  if (!s || s.missing !== undefined) throw new Error(`Vikipedi'de yok: ${baslik}`);
  // Kaynakça, dış bağlantılar vb. bölümleri at
  const metin = String(s.extract || '').split(/\n==\s*(Kaynakça|Kaynaklar|Dış bağlantılar|Ayrıca bakınız|Notlar|Dipnotlar)\s*==/)[0];
  return { baslik: s.title, metin, link: s.fullurl, gorselAdi: s.pageimage || null };
}

const SERBEST = /^(cc[ -]?by(-sa)?( \d\.\d)?|cc0|public domain|kamu malı|pd)/i;
export async function commonsGorsel(dosyaAdi) {
  if (!dosyaAdi || /\.(svg|gif)$/i.test(dosyaAdi)) return null;
  const j = await json(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280&titles=${encodeURIComponent(`File:${dosyaAdi}`)}`);
  const s = Object.values(j.query?.pages || {})[0];
  const ii = s?.imageinfo?.[0];
  if (!ii) return null; // Commons'ta değil (yerel/adil kullanım görseli olabilir): kullanma
  const m = ii.extmetadata || {};
  const lisans = duzMetin(m.LicenseShortName?.value || '');
  if (!SERBEST.test(lisans)) return null;
  return { url: ii.thumburl || ii.url, sayfa: ii.descriptionurl, lisans, yazar: duzMetin(m.Artist?.value || 'Wikimedia Commons').replace(/\s+/g, ' ').trim().slice(0, 80) };
}

const TALIMAT = `Sen bir yerel haber sitesinin "Merak edilenler" köşesinin editörüsün. Okurlar Mersin'de yaşayan, her yaştan insanlar.
Sana bir Vikipedi maddesinin metnini vereceğim. Bu bilgilere dayanarak sade, akıcı ve merak uyandıran bir bilgi yazısı hazırla.
Kurallar:
- SADECE verilen metindeki bilgileri kullan. Metinde olmayan tarih, sayı, isim, iddia EKLEME. Emin olmadığın şeyi yazma.
- Metni kopyalama; tamamen kendi cümlelerinle yaz. Abartılı, yanıltıcı, "şok", "inanamayacaksınız" gibi tık tuzağı ifadeler kullanma.
- Sağlık, tedavi, ilaç, diyet konusunda tavsiye ya da iddia yazma (ör. "faydaları", "iyi gelir" gibi).
- Konu bir kişi, hastalık/tıp, suç, ölüm, felaket ya da siyasi tartışma ise yazı yazma, sadece {"uygun": false} döndür.
- Başlık: Google'da aranacak şekilde net olsun (ör. "Tantuni nedir? Mersin'in meşhur lezzeti hakkında 7 bilgi"). En fazla 90 karakter.
- spot: 1-2 cümle, yazının özeti.
- bolumler: 5-8 madde. Her maddenin kısa bir başlığı ve 2-4 cümlelik metni olsun. Maddeler birbirini tekrar etmesin.
- sss: metinden cevaplanabilen 2-3 soru-cevap (kısa).
- aciklama: arama motoru için 140-155 karakterlik açıklama.
- Yalnızca JSON döndür: {"baslik":"","spot":"","aciklama":"","bolumler":[{"baslik":"","metin":""}],"sss":[{"soru":"","cevap":""}]}`;

export async function bilgiYaz(konu, mevcutSluglar = new Set()) {
  const v = await vikipediGetir(konu.vikipedi);
  if (v.metin.length < 900) throw new Error(`Kaynak metin kısa (${v.metin.length})`);
  const j = await jsonYaz(TALIMAT, `Madde: ${v.baslik}\n\n${v.metin.slice(0, 7000)}`, { sicaklik: 0.5 });
  if (j?.uygun === false) throw new Error('Konu bilgi köşesine uygun değil');
  const bolumler = (j?.bolumler || []).filter((b) => b?.baslik && b?.metin && b.metin.length > 60);
  const kelime = bolumler.map((b) => b.metin).join(' ').split(/\s+/).length;
  if (!j?.baslik || bolumler.length < 4 || kelime < 220) throw new Error(`Yazı yetersiz (${bolumler.length} bölüm, ${kelime} kelime)`);
  let slug = slugify(j.baslik).slice(0, 70).replace(/-+$/, '');
  if (mevcutSluglar.has(slug)) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  let gorsel = null;
  try {
    const g = await commonsGorsel(v.gorselAdi);
    if (g) {
      const r = await fetch(g.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (r.ok) {
        fs.mkdirSync(KLASOR, { recursive: true });
        await sharp(Buffer.from(await r.arrayBuffer())).resize({ width: 1200, height: 675, fit: 'cover' }).webp({ quality: 76 }).toFile(path.join(KLASOR, `${slug}.webp`));
        gorsel = { dosya: `${slug}.webp`, yazar: g.yazar, lisans: g.lisans, sayfa: g.sayfa };
      }
    }
  } catch (e) {
    console.warn(`! Bilgi görseli: ${e.message}`);
  }
  return {
    slug,
    konu: konu.vikipedi,
    ...(konu.trend ? { trend: konu.trend } : {}),
    tur: konu.tur,
    baslik: String(j.baslik).trim().slice(0, 110),
    spot: String(j.spot || '').trim(),
    aciklama: String(j.aciklama || j.spot || '').trim().slice(0, 160),
    bolumler: bolumler.map((b) => ({ baslik: String(b.baslik).trim(), metin: String(b.metin).trim() })),
    sss: (j.sss || []).filter((x) => x?.soru && x?.cevap).slice(0, 3),
    kaynak: { ad: `Vikipedi: ${v.baslik}`, link: v.link },
    gorsel,
    tarih: new Date().toISOString(),
  };
}

// Google'da çok aranan bir konunun Vikipedi maddesini bul (kişiler hariç)
export async function trendMaddesi(terim) {
  const j = await json(`https://tr.wikipedia.org/w/api.php?action=query&format=json&list=search&srlimit=1&srsearch=${encodeURIComponent(terim)}`);
  const baslik = j.query?.search?.[0]?.title;
  if (!baslik) return null;
  const sade = (t) => slugify(t).split('-').filter((k) => k.length > 2);
  const t = sade(terim);
  const b = sade(baslik);
  // Terimin anlamlı kelimelerinin çoğu madde başlığında geçmeli (alakasız eşleşme olmasın)
  if (!t.length || t.filter((k) => b.includes(k)).length < Math.ceil(t.length * 0.6)) return null;
  const p = await json(`https://tr.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&ppprop=wikibase_item|disambiguation&titles=${encodeURIComponent(baslik)}`);
  const sayfa = Object.values(p.query?.pages || {})[0];
  if (!sayfa || sayfa.pageprops?.disambiguation !== undefined) return null;
  const q = sayfa.pageprops?.wikibase_item;
  if (q) {
    const w = await json(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&property=P31&entity=${q}`);
    const turler = (w.claims?.P31 || []).map((c) => c.mainsnak?.datavalue?.value?.id);
    if (turler.includes('Q5')) return null; // insan
  }
  return baslik;
}
