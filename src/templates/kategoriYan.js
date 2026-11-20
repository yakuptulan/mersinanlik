import { piyasaIkon } from './piyasaIkon.js';
// Kategoriye özel yan sütun: her kategori kendi konusuna uygun kutularla açılır
// (spor için spor.js'deki sporYan kullanılır; gündem ve tüm haberlerde genel yan sütun kalır).
import { htmlKacis as h } from '../lib/text.js';
import { reklamAlani, haberYolu, kapakAdresi } from './parcalar.js';
import { kutuBasligi, akaryakitKutusu, namazKutusu, burcKutusu, sayacKutusu, fmt, yon, sporKutusu } from './servisParcalari.js';
import { guncelEtkinlikler } from '../lib/etkinlik.js';
import { gunKararlari } from '../lib/uyarilar.js';
import { havaIkonu } from './havaIkon.js';
import { ILCELER, KATEGORILER, GENEL } from '../config.js';

const TZ = 'Europe/Istanbul';
const gunStr = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: TZ });
const kaynakSayisi = (x) => new Set((x.kaynaklar || []).map((k) => k.ad)).size;

// Bir kategoride son 3 günün en çok konuşulanları
function cokKonusulan(baslik, liste, simdi) {
  const secim = liste
    .filter((x) => simdi - new Date(x.ilkGorulme).getTime() < 72 * 36e5)
    .sort((a, b) => kaynakSayisi(b) - kaynakSayisi(a) || new Date(b.ilkGorulme) - new Date(a.ilkGorulme))
    .slice(0, 5);
  if (secim.length < 3) return '';
  return `<section class="kutu">${kutuBasligi({ ikon: '🔥', baslik })}<ol class="sy-haberler">${secim.map((x, i) => `<li><a href="${h(haberYolu(x))}"><span class="ok-no">${i + 1}</span><img src="${h(kapakAdresi(x).src)}" alt="" width="64" height="48" loading="lazy"><span>${h(x.baslik)}</span></a></li>`).join('')}</ol></section>`;
}

function piyasaKutusu(servis) {
  const k = servis?.piyasa?.kalemler;
  if (!k) return '';
  const satir = (ad, x, ondalik, kod) => (x ? `<div class="ky-satir"><span class="p-ad-ikon">${piyasaIkon(kod, 22)}${ad}</span><b data-tg="${kod}" data-alan="satis">${fmt(x.satis, ondalik)}</b><small>${yon(x.degisim)}</small></div>` : '');
  return `<section class="kutu">${kutuBasligi({ ikon: '💰', baslik: 'Altın ve döviz', link: '/piyasalar/' })}<div class="ky-liste">
${satir('Gram altın', k.gram, 2, 'GRA')}${satir('Çeyrek altın', k.ceyrek, 0, 'CEYREKALTIN')}${satir('Dolar', k.usd, 2, 'USD')}${satir('Euro', k.eur, 2, 'EUR')}${satir('BIST 100', k.bist, 0, 'XU100')}
</div></section>`;
}

function havaKutusu(servis, ilce) {
  const slug = ilce?.slug || 'yenisehir';
  const hv = servis?.hava?.[slug];
  if (!hv) return '';
  const ad = ilce?.ad || 'Mersin';
  return `<section class="kutu">${kutuBasligi({ ikon: '🌤', baslik: `${h(ad)} hava durumu`, link: `/hava-durumu/${slug}/` })}
<div class="ky-hava"><span class="ky-hava-ikon">${havaIkonu(hv.durum, 54)}</span><b>${hv.sicaklik}°</b><span>${h(hv.durum)}</span></div>
<div class="ky-gunler">${(hv.gunler || []).slice(1, 4).map((g) => `<div><small>${new Date(`${g.tarih}T12:00:00+03:00`).toLocaleDateString('tr-TR', { weekday: 'short', timeZone: TZ })}</small>${havaIkonu(g.durum, 30)}<b>${g.max}°</b><i>${g.min}°</i></div>`).join('')}</div></section>`;
}

function etkinlikKutusu(servis, simdi) {
  const liste = guncelEtkinlikler(servis?.etkinlik, simdi).slice(0, 4);
  if (!liste.length) return '';
  return `<section class="kutu">${kutuBasligi({ ikon: '🎭', baslik: 'Yaklaşan etkinlikler', link: '/etkinlikler/' })}<div class="ky-etkinlik">${liste
    .map((e) => `<a href="${h(e.link)}" rel="noopener" target="_blank">${e.foto ? `<img src="/etkinlik/${h(e.foto)}" alt="" width="56" height="56" loading="lazy">` : ''}<span><b>${h(e.baslik)}</b><small>${[e.tarih ? new Date(`${e.tarih}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short', timeZone: TZ }) : null, e.saat].filter(Boolean).map(h).join(' · ')}</small></span></a>`)
    .join('')}</div></section>`;
}

function eczaneKutusu(servis, ilce) {
  const liste = (servis?.eczane?.liste || []).filter((e) => !ilce || e.ilce === ilce.slug);
  const ad = ilce?.ad || 'Mersin';
  return `<section class="kutu">${kutuBasligi({ ikon: '💊', baslik: `${h(ad)} nöbetçi eczaneler`, link: ilce ? `/nobetci-eczane/${ilce.slug}/` : '/nobetci-eczane/' })}<div class="ky-liste">${liste
    .slice(0, 4)
    .map((e) => `<a class="ky-satir" href="tel:${h(e.telefon || '')}"><span>${h(e.ad)}</span><small>${h(ILCELER.find((i) => i.slug === e.ilce)?.ad || '')}</small></a>`)
    .join('') || '<div class="ky-satir"><span>Bugünün listesi için dokunun</span></div>'}</div></section>`;
}

function kesintiKutusu(servis, simdi) {
  const su = (servis?.suKesintisi?.liste || []).filter((k) => !k.bitis || new Date(k.bitis).getTime() > simdi).slice(0, 4);
  const saatStr = (t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  return `<section class="kutu">${kutuBasligi({ ikon: '💧', baslik: 'Su kesintileri', link: '/kesintiler/' })}<div class="ky-liste">${su
    .map((k) => {
      const yer = (k.ilceler || []).map((i) => `${i.ad}${i.mahalleler?.length ? ` (${i.mahalleler.slice(0, 2).join(', ')}${i.mahalleler.length > 2 ? '…' : ''})` : ''}`).join(', ') || 'Mersin';
      return `<a class="ky-satir" href="/kesintiler/"><span>${h(yer)}</span><small>${k.bitis ? `bitiş ${saatStr(k.bitis)}` : ''}</small></a>`;
    })
    .join('') || '<a class="ky-satir" href="/kesintiler/"><span>Şu an duyurulmuş kesinti yok</span><small>→</small></a>'}</div></section>`;
}

function depremKutusu(servis) {
  const d = (servis?.deprem || []).slice(0, 4);
  if (!d.length) return '';
  return `<section class="kutu">${kutuBasligi({ ikon: '〰', baslik: 'Son depremler', link: '/deprem/' })}<div class="ky-liste">${d
    .map((x) => `<a class="ky-satir" href="/deprem/"><span><b class="ky-buyukluk">${x.buyukluk.toFixed(1).replace('.', ',')}</b> ${h(String(x.yer).slice(0, 34))}</span><small>${new Date(x.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })}</small></a>`)
    .join('')}</div></section>`;
}

const ACIL = [
  ['112', 'Acil çağrı (ambulans, polis, itfaiye, jandarma)'],
  ['155', 'Polis imdat'],
  ['156', 'Jandarma'],
  ['177', 'Orman yangını'],
  ['186', 'Elektrik arıza (Toroslar EDAŞ)'],
  ['185', 'Su arıza (MESKİ)'],
];
const acilKutusu = () => `<section class="kutu">${kutuBasligi({ ikon: '☎', baslik: 'Acil telefonlar', link: '/rehber/acil-telefonlar/' })}<div class="ky-liste">${ACIL.map(([n, ad]) => `<a class="ky-satir" href="tel:${n}"><b class="ky-tel">${n}</b><span>${ad}</span></a>`).join('')}</div></section>`;

const trafikKarti = () => `<a class="ky-kart" href="/trafik/" style="--k:#ef4444"><span>🚦</span><b>Canlı trafik haritası</b><small>Mersin'de yoğunluk şu an nasıl?</small></a>`;

function okulKutusu(okul, simdi) {
  const bugun = gunStr(simdi);
  const yarin = gunStr(simdi + 864e5);
  const b = gunKararlari(okul?.kararlar || [], bugun);
  const y = gunKararlari(okul?.kararlar || [], yarin);
  const metin = (k) => (k.some((x) => x.kapsam === 'tum') ? 'Tüm Mersin\'de tatil' : `${[...new Set(k.flatMap((x) => x.ilceler))].map((s) => ILCELER.find((i) => i.slug === s)?.ad).filter(Boolean).join(', ')} ilçelerinde tatil`);
  return `<a class="ky-kart okul ${b.length || y.length ? 'tatil' : ''}" href="/okullar-tatil-mi/"><span>🏫</span><b>Okullar ${b.length ? 'bugün tatil' : y.length ? 'yarın tatil' : 'açık'}</b><small>${b.length ? h(metin(b)) : y.length ? h(metin(y)) : 'Bugün ve yarın için tatil kararı yok'}</small></a>`;
}

function ucusKutusu(servis, simdi) {
  const u = servis?.ucus;
  const liste = [...(u?.giden || []).map((x) => ({ ...x, yon: 'Kalkış' })), ...(u?.gelen || []).map((x) => ({ ...x, yon: 'Varış' }))]
    .filter((x) => new Date(x.tahmini || x.planlanan).getTime() > simdi - 30 * 60e3)
    .sort((a, b) => new Date(a.tahmini || a.planlanan) - new Date(b.tahmini || b.planlanan))
    .slice(0, 5);
  if (!liste.length) return '';
  return `<section class="kutu">${kutuBasligi({ ikon: '✈', baslik: 'Çukurova Havalimanı', link: '/ulasim/' })}<div class="ky-liste">${liste
    .map((x) => `<a class="ky-satir" href="/ulasim/"><span><small class="ky-yon">${x.yon}</small> ${h(x.yer)}</span><small>${new Date(x.tahmini || x.planlanan).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })} · ${h(x.havayolu || '')}</small></a>`)
    .join('')}</div></section>`;
}

// Kategoriye göre kutuların sırası
const DUZEN = {
  ekonomi: (c) => [c.cok('Ekonomide çok konuşulanlar'), piyasaKutusu(c.servis), akaryakitKutusu(c.servis, c.ilce), sayacKutusu(c.servis)],
  asayis: (c) => [c.cok('Asayişte öne çıkanlar'), acilKutusu(), trafikKarti(), depremKutusu(c.servis), eczaneKutusu(c.servis, c.ilce)],
  kaza: (c) => [trafikKarti(), c.cok('Son kazalar ve yangınlar'), acilKutusu(), depremKutusu(c.servis)],
  belediye: (c) => [kesintiKutusu(c.servis, c.simdi), c.cok('Belediyelerden öne çıkanlar'), etkinlikKutusu(c.servis, c.simdi), eczaneKutusu(c.servis, c.ilce)],
  yasam: (c) => [havaKutusu(c.servis, c.ilce), etkinlikKutusu(c.servis, c.simdi), c.cok('Yaşamda çok okunanlar'), eczaneKutusu(c.servis, c.ilce), burcKutusu(c.servis), namazKutusu(c.servis, c.ilce)],
  kultur: (c) => [etkinlikKutusu(c.servis, c.simdi), c.cok('Kültür-sanatta öne çıkanlar'), havaKutusu(c.servis, c.ilce), burcKutusu(c.servis)],
  saglik: (c) => [eczaneKutusu(c.servis, c.ilce), c.cok('Sağlıkta öne çıkanlar'), acilKutusu(), sayacKutusu(c.servis)],
  egitim: (c) => [okulKutusu(c.okul, c.simdi), c.cok('Eğitimde öne çıkanlar'), havaKutusu(c.servis, c.ilce), etkinlikKutusu(c.servis, c.simdi)],
  tarim: (c) => [havaKutusu(c.servis, c.ilce), c.cok('Tarımda öne çıkanlar'), akaryakitKutusu(c.servis, c.ilce), piyasaKutusu(c.servis)],
  hava: (c) => [havaKutusu(c.servis, c.ilce), sayacKutusu(c.servis), depremKutusu(c.servis), c.cok('Hava ile ilgili haberler')],
  ulasim: (c) => [trafikKarti(), ucusKutusu(c.servis, c.simdi), akaryakitKutusu(c.servis, c.ilce), c.cok('Ulaşımda öne çıkanlar')],
  siyaset: (c) => [c.cok('Siyasette çok konuşulanlar'), piyasaKutusu(c.servis), sayacKutusu(c.servis)],
  'turkiye-dunya': (c) => [c.cok("Türkiye'de ve dünyada öne çıkanlar"), piyasaKutusu(c.servis), sporKutusu(c.servis)],
};
const YASAM = ['kultur', 'saglik', 'egitim', 'tarim', 'hava'];

export const kategoriYaniVar = (slug) => Boolean(DUZEN[slug]);

export function kategoriYan(slug, { servis, hikayeler = [], ilce = null, okul = null, simdi = Date.now() }) {
  const duzen = DUZEN[slug];
  if (!duzen) return null;
  const liste = hikayeler.filter((x) => (slug === 'turkiye-dunya' ? x.genel : slug === 'yasam' ? !x.genel && YASAM.includes(x.kategori) : !x.genel && x.kategori === slug));
  const c = { servis, ilce, okul, simdi, cok: (baslik) => cokKonusulan(baslik, liste, simdi) };
  const kutular = duzen(c).filter(Boolean);
  const renk = slug === 'turkiye-dunya' ? GENEL.renk : slug === 'yasam' ? '#D6409F' : KATEGORILER.find((k) => k.slug === slug)?.renk || '#2563eb';
  return `<aside class="yan kategori-yan" style="--kat:${renk}">
${kutular[0] || ''}
${reklamAlani('yan-ust')}
${kutular.slice(1).join('\n')}
${reklamAlani('yan-alt')}
</aside>`;
}

// ---------- Ekonomi sayfası: "Mersin'de bugün" kartı ----------
const AY_EK = { Ocak: 'ta', Şubat: 'ta', Mart: 'ta', Nisan: 'da', Mayıs: 'ta', Haziran: 'da', Temmuz: 'da', Ağustos: 'ta', Eylül: 'de', Ekim: 'de', Kasım: 'da', Aralık: 'ta' };
const bulunmaEki = (t) => AY_EK[String(t).split(' ').pop()] || 'da';
export function ekonomiBugunKarti(servis) {
  const k = servis?.piyasa?.kalemler;
  const ak = servis?.akaryakit;
  if (!k) return '';
  const fiyat = ak?.ilceler?.merkez || ak?.ilceler?.yenisehir || null;
  const kurus = (a, b) => Math.round((a - b) * 100);
  const yakitFark = (tur) => (fiyat && ak?.onceki?.[tur] != null ? kurus(fiyat[tur], ak.onceki[tur]) : null);
  const degisimTarih = ak?.degisim ? new Date(ak.degisim).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: TZ }) : null;
  const yuzde = (x) => `%${fmt(Math.abs(x), 2)}`;
  const hareket = (x) => (x == null ? '' : Math.abs(x) < 0.05 ? 'yatay seyrediyor' : x > 0 ? `${yuzde(x)} yükseldi` : `${yuzde(x)} düştü`);
  const ozet = [
    k.gram ? `Gram altın ${hareket(k.gram.degisim)}` : '',
    k.usd ? `dolar ${hareket(k.usd.degisim)}` : '',
    k.eur ? `euro ${hareket(k.eur.degisim)}` : '',
  ].filter(Boolean).join(', ');
  const bf = yakitFark('benzin');
  const mf = yakitFark('motorin');
  const yakitCumle = degisimTarih && (bf || mf) ? ` Akaryakıtta son fiyat değişikliği ${degisimTarih}'${bulunmaEki(degisimTarih)} oldu: ${[bf ? `benzine ${Math.abs(bf)} kuruş ${bf > 0 ? 'zam' : 'indirim'}` : '', mf ? `motorine ${Math.abs(mf)} kuruş ${mf > 0 ? 'zam' : 'indirim'}` : ''].filter(Boolean).join(', ')}.` : '';
  const kare = (ad, deger, alt, kod, alan = 'satis', degisim = null) => `<div class="eb-kare"><small class="p-ad-ikon">${kod ? piyasaIkon(kod, 20) : alt?.startsWith('Son değişim') ? '⛽' : ''}${ad}</small><b${kod ? ` data-tg="${kod}" data-alan="${alan}"` : ''}>${deger}</b>${degisim != null ? `<span${kod ? ` data-tg="${kod}" data-alan="degisim"` : ''}>${yon(degisim)}</span>` : ''}${alt ? `<em>${alt}</em>` : ''}</div>`;
  const fark = (f) => (f ? `${f > 0 ? '+' : '−'}${fmt(Math.abs(f) / 100, 2)} ₺ (${degisimTarih})` : 'değişmedi');
  return `<section class="ekonomi-bugun">
<div class="eb-bas"><div><h2>Mersin'de bugün</h2><p>${h(ozet.charAt(0).toUpperCase() + ozet.slice(1))}.${h(yakitCumle)}</p></div><a href="/piyasalar/">Tüm piyasalar →</a></div>
<div class="eb-kareler">
${k.gram ? kare('Gram altın', `${fmt(k.gram.satis, 2)} ₺`, '', 'GRA', 'satis', k.gram.degisim) : ''}
${k.usd ? kare('Dolar', `${fmt(k.usd.satis, 2)} ₺`, '', 'USD', 'satis', k.usd.degisim) : ''}
${k.eur ? kare('Euro', `${fmt(k.eur.satis, 2)} ₺`, '', 'EUR', 'satis', k.eur.degisim) : ''}
${fiyat?.benzin ? kare('Benzin (Mersin)', `${fmt(fiyat.benzin, 2)} ₺`, `Son değişim: ${fark(bf)}`) : ''}
${fiyat?.motorin ? kare('Motorin (Mersin)', `${fmt(fiyat.motorin, 2)} ₺`, `Son değişim: ${fark(mf)}`) : ''}
</div>
<p class="eb-not">Altın ve döviz sayfa açıkken güncellenir; değişimler günlüktür. Akaryakıt: Mersin merkez pompa fiyatı. Yatırım tavsiyesi değildir.</p>
</section>`;
}
