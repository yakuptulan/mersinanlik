// Spor sayfaları: /spor/ ana sayfası ve spor sayfalarına özel yan sütun
import { htmlKacis as h, slugify as _slug } from '../lib/text.js';
import { kareKart, haberListesi, reklamAlani, haberYolu, kapakAdresi } from './parcalar.js';
import { kutuBasligi, takimRozeti, takimLogosu, ligTablosu, ligSerit, macListesi, bugununMaclari, KISA_TAKIM } from './servisParcalari.js';
import { LIGLER, mersinMi } from '../lib/spor.js';

const TZ = 'Europe/Istanbul';
const gunStr = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: TZ });
const kisaGun = (tarih) => new Date(`${tarih}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short', timeZone: TZ });

// Gerçekten spor olan haberler (kategori etiketi bazen yanlış düşebiliyor)
const SPOR = /\b(maç|maçı|maçta|spor|gol|lig|ligi|ligde|takım|şampiyon|futbol|basketbol|voleybol|hentbol|teknik direktör|transfer|sporcu|turnuva|madalya|maraton|antrenör|galibiyet|mağlubiyet|beraber|puan|kulüp|tenis|yüzücü|yüzme|güreş|halter|atletizm|derbi|karate|tekvando|boks|kupa|10K|olimpiyat|milli takım|fikstür|deplasman|stat)/i;
const SIYASI = /\b(CHP|AK Parti|AKP|MHP|DEM Parti|İYİ Parti|teşkilat|işsizlik|enflasyon|seçim|milletvekili)\b/i;
export const sporMu = (x) => x.kategori === 'spor' && SPOR.test(x.baslik) && !SIYASI.test(x.baslik);

function goreliZaman(tarih, saat, simdi) {
  const bugun = gunStr(simdi);
  const gun = Math.round((new Date(`${tarih}T12:00:00+03:00`) - new Date(`${bugun}T12:00:00+03:00`)) / 864e5);
  if (gun === 0) return `Bugün${saat ? ` ${saat}` : ''}`;
  if (gun === 1) return `Yarın${saat ? ` ${saat}` : ''}`;
  return `${gun} gün sonra · ${kisaGun(tarih)}${saat ? ` ${saat}` : ''}`;
}

// Mersin takımları: lig sırası, form, son maç ve sıradaki maç
export function mersinTakimlari(servis, simdi = Date.now()) {
  const L = servis?.spor?.ligler || {};
  const bugun = gunStr(simdi);
  const liste = [];
  for (const lig of LIGLER) {
    const l = L[lig.kod];
    if (!l) continue;
    for (const t of (l.puan || []).filter((x) => x.mersin)) {
      const benim = (m) => m.ev === t.takim || m.dep === t.takim;
      const hafta = Object.keys(l.haftalar || {}).map(Number).sort((a, b) => b - a);
      let son = null;
      for (const n of hafta) {
        const m = (l.haftalar[n] || []).find((x) => benim(x) && x.skor);
        if (m) { son = { ...m, hafta: n }; break; }
      }
      const siradaki = (l.maclar || []).filter((m) => benim(m) && !m.skor && m.tarih >= bugun).sort((a, b) => (a.tarih + (a.saat || '')).localeCompare(b.tarih + (b.saat || '')))[0] || null;
      liste.push({ ...t, lig: l.kisa, kod: lig.kod, ligSayisi: l.puan.length, form: l.form?.[t.takim] || [], son, siradaki });
    }
  }
  return liste;
}

function sonuc(m, takim) {
  const [e, d] = m.skor.split('-').map(Number);
  const f = m.ev === takim ? e - d : d - e;
  return f > 0 ? 'G' : f === 0 ? 'B' : 'M';
}

function takimKarti(t, simdi) {
  const rakip = (m) => (m.ev === t.takim ? m.dep : m.ev);
  const sr = t.son ? sonuc(t.son, t.takim) : null;
  return `<article class="mt-kart">
<a class="mt-ust" href="/spor/${t.kod}/">
  <span class="mt-logo">${takimRozeti(t.takim, true)}</span>
  <span class="mt-ad"><b>${h(t.takim)}</b><small>${h(t.lig)}</small></span>
  <span class="mt-sira"><b>${t.sira}.</b><small>${t.p} puan</small></span>
</a>
<div class="mt-istat"><span><b>${t.o}</b>maç</span><span><b>${t.g}</b>galibiyet</span><span><b>${t.b}</b>beraberlik</span><span><b>${t.m}</b>mağlubiyet</span><span><b>${t.a}:${t.y}</b>gol</span></div>
${t.form.length ? `<div class="mt-form"><small>Son ${t.form.length} maç</small>${t.form.map((f) => `<i class="f-${f}">${f}</i>`).join('')}</div>` : ''}
<div class="mt-maclar">
${t.son ? `<div class="mt-mac"><small>Son maç${t.son.hafta ? ` · ${t.son.hafta}. hafta` : ''}</small><span class="mt-skor"><span>${takimLogosu(t.son.ev)}${h(t.son.ev)}</span><b class="s-${sr}">${h(t.son.skor.replace('-', ' – '))}</b><span>${h(t.son.dep)}${takimLogosu(t.son.dep)}</span></span></div>` : ''}
${t.siradaki ? `<div class="mt-mac sonraki"><small>Sıradaki maç · ${h(goreliZaman(t.siradaki.tarih, t.siradaki.saat, simdi))}</small><span class="mt-skor"><span>${takimLogosu(t.siradaki.ev)}${h(t.siradaki.ev)}</span><b>v</b><span>${h(t.siradaki.dep)}${takimLogosu(t.siradaki.dep)}</span></span><em>${t.siradaki.ev === t.takim ? 'İç saha' : `Deplasman · rakip ${h(rakip(t.siradaki))}`}</em></div>` : ''}
</div>
</article>`;
}

// Kısa puan tablosu (yan sütun)
function miniTablo(l, adet = 8) {
  if (!l?.puan?.length) return '';
  return `<table class="mini-tablo"><tbody>${l.puan
    .slice(0, adet)
    .map((t) => `<tr${t.mersin ? ' class="mersin"' : ''}><td>${t.sira}</td><th scope="row">${takimRozeti(t.takim, t.mersin)}<span>${h(t.takim)}</span></th><td>${t.o}</td><td><b>${t.p}</b></td></tr>`)
    .join('')}</tbody></table>`;
}

// Spor sayfalarının yan sütunu: genel kutular yerine spora dair her şey
export function sporYan(servis, hikayeler = [], simdi = Date.now()) {
  const L = servis?.spor?.ligler || {};
  const bugun = bugununMaclari(servis, simdi);
  const sl = L['super-lig'];
  const m3 = L['3-lig-3'];
  const sporHaber = hikayeler.filter(sporMu).filter((x) => simdi - new Date(x.ilkGorulme).getTime() < 72 * 36e5);
  const cokKonusulan = [...sporHaber].sort((a, b) => new Set(b.kaynaklar.map((k) => k.ad)).size - new Set(a.kaynaklar.map((k) => k.ad)).size || new Date(b.ilkGorulme) - new Date(a.ilkGorulme)).slice(0, 5);
  // Yaklaşan Süper Lig maçları (bugün yoksa)
  const yakin = (sl?.maclar || []).filter((m) => !m.skor && m.tarih >= gunStr(simdi)).slice(0, 5);
  return `<aside class="yan spor-yan">
${sl ? `<section class="kutu kutu-spor kutu-sl">${kutuBasligi({ ikon: '🏆', baslik: 'Süper Lig puan durumu', link: '/spor/super-lig/' })}${miniTablo(sl, 10)}<a class="sy-tum" href="/spor/super-lig/">Tüm tablo ve fikstür →</a></section>` : ''}
${reklamAlani('yan-ust')}
${bugun.length ? `<section class="kutu kutu-spor">${kutuBasligi({ ikon: '⚽', baslik: 'Bugünün maçları', alt: bugun.some((m) => m.durum === 'oynaniyor') ? '<span class="canli-nokta"></span> canlı' : null })}
<div class="sy-maclar">${bugun.slice(0, 8).map((m) => `<a class="sy-mac${m.mersin ? ' mersin' : ''}" href="/spor/${m.kod}/"><span class="sy-takim"><span class="sy-ad">${h(m.ev)}</span>${takimRozeti(m.ev, m.mersin)}</span><span class="sy-orta ${m.durum}">${m.durum === 'baslamadi' ? h(m.saat || '–') : h(String(m.skor || '0-0').replace('-', ' – '))}<small>${m.durum === 'oynaniyor' ? 'oynanıyor' : m.durum === 'bitti' ? 'MS' : h(m.lig)}</small></span><span class="sy-takim dep">${takimRozeti(m.dep, m.mersin)}<span class="sy-ad">${h(m.dep)}</span></span></a>`).join('')}</div></section>`
    : yakin.length ? `<section class="kutu kutu-spor">${kutuBasligi({ ikon: '⚽', baslik: 'Süper Lig: yaklaşan maçlar', link: '/spor/super-lig/' })}
<div class="sy-maclar">${yakin.map((m) => `<a class="sy-mac" href="/spor/super-lig/"><span class="sy-takim"><span class="sy-ad">${h(m.ev)}</span>${takimRozeti(m.ev)}</span><span class="sy-orta baslamadi">${h(m.saat || '–')}<small>${h(kisaGun(m.tarih))}</small></span><span class="sy-takim dep">${takimRozeti(m.dep)}<span class="sy-ad">${h(m.dep)}</span></span></a>`).join('')}</div></section>` : ''}
${m3 ? `<section class="kutu kutu-spor">${kutuBasligi({ ikon: '🏆', baslik: '3. Lig 3. Grup', link: '/spor/3-lig-3/' })}${miniTablo(m3, 18)}</section>` : ''}
${cokKonusulan.length >= 3 ? `<section class="kutu kutu-spor">${kutuBasligi({ ikon: '🔥', baslik: 'Sporda çok konuşulanlar' })}<ol class="sy-haberler">${cokKonusulan.map((x, i) => `<li><a href="${h(haberYolu(x))}"><span class="ok-no">${i + 1}</span><img src="${h(kapakAdresi(x).src)}" alt="" width="64" height="48" loading="lazy"><span>${h(x.baslik)}</span></a></li>`).join('')}</ol></section>` : ''}
<section class="kutu kutu-spor">${kutuBasligi({ ikon: '📋', baslik: 'Ligler' })}<div class="sy-ligler">${LIGLER.filter((l) => L[l.kod]).map((l) => `<a href="/spor/${l.kod}/">${h(l.kisa)}${l.mersin ? ' <small>Mersin</small>' : ''}</a>`).join('')}</div></section>
${reklamAlani('yan-alt')}
</aside>`;
}

// Süper Lig haberleri: spor haberlerinden başlığında Süper Lig takımı geçenler
const SL_DUR = new Set(['fk', 'sk', 'as', 'a.ş.', 'sportif', 'faaliyetler', 'futbol', 'kulübü', 'istanbul', 'tümosan', 'corendon', 'metro', 'holding', 'çaykur', 'arca', 'zecorner', 'ikas', 'hesap.com', 'bitexen']);
function slAnahtarlar(sl) {
  return (sl?.puan || [])
    .map((t) => t.takim.split(/\s+/).filter((k) => !SL_DUR.has(k.toLocaleLowerCase('tr-TR')) && k.length >= 4).sort((a, b) => b.length - a.length)[0] || t.takim.split(/\s+/)[0])
    .filter(Boolean);
}
export function superLigHaberleri(hikayeler, sl) {
  const desen = slAnahtarlar(sl);
  if (!desen.length) return [];
  const re = new RegExp(`(^|[^a-zçğıöşü])(${desen.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i');
  return hikayeler.filter((x) => sporMu(x) && re.test(x.baslik));
}

function macKarti(m, simdi) {
  const bas = m.saat ? new Date(`${m.tarih}T${m.saat}:00+03:00`).getTime() : null;
  const durum = m.skor && (!bas || simdi > bas + 115 * 60e3) ? 'bitti' : bas && simdi >= bas && simdi < bas + 115 * 60e3 ? 'oynaniyor' : m.skor ? 'bitti' : 'baslamadi';
  const [e, d] = String(m.skor || '').split('-');
  return `<div class="sl-mac ${durum}">
<span class="sl-zaman">${durum === 'oynaniyor' ? '<b class="canli">● Oynanıyor</b>' : durum === 'bitti' ? 'Maç sonu' : h(kisaGun(m.tarih))}${durum === 'baslamadi' && m.saat ? ` · ${h(m.saat)}` : ''}</span>
<span class="sl-takim">${takimRozeti(m.ev)}<b>${h(m.ev)}</b></span>
<span class="sl-skor">${m.skor ? `<b>${h(e)}</b><i>–</i><b>${h(d)}</b>` : '<i>v</i>'}</span>
<span class="sl-takim">${takimRozeti(m.dep)}<b>${h(m.dep)}</b></span>
</div>`;
}

export function sporAnaIcerik({ servis, hikayeler, simdi = Date.now(), ligMenusu }) {
  const sp = servis?.spor || {};
  const L = sp.ligler || {};
  const sl = L['super-lig'];
  const takimlar = mersinTakimlari(servis, simdi);
  const mersinSpor = hikayeler.filter((x) => !x.genel && sporMu(x));
  const turkiye0 = hikayeler.filter((x) => x.genel && sporMu(x));
  const [buyuk, ...kalan] = mersinSpor;
  const hafta = sl?.maclar || [];
  const slHaber = superLigHaberleri(hikayeler, sl).slice(0, 6);
  const lider = sl?.puan?.[0];
  const turkiye = turkiye0.filter((x) => !slHaber.includes(x)).slice(0, 6);
  return `${ligMenusu}
${derbiKarti(servis, simdi)}
${sl ? `<section class="spor-bolum sl-bolum" id="super-lig"><div class="bolum-bas"><h2>Trendyol Süper Lig</h2><a class="bolum-link" href="/spor/super-lig/">Puan durumu ve fikstür →</a></div>
${lider ? `<div class="sl-lider">${takimRozeti(lider.takim)}<span><small>Lider</small><b>${h(lider.takim)}</b></span><span class="sl-lider-p"><b>${lider.p}</b><small>puan · ${lider.o} maç</small></span>${sl.puan[1] ? `<span class="sl-lider-fark">${lider.p - sl.puan[1].p === 0 ? `${h(sl.puan[1].takim)} ile eşit puanda, averajla önde` : `En yakın takipçisi ${h(sl.puan[1].takim)} ile arasında ${lider.p - sl.puan[1].p} puan var`}</span>` : ''}</div>` : ''}
${ligSerit(sl)}
${hafta.length ? `<h3 class="ara-baslik">Haftanın maçları</h3><div class="sl-maclar">${hafta.map((m) => macKarti(m, simdi)).join('')}</div>` : ''}
${slHaber.length ? `<h3 class="ara-baslik">Süper Lig'den haberler</h3>${haberListesi(slHaber)}` : ''}
</section>` : ''}
${takimlar.length ? `<section class="spor-bolum" id="mersin"><div class="bolum-bas"><h2>Mersin takımları</h2><span>Puan durumu, form ve fikstür</span></div><div class="mt-izgara">${takimlar.map((t) => takimKarti(t, simdi)).join('')}</div></section>` : ''}
${krallikKarti(servis)}
${buyuk ? `<section class="spor-bolum"><div class="bolum-bas"><h2>Mersin spor gündemi</h2><a class="bolum-link" href="/kategori/spor/">Tümü →</a></div>
<div class="kare-izgara spor-izgara">${kareKart(buyuk, true)}${kalan.slice(0, 2).map((x) => kareKart(x)).join('')}</div>
${kalan.length > 2 ? haberListesi(kalan.slice(2, 10)) : ''}</section>` : ''}
${sl ? `<section class="spor-bolum"><div class="bolum-bas"><h2>Süper Lig puan durumu</h2><a class="bolum-link" href="/spor/super-lig/">Lig sayfası →</a></div>${ligTablosu(sl)}</section>` : ''}
${turkiye.length ? `<section class="spor-bolum"><div class="bolum-bas"><h2>Türkiye'den spor</h2></div>${haberListesi(turkiye)}</section>` : ''}
${sp.milli?.maclar?.length ? `<section class="spor-bolum" id="milli"><div class="bolum-bas"><h2>A Milli Takım</h2><span>Son maçlar</span></div>${macListesi(sp.milli.maclar.map((m) => ({ ...m, mersin: false, saat: null })))}</section>` : ''}
<p style="color:var(--ikincil);font-size:14.5px">Puan durumu ve fikstür: Türkiye Futbol Federasyonu (tff.org). Kulüp logoları: TheSportsDB. Skorlar maç günlerinde yarım saatte bir güncellenir.</p>`;
}

// ---------- Ana sayfa: maç günü kartı ----------
// Mersin takımının maçı bugünse (ya da son 18 saatte bittiyse) büyük kart; yoksa bugün Süper Lig maçı varsa şerit.
export function macGunuKarti(servis, hikayeler, simdi = Date.now()) {
  const L = servis?.spor?.ligler || {};
  const bugun = gunStr(simdi);
  const dun = gunStr(simdi - 864e5);
  const mersinMaclari = Object.entries(L).flatMap(([kod, l]) => (l.maclar || []).filter((m) => m.mersin && (m.tarih === bugun || m.tarih === dun)).map((m) => ({ ...m, kod, lig: l.kisa })));
  const durumu = (m) => {
    const bas = m.saat ? new Date(`${m.tarih}T${m.saat}:00+03:00`).getTime() : null;
    if (!bas) return m.skor ? 'bitti' : 'baslamadi';
    if (simdi < bas) return 'baslamadi';
    if (simdi < bas + 115 * 60e3) return 'oynaniyor';
    return 'bitti';
  };
  const secili = mersinMaclari
    .map((m) => ({ ...m, durum: durumu(m), bas: new Date(`${m.tarih}T${m.saat || '12:00'}:00+03:00`).getTime() }))
    .filter((m) => m.tarih === bugun || (m.durum === 'bitti' && m.skor && simdi - m.bas < 20 * 36e5))
    .sort((a, b) => a.bas - b.bas)[0];
  if (secili) {
    const takim = [secili.ev, secili.dep].find((t) => (L[secili.kod]?.puan || []).some((p) => p.takim === t && p.mersin)) || secili.ev;
    const ilgili = hikayeler.filter((x) => x.macHaberi && x.baslik.includes(takim.split(' ').slice(0, 2).join(' ')) && simdi - new Date(x.ilkGorulme).getTime() < 36 * 36e5);
    const sonra = ilgili.find((x) => x.id.startsWith('m'));
    const once = ilgili.find((x) => x.id.startsWith('o'));
    const [e, d] = String(secili.skor || '').split('-');
    const ust = secili.durum === 'oynaniyor' ? '<b class="canli">● Şu an oynanıyor</b>' : secili.durum === 'bitti' ? (secili.skor ? 'Maç sonucu' : 'Maç bitti · skor birazdan') : `Maç günü · bugün ${h(secili.saat || '')}`;
    const link = sonra || once;
    return `<a class="macgunu-kart ${secili.durum}" href="${link ? h(haberYolu(link)) : `/spor/${secili.kod}/`}">
<span class="mk-ust"><span>⚽ ${ust}</span><small>${h(secili.lig)}</small></span>
<span class="mk-orta"><span class="mk-takim">${takimRozeti(secili.ev, secili.ev === takim)}<b>${h(secili.ev)}</b></span>
<span class="mk-skor">${secili.skor && secili.durum !== 'baslamadi' ? `<b>${h(e)}</b><i>–</i><b>${h(d)}</b>` : secili.durum === 'baslamadi' ? `<i>${h(secili.saat || 'v')}</i>` : '<i>–</i>'}</span>
<span class="mk-takim">${takimRozeti(secili.dep, secili.dep === takim)}<b>${h(secili.dep)}</b></span></span>
<span class="mk-alt">${sonra ? 'Maç sonu haberini oku →' : once ? 'Maç önü: ' + h(once.baslik) + ' →' : 'Puan durumu ve fikstür →'}</span>
</a>`;
  }
  // Süper Lig maçları yan kutudaki "Bugünün maçları"nda gösteriliyor; ana sayfada ayrıca şerit yok
  return '';
}

// ---------- Derbi geri sayımı (Süper Lig) ----------
const BUYUKLER = ['Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor'];
export function derbiKarti(servis, simdi = Date.now()) {
  const sl = servis?.spor?.ligler?.['super-lig'];
  if (!sl?.maclar?.length) return '';
  const sira = (ad) => (sl.puan || []).find((p) => p.takim === ad);
  const ust3 = (ad) => (sira(ad)?.sira || 99) <= 3;
  const adaylar = sl.maclar
    .filter((m) => (BUYUKLER.includes(m.ev) && BUYUKLER.includes(m.dep)) || (ust3(m.ev) && ust3(m.dep)))
    .map((m) => ({ ...m, bas: new Date(`${m.tarih}T${m.saat || '20:00'}:00+03:00`).getTime() }))
    .filter((m) => m.bas - simdi < 7 * 864e5 && simdi - m.bas < 14 * 36e5)
    .sort((a, b) => a.bas - b.bas);
  const m = adaylar[0];
  if (!m) return '';
  const durum = simdi < m.bas ? 'once' : simdi < m.bas + 115 * 60e3 ? 'canli' : 'bitti';
  const derbi = BUYUKLER.includes(m.ev) && BUYUKLER.includes(m.dep);
  const [e, d] = String(m.skor || '').split('-');
  const takim = (ad) => { const p = sira(ad); return `<span class="dk-takim">${takimRozeti(ad)}<b>${h(ad)}</b>${p ? `<small>${p.sira}. sıra · ${p.p} puan</small>` : ''}</span>`; };
  return `<a class="derbi-kart ${durum}" href="/spor/#super-lig">
<span class="dk-ust"><b>${derbi ? '🔥 DERBİ' : '⭐ ZİRVE MAÇI'}</b><small>Trendyol Süper Lig · ${h(kisaGun(m.tarih))}${m.saat ? ` ${h(m.saat)}` : ''}</small></span>
<span class="dk-orta">${takim(m.ev)}
<span class="dk-merkez">${durum === 'once'
    ? `<span class="dk-sayac" data-geri-sayim="${new Date(m.bas).toISOString()}">–</span><small>gün : saat : dk : sn</small>`
    : m.skor ? `<span class="dk-skor">${h(e)} – ${h(d)}</span><small>${durum === 'canli' ? '● oynanıyor' : 'maç sonucu'}</small>` : `<span class="dk-skor">–</span><small>${durum === 'canli' ? '● oynanıyor' : 'skor birazdan'}</small>`}</span>
${takim(m.dep)}</span>
</a>`;
}

// ---------- Süper Lig takım sayfaları: /spor/takim/<takım>/ ----------
export const takimYolu = (ad) => `/spor/takim/${_slug(String(ad).toLocaleLowerCase('tr-TR'))}/`;
const TAKIM_DUR = new Set(['tümosan', 'corendon', 'metro', 'holding', 'çaykur', 'arca', 'zecorner', 'ikas', 'bitexen', 'fk', 'sk', 'as', 'a.ş.', 'istanbul', 'sportif', 'faaliyetler']);
function takimAnahtar(ad) {
  return String(ad).split(/\s+/).filter((k) => !TAKIM_DUR.has(k.toLocaleLowerCase('tr-TR')) && k.length >= 4).sort((a, b) => b.length - a.length)[0] || String(ad).split(/\s+/)[0];
}
export function takimSayfasi({ takim, lig, hikayeler, servis, simdi = Date.now() }) {
  const t = lig.puan.find((x) => x.takim === takim);
  const benim = (m) => m.ev === takim || m.dep === takim;
  const sonuclar = Object.keys(lig.haftalar || {}).map(Number).sort((a, b) => b - a).map((n) => ({ n, m: (lig.haftalar[n] || []).find((x) => benim(x) && x.skor) })).filter((x) => x.m);
  const gelecek = (lig.maclar || []).filter((m) => benim(m) && !m.skor).sort((a, b) => (a.tarih + (a.saat || '')).localeCompare(b.tarih + (b.saat || '')));
  const anahtar = takimAnahtar(takim);
  const re = new RegExp(`(^|[^a-zçğıöşü])${anahtar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  const haberler = hikayeler.filter((x) => x.kategori === 'spor' && re.test(x.baslik)).slice(0, 8);
  const sr = (m) => sonuc(m, takim);
  const ad = h(takim);
  const ust3 = lig.puan.slice(0, 3).map((x) => x.takim);
  const sss = [
    { soru: `${takim} kaçıncı sırada?`, cevap: `${takim}, Trendyol Süper Lig'de ${t.o} maçta ${t.p} puanla ${t.sira}. sırada (${t.g} galibiyet, ${t.b} beraberlik, ${t.m} mağlubiyet).` },
    ...(gelecek[0] ? [{ soru: `${takim} sonraki maçı ne zaman?`, cevap: `${takim}, ${kisaGun(gelecek[0].tarih)}${gelecek[0].saat ? ` saat ${gelecek[0].saat}` : ''} ${gelecek[0].ev === takim ? `sahasında ${gelecek[0].dep}` : `deplasmanda ${gelecek[0].ev}`} ile oynayacak.` }] : []),
    ...(sonuclar[0] ? [{ soru: `${takim} son maçı kaç kaç bitti?`, cevap: `${sonuclar[0].n}. haftada ${sonuclar[0].m.ev} ${sonuclar[0].m.skor} ${sonuclar[0].m.dep}.` }] : []),
  ];
  return {
    baslik: `${takim} puan durumu, fikstür ve son maçlar`,
    aciklama: `${takim} Süper Lig'de ${t.sira}. sırada, ${t.p} puan. Son maç sonuçları, form durumu, sıradaki maç ve ${takim} haberleri.`,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'SportsTeam', name: takim, sport: 'Futbol', memberOf: { '@type': 'SportsOrganization', name: 'Trendyol Süper Lig' } },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) },
    ],
    ust: `<div class="su-an-bas"><div><div class="cipler"><a class="cip" href="/spor/super-lig/">Trendyol Süper Lig</a></div><h1 class="takim-baslik">${takimRozeti(takim)}${ad}</h1><p style="margin-top:8px">${t.sira}. sıra · ${t.p} puan · ${t.o} maç</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<article class="mt-kart" style="margin-bottom:18px">
<div class="mt-ust" style="background:linear-gradient(120deg,#0b3d1f,#15803d 60%,#22c55e)"><span class="mt-logo">${takimRozeti(takim)}</span><span class="mt-ad"><b>${ad}</b><small>Trendyol Süper Lig${ust3.includes(takim) ? ' · zirve yarışında' : ''}</small></span><span class="mt-sira"><b>${t.sira}.</b><small>${t.p} puan</small></span></div>
<div class="mt-istat"><span><b>${t.o}</b>maç</span><span><b>${t.g}</b>galibiyet</span><span><b>${t.b}</b>beraberlik</span><span><b>${t.m}</b>mağlubiyet</span><span><b>${t.a}:${t.y}</b>gol</span></div>
${lig.form?.[takim]?.length ? `<div class="mt-form"><small>Son ${lig.form[takim].length} maç</small>${lig.form[takim].map((f) => `<i class="f-${f}">${f}</i>`).join('')}</div>` : ''}
</article>
${gelecek.length ? `<div class="bolum-bas"><h2>Sıradaki maç</h2></div><div class="sl-maclar">${gelecek.slice(0, 2).map((m) => `<div class="sl-mac"><span class="sl-zaman">${h(goreliZaman(m.tarih, m.saat, simdi))}</span><span class="sl-takim">${takimRozeti(m.ev)}<b>${h(m.ev)}</b></span><span class="sl-skor"><i>v</i></span><span class="sl-takim">${takimRozeti(m.dep)}<b>${h(m.dep)}</b></span></div>`).join('')}</div>` : ''}
${sonuclar.length ? `<div class="bolum-bas"><h2>Son maçlar</h2></div><div class="sl-maclar">${sonuclar.map(({ n, m }) => `<div class="sl-mac"><span class="sl-zaman">${n}. hafta · ${{ G: 'Galibiyet', B: 'Beraberlik', M: 'Mağlubiyet' }[sr(m)]}</span><span class="sl-takim">${takimRozeti(m.ev)}<b>${h(m.ev)}</b></span><span class="sl-skor"><b>${h(m.skor.split('-')[0])}</b><i>–</i><b>${h(m.skor.split('-')[1])}</b></span><span class="sl-takim">${takimRozeti(m.dep)}<b>${h(m.dep)}</b></span></div>`).join('')}</div>` : ''}
${haberler.length ? `<div class="bolum-bas"><h2>${ad} haberleri</h2></div>${haberListesi(haberler)}` : ''}
<div class="bolum-bas"><h2>Puan durumu</h2><a class="bolum-link" href="/spor/super-lig/">Lig sayfası →</a></div>
${ligTablosu(lig)}
<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>
<div class="mh-liste">${lig.puan.map((x) => `<a href="${takimYolu(x.takim)}"${x.takim === takim ? ' style="background:#dcfce7"' : ''}>${h(x.takim)}</a>`).join('')}</div>
<p style="color:var(--ikincil);font-size:14px">Puan durumu ve fikstür: Türkiye Futbol Federasyonu (tff.org). Logolar: TheSportsDB.</p>
</div>${sporYan(servis, hikayeler, simdi)}</main>`,
  };
}

// ---------- Gol krallığı ----------
// TFF adları büyük harfle geldiği için büyük harfle gösterilir (yabancı adlarda I/İ belirsizliği olmasın)
const kisaOyuncu = (ad) => { const k = String(ad).split(/\s+/).filter(Boolean); return k.length > 3 ? `${k[0]} ${k[1]}` : k.length > 2 ? `${k[0]} ${k[k.length - 1]}` : k.join(' '); };
const basHarf = (ad) => kisaOyuncu(ad).split(' ').map((k) => k[0]).join('').slice(0, 2);
function krallikListesi(g, adet) {
  let sira = 0;
  return `<ol class="kr-liste">${g.liste.slice(0, adet).map((o, i, l) => {
    if (i === 0 || o.gol !== l[i - 1].gol) sira = i + 1;
    let n = 0; for (const c of o.kulup) n = (n * 31 + c.charCodeAt(0)) >>> 0;
    const mersin = mersinMi(o.kulup);
    return `<li class="kr-satir${mersin ? ' mersin' : ''}"><span class="kr-sira">${sira}</span><span class="kr-avatar" style="--c:${mersin ? '#C8102E' : `hsl(${n % 360} 60% 42%)`}">${h(basHarf(o.ad))}</span><span class="kr-ad"><b>${h(kisaOyuncu(o.ad))}</b><small>${takimLogosu(o.kulup)}${h(KISA_TAKIM[o.kulup] || o.kulup)}</small></span><span class="kr-gol"><b>${o.gol}</b><small>gol</small></span></li>`;
  }).join('')}</ol>`;
}
// Sekmeli gol krallığı kartı. kodlar: gösterilecek ligler (ilki açık gelir)
export function krallikKarti(servis, kodlar = ['super-lig', '3-lig-3', '1-lig'], adet = 10) {
  const G = servis?.spor?.golKralligi || {};
  const var_ = kodlar.filter((k) => G[k]?.liste?.length);
  if (!var_.length) return '';
  const ad = `kr${var_.join('').replace(/[^a-z0-9]/g, '')}`;
  return `<section class="krallik" id="gol-kralligi"><header class="kr-bas"><h2>Gol krallığı</h2><span>${var_.length === 1 ? h(G[var_[0]].ad) : 'TFF resmî verisi'}</span></header>
${var_.length > 1 ? var_.map((k, i) => `<input type="radio" name="${ad}" id="${ad}-${k}" class="kr-radyo"${i ? '' : ' checked'}>`).join('') : ''}
${var_.length > 1 ? `<nav class="kr-sekmeler" aria-label="Ligler">${var_.map((k) => `<label for="${ad}-${k}">${h(G[k].ad)}${k === '3-lig-3' ? ' <small>Mersin</small>' : ''}</label>`).join('')}</nav>` : ''}
${var_.map((k) => `<div class="kr-panel${var_.length === 1 ? ' tek' : ''}">${krallikListesi(G[k], adet)}</div>`).join('')}
<a class="kr-alt" href="${h(G[var_[0]].kaynak)}" rel="noopener" target="_blank">Kaynak: TFF · ${new Date(G[var_[0]].guncelleme).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: TZ })}</a></section>`;
}
