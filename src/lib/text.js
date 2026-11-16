import { ILCELER, KATEGORILER, RISK_KELIMELERI } from '../config.js';

// Türkçe büyük/küçük harf dönüşümü (İ/ı sorununu çözer)
export function kucuk(s = '') {
  return s.toLocaleLowerCase('tr-TR');
}

export function slugify(s = '') {
  const map = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u' };
  return kucuk(s)
    .replace(/[çğıiöşü]/g, (c) => map[c] || c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// HTML etiketlerini ve fazla boşlukları temizler
export function duzMetin(s = '') {
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function htmlKacis(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Başlıklardaki " - Hürriyet" gibi site eklerini temizler
export function baslikTemizle(baslik = '', kaynakAdi = '') {
  let b = duzMetin(baslik);
  if (kaynakAdi) {
    const ek = new RegExp(`\\s*[-|–]\\s*${kaynakAdi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    b = b.replace(ek, '');
  }
  return b.replace(/^son dakika[:!\s-]*/i, '').trim();
}

const DURAK = new Set(
  've ile için bir bu da de mi mı mu mü ne o şu gibi daha en çok olan oldu olarak sonra önce yeni son dakika haber haberi'.split(' ')
);

// Başlığı karşılaştırma için kelime kümesine çevirir. Ekler kısaltılır (ilk 5 harf),
// böylece "Tarsus'ta" ile "Tarsus" aynı kelime sayılır.
export function kelimeler(s = '') {
  return new Set(
    kucuk(duzMetin(s))
      .replace(/[’'`]/g, ' ')
      .replace(/[^a-zçğıöşü0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !DURAK.has(w))
      .map((w) => w.slice(0, 5))
  );
}

export function benzerlik(a, b) {
  const A = a instanceof Set ? a : kelimeler(a);
  const B = b instanceof Set ? b : kelimeler(b);
  if (!A.size || !B.size) return 0;
  let ortak = 0;
  for (const w of A) if (B.has(w)) ortak++;
  return ortak / (A.size + B.size - ortak);
}

function kelimeVar(metinKucuk, kelime) {
  // kelimenin başında olmalı: "tarsus'ta" eşleşir, "antarsus" eşleşmez
  const k = kucuk(kelime).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-zçğıöşü])${k}`, 'u').test(metinKucuk);
}

export function mersinIlgili(metin = '') {
  return kelimeVar(kucuk(metin), 'mersin');
}

// Metinde geçen ilçeleri bulur.
// yerelKaynak=false iken belirsiz ilçeler ancak metinde "Mersin" de geçiyorsa sayılır.
export function ilceBul(metin = '', { yerelKaynak = false } = {}) {
  const k = kucuk(metin);
  const mersinVar = mersinIlgili(metin);
  const bulunan = [];
  for (const ilce of ILCELER) {
    if (ilce.slug === 'mut') {
      // "Mut" kısa bir kelime: büyük harfle ve kelime olarak geçmeli
      if (!/(^|[^A-Za-zÇĞİÖŞÜçğıöşü])Mut(['’]|\b)/u.test(metin)) continue;
    } else if (ilce.slug === 'akdeniz') {
      // "Akdeniz" deniz/bölge de olabilir; ilçe olduğuna dair ipucu ara
      if (!/akdeniz (ilçe|belediye|kaymakam)|akdeniz['’]de|akdeniz ilçesinde/u.test(k)) continue;
    } else if (!kelimeVar(k, ilce.ad)) {
      continue;
    }
    if (ilce.belirsiz && !yerelKaynak && !mersinVar) continue;
    bulunan.push(ilce.slug);
  }
  return bulunan;
}

export function kategoriBul(metin = '') {
  const k = kucuk(metin);
  let enIyi = null;
  let enCok = 0;
  for (const kat of KATEGORILER) {
    const sayi = kat.kelimeler.filter((w) => kelimeVar(k, w)).length;
    if (sayi > enCok) {
      enCok = sayi;
      enIyi = kat.slug;
    }
  }
  return enIyi || 'gundem';
}

// Haber riskli mi? Riskliyse nedenlerini döndürür.
export function riskBul(metin = '') {
  const k = kucuk(metin);
  const nedenler = [];
  for (const [neden, liste] of Object.entries(RISK_KELIMELERI)) {
    if (liste.some((w) => kelimeVar(k, w))) nedenler.push(neden);
  }
  return nedenler;
}

export function kisaKimlik(s = '') {
  // basit ve kararlı bir özet (hash) – haber kimliği için
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// Türkçe ayrılma hâli eki: Tarsus'tan, Erdemli'den, Mut'tan
export function ayrilmaEki(ad = '') {
  const k = kucuk(ad);
  const unluler = k.match(/[aıoueiöü]/g) || ['e'];
  const son = unluler[unluler.length - 1];
  const kalin = 'aıou'.includes(son);
  const sert = /[fstkçşhp]$/.test(k);
  return `${sert ? 't' : 'd'}${kalin ? 'an' : 'en'}`;
}
