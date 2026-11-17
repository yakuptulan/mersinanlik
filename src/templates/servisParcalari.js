// Piyasa şeridi, namaz vakti ve akaryakıt kutuları (ana sayfa, ilçe sayfaları, servis sayfaları)
import { htmlKacis as h } from '../lib/text.js';
import { KALEMLER } from '../lib/piyasa.js';
import { DIYANET_ILCE, VAKITLER } from '../lib/namaz.js';
import { ikon } from './ikonlar.js';
import { SITE, ILCELER } from '../config.js';
import { BURCLAR } from '../lib/burc.js';
import { ulkeKodu } from '../lib/bayrak.js';
import fs from 'node:fs';

// Yan kutu başlığı: renkli bant, ikon, başlık ve "Tümü" bağlantısı
export function kutuBasligi({ ikon: ik = '', baslik, link = null, alt = null }) {
  return `<div class="kutu-bas kutu-bant"><span class="kb-ikon">${ik}</span><h2>${baslik}</h2>${link ? `<a href="${link}">Tümü <span aria-hidden="true">→</span></a>` : alt ? `<span class="kutu-alt">${alt}</span>` : ''}</div>`;
}

// Ülke bayrağı (indirilmişse) ya da takım rozeti (baş harfler)
export function bayrak(ad) {
  const kod = ulkeKodu(ad);
  if (kod && fs.existsSync(new URL(`../../public/bayrak/${kod}.png`, import.meta.url))) return `<img class="bayrak" src="/bayrak/${kod}.png" alt="" width="28" height="20" loading="lazy">`;
  return '';
}
export function takimRozeti(ad, mersin = false) {
  const harf = String(ad).split(/\s+/).filter((k) => /^[A-ZÇĞİÖŞÜ0-9]/.test(k)).slice(0, 2).map((k) => k[0]).join('') || '?';
  let n = 0;
  for (const c of String(ad)) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  const renk = mersin ? '#C8102E' : `hsl(${n % 360} 55% 42%)`;
  return `<span class="takim-rozet" style="--tr:${renk}">${h(harf)}</span>`;
}

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
${kutuBasligi({ ikon: ikon.hilal(18), baslik: 'Namaz vakitleri', link: `/namaz-vakitleri/${ilce ? `${slug}/` : ''}` })}
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
  return `<section class="kutu kutu-yakit">
${kutuBasligi({ ikon: ikon.yakit(18), baslik: 'Akaryakıt', link: '/akaryakit-fiyatlari/' })}
<div class="yakit-izgara">
<div><span class="yan-rozet yakit">${ikon.yakit(18)}</span><span><small>Benzin</small><b>${fmt(f.benzin)} ₺</b></span></div>
<div><span class="yan-rozet yakit">${ikon.yakit(18)}</span><span><small>Motorin</small><b>${fmt(f.motorin)} ₺</b></span></div>
${f.lpg ? `<div><span class="yan-rozet yakit lpg">${ikon.yakit(18)}</span><span><small>LPG</small><b>${fmt(f.lpg)} ₺</b></span></div>` : ''}
</div>
${not}<p class="kutu-not">Opet${f.lpg ? ', LPG Petrol Ofisi' : ''} · ${h(ilce && a?.ilceler?.[slug] ? ilce.ad : 'Mersin merkez')}</p>
</section>`;
}

// ---------- Spor ----------
const kisaTarih = (t) => new Date(`${t}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

export function sporKutusu(servis) {
  const sp = servis?.spor;
  const mersin = (sp?.ucuncuLig?.puan || []).filter((x) => x.mersin);
  const milli = sp?.milli?.maclar?.[0];
  if (!mersin.length && !milli) return '';
  const [evG, depG] = String(milli?.skor || '').split('-').map(Number);
  const trEv = milli && /türkiye/i.test(milli.ev);
  const sonuc = milli && Number.isFinite(evG) ? ((trEv ? evG - depG : depG - evG) > 0 ? 'G' : evG === depG ? 'B' : 'M') : null;
  return `<section class="kutu kutu-spor">
${kutuBasligi({ ikon: ikon.top ? ikon.top(18) : '⚽', baslik: 'Spor', link: '/spor/' })}
${milli ? `<a class="milli-kart" href="/spor/#milli">
<span class="milli-ust">A Milli Takım · ${h(milli.organizasyon)}</span>
<span class="milli-skor"><span class="milli-takim">${bayrak(milli.ev) || takimRozeti(milli.ev)}<b>${h(milli.ev)}</b></span><span class="milli-sonuc${sonuc ? ` s-${sonuc}` : ''}">${h(String(milli.skor || 'v').replace('-', ' – '))}</span><span class="milli-takim">${bayrak(milli.dep) || takimRozeti(milli.dep)}<b>${h(milli.dep)}</b></span></span>
<span class="milli-alt">${kisaTarih(milli.tarih)}${sonuc ? ` · ${sonuc === 'G' ? 'Galibiyet' : sonuc === 'B' ? 'Beraberlik' : 'Mağlubiyet'}` : ''}</span>
</a>` : ''}
<div class="yan-liste">
${mersin.map((t) => `<a class="yan-satir takim-satir" href="/spor/#mersin">${takimRozeti(t.takim, true)}<span class="yan-metin"><b>${h(t.takim)}</b><small>3. Lig 3. Grup · ${t.sira}. sırada · ${t.o} maç</small></span><span class="yan-sag puan-rozet"><b>${t.p}</b><small>puan</small></span></a>`).join('')}
</div>
</section>`;
}

export function puanTablosu(puan, { kisa = false } = {}) {
  return `<div class="tablo-kap"><table class="tablo tablo-puan"><thead><tr><th>#</th><th>Takım</th><th>O</th>${kisa ? '' : '<th>G</th><th>B</th><th>M</th><th>AV</th>'}<th>P</th></tr></thead><tbody>${puan
    .map((t) => `<tr${t.mersin ? ' class="mersin"' : ''}><td>${t.sira}</td><th scope="row">${h(t.takim)}</th><td>${t.o}</td>${kisa ? '' : `<td>${t.g}</td><td>${t.b}</td><td>${t.m}</td><td>${t.av > 0 ? '+' : ''}${t.av}</td>`}<td><strong>${t.p}</strong></td></tr>`)
    .join('')}</tbody></table></div>`;
}

export function macListesi(maclar) {
  return `<div class="mac-liste">${maclar
    .map((m) => `<div class="mac${m.mersin ? ' mersin' : ''}"><span class="mac-zaman">${kisaTarih(m.tarih)}${m.saat ? ` · ${m.saat}` : ''}</span><span class="mac-ev">${h(m.ev)} ${bayrak(m.ev)}</span><span class="mac-skor${m.skor ? '' : ' bos'}">${m.skor ? h(m.skor.replace('-', ' - ')) : 'v'}</span><span class="mac-dep">${bayrak(m.dep)} ${h(m.dep)}</span></div>`)
    .join('')}</div>`;
}

// ---------- Etkinlikler ----------
const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export function etkinlikKarti(e) {
  const [y, a, g] = (e.tarih || '').split('-');
  return `<a class="etkinlik" href="${h(e.link)}" rel="noopener" target="_blank">
<span class="etkinlik-gorsel">${e.foto ? `<img src="/etkinlik/${h(e.foto)}" alt="" loading="lazy" width="600" height="600">` : ''}${e.tarih ? `<span class="etkinlik-tarih"><b>${Number(g)}</b>${AY_KISA[Number(a) - 1]}</span>` : ''}</span>
<span class="etkinlik-ic"><b>${h(e.baslik)}</b><small>${[e.tarih ? new Date(`${e.tarih}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'long' }) : null, e.saat, e.yer].filter(Boolean).map(h).join(' · ') || 'Ayrıntılar duyuruda'}</small></span>
</a>`;
}

// ---------- Meteorolojik uyarı bandı ----------
const RENK_AD = { yellow: 'Sarı kod', orange: 'Turuncu kod', red: 'Kırmızı kod' };
export function meteoBandi(servis, ilceSlug = null) {
  const liste = (servis?.meteo?.uyarilar || []).filter((u) => !ilceSlug || u.ilceler.includes(ilceSlug));
  if (!liste.length) {
    // MGM verisi yoksa: uyarı haberini göster
    const x = servis?.meteoHaber;
    if (!x || (ilceSlug && x.ilceler.length && !x.ilceler.includes(ilceSlug))) return '';
    return `<a class="meteo-bandi yellow" href="${h(x.kaynaklar[0].link)}" rel="noopener nofollow" target="_blank">
<span class="meteo-rozet">⚠ Hava uyarısı</span>
<span class="meteo-metin"><b>${h(x.baslik)}</b> <span>Kaynak: ${h(x.kaynaklar[0].ad)}</span></span>
<span class="meteo-kaynak">Haberi oku →</span></a>`;
  }
  const sira = { red: 0, orange: 1, yellow: 2 };
  const u = [...liste].sort((a, b) => sira[a.renk] - sira[b.renk] || (a.gun === 'bugun' ? -1 : 1))[0];
  const adlar = u.ilceler.map((s) => ILCELER.find((i) => i.slug === s)?.ad).filter(Boolean);
  const yer = adlar.length >= 10 ? 'Mersin geneli' : adlar.join(', ');
  return `<a class="meteo-bandi ${u.renk}" href="https://www.mgm.gov.tr/meteouyari/turkiye.aspx${u.gun === 'yarin' ? '?Gun=2' : ''}" rel="noopener" target="_blank">
<span class="meteo-rozet">⚠ ${RENK_AD[u.renk]}</span>
<span class="meteo-metin"><b>${u.gun === 'bugun' ? 'Bugün' : 'Yarın'} · ${h(u.hadiseler.join(', ') || 'Meteorolojik uyarı')}</b> <span>${h(yer)}${u.metin ? ` — ${h(u.metin.slice(0, 160))}${u.metin.length > 160 ? '…' : ''}` : ''}</span></span>
<span class="meteo-kaynak">MGM →</span></a>`;
}

// ---------- Burçlar ----------
export function burcKutusu(servis) {
  if (!servis?.burc?.yorumlar) return '';
  return `<section class="kutu kutu-burc">
${kutuBasligi({ ikon: '✦', baslik: 'Günlük burçlar', link: '/burclar/' })}
<div class="burc-izgara">${BURCLAR.map(([slug, ad, , isaret]) => `<a href="/burclar/#${slug}"><span>${isaret}</span>${h(ad)}</a>`).join('')}</div>
</section>`;
}

// ---------- Mersin sayaçları ----------
// Nüfus: TÜİK ADNKS 2025 (31.12.2025) Mersin 1.956.428 (2024: 1.954.279), Türkiye 86.092.168 (yıllık +427.224)
export const NUFUS = { mersin: 1956428, mersinArtis: 1956428 - 1954279, turkiye: 86092168, turkiyeArtis: 427224, tarih: '2025-12-31T21:00:00Z' };

function dakikaFarki(a, b) {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}

export function sayaclarBlogu(servis, { tatiller = [], simdi = Date.now() } = {}) {
  const sy = servis?.sayac || {};
  const v = bugunVakit(servis, 'yenisehir', simdi);
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: SITE.timezone });
  const tatil = tatiller.filter(([t]) => t > bugun).sort((a, b) => (a[0] < b[0] ? -1 : 1))[0];
  const yil = Number(bugun.slice(0, 4)) + 1;
  const deniz = sy.deniz?.sicaklik;
  const aqi = sy.hava?.aqi;
  const aqiAd = aqi == null ? null : aqi <= 20 ? ['Çok iyi', '#10b981'] : aqi <= 40 ? ['İyi', '#84cc16'] : aqi <= 60 ? ['Orta', '#eab308'] : aqi <= 80 ? ['Kötü', '#f97316'] : aqi <= 100 ? ['Çok kötü', '#ef4444'] : ['Aşırı kötü', '#a21caf'];
  const gun = v ? dakikaFarki(v.gunes, v.aksam) : null;
  const kart = (renk, ikonu, etiket, deger, alt, ek = '') => `<div class="sayac" style="--s:${renk}"${ek}><span class="sayac-ikon">${ikonu}</span><span class="sayac-etiket">${etiket}</span><b class="sayac-deger">${deger}</b><span class="sayac-alt">${alt}</span></div>`;
  return `<section class="sayaclar-blok"><div class="bolum-bas"><h2>Mersin sayaçları</h2><span>Canlı · tahminler dahil</span></div>
<div class="sayaclar">
${kart('#1e66f5', '👥', 'Mersin nüfusu (tahmini)', `<span data-nufus data-taban="${NUFUS.mersin}" data-artis="${NUFUS.mersinArtis}" data-tarih="${NUFUS.tarih}">${fmt(NUFUS.mersin, 0)}</span>`, `Türkiye: <span data-nufus data-taban="${NUFUS.turkiye}" data-artis="${NUFUS.turkiyeArtis}" data-tarih="${NUFUS.tarih}">${fmt(NUFUS.turkiye, 0)}</span> · TÜİK 2025 verisinden`)}
${deniz != null ? kart('#0ea5e9', '🌊', 'Deniz suyu sıcaklığı', `<span data-sayi-hedef="${deniz}" data-ondalik="1">${fmt(deniz, 1)}</span>°C`, `${deniz >= 24 ? 'Yüzmeye çok uygun' : deniz >= 21 ? 'Serin ama yüzülür' : 'Soğuk, kısa yüzme'}${sy.deniz?.dalga != null ? ` · dalga ${fmt(sy.deniz.dalga, 1)} m` : ''} · Mersin açıkları`) : ''}
${aqiAd ? kart(aqiAd[1], '🍃', 'Hava kalitesi', `${aqiAd[0]}`, `Endeks ${Math.round(aqi)}${sy.hava?.pm25 != null ? ` · PM2,5: ${fmt(sy.hava.pm25, 0)} µg/m³` : ''}${sy.hava?.uvMax != null ? ` · UV en fazla ${fmt(sy.hava.uvMax, 0)}` : ''}`) : ''}
${kart('#8e4ec6', '🎉', `${yil} yılbaşına`, `<span data-geri-sayim="${yil}-01-01T00:00:00+03:00">–</span>`, 'gün · saat · dakika · saniye')}
</div></section>`;
}

// ---------- Lig tablosu (rozet, form) ----------
export function ligSerit(kayit) {
  return `<div class="lig-serit">${kayit.puan.map((t) => `<span class="ls-takim${t.mersin ? ' mersin' : ''}" title="${h(t.takim)}">${takimRozeti(t.takim, t.mersin)}<b>${t.p}</b></span>`).join('')}</div>`;
}
export function ligTablosu(kayit) {
  const formVar = kayit.form && Object.values(kayit.form).some((f) => f.length);
  return `<div class="tablo-kap"><table class="tablo lig-tablo"><thead><tr><th>#</th><th>Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>Av</th><th>P</th>${formVar ? '<th class="form-bas">Form</th>' : ''}</tr></thead><tbody>${kayit.puan
    .map((t) => `<tr${t.mersin ? ' class="mersin"' : ''}><td>${t.sira}</td><th scope="row"><span class="lt-takim">${takimRozeti(t.takim, t.mersin)}${h(t.takim)}</span></th><td>${t.o}</td><td>${t.g}</td><td>${t.b}</td><td>${t.m}</td><td>${t.av > 0 ? '+' : ''}${t.av}</td><td><strong>${t.p}</strong></td>${formVar ? `<td class="form">${(kayit.form[t.takim] || []).map((f) => `<i class="f-${f}">${f}</i>`).join('')}</td>` : ''}</tr>`)
    .join('')}</tbody></table></div>${formVar ? '<p class="form-not"><i class="f-G">G</i> galibiyet <i class="f-B">B</i> beraberlik <i class="f-M">M</i> mağlubiyet · son 5 maç, soldan sağa eskiden yeniye</p>' : ''}`;
}
