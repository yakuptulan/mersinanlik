// "Benim Gündemim": okurun seçtiği ilçe ve konulara göre kişisel, kısa haber akışı.
// Tercihler yalnızca okurun tarayıcısında (localStorage) tutulur; sunucuya bir şey gönderilmez.
import { SITE, ILCELER, KATEGORILER, GENEL } from '../config.js';
import { htmlKacis as h } from '../lib/text.js';
import { sayfa } from './layout.js';
import { sayfasiVar, haberYolu, kapakAdresi } from './parcalar.js';
import { bugununMaclari } from './servisParcalari.js';
import { KONULAR, konuBul } from '../konular.js';

// Özeti cümle sınırında kısaltır
function kisalt(m, n) {
  if (m.length <= n) return m;
  const kes = m.slice(0, n);
  const nokta = kes.lastIndexOf('. ');
  return nokta > n * 0.5 ? kes.slice(0, nokta + 1) : kes.replace(/\s+\S*$/, '') + '…';
}

// Akış verisi: son 72 saatin haberleri (kişisel sıralama tarayıcıda yapılır)
export function akisVerisi(hikayeler, simdi) {
  return hikayeler
    .filter((x) => simdi - new Date(x.ilkGorulme).getTime() < 72 * 36e5)
    .map((x) => ({
      i: x.id,
      b: x.baslik,
      o: kisalt(x.ozet || '', 240),
      k: x.genel ? 'turkiye-dunya' : x.kategori,
      il: x.ilceler,
      ko: x.genel ? [] : konuBul(x).map((k) => k.slug),
      y: sayfasiVar(x) ? haberYolu(x) : x.kaynaklar[0].link,
      d: sayfasiVar(x) ? 0 : 1,
      g: kapakAdresi(x).src,
      z: x.ilkGorulme,
      s: new Set(x.kaynaklar.map((k) => k.ad)).size,
    }));
}

// Kişisel kutular için ilçe ilçe kısa servis özeti (sayfaya gömülür)
function servisOzeti(servis, simdi) {
  const ilce = {};
  for (const i of ILCELER) {
    const hv = servis?.hava?.[i.slug];
    const ecz = (servis?.eczane?.liste || []).filter((e) => e.ilce === i.slug);
    const yakit = servis?.akaryakit?.ilceler?.[i.slug];
    ilce[i.slug] = {
      ad: i.ad,
      hava: hv ? { s: hv.sicaklik, d: hv.durum, mx: hv.gunler?.[0]?.max, mn: hv.gunler?.[0]?.min } : null,
      ecz: ecz.slice(0, 2).map((e) => ({ ad: e.ad, tel: e.telefon || '' })),
      eczSayi: ecz.length,
      yakit: yakit ? { b: yakit.benzin, m: yakit.motorin, l: yakit.lpg } : null,
    };
  }
  const maclar = bugununMaclari(servis, simdi).slice(0, 6).map((m) => ({ ev: m.ev, dep: m.dep, skor: m.skor, saat: m.saat, durum: m.durum, mersin: m.mersin }));
  return { ilce, maclar };
}

export function gundemimSayfasi({ servis, simdi }) {
  const kategoriler = [...KATEGORILER.map(({ slug, ad, renk }) => ({ slug, ad, renk })), { slug: 'turkiye-dunya', ad: 'Türkiye ve dünya', renk: GENEL.renk }];
  const veri = {
    ilceler: ILCELER.map(({ slug, ad }) => ({ slug, ad })),
    kategoriler,
    konular: KONULAR.map(({ slug, ad }) => ({ slug, ad })),
    servis: servisOzeti(servis, simdi),
  };
  const icerik = `<main class="kap govde gundemim" data-gundemim>
<section class="gm-kurulum" data-gm-kurulum hidden>
  <div class="gm-adim"><h2><span>1</span> Hangi ilçeleri takip ediyorsun?</h2><p>Birden fazla seçebilirsin. Seçmezsen bütün Mersin gelir.</p><div class="gm-cipler" data-gm-secim="ilce"></div></div>
  <div class="gm-adim"><h2><span>2</span> Hangi konular ilgini çekiyor?</h2><div class="gm-cipler" data-gm-secim="kategori"></div></div>
  <div class="gm-adim"><h2><span>3</span> Her gün görmek istediğin kutular</h2><div class="gm-cipler" data-gm-secim="kutu"></div></div>
  <div class="gm-adim"><h2><span>4</span> Kaç haber gösterelim?</h2><div class="gm-cipler" data-gm-secim="adet"></div></div>
  <button type="button" class="gm-buyuk-dugme" data-gm-kaydet>Gündemimi hazırla →</button>
  <p class="gm-gizlilik">Seçimlerin sadece bu cihazda saklanır, kimseyle paylaşılmaz.</p>
</section>
<section class="gm-akis" data-gm-akis hidden>
  <div class="gm-ust">
    <div><h2 data-gm-selam></h2><p data-gm-alt></p></div>
    <div class="gm-ust-dugmeler"><button type="button" class="gm-hizli" data-gm-hizli>⚡ Hızlı oku</button><button type="button" class="gm-duzenle" data-gm-duzenle>Tercihlerim</button></div>
  </div>
  <div class="gm-kutular" data-gm-kutular></div>
  <div class="gm-liste" data-gm-liste></div>
  <p class="gm-son" data-gm-son></p>
</section>
<noscript><div class="bos">Benim Gündemim sayfası için tarayıcınızda JavaScript açık olmalı.</div></noscript>
</main>
<div class="gm-hikaye" data-gm-hikaye hidden role="dialog" aria-label="Hızlı oku">
  <div class="gm-cubuklar" data-gm-cubuklar></div>
  <button type="button" class="gm-kapat" data-gm-kapat aria-label="Kapat">✕</button>
  <div class="gm-sahne" data-gm-sahne></div>
  <button type="button" class="gm-gec geri" data-gm-geri aria-label="Önceki"></button>
  <button type="button" class="gm-gec ileri" data-gm-ileri aria-label="Sonraki"></button>
</div>
<script type="application/json" id="gm-veri">${JSON.stringify(veri).replace(/</g, '\\u003c')}</script>
<script src="/gundemim.js?v=${Math.floor(simdi / 36e5)}" defer></script>`;
  return sayfa({
    baslik: 'Benim Gündemim – sana özel Mersin haberleri',
    aciklama: "İlçeni ve ilgi alanlarını seç; Mersin'de bugün seni ilgilendiren gelişmeleri 2 dakikada öğren.",
    yol: '/gundemim/',
    ust: `<div class="su-an-bas"><div><h1>Benim Gündemim</h1><p style="margin-top:8px">Sana özel, kısa ve hızlı Mersin gündemi</p></div></div>`,
    icerik,
  });
}

// Ana sayfadaki davet kartı
export const gundemimKarti = () => `<a class="gm-davet" href="/gundemim/" data-gm-davet>
<span class="gm-davet-ikon" aria-hidden="true">⭐</span>
<span class="gm-davet-metin"><strong data-gm-davet-baslik>Benim Gündemim</strong><small data-gm-davet-alt>İlçeni ve ilgi alanlarını seç, seni ilgilendiren haberler 2 dakikada önünde olsun.</small></span>
<span class="gm-davet-ok" aria-hidden="true">→</span>
</a>`;
