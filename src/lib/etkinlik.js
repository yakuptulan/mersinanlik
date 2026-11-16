// "Bu hafta Mersin'de": Mersin Büyükşehir Belediyesi'nin etkinlik duyuruları.
// Etkinlik tarihi, yeri ve saati duyuru metninden okunur (yazılmamışsa boş kalır).
// Afiş/fotoğraf belediyenin kendi paylaştığı görseldir; "Foto: Mersin Büyükşehir Belediyesi" diye yazılır.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { duzMetin, kisaKimlik } from './text.js';

export const LISTE = 'https://www.mersin.bel.tr/etkinlikler';
const KLASOR = path.resolve('public/etkinlik');
const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];

export function listeCoz(html) {
  const sonuc = [];
  for (const m of String(html).matchAll(/<div class="card[^"]*">\s*<a href="(https:\/\/www\.mersin\.bel\.tr\/etkinlik\/[^"]+)">\s*<img src="([^"]+)"[\s\S]*?<h5[^>]*>([\s\S]*?)<\/h5>/g)) {
    const link = m[1];
    const damga = link.match(/-(\d{10})$/)?.[1];
    sonuc.push({ link, foto: m[2], baslik: duzMetin(m[3]).replace(/\s+/g, ' ').trim(), yayin: damga ? new Date(Number(damga) * 1000).toISOString() : null });
  }
  return sonuc;
}

// Duyuru metninden tarih/saat/yer. simdi: yıl tahmini için
export function ayrintiCoz(metin, simdi = Date.now()) {
  const t = String(metin).replace(/\s+/g, ' ');
  const kucuk = t.toLocaleLowerCase('tr-TR');
  const tarihM = kucuk.match(/(\d{1,2})(?:\s*[-–]\s*\d{1,2})?\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)(?:\s+(20\d{2}))?/);
  let tarih = null;
  if (tarihM) {
    const ay = AYLAR.indexOf(tarihM[2]);
    const simdiD = new Date(simdi);
    let yil = tarihM[3] ? Number(tarihM[3]) : simdiD.getFullYear();
    // Yıl yazılmamış ve ay çok gerideyse (ör. kasımda "ocak") gelecek yıl
    if (!tarihM[3] && ay < simdiD.getMonth() - 2) yil++;
    tarih = `${yil}-${String(ay + 1).padStart(2, '0')}-${String(tarihM[1]).padStart(2, '0')}`;
  }
  const saat = t.match(/(?:saat\s*:?\s*)(\d{1,2})[:.](\d{2})/i) || t.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  const yer = t.match(/(?:Yer|Adres|Mekân|Mekan)\s*:\s*([^.|]{3,80}?)(?=\s+(?:Tarih|Saat|Başvuru|Detay|Ücret|Etkinlik)\b|[.|]|$)/i)?.[1]?.trim() || null;
  return { tarih, saat: saat ? `${saat[1].padStart(2, '0')}:${saat[2]}` : null, yer };
}

// Detay sayfasının içerik metni: başlıktan "Etkinlik Fotoğrafları"/"KURUMSAL" bölümüne kadar
export function govdeMetni(html, baslik) {
  const tum = duzMetin(String(html).replace(/<(script|style|nav|footer)\b[\s\S]*?<\/\1>/gi, ' ')).replace(/\s+/g, ' ');
  const bas = tum.indexOf(baslik.slice(0, 25));
  const ic = bas >= 0 ? tum.slice(bas + baslik.length) : tum;
  const son = ic.search(/Etkinlik Fotoğrafları|KURUMSAL Belediyenin/);
  return (son > 0 ? ic.slice(0, son) : ic.slice(0, 1500)).trim();
}

async function getir(url, ua) {
  const r = await fetch(url, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r;
}

export async function etkinlikGetir(ua, eski = [], simdi = Date.now()) {
  const liste = listeCoz(await (await getir(LISTE, ua)).text()).slice(0, 12);
  const sonuc = [];
  fs.mkdirSync(KLASOR, { recursive: true });
  for (const e of liste) {
    const onceki = (eski || []).find((x) => x.link === e.link);
    if (onceki) {
      sonuc.push(onceki);
      continue;
    }
    const id = kisaKimlik(e.link);
    const kayit = { id, ...e, foto: null, tarih: null, saat: null, yer: null };
    try {
      const metin = govdeMetni(await (await getir(e.link, ua)).text(), e.baslik);
      Object.assign(kayit, ayrintiCoz(`${e.baslik} ${metin}`, simdi));
      kayit.ozet = metin.slice(0, 220);
    } catch (err) {
      console.warn(`! Etkinlik ayrıntısı: ${err.message}`);
    }
    try {
      const veri = Buffer.from(await (await getir(e.foto, ua)).arrayBuffer());
      await sharp(veri).resize({ width: 600, height: 600, fit: 'cover', position: 'top' }).webp({ quality: 74 }).toFile(path.join(KLASOR, `${id}.webp`));
      kayit.foto = `${id}.webp`;
    } catch (err) {
      console.warn(`! Etkinlik görseli: ${err.message}`);
    }
    sonuc.push(kayit);
    await new Promise((x) => setTimeout(x, 800));
  }
  // Listeden düşen etkinliklerin görsellerini sil
  const kalan = new Set(sonuc.map((x) => x.foto).filter(Boolean));
  for (const f of fs.readdirSync(KLASOR)) if (!kalan.has(f)) fs.rmSync(path.join(KLASOR, f), { force: true });
  return { guncelleme: new Date().toISOString(), liste: sonuc };
}

// Sitede gösterilecekler: tarihi bugün/ileride olanlar, tarihi okunamayanlardan son 10 günde duyurulanlar
export function guncelEtkinlikler(etkinlik, simdi = Date.now()) {
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  return (etkinlik?.liste || [])
    .filter((e) => (e.tarih ? e.tarih >= bugun : e.yayin && simdi - new Date(e.yayin).getTime() < 10 * 864e5))
    .sort((a, b) => (a.tarih || '9999') .localeCompare(b.tarih || '9999') || new Date(b.yayin) - new Date(a.yayin));
}
