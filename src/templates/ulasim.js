// Ulaşım sayfası: Çukurova Havalimanı uçuşları (canlıya yakın), tren ve feribot bilgisi
import { SITE } from '../config.js';
import { htmlKacis as h } from '../lib/text.js';
import { sayfa, saat } from './layout.js';
import { ikon } from './ikonlar.js';
import { yanKutular } from './sayfalar.js';
import { UCUS_KAYNAK } from '../lib/ucus.js';

const HAVALIMANI_SITE = 'https://www.cukurovaairport.aero/';
const AKGUNLER = 'https://www.akgunler.com.tr/';
const TCDD = 'https://www.tcddtasimacilik.gov.tr/';

const gunSaat = (iso, simdi) => {
  const d = new Date(iso);
  const gun = d.toLocaleDateString('sv-SE', { timeZone: SITE.timezone });
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: SITE.timezone });
  const s = d.toLocaleTimeString('tr-TR', { timeZone: SITE.timezone, hour: '2-digit', minute: '2-digit' });
  return gun === bugun ? s : `${s} <small>yarın</small>`;
};

function durumRozeti(u) {
  const d = (u.durum || '').toLocaleUpperCase('tr-TR');
  if (/İPTAL/.test(d)) return '<span class="ucus-durum iptal">İptal</span>';
  if (/RÖTAR|GECİK/.test(d) || u.tahmini) return `<span class="ucus-durum gecikme">${u.tahmini ? `Yeni saat ${new Date(u.tahmini).toLocaleTimeString('tr-TR', { timeZone: SITE.timezone, hour: '2-digit', minute: '2-digit' })}` : 'Rötarlı'}</span>`;
  if (/İNDİ|KALKTI|UÇTU/.test(d)) return `<span class="ucus-durum tamam">${h(d.charAt(0) + d.slice(1).toLocaleLowerCase('tr-TR'))}</span>`;
  if (/KAPI|BİNİŞ|SON ÇAĞRI/.test(d)) return `<span class="ucus-durum binis">${h(d.charAt(0) + d.slice(1).toLocaleLowerCase('tr-TR'))}</span>`;
  if (/KONTUAR AÇIK/.test(d)) return '<span class="ucus-durum acik">Kontuar açık</span>';
  if (/KONTUAR KAPALI/.test(d)) return '<span class="ucus-durum">Kontuar kapalı</span>';
  return d ? `<span class="ucus-durum">${h(d.charAt(0) + d.slice(1).toLocaleLowerCase('tr-TR'))}</span>` : '<span class="ucus-durum sessiz">Planlı</span>';
}

function ucusTablosu(liste, yon, simdi) {
  if (!liste?.length) return '<div class="bos">Önümüzdeki 24 saatte listelenmiş uçuş yok.</div>';
  return `<div class="tablo-kap"><table class="tablo tablo-ucus"><thead><tr><th>Saat</th><th>${yon === 'giden' ? 'Nereye' : 'Nereden'}</th><th>Uçuş</th>${yon === 'giden' ? '<th>Kapı</th>' : ''}<th>Durum</th></tr></thead><tbody>${liste
    .slice(0, 40)
    .map(
      (u) => `<tr${u.hat === 'dis' ? ' class="dis-hat"' : ''}><td class="ucus-saat"><strong>${gunSaat(u.planlanan, simdi)}</strong></td><td><strong>${h(u.yer)}</strong>${u.hat === 'dis' ? ' <small class="hat-etiket">Dış hat</small>' : ''}</td><td>${h(u.no.join(' / '))}<br><small>${h(u.havayolu)}</small></td>${yon === 'giden' ? `<td>${u.kapi ? h(u.kapi) : '–'}</td>` : ''}<td>${durumRozeti(u)}</td></tr>`
    )
    .join('')}</tbody></table></div>`;
}

export function ulasimSayfasi({ servis, simdi }) {
  const u = servis?.ucus;
  const giden = u?.giden || [];
  const gelen = u?.gelen || [];
  const siradaki = giden.find((x) => new Date(x.tahmini || x.planlanan).getTime() > simdi);
  const icerik = `<main class="kap govde"><div class="ana">
<section id="ucuslar">
<div class="bolum-bas"><h2>${ikon.ok(20)} Çukurova Havalimanı – giden uçuşlar</h2><span>${giden.length} uçuş</span></div>
${ucusTablosu(giden, 'giden', simdi)}
<div class="bolum-bas" style="margin-top:30px"><h2>Gelen uçuşlar</h2><span>${gelen.length} uçuş</span></div>
${ucusTablosu(gelen, 'gelen', simdi)}
<p class="not">Kaynak: <a href="${UCUS_KAYNAK}" rel="noopener" target="_blank">Çukurova Uluslararası Havalimanı</a>${u?.guncelleme ? ` · Son güncelleme: ${saat(u.guncelleme)}` : ''}. Bilgiler yarım saatte bir yenilenir; uçuşunuzu havayolu şirketinden de kontrol edin.</p>
</section>

<div class="ulasim-kartlar">
<article class="ulasim-kart">
<h3>✈️ Çukurova Havalimanı</h3>
<p>Tarsus sınırlarında, Mersin ve Adana'ya hizmet veren bölge havalimanı (kod: COV).</p>
<p><a class="hap" href="tel:+903245030000">Ara: 0324 503 00 00</a></p>
<p><a href="${HAVALIMANI_SITE}" rel="noopener" target="_blank">Havalimanının resmî sitesi →</a></p>
</article>
<article class="ulasim-kart">
<h3>🚆 Mersin–Adana treni</h3>
<p>Mersin–Adana bölgesel tren seferleri, hızlı tren hattı çalışmaları nedeniyle <strong>22 Nisan 2024'ten beri durdurulmuş</strong> durumda. Ulaştırma Bakanlığı Mersin–Adana bölümünün 2027'de tamamlanmasını hedefliyor.</p>
<p><a href="${TCDD}" rel="noopener" target="_blank">TCDD Taşımacılık duyuruları →</a></p>
</article>
<article class="ulasim-kart">
<h3>⛴️ Taşucu–Girne feribotu</h3>
<p>Silifke Taşucu Limanı'ndan Kuzey Kıbrıs Girne'ye yolcu ve araçlı seferler yapılıyor; hızlı feribotla yolculuk yaklaşık 2,5 saat sürüyor. Sefer saatleri sezona göre değiştiği için bilet almadan önce firmadan teyit edin.</p>
<p><a href="${AKGUNLER}" rel="noopener" target="_blank">Akgünler Denizcilik →</a></p>
</article>
</div>
</div>${yanKutular(servis)}</main>`;
  return sayfa({
    baslik: 'Mersin ulaşım – Çukurova Havalimanı uçuşları, tren ve feribot',
    aciklama: `Çukurova Havalimanı bugünkü giden ve gelen uçuşlar${siradaki ? ` (sıradaki: ${siradaki.yer})` : ''}, Mersin–Adana treni durumu ve Taşucu–Girne feribotu bilgileri.`,
    yol: '/ulasim/',
    ust: `<div class="su-an-bas"><div><h1>Ulaşım</h1><p style="margin-top:8px">Çukurova Havalimanı uçuşları · tren · feribot</p></div></div>${
      siradaki ? `<div class="ulasim-siradaki">${ikon.ok(18)} Sıradaki kalkış: <strong>${gunSaat(siradaki.tahmini || siradaki.planlanan, simdi)}</strong> ${h(siradaki.yer)} <small>(${h(siradaki.no[0])})</small></div>` : ''
    }`,
    icerik,
  });
}
