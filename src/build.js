// Siteyi data/ klasöründeki verilerden üretir ve dist/ klasörüne yazar.
import fs from 'node:fs';
import path from 'node:path';
import { SITE, ILCELER } from './config.js';
import { yukle, yayindakiler, VERI_KLASORU } from './lib/store.js';
import { ilceAdi, uyarilariAyarla } from './templates/layout.js';
import { depremUyarisi, okulUyarisi } from './lib/uyarilar.js';
import { okulSayfasi } from './templates/okul.js';
import { KONULAR, konuBul } from './konular.js';
import * as S from './templates/sayfalar.js';
import * as IS from './templates/ilceServis.js';
import { ulasimSayfasi } from './templates/ulasim.js';
import { gundemimSayfasi, akisVerisi } from './templates/gundemim.js';
import { logolariAyarla } from './templates/servisParcalari.js';
import { akaryakitIlSayfasi, akaryakitTurkiyeSayfasi, namazIlSayfasi, namazTurkiyeSayfasi, havaIlSayfasi, havaTurkiyeSayfasi, sonDepremlerSayfasi, ilDepremSayfasi, okulIlSayfasi, karTatiliSayfasi, depremIli, depremIlYolu, ulusalMevcutAyarla, mersinDepremSayfasi, PIYASA_KALEMLERI, piyasaKalemSayfasi, piyasaKalemYolu } from './templates/ulusal.js';
import ILLER81 from './iller.json' with { type: 'json' };
import { reklamSayfasi } from './templates/reklam.js';
import { vakitListesi } from './lib/vakitHesap.js';
import { takimSayfasi, takimYolu } from './templates/spor.js';
import { sayfa as sayfaYap } from './templates/layout.js';
import { mahalleVerisi, mahalleSayfasi, mahallelerSayfasi, mahalleYolu } from './templates/mahalle.js';
import { geziListeSayfasi, geziSayfasi, geziYerleri, geziYolu } from './templates/gezi.js';
import { arsivAySayfasi } from './templates/arsiv.js';
import { arsivYukle } from './lib/arsiv.js';
import * as R from './templates/rehber.js';
import * as B from './templates/bilgi.js';
import { LIGLER } from './lib/spor.js';
import { baslikTemizle, kategoriBul, htmlKacis } from './lib/text.js';
import { kendiSayfasiVar, sayfasiVar, haberYolu, kapakAdresi } from './templates/parcalar.js';
import { okunanlarEsle } from './lib/okunanlar.js';

const DIST = path.resolve('dist');

function yaz(yol, icerik) {
  const dosya = yol.endsWith('/') ? path.join(DIST, yol, 'index.html') : path.join(DIST, yol);
  fs.mkdirSync(path.dirname(dosya), { recursive: true });
  fs.writeFileSync(dosya, icerik);
}

function servisYukle() {
  try {
    return JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'servisler.json'), 'utf8'));
  } catch {
    return {};
  }
}

export function insaEt({ simdi = Date.now() } = {}) {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  fs.cpSync(path.resolve('public'), DIST, { recursive: true });

  const veri = yukle();
  // Eski kayıtlarda kalan TAMAMI BÜYÜK başlıklar da düzelsin
  // Kategori kuralları güncellendiyse eski kayıtlar da yeni kurala göre renklensin
  const hikayeler = yayindakiler(veri).map((x) => {
    const k = kategoriBul(x.baslik);
    return { ...x, baslik: baslikTemizle(x.baslik), kategori: k !== 'gundem' ? k : x.kategori };
  });
  const servis = servisYukle();
  let bilgiYazilari = [];
  try {
    bilgiYazilari = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'bilgi.json'), 'utf8')).yazilar || [];
  } catch {}
  servis.bilgi = bilgiYazilari;
  logolariAyarla();
  let ozetArsiv = [];
  try {
    ozetArsiv = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'ozet.json'), 'utf8')).arsiv || [];
  } catch {}
  servis.ozet = ozetArsiv[0] || null;
  // Meteoroloji uyarısı haberi (MGM verisi alınamazsa yedek): son 18 saatte Mersin'i ilgilendiren uyarı haberi
  servis.meteoHaber = hikayeler.find(
    (x) =>
      simdi - new Date(x.ilkGorulme).getTime() < 18 * 36e5 &&
      /(sarı|turuncu|kırmızı) kod|meteoroloji.{0,40}uyar|uyarı.{0,20}(yağış|sağanak|fırtına|sel)|(kuvvetli|şiddetli) (yağış|sağanak|rüzgar|fırtına)/i.test(x.baslik) &&
      (!x.genel || /mersin|akdeniz|doğu akdeniz|çukurova/i.test(x.baslik))
  ) || null;
  // Elektrik kesintisi haberleri (Toroslar EDAŞ listesi sadece doğrulamalı adres sorgusuyla alınabiliyor)
  servis.elektrikHaber = hikayeler
    .filter((x) => !x.genel && simdi - new Date(x.ilkGorulme).getTime() < 48 * 36e5 && /elektrik(ler)? kesinti|elektrik(ler)?\s.{0,20}kesil|elektriksiz kal/i.test(x.baslik))
    .slice(0, 3)
    .map((x) => ({ baslik: x.baslik, yol: sayfasiVar(x) ? haberYolu(x) : x.kaynaklar[0].link, ilkGorulme: x.ilkGorulme }));
  // En sıcak haberler: Mersin'den en son gelen 5 haber, yeniden eskiye
  servis.enCokOkunan = hikayeler
    .filter((x) => !x.genel)
    .sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme))
    .slice(0, 5)
    .map((x) => ({ yol: sayfasiVar(x) ? haberYolu(x) : x.kaynaklar[0].link, baslik: x.baslik, gorsel: kapakAdresi(x).src, zaman: x.ilkGorulme }));

  // Okul tatili kararları (haber bağlantısı canlı listeden ya da arşivden)
  let okul = { kararlar: [] };
  try {
    okul = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'okul.json'), 'utf8'));
  } catch {}
  for (const k of okul.kararlar) {
    const x = hikayeler.find((y) => y.id === k.haberId);
    k.link = x ? (sayfasiVar(x) ? haberYolu(x) : x.kaynaklar[0].link) : arsivYukle().find((y) => y.id === k.haberId)?.yol || '/okullar-tatil-mi/';
  }
  // Site geneli uyarı bantları
  servis.okul = okul;
  // Son dakika: otomatik haberlerden önemli olanlar (deprem, yol kapanması, uçuş iptali, hava uyarısı) 3 saat üstte bant olarak
  const resmiBantlar = [depremUyarisi(servis.deprem, simdi), okulUyarisi(okul.kararlar, simdi)].filter(Boolean);
  const sonDakika = hikayeler
    .filter((x) => x.sonDakika && simdi - new Date(x.ilkGorulme).getTime() < 3 * 36e5)
    .filter((x) => !(x.kapak === 'deprem' && resmiBantlar.some((b) => b.tur === 'deprem')) && !(x.kapak === 'okul' && resmiBantlar.some((b) => b.tur === 'okul')))
    .slice(0, 2)
    .map((x) => ({ tur: 'sondakika', ikon: '🔴', baslik: 'Son dakika:', metin: x.baslik, link: haberYolu(x), bitis: new Date(x.ilkGorulme).getTime() + 3 * 36e5 }));
  uyarilariAyarla([...resmiBantlar, ...sonDakika]);

  const sayfalar = [];
  const ekle = (yol, html, haritaya = true) => {
    yaz(yol, html);
    if (haritaya) sayfalar.push(yol);
  };

  ekle('/', S.anaSayfa({ hikayeler, servis, simdi }));
  ekle('/ilceler/', S.ilcelerSayfasi({ hikayeler, servis, simdi }));
  // Kendi haber sayfaları (kurum duyurularından kendi cümlelerimizle yazılanlar)
  const kendiHaberler = hikayeler.filter(kendiSayfasiVar);
  // Konu sayfaları: canlı Mersin haberleri + arşiv; en az 3 haberi olan konular açılır
  const arsivTum = arsivYukle();
  const canliId = new Set(hikayeler.map((x) => x.id));
  const konuHavuzu = [...hikayeler.filter((x) => !x.genel), ...arsivTum.filter((x) => !x.genel && !canliId.has(x.id))].sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme));
  const acikKonular = KONULAR.map((k) => ({ ...k, liste: konuHavuzu.filter((x) => k.desen.test(x.baslik)) })).filter((k) => k.liste.length >= 3);
  const acikSlug = new Set(acikKonular.map((k) => k.slug));
  const konuEtiketi = (x) => (x.genel ? [] : konuBul(x).filter((k) => acikSlug.has(k.slug)).slice(0, 3).map(({ slug, ad }) => ({ slug, ad })));
  for (const hikaye of hikayeler.filter(sayfasiVar)) {
    const ilgili = hikayeler.filter((x) => x.id !== hikaye.id && (!hikaye.ilceler.length || x.ilceler.some((i) => hikaye.ilceler.includes(i)))).slice(0, 6);
    yaz(haberYolu(hikaye), S.haberSayfasi({ hikaye: { ...hikaye, konular: konuEtiketi(hikaye) }, ilgili, servis, tumHaberler: hikayeler }));
  }
  // Kalıcı arşiv: canlı listeden düşmüş kendi haberlerimizin sayfaları ve aylık arşiv listeleri
  const canliIdler = new Set(hikayeler.map((x) => x.id));
  const arsiv = arsivTum.filter((x) => !canliIdler.has(x.id));
  for (const hikaye of arsiv) {
    const ilgili = hikayeler.filter((x) => !x.genel && (!hikaye.ilceler.length || x.ilceler.some((i) => hikaye.ilceler.includes(i)))).slice(0, 6);
    yaz(hikaye.yol, S.haberSayfasi({ hikaye: { ...hikaye, konular: konuEtiketi(hikaye) }, ilgili, servis }));
  }
  for (const konu of acikKonular) ekle(`/konu/${konu.slug}/`, S.konuSayfasi({ konu, konular: acikKonular, servis }));
  if (acikKonular.length) ekle('/konular/', S.konularSayfasi({ konular: acikKonular, servis }));
  const tumKendi = [...kendiHaberler.map((x) => ({ ...x, yol: haberYolu(x) })), ...arsiv].sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme));
  const aylar = [...new Set(tumKendi.map((x) => new Date(x.ilkGorulme).toLocaleDateString('sv-SE', { timeZone: SITE.timezone }).slice(0, 7)))];
  for (const ay of aylar) {
    const liste = tumKendi.filter((x) => new Date(x.ilkGorulme).toLocaleDateString('sv-SE', { timeZone: SITE.timezone }).startsWith(ay));
    ekle(`/arsiv/${ay}/`, arsivAySayfasi({ ay, hikayeler: liste, aylar, servis }));
  }
  if (aylar.length) yaz('/arsiv/index.html', `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/arsiv/${aylar[0]}/"><link rel="canonical" href="${SITE.url}/arsiv/${aylar[0]}/">`);
  servis.arsivSayisi = arsiv.length;
  const ilceHavuzu = [...hikayeler, ...arsivYukle().filter((x) => !hikayeler.some((y) => y.id === x.id))];
  // 81 il: akaryakıt ve namaz vakitleri
  let ulusal = { akaryakit: {}, namaz: {} };
  try {
    ulusal = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'ulusal.json'), 'utf8'));
  } catch {}
  ulusal.namaz ||= {};
  if (servis.namaz?.bolgeler?.['9737']) ulusal.namaz.mersin = { vakitler: servis.namaz.bolgeler['9737'] };
  const bugunTR = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  ulusalMevcutAyarla('akaryakit', new Set(ILLER81.filter((i) => Object.keys(ulusal.akaryakit?.[i.slug]?.ilceler || {}).length).map((i) => i.slug)));
  // Diyanet verisi alınamayan iller için Diyanet yöntemiyle hesaplanan vakitler (±1 dk)
  ulusal.namaz ||= {};
  for (const il of ILLER81) {
    if (il.slug === 'mersin') continue;
    if (!ulusal.namaz[il.slug]?.vakitler?.some((v) => v.tarih >= bugunTR)) ulusal.namaz[il.slug] = { hesap: true, vakitler: vakitListesi(il.lat, il.lon, 31, simdi) };
  }
  ulusalMevcutAyarla('namaz', new Set(ILLER81.filter((i) => ulusal.namaz?.[i.slug]?.vakitler?.some((v) => v.tarih >= bugunTR)).map((i) => i.slug)));
  ulusalMevcutAyarla('hava', new Set(ILLER81.filter((i) => ulusal.hava?.[i.slug]?.gunler?.length && Date.now() - new Date(ulusal.hava[i.slug].guncelleme) < 2 * 864e5).map((i) => i.slug)));
  for (const il of ILLER81) {
    if (il.slug === 'mersin') continue;
    const y = ulusal.akaryakit?.[il.slug];
    if (y && Object.keys(y.ilceler || {}).length) ekle(`/akaryakit/${il.slug}/`, akaryakitIlSayfasi({ il, kayit: y, mersin: servis.akaryakit }));
    const n = ulusal.namaz?.[il.slug];
    if (n?.vakitler?.some((v) => v.tarih >= new Date(simdi).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }))) ekle(`/namaz-vakti/${il.slug}/`, namazIlSayfasi({ il, kayit: n, simdi }));
  }
  // Süper Lig takım sayfaları
  const slLig = servis.spor?.ligler?.['super-lig'];
  for (const t of slLig?.puan || []) {
    const ts = takimSayfasi({ takim: t.takim, lig: slLig, hikayeler, servis, simdi });
    ekle(takimYolu(t.takim), sayfaYap({ ...ts, yol: takimYolu(t.takim), tema: 'spor', aktif: '/spor/' }));
  }
  // Türkiye geneli son depremler
  if (ulusal.deprem?.liste?.length) {
    ekle('/son-depremler/', sonDepremlerSayfasi({ kayit: ulusal.deprem, simdi }));
    const ileGore = new Map();
    for (const d of ulusal.deprem.liste) {
      const il = depremIli(d);
      if (il) ileGore.set(il, [...(ileGore.get(il) || []), d]);
    }
    for (const [il, liste] of ileGore) if (liste.length >= 2) ekle(depremIlYolu(il.slug), ilDepremSayfasi({ il, liste, simdi, guncelleme: ulusal.deprem.guncelleme }));
  }
  // 81 il okullar tatil mi
  let okul81 = { kararlar: [] };
  try {
    okul81 = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'okul81.json'), 'utf8'));
  } catch {}
  for (const il of ILLER81) {
    if (il.slug === 'mersin') continue;
    ekle(`/okullar-tatil-mi/${il.slug}/`, okulIlSayfasi({ il, kararlar: okul81.kararlar.filter((k) => k.il === il.slug), hava: ulusal.hava?.[il.slug], simdi }));
  }
  ekle('/kar-tatili/', karTatiliSayfasi({ kararlar: okul81.kararlar, simdi }));
  // 81 il hava durumu
  for (const il of ILLER81) {
    const hv = ulusal.hava?.[il.slug];
    if (il.slug !== 'mersin' && hv?.gunler?.length && Date.now() - new Date(hv.guncelleme) < 2 * 864e5) ekle(`/hava-durumu/${il.slug}/`, havaIlSayfasi({ il, kayit: hv }));
  }
  ekle('/hava-durumu/iller/', havaTurkiyeSayfasi({ veri: ulusal.hava || {}, mersin: servis.hava?.yenisehir || servis.hava?.akdeniz }));
  // Altın ve döviz sayfaları
  let piyasaGecmis = { gunler: {} };
  try {
    piyasaGecmis = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'piyasa-gecmis.json'), 'utf8'));
  } catch {}
  const piyasaVar = new Set([...(servis.piyasa?.altinlar || []), ...(servis.piyasa?.dovizler || [])].filter((x) => x.satis).map((x) => x.k));
  for (const kalem of PIYASA_KALEMLERI) if (piyasaVar.has(kalem.k)) ekle(piyasaKalemYolu(kalem.slug), piyasaKalemSayfasi({ kalem, servis, gecmis: piyasaGecmis }));
  ekle('/akaryakit/', akaryakitTurkiyeSayfasi({ veri: ulusal.akaryakit || {}, mersin: servis.akaryakit }));
  ekle('/namaz-vakti/', namazTurkiyeSayfasi({ veri: ulusal.namaz, simdi }));
  // Mahalle sayfaları
  let kesintiGecmis = { kayitlar: [] };
  try {
    kesintiGecmis = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'kesinti-gecmis.json'), 'utf8'));
  } catch {}
  const mahalleler = mahalleVerisi({ servis, gecmis: kesintiGecmis, haberler: ilceHavuzu.filter((x) => !x.genel) });
  for (const m of mahalleler) ekle(mahalleYolu(m.ilce, m.ad), mahalleSayfasi({ m, servis, kardesler: mahalleler.filter((k) => k.ilce === m.ilce && k !== m) }), Boolean(m.kesintiler.length || m.haberler.length));
  for (const ilce of ILCELER) ekle(`/mahalleler/${ilce.slug}/`, mahallelerSayfasi({ ilce, liste: mahalleler.filter((m) => m.ilce === ilce.slug) }));
  for (const ilce of ILCELER) ekle(`/ilce/${ilce.slug}/`, S.ilceSayfasi({ ilce, hikayeler, servis, simdi, havuz: ilceHavuzu }));
  ekle('/hava-durumu/', S.havaSayfasi({ servis }));
  {
    let ud = {};
    try {
      ud = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'ulusal.json'), 'utf8')).deprem;
    } catch {}
    ekle('/deprem/', ud?.liste?.length ? mersinDepremSayfasi({ kayit: ud, yerel: servis.deprem, simdi }) : S.depremSayfasi({ servis }));
  }
  ekle('/nobetci-eczane/', S.eczaneSayfasi({ servis }));
  ekle('/kesintiler/', S.kesintiSayfasi({ servis }));
  ekle('/trafik/', S.trafikSayfasi({ servis }));
  ekle('/ulasim/', ulasimSayfasi({ servis, simdi }));
  ekle('/okullar-tatil-mi/', okulSayfasi({ okul, servis, simdi }));
  ekle('/gundemim/', gundemimSayfasi({ servis, simdi }));
  let rapor = null;
  try {
    rapor = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'rapor.json'), 'utf8'));
  } catch {}
  let gsc = null;
  try {
    gsc = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'gsc.json'), 'utf8'));
  } catch {}
  let trafik = null;
  try {
    trafik = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'trafik.json'), 'utf8'));
  } catch {}
  yaz('/durum/', S.durumSayfasi({ rapor, gsc, trafik }));
  let geziVeri = null;
  try {
    geziVeri = JSON.parse(fs.readFileSync(path.join(VERI_KLASORU, 'gezi.json'), 'utf8'));
  } catch {}
  const geziler = geziYerleri(geziVeri);
  ekle('/gezi/', geziListeSayfasi({ yerler: geziler, servis }));
  for (const yer of geziler) ekle(geziYolu(yer.slug), geziSayfasi({ yer, yerler: geziler, servis }));
  if (ozetArsiv.length) {
    ekle('/gunun-ozeti/', S.ozetSayfasi({ ozet: ozetArsiv[0], arsiv: ozetArsiv, hikayeler, servis, son: true }));
    for (const o of ozetArsiv) ekle(`/gunun-ozeti/${o.tarih}/`, S.ozetSayfasi({ ozet: o, arsiv: ozetArsiv, hikayeler, servis }));
  }
  for (const lig of LIGLER) if (servis.spor?.ligler?.[lig.kod]) ekle(`/spor/${lig.kod}/`, S.ligSayfasi({ servis, kod: lig.kod, hikayeler }));
  ekle('/piyasalar/', S.piyasaSayfasi({ servis }));
  ekle('/spor/', S.sporSayfasi({ servis, hikayeler }));
  ekle('/etkinlikler/', S.etkinlikSayfasi({ servis, simdi }));
  ekle('/burclar/', S.burcSayfasi({ servis }));
  ekle('/rehber/', R.rehberSayfasi({ servis }));
  ekle('/rehber/gezilecek-yerler/', R.gezilecekSayfasi({ servis }));
  ekle('/rehber/acil-telefonlar/', R.acilSayfasi({ servis }));
  ekle('/rehber/hastaneler/', R.hastaneSayfasi({ servis }));
  ekle('/tatil-takvimi/', R.tatilSayfasi({ servis, simdi }));
  // Merak edilenler
  ekle('/bilgi/', B.bilgiListeSayfasi({ yazilar: bilgiYazilari, servis }));
  for (const yazi of bilgiYazilari) ekle(B.bilgiYolu(yazi), B.bilgiSayfasi({ yazi, yazilar: bilgiYazilari, servis }));
  for (const kategori of S.KATEGORI_SAYFALARI) ekle(`/kategori/${kategori.slug}/`, S.kategoriSayfasi({ kategori, hikayeler, servis }));
  ekle('/son-dakika/', S.kategoriSayfasi({ kategori: { slug: 'son-dakika', filtre: (x) => !x.genel && Date.now() - new Date(x.ilkGorulme) < 864e5 }, hikayeler, servis }));
  ekle('/namaz-vakitleri/', S.namazSayfasi({ servis, simdi }));
  for (const ilce of ILCELER) ekle(`/namaz-vakitleri/${ilce.slug}/`, S.namazIlceSayfasi({ ilce, servis, simdi }));
  ekle('/akaryakit-fiyatlari/', S.akaryakitSayfasi({ servis }));
  // İlçe bazlı servis sayfaları (Tarsus nöbetçi eczane, Erdemli hava durumu ...)
  for (const ilce of ILCELER) {
    ekle(`/nobetci-eczane/${ilce.slug}/`, IS.eczaneIlceSayfasi({ ilce, servis, simdi }));
    ekle(`/hava-durumu/${ilce.slug}/`, IS.havaIlceSayfasi({ ilce, servis, simdi }));
    ekle(`/kesintiler/${ilce.slug}/`, IS.kesintiIlceSayfasi({ ilce, servis, simdi }));
    ekle(`/akaryakit-fiyatlari/${ilce.slug}/`, IS.akaryakitIlceSayfasi({ ilce, servis, simdi }));
  }
  for (const { yol, html } of S.bilgiSayfalari()) ekle(yol, html);
  ekle('/reklam/', reklamSayfasi({ istatistik: { gunlukHaber: hikayeler.filter((x) => !x.genel && Date.now() - new Date(x.ilkGorulme) < 864e5).length, sayfa: 650 } }));
  ekle('/menu/', S.menuSayfasi(), false);
  ekle('/ara/', S.araSayfasi(), false);
  yaz('/404.html', S.bulunamadiSayfasi());

  // Arama dizini (son 7 gün, sadece yayındaki haberler)
  yaz(
    '/arama.json',
    JSON.stringify(
      hikayeler.map((h) => ({
        b: h.baslik,
        l: h.kaynaklar[0].link,
        k: [...new Set(h.kaynaklar.map((k) => k.ad))].join(', '),
        i: h.ilceler.map(ilceAdi).join(', '),
        t: h.ilkGorulme,
      }))
    )
  );

  const bugun = new Date(simdi).toISOString().slice(0, 10);
  const haberUrlleri = tumKendi.filter((x) => !x.genel || x.kalici).map((x) => `<url><loc>${SITE.url}${x.yol}</loc><lastmod>${(x.sonGuncelleme || x.ilkGorulme).slice(0, 10)}</lastmod></url>`);
  yaz(
    '/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
      ...sayfalar.map((y) => `<url><loc>${SITE.url}${y}</loc><lastmod>${bugun}</lastmod></url>`),
      ...haberUrlleri,
    ].join('\n')}\n</urlset>\n`
  );
  // Google Haberler site haritası: son 48 saatte yayımlanan kendi haberlerimiz
  const son48 = kendiHaberler.filter((x) => !x.genel || x.kalici).filter((x) => simdi - new Date(x.ilkGorulme).getTime() < 48 * 3600e3);
  yaz(
    '/haber-sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${son48
      .map((x) => `<url><loc>${SITE.url}${haberYolu(x)}</loc><news:news><news:publication><news:name>${htmlKacis(SITE.name)}</news:name><news:language>tr</news:language></news:publication><news:publication_date>${x.ilkGorulme}</news:publication_date><news:title>${htmlKacis(x.baslik)}</news:title></news:news></url>`)
      .join('\n')}\n</urlset>\n`
  );
  // RSS: tüm yayındaki haberler (kendi sayfası olanlar kendi adresiyle, diğerleri kaynağıyla)
  const rssOgeleri = hikayeler.slice(0, 50).map((x) => {
    const link = sayfasiVar(x) ? SITE.url + haberYolu(x) : x.kaynaklar[0].link;
    return `<item><title>${htmlKacis(x.baslik)}</title><link>${htmlKacis(link)}</link><guid isPermaLink="false">${x.id}</guid><pubDate>${new Date(x.ilkGorulme).toUTCString()}</pubDate>${x.ozet ? `<description>${htmlKacis(x.ozet)}</description>` : ''}<source url="${htmlKacis(x.kaynaklar[0].link)}">${htmlKacis(x.kaynaklar[0].ad)}</source></item>`;
  });
  yaz(
    '/rss.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${htmlKacis(SITE.name)}</title><link>${SITE.url}/</link><description>${htmlKacis(SITE.description)}</description><language>tr</language>\n${rssOgeleri.join('\n')}\n</channel></rss>\n`
  );
  // Canlı yenileme için son haberler listesi (sayfa açıkken 2 dakikada bir okunur)
  yaz('/akis.json', JSON.stringify(akisVerisi(hikayeler, simdi)));
  yaz('/son.json', JSON.stringify(hikayeler.filter((x) => !x.genel).sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme)).slice(0, 20).map((x) => ({ id: x.id, b: x.baslik, z: x.ilkGorulme }))));
  if (SITE.adsense) yaz('/ads.txt', `google.com, ${SITE.adsense.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
  yaz('/robots.txt', `User-agent: *\nAllow: /\nDisallow: /ara/\nDisallow: /menu/\nDisallow: /durum/\n\nSitemap: ${SITE.url}/sitemap.xml\nSitemap: ${SITE.url}/haber-sitemap.xml\n`);
  // Cloudflare Pages: önbellek ayarları
  yaz(
    '/_headers',
    `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n/style.css\n  Cache-Control: public, max-age=31536000, immutable\n/app.js\n  Cache-Control: public, max-age=31536000, immutable\n/marka/*\n  Access-Control-Allow-Origin: *\n`
  );

  return { sayfaSayisi: sayfalar.length + 3, haberSayisi: hikayeler.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = insaEt();
  console.log(`Site üretildi: ${r.sayfaSayisi} sayfa, ${r.haberSayisi} haber → dist/`);
}
