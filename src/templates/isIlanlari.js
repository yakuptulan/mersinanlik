// Mersin iş ilanları sayfaları (veri: İŞKUR açık iş ilanları, src/isIlanlari.js)
//   /is-ilanlari/                 tüm Mersin
//   /is-ilanlari/<ilce>/          ilçe
//   /is-ilanlari/meslek/<slug>/   çok ilanı olan meslekler

import { SITE, ILCELER } from '../config.js';
import { sayfa } from './layout.js';
import { htmlKacis as h, slugify, bulunmaEkiAd } from '../lib/text.js';
import { ilanLinki, kursAramaLinki, KURS_TURLERI } from '../lib/iskur.js';
import { kutuBasligi } from './servisParcalari.js';

export const IS_YOL = '/is-ilanlari/';
const CANTA = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M3 13h18"/></svg>';
const MESLEK_ESIK = 5;

// ---------- Sektörler: ilan başlığından sektör, renk ve ikon ----------
const ikonSvg = (yol, b = 22) => `<svg width="${b}" height="${b}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${yol}</svg>`;
export const SEKTORLER = [
  { key: 'saglik', ad: 'Sağlık ve bakım', renk: '#e5484d', ikon: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/><path d="M12 9v5M9.5 11.5h5"/>', re: /terapist|psikolog|bakım elemanı|diyetisyen|hemşire|hemsire|sağlık|saglik|paramedik|\bebe\b|eczac|hasta|bakıcı|bakici|doktor|hekim|diş|fizyoterap|odyomet|laborant|tıbbi|tibbi|röntgen|anestezi|acil/i },
  { key: 'yemek', ad: 'Yemek ve otel', renk: '#f76b15', ikon: '<path d="M4 3v8a3 3 0 006 0V3M7 3v18M17 3c-2 0-3 2-3 5v5h3v8"/>', re: /fast food|kahvaltı|hamburger|aşçı|asci|garson|komi|bulaşık|bulasik|mutfak|resepsiyon|otel|kat görevlisi|kasap|fırın|firin|pasta|tatlı|barista|lokanta|restoran|pizza|döner|catering|kahve|ekmek|unlu/i },
  { key: 'satis', ad: 'Satış ve mağaza', renk: '#d6409f', ikon: '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 01-8 0"/>', re: /market elemanı|satış|satis|kasiyer|reyon|plasiyer|mağaza|magaza|pompacı|pompaci|tezgahtar|pazarlama|müşteri temsil|musteri temsil|çağrı merkezi|cagri merkezi/i },
  { key: 'lojistik', ad: 'Şoför, kurye, lojistik', renk: '#3e63dd', ikon: '<rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 9h4l3 4v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>', re: /sürücü|surucu|palamar|liman|antrepo|işaretçi|şoför|sofor|kurye|forklift|depo|sevkiyat|lojistik|dağıtım|dagitim|taşıma|tasima|istif|vinç|vinc|operatör.*(iş makin|kepçe)|tır|tir\b/i },
  { key: 'tarim', ad: 'Tarım ve paketleme', renk: '#30a46c', ikon: '<path d="M12 21V11M12 11c0-4 3-7 8-7 0 5-3 8-8 8zM12 14c0-3-2.5-5-7-5 0 4 2.5 6 7 6z"/>', re: /tarım|tarim|sebze|meyve|paketleme|ambalaj|seracı|seraci|ziraat|hayvan|bahçe|bahce|ayıklama|ayiklama|narenciye|hasat/i },
  { key: 'teknik', ad: 'Teknik ve üretim', renk: '#0d74ce', ikon: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>', re: /kalite kontrol|otomasyon|enjeksiyon|fayans|döşeyici|onarım|marangoz|mobilya|işçisi|ressam|tekstil|konfeksiyon|ortacı|beden işçisi|beden iscisi|teknisyen|tekniker|mühendis|muhendis|kaynakçı|kaynakci|elektrik|makine|operatör|operator|usta|montaj|inşaat|insaat|tesisat|boyacı|boyaci|tornacı|cnc|kalıp|kalip|mekanik|bakım onarım|üretim|uretim|imalat|tamirci|sıvacı|duvarcı|demir/i },
  { key: 'buro', ad: 'Büro ve yönetim', renk: '#8e4ec6', ikon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>', re: /dış ticaret|puantör|satın alma|finans|kimya|muhasebe|sekreter|büro|buro|insan kaynak|idari|ofis|halkla|asistan|yönetici|yonetici|müdür|mudur|planlama|bilgi işlem|yazılım|yazilim|grafik|tasarım|tasarim|veri giriş|danışma/i },
  { key: 'temizlik', ad: 'Temizlik ve güvenlik', renk: '#12a594', ikon: '<path d="M12 2l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V5z"/>', re: /temizleme|meydancı|kapı|kantar|kapıcı|çamaşır|temizlik|güvenlik|guvenlik|bekçi|bekci|çay ocağı|cay ocagi|hizmetli|kat hizmet|bahçıvan|bahcivan|peyzaj|vale/i },
  { key: 'egitim', ad: 'Eğitim ve çocuk', renk: '#0b8ea0', ikon: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>', re: /öğretmen|ogretmen|çocuk gelişim|cocuk gelisim|eğitmen|egitmen|okul|kreş|kres|bakıcı.*çocuk/i },
];
const DIGER = { key: 'diger', ad: 'Diğer işler', renk: '#6b7a99', ikon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18"/>' };
export const sektorBul = (pozisyon) => { const p = String(pozisyon || '').toLocaleLowerCase('tr-TR'); return SEKTORLER.find((x) => x.re.test(p)) || DIGER; };


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
  const sk = sektorBul(i.pozisyon);
  return `<article class="is-kart" data-baslik="${h(`${i.pozisyon} ${i.ilceAd || ''}`)}" data-ara="${h(ara.slice(0, 600))}" data-sektor="${sk.key}" style="--sk:${sk.renk}">
<div class="is-ust"><span class="is-sk-ikon" title="${h(sk.ad)}">${ikonSvg(sk.ikon, 20)}</span><h3>${i.kamu ? '<span class="is-kamu-rozet">Kamu</span> ' : ''}${h(i.pozisyon)}</h3>${i.acik > 1 ? `<span class="is-adet">${i.acik} kişi</span>` : ''}</div>
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

function kursBolumu(veri, ilce = null) {
  const bugun = bugunISO();
  const l = (veri?.kurslar || []).filter((k) => (!k.sonBasvuru || k.sonBasvuru >= bugun) && (!ilce || k.ilce === ilce.slug));
  if (!l.length) return '';
  return `<div class="bolum-bas" style="margin-top:26px"><h2>İŞKUR kursları ve işbaşı eğitimleri</h2><span>${l.length} program</span></div>
<div class="is-liste">${l.map((k) => `<article class="is-kart"><div class="is-ust"><h3>${h(k.meslek)}</h3><span class="is-adet">${h(KURS_TURLERI[k.programTur] || 'Kurs')}</span></div>
<p class="is-bilgi">${h(k.ilceAd || k.ilceHam || 'Mersin')}${k.kursTuru ? ` · ${h(k.kursTuru)}` : ''}${k.baslangic ? ` · başlangıç ${tarihTr(k.baslangic)}` : ''}</p>
<div class="is-alt"><span class="is-son">${k.sonBasvuru ? `Son başvuru ${tarihTr(k.sonBasvuru)}` : ''}</span><a class="is-btn" href="${kursAramaLinki(k.programTur)}" rel="noopener nofollow" target="_blank">İŞKUR'da ara (no ${h(k.no)})</a></div></article>`).join('')}</div>`;
}


// Sayfa üstü: başlık + 4 istatistik kartı + İlan ver düğmesi
function isUstBolum({ ilanlar, kisi, yeniler, ilceler, gun }) {
  const enCok = [...ilceler].sort((a, b) => b.n - a.n)[0];
  const kart = (renk, ikon, deger, etiket) => `<div class="is-istat" style="--c:${renk}"><span class="is-istat-ikon">${ikonSvg(ikon, 20)}</span><b>${deger}</b><small>${etiket}</small></div>`;
  return `<div class="su-an-bas is-hero"><div><h1>Mersin iş ilanları</h1><p style="margin-top:8px">${h(gun)} · İŞKUR'daki güncel açık ilanlar</p></div>
<a class="is-ilan-ver-dugme" href="${IS_YOL}ilan-ver/">${ikonSvg('<path d="M12 5v14M5 12h14"/>', 18)}Ücretsiz ilan ver</a></div>
<div class="is-istatlar">
${kart('#ff8a1f', DIGER.ikon, ilanlar.length, 'açık ilan')}
${kart('#22d3ee', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5c2.6.2 4.6 2 5.3 5"/>', kisi, 'kişilik alım')}
${kart('#7ee2a8', '<path d="M12 3v18M3 12h18"/>', yeniler.length && yeniler.length < ilanlar.length ? yeniler.length : ilanlar.length, 'bu hafta eklendi')}
${enCok ? kart('#a78bfa', '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', h(enCok.ad), `en çok ilan (${enCok.n})`) : ''}
</div>`;
}

// Sektör kutuları: tıklayınca liste o sektöre süzülür
function sektorIzgarasi(ilanlar) {
  const say = new Map();
  for (const i of ilanlar) { const k = sektorBul(i.pozisyon); say.set(k, (say.get(k) || 0) + 1); }
  const l = [...say.entries()].sort((a, b) => (a[0] === DIGER) - (b[0] === DIGER) || b[1] - a[1]);
  if (!l.length) return '';
  return `<div class="bolum-bas" style="margin-top:18px"><h2>Sektörlere göre</h2><span>Bir sektöre dokunun, ilanlar süzülsün</span></div>
<div class="is-sektorler">${l.map(([sk, n]) => `<button type="button" class="is-sektor" data-is-sektor="${sk.key}" style="--sk:${sk.renk}"><span class="is-sk-ikon">${ikonSvg(sk.ikon, 22)}</span><b>${h(sk.ad)}</b><small>${n} ilan</small></button>`).join('')}</div>`;
}

// İlçe çubukları
function ilceCubuklari(ilceler) {
  const l = [...ilceler].sort((a, b) => b.n - a.n);
  const enCok = l[0]?.n || 1;
  return `<div class="is-ilce-cubuk">${l.map((i) => `<a href="${IS_YOL}${i.slug}/"><span class="ad">${h(i.ad)}</span><span class="cubuk"><i style="width:${Math.max(4, Math.round((i.n / enCok) * 100))}%"></i></span><b>${i.n}</b></a>`).join('')}</div>`;
}

// ---------- İşverenlerin sitemizden verdiği ilanlar ----------
const telLink = (t) => String(t || '').replace(/[^\d+]/g, '').replace(/^0/, '+90');
const waLink = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '90' + d.slice(1); if (d.length === 10) d = '90' + d; return d; };
export function isverenAcik(veri, ilce = null) {
  const bugun = bugunISO();
  return (veri?.isveren || []).filter((i) => (!i.sonBasvuru || i.sonBasvuru >= bugun) && (!ilce || i.ilceSlug === ilce.slug));
}
function isverenKarti(i) {
  const sk = sektorBul(i.pozisyon);
  const kalan = i.sonBasvuru ? kalanGun(i.sonBasvuru) : null;
  const ara = `${i.pozisyon} ${i.ilce || ''} ${i.isyeri} ${i.aciklama || ''}`.toLocaleLowerCase('tr-TR');
  return `<article class="is-kart is-kart-isveren" data-baslik="${h(`${i.pozisyon} ${i.ilce || ''} ${i.isyeri}`)}" data-ara="${h(ara.slice(0, 600))}" data-sektor="${sk.key}" style="--sk:${sk.renk}">
<div class="is-ust"><span class="is-sk-ikon">${ikonSvg(sk.ikon, 20)}</span><h3>${h(i.pozisyon)}</h3>${i.kisi > 1 ? `<span class="is-adet">${i.kisi} kişi</span>` : ''}</div>
<p class="is-bilgi"><b class="is-isveren-ad">${h(i.isyeri)}</b> · ${i.ilceSlug ? `<a href="${IS_YOL}${h(i.ilceSlug)}/">${h(i.ilce)}</a> · ` : ''}${h(i.calisma || '')}${i.ucret ? ` · ${h(i.ucret)}` : ''}</p>
<p class="is-aciklama">${h(i.aciklama || '')}</p>
${i.nitelik ? `<p class="is-nitelik"><b>Aranan:</b> ${h(i.nitelik)}</p>` : ''}
<div class="is-alt"><span class="is-son${kalan !== null && kalan <= 3 ? ' acil' : ''}">${i.sonBasvuru ? `Son başvuru ${tarihTr(i.sonBasvuru)}${kalan !== null ? ` · ${kalan <= 0 ? 'bugün son gün' : `${kalan} gün kaldı`}` : ''}` : ''}</span>
<span class="is-iletisim"><a class="is-btn" href="tel:${h(telLink(i.telefon))}">Ara</a><a class="is-btn is-btn-wa" href="https://wa.me/${h(waLink(i.telefon))}?text=${encodeURIComponent(`Merhaba, Mersin Anlık'taki "${i.pozisyon}" ilanınız için yazıyorum.`)}" rel="noopener nofollow" target="_blank">WhatsApp</a>${i.eposta ? `<a class="is-btn is-btn-acik" href="mailto:${h(i.eposta)}">E-posta</a>` : ''}</span></div>
</article>`;
}
function isverenBolumu(veri, ilce = null) {
  const l = isverenAcik(veri, ilce);
  const cagri = `<a class="is-ilan-ver-kutu" href="${IS_YOL}ilan-ver/"><span class="is-sk-ikon" style="--sk:#ff8a1f">${ikonSvg('<path d="M12 5v14M5 12h14"/>', 22)}</span><span><b>İşletmeniz için eleman mı arıyorsunuz?</b><small>Ücretsiz ilan verin; kontrol edildikten sonra bu sayfada yayınlanır.</small></span><span class="is-ilan-ver-ok">İlan ver →</span></a>`;
  if (!l.length) return cagri;
  return `<div class="bolum-bas" style="margin-top:22px"><h2>İşverenlerden yeni ilanlar</h2><span>Mersin Anlık'a gönderilen, kontrol edilmiş ilanlar</span></div>
<div class="is-liste" data-is-liste>${l.map(isverenKarti).join('')}</div>${cagri}`;
}

// ---------- İlan ver formu ----------
export function ilanVerSayfasi({ yanKutular }) {
  const ilceSecenek = ILCELER.map((i) => `<option value="${i.slug}">${h(i.ad)}</option>`).join('');
  return sayfa({
    baslik: 'Mersin\'de ücretsiz iş ilanı ver – Mersin Anlık',
    aciklama: 'Mersin\'deki işletmeniz için ücretsiz iş ilanı verin. İlanınız kontrol edildikten sonra Mersin iş ilanları sayfasında yayınlanır.',
    yol: `${IS_YOL}ilan-ver/`,
    aktif: IS_YOL,
    ust: ustBant('Ücretsiz iş ilanı ver', 'Mersin\'deki işletmeniz için eleman ilanı · kontrol edildikten sonra yayınlanır'),
    icerik: `<main class="kap govde"><div class="ana">
<div class="ilan-ver-adimlar">
<div><span>1</span><b>Formu doldurun</b><small>İşyeri, pozisyon ve iletişim bilgileri</small></div>
<div><span>2</span><b>Kontrol edilir</b><small>Ekibimiz ilanı inceler</small></div>
<div><span>3</span><b>Yayınlanır</b><small>Mersin iş ilanları sayfasında, ücretsiz</small></div>
</div>
<form class="ilan-ver-form" data-ilan-form novalidate>
<div class="iv-satir"><label>İşyeri / firma adı *<input name="isyeri" required maxlength="90" placeholder="ör. Deniz Kafe"></label>
<label>Aranan pozisyon *<input name="pozisyon" required maxlength="90" placeholder="ör. Garson, Kasiyer, Şoför"></label></div>
<div class="iv-satir iv-uclu"><label>İlçe *<select name="ilce" required><option value="">Seçin</option>${ilceSecenek}</select></label>
<label>Kaç kişi?<input name="kisi" type="number" min="1" max="99" value="1"></label>
<label>Çalışma şekli<select name="calisma"><option>Tam zamanlı</option><option>Yarı zamanlı</option><option>Dönemsel / sezonluk</option><option>Stajyer</option><option>Günlük / yevmiyeli</option></select></label></div>
<label>İş tanımı *<textarea name="aciklama" required minlength="20" maxlength="1200" rows="5" placeholder="Yapılacak iş, çalışma saatleri, servis/yemek gibi imkânlar…"></textarea></label>
<label>Aranan nitelikler<textarea name="nitelik" maxlength="600" rows="3" placeholder="Deneyim, ehliyet, eğitim durumu…"></textarea></label>
<div class="iv-satir iv-uclu"><label>Başvuru telefonu *<input name="telefon" type="tel" required maxlength="20" placeholder="05xx xxx xx xx"></label>
<label>E-posta (isteğe bağlı)<input name="eposta" type="email" maxlength="80"></label>
<label>Ücret (isteğe bağlı)<input name="ucret" maxlength="60" placeholder="ör. Asgari ücret + prim"></label></div>
<label class="iv-kisa">Son başvuru tarihi<input name="sonBasvuru" type="date"><small>Boş bırakırsanız 30 gün yayında kalır.</small></label>
<input name="web" tabindex="-1" autocomplete="off" class="iv-gizli" aria-hidden="true">
<label class="iv-onay"><input type="checkbox" name="onay" required> Bilgilerin doğru olduğunu, telefon ve e-postanın ilanla birlikte yayınlanmasını kabul ediyorum. Başvuranlardan hiçbir ad altında ücret istenmeyecektir.</label>
<button type="submit" class="iv-gonder">İlanı gönder</button>
<p class="iv-durum" data-ilan-durum role="status"></p>
</form>
<p class="guncelleme-notu">İlanlar yayından önce kontrol edilir; ayrımcı, yanıltıcı ya da ücret talep eden ilanlar yayınlanmaz. Kişisel veriler yalnızca ilanın yayını için kullanılır. Sorularınız için: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
</div>${yan(yanKutular)}</main>`,
  });
}

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
    ust: isUstBolum({ ilanlar, kisi, yeniler, ilceler, gun }),
    jsonLd: sssLd([
      ["Mersin'de şu an kaç açık iş ilanı var?", `${gun} itibarıyla İŞKUR'da Mersin için ${ilanlar.length} açık iş ilanı ve ${kisi} kişilik açık pozisyon bulunuyor.`],
      ["Mersin'deki İŞKUR iş ilanlarına nasıl başvurulur?", "İlanın üzerindeki bağlantıdan İŞKUR'daki ilan sayfasına gidilir. Başvuru, İŞKUR e-Şube'ye e-Devlet ile giriş yapılarak ücretsiz olarak yapılır."],
      ['İş başvurusu için ücret ödenir mi?', 'Hayır. İŞKUR ilanlarına başvuru ücretsizdir. Başvuru karşılığında para isteyenlere itibar edilmemelidir.'],
    ]),
    icerik: `<main class="kap govde"><div class="ana">
<p class="giris-metni">${giris}</p>
${isverenBolumu(veri)}
${sektorIzgarasi(ilanlar)}
<div class="bolum-bas" style="margin-top:24px"><h2>İlçelere göre</h2></div>
${ilceCubuklari(ilceler)}
${meslekler.length ? `<div class="bolum-bas" style="margin-top:22px"><h2>Mesleklere göre</h2></div><div class="ilce-cipleri">${meslekler.slice(0, 18).map((m) => `<a class="cip" href="${m.yol}">${h(m.ad)} <small>${m.liste.length}</small></a>`).join('')}</div>` : ''}
<div class="bolum-bas" style="margin-top:26px"><h2>Tüm ilanlar</h2>${yeniler.length && yeniler.length < ilanlar.length ? `<span>${yeniler.length} ilan bu hafta eklendi</span>` : ''}</div>
${aramaKutusu(ilanlar.length)}
${liste(ilanlar)}
${kursBolumu(veri)}
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
${isverenBolumu(veri, ilce)}
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
// "Mersin'de şu an" kartlarına iş ilanları kartı
export function isIlanlariWidget(veri) {
  const ilanlar = acikIlanlar(veri);
  if (!ilanlar.length) return '';
  const son = ilanlar.slice(0, 2);
  return `<a class="widget widget-is" href="${IS_YOL}">
<div class="widget-bas"><span class="widget-rozet">${CANTA}</span><span class="widget-etiket">İş ilanları</span></div>
<span class="widget-deger">${ilanlar.length}<small> açık</small></span>
<div class="widget-liste">${son.map((i) => `<span>${h(i.pozisyon)}</span>`).join('')}</div>
<span class="widget-alt">İŞKUR · tümünü gör →</span>
</a>`;
}

// Haber sayfalarının sonunda: okuyucunun ilçesindeki güncel iş ilanları
export function haberIsKutusu(veri, ilce = null) {
  const tum = acikIlanlar(veri);
  if (!tum.length) return '';
  const yerel = ilce ? tum.filter((i) => i.ilce === ilce.slug) : [];
  const liste = (yerel.length >= 3 ? yerel : tum).slice(0, 3);
  const yer = yerel.length >= 3 ? ilce.ad : 'Mersin';
  const sayi = yerel.length >= 3 ? yerel.length : tum.length;
  const yol = yerel.length >= 3 ? `${IS_YOL}${ilce.slug}/` : IS_YOL;
  return `<aside class="haber-is">
<div class="haber-is-bas"><span class="haber-is-ikon">${CANTA}</span><div><b>${h(yer)}'${bulunmaEkiAd(yer)} bugün ${sayi} açık iş ilanı</b><small>İŞKUR'daki güncel ilanlar, her gün yenilenir</small></div></div>
<div class="haber-is-liste">${liste.map((i) => `<a href="${h(ilanLinki(i.no, i.tur))}" rel="noopener nofollow" target="_blank"><b>${h(i.pozisyon)}</b><small>${h(i.ilceAd || 'Mersin')}${i.acik > 1 ? ` · ${i.acik} kişi` : ''}${i.sonBasvuru ? ` · son başvuru ${tarihTr(i.sonBasvuru)}` : ''}</small></a>`).join('')}</div>
<a class="haber-is-tum" href="${yol}">Tüm ${h(yer)} ilanlarını gör →</a>
</aside>`;
}

// Ana sayfanın üstündeki dikkat çekici iş ilanları bandı
export function isIlanlariBandi(veri) {
  const ilanlar = acikIlanlar(veri);
  if (!ilanlar.length) return '';
  const kisi = ilanlar.reduce((t, i) => t + (Number(i.acik) || 1), 0);
  const gun = Date.now() - 24 * 36e5;
  const yeni = ilanlar.filter((i) => Date.parse(i.ilkGorulme) > gun).length;
  const ek = yeni && yeni < ilanlar.length ? ` · <em>${yeni} yeni</em>` : '';
  const ornek = [...new Set(ilanlar.map((i) => i.pozisyon))].slice(0, 3).map((x) => h(x)).join(', ');
  return `<a class="is-bandi" href="${IS_YOL}">
<span class="is-bandi-ikon" aria-hidden="true">💼</span>
<span class="is-bandi-metin"><b>Mersin'de bugün ${ilanlar.length} açık iş ilanı</b><small>${kisi} kişilik alım${ek} · ${ornek}…</small></span>
<span class="is-bandi-dugme">İlanlara bak →</span>
</a>`;
}

export function isIlanlariKutusu(veri) {
  const ilanlar = acikIlanlar(veri);
  if (ilanlar.length < 5) return '';
  return `<section class="kutu kutu-is">${kutuBasligi({ ikon: '💼', baslik: `Mersin iş ilanları <small>${ilanlar.length}</small>`, link: IS_YOL })}<div class="is-yan">${ilanlar.slice(0, 5).map((i) => { const sk = sektorBul(i.pozisyon); return `<a class="is-yan-satir" href="${h(ilanLinki(i.no, i.tur))}" rel="noopener nofollow" target="_blank" style="--sk:${sk.renk}"><span class="is-sk-ikon" title="${h(sk.ad)}">${ikonSvg(sk.ikon, 18)}</span><span class="is-yan-metin"><b>${h(i.pozisyon)}</b><small>${h(i.ilceAd || 'Mersin')}${i.sonBasvuru ? ` · son başvuru ${tarihTr(i.sonBasvuru)}` : ''}</small></span></a>`; }).join('')}<a class="is-yan-tum" href="${IS_YOL}">Tüm ${ilanlar.length} ilanı gör →</a></div></section>`;
}
