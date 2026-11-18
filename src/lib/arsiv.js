// Kalıcı haber arşivi: kendi cümlelerimizle yazdığımız haberler canlı listeden düşse de
// sayfaları açık kalsın (Google'daki adresler "bulunamadı" vermesin).
// Dosyalar: data/arsiv/YYYY-MM.json → { hikayeler: [...] }
import fs from 'node:fs';
import path from 'node:path';
import { VERI_KLASORU } from './store.js';
import { baslikTemizle } from './text.js';
import { haberYolu } from '../templates/parcalar.js';

export const ARSIV_KLASORU = path.join(VERI_KLASORU, 'arsiv');

// Arşive girmeyen çalışma alanları (sadece toplama sırasında gerekiyor)
const ATILAN = new Set(['ozetIcinMetin', 'gorselPrompt', 'metinDenemesi', 'yazimDenemesi', 'metinDenendi', 'riskNedenleri', 'onaylandi']);

export const arsivlenirMi = (h) => Boolean(h.metin) && h.durum === 'yayinda';

function sadelestir(h) {
  const o = {};
  for (const [k, v] of Object.entries(h)) if (!ATILAN.has(k)) o[k] = v;
  o.baslik = baslikTemizle(o.baslik);
  // Adres arşive girdiği anda sabitlenir; başlık kuralı değişse de bağlantı kırılmaz
  o.yol = h.yol || haberYolu(o);
  o.kaynaklar = (o.kaynaklar || []).map(({ ad, link, kaynakId }) => ({ ad, link, kaynakId }));
  return o;
}

export function arsiveEkle(hikayeler) {
  const aylar = new Map();
  for (const h of hikayeler.filter(arsivlenirMi)) {
    const ay = String(h.ilkGorulme).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ay)) continue;
    if (!aylar.has(ay)) aylar.set(ay, []);
    aylar.get(ay).push(sadelestir(h));
  }
  let eklenen = 0;
  for (const [ay, yeni] of aylar) {
    const dosya = path.join(ARSIV_KLASORU, `${ay}.json`);
    const mevcut = fs.existsSync(dosya) ? JSON.parse(fs.readFileSync(dosya, 'utf8')).hikayeler : [];
    const byId = new Map(mevcut.map((h) => [h.id, h]));
    for (const h of yeni) {
      if (!byId.has(h.id)) eklenen++;
      // Var olan kaydın adresi korunur
      byId.set(h.id, { ...h, yol: byId.get(h.id)?.yol || h.yol });
    }
    const liste = [...byId.values()].sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme));
    fs.mkdirSync(ARSIV_KLASORU, { recursive: true });
    fs.writeFileSync(dosya, JSON.stringify({ ay, hikayeler: liste }, null, 1));
  }
  return eklenen;
}

export function arsivYukle() {
  if (!fs.existsSync(ARSIV_KLASORU)) return [];
  return fs
    .readdirSync(ARSIV_KLASORU)
    .filter((f) => /^\d{4}-\d{2}\.json$/.test(f))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(ARSIV_KLASORU, f), 'utf8')).hikayeler || [])
    .sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme));
}
