// Mersin takımlarının maçı bitince kısa "maç sonu" haberi yazar.
// Malzeme yalnızca TFF verisidir (skor, puan tablosu, form, sıradaki maç). Golcü, dakika, oyuncu adı
// TFF tablosunda olmadığı için yazıya girmez; yapay zekâ uydurmasın diye sadece verilen bilgilerle yazdırılır.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { jsonYaz } from './lib/gemini.js';
import { yukle, kaydet } from './lib/store.js';
import { ILCELER } from './config.js';

const SERVIS = path.resolve('data/servisler.json');
const DURUM = path.resolve('data/mac.json');
const TZ = 'Europe/Istanbul';
const gunAdi = (g) => new Date(`${g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: TZ });
const kucuk = (s) => s.toLocaleLowerCase('tr');

const TALIMAT = `Sen Mersin'de yayın yapan yerel bir haber sitesinin spor muhabirisin. Bir Mersin takımının maç sonucunu kısa bir haber olarak yaz.
KURALLAR:
- SADECE verilen bilgileri kullan. Golcü, gol dakikası, oyuncu, teknik direktör, seyirci, hakem, kart, pozisyon, açıklama UYDURMA. Maçın nasıl geçtiğini anlatma (baskı kurdu, son dakikada vb. yazma).
- Puan tablosu bilgisi verilmediyse sıralama ve puan yazma.
- Tarafsız, sade, haber dili. Abartı ve ünlem yok.
- baslik: en fazla 90 karakter, skoru ve takımları içersin (örnek kalıp: "Yeni Mersin İdmanyurdu, deplasmanda X'i 2-1 yendi").
- ozet: 1-2 cümle.
- metin: 3 kısa paragraf, paragraflar arasında boş satır. 1) sonuç ve maçın künyesi (lig, hafta, tarih, yer: ev sahibi takımın sahası diye yaz, stat adı verme), 2) puan durumu ve son maçlardaki form (varsa), 3) sıradaki maç (varsa).
Yalnızca JSON döndür: {"baslik":"","ozet":"","metin":""}`;

function ilceBul(takim) {
  const t = kucuk(takim);
  const i = ILCELER.find((x) => t.includes(kucuk(x.ad)));
  return i ? [i.slug] : [];
}

const sonuc = (m, takim) => {
  const [e, d] = m.skor.split('-').map(Number);
  const biz = m.ev === takim ? e : d;
  const onlar = m.ev === takim ? d : e;
  return biz > onlar ? 'galibiyet' : biz < onlar ? 'mağlubiyet' : 'beraberlik';
};

// Şablon yazı: yapay zekâ çalışmazsa
function sablon(f) {
  const ev = f.mac.ev === f.takim;
  const [e, d] = f.mac.skor.split('-');
  const rakip = ev ? f.mac.dep : f.mac.ev;
  const [biz, onlar] = ev ? [e, d] : [d, e];
  const yer = ev ? 'sahasında' : 'deplasmanda';
  const fiil = { galibiyet: `${yer} ${rakip} karşısında ${biz}-${onlar} galip geldi`, mağlubiyet: `${yer} ${rakip} karşısında ${biz}-${onlar} mağlup oldu`, beraberlik: `${yer} ${rakip} ile ${biz}-${onlar} berabere kaldı` }[f.sonuc];
  const p = [];
  p.push(`${f.takim}, ${f.lig}${f.hafta ? ` ${f.hafta}. hafta` : ''} maçında ${gunAdi(f.mac.tarih)} günü ${fiil}.`);
  if (f.tablo) p.push(`Bu sonucun ardından ${f.takim}, ${f.tablo.o} maçta topladığı ${f.tablo.p} puanla ligde ${f.tablo.sira}. sırada yer alıyor. Takım ${f.tablo.g} galibiyet, ${f.tablo.b} beraberlik ve ${f.tablo.m} mağlubiyet aldı; ${f.tablo.a} gol atıp ${f.tablo.y} gol yedi.`);
  if (f.siradaki) p.push(`${f.takim}, ligdeki bir sonraki maçında ${gunAdi(f.siradaki.tarih)}${f.siradaki.saat ? ` saat ${f.siradaki.saat}'da` : ''} ${f.siradaki.ev === f.takim ? `sahasında ${f.siradaki.dep}` : `deplasmanda ${f.siradaki.ev}`} ile karşılaşacak.`);
  return { baslik: `${f.takim} ${fiil}`, ozet: p[0], metin: p.join('\n\n') };
}

async function main() {
  const simdi = Date.now();
  const servis = JSON.parse(fs.readFileSync(SERVIS, 'utf8'));
  const durum = fs.existsSync(DURUM) ? JSON.parse(fs.readFileSync(DURUM, 'utf8')) : { yazilan: [], oynanan: {} };
  const veri = yukle();
  let yeni = 0;

  for (const [, l] of Object.entries(servis.spor?.ligler || {})) {
    const mersinliler = (l.puan || []).filter((p) => p.mersin);
    // Maç başlamadan önce takımın oynadığı maç sayısını not et (maç sonrası tablo güncel mi diye bakmak için)
    for (const m of l.maclar || []) {
      if (!m.mersin || m.skor) continue;
      for (const p of mersinliler.filter((x) => x.takim === m.ev || x.takim === m.dep)) durum.oynanan[`${m.tarih}|${p.takim}`] = p.o;
    }
    for (const m of l.maclar || []) {
      if (!m.mersin || !m.skor || !/^\d+-\d+$/.test(m.skor)) continue;
      const bas = new Date(`${m.tarih}T${m.saat || '12:00'}:00+03:00`).getTime();
      if (simdi - bas < 110 * 60e3 || simdi - bas > 2 * 864e5) continue; // bitmemiş ya da çok eski
      for (const takimSatir of mersinliler.filter((p) => p.takim === m.ev || p.takim === m.dep)) {
        const takim = takimSatir.takim;
        const anahtar = `${m.tarih}|${m.ev}|${m.dep}|${takim}`;
        if (durum.yazilan.includes(anahtar)) continue;
        // Puan tablosu maçtan sonra güncellendi mi? (oynanan maç sayısı artmış olmalı)
        // Maçtan önce kaydedilen oynanan maç sayısı arttıysa ya da form serisinin son harfi bu sonuçla
        // uyuşuyor ve haftalık sonuçlarda bu skor varsa tablo güncel sayılır.
        const onceki = durum.oynanan[`${m.tarih}|${takim}`];
        const harf = { galibiyet: 'G', beraberlik: 'B', mağlubiyet: 'M' }[sonuc(m, takim)];
        const tabloGuncel = onceki != null ? takimSatir.o > onceki : sonucTabloda(l, m) && (l.form?.[takim] || []).at(-1) === harf;
        // Tablo henüz güncellenmediyse 8 saate kadar bekle, sonra tablosuz yaz
        if (!tabloGuncel && simdi - bas < 8 * 36e5) continue;
        const hafta = Object.entries(l.haftalar || {}).find(([, liste]) => liste.some((x) => x.ev === m.ev && x.dep === m.dep))?.[0] || null;
        const siradaki = (l.maclar || []).filter((x) => (x.ev === takim || x.dep === takim) && !x.skor && x.tarih > m.tarih).sort((a, b) => a.tarih.localeCompare(b.tarih))[0] || null;
        const f = { lig: l.ad, hafta, mac: m, takim, sonuc: sonuc(m, takim), tablo: tabloGuncel ? takimSatir : null, form: (l.form?.[takim] || []).slice(-5), siradaki };
        const girdi = [
          `Lig: ${f.lig}${hafta ? `, ${hafta}. hafta` : ''}`,
          `Tarih: ${gunAdi(m.tarih)}${m.saat ? `, saat ${m.saat}` : ''}`,
          `Maç: ${m.ev} (ev sahibi) ${m.skor} ${m.dep} (deplasman)`,
          `Haberin takımı: ${takim} — sonuç: ${f.sonuc}`,
          f.tablo ? `Puan tablosu (maçtan sonra): ${f.tablo.sira}. sıra, ${f.tablo.o} maç, ${f.tablo.g}G ${f.tablo.b}B ${f.tablo.m}M, attığı ${f.tablo.a}, yediği ${f.tablo.y}, ${f.tablo.p} puan` : 'Puan tablosu: verilmedi',
          f.tablo && f.form.length ? `Son maçlar (eskiden yeniye, G/B/M): ${f.form.join(' ')}` : '',
          siradaki ? `Sıradaki maç: ${gunAdi(siradaki.tarih)}${siradaki.saat ? ` ${siradaki.saat}` : ''}, ${siradaki.ev} – ${siradaki.dep}` : 'Sıradaki maç: bilinmiyor',
        ].filter(Boolean).join('\n');
        let yazi = null;
        try {
          const j = await jsonYaz(TALIMAT, girdi, { sicaklik: 0.4, sadeceGemini: true });
          const [a, b] = m.skor.split('-');
          const metinTum = `${j?.baslik} ${j?.metin}`;
          if (j?.baslik && j?.metin && (metinTum.includes(`${a}-${b}`) || metinTum.includes(`${b}-${a}`))) yazi = { baslik: String(j.baslik).trim().slice(0, 110), ozet: String(j.ozet || '').trim(), metin: String(j.metin).trim() };
        } catch (e) {
          console.log('Maç haberi: yapay zekâ hatası, şablon kullanılıyor', e.message);
        }
        if (!yazi) yazi = sablon(f);
        const zaman = new Date(simdi).toISOString();
        const id = 'm' + crypto.createHash('sha1').update(anahtar).digest('hex').slice(0, 5);
        veri.hikayeler.push({
          id,
          baslik: yazi.baslik,
          ozet: yazi.ozet,
          metin: yazi.metin,
          ilceler: ilceBul(takim),
          genel: false,
          kategori: 'spor',
          riskNedenleri: [],
          durum: 'yayinda',
          onaylandi: false,
          ilkGorulme: zaman,
          sonGuncelleme: zaman,
          kaynaklar: [{ kaynakId: 'tff', ad: 'TFF', link: l.kaynak || 'https://www.tff.org/', baslik: `${l.ad} puan durumu ve maç sonuçları`, tarih: zaman }],
          yaziKaynak: 'TFF',
          metinDenemesi: 2,
          macHaberi: true,
          kapak: 'mac',
          gorselHatasi: 'kapak var',
        });
        durum.yazilan.push(anahtar);
        delete durum.oynanan[`${m.tarih}|${takim}`];
        yeni++;
        console.log('Maç haberi yazıldı:', yazi.baslik);
      }
    }
  }
  yeni += await macOnuYazilari({ servis, durum, veri, simdi });
  yeni += await haftalikBulten({ servis, durum, veri, simdi });
  yeni += await haftasonuProgrami({ servis, durum, veri, simdi });
  durum.yazilan = durum.yazilan.slice(-200);
  // Eski kayıtları temizle (10 günden eski maç günleri)
  const sinir = new Date(simdi - 10 * 864e5).toISOString().slice(0, 10);
  for (const k of Object.keys(durum.oynanan)) if (k.slice(0, 10) < sinir) delete durum.oynanan[k];
  fs.writeFileSync(DURUM, JSON.stringify(durum, null, 1));
  if (yeni) kaydet(veri);
  else console.log('Maç haberi: yeni biten Mersin maçı yok.');
}

// ---------- Maç önü: Mersin takımının maçından bir gün önce (maça 6–30 saat kala) kısa tanıtım ----------
const ONCE_TALIMAT = `Sen Mersin'de yayın yapan yerel bir haber sitesinin spor muhabirisin. Bir Mersin takımının yaklaşan maçı için kısa bir "maç önü" haberi yaz.
KURALLAR:
- SADECE verilen bilgileri kullan. Sakat/cezalı oyuncu, kadro, teknik direktör açıklaması, stat adı, bilet, yayın kanalı, hakem UYDURMA. Skor tahmini yapma.
- Tarafsız, sade haber dili; abartı ve ünlem yok.
- baslik: en fazla 90 karakter (örnek kalıp: "Yeni Mersin İdmanyurdu, yarın sahasında Karaman'ı ağırlıyor").
- ozet: 1-2 cümle (maçın günü, saati, ligi).
- metin: 3 kısa paragraf, aralarında boş satır: 1) maçın künyesi, 2) Mersin takımının puan durumu ve son maçları, 3) rakibin puan durumu ve son maçları.
Yalnızca JSON döndür: {"baslik":"","ozet":"","metin":""}`;

async function macOnuYazilari({ servis, durum, veri, simdi }) {
  let yeni = 0;
  for (const [, l] of Object.entries(servis.spor?.ligler || {})) {
    for (const m of l.maclar || []) {
      if (!m.mersin || m.skor || !m.saat) continue;
      const bas = new Date(`${m.tarih}T${m.saat}:00+03:00`).getTime();
      const kalan = bas - simdi;
      if (kalan < 6 * 36e5 || kalan > 30 * 36e5) continue;
      const satir = (ad) => (l.puan || []).find((p) => p.takim === ad);
      for (const takimSatir of (l.puan || []).filter((p) => p.mersin && (p.takim === m.ev || p.takim === m.dep))) {
        const takim = takimSatir.takim;
        const anahtar = `once|${m.tarih}|${m.ev}|${m.dep}|${takim}`;
        if (durum.yazilan.includes(anahtar)) continue;
        const rakipAd = m.ev === takim ? m.dep : m.ev;
        const rakip = satir(rakipAd);
        const tablo = (t) => (t ? `${t.sira}. sıra, ${t.o} maç, ${t.g}G ${t.b}B ${t.m}M, attığı ${t.a}, yediği ${t.y}, ${t.p} puan` : 'bilinmiyor');
        const form = (ad) => (l.form?.[ad] || []).slice(-5).join(' ') || 'bilinmiyor';
        const yarinMi = new Date(bas).toLocaleDateString('sv-SE', { timeZone: TZ }) !== new Date(simdi).toLocaleDateString('sv-SE', { timeZone: TZ });
        const girdi = [
          `Lig: ${l.ad}`,
          `Maç: ${m.ev} (ev sahibi) – ${m.dep} (deplasman)`,
          `Tarih: ${gunAdi(m.tarih)} (${yarinMi ? 'yarın' : 'bugün'}), saat ${m.saat}`,
          `Haberin takımı: ${takim} (${m.ev === takim ? 'iç sahada' : 'deplasmanda'})`,
          `${takim} puan durumu: ${tablo(takimSatir)}; son maçlar (eskiden yeniye): ${form(takim)}`,
          `${rakipAd} puan durumu: ${tablo(rakip)}; son maçlar (eskiden yeniye): ${form(rakipAd)}`,
        ].join('\n');
        let yazi = null;
        try {
          const j = await jsonYaz(ONCE_TALIMAT, girdi, { sicaklik: 0.4, sadeceGemini: true });
          if (j?.baslik && j?.metin && j.metin.includes(m.saat)) yazi = { baslik: String(j.baslik).trim().slice(0, 110), ozet: String(j.ozet || '').trim(), metin: String(j.metin).trim() };
        } catch (e) {
          console.log('Maç önü: yapay zekâ hatası, şablon kullanılıyor', e.message);
        }
        if (!yazi) {
          const ic = m.ev === takim;
          const p1 = `${takim}, ${l.ad} maçında ${gunAdi(m.tarih)} saat ${m.saat}'te ${ic ? 'sahasında' : 'deplasmanda'} ${rakipAd} ile karşılaşacak.`;
          const p2 = `${takim}, ${takimSatir.o} maçta topladığı ${takimSatir.p} puanla ligde ${takimSatir.sira}. sırada bulunuyor; ${takimSatir.g} galibiyet, ${takimSatir.b} beraberlik ve ${takimSatir.m} mağlubiyeti var.`;
          const p3 = rakip ? `Rakip ${rakipAd} ise ${rakip.o} maçta ${rakip.p} puan topladı ve ${rakip.sira}. sırada yer alıyor.` : '';
          yazi = { baslik: `${takim}, ${yarinMi ? 'yarın' : 'bugün'} ${ic ? 'sahasında' : 'deplasmanda'} ${rakipAd} karşısında`, ozet: p1, metin: [p1, p2, p3].filter(Boolean).join('\n\n') };
        }
        const zaman = new Date(simdi).toISOString();
        veri.hikayeler.push({
          id: 'o' + crypto.createHash('sha1').update(anahtar).digest('hex').slice(0, 5),
          baslik: yazi.baslik,
          ozet: yazi.ozet,
          metin: yazi.metin,
          ilceler: ilceBul(takim),
          genel: false,
          kategori: 'spor',
          riskNedenleri: [],
          durum: 'yayinda',
          onaylandi: false,
          ilkGorulme: zaman,
          sonGuncelleme: zaman,
          kaynaklar: [{ kaynakId: 'tff', ad: 'TFF', link: l.kaynak || 'https://www.tff.org/', baslik: `${l.ad} fikstür ve puan durumu`, tarih: zaman }],
          yaziKaynak: 'TFF',
          metinDenemesi: 2,
          macHaberi: true,
          kapak: 'mac',
          gorselHatasi: 'kapak var',
        });
        durum.yazilan.push(anahtar);
        yeni++;
        console.log('Maç önü yazıldı:', yazi.baslik);
      }
    }
  }
  return yeni;
}

// ---------- Haftalık spor bülteni: her pazartesi 10.00'dan sonra bir kez ----------
const BULTEN_TALIMAT = `Sen Mersin'de yayın yapan yerel bir haber sitesinin spor editörüsün. Mersin takımlarının geçen haftasını özetleyen kısa bir "haftalık spor bülteni" haberi yaz.
KURALLAR:
- SADECE verilen bilgileri kullan. Golcü, oyuncu, teknik direktör, maçın nasıl geçtiği gibi verilmeyen hiçbir şeyi yazma.
- Tarafsız, sade haber dili; abartı ve ünlem yok.
- baslik: en fazla 95 karakter, haftanın en dikkat çeken Mersin sonucunu öne çıkarsın.
- ozet: 1-2 cümle.
- metin: her Mersin takımı için bir paragraf (haftanın sonucu, puan durumu, varsa sıralama değişimi, sıradaki maç); son paragraf Süper Lig'de zirve durumu (verildiyse). Paragraflar arasında boş satır.
Yalnızca JSON döndür: {"baslik":"","ozet":"","metin":""}`;

async function haftalikBulten({ servis, durum, veri, simdi }) {
  const tr = new Date(new Date(simdi).toLocaleString('en-US', { timeZone: TZ }));
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: TZ });
  const L = servis.spor?.ligler || {};
  const anlik = {};
  for (const l of Object.values(L)) for (const p of l.puan || []) if (p.mersin) anlik[p.takim] = { sira: p.sira, p: p.p, o: p.o };
  durum.haftalik ||= {};
  // İlk çalışmada karşılaştırma için anlık durumu sakla
  if (!durum.haftalik.siralar) durum.haftalik = { tarih: bugun, siralar: anlik };
  if (tr.getDay() !== 1 || tr.getHours() < 10 || durum.haftalik.yazilan === bugun || process.env.BULTEN_KAPALI) return 0;
  const onceki = durum.haftalik.siralar || {};
  const satirlar = [];
  for (const [kod, l] of Object.entries(L)) {
    for (const t of (l.puan || []).filter((x) => x.mersin)) {
      const o = onceki[t.takim];
      const oynanan = o ? Math.max(0, t.o - o.o) : 1;
      const benim = (m) => m.ev === t.takim || m.dep === t.takim;
      const sonuclar = Object.keys(l.haftalar || {}).map(Number).sort((a, b) => b - a)
        .map((n) => (l.haftalar[n] || []).find((m) => benim(m) && m.skor)).filter(Boolean).slice(0, oynanan);
      const siradaki = (l.maclar || []).filter((m) => benim(m) && !m.skor && m.tarih >= bugun).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
      satirlar.push([
        `Takım: ${t.takim} (${l.ad})`,
        sonuclar.length ? `Haftanın maçı: ${sonuclar.map((m) => `${m.ev} ${m.skor} ${m.dep}`).join('; ')}` : 'Bu hafta maçı yoktu',
        `Puan durumu: ${t.sira}. sıra, ${t.o} maç, ${t.p} puan (${t.g}G ${t.b}B ${t.m}M, attığı ${t.a}, yediği ${t.y})`,
        o && o.sira !== t.sira ? `Sıralama değişimi: geçen hafta ${o.sira}. sıradaydı, şimdi ${t.sira}.` : o ? 'Sıralama değişimi: yok' : '',
        siradaki ? `Sıradaki maç: ${gunAdi(siradaki.tarih)}${siradaki.saat ? ` ${siradaki.saat}` : ''}, ${siradaki.ev} – ${siradaki.dep}` : '',
      ].filter(Boolean).join('\n'));
    }
  }
  if (!satirlar.length) return 0;
  const sl = L['super-lig']?.puan || [];
  const slMetin = sl.length >= 3 ? `Süper Lig zirvesi: ${sl.slice(0, 3).map((t) => `${t.sira}. ${t.takim} ${t.p} puan`).join(', ')}` : '';
  const girdi = `${satirlar.join('\n\n')}\n\n${slMetin}`;
  let yazi = null;
  try {
    const j = await jsonYaz(BULTEN_TALIMAT, girdi, { sicaklik: 0.4, sadeceGemini: true });
    if (j?.baslik && j?.metin && j.metin.length > 200) yazi = { baslik: String(j.baslik).trim().slice(0, 110), ozet: String(j.ozet || '').trim(), metin: String(j.metin).trim() };
  } catch (e) {
    console.log('Haftalık bülten: yapay zekâ hatası, şablon kullanılıyor', e.message);
  }
  if (!yazi) {
    const paragraflar = Object.entries(L).flatMap(([, l]) => (l.puan || []).filter((x) => x.mersin).map((t) => `${t.takim}, ${t.o} maçta topladığı ${t.p} puanla ${l.ad} puan tablosunda ${t.sira}. sırada bulunuyor.`));
    if (slMetin) paragraflar.push(`${slMetin}.`);
    yazi = { baslik: 'Mersin takımlarında haftanın özeti', ozet: paragraflar[0], metin: paragraflar.join('\n\n') };
  }
  const zaman = new Date(simdi).toISOString();
  veri.hikayeler.push({
    id: 'b' + crypto.createHash('sha1').update(`bulten|${bugun}`).digest('hex').slice(0, 5),
    baslik: yazi.baslik,
    ozet: yazi.ozet,
    metin: yazi.metin,
    ilceler: [],
    genel: false,
    kategori: 'spor',
    riskNedenleri: [],
    durum: 'yayinda',
    onaylandi: false,
    ilkGorulme: zaman,
    sonGuncelleme: zaman,
    kaynaklar: [{ kaynakId: 'tff', ad: 'TFF', link: 'https://www.tff.org/', baslik: 'Puan durumları ve fikstür', tarih: zaman }],
    yaziKaynak: 'TFF',
    metinDenemesi: 2,
    macHaberi: true,
    bulten: true,
    kapak: 'bulten',
    gorselHatasi: 'kapak var',
  });
  durum.haftalik = { tarih: bugun, siralar: anlik, yazilan: bugun };
  console.log('Haftalık spor bülteni yazıldı:', yazi.baslik);
  return 1;
}

// ---------- Cuma: "Bu hafta sonu Süper Lig'de" programı ----------
export const BUYUKLER = ['Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor'];
const PROGRAM_TALIMAT = `Sen Mersin'de yayın yapan yerel bir haber sitesinin spor editörüsün. Süper Lig'in bu haftaki maç programı için kısa bir giriş yazısı yaz.
KURALLAR:
- SADECE verilen bilgileri kullan (takımların sırası, puanı, maç günü ve saati). Kadro, sakatlık, teknik direktör, stat, yayın kanalı, hakem, skor tahmini YAZMA.
- Tarafsız, sade haber dili; abartı yok.
- baslik: en fazla 90 karakter (örnek kalıp: "Süper Lig'de haftanın programı: X–Y derbisi pazar akşamı").
- ozet: 1-2 cümle.
- giris: 2 kısa paragraf, aralarında boş satır: haftanın öne çıkan maçları (derbi ya da üst sıradaki takımların karşılaşmaları) ve liderin maçı.
Yalnızca JSON döndür: {"baslik":"","ozet":"","giris":""}`;

async function haftasonuProgrami({ servis, durum, veri, simdi }) {
  const tr = new Date(new Date(simdi).toLocaleString('en-US', { timeZone: TZ }));
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: TZ });
  if (tr.getDay() !== 5 || tr.getHours() < 10 || durum.program === bugun) return 0;
  const sl = servis.spor?.ligler?.['super-lig'];
  const sinir = new Date(simdi + 4 * 864e5).toLocaleDateString('sv-SE', { timeZone: TZ });
  const maclar = (sl?.maclar || []).filter((m) => !m.skor && m.tarih >= bugun && m.tarih <= sinir).sort((a, b) => (a.tarih + (a.saat || '')).localeCompare(b.tarih + (b.saat || '')));
  if (maclar.length < 3) return 0;
  const sira = (ad) => (sl.puan || []).find((p) => p.takim === ad);
  const etiket = (ad) => { const p = sira(ad); return p ? `${ad} (${p.sira}., ${p.p} puan)` : ad; };
  const derbi = (m) => BUYUKLER.includes(m.ev) && BUYUKLER.includes(m.dep);
  const girdi = maclar.map((m) => `${gunAdi(m.tarih)} ${m.saat || ''}: ${etiket(m.ev)} – ${etiket(m.dep)}${derbi(m) ? ' [DERBİ]' : ''}`).join('\n') + `\nLider: ${sl.puan?.[0]?.takim}`;
  let yazi = null;
  try {
    const j = await jsonYaz(PROGRAM_TALIMAT, girdi, { sicaklik: 0.4, sadeceGemini: true });
    if (j?.baslik && j?.giris) yazi = { baslik: String(j.baslik).trim().slice(0, 110), ozet: String(j.ozet || '').trim(), giris: String(j.giris).trim() };
  } catch (e) {
    console.log('Hafta sonu programı: yapay zekâ hatası, şablon kullanılıyor', e.message);
  }
  const d = maclar.find(derbi);
  if (!yazi) {
    const lider = sl.puan?.[0]?.takim;
    const lm = maclar.find((m) => m.ev === lider || m.dep === lider);
    yazi = {
      baslik: d ? `Süper Lig'de haftanın programı: ${d.ev}–${d.dep} derbisi` : "Süper Lig'de bu hafta sonu oynanacak maçlar",
      ozet: `Trendyol Süper Lig'de bu haftanın ${maclar.length} maçı ${gunAdi(maclar[0].tarih)} başlıyor.`,
      giris: [d ? `Haftanın en dikkat çeken maçında ${etiket(d.ev)}, ${gunAdi(d.tarih)} saat ${d.saat} itibarıyla ${etiket(d.dep)} ile karşılaşacak.` : '', lm ? `Lider ${lider}, ${gunAdi(lm.tarih)} ${lm.ev === lider ? `sahasında ${lm.dep}` : `deplasmanda ${lm.ev}`} ile oynayacak.` : ''].filter(Boolean).join('\n\n'),
    };
  }
  // Gün gün program: her gün bir paragraf
  const gunler = [...new Set(maclar.map((m) => m.tarih))];
  const program = gunler.map((g) => `${gunAdi(g)}: ${maclar.filter((m) => m.tarih === g).map((m) => `${m.saat ? `${m.saat} ` : ''}${m.ev} – ${m.dep}`).join(' · ')}`);
  const zaman = new Date(simdi).toISOString();
  veri.hikayeler.push({
    id: 'p' + crypto.createHash('sha1').update(`program|${bugun}`).digest('hex').slice(0, 5),
    baslik: yazi.baslik,
    ozet: yazi.ozet,
    metin: [yazi.giris, 'Haftanın programı:', ...program].join('\n\n'),
    ilceler: [],
    genel: true,
    kalici: true,
    kategori: 'spor',
    riskNedenleri: [],
    durum: 'yayinda',
    onaylandi: false,
    ilkGorulme: zaman,
    sonGuncelleme: zaman,
    kaynaklar: [{ kaynakId: 'tff', ad: 'TFF', link: sl.kaynak || 'https://www.tff.org/', baslik: 'Trendyol Süper Lig fikstür', tarih: zaman }],
    yaziKaynak: 'TFF',
    metinDenemesi: 2,
    macHaberi: true,
    kapak: 'superlig',
    gorselHatasi: 'kapak var',
  });
  durum.program = bugun;
  console.log('Hafta sonu Süper Lig programı yazıldı:', yazi.baslik);
  return 1;
}

// Haftalık sonuç listesinde bu maç skoru zaten varsa tablo da büyük ihtimalle bu maçı içeriyor
function sonucTabloda(l, m) {
  return Object.values(l.haftalar || {}).some((liste) => liste.some((x) => x.ev === m.ev && x.dep === m.dep && x.skor === m.skor));
}

main().catch((e) => {
  console.error('Maç haberi hatası:', e.message);
});
