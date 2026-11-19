// Spor verileri: resmî TFF sitesinden (tff.org) puan durumu, haftanın maçları ve A Milli Takım sonuçları.
// TFF sayfaları Windows-1254 kodlamalı ve iç içe tablolarla kurulu; en içteki satırlar okunur.

const TFF = 'https://www.tff.org/Default.aspx?pageID=';
export const KAYNAKLAR = {
  superLig: { url: `${TFF}198`, ad: 'Trendyol Süper Lig' },
  ucuncuLig: { url: `${TFF}971&grupID=3545`, ad: 'Nesine 3. Lig 3. Grup' },
  milli: { url: `${TFF}425`, ad: 'A Milli Takım' },
};
// Mersin takımları (adında geçen ifade)
export const MERSIN_TAKIMLARI = ['MERSİN', 'SİLİFKE', 'TARSUS', 'ERDEMLİ', 'ANAMUR', 'MUT '];

const temizle = (s) =>
  String(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();

// İç içe olmayan satırların hücreleri
export function satirlar(html) {
  return String(html)
    .split(/<tr[\s>]/i)
    .slice(1)
    .filter((p) => !/<table/i.test(p.split(/<\/tr>/i)[0]))
    .map((p) => [...p.split(/<\/tr>/i)[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => temizle(m[1])));
}

// "YENİ MERSİN İDMANYURDU FUTBOL A.Ş." → "Yeni Mersin İdmanyurdu"
export function takimAdi(ad) {
  let s = String(ad).trim();
  for (let i = 0; i < 3; i++) s = s.replace(/\s+(FUTBOL SPOR KULÜBÜ|FUTBOL KULÜBÜ|SPORTİF FAALİYETLER A\.Ş\.|FUTBOL A\.Ş\.|A\.Ş\.|KULÜBÜ|FUTBOL)$/u, '');
  return s
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map((k) => (/^(fk|sk)$/.test(k) ? k.toLocaleUpperCase('tr-TR') : k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1)))
    .join(' ')
    .replace(/\b(Uefa|Fifa|Afc|Fk|Sk)\b/g, (k) => k.toLocaleUpperCase('tr-TR'));
}

export const mersinMi = (ad) => MERSIN_TAKIMLARI.some((m) => String(ad).toLocaleUpperCase('tr-TR').includes(m));

export function puanCoz(html) {
  const liste = [];
  for (const c of satirlar(html)) {
    if (c.length < 9) continue;
    const m = c[0].match(/^(\d+)\.\s*(.+)$/);
    const sayilar = c.slice(1, 9).map((x) => Number(x));
    if (!m || sayilar.some((x) => Number.isNaN(x))) continue;
    const [o, g, b, mg, a, y, av, p] = sayilar;
    liste.push({ sira: Number(m[1]), takim: takimAdi(m[2]), ham: m[2], o, g, b, m: mg, a, y, av, p, mersin: mersinMi(m[2]) });
  }
  // Sayfada başka sıralı satırlar da var ("1. Devre 1 2 3 ..." gibi hafta seçicileri): en uzun 1,2,3… dizisini al
  const diziler = [];
  for (const sat of liste.filter((x) => /[A-ZÇĞİÖŞÜ]{2}/.test(x.ham) && !/^devre$/i.test(x.ham))) {
    const son = diziler.at(-1);
    if (son && sat.sira === son.at(-1).sira + 1) son.push(sat);
    else diziler.push([sat]);
  }
  return diziler.sort((a, b) => b.length - a.length)[0] || [];
}

// Haftanın maçları: [tarih (ve saat), ev, skor, deplasman, ...]
export function haftaCoz(html) {
  const maclar = [];
  for (const c of satirlar(html)) {
    const t = c[0]?.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}))?$/);
    if (!t || c.length < 4) continue;
    const skor = /^\d+\s*-\s*\d+$/.test(c[2]) ? c[2].replace(/\s/g, '') : null;
    maclar.push({ tarih: `${t[3]}-${t[2]}-${t[1]}`, saat: t[4] || null, ev: takimAdi(c[1]), skor, dep: takimAdi(c[3]), mersin: mersinMi(c[1]) || mersinMi(c[3]) });
  }
  return maclar;
}

// A Milli: [ev, skor, deplasman, tarih, organizasyon, takım tipi]
export function milliCoz(html) {
  return satirlar(html)
    .filter((c) => c.length >= 6 && /^\d{2}\.\d{2}\.\d{4}$/.test(c[3]) && /A Milli/i.test(c[5]))
    .map((c) => {
      const [g, a, y] = c[3].split('.');
      return { ev: takimAdi(c[0]), skor: c[1].replace(/\s/g, ''), dep: takimAdi(c[2]), tarih: `${y}-${a}-${g}`, organizasyon: takimAdi(c[4]) };
    });
}

export async function sayfa(url, ua) {
  const r = await fetch(url, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  const b = Buffer.from(await r.arrayBuffer());
  const utf = new TextDecoder('utf-8').decode(b);
  return /�/.test(utf) ? new TextDecoder('windows-1254').decode(b) : utf;
}

export async function sporGetir(ua) {
  const sonuc = { guncelleme: new Date().toISOString() };
  for (const [k, v] of Object.entries(KAYNAKLAR)) {
    try {
      const html = await sayfa(v.url, ua);
      if (k === 'milli') sonuc.milli = { ad: v.ad, kaynak: v.url, maclar: milliCoz(html).slice(0, 8) };
      else sonuc[k] = { ad: v.ad, kaynak: v.url, puan: puanCoz(html), maclar: haftaCoz(html) };
    } catch (e) {
      console.warn(`! Spor (${v.ad}): ${e.message}`);
    }
    await new Promise((x) => setTimeout(x, 1500));
  }
  return sonuc;
}

// Sayfadaki takım bağlantılarından TFF kulüp numaraları: { "Yeni Mersin İdmanyurdu": "1484" }
export function kulupKimlikleri(html) {
  const harita = {};
  for (const m of String(html).matchAll(/kulupI[dD]=(\d+)[^>]*>([\s\S]{0,400}?)<\/a>/g)) {
    const ad = temizle(m[2]).replace(/^\d+\.\s*/, '');
    if (ad && /[A-Za-zÇĞİÖŞÜçğıöşü]{2}/.test(ad)) harita[takimAdi(ad)] = m[1];
  }
  return harita;
}

// ---------- Ligler (puan durumu + son 5 maç formu) ----------
export const LIGLER = [
  { kod: 'super-lig', ad: 'Trendyol Süper Lig', kisa: 'Süper Lig', url: `${TFF}198`, form: true },
  { kod: '1-lig', ad: 'Trendyol 1. Lig', kisa: '1. Lig', url: `${TFF}142`, form: true },
  { kod: '2-lig-beyaz', ad: 'Nesine 2. Lig Beyaz Grup', kisa: '2. Lig Beyaz', url: `${TFF}976&grupID=3541`, form: true },
  { kod: '2-lig-kirmizi', ad: 'Nesine 2. Lig Kırmızı Grup', kisa: '2. Lig Kırmızı', url: `${TFF}976&grupID=3542`, form: true },
  { kod: '3-lig-1', ad: 'Nesine 3. Lig 1. Grup', kisa: '3. Lig 1. Grup', url: `${TFF}971&grupID=3543`, form: true },
  { kod: '3-lig-2', ad: 'Nesine 3. Lig 2. Grup', kisa: '3. Lig 2. Grup', url: `${TFF}971&grupID=3544`, form: true },
  { kod: '3-lig-3', ad: 'Nesine 3. Lig 3. Grup', kisa: '3. Lig 3. Grup', url: `${TFF}971&grupID=3545`, form: true, mersin: true },
];

// Takım adlarını eşleştirmek için sadeleştir ("Amed Sportif Faaliyetler" ~ "Amed")
const sade = (ad) => String(ad).toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9 ]/g, ' ').replace(/\b(spor|sk|fk|kulübü|futbol|a ş|as|belediyespor|belediye)\b/g, ' ').replace(/\s+/g, ' ').trim();
export function ayniTakim(a, b) {
  const x = sade(a), y = sade(b);
  if (!x || !y) return false;
  if (x === y || x.startsWith(y) || y.startsWith(x)) return true;
  const xs = x.split(' '), ys = y.split(' ');
  return xs[0] === ys[0] && (xs[0].length > 4 || xs[1] === ys[1]);
}

// Hafta sonuçlarından her takımın son 5 maçı (eskiden yeniye): G / B / M
export function formHesapla(puan, haftalar) {
  const form = {};
  const sirali = Object.keys(haftalar).map(Number).sort((a, b) => a - b);
  for (const t of puan) {
    const f = [];
    for (const n of sirali) {
      const mac = (haftalar[n] || []).find((m) => m.skor && (ayniTakim(m.ev, t.takim) || ayniTakim(m.dep, t.takim)));
      if (!mac) continue;
      const [e, d] = mac.skor.split('-').map(Number);
      const evde = ayniTakim(mac.ev, t.takim);
      const fark = evde ? e - d : d - e;
      f.push(fark > 0 ? 'G' : fark === 0 ? 'B' : 'M');
    }
    form[t.takim] = f.slice(-5);
  }
  return form;
}

export async function liglerGetir(ua, eski = {}) {
  const sonuc = {};
  for (const lig of LIGLER) {
    try {
      const html = await sayfa(lig.url, ua);
      const puan = puanCoz(html);
      if (!puan.length) throw new Error('puan tablosu okunamadı');
      const kayit = { ad: lig.ad, kisa: lig.kisa, kaynak: lig.url, puan, maclar: haftaCoz(html), haftalar: eski[lig.kod]?.haftalar || {}, kulup: kulupKimlikleri(html) };
      if (lig.form) {
        const oynanan = Math.max(...puan.map((x) => x.o));
        // Son 5 haftanın sonuçları; eski haftalar önbellekten, son 2 hafta her seferinde yenilenir
        for (let n = Math.max(1, oynanan - 4); n <= oynanan + 1; n++) {
          if (kayit.haftalar[n] && n < oynanan - 1) continue;
          try {
            await new Promise((x) => setTimeout(x, 1200));
            const mac = haftaCoz(await sayfa(`${lig.url}&hafta=${n}`, ua));
            if (mac.length) kayit.haftalar[n] = mac.map(({ ev, dep, skor }) => ({ ev, dep, skor }));
          } catch (e) {
            console.warn(`! ${lig.kisa} ${n}. hafta: ${e.message}`);
          }
        }
        for (const n of Object.keys(kayit.haftalar)) if (Number(n) < oynanan - 6) delete kayit.haftalar[n];
        kayit.form = formHesapla(puan, kayit.haftalar);
      }
      sonuc[lig.kod] = kayit;
    } catch (e) {
      console.warn(`! Lig (${lig.kisa}): ${e.message}`);
      if (eski[lig.kod]) sonuc[lig.kod] = eski[lig.kod];
    }
    await new Promise((x) => setTimeout(x, 1200));
  }
  return sonuc;
}
