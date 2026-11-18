// "Merak edilenler" sayfaları
import { htmlKacis as h } from '../lib/text.js';
import { sayfa } from './layout.js';
import { yanKutular } from './sayfalar.js';
import { paylasCubugu } from './parcalar.js';
import { SITE } from '../config.js';
import { TUR_AD } from '../bilgi-konulari.js';

// Fotoğraf: Vikipedi'den indirilen (public/bilgi/) ya da sitenin yerel kütüphanesinden (public/foto/)
export const gorselSrc = (y) => (y.gorsel?.yerel ? y.gorsel.yerel : `/bilgi/${y.gorsel?.dosya}`);
const TUR_RENK = { haftasonu: '#F97316', oneri: '#0D9488', gundem: '#E5484D', yasam: '#D6409F', lezzet: '#EF5F00', tarih: '#8E4EC6', doga: '#2B9A66', bilim: '#3E8EDE', sehir: '#0588F0' };
export const bilgiYolu = (y) => `/bilgi/${y.slug}/`;

export function bilgiKarti(y) {
  return `<a class="bilgi-kart" href="${bilgiYolu(y)}" style="--kat:${TUR_RENK[y.tur] || '#475569'}">
<span class="bilgi-gorsel">${y.gorsel ? `<img src="${h(gorselSrc(y))}" alt="" loading="lazy" width="1200" height="675">` : ''}<span class="bilgi-tur">${h(TUR_AD[y.tur] || 'Bilgi')}</span></span>
<span class="bilgi-ic"><b>${h(y.baslik)}</b>${y.spot ? `<small>${h(y.spot)}</small>` : ''}</span>
</a>`;
}

export function bilgiListeSayfasi({ yazilar, servis }) {
  const turler = [...new Set(yazilar.map((y) => y.tur))];
  return sayfa({
    baslik: 'Merak edilenler – Mersin ve dünya hakkında bilgiler',
    aciklama: "Mersin'in lezzetleri, tarihi yerleri, doğası ve bilim dünyasından merak edilen bilgiler.",
    yol: '/bilgi/',
    ust: `<div class="su-an-bas"><div><h1>Merak edilenler</h1><p style="margin-top:8px">Mersin'in lezzetleri, tarihi, doğası ve bilimden ilginç bilgiler</p></div></div>
${turler.length > 1 ? `<nav class="kat-menu">${turler.map((t) => `<a href="#${t}" style="--kat:${TUR_RENK[t]}">${h(TUR_AD[t] || t)}</a>`).join('')}</nav>` : ''}`,
    icerik: `<main class="kap govde"><div class="ana">
${yazilar.length ? turler.map((t) => `<section class="kat-blok" id="${t}" style="--kat:${TUR_RENK[t]}"><div class="bolum-bas kat-bas"><h2><span class="kat-cizgi"></span>${h(TUR_AD[t] || t)}</h2></div><div class="izgara">${yazilar.filter((y) => y.tur === t).map(bilgiKarti).join('')}</div></section>`).join('') : '<div class="bos">İlk yazılar hazırlanıyor.</div>'}
</div>${yanKutular(servis)}</main>`,
  });
}

export function bilgiSayfasi({ yazi: y, yazilar, servis }) {
  const yol = bilgiYolu(y);
  const diger = yazilar.filter((x) => x.slug !== y.slug).slice(0, 4);
  const gorselUrl = y.gorsel ? `${SITE.url}${gorselSrc(y)}` : null;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: y.baslik.slice(0, 110),
      description: y.aciklama,
      datePublished: y.tarih,
      dateModified: y.tarih,
      mainEntityOfPage: SITE.url + yol,
      image: gorselUrl ? [gorselUrl] : [`${SITE.url}/paylasim.jpg`],
      author: { '@type': 'Organization', name: SITE.name, url: SITE.url + '/' },
      publisher: { '@type': 'NewsMediaOrganization', name: SITE.name, logo: { '@type': 'ImageObject', url: `${SITE.url}/logo-kare.png` } },
      ...(y.kaynak?.link ? { isBasedOn: y.kaynak.link } : {}),
      license: 'https://creativecommons.org/licenses/by-sa/4.0/deed.tr',
    },
    ...(y.sss?.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: y.sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) }] : []),
  ];
  return sayfa({
    baslik: y.baslik,
    aciklama: y.aciklama,
    yol,
    aktif: '/bilgi/',
    jsonLd: jsonLd.length === 1 ? jsonLd[0] : jsonLd,
    gorsel: gorselUrl,
    tur: 'article',
    ust: `<div class="su-an-bas haber-bas"><div><div class="cipler"><a class="cip" href="/bilgi/#${y.tur}">${h(TUR_AD[y.tur] || 'Bilgi')}</a></div><h1>${h(y.baslik)}</h1><p class="haber-meta">Merak edilenler · ${new Date(y.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${Math.max(1, Math.round(y.bolumler.map((b) => b.metin).join(' ').split(/\s+/).length / 200))} dk okuma</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<article class="haber-yazi bilgi-yazi" style="--kat:${TUR_RENK[y.tur] || '#475569'}">
${y.gorsel ? `<figure class="haber-gorsel"><img src="${h(gorselSrc(y))}" alt="${h(y.baslik)}" width="1200" height="675"><figcaption>Fotoğraf: ${h(y.gorsel.yazar)} · ${h(y.gorsel.lisans)} · <a href="${h(y.gorsel.sayfa)}" rel="noopener" target="_blank">Wikimedia Commons</a></figcaption></figure>` : ''}
${y.spot ? `<p class="haber-spot">${h(y.spot)}</p>` : ''}
<ol class="bilgi-maddeler">${y.bolumler.map((b) => `<li><h2>${h(b.baslik)}</h2><p>${h(b.metin)}${b.link ? ` <a href="${h(b.link)}" rel="noopener" target="_blank">Etkinlik sayfası →</a>` : ''}</p></li>`).join('')}</ol>
${y.sss?.length ? `<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${y.sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>` : ''}
<div class="haber-kaynak"><p>${y.kaynakNotu ? `${h(y.kaynakNotu)} Yazı yapay zekâ desteğiyle ${SITE.name} tarafından hazırlanmıştır.` : `Bu yazı ${y.kaynaklar?.length ? `Vikipedi'deki ${y.kaynaklar.map((k) => `<a href="${h(k.link)}" rel="noopener" target="_blank">${h(k.ad)}</a>`).join(', ')} maddelerindeki` : `<a href="${h(y.kaynak.link)}" rel="noopener" target="_blank">${h(y.kaynak.ad)}</a> maddesindeki`} bilgilerden yararlanılarak, yapay zekâ desteğiyle ${SITE.name} tarafından hazırlanmıştır. Metin <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.tr" rel="noopener license" target="_blank">CC BY-SA 4.0</a> lisansıyla paylaşılır.`} Bir hata görürseniz <a href="/iletisim/">bize yazın</a>.</p></div>
${paylasCubugu(SITE.url + yol, y.baslik)}
</article>
${diger.length ? `<div class="bolum-bas"><h2>Diğer merak edilenler</h2><a class="bolum-link" href="/bilgi/">Tümü →</a></div><div class="izgara">${diger.map(bilgiKarti).join('')}</div>` : ''}
</div>${yanKutular(servis)}</main>`,
  });
}
