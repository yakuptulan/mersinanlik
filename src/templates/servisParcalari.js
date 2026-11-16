// Piyasa şeridi, namaz vakti ve akaryakıt kutuları (ana sayfa, ilçe sayfaları, servis sayfaları)
import { htmlKacis as h } from '../lib/text.js';
import { KALEMLER } from '../lib/piyasa.js';
import { DIYANET_ILCE, VAKITLER } from '../lib/namaz.js';
import { ikon } from './ikonlar.js';
import { SITE } from '../config.js';

// Gösterimde ondalık sayısı
export const ONDALIK = { gram: 2, ceyrek: 0, gumus: 2, usd: 2, eur: 2, btc: 0, bist: 0 };

export function fmt(n, ondalik = 2) {
  if (n == null || Number.isNaN(Number(n))) return '–';
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: ondalik, maximumFractionDigits: ondalik });
}

export function yon(degisim) {
  const d = Number(degisim) || 0;
  const sinif = d > 0 ? 'yukari' : d < 0 ? 'asagi' : 'sabit';
  const ok = d > 0 ? '▲' : d < 0 ? '▼' : '■';
  return `<span class="p-yon ${sinif}" data-p-yon>${ok} %${fmt(Math.abs(d), 2)}</span>`;
}

export function piyasaSeridi(piyasa) {
  const k = piyasa?.kalemler || {};
  const ogeler = KALEMLER.filter((x) => k[x.kod]);
  if (!ogeler.length) return '';
  return `<section class="piyasa-serit" aria-label="Piyasalar">
${ogeler
  .map((x) => `<a class="piyasa" href="/piyasalar/#${x.kod}" data-piyasa="${x.kod}"><span class="p-ad">${h(x.ad)}</span><b class="p-deger" data-p-deger>${fmt(k[x.kod].satis, ONDALIK[x.kod])}${x.kod === 'bist' ? '' : ' ₺'}</b>${yon(k[x.kod].degisim)}</a>`)
  .join('\n')}
</section>`;
}

const bugunTarih = (simdi) => new Date(simdi).toLocaleDateString('sv-SE', { timeZone: SITE.timezone });

// Bölgenin bugünkü vakitleri
export function bugunVakit(servis, slug, simdi = Date.now()) {
  const bolge = servis?.namaz?.bolgeler?.[DIYANET_ILCE[slug] || DIYANET_ILCE.yenisehir] || [];
  return bolge.find((v) => v.tarih === bugunTarih(simdi)) || null;
}

// Tarayıcıya: her bölge için bugün ve yarın (sonraki vakti ve geri sayımı hesaplamak için)
export function namazVerisi(servis, simdi = Date.now()) {
  const bugun = bugunTarih(simdi);
  const bolgeler = Object.fromEntries(
    Object.entries(servis?.namaz?.bolgeler || {}).map(([id, liste]) => [id, liste.filter((v) => v.tarih >= bugun).slice(0, 2).map(({ hicri, ...v }) => v)])
  );
  return { ilce: DIYANET_ILCE, bolgeler };
}

export function namazKutusu(servis, ilce = null, simdi = Date.now()) {
  const slug = ilce?.slug || 'yenisehir';
  const v = bugunVakit(servis, slug, simdi);
  if (!v) return '';
  const yer = ilce && !['akdeniz', 'mezitli', 'toroslar', 'yenisehir'].includes(slug) ? ilce.ad : 'Mersin merkez';
  return `<section class="kutu namaz-kutu" data-namaz${ilce ? ` data-namaz-sabit="${slug}"` : ''}>
<div class="kutu-bas"><h2>Namaz vakitleri</h2><a href="/namaz-vakitleri/${ilce ? `${slug}/` : ''}">Tümü</a></div>
<div class="namaz-sonraki">${ikon.hilal(20)}<span><small data-namaz-yer>${h(yer)}</small><b data-namaz-sonraki>Bugünün vakitleri</b></span></div>
<div class="namaz-izgara">${VAKITLER.map(([k, ad]) => `<div data-vakit="${k}"><small>${ad}</small><b>${h(v[k])}</b></div>`).join('')}</div>
<script type="application/json" data-namaz-veri>${JSON.stringify(namazVerisi(servis, simdi)).replace(/</g, '\\u003c')}</script>
</section>`;
}

export function akaryakitKutusu(servis, ilce = null) {
  const a = servis?.akaryakit;
  const slug = ilce?.slug || 'akdeniz';
  const f = a?.ilceler?.[slug] || a?.ilceler?.akdeniz;
  if (!f) return '';
  let not = '';
  if (a.onceki && a.degisim && Date.now() - new Date(a.degisim).getTime() < 4 * 864e5) {
    const m = a.ilceler.akdeniz || f;
    const fark = (y, e) => (y != null && e != null && y !== e ? `${y > e ? '+' : '−'}${fmt(Math.abs(y - e), 2)} ₺` : null);
    const parca = [fark(m.benzin, a.onceki.benzin) && `benzin ${fark(m.benzin, a.onceki.benzin)}`, fark(m.motorin, a.onceki.motorin) && `motorin ${fark(m.motorin, a.onceki.motorin)}`].filter(Boolean);
    if (parca.length) not = `<p class="kutu-not">Son değişiklik: ${parca.join(', ')}</p>`;
  }
  return `<section class="kutu">
<div class="kutu-bas"><h2>Akaryakıt</h2><a href="/akaryakit-fiyatlari/">Tümü</a></div>
<div class="yakit-izgara">
<div><span class="yan-rozet yakit">${ikon.yakit(18)}</span><span><small>Benzin</small><b>${fmt(f.benzin)} ₺</b></span></div>
<div><span class="yan-rozet yakit">${ikon.yakit(18)}</span><span><small>Motorin</small><b>${fmt(f.motorin)} ₺</b></span></div>
</div>
${not}<p class="kutu-not">Opet pompa fiyatı · ${h(ilce && a?.ilceler?.[slug] ? ilce.ad : 'Mersin merkez')}</p>
</section>`;
}
