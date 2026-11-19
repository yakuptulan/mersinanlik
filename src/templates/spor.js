// Spor sayfaları: /spor/ ana sayfası ve spor sayfalarına özel yan sütun
import { htmlKacis as h } from '../lib/text.js';
import { kareKart, haberListesi, reklamAlani, haberYolu, kapakAdresi } from './parcalar.js';
import { kutuBasligi, takimRozeti, takimLogosu, ligTablosu, ligSerit, macListesi, bugununMaclari } from './servisParcalari.js';
import { LIGLER } from '../lib/spor.js';

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
${sl ? `<section class="spor-bolum sl-bolum" id="super-lig"><div class="bolum-bas"><h2>Trendyol Süper Lig</h2><a class="bolum-link" href="/spor/super-lig/">Puan durumu ve fikstür →</a></div>
${lider ? `<div class="sl-lider">${takimRozeti(lider.takim)}<span><small>Lider</small><b>${h(lider.takim)}</b></span><span class="sl-lider-p"><b>${lider.p}</b><small>puan · ${lider.o} maç</small></span>${sl.puan[1] ? `<span class="sl-lider-fark">${lider.p - sl.puan[1].p === 0 ? `${h(sl.puan[1].takim)} ile eşit puanda, averajla önde` : `En yakın takipçisi ${h(sl.puan[1].takim)} ile arasında ${lider.p - sl.puan[1].p} puan var`}</span>` : ''}</div>` : ''}
${ligSerit(sl)}
${hafta.length ? `<h3 class="ara-baslik">Haftanın maçları</h3><div class="sl-maclar">${hafta.map((m) => macKarti(m, simdi)).join('')}</div>` : ''}
${slHaber.length ? `<h3 class="ara-baslik">Süper Lig'den haberler</h3>${haberListesi(slHaber)}` : ''}
</section>` : ''}
${takimlar.length ? `<section class="spor-bolum" id="mersin"><div class="bolum-bas"><h2>Mersin takımları</h2><span>Puan durumu, form ve fikstür</span></div><div class="mt-izgara">${takimlar.map((t) => takimKarti(t, simdi)).join('')}</div></section>` : ''}
${buyuk ? `<section class="spor-bolum"><div class="bolum-bas"><h2>Mersin spor gündemi</h2><a class="bolum-link" href="/kategori/spor/">Tümü →</a></div>
<div class="kare-izgara spor-izgara">${kareKart(buyuk, true)}${kalan.slice(0, 2).map((x) => kareKart(x)).join('')}</div>
${kalan.length > 2 ? haberListesi(kalan.slice(2, 10)) : ''}</section>` : ''}
${sl ? `<section class="spor-bolum"><div class="bolum-bas"><h2>Süper Lig puan durumu</h2><a class="bolum-link" href="/spor/super-lig/">Lig sayfası →</a></div>${ligTablosu(sl)}</section>` : ''}
${turkiye.length ? `<section class="spor-bolum"><div class="bolum-bas"><h2>Türkiye'den spor</h2></div>${haberListesi(turkiye)}</section>` : ''}
${sp.milli?.maclar?.length ? `<section class="spor-bolum" id="milli"><div class="bolum-bas"><h2>A Milli Takım</h2><span>Son maçlar</span></div>${macListesi(sp.milli.maclar.map((m) => ({ ...m, mersin: false, saat: null })))}</section>` : ''}
<p style="color:var(--ikincil);font-size:14.5px">Puan durumu ve fikstür: Türkiye Futbol Federasyonu (tff.org). Kulüp logoları: TheSportsDB. Skorlar maç günlerinde yarım saatte bir güncellenir.</p>`;
}
