// Günün özeti: her sabah (07:30 sonrası) son 24 saatin öne çıkan Mersin haberlerinden kısa bir bülten.
import fs from 'node:fs';
import path from 'node:path';
import { jsonYaz } from './lib/gemini.js';

const DOSYA = path.resolve('data/ozet.json');
const TALIMAT = `Sen Mersin'de yayın yapan yerel bir haber sitesinin sabah bülteni editörüsün.
Sana numaralı haberler (başlık ve özet) vereceğim. Okurun 1 dakikada okuyacağı bir "Günün özeti" hazırla.
Kurallar:
- SADECE verilen bilgileri kullan, yorum ve tahmin ekleme. Suç ve kaza haberlerinde tam isim yazma.
- baslik: tarihi içermeyen, en önemli 1-2 gelişmeyi anan kısa başlık (en fazla 80 karakter), ör. "Mersin'de uyuşturucu operasyonu, ihracatta rekor".
- giris: 1-2 cümlelik sakin, bilgilendirici giriş.
- maddeler: her haber için {"no": haber numarası, "metin": 1-2 cümle}. Sıra önem sırası olsun.
- Yalnızca JSON döndür: {"baslik":"","giris":"","maddeler":[{"no":1,"metin":""}]}`;

async function main() {
  let veri = { arsiv: [] };
  try {
    veri = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
  } catch {}
  const simdi = Date.now();
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const saat = Number(new Date(simdi).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' }));
  const zorla = process.argv.includes('--simdi');
  if (!zorla && (veri.arsiv[0]?.tarih === bugun || saat < 7 || saat > 12)) return console.log('Günün özeti: şimdi yazılmıyor.');
  const { hikayeler } = JSON.parse(fs.readFileSync(path.resolve('data/haberler.json'), 'utf8'));
  const aday = hikayeler
    .filter((x) => !x.genel && x.durum === 'yayinda' && simdi - new Date(x.ilkGorulme).getTime() < 24 * 36e5)
    .sort((a, b) => new Set(b.kaynaklar.map((k) => k.ad)).size - new Set(a.kaynaklar.map((k) => k.ad)).size || Boolean(b.metin) - Boolean(a.metin))
    .slice(0, 8);
  if (aday.length < 4) return console.log(`Günün özeti: yeterli haber yok (${aday.length}).`);
  try {
    const j = await jsonYaz(TALIMAT, aday.map((x, i) => `${i + 1}. ${x.baslik}${x.ozet ? `\n${x.ozet}` : ''}`).join('\n\n'), { sicaklik: 0.3 });
    const maddeler = (j?.maddeler || []).map((m) => ({ id: aday[Number(m.no) - 1]?.id, metin: String(m.metin || '').trim() })).filter((m) => m.id && m.metin);
    if (!j?.baslik || maddeler.length < 4) throw new Error(`yetersiz (${maddeler.length})`);
    veri.arsiv = [{ tarih: bugun, baslik: String(j.baslik).trim(), giris: String(j.giris || '').trim(), maddeler, olusturma: new Date().toISOString() }, ...veri.arsiv.filter((o) => o.tarih !== bugun)].slice(0, 45);
    fs.writeFileSync(DOSYA, JSON.stringify(veri, null, 1));
    console.log(`🗞️  Günün özeti: ${veri.arsiv[0].baslik} (${maddeler.length} madde)`);
  } catch (e) {
    console.warn(`! Günün özeti: ${e.message.slice(0, 200)}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(0);
});
