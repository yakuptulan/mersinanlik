// İlçe bazlı servis sayfaları: "Tarsus nöbetçi eczane", "Erdemli hava durumu",
// "Silifke su kesintisi", "Anamur akaryakıt fiyatları" gibi aramalar için.
import { SITE, ILCELER } from '../config.js';
import { htmlKacis as h, ayrilmaEki } from '../lib/text.js';
import { sayfa, saat, tarihUzun } from './layout.js';
import { ikon } from './ikonlar.js';
import { havaIkonu } from './havaIkon.js';
import { fmt, meteoBandi } from './servisParcalari.js';
import { yanKutular, eczaneKarti, aktifSuKesintileri, guncellemeNotu, RESMI, cumleDuzen } from './sayfalar.js';

// "Tarsus" → "Tarsus'ta", "Erdemli" → "Erdemli'de"
export const bulunma = (ad) => `${ad}'${ayrilmaEki(ad).slice(0, 2)}`;

const SERVISLER = [
  { tur: 'haber', ad: 'Haberler', yol: (s) => `/ilce/${s}/` },
  { tur: 'eczane', ad: 'Nöbetçi eczane', yol: (s) => `/nobetci-eczane/${s}/` },
  { tur: 'hava', ad: 'Hava durumu', yol: (s) => `/hava-durumu/${s}/` },
  { tur: 'namaz', ad: 'Namaz vakitleri', yol: (s) => `/namaz-vakitleri/${s}/` },
  { tur: 'kesinti', ad: 'Kesintiler', yol: (s) => `/kesintiler/${s}/` },
  { tur: 'akaryakit', ad: 'Akaryakıt', yol: (s) => `/akaryakit-fiyatlari/${s}/` },
  { tur: 'mahalle', ad: 'Mahalleler', yol: (s) => `/mahalleler/${s}/` },
];

// İlçenin bütün servis sayfalarına bağlantı şeridi
export function ilceServisMenusu(ilce, aktif) {
  return `<nav class="ilce-servis" aria-label="${h(ilce.ad)} sayfaları"><span class="ilce-servis-bas">${ikon.konum(16)} ${h(bulunma(ilce.ad))}:</span>${SERVISLER.map(
    (x) => `<a class="cip${x.tur === aktif ? ' aktif' : ''}" href="${x.yol(ilce.slug)}"${x.tur === aktif ? ' aria-current="page"' : ''}>${x.ad}</a>`
  ).join('')}</nav>`;
}

// Aynı servisin diğer ilçe sayfaları
function digerIlceler(tur, ilce) {
  const servis = SERVISLER.find((x) => x.tur === tur);
  return `<div class="bolum-bas" style="margin-top:34px"><h2>Diğer ilçeler</h2></div>
<div class="ilce-cipleri">${ILCELER.filter((i) => i.slug !== ilce.slug).map((i) => `<a class="cip" href="${servis.yol(i.slug)}">${h(i.ad)}</a>`).join('')}</div>`;
}

const bugunMetni = (simdi) => new Date(simdi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: SITE.timezone });
const ust = (baslik, alt) => `<div class="su-an-bas"><div><h1>${h(baslik)}</h1><p style="margin-top:8px">${alt}</p></div></div>`;
const sss = (sorular) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: sorular.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

// ---------- Nöbetçi eczane ----------
export function eczaneIlceSayfasi({ ilce, servis, simdi }) {
  const liste = (servis?.eczane?.liste || []).filter((e) => e.ilce === ilce.slug);
  const gun = bugunMetni(simdi);
  const giris = liste.length
    ? `<p class="giris-metni">${h(bulunma(ilce.ad))} bugün (${gun}) nöbetçi olan <strong>${liste.length} eczane</strong> aşağıda. Nöbet saatleri her eczanenin kartında yazıyor; gitmeden önce telefonla teyit etmenizi öneririz.</p>`
    : '';
  const govde = liste.length
    ? `<div class="eczane-liste">${liste.map(eczaneKarti).join('')}</div>${guncellemeNotu(servis.eczane, 'Mersin Eczacı Odası', RESMI.eczane)}`
    : `<div class="bos">${h(ilce.ad)} için bugünün nöbet listesi şu an alınamadı. <a href="/nobetci-eczane/">Tüm Mersin listesine bakın</a> ya da <a href="${RESMI.eczane}" rel="noopener" target="_blank">Eczacı Odası'nın sayfasına gidin →</a></div>`;
  const ilk = liste[0];
  return sayfa({
    baslik: `${ilce.ad} nöbetçi eczane – bugün açık eczaneler`,
    aciklama: `${bulunma(ilce.ad)} bugün nöbetçi eczaneler${ilk ? `: ${liste.map((e) => e.ad).slice(0, 3).join(', ')}` : ''}. Adres, telefon ve yol tarifi.`,
    yol: `/nobetci-eczane/${ilce.slug}/`,
    aktif: '/nobetci-eczane/',
    ust: ust(`${ilce.ad} nöbetçi eczaneler`, `${gun} · bugün açık olan eczaneler`),
    jsonLd: sss([
      [`${bulunma(ilce.ad)} bugün hangi eczane nöbetçi?`, liste.length ? `${gun} günü ${bulunma(ilce.ad)} nöbetçi eczaneler: ${liste.map((e) => `${e.ad} (${e.adres})`).join('; ')}.` : `Güncel liste için Mersin Eczacı Odası'nın sayfasına bakabilirsiniz.`],
    ]),
    icerik: `<main class="kap govde"><div class="ana">
${ilceServisMenusu(ilce, 'eczane')}
${giris}${govde}
${digerIlceler('eczane', ilce)}
</div>${yanKutular(servis, ilce)}</main>`,
  });
}

// ---------- Hava durumu ----------
export function havaIlceSayfasi({ ilce, servis, simdi }) {
  const hv = servis?.hava?.[ilce.slug];
  const gunler = hv?.gunler || [];
  const gunAdi = (t, i) => (i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : new Date(`${t}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'long' }));
  const kartlar = gunler
    .map(
      (g, i) => `<div class="widget widget-gun"><span class="widget-etiket">${gunAdi(g.tarih, i)}</span>${havaIkonu(g.durum, 56)}<span class="hava-derece kucuk">${g.max}°</span><span class="hava-durum">${h(g.durum)}</span><span class="hava-uc">↓ en düşük ${g.min}°</span></div>`
    )
    .join('');
  const yarin = gunler[1];
  const giris = hv
    ? `<p class="giris-metni">${h(bulunma(ilce.ad))} şu an hava <strong>${hv.sicaklik}°</strong> ve ${h(hv.durum.toLocaleLowerCase('tr-TR'))}.${yarin ? ` Yarın en yüksek ${yarin.max}°, en düşük ${yarin.min}° bekleniyor (${h(yarin.durum.toLocaleLowerCase('tr-TR'))}).` : ''}</p>`
    : '<div class="bos">Hava durumu şu an alınamadı.</div>';
  return sayfa({
    baslik: `${ilce.ad} hava durumu – bugün ve 5 günlük tahmin`,
    aciklama: hv ? `${ilce.ad} (Mersin) hava durumu: şu an ${hv.sicaklik}°, ${hv.durum.toLocaleLowerCase('tr-TR')}. Yarın ve önümüzdeki günler için sıcaklık ve tahmin.` : `${ilce.ad} (Mersin) hava durumu ve 5 günlük tahmin.`,
    yol: `/hava-durumu/${ilce.slug}/`,
    aktif: '/hava-durumu/',
    ust: `${meteoBandi(servis, ilce.slug)}${ust(`${ilce.ad} hava durumu`, `${bugunMetni(simdi)}${hv ? ` · şu an ${hv.sicaklik}°` : ''}`)}${kartlar ? `<div class="widgetlar widgetlar-gun gun5">${kartlar}</div>` : ''}`,
    icerik: `<main class="kap govde"><div class="ana">
${ilceServisMenusu(ilce, 'hava')}
${giris}
<p style="color:var(--ikincil);font-size:15px">Veri: <a href="${RESMI.metno}" rel="noopener" target="_blank">MET Norway (yr.no)</a>, CC BY 4.0. Son güncelleme: ${servis?.guncelleme ? saat(servis.guncelleme) : '–'}</p>
${digerIlceler('hava', ilce)}
</div>${yanKutular(servis, ilce)}</main>`,
  });
}

// ---------- Kesintiler ----------
export function kesintiIlceSayfasi({ ilce, servis, simdi }) {
  const su = aktifSuKesintileri(servis, simdi).filter((k) => k.ilceler.some((i) => i.ilce === ilce.slug));
  const zaman = (t) => new Date(t).toLocaleString('tr-TR', { timeZone: SITE.timezone, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const kart = (k) => {
    const bu = k.ilceler.find((i) => i.ilce === ilce.slug);
    return `<article class="kesinti">
<h3>${ikon.damla(22)} ${h(bu?.mahalleler?.length ? bu.mahalleler.join(', ') : ilce.ad)}</h3>
<p class="kesinti-saat">${k.baslangic ? zaman(k.baslangic) : ''}${k.bitis ? ` → ${zaman(k.bitis)}` : ''}</p>
${k.aciklama ? `<p>${h(cumleDuzen(k.aciklama))}</p>` : ''}
</article>`;
  };
  const adRe = new RegExp(ilce.ad, 'i');
  const elektrik = (servis?.elektrikHaber || []).filter((x) => adRe.test(x.baslik));
  return sayfa({
    baslik: `${ilce.ad} su kesintisi ve elektrik kesintisi – bugün`,
    aciklama: `${bulunma(ilce.ad)} bugünkü su kesintileri (MESKİ) ve elektrik kesintisi sorgulama. ${su.length ? `${su.length} aktif su kesintisi var.` : 'Şu an duyurulmuş su kesintisi yok.'}`,
    yol: `/kesintiler/${ilce.slug}/`,
    aktif: '/kesintiler/',
    ust: ust(`${ilce.ad} kesintileri`, `${bugunMetni(simdi)} · su ve elektrik`),
    icerik: `<main class="kap govde"><div class="ana">
${ilceServisMenusu(ilce, 'kesinti')}
<div class="bolum-bas"><h2>Su kesintileri</h2><span>${su.length} kesinti</span></div>
${su.length ? `<div class="eczane-liste">${su.map(kart).join('')}</div>` : servis?.suKesintisi ? `<div class="bos">${h(bulunma(ilce.ad))} şu an duyurulmuş su kesintisi yok.</div>` : `<div class="bos">Liste şu an alınamadı. <a href="${RESMI.meski}" rel="noopener" target="_blank">MESKİ'nin sayfasına bakın →</a></div>`}
${servis?.suKesintisi ? guncellemeNotu(servis.suKesintisi, 'MESKİ', RESMI.meski) : ''}
<div class="bolum-bas" style="margin-top:34px"><h2>Elektrik kesintileri</h2></div>
${elektrik.length ? `<div class="yan-liste" style="margin-bottom:14px">${elektrik.map((x) => `<a class="yan-satir" href="${h(x.yol)}"><span class="yan-rozet elektrik">${ikon.simsek(18)}</span><span class="yan-metin"><b>${h(x.baslik)}</b><small>${saat(x.ilkGorulme)}</small></span></a>`).join('')}</div>` : ''}
<p style="color:var(--govde)">Toroslar EDAŞ, planlı kesintileri adres seçerek sorgulatıyor. ${h(ilce.ad)} ve mahallenizi seçerek bakabilirsiniz:</p>
<p><a class="hap" href="${RESMI.edas}" rel="noopener" target="_blank">Elektrik kesintisi sorgula<span class="daire">${ikon.ok(18)}</span></a></p>
${digerIlceler('kesinti', ilce)}
</div>${yanKutular(servis, ilce)}</main>`,
  });
}

// ---------- Akaryakıt ----------
export function akaryakitIlceSayfasi({ ilce, servis, simdi }) {
  const a = servis?.akaryakit;
  const f = a?.ilceler?.[ilce.slug];
  const tumu = Object.values(a?.ilceler || {});
  const ort = (k) => {
    const v = tumu.map((x) => x[k]).filter(Boolean);
    return v.length ? v.reduce((t, x) => t + x, 0) / v.length : null;
  };
  const kart = (ad, k) => {
    const o = ort(k);
    const fark = f?.[k] && o ? f[k] - o : null;
    return `<div class="yakit-kart"><span class="yakit-ad">${ad}</span><strong>${f?.[k] ? fmt(f[k]) + ' ₺' : '–'}</strong><small>${fark == null ? '' : Math.abs(fark) < 0.005 ? 'Mersin ortalamasıyla aynı' : `Mersin ortalamasından ${fmt(Math.abs(fark))} ₺ ${fark > 0 ? 'pahalı' : 'ucuz'}`}</small></div>`;
  };
  return sayfa({
    baslik: `${ilce.ad} akaryakıt fiyatları – benzin, motorin, LPG bugün`,
    aciklama: f ? `${bulunma(ilce.ad)} bugün benzin ${fmt(f.benzin)} ₺, motorin ${fmt(f.motorin)} ₺${f.lpg ? `, LPG ${fmt(f.lpg)} ₺` : ''}. Güncel pompa fiyatları.` : `${ilce.ad} (Mersin) güncel benzin, motorin ve LPG fiyatları.`,
    yol: `/akaryakit-fiyatlari/${ilce.slug}/`,
    aktif: '/akaryakit-fiyatlari/',
    ust: ust(`${ilce.ad} akaryakıt fiyatları`, `${bugunMetni(simdi)} · litre fiyatı`),
    icerik: `<main class="kap govde"><div class="ana">
${ilceServisMenusu(ilce, 'akaryakit')}
<div class="yakit-kartlar">${kart('Benzin (95)', 'benzin')}${kart('Motorin', 'motorin')}${kart('LPG (otogaz)', 'lpg')}</div>
<p style="color:var(--ikincil);font-size:15px">Kaynak: benzin ve motorin Opet, LPG Petrol Ofisi ${h(ilce.ad)} pompa fiyatları. Diğer istasyonlarda fiyatlar birkaç kuruş farklı olabilir. Son güncelleme: ${a?.guncelleme ? saat(a.guncelleme) : '–'} · <a href="/akaryakit-fiyatlari/">Tüm ilçeler →</a></p>
${digerIlceler('akaryakit', ilce)}
</div>${yanKutular(servis, ilce)}</main>`,
  });
}
