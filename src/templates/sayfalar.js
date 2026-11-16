import { SITE, ILCELER, AYAR } from '../config.js';
import { htmlKacis as h, ayrilmaEki } from '../lib/text.js';
import { sayfa, saat, tarihUzun, ilceAdi } from './layout.js';
import { ikon } from './ikonlar.js';
import { haberListesi, mansetKarti, reklamAlani } from './parcalar.js';
import { telefonGoster } from '../lib/eczane.js';
import { havaIkonu, havaTuru } from './havaIkon.js';
import { FOTOLAR } from '../fotolar.js';

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
<span class="hava-durum" data-hava-durum>${hava ? h(hava.durum) : 'Veri bekleniyor'}</span>
<span class="hava-uc" data-hava-uc>${hava?.gunler?.[0] ? `↑ ${hava.gunler[0].max}°  ↓ ${hava.gunler[0].min}°` : ''}</span></div>
</div>
<div class="hava-gunler" data-hava-gunler>${gunler.map((g) => `<div><span>${gunKisa(g.tarih)}</span>${havaIkonu(g.durum, 34)}<b>${g.max}°</b></div>`).join('')}</div>
</a>`;
}

function suAnKartlari(servis, ilceSlug = SITE.defaultIlce) {
  const hava = servis?.hava?.[ilceSlug];
  const dep = sonDeprem(servis);
  const eczaneler = servis?.eczane?.liste || [];
  const ilceEcz = eczaneler.filter((e) => e.ilce === ilceSlug).slice(0, 2);
  const su = aktifSuKesintileri(servis);
  return `<div class="widgetlar">
${havaWidget(hava, ilceSlug)}
<a class="widget widget-yesil" href="/nobetci-eczane/" data-eczane-kart>
<div class="widget-bas"><span class="widget-rozet">${ikon.eczane(24)}</span><span class="widget-etiket">Nöbetçi eczane</span></div>
<span class="widget-deger">${eczaneler.length || '–'}<small>${eczaneler.length ? ' açık' : ''}</small></span>
<div class="widget-liste" data-eczane-liste>${ilceEcz.map((e) => `<span>${h(e.ad)}</span>`).join('') || '<span>İlçene göre listeyi gör</span>'}</div>
<span class="widget-alt" data-eczane-ilce>${ilceEcz.length ? h(ilceAdi(ilceSlug)) + ' · telefon ve adres →' : 'Adres ve telefon →'}</span>
</a>
<a class="widget widget-turuncu widget-kesinti" href="/kesintiler/">
<div class="widget-bas"><span class="widget-rozet">${ikon.damla(24)}</span><span class="widget-etiket">Kesintiler</span><span class="widget-sayi">${servis?.suKesintisi ? `${su.length} su` : ''}</span></div>
<div class="takvim">${su.slice(0, 3).map((k) => `<div class="takvim-satir"><span class="takvim-saat">${k.bitis ? saat(k.bitis) : '—'}<small>bitiş</small></span><span class="takvim-metin"><b>${h(k.ilceler.map((i) => i.ad).join(', '))}</b><small>${h(k.ilceler.flatMap((i) => i.mahalleler).slice(0, 3).join(', '))}</small></span></div>`).join('') || `<div class="takvim-satir"><span class="takvim-metin"><b>${servis?.suKesintisi ? 'Su kesintisi yok' : 'Su ve elektrik'}</b><small>Elektrik için Toroslar EDAŞ sorgusu →</small></span></div>`}</div>
${su.length > 3 ? `<span class="widget-alt">+${su.length - 3} kesinti daha →</span>` : ''}
</a>
<a class="widget widget-mor" href="/deprem/">
<div class="widget-bas"><span class="widget-rozet">${ikon.deprem(24)}</span><span class="widget-etiket">Son deprem</span></div>
<span class="widget-deger">${dep ? dep.buyukluk.toFixed(1).replace('.', ',') : '–'}</span>
<span class="widget-yazi">${dep ? h(depremYeri(dep.yer).ad) : 'Son 7 günde kayıt yok'}</span>
<span class="widget-alt">${dep ? `<span data-once="${dep.tarih}">${saat(dep.tarih)}</span> · AFAD` : 'AFAD'}</span>
${depremCizgisi(servis?.deprem || [])}
</a>
</div>`;
}

function sonDakikaSec(hikayeler, simdi) {
  return hikayeler.find(
    (x) =>
      (simdi - new Date(x.ilkGorulme).getTime()) / 36e5 <= AYAR.sonDakikaSaat &&
      (x.kaynaklar.length > 1 || ['hava', 'kaza', 'asayis'].includes(x.kategori))
  );
}

function sonDakikaBandi(hikaye) {
  if (!hikaye) return '';
  return `<div class="son-dakika"><span class="etiket">SON DAKİKA</span><a href="${h(hikaye.kaynaklar[0].link)}" rel="noopener nofollow" target="_blank">${h(hikaye.baslik)}</a><time datetime="${hikaye.ilkGorulme}">${saat(hikaye.ilkGorulme)}</time></div>`;
}

function mansetSec(hikayeler, simdi) {
  // Son 12 saatte en çok kaynağın yazdığı haber; eşitlikte en yenisi
  const aday = hikayeler.filter((x) => simdi - new Date(x.ilkGorulme).getTime() < 12 * 36e5);
  const liste = aday.length ? aday : hikayeler;
  return [...liste].sort((a, b) => b.kaynaklar.length - a.kaynaklar.length || new Date(b.ilkGorulme) - new Date(a.ilkGorulme))[0];
}

function aktifSuKesintileri(servis, simdi = Date.now()) {
  return (servis?.suKesintisi?.liste || []).filter((k) => !k.bitis || new Date(k.bitis).getTime() > simdi);
}

function ilceEczaneleri(servis, slug) {
  return (servis?.eczane?.liste || []).filter((e) => e.ilce === slug);
}

function yanKutular(servis, ilce = null) {
  const su = aktifSuKesintileri(servis).filter((k) => !ilce || k.ilceler.some((i) => i.ilce === ilce.slug));
  const eczaneler = ilce ? ilceEczaneleri(servis, ilce.slug) : [];
  return `<aside class="yan">
${reklamAlani('yan-ust')}
${ilce ? `<section class="kutu">
<div class="kutu-bas"><h2>${h(ilce.ad)} nöbetçi eczaneler</h2><a href="/nobetci-eczane/#${ilce.slug}">Tümü</a></div>
${eczaneler.map((e) => `<a class="satir" href="tel:${h(e.telefon)}"><span>${ikon.eczane(20)} ${h(e.ad)}</span><small>${h(telefonGoster(e.telefon))}</small></a>`).join('') || `<a class="satir" href="/nobetci-eczane/"><span>Bugünün listesi</span><small>→</small></a>`}
</section>` : ''}
<section class="kutu">
<div class="kutu-bas"><h2>${ilce ? `${h(ilce.ad)} kesintileri` : 'Bugünkü kesintiler'}</h2><a href="/kesintiler/">Tümü</a></div>
<div class="yan-liste">
${su.slice(0, 4).map((k) => `<a class="yan-satir" href="/kesintiler/">
<span class="yan-rozet su">${ikon.damla(18)}</span>
<span class="yan-metin"><b>${h(k.ilceler.map((i) => i.ad).join(', '))}</b><small>${h(k.ilceler.flatMap((i) => i.mahalleler).join(', '))}</small></span>
<span class="yan-sag">${k.bitis ? `<small>bitiş</small><b>${saat(k.bitis)}</b>` : ''}</span></a>`).join('') || `<div class="yan-satir"><span class="yan-rozet su">${ikon.damla(18)}</span><span class="yan-metin"><b>Su kesintisi yok</b><small>MESKİ duyurusu bulunmuyor</small></span></div>`}
</div>
<a class="yan-dugme" href="${RESMI.edas}" rel="noopener" target="_blank">${ikon.simsek(18)} Elektrik kesintisi sorgula <span>→</span></a>
</section>
<section class="kutu">
<div class="kutu-bas"><h2>Son depremler</h2><a href="/deprem/">Tümü</a></div>
<div class="yan-liste">
${(servis?.deprem || []).slice(0, 4).map((d) => { const y = depremYeri(d.yer); return `<div class="yan-satir">
<span class="yan-rozet deprem ${depremSinifi(d.buyukluk)}">${d.buyukluk.toFixed(1).replace('.', ',')}</span>
<span class="yan-metin"><b>${h(y.ad)}</b><small>${h(y.ek || `${d.derinlik.toFixed(0)} km derinlikte`)}</small></span>
<span class="yan-sag"><small>${gunEtiketi(d.tarih)}</small><b>${saat(d.tarih)}</b></span></div>`; }).join('') || '<div class="yan-satir"><span class="yan-metin"><b>Son 7 günde kayıt yok</b></span></div>'}
</div>
</section>
</aside>`;
}

function ilceDugmeleri() {
  return `<div class="ilceler">${ILCELER.map((i) => `<a href="/ilce/${i.slug}/">${h(i.ad)}</a>`).join('')}</div>`;
}

export function anaSayfa({ hikayeler, servis, simdi }) {
  const mersin = hikayeler.filter((x) => !x.genel);
  const genel = hikayeler.filter((x) => x.genel).slice(0, AYAR.anaSayfaGenelSayisi);
  const manset = mansetSec(mersin, simdi);
  const liste = mersin.filter((x) => x !== manset).slice(0, AYAR.anaSayfaHaberSayisi);
  const ust = `${sonDakikaBandi(sonDakikaSec(hikayeler.filter((x) => x !== manset), simdi))}
<div class="su-an-bas">
<div><p>${tarihUzun(new Date(simdi).toISOString())} · <span class="canli-saat" data-canli-saat>${saat(new Date(simdi).toISOString())}</span></p><h1>Mersin'de şu an</h1></div>
<div class="ilce-secici" data-ilce-secici>
<button class="ilce-sec" type="button" aria-expanded="false" aria-controls="ilce-liste">${ikon.konum(20)}<span>Benim ilçem: <span data-ilce-ad>Seç</span></span><span class="daire">${ikon.asagi(18)}</span></button>
<div class="ilce-acilir" id="ilce-liste" hidden>${ILCELER.map((i) => `<button type="button" data-ilce-deger="${i.slug}" aria-pressed="false">${h(i.ad)}</button>`).join('')}</div>
</div>
</div>
${suAnKartlari(servis)}`;
  const icerik = `<main class="kap govde">
<div class="ana">
<div class="bolum-bas"><h2>Manşet</h2><span>Son güncelleme: ${saat(new Date(simdi).toISOString())} (<span data-once="${new Date(simdi).toISOString()}"></span>)</span></div>
${manset ? mansetKarti(manset) : '<div class="bos">Haberler toplanıyor…</div>'}
${genel.length ? `<div class="bolum-bas" style="margin-top:14px"><h2>Türkiye ve dünyadan</h2><span>Birçok kaynağın yazdığı önemli gelişmeler</span></div>
${haberListesi(genel)}` : ''}
<div class="bolum-bas" style="margin-top:14px"><h2>Mersin'den son haberler</h2></div>
${haberListesi(liste)}
</div>
${yanKutular(servis)}
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
  const ust = `<div class="su-an-bas">
<div><p>${tarihUzun(new Date(simdi).toISOString())} · <span class="canli-saat" data-canli-saat>${saat(new Date(simdi).toISOString())}</span></p><h1>${h(ilce.ad)} haberleri</h1></div>
<button class="ilce-sec" type="button" data-ilcem-yap="${ilce.slug}" style="border:none;font:inherit;cursor:pointer">${ikon.konum(20)}<span>Benim ilçem yap</span><span class="daire">${ikon.ok(18)}</span></button>
</div>
${hava ? `<div class="widgetlar widgetlar-gun">${hava.gunler
    .slice(0, 4)
    .map((g, i) => `<div class="widget widget-gun"><span class="widget-etiket">${i === 0 ? 'Bugün' : new Date(`${g.tarih}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'long' })}</span>${havaIkonu(g.durum, 56)}<span class="hava-derece kucuk">${g.max}°</span><span class="hava-durum">${h(g.durum)}</span><span class="hava-uc">↓ en düşük ${g.min}°</span></div>`)
    .join('')}</div>` : ''}`;
  const icerik = `<main class="kap govde">
<div class="ana">
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
    return `<tr id="${i.slug}"><th scope="row"><a href="/ilce/${i.slug}/">${h(i.ad)}</a></th><td><strong>${hv ? hv.sicaklik + '°' : '–'}</strong> ${hv ? h(hv.durum) : ''}</td>${(hv?.gunler || [])
      .slice(1, 4)
      .map((g) => `<td>${g.max}° / ${g.min}°<br><small>${h(g.durum)}</small></td>`)
      .join('')}</tr>`;
  }).join('');
  const gunAdlari = (servis?.hava?.yenisehir?.gunler || []).slice(1, 4).map((g) => new Date(g.tarih).toLocaleDateString('tr-TR', { weekday: 'long' }));
  return sayfa({
    baslik: 'Mersin hava durumu – 13 ilçe',
    aciklama: "Mersin'in 13 ilçesi için güncel hava durumu ve 3 günlük tahmin.",
    yol: '/hava-durumu/',
    ust: `<div class="su-an-bas"><div><h1>Hava durumu</h1></div></div>`,
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

function guncellemeNotu(veri, kaynakAd, kaynakUrl) {
  const zaman = veri?.guncelleme
    ? new Date(veri.guncelleme).toLocaleString('tr-TR', { timeZone: SITE.timezone, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : '';
  return `<p class="not">Kaynak: <a href="${kaynakUrl}" rel="noopener" target="_blank">${kaynakAd}</a>${zaman ? ` · Son kontrol: ${zaman}` : ''}. Gitmeden önce telefonla teyit etmenizi öneririz.</p>`;
}

export function eczaneSayfasi({ servis } = {}) {
  const liste = servis?.eczane?.liste || [];
  const gruplar = ILCELER.map((i) => ({ ilce: i, eczaneler: liste.filter((e) => e.ilce === i.slug) })).filter((g) => g.eczaneler.length);
  const kart = (e) => `<article class="eczane">
<h3>${h(e.ad)}</h3>
${e.saat ? `<p class="eczane-saat">${h(e.saat)}</p>` : ''}
<p>${h(e.adres)}</p>
${e.tarif ? `<p class="eczane-tarif">${h(e.tarif)}</p>` : ''}
<div class="eczane-dugmeler">
${e.telefon ? `<a class="hap" href="tel:${h(e.telefon)}">Ara: ${h(telefonGoster(e.telefon))}</a>` : ''}
${e.lat ? `<a class="dugme-cizgi" href="https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lon}" rel="noopener" target="_blank">${ikon.konum(18)} Yol tarifi</a>` : ''}
</div>
</article>`;
  const govde = liste.length
    ? `<div class="ilce-cipleri">${gruplar.map((g) => `<a class="cip" href="#${g.ilce.slug}">${h(g.ilce.ad)}</a>`).join('')}</div>
${gruplar.map((g) => `<section class="eczane-grup" id="${g.ilce.slug}"><div class="bolum-bas"><h2>${h(g.ilce.ad)}</h2><span>${g.eczaneler.length} eczane</span></div><div class="eczane-liste">${g.eczaneler.map(kart).join('')}</div></section>`).join('')}
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
<h3>${ikon.damla(22)} ${h(k.ilceler.map((i) => i.ad).join(', '))}</h3>
<p class="kesinti-mahalle">${h(k.ilceler.flatMap((i) => i.mahalleler).join(', '))}</p>
<p class="kesinti-saat">${k.baslangic ? zaman(k.baslangic) : ''}${k.bitis ? ` → ${zaman(k.bitis)}` : ''}</p>
${k.aciklama ? `<p>${h(k.aciklama.charAt(0) + k.aciklama.slice(1).toLocaleLowerCase('tr-TR'))}</p>` : ''}
</article>`;
  const govde = `<div class="bolum-bas"><h2>Su kesintileri</h2><span>${su.length} kesinti</span></div>
${su.length ? `<div class="eczane-liste">${su.map(kart).join('')}</div>` : servis?.suKesintisi ? '<div class="bos">Şu an duyurulmuş su kesintisi yok.</div>' : `<div class="bos">Liste şu an alınamadı. <a href="${RESMI.meski}" rel="noopener" target="_blank">MESKİ'nin sayfasına bakın →</a></div>`}
${servis?.suKesintisi ? guncellemeNotu(servis.suKesintisi, 'MESKİ', RESMI.meski) : ''}
<div class="bolum-bas" style="margin-top:34px"><h2>Elektrik kesintileri</h2></div>
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
    ['/hava-durumu/', 'Hava durumu'], ['/deprem/', 'Son depremler'], ['/ara/', 'Haber ara'], ['/kunye/', 'Künye'],
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
      govde: `<p>Üzerinde <strong>"Temsili · YZ"</strong> yazan görseller yapay zekâ ile, haberin konusunu anlatmak için üretilmiştir; gerçek bir fotoğraf değildir ve olaydaki kişileri göstermez.</p>
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
