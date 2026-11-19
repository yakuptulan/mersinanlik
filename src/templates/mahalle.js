// Mahalle sayfaları: /mahalle/<ilçe>/<mahalle>/
// Güncel ve geçmiş su kesintileri (MESKİ), mahalleden haberler, ilçenin nöbetçi eczaneleri ve hava durumu.
// İçeriği olmayan (kesinti ya da haber kaydı bulunmayan) sayfalar arama motorlarına kapalı tutulur.
import { htmlKacis as h, slugify } from '../lib/text.js';
import { sayfa, saat } from './layout.js';
import { haberYolu } from './parcalar.js';
import { ILCELER, SITE } from '../config.js';
import MAHALLELER from '../mahalleler.json' with { type: 'json' };

const TZ = 'Europe/Istanbul';
const BULUNMA = { akdeniz: 'de', anamur: 'da', aydincik: 'ta', bozyazi: 'da', camliyayla: 'da', erdemli: 'de', gulnar: 'da', mezitli: 'de', mut: 'ta', silifke: 'de', tarsus: 'ta', toroslar: 'da', yenisehir: 'de' };
export const sade = (s) => String(s).toLocaleLowerCase('tr-TR').replace(/mahallesi|mahalle|mah\.?|mh\.?/g, '').replace(/[^a-zçğıöşü0-9]/g, '');
export const mahalleYolu = (ilce, ad) => `/mahalle/${ilce}/${slugify(ad.toLocaleLowerCase('tr-TR'))}/`;
const tarihSaat = (t) => new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ });

// Tüm mahalleler: [{ ilce, ad, anahtar }]
export function mahalleListesi() {
  return Object.entries(MAHALLELER).flatMap(([ilce, adlar]) => adlar.map((ad) => ({ ilce, ad, anahtar: sade(ad) })));
}

// Haber metninde mahallenin adı "X Mahallesi / X mahallesinde / X Mah." biçiminde geçiyor mu?
function haberDeseni(ad) {
  const kacis = ad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
  return new RegExp(`(^|[^a-zçğıöşüA-ZÇĞİÖŞÜ])${kacis}\\s+(mahalle|mah\\.|mh\\.)`, 'i');
}

// Her mahalle için veriyi bir kez hazırla
export function mahalleVerisi({ servis, gecmis, haberler }) {
  const liste = mahalleListesi();
  const kesintiler = (gecmis?.kayitlar || []).map((k) => ({ ...k, anahtarlar: k.ilceler.flatMap((i) => i.mahalleler.map((m) => `${i.ilce}|${sade(m)}`)) }));
  const gorulen = new Set();
  const aktif = (servis?.suKesintisi?.liste || []).filter((k) => !k.bitis || new Date(k.bitis).getTime() > Date.now()).filter((k) => {
    const a = `${k.baslangic}|${k.aciklama}`;
    return gorulen.has(a) ? false : gorulen.add(a);
  });
  return liste.map((m) => {
    const anahtar = `${m.ilce}|${m.anahtar}`;
    const desen = haberDeseni(m.ad);
    const mk = kesintiler.filter((k) => k.anahtarlar.includes(anahtar)).sort((a, b) => new Date(b.baslangic) - new Date(a.baslangic));
    const ma = aktif.filter((k) => k.ilceler.some((i) => i.ilce === m.ilce && i.mahalleler.some((x) => sade(x) === m.anahtar)));
    const mh = haberler.filter((x) => (x.ilceler || []).includes(m.ilce) && desen.test(`${x.baslik} ${x.ozet || ''} ${x.metin || ''}`)).slice(0, 12);
    return { ...m, kesintiler: mk, aktif: ma, haberler: mh };
  });
}

export function mahalleSayfasi({ m, servis, kardesler }) {
  const ilce = ILCELER.find((i) => i.slug === m.ilce);
  const yol = mahalleYolu(m.ilce, m.ad);
  const hv = servis?.hava?.[m.ilce];
  const eczaneler = (servis?.eczane?.liste || []).filter((e) => e.ilce === m.ilce);
  const buradaki = eczaneler.filter((e) => sade(e.adres || '').includes(m.anahtar));
  const icerikVar = m.kesintiler.length || m.haberler.length;
  const baslik = `${m.ad} Mahallesi (${ilce.ad}) su kesintisi, haberler ve nöbetçi eczane`;
  const sonKesinti = m.kesintiler[0];
  const ozet = m.aktif.length
    ? `${m.ad} Mahallesi'nde şu an duyurulmuş bir su kesintisi var.`
    : sonKesinti
      ? `${m.ad} Mahallesi'nde kayıtlı son su kesintisi ${tarihSaat(sonKesinti.baslangic)} tarihinde başladı. Şu an duyurulmuş bir kesinti yok.`
      : `${m.ad} Mahallesi için şu an duyurulmuş bir su kesintisi yok.`;
  const kesintiSatir = (k) => `<div class="mh-kesinti"><span class="mh-tarih">${h(tarihSaat(k.baslangic))}${k.bitis ? ` → ${h(new Date(k.bitis).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }))}` : ''}</span><p>${h(k.aciklama)}</p></div>`;
  const icerik = `<main class="kap govde"><div class="ana">
<section class="mh-durum ${m.aktif.length ? 'var' : 'yok'}"><span class="mh-ikon">${m.aktif.length ? '🚱' : '💧'}</span><div><b>${m.aktif.length ? 'Şu an su kesintisi var' : 'Şu an duyurulmuş su kesintisi yok'}</b><p>${h(ozet)}</p></div></section>
${m.aktif.length ? `<div class="bolum-bas"><h2>Güncel kesinti</h2></div>${m.aktif.map((k) => kesintiSatir(k)).join('')}` : ''}
<div class="bolum-bas"><h2>${h(m.ad)} Mahallesi'nde geçmiş su kesintileri</h2><span>${m.kesintiler.length} kayıt</span></div>
${m.kesintiler.length ? m.kesintiler.slice(0, 15).map(kesintiSatir).join('') : `<div class="bos">Kayıtlarımızda bu mahalle için henüz su kesintisi yok. Kesintileri ${h(new Date(2026, 10, 19).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }))} tarihinden beri kaydediyoruz.</div>`}
<div class="bolum-bas"><h2>${h(m.ad)} Mahallesi'nden haberler</h2></div>
${m.haberler.length ? `<div class="ky-liste yol-liste">${m.haberler.map((x) => `<a class="ky-satir" href="${h(x.yol || haberYolu(x))}"><span>${h(x.baslik)}</span><small>${h(new Date(x.ilkGorulme).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: TZ }))}</small></a>`).join('')}</div>` : '<div class="bos">Bu mahalleyle ilgili son haber yok.</div>'}
<div class="bolum-bas"><h2>${h(ilce.ad)} nöbetçi eczaneleri</h2><a class="bolum-link" href="/nobetci-eczane/${m.ilce}/">Tümü →</a></div>
${eczaneler.length ? `<div class="ky-liste yol-liste">${[...buradaki, ...eczaneler.filter((e) => !buradaki.includes(e))].slice(0, 6).map((e) => `<a class="ky-satir" href="tel:${h(e.telefon || '')}"><span>${h(e.ad)}${buradaki.includes(e) ? ' <b class="yol-neden">Bu mahallede</b>' : ''}<br><small>${h(e.adres || '')}</small></span><small>${h(e.telefon || '')}</small></a>`).join('')}</div>` : '<div class="bos">Liste güncelleniyor.</div>'}
${kardesler.length ? `<details class="mh-diger"><summary>${h(ilce.ad)} ilçesinin diğer mahalleleri (${kardesler.length})</summary><div class="mh-liste">${kardesler.map((k) => `<a href="${mahalleYolu(k.ilce, k.ad)}">${h(k.ad)}</a>`).join('')}</div></details>` : ''}
<p style="color:var(--ikincil);font-size:14px">Kesinti bilgileri MESKİ duyurularından, nöbetçi eczaneler Mersin Eczacı Odası'ndan alınır. Arıza bildirimi için MESKİ: 185.</p>
</div>
<aside class="yan">
${hv ? `<a class="ky-kart" href="/hava-durumu/${m.ilce}/" style="--k:#3b82f6"><span>🌤</span><b>${h(ilce.ad)} ${hv.sicaklik}° · ${h(hv.durum)}</b><small>5 günlük tahmin →</small></a>` : ''}
<a class="ky-kart" href="/ilce/${m.ilce}/" style="--k:#2563eb"><span>📍</span><b>${h(ilce.ad)} haberleri</b><small>İlçenin tüm haberleri →</small></a>
<a class="ky-kart" href="/kesintiler/${m.ilce}/" style="--k:#0ea5e9"><span>💧</span><b>${h(ilce.ad)} kesintileri</b><small>İlçedeki tüm kesintiler →</small></a>
</aside></main>`;
  return sayfa({
    baslik,
    aciklama: `${m.ad} Mahallesi (${ilce.ad}, Mersin): ${ozet} Mahalleden haberler, geçmiş kesintiler ve nöbetçi eczaneler.`,
    yol,
    aktif: '/ilceler/',
    noindex: !icerikVar,
    jsonLd: { '@context': 'https://schema.org', '@type': 'Place', name: `${m.ad} Mahallesi`, containedInPlace: { '@type': 'AdministrativeArea', name: `${ilce.ad}, Mersin` }, url: SITE.url + yol },
    ust: `<div class="su-an-bas"><div><div class="cipler"><a class="cip" href="/ilce/${m.ilce}/">${h(ilce.ad)}</a><a class="cip" href="/mahalleler/${m.ilce}/">Mahalleler</a></div><h1>${h(m.ad)} Mahallesi</h1><p style="margin-top:8px">${h(ilce.ad)}, Mersin · su kesintisi, haberler, nöbetçi eczane</p></div></div>`,
    icerik,
  });
}

// İlçenin mahalle listesi: /mahalleler/<ilçe>/
export function mahallelerSayfasi({ ilce, liste }) {
  const bulunma = BULUNMA[ilce.slug] || 'de';
  return sayfa({
    baslik: `${ilce.ad} mahalleleri: su kesintisi ve mahalle haberleri`,
    aciklama: `${ilce.ad} (Mersin) ilçesinin ${liste.length} mahallesi: her mahalle için güncel su kesintisi, geçmiş kesintiler, haberler ve nöbetçi eczaneler.`,
    yol: `/mahalleler/${ilce.slug}/`,
    aktif: '/ilceler/',
    ust: `<div class="su-an-bas"><div><h1>${h(ilce.ad)} mahalleleri</h1><p style="margin-top:8px">${liste.length} mahalle · mahallenizi seçin</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<p class="giris-metni">${h(ilce.ad)}'${bulunma} su kesintisi olup olmadığını, mahallenizdeki son gelişmeleri ve nöbetçi eczaneleri görmek için mahallenizi seçin.</p>
<div class="mh-liste genis">${liste.map((m) => `<a href="${mahalleYolu(m.ilce, m.ad)}"${m.aktif.length ? ' class="kesintili"' : ''}>${h(m.ad)}${m.aktif.length ? ' <small>kesinti var</small>' : ''}</a>`).join('')}</div>
</div></main>`,
  });
}
