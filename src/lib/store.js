import fs from 'node:fs';
import path from 'node:path';
import { AYAR } from '../config.js';
import { benzerlik, kelimeler, kisaKimlik, ilceBul, kategoriBul, riskBul, mersinIlgili, yerelIsaretVar } from './text.js';

export const VERI_KLASORU = path.resolve(process.env.VERI_KLASORU || 'data');
export const VERI_DOSYASI = path.join(VERI_KLASORU, 'haberler.json');

export function yukle(dosya = VERI_DOSYASI) {
  if (!fs.existsSync(dosya)) return { guncelleme: null, hikayeler: [] };
  return JSON.parse(fs.readFileSync(dosya, 'utf8'));
}

export function kaydet(veri, dosya = VERI_DOSYASI) {
  fs.mkdirSync(path.dirname(dosya), { recursive: true });
  veri.guncelleme = new Date().toISOString();
  fs.writeFileSync(dosya, JSON.stringify(veri, null, 1));
}

// Eski haberleri siler
export function temizle(veri, simdi = Date.now()) {
  const sinir = simdi - AYAR.saklamaGun * 24 * 3600 * 1000;
  const genelSinir = simdi - 24 * 3600 * 1000;
  veri.hikayeler = veri.hikayeler.filter((h) => {
    if (new Date(h.sonGuncelleme).getTime() < sinir) return false;
    // Bir günde önemli hâle gelmeyen Türkiye/dünya haberini tutmaya gerek yok
    if (h.genel && !onemliMi(h) && new Date(h.ilkGorulme).getTime() < genelSinir) return false;
    return true;
  });
  return veri;
}

// Kaynaktan gelen tek bir haberi değerlendirir: Mersin ile ilgili mi, hangi ilçe?
// İlgisizse null döner.
export function haberiDegerlendir(ham, kaynak) {
  // Foto/video galerileri haber değil
  if (/\/(galeri|foto-?galeri|video-?galeri|videolar?|resimler?)\//i.test(ham.link || '')) return null;
  const metin = `${ham.baslik} ${ham.aciklama || ''}`;
  const yerel = kaynak.kapsam === 'yerel' || kaynak.kapsam === 'kurum';
  const karma = kaynak.kapsam === 'karma';
  let ilceler = ilceBul(metin, { yerelKaynak: yerel || karma });
  // Mersin dışı haber "genel" (Türkiye/dünya) olarak işaretlenir; ancak birkaç site
  // birden yazarsa önemli sayılıp yayınlanır (bkz. onemliMi).
  let genel = false;
  if (karma) {
    const isaret = yerelIsaretVar(metin);
    // Yenişehir Bursa/Diyarbakır'da da var: karma kaynakta tek başına yetmez
    if (!isaret) ilceler = ilceler.filter((s) => s !== 'yenisehir');
    if (!isaret && ilceler.length === 0) genel = true;
  } else if (!yerel && !mersinIlgili(metin) && ilceler.length === 0) {
    genel = true;
  }
  return {
    ...ham,
    ilceler,
    genel,
    kategori: kategoriBul(metin),
    riskNedenleri: riskBul(metin),
  };
}

// Haberi mevcut hikâyelere ekler; benzer bir hikâye varsa birleştirir.
// Dönen değer: { hikaye, yeni: boolean, eklendi: boolean }
export function hikayeyeEkle(veri, haber, kaynak) {
  const simdi = Date.now();
  const linkVar = veri.hikayeler.find((h) => h.kaynaklar.some((k) => k.link === haber.link));
  if (linkVar) return { hikaye: linkVar, yeni: false, eklendi: false };

  const k1 = kelimeler(haber.baslik);
  const pencere = AYAR.birlestirmeSaat * 3600 * 1000;
  let enIyi = null;
  let enIyiSkor = 0;
  for (const h of veri.hikayeler) {
    if (simdi - new Date(h.sonGuncelleme).getTime() > pencere) continue;
    for (const kk of h.kaynaklar) {
      const skor = benzerlik(k1, kelimeler(kk.baslik));
      if (skor > enIyiSkor) {
        enIyiSkor = skor;
        enIyi = h;
      }
    }
  }

  const kayit = {
    kaynakId: kaynak.id,
    ad: kaynak.ad,
    link: haber.link,
    baslik: haber.baslik,
    tarih: haber.tarih || new Date().toISOString(),
  };

  if (enIyi && enIyiSkor >= AYAR.birlestirmeEsigi) {
    if (!enIyi.kaynaklar.some((k) => k.kaynakId === kaynak.id)) {
      enIyi.kaynaklar.push(kayit);
    }
    enIyi.ilceler = [...new Set([...enIyi.ilceler, ...haber.ilceler])];
    if (!haber.genel) enIyi.genel = false;
    enIyi.riskNedenleri = [...new Set([...enIyi.riskNedenleri, ...haber.riskNedenleri])];
    enIyi.sonGuncelleme = new Date().toISOString();
    if (kaynak.yapayZekaOzeti && (haber.govde || haber.aciklama) && (!enIyi.ozet || (!enIyi.metin && haber.govde))) {
      enIyi.ozetIcinMetin = haber.govde || haber.aciklama;
    }
    if (kaynak.kapsam === 'kurum') enIyi.kurum = kaynak.ad;
    // Yayındaki bir hikâyeye riskli kaynak eklendiyse tekrar onaya düşer
    if (enIyi.durum === 'yayinda' && haber.riskNedenleri.length && !enIyi.onaylandi) {
      enIyi.durum = 'onay-bekliyor';
    }
    return { hikaye: enIyi, yeni: false, eklendi: true };
  }

  const hikaye = {
    id: kisaKimlik(haber.link),
    baslik: haber.baslik,
    ozet: null,
    ozetIcinMetin: kaynak.yapayZekaOzeti ? haber.govde || haber.aciklama || null : null,
    ...(kaynak.kapsam === 'kurum' ? { kurum: kaynak.ad } : {}),
    ilceler: haber.ilceler,
    genel: !!haber.genel,
    kategori: haber.kategori,
    riskNedenleri: haber.riskNedenleri,
    durum: haber.riskNedenleri.length ? 'onay-bekliyor' : 'yayinda',
    onaylandi: false,
    ilkGorulme: kayit.tarih,
    sonGuncelleme: new Date().toISOString(),
    kaynaklar: [kayit],
  };
  veri.hikayeler.push(hikaye);
  return { hikaye, yeni: true, eklendi: true };
}

// Mersin haberi her zaman; Türkiye/dünya haberi ancak yeterince site yazdıysa
export function onemliMi(h) {
  if (!h.genel) return true;
  return new Set(h.kaynaklar.map((k) => k.ad)).size >= AYAR.genelKaynakEsigi;
}

export function yayindakiler(veri) {
  return veri.hikayeler
    .filter((h) => h.durum === 'yayinda' && onemliMi(h))
    .sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme));
}
