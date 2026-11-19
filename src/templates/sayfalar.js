import { gundemimKarti } from './gundemim.js';
import { sporYan, sporAnaIcerik, sporMu, macGunuKarti, derbiKarti } from './spor.js';
import { kategoriYan, ekonomiBugunKarti } from './kategoriYan.js';
import { mahalleListesi, mahalleYolu, sade as mahalleSade } from './mahalle.js';
import { macGunuKutusu } from './servisParcalari.js';
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
${macGunuKutusu(servis)}
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


// Haberin konusuna göre kalıcı veri sayfalarına iç bağlantı (okur için faydalı, arama motoru için güçlü iç link)
const ILGILI = [
  [/gram altın|altın fiyat|altın(ı|ın)? (yüksel|düş|rekor)|ons altın/i, '/piyasalar/gram-altin/', 'Gram altın fiyatı (canlı)'],
  [/çeyrek altın/i, '/piyasalar/ceyrek-altin/', 'Çeyrek altın fiyatı'],
  [/dolar|döviz|\bkur(u|lar)?\b/i, '/piyasalar/dolar/', 'Dolar kuru ve çevirici'],
  [/euro/i, '/piyasalar/euro/', 'Euro kuru'],
  [/benzin|motorin|akaryakıt|mazot|lpg/i, '/akaryakit/', '81 il akaryakıt fiyatları'],
  [/benzin|motorin|akaryakıt|mazot|lpg/i, '/akaryakit-fiyatlari/', 'Mersin akaryakıt fiyatları'],
  [/deprem|sarsıntı|afad/i, '/son-depremler/', 'Son depremler (Türkiye)'],
  [/okul.{0,30}tatil|kar tatili|eğitime ara/i, '/kar-tatili/', 'Okulların tatil olduğu iller'],
  [/iftar|sahur|imsak|namaz|ramazan|bayram namazı/i, '/namaz-vakitleri/', 'Mersin namaz vakitleri'],
  [/hava durumu|yağmur|sağanak|fırtına|kar yağışı|sıcaklık|meteoroloji|kuvvetli rüzgâr|kuvvetli rüzgar/i, '/hava-durumu/', 'Mersin hava durumu'],
  [/su kesintisi|meski|elektrik kesintisi|toroslar edaş/i, '/kesintiler/', 'Güncel kesintiler'],
  [/nöbetçi eczane/i, '/nobetci-eczane/', 'Nöbetçi eczaneler'],
  [/galatasaray/i, '/spor/takim/galatasaray/', 'Galatasaray puan durumu ve fikstür'],
  [/fenerbahçe/i, '/spor/takim/fenerbahce/', 'Fenerbahçe puan durumu ve fikstür'],
  [/beşiktaş/i, '/spor/takim/besiktas/', 'Beşiktaş puan durumu ve fikstür'],
  [/trabzonspor/i, '/spor/takim/trabzonspor/', 'Trabzonspor puan durumu ve fikstür'],
  [/süper lig/i, '/spor/super-lig/', 'Süper Lig puan durumu'],
];
function ilgiliSayfalar(hikaye) {
  const m = `${hikaye.baslik} ${hikaye.ozet || ''} ${hikaye.metin || ''}`;
  const l = [];
  for (const [re, yol, ad] of ILGILI) if (re.test(m) && !l.some((x) => x[0] === yol)) l.push([yol, ad]);
  return l.length ? `<nav class="ilgili-sayfa" aria-label="İlgili sayfalar"><b>İlgili sayfalar</b>${l.slice(0, 4).map(([y, a]) => `<a href="${y}">${h(a)} →</a>`).join('')}</nav>` : '';
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
${macGunuKarti(servis, hikayeler, simdi)}
${derbiKarti(servis, simdi)}
${gundemimKarti()}
${ozetKarti(servis?.ozet)}
<nav class="turkiye-serit" aria-label="Türkiye geneli"><b>Türkiye geneli</b><a href="/son-depremler/">🌍 Son depremler</a><a href="/kar-tatili/">🏫 Okullar tatil mi?</a><a href="/piyasalar/gram-altin/">🪙 Gram altın</a><a href="/piyasalar/dolar/">💵 Dolar</a><a href="/akaryakit/">⛽ 81 il akaryakıt</a><a href="/hava-durumu/iller/">🌤️ 81 il hava</a><a href="/namaz-vakti/">🕌 81 il namaz</a><a href="/spor/super-lig/">⚽ Süper Lig</a></nav>
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

// İlçeye ait otomatik haber (yol kapanması, su kesintisi, deprem, okul tatili…) 6 saat boyunca ilçe sayfasının en üstünde
function ilceSonDakika(hikayeler, ilce, simdi) {
  const liste = hikayeler
    .filter((x) => (x.otomatik || x.macHaberi) && x.ilceler?.includes(ilce.slug) && simdi - new Date(x.ilkGorulme).getTime() < 6 * 36e5)
    .sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme))
    .slice(0, 2);
  if (!liste.length) return '';
  return `<section class="ilce-sondakika">${liste
    .map((x) => `<a class="isd-kart" href="${h(haberYolu(x))}">${x.kapak ? `<img src="/kapak/${h(x.kapak)}.webp" alt="" width="160" height="90">` : ''}<span class="isd-metin"><span class="isd-rozet">● Son dakika · ${h(ilce.ad)}</span><b>${h(x.baslik)}</b><small>${saat(x.ilkGorulme)} · ${h(x.kaynaklar[0]?.ad || '')}</small></span><span class="isd-ok" aria-hidden="true">→</span></a>`)
    .join('')}</section>`;
}

export function ilceSayfasi({ ilce, hikayeler, servis, simdi, havuz = hikayeler }) {
  const liste = hikayeler.filter((x) => x.ilceler.includes(ilce.slug)).slice(0, AYAR.ilceHaberSayisi);
  // Son 7 günde ilçenin öne çıkanları: en çok kaynağın yazdığı haberler
  const kaynakSayisi = (x) => new Set((x.kaynaklar || []).map((k) => k.ad)).size;
  const haftaninlari = havuz
    .filter((x) => !x.genel && x.ilceler?.includes(ilce.slug) && simdi - new Date(x.ilkGorulme).getTime() < 7 * 864e5)
    .sort((a, b) => kaynakSayisi(b) + (b.metin ? 1 : 0) - (kaynakSayisi(a) + (a.metin ? 1 : 0)) || new Date(b.ilkGorulme) - new Date(a.ilkGorulme))
    .slice(0, 5);
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
${ilceSonDakika(hikayeler, ilce, simdi)}
${haftaninlari.length >= 3 ? `<section class="ilce-hafta"><div class="ih-bas"><span>📌</span><div><h2>Son 7 günde ${h(ilce.ad)}'${ayrilmaEki(ilce.ad)}</h2><small>Haftanın öne çıkan ${haftaninlari.length} gelişmesi</small></div></div>
<ol>${haftaninlari.map((x) => `<li><a href="${h(haberYolu(x))}"><b>${h(x.baslik)}</b><small>${new Date(x.ilkGorulme).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'Europe/Istanbul' })}${kaynakSayisi(x) > 1 ? ` · ${kaynakSayisi(x)} kaynak yazdı` : ''}</small></a></li>`).join('')}</ol></section>` : ''}
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
export function haberSayfasi({ hikaye, ilgili, servis, tumHaberler = null }) {
  const kat = katBilgi(hikaye);
  const yol = haberYolu(hikaye);
  const kurumKayit = hikaye.kaynaklar.find((k) => k.ad === (hikaye.kurum || hikaye.yaziKaynak)) || hikaye.kaynaklar[0];
  const goruldu = new Set([kurumKayit.ad]);
  const digerleri = hikaye.kaynaklar.filter((k) => !goruldu.has(k.ad) && goruldu.add(k.ad));
  const tamYazi = Boolean(hikaye.metin);
  const kurumFoto = hikaye.gorselKaynak && hikaye.gorselKaynak !== 'yz' ? hikaye.gorselKaynak : null;
  const gorselUrl = hikaye.gorsel ? `${SITE.url}/uretilen/${hikaye.gorsel}` : hikaye.kapak ? `${SITE.url}/kapak/${hikaye.kapak}.webp` : null;
  const paragraflar = (hikaye.metin || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p, i, a) => `<p>${h(p).replace(/\n/g, '<br>')}</p>${i === 1 && a.length > 3 ? reklamAlani('yazi-ici') : ''}`).join('\n');
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
    author: { '@type': 'Organization', name: hikaye.otomatik ? 'Mersin Anlık Veri Masası' : 'Mersin Anlık Haber Merkezi', url: SITE.url + '/hakkimizda/' },
    publisher: { '@type': 'NewsMediaOrganization', name: SITE.name, url: SITE.url + '/', logo: { '@type': 'ImageObject', url: `${SITE.url}/logo-kare.png` }, publishingPrinciples: SITE.url + '/yayin-ilkeleri/', correctionsPolicy: SITE.url + '/duzeltme-politikasi/', masthead: SITE.url + '/kunye/' },
  };
  const ust = `<div class="su-an-bas haber-bas"><div>
<div class="cipler">${ilceCipleri(hikaye)}</div>
<h1>${h(hikaye.baslik)}</h1>
<p class="haber-meta"><a class="imza" href="/hakkimizda/">${hikaye.otomatik ? 'Mersin Anlık Veri Masası' : 'Mersin Anlık Haber Merkezi'}</a> · <time datetime="${hikaye.ilkGorulme}">${tarihUzun(hikaye.ilkGorulme)} · ${saat(hikaye.ilkGorulme)}</time> · ${Math.max(1, Math.round(`${hikaye.ozet || ''} ${hikaye.metin || ''}`.split(/\s+/).length / 200))} dk okuma</p>
</div></div>`;
  const icerik = `<main class="kap govde">
<div class="ana">
<article class="haber-yazi" style="--kat:${kat.renk}">
${!hikaye.gorsel && hikaye.kapak ? `<figure class="haber-gorsel"><img src="/kapak/${h(hikaye.kapak)}.webp" alt="${h(hikaye.baslik)}" width="1200" height="675" decoding="async"></figure>` : ''}
${hikaye.gorsel ? `<figure class="haber-gorsel"><img src="/uretilen/${h(hikaye.gorsel)}" alt="${kurumFoto ? h(hikaye.baslik) : 'Temsili görsel (yapay zekâ ile üretildi)'}" width="800" height="450" decoding="async"><figcaption>${kurumFoto ? `Fotoğraf: ${h(kurumFoto)}` : 'Temsili görsel · yapay zekâ ile üretilmiştir'}</figcaption></figure>` : ''}
${hikaye.metin || hikaye.ozet ? dinleDugmesi() : ''}
${hikaye.ozet ? `<p class="haber-spot">${h(hikaye.ozet)}</p>` : ''}
${paragraflar}
${!hikaye.metin && !hikaye.ozet ? `<div class="kisa-haber">
<p>${hikaye.ozetIcinMetin ? 'Bu haberi kendi cümlelerimizle hazırlıyoruz; sayfa kısa süre içinde güncellenecek.' : 'Bu haberin ayrıntıları şimdilik yalnızca kaynağında yer alıyor.'} Haberi ilk duyuran: <b>${h(kurumKayit.ad)}</b>${hikaye.kaynaklar.length > 1 ? ` (toplam ${new Set(hikaye.kaynaklar.map((k) => k.ad)).size} kaynak)` : ''}.</p>
<a class="kisa-haber-dugme" href="${h(kurumKayit.link)}" rel="noopener nofollow" target="_blank">Haberin ayrıntılarını ${h(kurumKayit.ad)}'da oku →</a>
</div>` : ''}
${hikaye.metin ? `<p class="haber-seffaf">${hikaye.otomatik ? 'Bu haber resmî veriden (aşağıdaki kaynak) Mersin Anlık Veri Masası tarafından otomatik olarak hazırlanmıştır.' : 'Bu haber, kaynaklardaki bilgilerden yararlanılarak Mersin Anlık Haber Merkezi tarafından kendi cümlelerimizle yazılmıştır; yazımda yapay zekâ desteği kullanılmıştır.'} <a href="/yapay-zeka-ilkeleri/">Nasıl çalışıyoruz?</a> · Hata mı gördünüz? <a href="/duzeltme-politikasi/">Düzeltme talebi</a></p>` : ''}
<p class="haber-kaynak-kisa">Kaynak: ${[kurumKayit, ...digerleri.slice(0, 2)].map((k) => `<a href="${h(k.link)}" rel="noopener nofollow" target="_blank">${h(k.ad)}</a>`).join(', ')}</p>
${hikaye.konular?.length ? `<p class="haber-konular">Konu: ${hikaye.konular.map((k) => `<a href="/konu/${k.slug}/">${h(k.ad)}</a>`).join('')}</p>` : ''}
${ilgiliSayfalar(hikaye)}
${paylasCubugu(SITE.url + yol, hikaye.baslik)}
</article>
${reklamAlani('yazi-sonu')}
${ilgili.length >= 3 ? `<div class="bolum-bas"><h2>Bunlar da ilginizi çekebilir</h2></div><div class="ilgili-kareler">${ilgili.slice(0, 3).map((x) => kareKart(x)).join('')}</div>` : ''}
${ilgili.length > 3 ? `<div class="bolum-bas"><h2>${ilce ? `${h(ilce.ad)}'${ayrilmaEki(ilce.ad)} diğer haberler` : 'Diğer haberler'}</h2></div>\n${haberListesi(ilgili.slice(3))}` : ''}
</div>
${kat.slug === 'spor' ? sporYan(servis, tumHaberler || ilgili) : kategoriYan(kat.slug === 'genel' ? 'turkiye-dunya' : kat.slug, { servis, hikayeler: tumHaberler || ilgili, ilce, okul: servis?.okul }) || yanKutular(servis, ilce)}
</main>`;
  return sayfa({
    baslik: hikaye.baslik,
    aciklama: (hikaye.ozet || hikaye.metin || hikaye.baslik).slice(0, 160),
    yol,
    aktif: `/kategori/${kat.slug === 'genel' ? 'turkiye-dunya' : kat.slug}/`,
    // Türkiye-dünya haberleri ulusal sitelerin konusu: Google'a kapalı, site Mersin odağını korusun
    noindex: !tamYazi || (hikaye.genel && !hikaye.kalici),
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
    aciklama: `Mersin ${kategori.ad.toLocaleLowerCase('tr-TR')} haberleri: Akdeniz, Yenişehir, Mezitli, Toroslar, Tarsus, Erdemli ve tüm ilçelerden son dakika gelişmeler. Kaynakları belirtilerek, gün boyu güncellenir.`,
    yol: `/kategori/${kategori.slug}/`,
    ust: `<div class="su-an-bas"><div><h1>${h(kategori.ad)}</h1><p style="margin-top:8px">Son ${AYAR.saklamaGun} gün · ${liste.length} haber</p></div></div>
<nav class="kat-menu" aria-label="Kategoriler">${diger.map((k) => `<a href="/kategori/${k.slug}/" style="--kat:${k.renk}">${h(k.ad)}</a>`).join('')}</nav>`,
    tema: kategori.slug === 'spor' ? 'spor' : undefined,
    icerik: `<main class="kap govde"><div class="ana">${kategori.slug === 'ekonomi' ? ekonomiBugunKarti(servis) : ''}${kategori.slug === 'spor' ? `<p class="giris-metni"><a href="/spor/">⚽ Mersin takımlarının puan durumu, fikstürü ve maçları için spor sayfası →</a></p>` : ''}${haberListesi(kategori.slug === 'spor' ? liste.filter(sporMu) : liste, 'Bu kategoride son günlerde haber yok.')}</div>${kategori.slug === 'spor' ? sporYan(servis, hikayeler) : kategoriYan(kategori.slug, { servis, hikayeler, okul: servis?.okul }) || yanKutular(servis)}</main>`,
  });
}

// "Dinle": haberi tarayıcının Türkçe sesiyle okur (ses yoksa düğme gizli kalır)
export const dinleDugmesi = () => `<button type="button" class="dinle" data-dinle hidden><span class="dinle-ikon" aria-hidden="true">🔊</span><span data-dinle-metin>Sesli dinle</span></button>`;

// ---------- Konu sayfaları ----------
export function konuSayfasi({ konu, konular, servis }) {
  const liste = konu.liste.slice(0, 80);
  return sayfa({
    baslik: `${konu.ad} haberleri – Mersin`,
    aciklama: `${konu.giris} Son gelişmeler tek sayfada.`,
    yol: `/konu/${konu.slug}/`,
    ust: `<div class="su-an-bas"><div><h1>${h(konu.ad)}</h1><p style="margin-top:8px">${liste.length} haber · güncel</p></div></div>
<nav class="kat-menu" aria-label="Konular">${konular.filter((k) => k.slug !== konu.slug).map((k) => `<a href="/konu/${k.slug}/">${h(k.ad)}</a>`).join('')}</nav>`,
    icerik: `<main class="kap govde"><div class="ana"><p class="giris-metni">${h(konu.giris)}</p>${haberListesi(liste, 'Bu konuda haber yok.')}</div>${yanKutular(servis)}</main>`,
  });
}

export function konularSayfasi({ konular, servis }) {
  return sayfa({
    baslik: 'Mersin gündemindeki konular',
    aciklama: 'Mersin\'de sık gündeme gelen konular ve her konudaki son haberler.',
    yol: '/konular/',
    ust: `<div class="su-an-bas"><div><h1>Konular</h1><p style="margin-top:8px">Mersin gündeminde sık geçen başlıklar</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana"><div class="konu-izgara">${konular
      .map((k) => `<a class="konu-kart" href="/konu/${k.slug}/"><strong>${h(k.ad)}</strong><small>${k.liste.length} haber · son: ${h(k.liste[0].baslik.slice(0, 60))}${k.liste[0].baslik.length > 60 ? '…' : ''}</small></a>`)
      .join('')}</div></div>${yanKutular(servis)}</main>`,
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
    jsonLd: liste.filter((e) => e.tarih).length
      ? {
          '@context': 'https://schema.org',
          '@graph': liste
            .filter((e) => e.tarih)
            .map((e) => ({
              '@type': 'Event',
              name: e.baslik,
              startDate: e.saat ? `${e.tarih}T${e.saat}:00+03:00` : e.tarih,
              eventStatus: 'https://schema.org/EventScheduled',
              eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
              location: { '@type': 'Place', name: e.yer || 'Mersin', address: { '@type': 'PostalAddress', addressLocality: 'Mersin', addressCountry: 'TR' } },
              image: e.foto ? [`${SITE.url}/etkinlik/${e.foto}`] : undefined,
              url: e.link,
              organizer: { '@type': 'Organization', name: 'Mersin Büyükşehir Belediyesi', url: 'https://www.mersin.bel.tr/' },
            })),
        }
      : null,
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
  const icerik = `<main class="kap govde"><div class="ana">
${sporAnaIcerik({ servis, hikayeler, ligMenusu: ligMenusu(servis?.spor?.ligler || {}, null) })}
</div>${sporYan(servis, hikayeler)}</main>`;
  return sayfa({
    baslik: 'Mersin spor – Mersin takımları, Süper Lig puan durumu, maçlar',
    aciklama: 'Yeni Mersin İdmanyurdu ve Mersin takımlarının puan durumu, formu ve fikstürü; Mersin spor haberleri, Süper Lig maçları ve puan tablosu, A Milli Takım sonuçları.',
    yol: '/spor/',
    tema: 'spor',
    ust: `<div class="su-an-bas"><div><h1>Spor</h1><p style="margin-top:8px">Mersin takımları · Mersin spor gündemi · Süper Lig · A Milli Takım</p></div></div>`,
    icerik,
  });
}

export function ligSayfasi({ servis, kod, hikayeler = [] }) {
  const sp = servis?.spor || {};
  const k = sp.ligler?.[kod];
  const lig = LIGLER.find((l) => l.kod === kod);
  const icerik = `<main class="kap govde"><div class="ana">
${ligMenusu(sp.ligler || {}, kod)}
${k ? `${ligSerit(k)}${k.maclar?.length ? `<h3 class="ara-baslik">Haftanın maçları</h3>${macListesi(k.maclar)}` : ''}<h3 class="ara-baslik">Puan durumu</h3>${ligTablosu(k)}` : '<div class="bos">Puan durumu şu an alınamadı.</div>'}
<p style="color:var(--ikincil);font-size:15px">Kaynak: Türkiye Futbol Federasyonu (tff.org). Son güncelleme: ${sp.guncelleme ? saat(sp.guncelleme) : '–'}</p>
</div>${sporYan(servis, hikayeler)}</main>`;
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
const KALEM_YOL = { GRA: 'gram-altin', CEYREKALTIN: 'ceyrek-altin', YARIMALTIN: 'yarim-altin', TAMALTIN: 'tam-altin', CUMHURIYETALTINI: 'cumhuriyet-altini', ATAALTIN: 'ata-altin', YIA: '22-ayar-bilezik', '18AYARALTIN': '18-ayar-altin', '14AYARALTIN': '14-ayar-altin', HAS: 'has-altin', GUMUS: 'gumus', USD: 'dolar', EUR: 'euro', GBP: 'sterlin', CHF: 'isvicre-frangi', SAR: 'riyal', RUB: 'ruble' };
const tabloSatir = (x, kod = null) => `<tr${kod ? ` id="${kod}"` : ''}><th scope="row">${KALEM_YOL[x.k] ? `<a href="/piyasalar/${KALEM_YOL[x.k]}/">${h(x.ad)}</a>` : h(x.ad)}</th><td data-tg="${x.k}" data-alan="alis">${x.alis ? fmt(x.alis) : '–'}</td><td data-tg="${x.k}" data-alan="satis"><strong>${fmt(x.satis)}</strong></td><td data-tg="${x.k}" data-alan="degisim">${yon(x.degisim)}</td></tr>`;

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
    aciklama: "Mersin'in 13 ilçesinden son haberler: Akdeniz, Yenişehir, Mezitli, Toroslar, Tarsus, Erdemli, Silifke, Anamur ve diğer ilçelerde bugün neler oluyor?",
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
    aciklama: "Mersin hava durumu: bugün, yarın ve 5 günlük tahmin. Yenişehir, Tarsus, Erdemli, Silifke, Anamur dahil 13 ilçenin sıcaklık ve yağış durumu, MGM uyarıları.",
    yol: '/hava-durumu/',
    ust: `${meteoBandi(servis)}<div class="su-an-bas"><div><h1>Hava durumu</h1></div></div>`,
    icerik: `<main class="kap govde"><div class="ana"><div class="tablo-kap"><table class="tablo"><thead><tr><th>İlçe</th><th>Şu an</th>${gunAdlari.map((g) => `<th>${g}</th>`).join('')}</tr></thead><tbody>${satirlar}</tbody></table></div>
<p style="color:var(--ikincil);font-size:15px">Veri: <a href="${RESMI.metno}" rel="noopener" target="_blank">MET Norway (yr.no)</a>, CC BY 4.0. Son güncelleme: ${servis?.guncelleme ? saat(servis.guncelleme) : '–'}</p><p><a class="bolum-link" href="/hava-durumu/iller/">Türkiye'de 81 il hava durumu →</a></p></div></main>`,
  });
}

export function depremSayfasi({ servis }) {
  const liste = servis?.deprem || [];
  return sayfa({
    baslik: 'Mersin ve çevresinde son depremler',
    aciklama: 'Mersin ve çevresinde son depremler: son 7 günde Mersin, Adana, Antalya ve Akdeniz açıklarında olan depremlerin büyüklüğü, yeri ve derinliği (AFAD verisi).',
    yol: '/deprem/',
    ust: `<div class="su-an-bas"><div><h1>Son depremler</h1><p style="margin-top:8px">Mersin ve çevresi · son 7 gün</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">${
      liste.length
        ? `<div class="tablo-kap"><table class="tablo"><thead><tr><th>Büyüklük</th><th>Yer</th><th>Derinlik</th><th>Zaman</th></tr></thead><tbody>${liste
            .map((d) => `<tr><td><strong>${d.buyukluk.toFixed(1).replace('.', ',')}</strong></td><td>${h(depremYeri(d.yer).ad)}${depremYeri(d.yer).ek ? `<br><small>${h(depremYeri(d.yer).ek)}</small>` : ''}</td><td>${d.derinlik.toFixed(1)} km</td><td>${new Date(d.tarih).toLocaleString('tr-TR', { timeZone: SITE.timezone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td></tr>`)
            .join('')}</tbody></table></div>`
        : '<div class="bos">Son 7 günde bölgede kayıtlı deprem yok.</div>'
    }<p style="color:var(--ikincil);font-size:15px">Veri: <a href="${RESMI.afad}" rel="noopener" target="_blank">AFAD</a>.</p><p><a class="bolum-link" href="/son-depremler/">Türkiye genelinde son depremler →</a></p></div></main>`,
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
<p class="kesinti-mahalle">${k.ilceler.flatMap((i) => i.mahalleler.map((m) => { const bul = mahalleListesi().find((x) => x.ilce === i.ilce && x.anahtar === mahalleSade(m)); return bul ? `<a href="${mahalleYolu(i.ilce, bul.ad)}">${h(m)}</a>` : h(m); })).join(', ')}</p>
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
    ['/', 'Ana sayfa'], ['/gundemim/', '⭐ Benim Gündemim'], ['/ilceler/', 'İlçeler'], ['/nobetci-eczane/', 'Nöbetçi eczane'], ['/kesintiler/', 'Kesintiler'],
    ['/hava-durumu/', 'Hava durumu'], ['/deprem/', 'Son depremler'], ['/piyasalar/', 'Altın ve döviz'], ['/spor/', 'Spor'], ['/bilgi/', 'Merak edilenler'], ['/etkinlikler/', 'Etkinlikler'], ['/rehber/', 'Mersin rehberi'], ['/gezi/', 'Gezi rehberi'], ['/burclar/', 'Burçlar'], ['/tatil-takvimi/', 'Tatil takvimi'], ['/rehber/acil-telefonlar/', 'Acil telefonlar'], ['/namaz-vakitleri/', 'Namaz vakitleri'],
    ['/akaryakit-fiyatlari/', 'Akaryakıt fiyatları'], ['/ulasim/', 'Uçuşlar ve ulaşım'], ['/okullar-tatil-mi/', 'Okullar tatil mi?'], ['/konular/', 'Konular'], ['/arsiv/', 'Haber arşivi'], ['/ara/', 'Haber ara'], ['/kunye/', 'Künye'],
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
      aciklama: `${SITE.name} haberleri nasıl hazırlar?`,
      govde: `<p>${SITE.name}, Mersin ve 13 ilçesindeki gelişmeleri üç yolla okura ulaştırır:</p>
<ul><li><strong>Kurum duyuruları:</strong> Belediyeler, valilik, kaymakamlıklar, üniversiteler, il sağlık ve tarım müdürlükleri gibi resmî kurumların duyurularını kendi cümlelerimizle habere dönüştürürüz ve duyurunun aslına bağlantı veririz.</li>
<li><strong>Derleme:</strong> Yerel ve ulusal haber sitelerinde Mersin'le ilgili çıkan haberleri izler, aynı olayı yazan kaynakları tek haberde birleştirir ve hepsini kaynak olarak gösteririz. Başka sitelerin metinlerini ve fotoğraflarını kopyalamayız; olayın bilgilerini kendi cümlelerimizle yazarız.</li>
<li><strong>Veri haberleri:</strong> AFAD (deprem), MESKİ (su kesintisi), Karayolları (yol durumu), Diyanet (namaz ve iftar vakitleri), Eczacı Odası (nöbetçi eczaneler), TFF (maç sonuçları ve puan durumu) gibi resmî ve açık veri kaynaklarından kalıp cümlelerle otomatik kısa haberler hazırlarız.</li></ul>
<p>Haberinizin ya da kurumunuzun içeriğinin burada yer almasını istemiyorsanız <a href="mailto:${SITE.email}">${SITE.email}</a> adresine yazmanız yeterli.</p>`,
    }),
    ({
      yol: '/hakkimizda/',
      baslik: 'Hakkımızda',
      aciklama: `${SITE.name}: Mersin ve 13 ilçesinin yerel haber sitesi. Kim olduğumuz, ne yaptığımız ve nasıl çalıştığımız.`,
      govde: `<p><strong>${SITE.name}</strong>, Mersin'in 13 ilçesindeki gelişmeleri hızlı, kaynaklı ve sade bir dille aktarmak için 2026'da kurulan yerel bir internet haber sitesidir. Amacımız, Mersinlilerin günlük hayatını doğrudan etkileyen bilgileri tek yerde toplamak: haberler, su ve elektrik kesintileri, nöbetçi eczaneler, hava durumu, yol durumu, okul tatilleri, maç sonuçları ve şehrin gündemi.</p>
<h2>Kim yazıyor?</h2>
<p>Haberler <strong>Mersin Anlık Haber Merkezi</strong> imzasıyla yayımlanır. Veriden otomatik hazırlanan kısa haberler <strong>Mersin Anlık Veri Masası</strong> imzasını taşır. Sitenin kurucusu ve sorumlu yazı işleri müdürü Yakup Tulan'dır; künye bilgileri <a href="/kunye/">künye</a> sayfasındadır.</p>
<h2>Nasıl çalışıyoruz?</h2>
<p>Her haberin altında kaynağı ve kaynağa giden bağlantı bulunur. Haber yazımında yapay zekâdan destek alırız; bunun sınırlarını <a href="/yapay-zeka-ilkeleri/">yapay zekâ kullanım ilkelerimizde</a>, kaynaklarımızı <a href="/kaynaklarimiz/">kaynaklarımız</a> sayfasında, yayın anlayışımızı <a href="/yayin-ilkeleri/">yayın ilkelerimizde</a> açıkça anlatıyoruz.</p>
<h2>Bağımsızlık</h2>
<p>${SITE.name} herhangi bir siyasi parti, kurum ya da şirketin yayın organı değildir. Reklam ve sponsorlu içerikler her zaman açıkça işaretlenir ve haber içeriğini etkilemez.</p>
<h2>Bize ulaşın</h2>
<p>Haber ihbarı, düzeltme talebi ve iş birliği için: <a href="mailto:${SITE.email}">${SITE.email}</a></p>`,
    }),
    ({
      yol: '/duzeltme-politikasi/',
      baslik: 'Düzeltme ve cevap hakkı politikası',
      aciklama: `${SITE.name} yayımladığı haberlerdeki hataları nasıl düzeltir?`,
      govde: `<p>Doğru bilgi vermek önceliğimizdir. Bir haberimizde hata olduğunu düşünüyorsanız haberin bağlantısıyla birlikte <a href="mailto:${SITE.email}">${SITE.email}</a> adresine yazın.</p>
<ul><li>Talepleri en geç 24 saat içinde inceleriz.</li>
<li>Olgusal bir hata varsa haberi düzeltir, haberin sonuna ne değiştiğini ve tarihini belirten bir "Düzeltme" notu ekleriz. Anlamı değiştirmeyen küçük yazım düzeltmelerinde not eklemeyebiliriz.</li>
<li>Haberin tamamı yanlışsa haberi yayından kaldırır ve bunu açıklarız.</li>
<li>Kaynağımızın haberi düzelttiğini ya da kaldırdığını fark edersek haberimizi de ona göre güncelleriz.</li>
<li>Haberde adı geçen kişi ve kurumların cevap ve düzeltme hakkına saygı gösteririz; 5187 sayılı Basın Kanunu kapsamındaki talepler ayrıca değerlendirilir.</li></ul>`,
    }),
    ({
      yol: '/yapay-zeka-ilkeleri/',
      baslik: 'Yapay zekâ kullanım ilkelerimiz',
      aciklama: `${SITE.name} haber hazırlarken yapay zekâyı nasıl ve hangi sınırlar içinde kullanır?`,
      govde: `<p>${SITE.name} küçük bir ekiple çok sayıda kaynağı izleyebilmek için yapay zekâdan destek alır. Bunu açıkça söylüyor ve şu kurallarla sınırlıyoruz:</p>
<ul><li><strong>Bilgi uydurulmaz.</strong> Yapay zekâya yalnızca kaynak metni verilir ve sadece o metindeki bilgilerle yazması istenir. Kaynakta olmayan isim, sayı, tarih ya da yorum eklenmez.</li>
<li><strong>Kaynak her zaman görünür.</strong> Her haberin altında dayandığı kaynakların adı ve bağlantısı bulunur.</li>
<li><strong>Hassas konular otomatik yayımlanmaz.</strong> Suç isnadı, ölüm, çocuklar ve kişisel veriler içeren haberler editör onayı olmadan yayına girmez.</li>
<li><strong>Veri haberleri kalıp cümlelerle yazılır.</strong> Deprem, su kesintisi, yol durumu, akaryakıt, eczane ve maç sonucu haberleri yapay zekâ kullanılmadan, resmî verinin kendisinden hazırlanır.</li>
<li><strong>Görseller işaretlenir.</strong> Yapay zekâ ile üretilen temsili görsellerin altında bu açıkça yazar; gerçek fotoğraf gibi sunulmaz.</li>
<li><strong>Hatalar düzeltilir.</strong> Bir hata gördüğünüzde <a href="/duzeltme-politikasi/">düzeltme politikamıza</a> göre hızla düzeltiriz.</li></ul>`,
    }),
    ({
      yol: '/yayin-ilkeleri/',
      baslik: 'Yayın ilkeleri',
      aciklama: `${SITE.name} yayın ilkeleri ve etik kuralları.`,
      govde: `<p>${SITE.name}, Basın Meslek İlkeleri'ni esas alır. Temel ilkelerimiz:</p>
<ul><li><strong>Doğruluk:</strong> Haberleri doğrulanabilir kaynaklara dayandırır, kaynağını her zaman gösteririz. İddiaları iddia olarak, kesinleşmiş bilgileri kesin bilgi olarak yazarız.</li>
<li><strong>Tarafsızlık:</strong> Siyasi parti, kurum ya da şirket adına yayın yapmayız. Haber ile yorumu birbirinden ayırırız.</li>
<li><strong>Kişilik hakları:</strong> Masumiyet karinesine uyar; şüpheli, mağdur ve çocukların kimliğini korur, kişisel verileri yayımlamayız.</li>
<li><strong>Hassas içerik:</strong> Suç, ölüm, intihar ve şiddet haberlerini sansasyondan uzak, ölçülü bir dille veririz; bu tür haberler editör onayından geçer.</li>
<li><strong>Reklam ayrımı:</strong> Reklam ve sponsorlu içerik açıkça işaretlenir, haber içeriğini etkilemez.</li>
<li><strong>Şeffaflık:</strong> Yapay zekâ desteğini nasıl kullandığımızı <a href="/yapay-zeka-ilkeleri/">açıkça anlatırız</a>; hatalarımızı <a href="/duzeltme-politikasi/">düzeltme politikamıza</a> göre düzeltiriz.</li></ul>`,
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
<section class="spor-bolum"><div class="bolum-bas"><h2>Mersin'de kapalı ve çalışma yapılan yollar</h2><a class="bolum-link" href="https://yol.kgm.gov.tr/kapaliyollar" rel="noopener" target="_blank">KGM haritası →</a></div>
${(servis?.yollar?.liste || []).length ? `<div class="ky-liste yol-liste">${servis.yollar.liste.map((y) => `<div class="ky-satir"><span><b class="yol-neden${/çalışma|baraj/i.test(y.neden) ? '' : ' kapali'}">${h(y.neden)}</b> ${h(y.yol || y.no)}${y.km ? ` <small>(${h(y.km)}. km)</small>` : ''}${y.aciklama ? `<br><small>${h(y.aciklama)}</small>` : ''}</span><small>${y.baslangic ? h(new Date(`${y.baslangic}+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' })) : ''}</small></div>`).join('')}</div>` : '<div class="bos">Karayolları verisine göre şu an Mersin\'de kapalı ya da çalışma yapılan yol görünmüyor.</div>'}
<p style="color:var(--ikincil);font-size:14px">Kaynak: Karayolları Genel Müdürlüğü (yol.kgm.gov.tr). Liste yarım saatte bir güncellenir.</p></section>
</div>${kategoriYan('ulasim', { servis, hikayeler: [] }) || yanKutular(servis)}</main>`,
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

// Ziyaretçi trafiği (Cloudflare Web Analytics)
function trafikBolumu(t) {
  if (!t) return `<div class="bolum-bas"><h2>Ziyaretçi trafiği</h2></div><div class="bos">Trafik verisi birkaç saat içinde gelir.</div>`;
  const degisim = t.onceki ? Math.round(((t.toplam - t.onceki) / t.onceki) * 100) : null;
  const enCok = Math.max(1, ...t.gunluk.map((x) => x.sayi));
  const toplamKaynak = t.kaynaklar.reduce((a, b) => a + b.sayi, 0) || 1;
  return `<div class="bolum-bas"><h2>Ziyaretçi trafiği</h2><span>Son 7 gün · Cloudflare</span></div>
<div class="eb-kareler" style="margin-bottom:14px"><div class="eb-kare"><small>Sayfa görüntüleme (7 gün)</small><b>${t.toplam.toLocaleString('tr-TR')}</b><em>Önceki 7 gün: ${t.onceki.toLocaleString('tr-TR')}${degisim != null ? ` (${degisim >= 0 ? '+' : ''}${degisim}%)` : ''}</em></div>
${t.kaynaklar.slice(0, 3).map((k) => `<div class="eb-kare"><small>${h(k.ad)}</small><b>${k.sayi.toLocaleString('tr-TR')}</b><em>%${Math.round((k.sayi / toplamKaynak) * 100)}</em></div>`).join('')}</div>
${t.gunluk.length ? `<div class="gsc-grafik" title="Son 14 günün günlük görüntülemeleri">${t.gunluk.map((x) => `<span style="height:${Math.max(3, Math.round((x.sayi / enCok) * 100))}%" title="${h(x.tarih)}: ${x.sayi}"></span>`).join('')}</div>` : ''}
<h3 class="ara-baslik">Google aramasından en çok gelinen sayfalar</h3>
${t.googleSayfalar.length ? `<div class="ky-liste yol-liste">${t.googleSayfalar.map((x) => `<a class="ky-satir" href="${h(x.yol)}"><span>${h(x.yol)}</span><small>${x.sayi}</small></a>`).join('')}</div>` : '<div class="bos">Henüz Google\'dan gelen ziyaret yok. Yeni siteler için ilk haftalarda normaldir.</div>'}`;
}

// Search Console: Google aramasından gelen trafik
function gscBolumu(g) {
  if (!g) return `<div class="bolum-bas"><h2>Google aramasından gelenler</h2></div><div class="bos">Search Console bağlantısı henüz kurulmadı.</div>`;
  const fark = (a, b) => (b ? `<em>Önceki 7 gün: ${b.toLocaleString('tr-TR')} (${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%)</em>` : '');
  const tablo = (liste, bas) => `<div class="tablo-kap"><table class="tablo"><thead><tr><th>${bas}</th><th>Tıklama</th><th>Gösterim</th><th>TO</th><th>Sıra</th></tr></thead><tbody>${liste.map((x) => `<tr><th scope="row">${bas === 'Sayfa' ? `<a href="${h(x.ad)}">${h(x.ad)}</a>` : h(x.ad)}</th><td>${x.tiklama}</td><td>${x.gosterim}</td><td>%${String(x.ctr).replace('.', ',')}</td><td>${String(x.sira).replace('.', ',')}</td></tr>`).join('') || '<tr><td colspan="5">Henüz veri yok</td></tr>'}</tbody></table></div>`;
  const enCok = Math.max(1, ...g.gunluk.map((x) => x.tiklama));
  return `<div class="bolum-bas"><h2>Google aramasından gelenler</h2><span>${h(g.aralik.bas)} – ${h(g.aralik.bit)} · Search Console</span></div>
<div class="eb-kareler" style="margin-bottom:14px"><div class="eb-kare"><small>Tıklama (7 gün)</small><b>${g.toplam.tiklama.toLocaleString('tr-TR')}</b>${fark(g.toplam.tiklama, g.toplam.oncekiTiklama)}</div><div class="eb-kare"><small>Gösterim (7 gün)</small><b>${g.toplam.gosterim.toLocaleString('tr-TR')}</b>${fark(g.toplam.gosterim, g.toplam.oncekiGosterim)}</div></div>
${g.gunluk.length ? `<div class="gsc-grafik" title="Son 30 günün günlük tıklamaları">${g.gunluk.map((x) => `<span style="height:${Math.max(3, Math.round((x.tiklama / enCok) * 100))}%" title="${h(x.tarih)}: ${x.tiklama} tıklama"></span>`).join('')}</div>` : ''}
<h3 class="ara-baslik">En çok tıklanan sayfalar</h3>${tablo(g.sayfalar, 'Sayfa')}
<h3 class="ara-baslik">Hangi aramalarla geldik?</h3>${tablo(g.sorgular, 'Arama')}`;
}

// ---------- İşleyiş raporu (yönetim için, arama motorlarına kapalı) ----------
const TUR_ADI = { yakit: 'Akaryakıt', deprem: 'Deprem', su: 'Su kesintisi', hava: 'Hava', eczane: 'Nöbetçi eczane', iftar: 'İftar', piyasa: 'Piyasa', ucus: 'Havalimanı', okul: 'Okul tatili', hafta: 'Haftanın özeti', etkinlik: 'Etkinlik', yol: 'Yol durumu', mac: 'Maç', superlig: 'Süper Lig programı', bulten: 'Spor bülteni', diger: 'Diğer' };
export function durumSayfasi({ rapor, gsc = null, trafik = null }) {
  const gunler = Object.keys(rapor?.gunler || {}).sort().reverse();
  const bugun = rapor?.gunler?.[gunler[0]];
  const dun = rapor?.gunler?.[gunler[1]];
  const kart = (ad, a, b) => `<div class="eb-kare"><small>${ad}</small><b>${a ?? '–'}</b>${b != null ? `<em>Dün: ${b}${a !== b ? ` (${a > b ? '+' : ''}${a - b})` : ''}</em>` : ''}</div>`;
  const icerik = `<main class="kap govde"><div class="ana">
${bugun ? `<section class="ekonomi-bugun"><div class="eb-bas"><div><h2>Bugün (${h(gunler[0])})</h2><p>Son güncelleme: ${h(new Date(bugun.guncelleme).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }))}</p></div></div>
<div class="eb-kareler">${kart('Mersin haberi', bugun.mersinHaber, dun?.mersinHaber)}${kart('Kendi yazımız', bugun.kendiYazimiz, dun?.kendiYazimiz)}${kart('Otomatik haber', bugun.otomatik, dun?.otomatik)}${kart('Üretilen görsel', bugun.gorsel, dun?.gorsel)}${kart('Bilgi yazısı', bugun.bilgi, dun?.bilgi)}${kart('Gezi rehberi', bugun.gezi, dun?.gezi)}</div>
<p class="eb-not">${bugun.kaynakHatalari.length ? `⚠️ Son 24 saatte erişilemeyen kaynaklar: ${h(bugun.kaynakHatalari.join(', '))}` : '✅ Son 24 saatte kaynak hatası yok.'}</p></section>
<div class="bolum-bas"><h2>Bugünkü otomatik haberler</h2></div>
${bugun.otomatikBasliklar.length ? `<div class="ky-liste yol-liste">${bugun.otomatikBasliklar.map((x) => `<div class="ky-satir"><span><b class="yol-neden">${h(TUR_ADI[x.tur] || x.tur || 'Diğer')}</b> ${h(x.baslik)}</span><small>${h(x.saat)}</small></div>`).join('')}</div>` : '<div class="bos">Bugün henüz otomatik haber çıkmadı.</div>'}` : '<div class="bos">Rapor henüz oluşmadı.</div>'}
${trafikBolumu(trafik)}
${gsc ? gscBolumu(gsc) : ''}
<div class="bolum-bas"><h2>Son günler</h2></div>
<div class="tablo-kap"><table class="tablo"><thead><tr><th>Gün</th><th>Mersin haberi</th><th>Kendi yazımız</th><th>Otomatik</th><th>Görsel</th><th>Türkiye/dünya</th></tr></thead><tbody>${gunler
    .slice(0, 14)
    .map((g) => { const r = rapor.gunler[g]; return `<tr><th scope="row">${h(g)}</th><td>${r.mersinHaber}</td><td>${r.kendiYazimiz}</td><td>${r.otomatik}${Object.keys(r.otomatikTurler || {}).length ? `<br><small>${h(Object.entries(r.otomatikTurler).map(([k, v]) => `${TUR_ADI[k] || k} ${v}`).join(', '))}</small>` : ''}</td><td>${r.gorsel}</td><td>${r.turkiyeDunya}</td></tr>`; })
    .join('')}</tbody></table></div>
</div></main>`;
  return sayfa({ baslik: 'İşleyiş raporu', aciklama: 'Mersin Anlık günlük işleyiş raporu.', yol: '/durum/', noindex: true, ust: `<div class="su-an-bas"><div><h1>İşleyiş raporu</h1><p style="margin-top:8px">Sitenin günlük özeti · yarım saatte bir güncellenir</p></div></div>`, icerik });
}
