// Kulüp logoları: TheSportsDB'nin açık API'sinden (takım rozetleri) küçük boyutta kendi sunucumuza alınır.
// (TFF'nin logo sunucusu yurt dışından erişime kapalı.) Logolar yalnızca takımı tanıtmak için puan tablosu
// ve maç kartlarında küçük boyutta kullanılır. Haftada bir yeni takım var mı diye bakılır.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const UA = 'MersinAnlikBot/1.0 (+https://mersinanlik.com; iletisim@mersinanlik.com)';
const VERI = path.resolve('data/logolar.json');
const KLASOR = path.resolve('public/logo');
const API = 'https://www.thesportsdb.com/api/v1/json/123';
const LIG_ADI = {
  'super-lig': ['Turkish Super Lig'],
  '1-lig': ['Turkish 1 Lig'],
  '2-lig-beyaz': ['Turkish 2 Lig'],
  '2-lig-kirmizi': ['Turkish 2 Lig'],
  '3-lig-1': ['Turkish 3 Lig Group 1'],
  '3-lig-2': ['Turkish 3 Lig Group 2'],
  '3-lig-3': ['Turkish 3 Lig Group 3'],
};
const DUR = new Set(['spor', 'sk', 'fk', 'as', 'a', 'ş', 'futbol', 'kulübü', 'kulubu', 'belediyespor', 'belediye', 'jk', 'gsk', 'idman', 'yurdu', 'idmanyurdu', 'gençlik', 'and', 'the']);
const kelimeler = (ad) =>
  String(ad)
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-zçğıöşü0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((k) => k.length > 1 && !DUR.has(k));
const sade = (ad) => String(ad).toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9]/g, '');

function eslestir(ad, adaylar) {
  const s = sade(ad);
  const tam = adaylar.find((t) => [t.strTeam, ...(t.strTeamAlternate || '').split(',')].some((x) => x && sade(x) === s));
  if (tam) return tam;
  const k = new Set(kelimeler(ad));
  const puanli = adaylar
    .map((t) => {
      const tk = new Set([...kelimeler(t.strTeam), ...kelimeler(t.strTeamAlternate || '')]);
      return { t, p: [...k].filter((x) => tk.has(x) && x.length >= 4).length };
    })
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p);
  if (!puanli.length || (puanli[1] && puanli[1].p === puanli[0].p)) return null;
  return puanli[0].t;
}

async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const servis = JSON.parse(fs.readFileSync('data/servisler.json', 'utf8'));
let logolar = { takimlar: {}, bakilan: null };
try {
  logolar = { ...logolar, ...JSON.parse(fs.readFileSync(VERI, 'utf8')) };
} catch {}
const ligler = servis.spor?.ligler || {};
const eksikVar = Object.values(ligler).some((l) => (l.puan || []).some((t) => !logolar.takimlar[t.takim]));
if (!eksikVar || (logolar.bakilan && Date.now() - new Date(logolar.bakilan).getTime() < 7 * 864e5 && !process.argv.includes('--simdi'))) {
  console.log('Kulüp logoları: güncel.');
  process.exit(0);
}
fs.mkdirSync(KLASOR, { recursive: true });
const takimListesi = {};
let yeni = 0, bulunamayan = [];
for (const [kod, l] of Object.entries(ligler)) {
  const eksik = (l.puan || []).filter((t) => !logolar.takimlar[t.takim]);
  if (!eksik.length) continue;
  const adaylar = [];
  for (const lig of LIG_ADI[kod] || []) {
    if (!takimListesi[lig]) {
      try {
        takimListesi[lig] = (await json(`${API}/search_all_teams.php?l=${encodeURIComponent(lig)}`)).teams || [];
      } catch (e) {
        console.warn(`! Logo listesi (${lig}): ${e.message}`);
        takimListesi[lig] = [];
      }
      await new Promise((x) => setTimeout(x, 2500));
    }
    adaylar.push(...takimListesi[lig]);
  }
  for (const t of eksik) {
    let aday = eslestir(t.takim, adaylar);
    if (!aday) {
      // Ligde bulunamadıysa adıyla ara
      try {
        const r = (await json(`${API}/searchteams.php?t=${encodeURIComponent(t.takim)}`)).teams || [];
        aday = eslestir(t.takim, r.filter((x) => x.strCountry === 'Turkey' && x.strSport === 'Soccer'));
      } catch {}
      await new Promise((x) => setTimeout(x, 2500));
    }
    if (!aday?.strBadge) {
      bulunamayan.push(t.takim);
      continue;
    }
    try {
      const r = await fetch(`${aday.strBadge}/small`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      const ham = r.ok ? r : await fetch(aday.strBadge, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      if (!ham.ok) throw new Error(`HTTP ${ham.status}`);
      const dosya = `${aday.idTeam}.webp`;
      await sharp(Buffer.from(await ham.arrayBuffer())).resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toFile(path.join(KLASOR, dosya));
      logolar.takimlar[t.takim] = dosya;
      yeni++;
    } catch (e) {
      console.warn(`! Logo (${t.takim}): ${e.message}`);
    }
  }
}
logolar.bakilan = new Date().toISOString();
fs.writeFileSync(VERI, JSON.stringify(logolar, null, 1));
console.log(`Kulüp logoları: ${yeni} yeni, toplam ${Object.keys(logolar.takimlar).length}${bulunamayan.length ? `; bulunamayan: ${bulunamayan.join(', ')}` : ''}`);
