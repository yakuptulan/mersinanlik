// Gezi rehberi: Mersin'in önemli yerleri için tek tek rehber sayfası.
// Metin Vikipedi maddesinden (CC BY-SA) yapay zekâ ile kendi cümlelerimizle yazılır; konum Vikipedi/Wikidata'dan,
// fotoğraf Wikimedia Commons'tan (sadece serbest lisanslı, künyesiyle) alınır. Her çalışmada en fazla 1 yer, günde 4 yer.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { jsonYaz } from './lib/gemini.js';
import { commonsGorsel } from './lib/bilgi.js';
import { GEZI_YERLERI } from './gezi-yerleri.js';



const UA = 'MersinAnlikBot/1.0 (+https://mersinanlik.com; iletisim@mersinanlik.com)';
const DOSYA = path.resolve('data/gezi.json');
const KLASOR = path.resolve('public/gezi');
const GUNLUK = 4;

async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url.slice(0, 80)}`);
  return r.json();
}

async function maddeGetir(viki) {
  const [dil, baslik] = viki.split(/:(.+)/);
  const j = await json(`https://${dil}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=extracts|pageimages|info|coordinates|pageprops&ppprop=wikibase_item&explaintext=1&piprop=name&inprop=url&titles=${encodeURIComponent(baslik)}`);
  const s = j.query?.pages?.[0];
  if (!s || s.missing) throw new Error(`Vikipedi'de yok: ${viki}`);
  const metin = String(s.extract || '').split(/\n==\s*(Kaynakça|Kaynaklar|Dış bağlantılar|Ayrıca bakınız|Notlar|Dipnotlar|References|External links|See also|Notes|Further reading|Bibliography)\s*==/)[0];
  let koord = s.coordinates?.[0] ? { lat: s.coordinates[0].lat, lon: s.coordinates[0].lon } : null;
  const q = s.pageprops?.wikibase_item;
  if (!koord && q) {
    try {
      const w = await json(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&property=P625&entity=${q}`);
      const v = w.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
      if (v) koord = { lat: v.latitude, lon: v.longitude };
    } catch {}
  }
  return { baslik: s.title, dil, metin, link: s.fullurl, gorselAdi: s.pageimage || null, koord };
}

const TALIMAT = `Sen Mersin'de yayın yapan yerel bir haber sitesinin gezi rehberi editörüsün. Okurlar Mersinliler ve şehre gelen ziyaretçiler.
Sana bir yerin Vikipedi maddesini vereceğim (Türkçe ya da İngilizce olabilir). Bu bilgilere dayanarak TÜRKÇE, sade ve davetkâr bir gezi rehberi yazısı hazırla.
KURALLAR:
- SADECE verilen metindeki bilgileri kullan. Metinde olmayan tarih, sayı, ölçü, isim, efsane EKLEME.
- Giriş ücreti, ziyaret saati, otopark, ulaşım hattı, restoran, otel YAZMA (bunlar değişir, biz ayrıca uyarıyoruz).
- Metni kopyalama, tamamen kendi cümlelerinle yaz. Abartı, tık tuzağı yok.
- spot: 1-2 cümle, yeri tanıtan özet.
- bolumler: 3-5 bölüm, sırasıyla: "Burası neresi?", "Kısa tarihçe" (metinde tarih bilgisi varsa), "Neler görülür?" ve metne uygunsa 1-2 ek bölüm. Her bölüm 3-5 cümle.
- ipuclari: metinden çıkan 2-3 kısa ziyaret notu (ör. "Mağaraya merdivenle iniliyor" metinde yazıyorsa). Metinde dayanak yoksa boş liste.
- sss: metinden cevaplanabilen 2-3 kısa soru-cevap.
- aciklama: arama motoru için 140-155 karakter.
Yalnızca JSON döndür: {"spot":"","aciklama":"","bolumler":[{"baslik":"","metin":""}],"ipuclari":[""],"sss":[{"soru":"","cevap":""}]}`;

async function yerYaz(yer) {
  const v = await maddeGetir(yer.viki);
  if (v.metin.length < 700) throw new Error(`Kaynak metin kısa (${v.metin.length})`);
  const j = await jsonYaz(TALIMAT, `Yer: ${yer.ad} (Mersin)\nMadde: ${v.baslik}\n\n${v.metin.slice(0, 8000)}`, { sicaklik: 0.5 });
  const bolumler = (j?.bolumler || []).filter((b) => b?.baslik && b?.metin && b.metin.length > 60);
  const kelime = bolumler.map((b) => b.metin).join(' ').split(/\s+/).length;
  if (bolumler.length < 3 || kelime < 140) throw new Error(`Yazı yetersiz (${bolumler.length} bölüm, ${kelime} kelime)`);
  let gorsel = null;
  try {
    const g = await commonsGorsel(v.gorselAdi);
    if (g) {
      const r = await fetch(g.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (r.ok) {
        fs.mkdirSync(KLASOR, { recursive: true });
        await sharp(Buffer.from(await r.arrayBuffer())).resize({ width: 1200, height: 675, fit: 'cover' }).webp({ quality: 76 }).toFile(path.join(KLASOR, `${yer.slug}.webp`));
        gorsel = { dosya: `${yer.slug}.webp`, yazar: g.yazar, lisans: g.lisans, sayfa: g.sayfa };
      }
    }
  } catch (e) {
    console.warn(`! Gezi görseli: ${e.message}`);
  }
  return {
    slug: yer.slug,
    spot: String(j.spot || '').trim(),
    aciklama: String(j.aciklama || j.spot || '').trim().slice(0, 160),
    bolumler: bolumler.map((b) => ({ baslik: String(b.baslik).trim(), metin: String(b.metin).trim() })),
    ipuclari: (j.ipuclari || []).map((x) => String(x).trim()).filter((x) => x.length > 8).slice(0, 3),
    sss: (j.sss || []).filter((x) => x?.soru && x?.cevap).slice(0, 3),
    koord: v.koord,
    kaynak: { ad: `Vikipedi${v.dil === 'en' ? ' (İngilizce)' : ''}: ${v.baslik}`, link: v.link },
    gorsel,
    tarih: new Date().toISOString(),
  };
}

async function main() {
  let veri = { yerler: [], denenen: {} };
  try {
    veri = { ...veri, ...JSON.parse(fs.readFileSync(DOSYA, 'utf8')) };
  } catch {}
  const zorla = process.argv.includes('--simdi');
  const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const bugunku = veri.yerler.filter((y) => new Date(y.tarih).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }) === bugun).length;
  if (!zorla && bugunku >= GUNLUK) return console.log(`Gezi rehberi: bugün ${bugunku} yer yazıldı.`);
  const yapilan = new Set(veri.yerler.map((y) => y.slug));
  const adet = zorla ? 3 : 1;
  let yazilan = 0;
  for (const yer of GEZI_YERLERI) {
    if (yazilan >= adet) break;
    if (yapilan.has(yer.slug) || (veri.denenen[yer.slug] || 0) >= 2) continue;
    veri.denenen[yer.slug] = (veri.denenen[yer.slug] || 0) + 1;
    try {
      veri.yerler.push(await yerYaz(yer));
      yazilan++;
      console.log('Gezi rehberi yazıldı:', yer.ad);
    } catch (e) {
      console.warn(`! Gezi (${yer.ad}): ${e.message}`);
    }
  }
  fs.writeFileSync(DOSYA, JSON.stringify(veri, null, 1));
  if (!yazilan) console.log('Gezi rehberi: yeni yer yok.');
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => console.error('Gezi hatası:', e.message));
