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
let logolar = { takimlar: {}, denenen: {}, listeler: {} };
try {
  logolar = { ...logolar, ...JSON.parse(fs.readFileSync(VERI, 'utf8')) };
} catch {}
logolar.denenen ||= {};
logolar.listeler ||= {};
const ligler = servis.spor?.ligler || {};
const bekle = () => new Promise((x) => setTimeout(x, 4500)); // ücretsiz anahtar: dakikada en fazla ~30 istek
const SINIR = Number(process.env.LOGO_ISTEK || 14); // çalışma başına istek
let istek = 0, yeni = 0, durdu = false;
fs.mkdirSync(KLASOR, { recursive: true });

async function indir(takim, aday) {
  const r = await fetch(`${aday.strBadge}/small`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  const ham = r.ok ? r : await fetch(aday.strBadge, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!ham.ok) throw new Error(`HTTP ${ham.status}`);
  const dosya = `${aday.idTeam}.webp`;
  if (!fs.existsSync(path.join(KLASOR, dosya))) await sharp(Buffer.from(await ham.arrayBuffer())).resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toFile(path.join(KLASOR, dosya));
  logolar.takimlar[takim] = dosya;
  yeni++;
}
async function sor(url) {
  if (istek >= SINIR) { durdu = true; return null; }
  istek++;
  try {
    const j = await json(url);
    await bekle();
    return j;
  } catch (e) {
    if (/429/.test(e.message)) durdu = true;
    console.warn(`! Logo isteği: ${e.message}`);
    return null;
  }
}

dongu: for (const [kod, l] of Object.entries(ligler)) {
  const eksik = (l.puan || []).filter((t) => !logolar.takimlar[t.takim] && (logolar.denenen[t.takim] || 0) < 2);
  if (!eksik.length) continue;
  // 1) Ligin takım listesi (bir kez)
  for (const lig of LIG_ADI[kod] || []) {
    if (logolar.listeler[lig]) continue;
    const j = await sor(`${API}/search_all_teams.php?l=${encodeURIComponent(lig)}`);
    if (!j) break dongu;
    logolar.listeler[lig] = (j.teams || []).map(({ idTeam, strTeam, strTeamAlternate, strBadge }) => ({ idTeam, strTeam, strTeamAlternate, strBadge }));
  }
  const adaylar = (LIG_ADI[kod] || []).flatMap((lig) => logolar.listeler[lig] || []);
  for (const t of eksik) {
    let aday = eslestir(t.takim, adaylar);
    if (!aday) {
      // 2) Adıyla ara: sponsor adını atlamak için en uzun anlamlı kelimeden başla
      const terimler = [...new Set([...kelimeler(t.takim).sort((a, b) => b.length - a.length).slice(0, 2), t.takim])];
      for (const terim of terimler) {
        const j = await sor(`${API}/searchteams.php?t=${encodeURIComponent(terim)}`);
        if (!j) break dongu;
        aday = eslestir(t.takim, (j.teams || []).filter((x) => x.strCountry === 'Turkey' && x.strSport === 'Soccer'));
        if (aday) break;
      }
    }
    if (!aday?.strBadge) {
      logolar.denenen[t.takim] = (logolar.denenen[t.takim] || 0) + 1;
      continue;
    }
    try {
      await indir(t.takim, aday);
    } catch (e) {
      console.warn(`! Logo (${t.takim}): ${e.message}`);
    }
  }
}
fs.writeFileSync(VERI, JSON.stringify(logolar, null, 1));
const toplam = Object.values(ligler).reduce((n, l) => n + (l.puan || []).length, 0);
console.log(`Kulüp logoları: ${yeni} yeni, ${Object.keys(logolar.takimlar).length}/${toplam} takımın logosu var${durdu ? ' (istek sınırı, sonraki çalışmada devam)' : ''}`);
