// Gezi rehberi sayfaları: /gezi/ ve /gezi/<yer>/
import { htmlKacis as h } from '../lib/text.js';
import { sayfa } from './layout.js';
import { yanKutular, dinleDugmesi } from './sayfalar.js';
import { paylasCubugu } from './parcalar.js';
import { SITE, ILCELER } from '../config.js';
import { GEZI_YERLERI } from '../gezi-yerleri.js';
import { mesafeKm } from '../lib/uyarilar.js';

const MERKEZ = { lat: 36.8, lon: 34.63 }; // Mersin şehir merkezi (Yenişehir)
const TUR = {
  deniz: { ad: 'Deniz ve sahil', renk: '#0797B9', zaman: 'Deniz için en uygun dönem haziran–eylül arası. Yaz aylarında sahil kalabalık olur; sabah erken saatler daha sakin geçer. Bahar ve sonbaharda kale ve çevresini gezmek için hava daha elverişlidir.' },
  doga: { ad: 'Doğa', renk: '#2B9A66', zaman: 'İlkbahar (mart–mayıs) ve sonbahar (ekim–kasım) yürüyüş için en rahat dönemler. Yaz aylarında öğle sıcağında gezmek yorucu olabilir; sabah ya da akşamüstü tercih edilebilir.' },
  antik: { ad: 'Antik kent', renk: '#8E4EC6', zaman: 'Ören yerleri gölgesi az olduğu için en rahat ilkbahar ve sonbaharda gezilir. Yazın sabah erken saatleri seçin; şapka ve su yanınızda olsun. Rahat ve kapalı ayakkabı önerilir.' },
  kale: { ad: 'Kale', renk: '#C98A00', zaman: 'İlkbahar ve sonbahar en uygun dönemler. Yazın sıcak saatlerden kaçının; kale yollarında rahat ayakkabı tercih edin. Gün batımı saatleri manzara için güzel olur.' },
  magara: { ad: 'Mağara', renk: '#3E4C6E', zaman: 'Mağaranın içi yıl boyu dışarıya göre serindir; yaz sıcağında bile rahat gezilir. Zemin nemli ve kaygan olabileceği için kaymayan ayakkabı giyin.' },
  muze: { ad: 'Müze', renk: '#D6409F', zaman: 'Müze her mevsim gezilebilir; yağmurlu ya da çok sıcak günler için iyi bir seçenektir. Resmî tatil ve bayram günlerinde açılış durumunu önceden kontrol edin.' },
};
const ilceAd = (slug) => ILCELER.find((i) => i.slug === slug)?.ad || 'Mersin';
export const geziYolu = (slug) => `/gezi/${slug}/`;

// Yazılmış yerler, liste sırasıyla
export function geziYerleri(veri) {
  const yazilan = new Map((veri?.yerler || []).map((y) => [y.slug, y]));
  return GEZI_YERLERI.filter((y) => yazilan.has(y.slug)).map((y) => ({ ...y, ...yazilan.get(y.slug) }));
}

function kart(y) {
  const t = TUR[y.tur] || TUR.antik;
  return `<a class="bilgi-kart" href="${geziYolu(y.slug)}" style="--kat:${t.renk}">
<span class="bilgi-gorsel">${y.gorsel ? `<img src="/gezi/${h(y.gorsel.dosya)}" alt="" loading="lazy" width="1200" height="675">` : ''}<span class="bilgi-tur">${h(t.ad)}</span></span>
<span class="bilgi-ic"><b>${h(y.ad)}</b><small>${h(ilceAd(y.ilce))}${y.koord ? ` · merkeze ~${Math.round(mesafeKm(MERKEZ, y.koord))} km` : ''}</small></span>
</a>`;
}

export function geziListeSayfasi({ yerler, servis }) {
  const turler = [...new Set(yerler.map((y) => y.tur))];
  return sayfa({
    baslik: "Mersin gezi rehberi – yer yer gezilecek yerler",
    aciklama: "Kızkalesi, Cennet-Cehennem, Tarsus Şelalesi, Mamure Kalesi ve daha fazlası: nerede, nasıl gidilir, ne zaman gidilir, yakında ne var.",
    yol: '/gezi/',
    aktif: '/rehber/',
    ust: `<div class="su-an-bas"><div><h1>Mersin gezi rehberi</h1><p style="margin-top:8px">Nerede, nasıl gidilir, ne zaman gidilir, yakında ne var</p></div></div>
${turler.length > 1 ? `<nav class="kat-menu">${turler.map((t) => `<a href="#${t}" style="--kat:${TUR[t].renk}">${h(TUR[t].ad)}</a>`).join('')}</nav>` : ''}`,
    icerik: `<main class="kap govde"><div class="ana">
${yerler.length ? turler.map((t) => `<section class="kat-blok" id="${t}" style="--kat:${TUR[t].renk}"><div class="bolum-bas kat-bas"><h2><span class="kat-cizgi"></span>${h(TUR[t].ad)}</h2></div><div class="izgara">${yerler.filter((y) => y.tur === t).map(kart).join('')}</div></section>`).join('') : '<div class="bos">Rehber sayfaları hazırlanıyor.</div>'}
<p style="margin-top:18px"><a href="/rehber/gezilecek-yerler/">İlçe ilçe gezilecek yerler listesi →</a></p>
</div>${yanKutular(servis)}</main>`,
  });
}

const yon = (a, b) => {
  const dy = b.lat - a.lat;
  const dx = (b.lon - a.lon) * Math.cos((a.lat * Math.PI) / 180);
  const aci = (Math.atan2(dx, dy) * 180) / Math.PI;
  return ['kuzeyinde', 'kuzeydoğusunda', 'doğusunda', 'güneydoğusunda', 'güneyinde', 'güneybatısında', 'batısında', 'kuzeybatısında'][Math.round(((aci + 360) % 360) / 45) % 8];
};

// "Ne zaman gideyim?": ilçenin 5 günlük tahmininden hafta sonu (yoksa önümüzdeki günler) için kısa öneri
const YAGIS = /yağmur|sağanak|kar|fırtına|gök gürültü|dolu/i;
function gunNotu(tur, g) {
  const yagis = YAGIS.test(g.durum);
  if (tur === 'muze' || tur === 'magara') return yagis ? { p: 2, n: 'Yağmurlu gün için iyi bir kapalı mekân seçeneği' } : { p: 2, n: 'Gezmek için uygun' };
  if (yagis) return { p: 0, n: 'Yağış bekleniyor, açık alan için uygun değil' };
  if (g.max >= 33) return { p: 1, n: 'Çok sıcak; sabah erken ya da akşamüstü gidin' };
  if (tur === 'deniz') return g.max >= 26 ? { p: 3, n: 'Deniz ve sahil için güzel bir gün' } : { p: 2, n: 'Deniz için serin, sahilde gezmek için güzel' };
  if (g.max < 10) return { p: 1, n: 'Soğuk; kalın giyinin' };
  return { p: 3, n: 'Gezmek için uygun' };
}
function havaOnerisi(tur, hv, ilce) {
  const gunler = (hv?.gunler || []).filter((g) => g.tarih);
  if (!gunler.length) return '';
  const haftaSonu = gunler.filter((g) => [0, 6].includes(new Date(`${g.tarih}T12:00:00+03:00`).getUTCDay()));
  const liste = haftaSonu.length ? haftaSonu : gunler.slice(0, 3);
  const gunAd = (t) => new Date(`${t}T12:00:00+03:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' });
  const notlar = liste.map((g) => ({ g, ...gunNotu(tur, g) }));
  const en = [...notlar].sort((a, b) => b.p - a.p)[0];
  return `<section class="gezi-hava"><h2>${haftaSonu.length ? 'Bu hafta sonu gidilir mi?' : 'Önümüzdeki günlerde hava'}</h2>
<div class="gezi-hava-gunler">${notlar.map((x) => `<div class="gh-gun p${x.p}"><small>${h(gunAd(x.g.tarih))}</small><b>${x.g.max}° / ${x.g.min}°</b><span>${h(x.g.durum)}</span><em>${h(x.n)}</em></div>`).join('')}</div>
<p>${en.p >= 2 ? `En uygun gün: <b>${h(gunAd(en.g.tarih))}</b>.` : 'Bu günler için hava pek elverişli görünmüyor.'} Tahmin ${h(ilce)} için, günde birkaç kez güncellenir.</p></section>`;
}

export function geziSayfasi({ yer: y, yerler, servis }) {
  const yol = geziYolu(y.slug);
  const t = TUR[y.tur] || TUR.antik;
  const baslik = `${y.ad} gezi rehberi: nerede, nasıl gidilir, ne zaman gidilir?`;
  const gorselUrl = y.gorsel ? `${SITE.url}/gezi/${y.gorsel.dosya}` : null;
  const km = y.koord ? Math.round(mesafeKm(MERKEZ, y.koord)) : null;
  const yakin = y.koord
    ? yerler
        .filter((x) => x.slug !== y.slug && x.koord)
        .map((x) => ({ ...x, km: mesafeKm(y.koord, x.koord) }))
        .filter((x) => x.km <= 40)
        .sort((a, b) => a.km - b.km)
        .slice(0, 4)
    : [];
  const hv = servis?.hava?.[y.ilce];
  const harita = y.koord ? `https://www.google.com/maps/dir/?api=1&destination=${y.koord.lat},${y.koord.lon}` : `https://www.google.com/maps/search/${encodeURIComponent(`${y.ad} ${ilceAd(y.ilce)} Mersin`)}`;
  const d = 0.02;
  const osm = y.koord ? `https://www.openstreetmap.org/export/embed.html?bbox=${y.koord.lon - d * 1.6},${y.koord.lat - d},${y.koord.lon + d * 1.6},${y.koord.lat + d}&layer=mapnik&marker=${y.koord.lat},${y.koord.lon}` : null;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TouristAttraction',
      name: y.ad,
      description: y.aciklama,
      url: SITE.url + yol,
      ...(gorselUrl ? { image: gorselUrl } : {}),
      address: { '@type': 'PostalAddress', addressLocality: ilceAd(y.ilce), addressRegion: 'Mersin', addressCountry: 'TR' },
      ...(y.koord ? { geo: { '@type': 'GeoCoordinates', latitude: y.koord.lat, longitude: y.koord.lon } } : {}),
    },
    ...(y.sss?.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: y.sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) }] : []),
  ];
  return sayfa({
    baslik,
    aciklama: y.aciklama,
    yol,
    aktif: '/rehber/',
    jsonLd,
    gorsel: gorselUrl,
    tur: 'article',
    ust: `<div class="su-an-bas haber-bas"><div><div class="cipler"><a class="cip" href="/gezi/#${y.tur}">${h(t.ad)}</a><a class="cip" href="/ilce/${y.ilce}/">${h(ilceAd(y.ilce))}</a></div><h1>${h(y.ad)}</h1><p class="haber-meta">Mersin gezi rehberi${km != null ? ` · Mersin merkezine kuş uçuşu ~${km} km` : ''}</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<article class="haber-yazi bilgi-yazi gezi-yazi" style="--kat:${t.renk}">
${y.gorsel ? `<figure class="haber-gorsel"><img src="/gezi/${h(y.gorsel.dosya)}" alt="${h(y.ad)}" width="1200" height="675"><figcaption>Fotoğraf: ${h(y.gorsel.yazar)} · ${h(y.gorsel.lisans)} · <a href="${h(y.gorsel.sayfa)}" rel="noopener" target="_blank">Wikimedia Commons</a></figcaption></figure>` : ''}
${dinleDugmesi()}
${y.spot ? `<p class="haber-spot">${h(y.spot)}</p>` : ''}
<div class="gezi-ozet">
  <div><small>Nerede?</small><b>${h(ilceAd(y.ilce))}, Mersin</b>${km != null ? `<span>Şehir merkezinin ${yon(MERKEZ, y.koord)}, kuş uçuşu yaklaşık ${km} km</span>` : ''}</div>
  <div><small>Nasıl gidilir?</small><b>Özel araç ya da ilçe dolmuşları</b><span><a href="${h(harita)}" rel="noopener" target="_blank">Google Haritalar'da yol tarifi al →</a></span></div>
  ${hv ? `<div><small>${h(ilceAd(y.ilce))} hava şu an</small><b>${hv.sicaklik}° · ${h(hv.durum)}</b><span><a href="/hava-durumu/${y.ilce}/">5 günlük tahmin →</a></span></div>` : ''}
</div>
<ol class="bilgi-maddeler">${y.bolumler.map((b) => `<li><h2>${h(b.baslik)}</h2><p>${h(b.metin)}</p></li>`).join('')}
<li><h2>Ne zaman gidilir?</h2><p>${h(t.zaman)}</p></li>
<li><h2>Nasıl gidilir?</h2><p>${h(y.ad)}, Mersin'in ${h(ilceAd(y.ilce))} ilçesinde${km != null ? `, şehir merkezinin yaklaşık ${km} km ${yon(MERKEZ, y.koord)}` : ''} bulunuyor. En pratik yol özel araç; ilçe merkezine dolmuş ve otobüslerle de ulaşılabiliyor. Güncel yol durumu ve süre için <a href="${h(harita)}" rel="noopener" target="_blank">yol tarifini</a> kullanabilirsiniz.</p></li>
</ol>
${havaOnerisi(y.tur, hv, ilceAd(y.ilce))}
${osm ? `<figure class="gezi-harita"><iframe src="${h(osm)}" loading="lazy" title="${h(y.ad)} haritası" referrerpolicy="no-referrer"></iframe><figcaption>Harita: © <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank">OpenStreetMap</a> katkıcıları</figcaption></figure>` : ''}
${y.ipuclari?.length ? `<section class="gezi-ipucu"><h2>Gitmeden bilin</h2><ul>${y.ipuclari.map((x) => `<li>${h(x)}</li>`).join('')}</ul></section>` : ''}
${yakin.length ? `<section class="gezi-yakin"><h2>Yakında ne var?</h2><div class="gezi-yakin-liste">${yakin.map((x) => `<a href="${geziYolu(x.slug)}">${x.gorsel ? `<img src="/gezi/${h(x.gorsel.dosya)}" alt="" loading="lazy" width="160" height="90">` : ''}<span><b>${h(x.ad)}</b><small>~${Math.max(1, Math.round(x.km))} km</small></span></a>`).join('')}</div></section>` : ''}
<p class="gezi-uyari">Ziyaret saatleri, giriş ücretleri ve ulaşım bilgileri değişebilir; gitmeden önce resmî kaynaklardan kontrol edin. <a href="/nobetci-eczane/${y.ilce}/">${h(ilceAd(y.ilce))} nöbetçi eczaneleri</a> · <a href="/rehber/acil-telefonlar/">Acil telefonlar</a></p>
${y.sss?.length ? `<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${y.sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>` : ''}
<div class="haber-kaynak"><p>Bu rehber <a href="${h(y.kaynak.link)}" rel="noopener" target="_blank">${h(y.kaynak.ad)}</a> maddesindeki bilgilerden yararlanılarak, yapay zekâ desteğiyle ${SITE.name} tarafından hazırlanmıştır. Metin <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.tr" rel="noopener license" target="_blank">CC BY-SA 4.0</a> lisansıyla paylaşılır. Bir hata görürseniz <a href="/iletisim/">bize yazın</a>.</p></div>
${paylasCubugu(SITE.url + yol, baslik)}
</article>
<div class="bolum-bas"><h2>Diğer gezi rehberleri</h2><a class="bolum-link" href="/gezi/">Tümü →</a></div><div class="izgara">${yerler.filter((x) => x.slug !== y.slug && !yakin.some((k) => k.slug === x.slug)).slice(0, 4).map(kart).join('')}</div>
</div>${yanKutular(servis)}</main>`,
  });
}
