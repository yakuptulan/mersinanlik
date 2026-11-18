import { SITE, ILCELER, AYAR } from '../config.js';
import { htmlKacis as h, ayrilmaEki } from '../lib/text.js';
import { sayfa, saat, tarihUzun, ilceAdi } from './layout.js';
import { ikon } from './ikonlar.js';
import { kareKart, kisaKart, sayfasiVar, haberListesi, mansetKarti, mansetKaydirici, bolumKartlari, reklamAlani, haberYolu, katBilgi, ilceCipleri, kutuKarti, gundemListesi, paylasCubugu } from './parcalar.js';
import { KATEGORILER, GENEL, GUNDEM } from '../config.js';
import { telefonGoster } from '../lib/eczane.js';
import { havaIkonu, havaTuru } from './havaIkon.js';
import { FOTOLAR } from '../fotolar.js';
import { ligSerit, ligTablosu, sayacKutusu, sayaclarBlogu, kutuBasligi, piyasaSeridi, namazKutusu, akaryakitKutusu, fmt, yon, ONDALIK, bugunVakit, namazVerisi, sporKutusu, puanTablosu, macListesi, etkinlikKarti, meteoBandi, burcKutusu } from './servisParcalari.js';
import { BURCLAR } from '../lib/burc.js';
import { guncelEtkinlikler } from '../lib/etkinlik.js';
import { bilgiKarti } from './bilgi.js';
import { LIGLER } from '../lib/spor.js';
import { RESMI_TATILLER, OKUL_TAKVIMI } from './rehber.js';
import { DIYANET_ILCE, VAKITLER } from '../lib/namaz.js';
import { ilceServisMenusu } from './ilceServis.js';

// Resmî servis bağlantıları (veri entegrasyonu tamamlanana kadar doğrudan kaynağa yönlendirir)
export const RESMI = {
  eczane: 'https://www.mersineczaciodasi.org.tr/nobetci-eczaneler',
  meski: 'https://online.meski.gov.tr/meta/subscription/interruptions',
  edas: 'https://online.toroslaredas.com.tr/elektrik-kesintisi-sorgulama',
  afad: 'https://deprem.afad.gov.tr/last-earthquakes',
  metno: 'https://www.yr.no/',
};

// AFAD yer adını sadeleştirir: "Akdeniz - [08.36 km] Gülnar (Mersin)" → Gülnar (Mersin), "Denizde, 8 km"
export function depremYeri(yer = '') {
  const m = yer.match(/^(.*?)\s*-\s*\[([\d.]+)\s*km\]\s*(.+)$/);
  if (m) {
    const km = Math.round(Number(m[2]));
    const denizde = /akdeniz|deniz/i.test(m[1]);
    return { ad: m[3].trim(), ek: denizde ? `${km} km açıkta` : `${km} km uzakta` };
  }
  return { ad: yer.trim(), ek: '' };
}
function depremSinifi(b) {
  return b >= 4 ? 'yuksek' : b >= 3 ? 'orta' : 'dusuk';
}
function gunEtiketi(iso) {
  const gun = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: SITE.timezone });
  const bugun = gun(Date.now());
  const dun = gun(Date.now() - 864e5);
  const g = gun(iso);
  if (g === bugun) return 'bugün';
  if (g === dun) return 'dün';
  return new Date(iso).toLocaleDateString('tr-TR', { timeZone: SITE.timezone, day: 'numeric', month: 'short' });
}

function sonDeprem(servis) {
  const d = servis?.deprem?.[0];
  return d || null;
}

const gunKisa = (tarih) => new Date(`${tarih}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'short', timeZone: SITE.timezone });

// Deprem büyüklüklerinden küçük çizgi grafik (eskiden yeniye)
function depremCizgisi(liste) {
  const d = liste.slice(0, 12).reverse();
  if (d.length < 2) return '';
  const w = 160, hgt = 44;
  const max = Math.max(...d.map((x) => x.buyukluk), 3);
  const nokta = d.map((x, i) => [((i / (d.length - 1)) * w).toFixed(1), (hgt - (x.buyukluk / max) * (hgt - 6) - 3).toFixed(1)]);
  const yol = nokta.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  return `<svg class="widget-cizgi" viewBox="0 0 ${w} ${hgt}" preserveAspectRatio="none" aria-hidden="true"><path d="${yol} L${w} ${hgt} L0 ${hgt}Z" fill="currentColor" opacity=".15"/><path d="${yol}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

// JS ile ilçe değişince kullanılacak ikon şablonları (id'ler JS tarafında yenilenir)
const TUR_DURUM = { gunes: 'Açık', parcali: 'Parçalı bulutlu', bulut: 'Bulutlu', yagmur: 'Yağmurlu', firtina: 'Gök gürültülü', kar: 'Kar', sis: 'Sisli' };
function ikonOrnek(tur) {
  return havaIkonu(TUR_DURUM[tur], 84);
}

function havaWidget(hava, ilceSlug) {
  const gunler = (hava?.gunler || []).slice(1, 4);
  return `<a class="widget widget-hava" href="/hava-durumu/#${ilceSlug}" data-hava-kart>
<div class="widget-bas"><span class="widget-etiket">Hava · <span data-ilce-ad>${h(ilceAdi(ilceSlug))}</span></span></div>
<div class="hava-ana">
<span data-hava-ikon>${havaIkonu(hava?.durum || '', 84)}</span>
<div><span class="hava-derece" data-hava-derece>${hava ? `${hava.sicaklik}°` : '–'}</span>
<span class="hava-durum" data-hava-durum>${hava ? h(hava.durum) : 'Veri bekleniyor'}</span></div>
</div>
<span class="hava-uc" data-hava-uc>${hava?.gunler?.[0] ? `↑ ${hava.gunler[0].max}°  ↓ ${hava.gunler[0].min}°` : ''}</span>
<div class="hava-gunler" data-hava-gunler>${gunler.map((g) => `<div><span>${gunKisa(g.tarih)}</span>${havaIkonu(g.durum, 34)}<b>${g.max}°</b></div>`).join('')}</div>
</a>`;
}

// Kesinti saati: "09:00–16:00" (başlangıç ya da bitiş yoksa tek saat)
const kesintiAraligi = (k) => [k.baslangic && saat(k.baslangic), k.bitis && saat(k.bitis)].filter(Boolean).join('–') || '—';

// Su / elektrik sekmeli kesinti içeriği (ana sayfa kartı ve yan kutu)
function kesintiSekmeleri(servis, su, { adet = 2, kart = false } = {}) {
  const el = servis?.elektrikHaber || [];
  const suSatir = (k) =>
    kart
      ? `<a class="takvim-satir" href="/kesintiler/"><span class="takvim-metin"><b>${h(k.ilceler.map((i) => i.ad).join(', '))}</b><small>${kesintiAraligi(k)}</small></span></a>`
      : `<a class="yan-satir" href="/kesintiler/"><span class="yan-rozet su">${ikon.damla(18)}</span><span class="yan-metin"><b>${h(k.ilceler.map((i) => i.ad).join(', '))}</b><small>${h(k.ilceler.flatMap((i) => i.mahalleler).join(', '))}</small></span><span class="yan-sag"><small>saat</small><b>${kesintiAraligi(k)}</b></span></a>`;
  const suIc = su.slice(0, adet).map(suSatir).join('') + (su.length > adet ? `<a class="sekme-alt" href="/kesintiler/">+${su.length - adet} kesinti daha →</a>` : '') || `<div class="sekme-bos">${servis?.suKesintisi ? 'Şu an duyurulmuş su kesintisi yok' : 'MESKİ listesi alınamadı'}</div>`;
  const elIc = `${el.map((x) => `<a class="${kart ? 'takvim-satir' : 'yan-satir'}" href="${h(x.yol)}">${kart ? '' : `<span class="yan-rozet elektrik">${ikon.simsek(18)}</span>`}<span class="${kart ? 'takvim-metin' : 'yan-metin'}"><b>${h(x.baslik)}</b><small>${saat(x.ilkGorulme)}</small></span></a>`).join('')}
<a class="sekme-dugme" href="${RESMI.edas}" rel="noopener" target="_blank">${ikon.simsek(16)} Adresinle sorgula <span>→</span></a>${el.length ? '' : '<span class="sekme-not">Toroslar EDAŞ listeyi adres sorgusuyla veriyor · Arıza: 186</span>'}`;
  return `<div class="sekmeler" data-sekmeler role="tablist"><button type="button" role="tab" aria-selected="true" data-sekme="su">${ikon.damla(14)} Su${su.length ? ` <i>${su.length}</i>` : ''}</button><button type="button" role="tab" aria-selected="false" data-sekme="elektrik">${ikon.simsek(14)} Elektrik${el.length ? ` <i>${el.length}</i>` : ''}</button></div>
<div class="sekme-panel" data-panel="su" role="tabpanel">${suIc}</div>
<div class="sekme-panel" data-panel="elektrik" role="tabpanel" hidden>${elIc}</div>`;
}

function suAnKartlari(servis, ilceSlug = SITE.defaultIlce, simdi = Date.now()) {
  const hava = servis?.hava?.[ilceSlug];
  const dep = sonDeprem(servis);
  const eczaneler = servis?.eczane?.liste || [];
  const ilceEcz = eczaneler.filter((e) => e.ilce === ilceSlug).slice(0, 2);
  const su = aktifSuKesintileri(servis);
  const vakit = bugunVakit(servis, 'yenisehir', simdi);
  const yakit = servis?.akaryakit?.ilceler?.akdeniz;
  return `<div class="widgetlar">
${havaWidget(hava, ilceSlug)}
<a class="widget widget-yesil" href="/nobetci-eczane/" data-eczane-kart>
<div class="widget-bas"><span class="widget-rozet">${ikon.eczane(18)}</span><span class="widget-etiket">Eczane</span></div>
<span class="widget-deger">${eczaneler.length || '–'}<small>${eczaneler.length ? ' açık' : ''}</small></span>
<div class="widget-liste" data-eczane-liste>${ilceEcz.map((e) => `<span>${h(e.ad)}</span>`).join('') || '<span>İlçene göre listeyi gör</span>'}</div>
<span class="widget-alt" data-eczane-ilce>${ilceEcz.length ? h(ilceAdi(ilceSlug)) + ' · adres →' : 'Adres ve telefon →'}</span>
</a>
<div class="widget widget-turuncu widget-kesinti" data-sekme-kap>
<div class="widget-bas"><a class="widget-etiket-link" href="/kesintiler/"><span class="widget-rozet">${ikon.damla(18)}</span><span class="widget-etiket">Kesintiler</span></a></div>
${kesintiSekmeleri(servis, su, { adet: 2, kart: true })}
</div>
<a class="widget widget-mor" href="/deprem/">
<div class="widget-bas"><span class="widget-rozet">${ikon.deprem(18)}</span><span class="widget-etiket">Son deprem</span></div>
<span class="widget-deger">${dep ? dep.buyukluk.toFixed(1).replace('.', ',') : '–'}</span>
<span class="widget-yazi">${dep ? h(depremYeri(dep.yer).ad) : 'Son 7 günde kayıt yok'}</span>
<span class="widget-alt">${dep ? `<span data-once="${dep.tarih}">${saat(dep.tarih)}</span> · AFAD` : 'AFAD'}</span>
${depremCizgisi(servis?.deprem || [])}
</a>
${vakit ? `<a class="widget widget-camgobegi" href="/namaz-vakitleri/" data-namaz data-namaz-mini>
<div class="widget-bas"><span class="widget-rozet">${ikon.hilal(18)}</span><span class="widget-etiket">Namaz</span></div>
<span class="widget-deger" data-namaz-saat>${h(vakit.aksam)}</span>
<span class="widget-yazi" data-namaz-ad>Akşam</span>
<span class="widget-alt" data-namaz-sonraki>Mersin merkez</span>
<script type="application/json" data-namaz-veri>${JSON.stringify(namazVerisi(servis, simdi)).replace(/</g, '\\u003c')}</script>
</a>` : ''}
${yakit ? `<a class="widget widget-sari" href="/akaryakit-fiyatlari/">
<div class="widget-bas"><span class="widget-rozet">${ikon.yakit(18)}</span><span class="widget-etiket">Akaryakıt</span></div>
<div class="yakit-mini"><span><small>Benzin</small><b>${fmt(yakit.benzin)} ₺</b></span><span><small>Motorin</small><b>${fmt(yakit.motorin)} ₺</b></span>${yakit.lpg ? `<span><small>LPG</small><b>${fmt(yakit.lpg)} ₺</b></span>` : ''}</div>
</a>` : ''}
</div>`;
}

// Son dakika: son 6 saatin öne çıkan haberleri (en fazla 5), bantta sırayla döner
function sonDakikaSec(hikayeler, simdi) {
  return hikayeler
    .filter((x) => (simdi - new Date(x.ilkGorulme).getTime()) / 36e5 <= 6 && (x.kaynaklar.length > 1 || ['hava', 'kaza', 'asayis'].includes(x.kategori) || x.trend))
    .slice(0, 5);
}

function sonDakikaBandi(liste) {
  if (!liste.length) return '';
  const link = (x) => (sayfasiVar(x) ? { href: haberYolu(x), dis: '' } : { href: x.kaynaklar[0].link, dis: ' rel="noopener nofollow" target="_blank"' });
  return `<div class="son-dakika" data-son-dakika><span class="etiket">SON DAKİKA</span><span class="sd-akis">${liste
    .map((x, i) => { const l = link(x); return `<a class="sd-oge${i ? '' : ' aktif'}" href="${h(l.href)}"${l.dis}${i ? ' tabindex="-1"' : ''}><span>${h(x.baslik)}</span><time datetime="${x.ilkGorulme}">${saat(x.ilkGorulme)}</time></a>`; })
    .join('')}</span>${liste.length > 1 ? `<span class="sd-sayac" aria-hidden="true"><b data-sd-no>1</b>/${liste.length}</span>` : ''}</div>`;
}

// Manşet kaydırıcısı: son 24 saatin en önemli 10 haberi (kaynak sayısı, kendi yazımız, görsel, çok aranan, yenilik)
function mansetleriSec(hikayeler, simdi) {
  const puan = (x) => {
    const yas = (simdi - new Date(x.ilkGorulme).getTime()) / 36e5;
    return new Set(x.kaynaklar.map((k) => k.ad)).size * 3 + (x.metin ? 2 : 0) + (x.gorsel ? 1.5 : 0) + (x.trend ? 2 : 0) + Math.max(0, 8 - yas) * 0.5;
  };
  let aday = hikayeler.filter((x) => simdi - new Date(x.ilkGorulme).getTime() < 24 * 36e5);
  if (aday.length < 10) aday = hikayeler.slice(0, 40);
  return [...aday].sort((a, b) => puan(b) - puan(a)).slice(0, 10);
}

// Bölümler: son 24 saatte haberi olan kategoriler, çoktan aza
function bolumleriSec(hikayeler, simdi) {
  const son = hikayeler.filter((x) => simdi - new Date(x.ilkGorulme).getTime() < 24 * 36e5);
  const kaynak = son.length >= 10 ? son : hikayeler;
  return KATEGORI_SAYFALARI.filter((k) => k.slug !== 'tum-haberler')
    .map((k) => {
      const liste = kaynak.filter(k.filtre);
      return { href: `/kategori/${k.slug}/`, ad: k.slug === 'turkiye-dunya' ? 'Türkiye / Dünya' : k.ad, renk: k.renk, ikon: k.slug === 'turkiye-dunya' ? 'genel' : k.slug, sayi: liste.length, son: liste[0]?.baslik };
    })
    .filter((b) => b.sayi > 0)
    .sort((a, b) => b.sayi - a.sayi)
    .slice(0, 12);
}

function mansetSec(hikayeler, simdi) {
  // Son 12 saatte en çok kaynağın yazdığı haber; eşitlikte en yenisi
  const aday = hikayeler.filter((x) => simdi - new Date(x.ilkGorulme).getTime() < 12 * 36e5);
  const liste = aday.length ? aday : hikayeler;
  return [...liste].sort((a, b) => b.kaynaklar.length - a.kaynaklar.length || new Date(b.ilkGorulme) - new Date(a.ilkGorulme))[0];
}

// Tamamı BÜYÜK HARF yazılmış duyuruları cümle düzenine çevirir; normal yazılmışlara dokunmaz
export function cumleDuzen(t = '') {
  const harfler = t.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '');
  const buyuk = harfler.replace(/[^A-ZÇĞİÖŞÜ]/g, '').length;
  if (!harfler.length || buyuk / harfler.length < 0.6) return t;
  const k = t.toLocaleLowerCase('tr-TR');
  return k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1);
}

export function aktifSuKesintileri(servis, simdi = Date.now()) {
  return (servis?.suKesintisi?.liste || []).filter((k) => !k.bitis || new Date(k.bitis).getTime() > simdi);
}

function ilceEczaneleri(servis, slug) {
  return (servis?.eczane?.liste || []).filter((e) => e.ilce === slug);
}

export function yanKutular(servis, ilce = null, { anaSayfa = false } = {}) {
  const su = aktifSuKesintileri(servis).filter((k) => !ilce || k.ilceler.some((i) => i.ilce === ilce.slug));
  const eczaneler = ilce ? ilceEczaneleri(servis, ilce.slug) : [];
  const okunan = servis?.enCokOkunan || [];
  return `<aside class="yan">
${reklamAlani('yan-ust')}
${okunan.length >= 3 ? `<section class="kutu kutu-okunan">${kutuBasligi({ ikon: ikon.alev(18), baslik: 'En sıcak haberler', alt: '<span class="canli-nokta"></span> canlı' })}
<ol class="okunan-liste">${okunan.map((o, i) => `<li><a href="${h(o.yol)}"><span class="ok-no">${i + 1}</span>${o.gorsel ? `<img src="${h(o.gorsel)}" alt="" width="64" height="48" loading="lazy">` : `<span class="ok-ikon">${(ikon[o.ikon] || ikon.ok)(20)}</span>`}<span class="ok-baslik">${h(o.baslik)}${o.zaman ? `<small data-once="${o.zaman}">${saat(o.zaman)}</small>` : ''}</span></a></li>`).join('')}</ol></section>` : ''}
${ilce ? `<section class="kutu kutu-eczane">
${kutuBasligi({ ikon: ikon.eczane(18), baslik: `${h(ilce.ad)} nöbetçi eczaneler`, link: `/nobetci-eczane/${ilce.slug}/` })}
${eczaneler.map((e) => `<a class="satir" href="tel:${h(e.telefon)}"><span>${ikon.eczane(20)} ${h(e.ad)}</span><small>${h(telefonGoster(e.telefon))}</small></a>`).join('') || `<a class="satir" href="/nobetci-eczane/"><span>Bugünün listesi</span><small>→</small></a>`}
</section>` : ''}
<section class="kutu kutu-kesinti">
${kutuBasligi({ ikon: ikon.damla(18), baslik: ilce ? `${h(ilce.ad)} kesintileri` : 'Kesintiler', link: ilce ? `/kesintiler/${ilce.slug}/` : '/kesintiler/' })}
<div class="yan-liste" data-sekme-kap>${kesintiSekmeleri(servis, su, { adet: 4 })}</div>
</section>
${anaSayfa ? '' : namazKutusu(servis, ilce)}
${sporKutusu(servis)}
${anaSayfa ? '' : akaryakitKutusu(servis, ilce)}
${burcKutusu(servis)}
<section class="kutu kutu-deprem">
${kutuBasligi({ ikon: ikon.deprem(18), baslik: 'Son depremler', link: '/deprem/' })}
<div class="yan-liste">
${(servis?.deprem || []).slice(0, 4).map((d) => { const y = depremYeri(d.yer); return `<div class="yan-satir">
<span class="yan-rozet deprem ${depremSinifi(d.buyukluk)}">${d.buyukluk.toFixed(1).replace('.', ',')}</span>
<span class="yan-metin"><b>${h(y.ad)}</b><small>${h(y.ek || `${d.derinlik.toFixed(0)} km derinlikte`)}</small></span>
<span class="yan-sag"><small>${gunEtiketi(d.tarih)}</small><b>${saat(d.tarih)}</b></span></div>`; }).join('') || '<div class="yan-satir"><span class="yan-metin"><b>Son 7 günde kayıt yok</b></span></div>'}
</div>
</section>
${sayacKutusu(servis)}
${reklamAlani('yan-alt')}
</aside>`;
}

function ilceDugmeleri() {
  return `<div class="ilceler">${ILCELER.map((i) => `<a href="/ilce/${i.slug}/">${h(i.ad)}</a>`).join('')}</div>`;
}

// Ana sayfada blok olarak gösterilecek kategoriler (sıra önemli)
const BLOK_SIRASI = ['spor', 'asayis', 'belediye', 'ekonomi', 'egitim', 'saglik', 'kultur', 'ulasim', 'tarim', 'siyaset'];

function kategoriBloklari(mersin, haric) {
  const bloklar = [];
  for (const slug of BLOK_SIRASI) {
    const kat = KATEGORILER.find((k) => k.slug === slug);
    const tum = mersin.filter((x) => x.kategori === slug);
    if (tum.length < 2) continue;
    // Üstteki listede görünenleri tekrar gösterme; yetmezse tamamla
    let secim = tum.filter((x) => !haric.has(x)).slice(0, 4);
    if (secim.length < 2) secim = tum.slice(0, 4);
    if (secim.length === 3) secim = secim.slice(0, 2); // ızgarada boşluk kalmasın
    bloklar.push({ kat, secim, toplam: tum.length });
    if (bloklar.length === 5) break;
  }
  return bloklar
    .map(({ kat, secim, toplam }, i) => `${i === 2 ? reklamAlani('bloklar-arasi') : ''}<section class="kat-blok" style="--kat:${kat.renk}">
<div class="bolum-bas kat-bas"><h2><span class="kat-cizgi"></span>${h(kat.ad)}</h2><a href="/kategori/${kat.slug}/">Tümü (${toplam}) →</a></div>
<div class="izgara">${secim.map(kutuKarti).join('')}</div>
</section>`)
    .join('\n');
}

// Çok konuşulanlar: en çok sitenin yazdığı haberler (en az 6; yetmezse son 48 saatin öne çıkanlarıyla tamamlanır)
function gundemdekilerSec(hikayeler, simdi, haric) {
  const sayi = (x) => new Set(x.kaynaklar.map((k) => k.ad)).size;
  const yeni = (x, saat) => simdi - new Date(x.ilkGorulme).getTime() < saat * 36e5;
  const sirala = (l) => l.sort((a, b) => sayi(b) - sayi(a) || new Date(b.ilkGorulme) - new Date(a.ilkGorulme));
  const secilen = sirala(hikayeler.filter((x) => !haric.has(x) && yeni(x, 24) && sayi(x) >= 2)).slice(0, 6);
  if (secilen.length < 6) secilen.push(...sirala(hikayeler.filter((x) => !haric.has(x) && !secilen.includes(x) && yeni(x, 48) && !x.genel)).slice(0, 6 - secilen.length));
  return secilen;
}

export function anaSayfa({ hikayeler, servis, simdi }) {
  const mersin = hikayeler.filter((x) => !x.genel);
  const genel = hikayeler.filter((x) => x.genel).slice(0, 4);
  const mansetler = mansetleriSec(mersin, simdi);
  const manset = mansetler[0];
  const mansetSet = new Set(mansetler);
  // Kaçırmayın: manşet dışındaki önemli haberler; Son haberler: gerçekten en yeni haberler (kronolojik)
  const kacirma = mersin.filter((x) => !mansetSet.has(x) && (x.gorsel || x.metin)).sort((a, b) => b.kaynaklar.length - a.kaynaklar.length).slice(0, 5);
  const ustteOlan = new Set([...mansetler, ...kacirma]);
  const liste = [...mersin].sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme)).slice(0, 8);
  const gundem = gundemdekilerSec(hikayeler, simdi, mansetSet);
  const gosterilen = new Set([...ustteOlan, ...liste]);
  const ust = `${meteoBandi(servis)}${sonDakikaBandi(sonDakikaSec(hikayeler.filter((x) => x !== manset), simdi))}
<div class="su-an-bas su-an-kompakt">
<div><h1>Mersin'de şu an</h1><p>${tarihUzun(new Date(simdi).toISOString())} · <span class="canli-saat" data-canli-saat>${saat(new Date(simdi).toISOString())}</span></p></div>
<div class="su-an-sag"><a class="trafik-dugme" href="/trafik/"><span class="trafik-isik"><i></i><i></i><i></i></span>Canlı trafik</a>
<div class="ilce-secici" data-ilce-secici>
<button class="ilce-sec" type="button" aria-expanded="false" aria-controls="ilce-liste">${ikon.konum(20)}<span data-ilce-ad>Mersin</span><span class="daire">${ikon.asagi(18)}</span></button>
<div class="ilce-acilir" id="ilce-liste" hidden>${ILCELER.map((i) => `<button type="button" data-ilce-deger="${i.slug}" aria-pressed="false">${h(i.ad)}</button>`).join('')}</div>
</div>
</div>
</div>
${suAnKartlari(servis, SITE.defaultIlce, simdi)}
${piyasaSeridi(servis?.piyasa)}`;
  const icerik = `<main class="kap govde">
<div class="ana">
${mansetKaydirici(mansetler)}
${ozetKarti(servis?.ozet)}
${gundem.length >= 2 ? `<section class="kutu gundem-kutu"><div class="kutu-bas"><h2>Çok konuşulanlar</h2><span class="kutu-alt">En çok sitenin yazdığı haberler</span></div>${gundemListesi(gundem)}</section>` : ''}
${kacirma.length === 5 ? `<section class="kacirma-blok"><div class="bolum-bas"><h2><span class="kat-cizgi" style="--kat:var(--turuncu)"></span>Kaçırmayın</h2></div><div class="kare-izgara">${kacirma.map((x, i) => kareKart(x, i === 0)).join('')}</div></section>` : ''}
<div class="bolum-bas" style="margin-top:14px"><h2>Mersin'den son haberler</h2><a class="bolum-link" href="/kategori/tum-haberler/">Tüm haberler →</a></div>
${haberListesi(liste.slice(0, 4))}
${reklamAlani('akis')}
${haberListesi(liste.slice(4))}
${(() => {
  const ek = guncelEtkinlikler(servis?.etkinlik, simdi).slice(0, 3);
  return ek.length ? `<section class="kat-blok" style="--kat:#D6409F">
<div class="bolum-bas kat-bas"><h2><span class="kat-cizgi"></span>Bu hafta Mersin'de</h2><a href="/etkinlikler/">Tüm etkinlikler →</a></div>
<div class="izgara izgara-3">${ek.map(etkinlikKarti).join('')}</div>
</section>` : '';
})()}
${(servis?.bilgi || []).length >= 2 ? `<section class="kat-blok" style="--kat:#8E4EC6">
<div class="bolum-bas kat-bas"><h2><span class="kat-cizgi"></span>Merak edilenler</h2><a href="/bilgi/">Tümü →</a></div>
<div class="izgara">${servis.bilgi.slice(0, 2).map(bilgiKarti).join('')}</div>
</section>` : ''}
${kategoriBloklari(mersin.filter((x) => x !== manset), gosterilen)}
${genel.length ? `<section class="kat-blok" style="--kat:${GENEL.renk}">
<div class="bolum-bas kat-bas"><h2><span class="kat-cizgi"></span>Türkiye ve dünyadan</h2><a href="/kategori/turkiye-dunya/">Tümü →</a></div>
<div class="izgara">${genel.map(kutuKarti).join('')}</div>
</section>` : ''}
</div>
${yanKutular(servis, null, { anaSayfa: true })}
<section style="flex:1 1 100%;display:flex;flex-direction:column;gap:16px;margin-top:12px">
<div class="bolum-bas"><h2>İlçeler</h2></div>
${ilceDugmeleri()}
</section>
</main>`;
  return sayfa({
    yol: '/',
    ust,
    icerik,
    hava: servis?.hava
      ? Object.fromEntries(Object.entries(servis.hava).map(([k, v]) => [k, { ...v, tur: havaTuru(v.durum), gunler: v.gunler.map((g) => ({ ...g, gun: gunKisa(g.tarih), tur: havaTuru(g.durum) })) }]))
      : null,
    ekVeri: {
      __ECZ__: Object.fromEntries(ILCELER.map((i) => [i.slug, (servis?.eczane?.liste || []).filter((e) => e.ilce === i.slug).slice(0, 2).map((e) => e.ad)])),
      __HAVA_IKON__: Object.fromEntries(['gunes', 'parcali', 'bulut', 'yagmur', 'firtina', 'kar', 'sis'].map((t) => [t, ikonOrnek(t)])),
    },
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url, inLanguage: 'tr' },
  });
}

export function ilceSayfasi({ ilce, hikayeler, servis, simdi }) {
  const liste = hikayeler.filter((x) => x.ilceler.includes(ilce.slug)).slice(0, AYAR.ilceHaberSayisi);
  const hava = servis?.hava?.[ilce.slug];
  const ust = `${meteoBandi(servis, ilce.slug)}<div class="su-an-bas">
<div><p>${tarihUzun(new Date(simdi).toISOString())} · <span class="canli-saat" data-canli-saat>${saat(new Date(simdi).toISOString())}</span></p><h1>${h(ilce.ad)} haberleri</h1></div>
<button class="ilce-sec" type="button" data-ilcem-yap="${ilce.slug}" style="border:none;font:inherit;cursor:pointer">${ikon.konum(20)}<span>Benim ilçem yap</span><span class="daire">${ikon.ok(18)}</span></button>
</div>
${hava ? `<div class="widgetlar widgetlar-gun">${hava.gunler
    .slice(0, 4)
    .map((g, i) => `<div class="widget widget-gun"><span class="widget-etiket">${i === 0 ? 'Bugün' : new Date(`${g.tarih}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'long' })}</span>${havaIkonu(g.durum, 56)}<span class="hava-derece kucuk">${g.max}°</span><span class="hava-durum">${h(g.durum)}</span><span class="hava-uc">↓ en düşük ${g.min}°</span></div>`)
    .join('')}</div>` : ''}`;
  const icerik = `<main class="kap govde">
<div class="ana">
${ilceServisMenusu(ilce, 'haber')}
<div class="bolum-bas"><h2>${h(ilce.ad)}'${ayrilmaEki(ilce.ad)} son haberler</h2><span>${liste.length} haber</span></div>
${haberListesi(liste, `Son ${AYAR.saklamaGun} günde ${ilce.ad} ile ilgili haber bulunamadı.`)}
</div>
${yanKutular(servis, ilce)}
</main>`;
  return sayfa({
    baslik: `${ilce.ad} haberleri – son dakika ${ilce.ad} Mersin`,
    aciklama: `${ilce.ad} (Mersin) son dakika haberleri, hava durumu, nöbetçi eczaneler ve kesintiler.`,
    yol: `/ilce/${ilce.slug}/`,
    aktif: '/ilceler/',
    ust,
    icerik,
  });
}

// Kurum duyurusundan kendi cümlelerimizle yazılmış haberin sayfası
export function haberSayfasi({ hikaye, ilgili, servis }) {
  const kat = katBilgi(hikaye);
  const yol = haberYolu(hikaye);
  const kurumKayit = hikaye.kaynaklar.find((k) => k.ad === (hikaye.kurum || hikaye.yaziKaynak)) || hikaye.kaynaklar[0];
  const goruldu = new Set([kurumKayit.ad]);
  const digerleri = hikaye.kaynaklar.filter((k) => !goruldu.has(k.ad) && goruldu.add(k.ad));
  const tamYazi = Boolean(hikaye.metin);
  const kurumFoto = hikaye.gorselKaynak && hikaye.gorselKaynak !== 'yz' ? hikaye.gorselKaynak : null;
  const gorselUrl = hikaye.gorsel ? `${SITE.url}/uretilen/${hikaye.gorsel}` : null;
  const paragraflar = (hikaye.metin || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p, i, a) => `<p>${h(p)}</p>${i === 1 && a.length > 3 ? reklamAlani('yazi-ici') : ''}`).join('\n');
  const ilce = ILCELER.find((i) => hikaye.ilceler.includes(i.slug)) || null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: hikaye.baslik.slice(0, 110),
    description: hikaye.ozet || undefined,
    datePublished: hikaye.ilkGorulme,
    dateModified: hikaye.sonGuncelleme || hikaye.ilkGorulme,
    mainEntityOfPage: SITE.url + yol,
    image: [gorselUrl || `${SITE.url}/paylasim.jpg`],
    articleSection: kat.ad,
    contentLocation: { '@type': 'Place', name: ilce ? `${ilce.ad}, Mersin` : 'Mersin' },
    isBasedOn: kurumKayit.link,
    author: { '@type': 'Organization', name: SITE.name, url: SITE.url + '/' },
    publisher: { '@type': 'NewsMediaOrganization', name: SITE.name, logo: { '@type': 'ImageObject', url: `${SITE.url}/logo-kare.png` } },
  };
  const ust = `<div class="su-an-bas haber-bas"><div>
<div class="cipler">${ilceCipleri(hikaye)}</div>
<h1>${h(hikaye.baslik)}</h1>
<p class="haber-meta"><time datetime="${hikaye.ilkGorulme}">${tarihUzun(hikaye.ilkGorulme)} · ${saat(hikaye.ilkGorulme)}</time> · ${Math.max(1, Math.round(`${hikaye.ozet || ''} ${hikaye.metin || ''}`.split(/\s+/).length / 200))} dk okuma</p>
</div></div>`;
  const icerik = `<main class="kap govde">
<div class="ana">
<article class="haber-yazi" style="--kat:${kat.renk}">
${gorselUrl ? `<figure class="haber-gorsel"><img src="/uretilen/${h(hikaye.gorsel)}" alt="${kurumFoto ? h(hikaye.baslik) : 'Temsili görsel (yapay zekâ ile üretildi)'}" width="800" height="450" decoding="async"><figcaption>${kurumFoto ? `Fotoğraf: ${h(kurumFoto)}` : 'Temsili görsel · yapay zekâ ile üretilmiştir'}</figcaption></figure>` : ''}
${hikaye.ozet ? `<p class="haber-spot">${h(hikaye.ozet)}</p>` : ''}
${paragraflar}
<p class="haber-kaynak-kisa">Kaynak: ${[kurumKayit, ...digerleri.slice(0, 2)].map((k) => `<a href="${h(k.link)}" rel="noopener nofollow" target="_blank">${h(k.ad)}</a>`).join(', ')}</p>
${paylasCubugu(SITE.url + yol, hikaye.baslik)}
</article>
${reklamAlani('yazi-sonu')}
${ilgili.length >= 3 ? `<div class="bolum-bas"><h2>Bunlar da ilginizi çekebilir</h2></div><div class="ilgili-kareler">${ilgili.slice(0, 3).map((x) => kareKart(x)).join('')}</div>` : ''}
${ilgili.length > 3 ? `<div class="bolum-bas"><h2>${ilce ? `${h(ilce.ad)}'${ayrilmaEki(ilce.ad)} diğer haberler` : 'Diğer haberler'}</h2></div>\n${haberListesi(ilgili.slice(3))}` : ''}
</div>
${yanKutular(servis, ilce)}
</main>`;
  return sayfa({
    baslik: hikaye.baslik,
    aciklama: (hikaye.ozet || hikaye.metin || hikaye.baslik).slice(0, 160),
    yol,
    aktif: `/kategori/${kat.slug === 'genel' ? 'turkiye-dunya' : kat.slug}/`,
    noindex: !tamYazi,
    tema: kat.slug === 'genel' ? 'dunya' : kat.slug,
    ust,
    icerik,
    jsonLd,
    gorsel: gorselUrl,
    tur: 'article',
  });
}

// ---------- Kategori sayfaları ----------
export const KATEGORI_SAYFALARI = [
  ...KATEGORILER.map((k) => ({ slug: k.slug, ad: k.ad, renk: k.renk, filtre: (x) => !x.genel && x.kategori === k.slug })),
  { slug: 'gundem', ad: 'Gündem', renk: GUNDEM.renk, filtre: (x) => !x.genel && x.kategori === 'gundem' },
  { slug: 'yasam', ad: 'Yaşam', renk: '#D6409F', filtre: (x) => !x.genel && ['kultur', 'saglik', 'egitim', 'tarim', 'hava'].includes(x.kategori) },
  { slug: 'turkiye-dunya', ad: 'Türkiye ve dünya', renk: GENEL.renk, filtre: (x) => x.genel },
  { slug: 'tum-haberler', ad: 'Tüm Mersin haberleri', renk: GUNDEM.renk, filtre: (x) => !x.genel },
];

export function kategoriSayfasi({ kategori, hikayeler, servis }) {
  const liste = hikayeler.filter(kategori.filtre).slice(0, 60);
  const diger = KATEGORI_SAYFALARI.filter((k) => k.slug !== kategori.slug && hikayeler.some(k.filtre));
  return sayfa({
    baslik: kategori.slug === 'turkiye-dunya' ? 'Türkiye ve dünyadan son dakika haberleri' : kategori.slug === 'tum-haberler' ? 'Mersin son dakika haberleri – tümü' : `Mersin ${kategori.ad.toLocaleLowerCase('tr-TR')} haberleri`,
    aciklama: `Mersin ve ilçelerinden son ${kategori.ad.toLocaleLowerCase('tr-TR')} haberleri. Kaynakları belirtilerek derlenir.`,
    yol: `/kategori/${kategori.slug}/`,
    ust: `<div class="su-an-bas"><div><h1>${h(kategori.ad)}</h1><p style="margin-top:8px">Son ${AYAR.saklamaGun} gün · ${liste.length} haber</p></div></div>
<nav class="kat-menu" aria-label="Kategoriler">${diger.map((k) => `<a href="/kategori/${k.slug}/" style="--kat:${k.renk}">${h(k.ad)}</a>`).join('')}</nav>`,
    icerik: `<main class="kap govde"><div class="ana">${haberListesi(liste, 'Bu kategoride son günlerde haber yok.')}</div>${yanKutular(servis)}</main>`,
  });
}

// ---------- Burçlar ----------
export function burcSayfasi({ servis }) {
  const b = servis?.burc;
  const tarih = b?.tarih ? new Date(`${b.tarih}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }) : '';
  return sayfa({
    baslik: `Günlük burç yorumları${tarih ? ` – ${tarih}` : ''}`,
    aciklama: 'Koç, Boğa, İkizler, Yengeç, Aslan, Başak, Terazi, Akrep, Yay, Oğlak, Kova ve Balık burçları için bugünün yorumları.',
    yol: '/burclar/',
    ust: `<div class="su-an-bas"><div><h1>Günlük burç yorumları</h1><p style="margin-top:8px">${h(tarih)}</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${b?.yorumlar ? `<div class="burc-liste">${BURCLAR.map(([slug, ad, aralik, isaret]) => b.yorumlar[slug] ? `<article class="burc" id="${slug}"><span class="burc-isaret">${isaret}</span><div><h2>${h(ad)}</h2><small>${h(aralik)}</small><p>${h(b.yorumlar[slug])}</p></div></article>` : '').join('')}</div>` : '<div class="bos">Bugünün yorumları hazırlanıyor.</div>'}
<p style="color:var(--ikincil);font-size:15px">Burç yorumları eğlence amaçlıdır ve yapay zekâ desteğiyle hazırlanır; bilimsel bir dayanağı yoktur. Önemli kararlarınızı burç yorumlarına göre vermeyin.</p>
</div>${yanKutular(servis)}</main>`,
  });
}

// ---------- Etkinlikler ----------
export function etkinlikSayfasi({ servis, simdi }) {
  const liste = guncelEtkinlikler(servis?.etkinlik, simdi);
  return sayfa({
    baslik: "Mersin etkinlikleri – bu hafta Mersin'de ne var?",
    aciklama: "Mersin'de bu hafta konser, tiyatro, festival, spor ve kültür etkinlikleri. Mersin Büyükşehir Belediyesi etkinlik takvimi.",
    yol: '/etkinlikler/',
    ust: `<div class="su-an-bas"><div><h1>Bu hafta Mersin'de</h1><p style="margin-top:8px">Konser, festival, yürüyüş, atölye ve daha fazlası</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${liste.length ? `<div class="izgara izgara-3">${liste.map(etkinlikKarti).join('')}</div>` : '<div class="bos">Şu an duyurulmuş etkinlik yok.</div>'}
<p style="color:var(--ikincil);font-size:15px">Kaynak ve afişler: Mersin Büyükşehir Belediyesi. Etkinliğe dokununca belediyenin duyurusu açılır; başvuru ve ayrıntılar oradadır.</p>
</div>${yanKutular(servis)}</main>`,
  });
}

// ---------- Spor ----------
// Lig seçici (sol/üst menü)
function ligMenusu(ligler, aktif) {
  return `<nav class="lig-menu" aria-label="Ligler"><a href="/spor/"${aktif ? '' : ' aria-current="page"'}>Mersin ve özet</a>${LIGLER.filter((l) => ligler[l.kod]).map((l) => `<a href="/spor/${l.kod}/"${aktif === l.kod ? ' aria-current="page"' : ''}>${h(l.kisa)}${l.mersin ? ' <small>Mersin</small>' : ''}</a>`).join('')}</nav>`;
}

export function sporSayfasi({ servis, hikayeler }) {
  const sp = servis?.spor || {};
  const ligler = sp.ligler || {};
  const sl = ligler['super-lig'] || (sp.superLig?.puan?.length ? { ...sp.superLig, kisa: 'Süper Lig' } : null);
  const m3 = ligler['3-lig-3'] || (sp.ucuncuLig?.puan?.length ? sp.ucuncuLig : null);
  const haberler = hikayeler.filter((x) => !x.genel && x.kategori === 'spor').slice(0, 8);
  const bolum = (id, baslik, alt, ic) => `<section class="spor-bolum" id="${id}"><div class="bolum-bas"><h2>${baslik}</h2>${alt ? `<span>${alt}</span>` : ''}</div>${ic}</section>`;
  const icerik = `<main class="kap govde"><div class="ana">
${ligMenusu(ligler, null)}
${m3 ? bolum('mersin', 'Mersin takımları', h(m3.ad), `${m3.maclar?.length ? `<h3 class="ara-baslik">Bu haftanın maçları</h3>${macListesi(m3.maclar)}` : ''}<h3 class="ara-baslik">Puan durumu</h3>${ligTablosu(m3)}`) : ''}
${sp.milli?.maclar?.length ? bolum('milli', 'A Milli Takım', 'Son maçlar', macListesi(sp.milli.maclar.map((m) => ({ ...m, mersin: false, saat: null })))) : ''}
${sl ? bolum('super-lig', 'Trendyol Süper Lig', `<a href="/spor/super-lig/">Lig sayfası →</a>`, `${ligSerit(sl)}${sl.maclar?.length ? `<h3 class="ara-baslik">Haftanın maçları</h3>${macListesi(sl.maclar)}` : ''}<h3 class="ara-baslik">Puan durumu</h3>${ligTablosu(sl)}`) : ''}
${haberler.length ? `<div class="bolum-bas"><h2>Mersin spor haberleri</h2><a class="bolum-link" href="/kategori/spor/">Tümü →</a></div>${haberListesi(haberler)}` : ''}
<p style="color:var(--ikincil);font-size:15px">Kaynak: Türkiye Futbol Federasyonu (tff.org). Son güncelleme: ${sp.guncelleme ? saat(sp.guncelleme) : '–'}</p>
</div>${yanKutular(servis)}</main>`;
  return sayfa({
    baslik: 'Spor – Mersin takımları, Süper Lig puan durumu, Milli Takım',
    aciklama: 'Yeni Mersin İdmanyurdu ve Mersin takımlarının puan durumu, haftanın maçları, Süper Lig, 1. Lig, 2. Lig ve 3. Lig puan tabloları, A Milli Takım sonuçları.',
    yol: '/spor/',
    ust: `<div class="su-an-bas"><div><h1>Spor</h1><p style="margin-top:8px">Mersin takımları · Süper Lig · 1., 2. ve 3. Lig · A Milli Takım</p></div></div>`,
    icerik,
  });
}

export function ligSayfasi({ servis, kod }) {
  const sp = servis?.spor || {};
  const k = sp.ligler?.[kod];
  const lig = LIGLER.find((l) => l.kod === kod);
  const icerik = `<main class="kap govde"><div class="ana">
${ligMenusu(sp.ligler || {}, kod)}
${k ? `${ligSerit(k)}${k.maclar?.length ? `<h3 class="ara-baslik">Haftanın maçları</h3>${macListesi(k.maclar)}` : ''}<h3 class="ara-baslik">Puan durumu</h3>${ligTablosu(k)}` : '<div class="bos">Puan durumu şu an alınamadı.</div>'}
<p style="color:var(--ikincil);font-size:15px">Kaynak: Türkiye Futbol Federasyonu (tff.org). Son güncelleme: ${sp.guncelleme ? saat(sp.guncelleme) : '–'}</p>
</div>${yanKutular(servis)}</main>`;
  return sayfa({
    baslik: `${lig.ad} puan durumu ve fikstür`,
    aciklama: `${lig.ad} güncel puan durumu, son 5 maç formu ve haftanın maçları.`,
    yol: `/spor/${kod}/`,
    tema: 'spor',
    ust: `<div class="su-an-bas"><div><h1>${h(lig.ad)}</h1><p style="margin-top:8px">Puan durumu ve fikstür</p></div></div>`,
    icerik,
  });
}

// ---------- Piyasalar ----------
const tabloSatir = (x, kod = null) => `<tr${kod ? ` id="${kod}"` : ''}><th scope="row">${h(x.ad)}</th><td data-tg="${x.k}" data-alan="alis">${x.alis ? fmt(x.alis) : '–'}</td><td data-tg="${x.k}" data-alan="satis"><strong>${fmt(x.satis)}</strong></td><td data-tg="${x.k}" data-alan="degisim">${yon(x.degisim)}</td></tr>`;

export function piyasaSayfasi({ servis }) {
  const p = servis?.piyasa;
  const k = p?.kalemler || {};
  const not = `<p style="color:var(--ikincil);font-size:15px">Fiyatlar sayfa açıkken dakikada bir yenilenir. Kaynak: Truncgil Finans (altın, döviz, borsa), CoinGecko (Bitcoin). Kuyumcu ve bankalarda fiyatlar farklı olabilir; yatırım tavsiyesi değildir.</p>`;
  const icerik = `<main class="kap govde"><div class="ana">
<div class="bolum-bas"><h2>Altın fiyatları</h2><span>₺ · günlük değişim</span></div>
<div class="tablo-kap"><table class="tablo"><thead><tr><th>Tür</th><th>Alış</th><th>Satış</th><th>Değişim</th></tr></thead><tbody>${(p?.altinlar || []).map((x) => tabloSatir(x, { GRA: 'gram', CEYREKALTIN: 'ceyrek', GUMUS: 'gumus' }[x.k])).join('')}</tbody></table></div>
<div class="bolum-bas"><h2>Döviz kurları</h2><span>₺</span></div>
<div class="tablo-kap"><table class="tablo"><thead><tr><th>Para birimi</th><th>Alış</th><th>Satış</th><th>Değişim</th></tr></thead><tbody>${(p?.dovizler || []).map((x) => tabloSatir(x, { USD: 'usd', EUR: 'eur' }[x.k])).join('')}</tbody></table></div>
<div class="bolum-bas"><h2>Bitcoin ve borsa</h2></div>
<div class="tablo-kap"><table class="tablo"><thead><tr><th></th><th>Değer</th><th>Değişim</th></tr></thead><tbody>
${k.btc ? `<tr id="btc"><th scope="row">Bitcoin (BTC)</th><td data-piyasa="btc"><strong data-p-deger>${fmt(k.btc.satis, 0)} ₺</strong><br><small>${fmt(k.btc.usd, 0)} $</small></td><td data-piyasa="btc">${yon(k.btc.degisim)}</td></tr>` : ''}
${k.bist ? `<tr id="bist"><th scope="row">BIST 100</th><td data-tg="XU100" data-alan="satis"><strong>${fmt(k.bist.satis, 0)}</strong></td><td data-tg="XU100" data-alan="degisim">${yon(k.bist.degisim)}</td></tr>` : ''}
</tbody></table></div>
${not}
<p style="color:var(--ikincil);font-size:15px">Son güncelleme: <span data-p-saat>${p?.guncelleme ? saat(p.guncelleme) : '–'}</span></p>
</div>${yanKutular(servis)}</main>`;
  return sayfa({
    baslik: 'Altın fiyatları, döviz ve Bitcoin – bugün canlı',
    aciklama: `Gram altın ${k.gram ? fmt(k.gram.satis) + ' ₺' : ''}, çeyrek altın, gümüş, dolar, euro ve Bitcoin fiyatları. Mersin için canlı piyasa verileri.`,
    yol: '/piyasalar/',
    ust: `<div class="su-an-bas"><div><h1>Piyasalar</h1><p style="margin-top:8px">Altın, gümüş, döviz ve Bitcoin · canlı</p></div></div>${piyasaSeridi(p)}`,
    icerik,
  });
}

// ---------- Namaz vakitleri ----------
const vakitBaslik = `<tr><th>İlçe</th>${VAKITLER.map(([, ad]) => `<th>${ad}</th>`).join('')}</tr>`;

export function namazSayfasi({ servis, simdi }) {
  const satirlar = ILCELER.map((i) => {
    const v = bugunVakit(servis, i.slug, simdi);
    return `<tr><th scope="row"><a href="/namaz-vakitleri/${i.slug}/">${h(i.ad)}</a></th>${VAKITLER.map(([k]) => `<td>${v ? h(v[k]) : '–'}</td>`).join('')}</tr>`;
  }).join('');
  const v0 = bugunVakit(servis, 'yenisehir', simdi);
  return sayfa({
    baslik: 'Mersin namaz vakitleri – 13 ilçe ezan saatleri',
    aciklama: `Mersin ve 13 ilçesi için bugünkü namaz vakitleri: imsak, öğle, ikindi, akşam ve yatsı (Diyanet).`,
    yol: '/namaz-vakitleri/',
    ust: `<div class="su-an-bas"><div><h1>Namaz vakitleri</h1><p style="margin-top:8px">${tarihUzun(new Date(simdi).toISOString())}${v0?.hicri ? ` · ${h(v0.hicri)}` : ''}</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<div class="tablo-kap"><table class="tablo tablo-vakit"><thead>${vakitBaslik}</thead><tbody>${satirlar}</tbody></table></div>
<p style="color:var(--ikincil);font-size:15px">Kaynak: Diyanet İşleri Başkanlığı. Akdeniz, Mezitli, Toroslar ve Yenişehir için Diyanet tek (Mersin merkez) vakit yayınlar. Haftalık vakitler için ilçenin adına dokunun.</p>
</div>${yanKutular(servis)}</main>`,
  });
}

export function namazIlceSayfasi({ ilce, servis, simdi }) {
  const bolge = servis?.namaz?.bolgeler?.[DIYANET_ILCE[ilce.slug]] || [];
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: SITE.timezone });
  const satirlar = bolge.filter((v) => v.tarih >= bugun).slice(0, 7).map((v) => `<tr${v.tarih === bugun ? ' class="bugun"' : ''}><th scope="row">${new Date(`${v.tarih}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' })}</th>${VAKITLER.map(([k]) => `<td>${h(v[k])}</td>`).join('')}</tr>`).join('');
  return sayfa({
    baslik: `${ilce.ad} namaz vakitleri – bugün ezan saatleri`,
    aciklama: `${ilce.ad} (Mersin) için bugünkü ve haftalık namaz vakitleri: imsak, güneş, öğle, ikindi, akşam, yatsı.`,
    yol: `/namaz-vakitleri/${ilce.slug}/`,
    aktif: '/namaz-vakitleri/',
    ust: `<div class="su-an-bas"><div><h1>${h(ilce.ad)} namaz vakitleri</h1><p style="margin-top:8px">Bugün ve önümüzdeki 6 gün</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${ilceServisMenusu(ilce, 'namaz')}
<div class="tablo-kap"><table class="tablo tablo-vakit"><thead><tr><th>Gün</th>${VAKITLER.map(([, ad]) => `<th>${ad}</th>`).join('')}</tr></thead><tbody>${satirlar || '<tr><td colspan="7">Vakitler yükleniyor.</td></tr>'}</tbody></table></div>
<p style="color:var(--ikincil);font-size:15px">Kaynak: Diyanet İşleri Başkanlığı. <a href="/namaz-vakitleri/">Diğer ilçeler →</a></p>
</div>${yanKutular(servis, ilce)}</main>`,
  });
}

// ---------- Akaryakıt ----------
export function akaryakitSayfasi({ servis }) {
  const a = servis?.akaryakit;
  const satirlar = ILCELER.map((i) => {
    const f = a?.ilceler?.[i.slug];
    return `<tr><th scope="row"><a href="/akaryakit-fiyatlari/${i.slug}/">${h(i.ad)}</a></th><td>${f ? fmt(f.benzin) + ' ₺' : '–'}</td><td>${f ? fmt(f.motorin) + ' ₺' : '–'}</td><td>${f?.lpg ? fmt(f.lpg) + ' ₺' : '–'}</td></tr>`;
  }).join('');
  const m = a?.ilceler?.akdeniz;
  return sayfa({
    baslik: 'Mersin akaryakıt fiyatları – benzin, motorin, LPG bugün',
    aciklama: `Mersin'de bugün benzin ${m ? fmt(m.benzin) + ' ₺' : ''}, motorin ${m ? fmt(m.motorin) + ' ₺' : ''}${m?.lpg ? `, LPG ${fmt(m.lpg)} ₺` : ''}. 13 ilçe için güncel pompa fiyatları.`,
    yol: '/akaryakit-fiyatlari/',
    ust: `<div class="su-an-bas"><div><h1>Akaryakıt fiyatları</h1><p style="margin-top:8px">Mersin · ilçe ilçe pompa fiyatları</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<div class="tablo-kap"><table class="tablo"><thead><tr><th>İlçe</th><th>Benzin (95)</th><th>Motorin</th><th>LPG</th></tr></thead><tbody>${satirlar}</tbody></table></div>
<p style="color:var(--ikincil);font-size:15px">Kaynak: benzin ve motorin Opet, LPG (otogaz) Petrol Ofisi ilçe pompa fiyatları (litre). Diğer istasyonlarda fiyatlar birkaç kuruş farklı olabilir. Son güncelleme: ${a?.guncelleme ? saat(a.guncelleme) : '–'}</p>
</div>${yanKutular(servis)}</main>`,
  });
}

export function ilcelerSayfasi() {
  return sayfa({
    baslik: 'Mersin ilçeleri',
    aciklama: "Mersin'in 13 ilçesinden son haberler.",
    yol: '/ilceler/',
    ust: `<div class="su-an-bas"><div><h1>İlçeni seç</h1><p style="margin-top:8px">Seçtiğin ilçe ana sayfada öne çıkar.</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">${ilceDugmeleri()}</div></main>`,
  });
}

export function havaSayfasi({ servis }) {
  const satirlar = ILCELER.map((i) => {
    const hv = servis?.hava?.[i.slug];
    return `<tr id="${i.slug}"><th scope="row"><a href="/hava-durumu/${i.slug}/">${h(i.ad)}</a></th><td><strong>${hv ? hv.sicaklik + '°' : '–'}</strong> ${hv ? h(hv.durum) : ''}</td>${(hv?.gunler || [])
      .slice(1, 4)
      .map((g) => `<td>${g.max}° / ${g.min}°<br><small>${h(g.durum)}</small></td>`)
      .join('')}</tr>`;
  }).join('');
  const gunAdlari = (servis?.hava?.yenisehir?.gunler || []).slice(1, 4).map((g) => new Date(g.tarih).toLocaleDateString('tr-TR', { weekday: 'long' }));
  return sayfa({
    baslik: 'Mersin hava durumu – 13 ilçe',
    aciklama: "Mersin'in 13 ilçesi için güncel hava durumu ve 3 günlük tahmin.",
    yol: '/hava-durumu/',
    ust: `${meteoBandi(servis)}<div class="su-an-bas"><div><h1>Hava durumu</h1></div></div>`,
    icerik: `<main class="kap govde"><div class="ana"><div class="tablo-kap"><table class="tablo"><thead><tr><th>İlçe</th><th>Şu an</th>${gunAdlari.map((g) => `<th>${g}</th>`).join('')}</tr></thead><tbody>${satirlar}</tbody></table></div>
<p style="color:var(--ikincil);font-size:15px">Veri: <a href="${RESMI.metno}" rel="noopener" target="_blank">MET Norway (yr.no)</a>, CC BY 4.0. Son güncelleme: ${servis?.guncelleme ? saat(servis.guncelleme) : '–'}</p></div></main>`,
  });
}

export function depremSayfasi({ servis }) {
  const liste = servis?.deprem || [];
  return sayfa({
    baslik: 'Mersin ve çevresinde son depremler',
    aciklama: 'Mersin ve çevresinde son 7 günde olan depremler (AFAD verisi).',
    yol: '/deprem/',
    ust: `<div class="su-an-bas"><div><h1>Son depremler</h1><p style="margin-top:8px">Mersin ve çevresi · son 7 gün</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">${
      liste.length
        ? `<div class="tablo-kap"><table class="tablo"><thead><tr><th>Büyüklük</th><th>Yer</th><th>Derinlik</th><th>Zaman</th></tr></thead><tbody>${liste
            .map((d) => `<tr><td><strong>${d.buyukluk.toFixed(1).replace('.', ',')}</strong></td><td>${h(depremYeri(d.yer).ad)}${depremYeri(d.yer).ek ? `<br><small>${h(depremYeri(d.yer).ek)}</small>` : ''}</td><td>${d.derinlik.toFixed(1)} km</td><td>${new Date(d.tarih).toLocaleString('tr-TR', { timeZone: SITE.timezone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td></tr>`)
            .join('')}</tbody></table></div>`
        : '<div class="bos">Son 7 günde bölgede kayıtlı deprem yok.</div>'
    }<p style="color:var(--ikincil);font-size:15px">Veri: <a href="${RESMI.afad}" rel="noopener" target="_blank">AFAD</a>.</p></div></main>`,
  });
}

function bilgiSayfasi({ yol, baslik, aciklama, govde }) {
  return sayfa({
    baslik,
    aciklama,
    yol,
    ust: `<div class="su-an-bas"><div><h1>${h(baslik)}</h1></div></div>`,
    icerik: `<main class="kap govde"><div class="ana"><div class="metin-sayfa">${govde}</div></div></main>`,
  });
}

export function guncellemeNotu(veri, kaynakAd, kaynakUrl) {
  const zaman = veri?.guncelleme
    ? new Date(veri.guncelleme).toLocaleString('tr-TR', { timeZone: SITE.timezone, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : '';
  return `<p class="not">Kaynak: <a href="${kaynakUrl}" rel="noopener" target="_blank">${kaynakAd}</a>${zaman ? ` · Son kontrol: ${zaman}` : ''}. Gitmeden önce telefonla teyit etmenizi öneririz.</p>`;
}

export const eczaneKarti = (e) => `<article class="eczane">
<h3>${h(e.ad)}</h3>
${e.saat ? `<p class="eczane-saat">${h(e.saat)}</p>` : ''}
<p>${h(e.adres)}</p>
${e.tarif ? `<p class="eczane-tarif">${h(e.tarif)}</p>` : ''}
<div class="eczane-dugmeler">
${e.telefon ? `<a class="hap" href="tel:${h(e.telefon)}">Ara: ${h(telefonGoster(e.telefon))}</a>` : ''}
${e.lat ? `<a class="dugme-cizgi" href="https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lon}" rel="noopener" target="_blank">${ikon.konum(18)} Yol tarifi</a>` : ''}
</div>
</article>`;

export function eczaneSayfasi({ servis } = {}) {
  const liste = servis?.eczane?.liste || [];
  const gruplar = ILCELER.map((i) => ({ ilce: i, eczaneler: liste.filter((e) => e.ilce === i.slug) })).filter((g) => g.eczaneler.length);
  const kart = eczaneKarti;
  const govde = liste.length
    ? `<div class="ilce-cipleri">${gruplar.map((g) => `<a class="cip" href="#${g.ilce.slug}">${h(g.ilce.ad)}</a>`).join('')}</div>
${gruplar.map((g) => `<section class="eczane-grup" id="${g.ilce.slug}"><div class="bolum-bas"><h2><a href="/nobetci-eczane/${g.ilce.slug}/">${h(g.ilce.ad)}</a></h2><span>${g.eczaneler.length} eczane</span></div><div class="eczane-liste">${g.eczaneler.map(kart).join('')}</div></section>`).join('')}
${guncellemeNotu(servis.eczane, 'Mersin Eczacı Odası', RESMI.eczane)}`
    : `<div class="bos">Liste şu an alınamadı. <a href="${RESMI.eczane}" rel="noopener" target="_blank">Eczacı Odası'nın sayfasına bakın →</a></div>`;
  return sayfa({
    baslik: 'Mersin nöbetçi eczaneler – bugün açık eczaneler',
    aciklama: "Mersin'in ilçelerinde bugün nöbetçi olan eczaneler: adres, telefon ve yol tarifi.",
    yol: '/nobetci-eczane/',
    ust: `<div class="su-an-bas"><div><h1>Nöbetçi eczaneler</h1><p style="margin-top:8px">Bugün Mersin'de açık olan eczaneler</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">${govde}</div></main>`,
  });
}

export function kesintiSayfasi({ servis } = {}) {
  const su = aktifSuKesintileri(servis);
  const zaman = (t) => new Date(t).toLocaleString('tr-TR', { timeZone: SITE.timezone, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const kart = (k) => `<article class="kesinti">
<h3>${ikon.damla(22)} ${k.ilceler.map((i) => `<a href="/kesintiler/${i.ilce}/">${h(i.ad)}</a>`).join(', ')}</h3>
<p class="kesinti-mahalle">${h(k.ilceler.flatMap((i) => i.mahalleler).join(', '))}</p>
<p class="kesinti-saat">${k.baslangic ? zaman(k.baslangic) : ''}${k.bitis ? ` → ${zaman(k.bitis)}` : ''}</p>
${k.aciklama ? `<p>${h(cumleDuzen(k.aciklama))}</p>` : ''}
</article>`;
  const govde = `<div class="bolum-bas"><h2>Su kesintileri</h2><span>${su.length} kesinti</span></div>
${su.length ? `<div class="eczane-liste">${su.map(kart).join('')}</div>` : servis?.suKesintisi ? '<div class="bos">Şu an duyurulmuş su kesintisi yok.</div>' : `<div class="bos">Liste şu an alınamadı. <a href="${RESMI.meski}" rel="noopener" target="_blank">MESKİ'nin sayfasına bakın →</a></div>`}
${servis?.suKesintisi ? guncellemeNotu(servis.suKesintisi, 'MESKİ', RESMI.meski) : ''}
<div class="bolum-bas" style="margin-top:34px"><h2>Elektrik kesintileri</h2></div>
${(servis?.elektrikHaber || []).length ? `<div class="yan-liste" style="margin-bottom:14px">${servis.elektrikHaber.map((x) => `<a class="yan-satir" href="${h(x.yol)}"><span class="yan-rozet elektrik">${ikon.simsek(18)}</span><span class="yan-metin"><b>${h(x.baslik)}</b><small>${saat(x.ilkGorulme)}</small></span></a>`).join('')}</div>` : ''}
<p style="color:var(--govde)">Toroslar EDAŞ, kesintileri adres seçerek sorgulatıyor. Kendi adresinizi buradan seçebilirsiniz:</p>
<p><a class="hap" href="${RESMI.edas}" rel="noopener" target="_blank">Elektrik kesintisi sorgula<span class="daire">${ikon.ok(18)}</span></a></p>`;
  return sayfa({
    baslik: 'Mersin su ve elektrik kesintileri – bugün',
    aciklama: "Mersin'de bugünkü su kesintileri (MESKİ) ve elektrik kesintisi sorgulama.",
    yol: '/kesintiler/',
    ust: `<div class="su-an-bas"><div><h1>Kesintiler</h1><p style="margin-top:8px">Su ve elektrik</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">${govde}</div></main>`,
  });
}

export function menuSayfasi() {
  const linkler = [
    ['/', 'Ana sayfa'], ['/ilceler/', 'İlçeler'], ['/nobetci-eczane/', 'Nöbetçi eczane'], ['/kesintiler/', 'Kesintiler'],
    ['/hava-durumu/', 'Hava durumu'], ['/deprem/', 'Son depremler'], ['/piyasalar/', 'Altın ve döviz'], ['/spor/', 'Spor'], ['/bilgi/', 'Merak edilenler'], ['/etkinlikler/', 'Etkinlikler'], ['/rehber/', 'Mersin rehberi'], ['/burclar/', 'Burçlar'], ['/tatil-takvimi/', 'Tatil takvimi'], ['/rehber/acil-telefonlar/', 'Acil telefonlar'], ['/namaz-vakitleri/', 'Namaz vakitleri'],
    ['/akaryakit-fiyatlari/', 'Akaryakıt fiyatları'], ['/ulasim/', 'Uçuşlar ve ulaşım'], ['/okullar-tatil-mi/', 'Okullar tatil mi?'], ['/arsiv/', 'Haber arşivi'], ['/ara/', 'Haber ara'], ['/kunye/', 'Künye'],
    ['/iletisim/', 'İletişim'], ['/kaynaklarimiz/', 'Kaynaklarımız'], ['/gizlilik/', 'Gizlilik'],
  ];
  return sayfa({
    baslik: 'Menü',
    yol: '/menu/',
    noindex: true,
    ust: `<div class="su-an-bas"><div><h1>Menü</h1></div></div>`,
    icerik: `<main class="kap govde"><div class="ana"><div class="ilceler">${linkler.map(([u, a]) => `<a href="${u}">${a}</a>`).join('')}</div></div></main>`,
  });
}

export function araSayfasi() {
  return sayfa({
    baslik: 'Haber ara',
    yol: '/ara/',
    noindex: true,
    ust: `<div class="su-an-bas" style="flex-direction:column;align-items:stretch"><h1>Haber ara</h1>
<label class="gizli" for="ara-kutu">Aranacak kelime</label>
<input id="ara-kutu" type="search" placeholder="Ör. su kesintisi, Tarsus, eczane" autocomplete="off" style="font:inherit;font-size:20px;padding:16px 22px;border-radius:999px;border:none;margin-top:8px">
</div>`,
    icerik: `<main class="kap govde"><div class="ana" id="ara-sonuc"><div class="bos">Aramak istediğiniz kelimeyi yazın.</div></div></main>`,
  });
}

export function bilgiSayfalari() {
  return [
    ({
      yol: '/gorsel-kaynaklari/',
      baslik: 'Görsel kaynakları',
      aciklama: `${SITE.name} sitesinde kullanılan temsili fotoğrafların kaynakları ve lisansları.`,
      govde: `<p>Üzerinde kaynak yazmayan haber görsellerinin bir kısmı yapay zekâ ile, haberin konusunu anlatmak için üretilmiştir; gerçek bir fotoğraf değildir ve olaydaki kişileri göstermez. Haber sayfalarında bu görsellerin altında "yapay zekâ ile üretilmiştir" notu bulunur. Üzerinde "Foto: …" yazan görseller ise ilgili kurumun (ör. belediye) kendi paylaştığı fotoğraflardır.</p>
<p>Haber kartlarındaki diğer fotoğraflar <strong>temsilidir</strong>; haberdeki olayın fotoğrafı değildir. Mersin'in ilçelerini ve haberin konusunu gösterir. Fotoğrafların tamamı Wikimedia Commons'tan, ticari kullanıma izin veren lisanslarla alınmıştır. Fotoğrafçılara teşekkür ederiz.</p>
<ul>${FOTOLAR.map((f) => `<li><a href="${h(f.sayfa)}" rel="noopener" target="_blank">${h(f.sayfa.split('File:')[1])}</a> — ${h(f.yazar)} · ${h(f.lisans)}</li>`).join('')}</ul>
<p>Lisanslar: <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.tr" rel="noopener" target="_blank">CC BY-SA</a>, <a href="https://creativecommons.org/licenses/by/4.0/deed.tr" rel="noopener" target="_blank">CC BY</a>, CC0 ve kamu malı. Fotoğraflar sitede küçültülüp kırpılmıştır.</p>`,
    }),
    ({
      yol: '/kunye/',
      baslik: 'Künye',
      aciklama: `${SITE.name} künye bilgileri.`,
      govde: `<p><strong>Yayın adı:</strong> ${SITE.name}</p>
<p><strong>Yayın türü:</strong> Yaygın, süreli internet haber sitesi (Mersin yerel haberleri)</p>
<p><strong>İmtiyaz sahibi:</strong> Yakup Tulan</p>
<p><strong>Sorumlu yazı işleri müdürü:</strong> Yakup Tulan</p>
<p><strong>Adres:</strong> Mersin, Türkiye</p>
<p><strong>E-posta:</strong> <a href="mailto:${SITE.email}">${SITE.email}</a></p>
<p><strong>Yer sağlayıcı:</strong> Cloudflare, Inc.</p>
<p>Sitede yer alan haberler kaynak gösterilerek derlenir; haberlerin hukuki sorumluluğu kaynağına aittir. Düzeltme ve cevap hakkı talepleri için yukarıdaki e-posta adresine yazabilirsiniz.</p>`,
    }),
    ({
      yol: '/iletisim/',
      baslik: 'İletişim',
      aciklama: `${SITE.name} ile iletişime geçin.`,
      govde: `<p>Haber ihbarı, düzeltme talebi ve reklam için: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
<p>Bir haberde hata ya da düzeltme talebiniz varsa haberin bağlantısıyla birlikte yazın; en kısa sürede inceleriz.</p>`,
    }),
    ({
      yol: '/kaynaklarimiz/',
      baslik: 'Kaynaklarımız ve çalışma şeklimiz',
      aciklama: `${SITE.name} haberleri nasıl derler?`,
      govde: `<p>${SITE.name}, Mersin ve ilçeleriyle ilgili haberleri farklı haber sitelerinden ve resmî kurumlardan derler.</p>
<ul><li>Her haberin yanında kaynağı ve kaynağa giden bağlantı bulunur. Haberin tamamı her zaman kaynağında okunur.</li>
<li>Başka sitelerin haber metinlerini ve fotoğraflarını kopyalamayız.</li>
<li>Belediye ve kamu kurumlarının basın duyurularını kendi cümlelerimizle kısa haberlere dönüştürür, duyurunun aslına bağlantı veririz. Bu yazılarda yapay zekâ desteği kullanılır; metinde olmayan bilgi eklenmez.</li>
<li>Kısa özetleri yalnızca resmî kurum duyurularında ve buna izin veren kaynaklarda kendi cümlelerimizle yazarız.</li>
<li>Aynı olayı birden fazla kaynak yazdıysa tek kartta birleştirir, tüm kaynakları gösteririz.</li></ul>
<p>Haberinizin burada yer almasını istemiyorsanız <a href="mailto:${SITE.email}">${SITE.email}</a> adresine yazmanız yeterli.</p>`,
    }),
    ({
      yol: '/yayin-ilkeleri/',
      baslik: 'Yayın ilkeleri',
      aciklama: `${SITE.name} yayın ilkeleri.`,
      govde: `<ul><li>Haberleri kaynağını göstererek ve tarafsız biçimde sunarız.</li>
<li>Suç, ölüm, çocuk ve kişisel bilgiler içeren haberler yayınlanmadan önce editör kontrolünden geçer.</li>
<li>Kişilik haklarına saygı gösterir, masumiyet karinesini gözetiriz.</li>
<li>Düzeltme ve cevap taleplerini en kısa sürede değerlendiririz.</li></ul>`,
    }),
    ({
      yol: '/gizlilik/',
      baslik: 'Gizlilik politikası',
      aciklama: `${SITE.name} gizlilik politikası.`,
      govde: `<p>Sitemizde üyelik yoktur ve sizden kişisel bilgi istemeyiz. Seçtiğiniz ilçe yalnızca kendi tarayıcınızda saklanır.</p>
<p>Reklam gösterimi için Google AdSense kullanılabilir. Google ve iş ortakları, reklamları kişiselleştirmek için çerez kullanabilir. Ayrıntılar için <a href="https://policies.google.com/technologies/ads?hl=tr" rel="noopener" target="_blank">Google reklam politikalarına</a> bakabilirsiniz.</p>
<p>Sorularınız için: <a href="mailto:${SITE.email}">${SITE.email}</a></p>`,
    }),
    ({
      yol: '/cerez-politikasi/',
      baslik: 'Çerez politikası',
      aciklama: `${SITE.name} çerez politikası.`,
      govde: `<p>Sitemiz, seçtiğiniz ilçeyi hatırlamak için tarayıcınızın yerel depolamasını kullanır. Reklam ortaklarımız (Google AdSense) kendi çerezlerini kullanabilir. Tarayıcı ayarlarınızdan çerezleri dilediğiniz zaman silebilirsiniz.</p>`,
    }),
  ].map((o) => ({ yol: o.yol, html: bilgiSayfasi(o) }));
}

export function bulunamadiSayfasi() {
  return sayfa({
    baslik: 'Sayfa bulunamadı',
    yol: '/404.html',
    noindex: true,
    ust: `<div class="su-an-bas"><div><h1>Aradığınız sayfa bulunamadı</h1></div></div>`,
    icerik: `<main class="kap govde"><div class="ana"><p><a class="hap" href="/">Ana sayfaya dön<span class="daire">${ikon.ok(18)}</span></a></p></div></main>`,
  });
}

// ---------- Trafik yoğunluk haritası (Yandex harita aracı, canlı trafik katmanı) ----------
const TRAFIK_NOKTALARI = [
  ['Mersin merkez', 34.615, 36.795, 13], ['Tarsus', 34.895, 36.918, 14], ['Mezitli', 34.53, 36.755, 14], ['Erdemli', 34.31, 36.605, 14],
  ['Silifke', 33.93, 36.377, 14], ['Anamur', 32.84, 36.075, 14], ['Mut', 33.435, 36.645, 14], ['D-400 Mersin–Adana', 34.85, 36.85, 11],
];
const trafikAdresi = ([, lon, lat, z]) => `https://yandex.com.tr/map-widget/v1/?ll=${lon}%2C${lat}&z=${z}&l=map%2Ctrf`;
export function trafikSayfasi({ servis }) {
  return sayfa({
    baslik: 'Mersin canlı trafik yoğunluk haritası',
    aciklama: 'Mersin ve ilçelerinde anlık trafik yoğunluğu: yeşil akıcı, sarı yoğun, kırmızı sıkışık. Canlı harita.',
    yol: '/trafik/',
    tema: 'ulasim',
    ust: `<div class="su-an-bas"><div><h1>Canlı trafik haritası</h1><p style="margin-top:8px">Mersin ve ilçelerinde anlık yol yoğunluğu</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<div class="trafik-secici" data-trafik>${TRAFIK_NOKTALARI.map((n, i) => `<button type="button" data-harita="${trafikAdresi(n)}"${i ? '' : ' aria-pressed="true"'}>${h(n[0])}</button>`).join('')}</div>
<div class="trafik-harita"><iframe src="${trafikAdresi(TRAFIK_NOKTALARI[0])}" title="Mersin canlı trafik haritası" loading="lazy" allowfullscreen></iframe></div>
<div class="trafik-renkler"><span><i style="background:#22c55e"></i>Akıcı</span><span><i style="background:#facc15"></i>Yoğun</span><span><i style="background:#ef4444"></i>Sıkışık</span><span><i style="background:#7f1d1d"></i>Durma noktasında</span></div>
<p style="color:var(--ikincil);font-size:15px">Harita ve trafik verisi: Yandex Haritalar. Veriler birkaç dakikada bir yenilenir; yola çıkmadan önce yol ve hava durumunu da kontrol edin.</p>
</div>${yanKutular(servis)}</main>`,
  });
}

// ---------- Günün özeti ----------
const ozetTarih = (t) => new Date(`${t}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
export function ozetKarti(o) {
  if (!o) return '';
  return `<a class="ozet-kart" href="/gunun-ozeti/"><span class="ozet-rozet">🗞️ Günün özeti</span><span class="ozet-ic"><small>${h(ozetTarih(o.tarih))} · 1 dakikada Mersin</small><b>${h(o.baslik)}</b></span><span class="ozet-ok">Oku →</span></a>`;
}
export function ozetSayfasi({ ozet: o, arsiv, hikayeler, servis, son = false }) {
  const yol = son ? '/gunun-ozeti/' : `/gunun-ozeti/${o.tarih}/`;
  const bul = (id) => hikayeler.find((x) => x.id === id);
  return sayfa({
    baslik: `Mersin günün özeti: ${o.baslik}`,
    aciklama: `${ozetTarih(o.tarih)} Mersin gündemi. ${o.giris}`.slice(0, 160),
    yol,
    tema: 'gundem',
    tur: 'article',
    ust: `<div class="su-an-bas"><div><p>${h(ozetTarih(o.tarih))}</p><h1>${h(o.baslik)}</h1><p style="margin-top:8px">Günün özeti · Mersin'de son 24 saat</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<article class="haber-yazi ozet-yazi">
${o.giris ? `<p class="haber-spot">${h(o.giris)}</p>` : ''}
<ol class="bilgi-maddeler ozet-maddeler">${o.maddeler.map((m) => { const x = bul(m.id); return `<li><h2>${x ? `<a href="${h(sayfasiVar(x) ? haberYolu(x) : x.kaynaklar[0].link)}">${h(x.baslik)}</a>` : ''}</h2><p>${h(m.metin)}</p></li>`; }).join('')}</ol>
<p class="haber-kaynak-kisa">Bu özet, gün içinde sitemizde yayımlanan haberlerden yapay zekâ desteğiyle hazırlanmıştır. Ayrıntılar için başlıklara tıklayın.</p>
${paylasCubugu(SITE.url + yol, `Mersin günün özeti: ${o.baslik}`)}
</article>
${arsiv.length > 1 ? `<div class="bolum-bas"><h2>Önceki günler</h2></div><div class="yan-liste ozet-arsiv">${arsiv.filter((a) => a.tarih !== o.tarih).slice(0, 10).map((a) => `<a class="yan-satir" href="/gunun-ozeti/${a.tarih}/"><span class="yan-metin"><b>${h(a.baslik)}</b><small>${h(ozetTarih(a.tarih))}</small></span></a>`).join('')}</div>` : ''}
</div>${yanKutular(servis)}</main>`,
  });
}
