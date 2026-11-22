// Mersin iş ilanları sayfaları (veri: İŞKUR açık iş ilanları, src/isIlanlari.js)
//   /is-ilanlari/                 tüm Mersin
//   /is-ilanlari/<ilce>/          ilçe
//   /is-ilanlari/meslek/<slug>/   çok ilanı olan meslekler

import { SITE, ILCELER } from '../config.js';
import { sayfa } from './layout.js';
import { htmlKacis as h, slugify } from '../lib/text.js';
import { ilanLinki } from '../lib/iskur.js';
import { kutuBasligi } from './servisParcalari.js';

export const IS_YOL = '/is-ilanlari/';
const MESLEK_ESIK = 5;

const gunUzun = (t = Date.now()) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: SITE.timezone });
const gunKisa = (t = Date.now()) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: SITE.timezone });
const bugunISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: SITE.timezone });
const kalanGun = (iso) => Math.round((new Date(`${iso}T12:00:00+03:00`) - new Date(`${bugunISO()}T12:00:00+03:00`)) / 864e5);
const tarihTr = (iso) => new Date(`${iso}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: SITE.timezone });
const sssLd = (l) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: l.map(([soru, cevap]) => ({ '@type': 'Question', name: soru, acceptedAnswer: { '@type': 'Answer', text: cevap } })) });
const ustBant = (baslik, alt) => `<div class="su-an-bas"><div><h1>${h(baslik)}</h1><p style="margin-top:8px">${alt}</p></div></div>`;

// Meslek adı sadeleştirme: "Temizlik Görevlisi" ile "Beden İşçisi (Temizlik)" ayrı kalır; parantez dışı ad esas
const meslekAdi = (p) => String(p).replace(/\s+/g, ' ').trim();
export const meslekYolu = (ad) => `${IS_YOL}meslek/${slugify(meslekAdi(ad))}/`;

// Açık (süresi dolmamış) ilanlar, en yeni (ilan no büyük) üstte
export function acikIlanlar(veri) {
  const bugun = bugunISO();
  return Object.values(veri?.ilanlar || {})
    .filter((i) => !i.sonBasvuru || i.sonBasvuru >= bugun)
    .sort((a, b) => b.no.localeCompare(a.no));
}
export function meslekGruplari(liste) {
  const m = new Map();
  for (const i of liste) { const k = meslekAdi(i.pozisyon); if (!m.has(k)) m.set(k, []); m.get(k).push(i); }
  return [...m.entries()].map(([ad, l]) => ({ ad, liste: l, yol: meslekYolu(ad) })).sort((a, b) => b.liste.length - a.liste.length);
}

// İlan açıklamasından iletişim cümleleri atılır: başvuru İŞKUR üzerinden yapılsın
const buyukHarfMi = (s) => { const h = s.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, ''); return h.length > 20 && h === h.toLocaleUpperCase('tr-TR'); };
const cumleDuzeni = (s) => (buyukHarfMi(s) ? s.toLocaleLowerCase('tr-TR').replace(/(^|[.!?]\s+)([a-zçğıöşü])/g, (m, a, b) => a + b.toLocaleUpperCase('tr-TR')) : s);
const aciklamaTemiz = (s) => cumleDuzeni(String(s || '').split(/\n|(?<=[.!])\s+/).filter((c) => !/görüşülecek|irtibat|iletişim|ulaşabilir|arayın|whatsapp|tel\s*:|telefon/i.test(c)).join(' ').replace(/\s+/g, ' ').trim());

function ilanKarti(i) {
  const kalan = i.sonBasvuru ? kalanGun(i.sonBasvuru) : null;
  const acik = i.detay?.aciklama ? aciklamaTemiz(i.detay.aciklama) : '';
  const ara = `${i.pozisyon} ${i.ilceAd || ''} ${acik}`.toLocaleLowerCase('tr-TR');
  return `<article class="is-kart" data-ara="${h(ara.slice(0, 600))}">
<div class="is-ust"><h3>${i.kamu ? '<span class="is-kamu-rozet">Kamu</span> ' : ''}${h(i.pozisyon)}</h3>${i.acik > 1 ? `<span class="is-adet">${i.acik} kişi</span>` : ''}</div>
<p class="is-bilgi">${i.ilceAd ? `<a href="${IS_YOL}${i.ilce}/">${h(i.ilceAd)}</a> · ` : ''}${h([i.periyot, i.sekil].filter(Boolean).join(' · '))}${i.detay?.ogrenim ? ` · En az ${h(i.detay.ogrenim.toLocaleLowerCase('tr-TR'))}` : ''}</p>
${acik ? `<p class="is-aciklama">${h(acik.slice(0, 260))}${acik.length > 260 ? '…' : ''}</p>` : ''}
<div class="is-alt"><span class="is-son${kalan !== null && kalan <= 3 ? ' acil' : ''}">${i.sonBasvuru ? `Son başvuru ${tarihTr(i.sonBasvuru)}${kalan !== null ? ` · ${kalan <= 0 ? 'bugün son gün' : `${kalan} gün kaldı`}` : ''}` : ''}</span><a class="is-btn" href="${h(ilanLinki(i.no, i.tur))}" rel="noopener nofollow" target="_blank">İŞKUR'da incele</a></div>
</article>`;
}

const uyariKutusu = `<aside class="is-uyari"><b>Dikkat:</b> İş başvurusu için sizden para, kart bilgisi ya da kimlik fotoğrafı isteyenlere itibar etmeyin. Bu sayfadaki ilanların hepsi İŞKUR'da yayımlanan resmî ilanlardır; başvuru İŞKUR üzerinden ücretsiz yapılır.</aside>`;
const kamuKutusu = `<section class="kutu is-kamu">${kutuBasligi({ ikon: '🏛️', baslik: 'Kamu personel alımları' })}<div class="is-yan">
<a href="https://kariyerkapisi.gov.tr/isealim" rel="noopener" target="_blank"><b>Kariyer Kapısı</b><small>Kamu kurumlarının memur ve sözleşmeli personel ilanları</small></a>
<a href="https://www.iskur.gov.tr/ilanlar/kurumdisi-kamu-isci-alim-ilanlari/" rel="noopener" target="_blank"><b>İŞKUR kamu işçi alımları</b><small>Kamu kurumlarının daimi ve geçici işçi ilanları</small></a>
<a href="https://www.ilan.gov.tr/" rel="noopener" target="_blank"><b>ilan.gov.tr</b><small>Kamu personel alım ve sınav duyuruları</small></a>
</div></section>`;

function aramaKutusu(sayi) {
  return `<div class="is-ara"><input type="search" placeholder="Meslek ya da kelime ara (ör. temizlik, şoför, aşçı)" data-is-ara aria-label="İlanlarda ara"><span data-is-sayac>${sayi} ilan</span></div>`;
}
function liste(ilanlar) {
  return ilanlar.length ? `<div class="is-liste" data-is-liste>${ilanlar.map(ilanKarti).join('')}</div><div class="bos" data-is-bos hidden>Aramanıza uyan ilan yok.</div>` : '<div class="bos">Şu an açık ilan yok.</div>';
}
const kaynakNotu = (veri) => `<p class="guncelleme-notu">Kaynak: <a href="https://esube.iskur.gov.tr/Istihdam/AcikIsIlanAra.aspx" rel="noopener" target="_blank">İŞKUR açık iş ilanları</a>${veri?.guncelleme ? ` · Son kontrol: ${new Date(veri.guncelleme).toLocaleString('tr-TR', { timeZone: SITE.timezone, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}` : ''}. İşveren adları İŞKUR'da üye girişiyle gösterilir. Liste 3 saatte bir güncellenir.</p>`;
const yan = (yanKutular) => `<aside class="yan">${kamuKutusu}${uyariKutusu}${yanKutular ? yanKutular.replace(/^<aside class="yan">|<\/aside>$/g, '') : ''}</aside>`;

export function isIlanlariSayfasi({ veri, yanKutular }) {
  const ilanlar = acikIlanlar(veri);
  const kisi = ilanlar.reduce((t, i) => t + (i.acik || 1), 0);
  const ilceler = ILCELER.map((i) => ({ ...i, n: ilanlar.filter((x) => x.ilce === i.slug).length })).filter((i) => i.n);
  const meslekler = meslekGruplari(ilanlar).filter((m) => m.liste.length >= MESLEK_ESIK);
  const yeniler = ilanlar.filter((i) => Date.now() - new Date(i.ilkGorulme).getTime() < 7 * 864e5);
  const gun = gunUzun(), kisa = gunKisa();
  const giris = `Bugün (${gun}) Mersin'de İŞKUR'da <strong>${ilanlar.length} açık iş ilanı</strong> var; toplam ${kisi} kişilik açık pozisyon. En çok ilan ${ilceler.sort((a, b) => b.n - a.n).slice(0, 3).map((i) => `${i.ad} (${i.n})`).join(', ')} ilçelerinde. İlanlar resmî İŞKUR kaydından alınır ve süresi dolanlar listeden kendiliğinden düşer.`;
  return sayfa({
    baslik: `Mersin iş ilanları (${kisa}) – İŞKUR'da ${ilanlar.length} açık ilan`,
    aciklama: `Mersin iş ilanları: bugün İŞKUR'da ${ilanlar.length} açık ilan, ${kisi} kişilik pozisyon. ${meslekler.slice(0, 4).map((m) => m.ad).join(', ')} ve daha fazlası. İlçelere göre güncel liste.`,
    yol: IS_YOL,
    ust: ustBant('Mersin iş ilanları', `${h(gun)} · İŞKUR'daki güncel açık ilanlar`),
    jsonLd: sssLd([
      ["Mersin'de şu an kaç açık iş ilanı var?", `${gun} itibarıyla İŞKUR'da Mersin için ${ilanlar.length} açık iş ilanı ve ${kisi} kişilik açık pozisyon bulunuyor.`],
      ["Mersin'deki İŞKUR iş ilanlarına nasıl başvurulur?", "İlanın üzerindeki bağlantıdan İŞKUR'daki ilan sayfasına gidilir. Başvuru, İŞKUR e-Şube'ye e-Devlet ile giriş yapılarak ücretsiz olarak yapılır."],
      ['İş başvurusu için ücret ödenir mi?', 'Hayır. İŞKUR ilanlarına başvuru ücretsizdir. Başvuru karşılığında para isteyenlere itibar edilmemelidir.'],
    ]),
    icerik: `<main class="kap govde"><div class="ana">
<p class="giris-metni">${giris}</p>
<div class="bolum-bas"><h2>İlçelere göre</h2></div>
<div class="ilce-cipleri">${ilceler.sort((a, b) => b.n - a.n).map((i) => `<a class="cip" href="${IS_YOL}${i.slug}/">${h(i.ad)} <small>${i.n}</small></a>`).join('')}</div>
${meslekler.length ? `<div class="bolum-bas" style="margin-top:22px"><h2>Mesleklere göre</h2></div><div class="ilce-cipleri">${meslekler.slice(0, 18).map((m) => `<a class="cip" href="${m.yol}">${h(m.ad)} <small>${m.liste.length}</small></a>`).join('')}</div>` : ''}
<div class="bolum-bas" style="margin-top:26px"><h2>Tüm ilanlar</h2>${yeniler.length && yeniler.length < ilanlar.length ? `<span>${yeniler.length} ilan bu hafta eklendi</span>` : ''}</div>
${aramaKutusu(ilanlar.length)}
${liste(ilanlar)}
${kaynakNotu(veri)}
</div>${yan(yanKutular)}</main>`,
  });
}

export function isIlanlariIlceSayfasi({ veri, ilce, yanKutular }) {
  const ilanlar = acikIlanlar(veri).filter((i) => i.ilce === ilce.slug);
  const gun = gunUzun(), kisa = gunKisa();
  const meslekler = meslekGruplari(ilanlar).slice(0, 6);
  const giris = ilanlar.length
    ? `Bugün (${gun}) ${h(ilce.ad)} için İŞKUR'da <strong>${ilanlar.length} açık iş ilanı</strong> var. En çok aranan: ${meslekler.map((m) => `${h(m.ad)}${m.liste.length > 1 ? ` (${m.liste.length})` : ''}`).join(', ')}.`
    : `Bugün (${gun}) ${h(ilce.ad)} için İŞKUR'da açık iş ilanı yok. <a href="${IS_YOL}">Tüm Mersin ilanlarına</a> göz atabilirsiniz.`;
  return sayfa({
    baslik: `${ilce.ad} iş ilanları (${kisa}) – İŞKUR'da ${ilanlar.length} açık ilan`,
    aciklama: `${ilce.ad} iş ilanları: İŞKUR'da ${ilanlar.length} güncel açık ilan${meslekler.length ? ` (${meslekler.slice(0, 3).map((m) => m.ad).join(', ')}…)` : ''}. Son başvuru tarihleri ve başvuru bağlantıları.`,
    yol: `${IS_YOL}${ilce.slug}/`,
    aktif: IS_YOL,
    noindex: !ilanlar.length,
    ust: ustBant(`${ilce.ad} iş ilanları`, `${h(gun)} · İŞKUR'daki güncel açık ilanlar`),
    jsonLd: sssLd([[`${ilce.ad}'da kaç açık iş ilanı var?`, `${gun} itibarıyla İŞKUR'da ${ilce.ad} için ${ilanlar.length} açık iş ilanı bulunuyor.`]]),
    icerik: `<main class="kap govde"><div class="ana">
<p class="giris-metni">${giris}</p>
${aramaKutusu(ilanlar.length)}
${liste(ilanlar)}
${kaynakNotu(veri)}
<div class="bolum-bas" style="margin-top:28px"><h2>Diğer ilçeler</h2></div>
<div class="ilce-cipleri"><a class="cip" href="${IS_YOL}">Tüm Mersin</a>${ILCELER.filter((i) => i.slug !== ilce.slug).map((i) => `<a class="cip" href="${IS_YOL}${i.slug}/">${h(i.ad)}</a>`).join('')}</div>
</div>${yan(yanKutular)}</main>`,
  });
}

export function isIlanlariMeslekSayfasi({ veri, grup, yanKutular }) {
  const gun = gunUzun(), kisa = gunKisa();
  const ilceler = [...new Set(grup.liste.map((i) => i.ilceAd).filter(Boolean))];
  return sayfa({
    baslik: `Mersin ${grup.ad.toLocaleLowerCase('tr-TR')} iş ilanları (${kisa})`,
    aciklama: `Mersin'de ${grup.ad.toLocaleLowerCase('tr-TR')} iş ilanları: İŞKUR'da ${grup.liste.length} açık ilan (${ilceler.slice(0, 4).join(', ')}). Son başvuru tarihleri ve başvuru bağlantıları.`,
    yol: grup.yol,
    aktif: IS_YOL,
    ust: ustBant(`Mersin ${grup.ad.toLocaleLowerCase('tr-TR')} iş ilanları`, `${h(gun)} · ${grup.liste.length} açık ilan`),
    icerik: `<main class="kap govde"><div class="ana">
<p class="giris-metni">Bugün (${gun}) Mersin'de İŞKUR'da <strong>${grup.liste.length} ${h(grup.ad.toLocaleLowerCase('tr-TR'))}</strong> ilanı var${ilceler.length ? `: ${h(ilceler.join(', '))}` : ''}.</p>
${liste(grup.liste)}
${kaynakNotu(veri)}
<p style="margin-top:20px"><a class="hap" href="${IS_YOL}">Tüm Mersin iş ilanları</a></p>
</div>${yan(yanKutular)}</main>`,
  });
}

// Yan kutu (ana sayfa ve diğer sayfalar): en yeni 5 ilan
export function isIlanlariKutusu(veri) {
  const ilanlar = acikIlanlar(veri);
  if (ilanlar.length < 5) return '';
  return `<section class="kutu kutu-is">${kutuBasligi({ ikon: '💼', baslik: `Mersin iş ilanları <small>${ilanlar.length}</small>`, link: IS_YOL })}<div class="is-yan">${ilanlar.slice(0, 5).map((i) => `<a href="${h(ilanLinki(i.no, i.tur))}" rel="noopener nofollow" target="_blank"><b>${h(i.pozisyon)}</b><small>${h(i.ilceAd || 'Mersin')}${i.sonBasvuru ? ` · son başvuru ${tarihTr(i.sonBasvuru)}` : ''}</small></a>`).join('')}<a class="is-yan-tum" href="${IS_YOL}">Tüm ${ilanlar.length} ilanı gör →</a></div></section>`;
}
