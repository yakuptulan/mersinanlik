// Her perşembe (gün içinde kaçarsa cuma) "Bu hafta sonu Mersin'de ne yapılır?" yazısı.
// Malzeme: etkinlik takvimi (Büyükşehir), hafta sonu hava tahmini, gezilecek yerler rehberi.
// Yapay zekâ sadece verilen bilgilerle yazar; yazı "Merak edilenler" bölümüne eklenir.
import fs from 'node:fs';
import path from 'node:path';
import { jsonYaz } from './lib/gemini.js';
import { GEZILECEK } from './templates/rehber.js';
import { FOTOLAR } from './fotolar.js';
import { slugify } from './lib/text.js';

const BILGI = path.resolve('data/bilgi.json');
const SERVIS = path.resolve('data/servisler.json');
const TZ = 'Europe/Istanbul';
const gunStr = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: TZ });
const gunAdi = (g) => new Date(`${g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: TZ });

const TALIMAT = `Sen Mersin'de yayın yapan yerel bir haber sitesinin şehir rehberi editörüsün.
"Bu hafta sonu Mersin'de ne yapılır?" yazısı hazırla. Okurlar çoğunlukla orta yaş ve üstü; sade, sıcak, bilgilendirici yaz.
KURALLAR:
- SADECE sana verilen etkinlik, hava ve gezi bilgilerini kullan. Etkinliklere saat, yer, ücret, sanatçı UYDURMA; verilmeyen bilgiyi yazma.
- Etkinlik yoksa ya da azsa gezi önerileriyle tamamla.
- spot: 1-2 cümle, hafta sonunun havasını ve öne çıkanları özetler.
- bolumler: 4-7 bölüm. İlk bölüm "Hafta sonu hava durumu" olsun (verilen tahmine göre, kısa). Sonra etkinlikler (her biri ayrı bölüm, başlık etkinliğin adı), sonra 1-2 gezi önerisi (başlık yerin adı). Her bölüm 2-3 cümle.
- Etkinlik bölümlerinde "no" alanına etkinliğin numarasını yaz; gezi ve hava bölümlerinde "no" boş kalsın.
Yalnızca JSON döndür: {"spot":"","bolumler":[{"baslik":"","metin":"","no":null}]}`;

async function main() {
  const simdi = Date.now();
  const zorla = process.argv.includes('--simdi');
  const haftaGunu = new Date(simdi).toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ });
  const saat = Number(new Date(simdi).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }));
  // Bu haftanın cumartesisi
  const sonraki = (n) => gunStr(simdi + n * 864e5);
  const fark = { Mon: 5, Tue: 4, Wed: 3, Thu: 2, Fri: 1, Sat: 0, Sun: -1 }[haftaGunu];
  const cumartesi = sonraki(fark);
  const pazar = sonraki(fark + 1);
  const konu = `haftasonu:${cumartesi}`;
  const veri = JSON.parse(fs.readFileSync(BILGI, 'utf8'));
  if (veri.yazilar.some((y) => y.konu === konu)) return console.log('Hafta sonu rehberi: bu hafta yazıldı.');
  if (!zorla && (!['Thu', 'Fri'].includes(haftaGunu) || saat < 10 || saat > 20)) return console.log('Hafta sonu rehberi: şimdi yazılmıyor.');

  const servis = JSON.parse(fs.readFileSync(SERVIS, 'utf8'));
  const cuma = sonraki(fark - 1);
  const etkinlikler = (servis.etkinlik?.liste || []).filter((e) => [cuma, cumartesi, pazar].includes(e.tarih)).slice(0, 8);
  const gunler = servis.hava?.yenisehir?.gunler || [];
  const hava = [cumartesi, pazar].map((g) => gunler.find((x) => x.tarih === g)).filter(Boolean);
  // Mevsime göre gezi: rehberden 3 yer (her hafta farklı ilçe)
  const hafta = Math.floor(simdi / (7 * 864e5));
  const ilceler = [GEZILECEK[hafta % GEZILECEK.length], GEZILECEK[(hafta + 3) % GEZILECEK.length]];
  const geziler = ilceler.flatMap((b) => b.yerler.slice(0, 2).map(([ad, aciklama]) => ({ ilce: b.ilce, ad, aciklama })));

  const girdi = [
    `Hafta sonu: ${gunAdi(cumartesi)} – ${gunAdi(pazar)}`,
    `HAVA (Mersin merkez): ${hava.map((x) => `${gunAdi(x.tarih)}: ${x.durum}, en yüksek ${x.max}°, en düşük ${x.min}°`).join('; ') || 'tahmin yok'}`,
    `ETKİNLİKLER (Mersin Büyükşehir takviminden):\n${etkinlikler.map((e, i) => `${i + 1}. ${e.baslik} — ${gunAdi(e.tarih)}${e.saat ? `, saat ${e.saat}` : ''}${e.yer ? `, ${e.yer}` : ''}`).join('\n') || 'yok'}`,
    `GEZİ ÖNERİLERİ:\n${geziler.map((g) => `- ${g.ad} (${g.ilce}): ${g.aciklama}`).join('\n')}`,
  ].join('\n\n');
  const j = await jsonYaz(TALIMAT, girdi, { sicaklik: 0.5, sadeceGemini: true });
  const bolumler = (j?.bolumler || [])
    .map((b) => ({ baslik: String(b.baslik || '').trim(), metin: String(b.metin || '').trim(), no: Number(b.no) || null }))
    .filter((b) => b.baslik && b.metin.length > 40);
  if (bolumler.length < 3) throw new Error(`yetersiz bölüm (${bolumler.length})`);
  // Etkinlik bölümlerine resmî sayfa bağlantısı
  for (const b of bolumler) {
    const e = b.no && etkinlikler[b.no - 1];
    if (e) b.link = e.link;
    delete b.no;
  }
  const kisaTarih = `${new Date(`${cumartesi}T12:00:00+03:00`).getDate()}-${new Date(`${pazar}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: TZ })}`;
  const baslik = `Bu hafta sonu Mersin'de ne yapılır? (${kisaTarih})`;
  const fotoId = `${ilceler[0].foto}`;
  const f = FOTOLAR.find((x) => x.id === fotoId);
  const yazi = {
    slug: slugify(`bu hafta sonu mersinde ne yapilir ${cumartesi}`),
    konu,
    tur: 'haftasonu',
    baslik,
    spot: String(j.spot || '').trim(),
    aciklama: `${gunAdi(cumartesi)} ve ${gunAdi(pazar)} için Mersin'de etkinlikler, hava durumu ve gezi önerileri.`,
    bolumler,
    sss: [],
    kaynakNotu: 'Etkinlikler Mersin Büyükşehir Belediyesi etkinlik takviminden, hava tahmini MET Norway verisinden alınmıştır. Etkinliğe gitmeden önce resmî sayfasından saat ve yer bilgisini teyit etmenizi öneririz.',
    gorsel: f ? { yerel: `/foto/${f.id}-800.webp`, yazar: f.yazar, lisans: f.lisans, sayfa: f.sayfa } : null,
    tarih: new Date(simdi).toISOString(),
  };
  veri.yazilar.unshift(yazi);
  fs.writeFileSync(BILGI, JSON.stringify(veri, null, 1));
  console.log(`🗓  Hafta sonu rehberi: ${baslik} (${bolumler.length} bölüm, ${etkinlikler.length} etkinlik)`);
}

main().catch((e) => console.warn(`! Hafta sonu rehberi: ${e.message.slice(0, 200)}`));
