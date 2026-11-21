// Gol krallığındaki oyuncular için telifsiz (özgür lisanslı) fotoğraf bulur:
//   Wikidata'da oyuncuyu adıyla arar, futbolcu olduğunu ve kulübünün TFF'deki kulüple eşleştiğini doğrular,
//   kayıtlı fotoğrafını (P18) Wikimedia Commons'tan lisansını kontrol ederek indirir.
// Sadece CC0 / kamu malı / CC BY / CC BY-SA kabul edilir (NC ve ND yok). Fotoğrafçı ve lisans kaydedilir,
// /gorsel-kaynaklari/ sayfasında ve fotoğrafın üzerinde (title) gösterilir.
// Çıktı: data/oyuncu-foto.json + public/oyuncu/<Q-numarası>.webp

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const UA = 'MersinAnlikBot/1.0 (https://mersinanlik.com; iletisim@mersinanlik.com)';
const VERI = path.resolve('data/oyuncu-foto.json');
const KLASOR = path.resolve('public/oyuncu');
const TEKRAR_GUN = 14; // bulunamayanlar bu kadar gün sonra yeniden denenir
const FUTBOLCU = 'Q937857';

fs.mkdirSync(KLASOR, { recursive: true });
const kayit = (() => { try { return JSON.parse(fs.readFileSync(VERI, 'utf8')); } catch { return {}; } })();
const servis = JSON.parse(fs.readFileSync('data/servisler.json', 'utf8'));
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const getir = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};
const wd = (p) => getir(`https://www.wikidata.org/w/api.php?format=json&${new URLSearchParams(p)}`);

// TFF adı büyük harf: "VICTOR JAMES OSIMHEN" → aramalar: "Victor Osimhen", "Victor James Osimhen"
const buyukHarf = (s) => s.toLocaleLowerCase('en').replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase('en'));
function aramalar(ad) {
  const k = ad.split(/\s+/).filter(Boolean);
  const l = [k.length > 3 ? `${k[0]} ${k[1]}` : `${k[0]} ${k[k.length - 1]}`, k.join(' ')];
  if (k.length > 2) l.push(`${k[0]} ${k[k.length - 1]}`, k[k.length - 1]);
  return [...new Set(l.map((x) => buyukHarf(x.replace(/İ/g, 'I'))))];
}
// Kulüp eşleştirme: sponsor ve genel sözcükler atılır, kalan anlamlı sözcüklerden biri ötekinin başı olmalı
const GENEL = new Set(['istanbul', 'belediye', 'belediyesi', 'belediyespor', 'spor', 'sportif', 'faaliyetler', 'futbol', 'kulübü', 'kulubu', 'holding', 'metro', 'beton', 'ekenler', 'rams', 'club', 'football', 'calcio', 'sport', 'sporting', 'united', 'city', 'real', 'athletic', 'atlético', 'olympique', 'fc', 'sk', 'jk', 'fk', 'as', 'ac', 'cf', 'sc']);
const sozcukler = (s) => String(s).toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşüéèáíóúñ0-9]+/g, ' ').split(' ').filter((w) => w.length >= 4 && !GENEL.has(w));
const kulupEsle = (a, b) => { const x = sozcukler(a), y = sozcukler(b); return x.some((p) => y.some((q) => p.startsWith(q) || q.startsWith(p))); };
const etiket = (e) => e?.labels?.tr?.value || e?.labels?.en?.value || '';
const iddia = (e, p) => (e?.claims?.[p] || []).map((c) => c.mainsnak?.datavalue?.value).filter(Boolean);

async function bul(o) {
  for (const q of aramalar(o.ad)) {
    const s = await wd({ action: 'wbsearchentities', search: q, language: 'en', type: 'item', limit: '7' });
    const idler = (s.search || []).map((x) => x.id);
    if (!idler.length) continue;
    const ent = (await wd({ action: 'wbgetentities', ids: idler.join('|'), props: 'claims|labels', languages: 'tr|en' })).entities || {};
    const adaylar = idler.map((id) => ent[id]).filter((e) => iddia(e, 'P106').some((v) => v.id === FUTBOLCU) && iddia(e, 'P18').length);
    if (!adaylar.length) continue;
    // Kulüp doğrulaması: oyuncunun kulüplerinden biri TFF'deki kulüple eşleşmeli
    const kulupIdler = [...new Set(adaylar.flatMap((e) => iddia(e, 'P54').map((v) => v.id)))].slice(0, 50);
    const kulupler = kulupIdler.length ? (await wd({ action: 'wbgetentities', ids: kulupIdler.join('|'), props: 'labels', languages: 'tr|en' })).entities || {} : {};
    const uygun = adaylar.find((e) => iddia(e, 'P54').some((v) => kulupEsle(o.kulup, etiket(kulupler[v.id]))));
    if (uygun) return { qid: uygun.id, dosya: iddia(uygun, 'P18')[0] };
    await bekle(300);
  }
  return null;
}

async function indir(qid, dosya) {
  const r = await getir(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', titles: `File:${dosya}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiextmetadatafilter: 'LicenseShortName|Artist', iiurlwidth: '240' })}`);
  const ii = Object.values(r.query?.pages || {})[0]?.imageinfo?.[0];
  if (!ii) return null;
  const lisans = ii.extmetadata?.LicenseShortName?.value || '';
  if (!/^(CC0|CC BY(-SA)? [\d.]+|Public domain|PD)/i.test(lisans) || /NC|ND/.test(lisans)) return { red: lisans || 'bilinmiyor' };
  const yazar = (ii.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Wikimedia Commons';
  const res = await fetch(ii.thumburl || ii.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`foto HTTP ${res.status}`);
  // Yüz genelde fotoğrafın üst kısmında: kare kırp, üstten hizala
  await sharp(Buffer.from(await res.arrayBuffer())).resize(160, 160, { fit: 'cover', position: 'north' }).webp({ quality: 80 }).toFile(path.join(KLASOR, `${qid}.webp`));
  return { yazar, lisans, kaynak: ii.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(dosya)}` };
}

const oyuncular = Object.values(servis.spor?.golKralligi || {}).flatMap((g) => g.liste || []);
let yeni = 0, deneme = 0;
for (const o of oyuncular) {
  const anahtar = `${o.ad}|${o.kulup}`;
  const k = kayit[anahtar];
  if (k?.qid && fs.existsSync(path.join(KLASOR, `${k.qid}.webp`))) continue;
  if (k?.yok && Date.now() - new Date(k.tarih).getTime() < TEKRAR_GUN * 864e5) continue;
  if (++deneme > 25) break; // her çalışmada en fazla 25 oyuncu (Wikimedia'yı yormamak için)
  try {
    const b = await bul(o);
    const f = b && (await indir(b.qid, b.dosya));
    if (f && !f.red) {
      kayit[anahtar] = { qid: b.qid, ...f, tarih: new Date().toISOString() };
      yeni++;
    } else kayit[anahtar] = { yok: true, neden: f?.red ? `lisans: ${f.red}` : 'bulunamadı', tarih: new Date().toISOString() };
  } catch (e) {
    console.warn(`! ${o.ad}: ${e.message}`);
  }
  await bekle(400);
}
fs.writeFileSync(VERI, JSON.stringify(kayit, null, 1));
console.log(`Oyuncu fotoğrafları: ${yeni} yeni, toplam ${Object.values(kayit).filter((x) => x.qid).length} fotoğraflı / ${Object.keys(kayit).length} oyuncu`);
