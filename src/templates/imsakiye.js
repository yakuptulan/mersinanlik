// Ramazan 2027 imsakiyesi: Mersin, 13 ilçe ve 81 il
//   /imsakiye/            Mersin (il merkezi)
//   /imsakiye/<ilce>/     Mersin ilçeleri
//   /imsakiye/il/<il>/    Türkiye'nin diğer illeri
// Tarihler Diyanet'in 2027 dini günler takviminden; vakitler Diyanet yöntemiyle hesaplanır (src/lib/vakitHesap.js).

import { SITE, ILCELER } from '../config.js';
import { sayfa } from './layout.js';
import { htmlKacis as h } from '../lib/text.js';
import { vakitListesi } from '../lib/vakitHesap.js';
import ILLER from '../iller.json' with { type: 'json' };

export const RAMAZAN = {
  yil: 2027,
  hicriYil: 1448,
  baslangic: '2027-02-08', // ilk oruç
  gunSayisi: 29, // son oruç 8 Mart (arefe)
  ilkTeravih: '2027-02-07',
  kadir: '2027-03-05',
  arefe: '2027-03-08',
  bayram: ['2027-03-09', '2027-03-10', '2027-03-11'],
};
export const IMSAKIYE_YOL = '/imsakiye/';
export const imsakiyeYolu = (tur, slug) => (tur === 'mersin' ? IMSAKIYE_YOL : tur === 'ilce' ? `${IMSAKIYE_YOL}${slug}/` : `${IMSAKIYE_YOL}il/${slug}/`);

const TZ = SITE.timezone;
const tarihUzun = (g) => new Date(`${g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: TZ });
const tarihKisa = (g) => new Date(`${g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short', timeZone: TZ });
const gunAyi = (g) => new Date(`${g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: TZ });
const bulunma = (ad) => {
  const son = ad.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü]/g, '').slice(-1);
  const sesli = [...ad.toLocaleLowerCase('tr-TR')].reverse().find((c) => 'aeıioöuü'.includes(c)) || 'e';
  const ek = 'aıou'.includes(sesli) ? 'a' : 'e';
  return `${ad}'${'fstkçşhp'.includes(son) ? 't' : 'd'}${ek}`;
};

// Ramazan boyunca günlük vakitler
const onbellek = new Map();
export function ramazanVakitleri(lat, lon) {
  const k = `${lat},${lon}`;
  if (!onbellek.has(k)) {
    const l = vakitListesi(lat, lon, RAMAZAN.gunSayisi, Date.parse(`${RAMAZAN.baslangic}T12:00:00+03:00`)).map((v, i) => ({ ...v, ramazanGunu: i + 1 }));
    onbellek.set(k, l);
  }
  return onbellek.get(k);
}

const sssLd = (l) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: l.map(([soru, cevap]) => ({ '@type': 'Question', name: soru, acceptedAnswer: { '@type': 'Answer', text: cevap } })) });

function sayacKarti(ad, vakitler, simdi) {
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: TZ });
  const v = vakitler.find((x) => x.tarih === bugun);
  if (v) {
    const iftar = Date.parse(`${v.tarih}T${v.aksam}:00+03:00`);
    const yarin = vakitler.find((x) => x.ramazanGunu === v.ramazanGunu + 1);
    const hedef = simdi < iftar ? { ad: 'iftara', saat: v.aksam, zaman: `${v.tarih}T${v.aksam}:00+03:00`, baslik: `BUGÜN ${ad.toLocaleUpperCase('tr-TR')} İFTAR VAKTİ` } : yarin ? { ad: 'sahurun bitmesine (imsak)', saat: yarin.imsak, zaman: `${yarin.tarih}T${yarin.imsak}:00+03:00`, baslik: 'YARIN SAHUR BİTİŞİ (İMSAK)' } : null;
    if (hedef) return `<section class="derbi-kart" style="display:block"><span class="dk-ust"><b>🌙 ${h(hedef.baslik)}</b><small>${v.ramazanGunu}. gün · Ramazan ${RAMAZAN.hicriYil}</small></span><span class="dk-orta" style="grid-template-columns:1fr"><span class="dk-merkez"><span class="dk-skor">${h(hedef.saat)}</span><span class="dk-sayac" data-geri-sayim="${hedef.zaman}">–</span><small>${h(hedef.ad)} kalan · gün : saat : dk : sn</small></span></span></section>`;
  }
  if (bugun < RAMAZAN.baslangic) {
    const ilk = vakitler[0];
    return `<section class="derbi-kart" style="display:block"><span class="dk-ust"><b>🌙 RAMAZAN ${RAMAZAN.yil}'E KALAN</b><small>İlk oruç ${h(tarihUzun(RAMAZAN.baslangic))}</small></span><span class="dk-orta" style="grid-template-columns:1fr"><span class="dk-merkez"><span class="dk-skor">${h(ilk.imsak)}</span><span class="dk-sayac" data-geri-sayim="${ilk.tarih}T${ilk.imsak}:00+03:00">–</span><small>ilk sahurun bitişine (imsak) kalan · gün : saat : dk : sn</small></span></span></section>`;
  }
  return '';
}

export function imsakiyeSayfasi({ tur, ad, slug, lat, lon, simdi = Date.now() }) {
  const vakitler = ramazanVakitleri(lat, lon);
  const ilk = vakitler[0];
  const son = vakitler[vakitler.length - 1];
  const kadir = vakitler.find((v) => v.tarih === RAMAZAN.kadir);
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: TZ });
  const yer = tur === 'il' ? `${ad} il merkezi` : tur === 'ilce' ? `${ad} ilçe merkezi` : 'Mersin il merkezi';
  const sss = [
    [`${bulunma(ad)} ilk iftar saat kaçta?`, `${RAMAZAN.yil} Ramazan'ının ilk günü olan ${tarihUzun(ilk.tarih)} ${bulunma(ad)} iftar (akşam ezanı) saati ${ilk.aksam}.`],
    [`${bulunma(ad)} ilk sahur saat kaçta bitiyor?`, `İlk sahur 7 Şubat'ı 8 Şubat'a bağlayan gece yapılır. ${bulunma(ad)} imsak vakti, yani sahurun son anı ${ilk.imsak}.`],
    [`${RAMAZAN.yil} Ramazan Bayramı ne zaman?`, `Diyanet takvimine göre Ramazan Bayramı ${tarihUzun(RAMAZAN.bayram[0])} başlıyor ve ${tarihUzun(RAMAZAN.bayram[2])} sona eriyor. Arefe ${tarihUzun(RAMAZAN.arefe)}.`],
    [`${RAMAZAN.yil} Kadir Gecesi ne zaman?`, `Diyanet takvimine göre Kadir Gecesi ${tarihUzun(RAMAZAN.kadir)}.${kadir ? ` O gün ${bulunma(ad)} iftar ${kadir.aksam}, yatsı ${kadir.yatsi}.` : ''}`],
    [`${bulunma(ad)} son iftar ne zaman?`, `Son oruç arefe günü olan ${tarihUzun(son.tarih)} tutulur; ${bulunma(ad)} son iftar saati ${son.aksam}.`],
  ];
  const tablo = `<div class="tablo-kap"><table class="tablo imsakiye-tablo"><thead><tr><th>Gün</th><th>Tarih</th><th>İmsak<br><small>sahur sonu</small></th><th class="opt">Güneş</th><th class="opt">Öğle</th><th class="opt">İkindi</th><th>İftar<br><small>akşam</small></th><th class="opt">Yatsı</th></tr></thead><tbody>
${vakitler.map((v) => `<tr class="${v.tarih === bugun ? 'bugun' : ''}${v.tarih === RAMAZAN.kadir ? ' kadir' : ''}"><td>${v.ramazanGunu}</td><th scope="row">${h(tarihKisa(v.tarih))}${v.tarih === RAMAZAN.kadir ? ' <span class="im-rozet">Kadir Gecesi</span>' : v.tarih === RAMAZAN.arefe ? ' <span class="im-rozet">Arefe</span>' : ''}</th><td><b>${h(v.imsak)}</b></td><td class="opt">${h(v.gunes)}</td><td class="opt">${h(v.ogle)}</td><td class="opt">${h(v.ikindi)}</td><td class="im-iftar"><b>${h(v.aksam)}</b></td><td class="opt">${h(v.yatsi)}</td></tr>`).join('\n')}
</tbody></table></div>`;
  const onemli = [
    ['İlk teravih', `${tarihUzun(RAMAZAN.ilkTeravih)} akşamı`],
    ['İlk sahur', `7 Şubat'ı 8 Şubat'a bağlayan gece · imsak ${ilk.imsak}`],
    ['İlk iftar', `${tarihUzun(ilk.tarih)} · ${ilk.aksam}`],
    ['Kadir Gecesi', tarihUzun(RAMAZAN.kadir)],
    ['Arefe (son oruç)', `${tarihUzun(RAMAZAN.arefe)} · iftar ${son.aksam}`],
    ['Ramazan Bayramı', `${gunAyi(RAMAZAN.bayram[0])} – ${gunAyi(RAMAZAN.bayram[2])} ${RAMAZAN.yil}`],
  ];
  const ilceCipleri = `<div class="ilce-cipleri"><a class="cip${tur === 'mersin' ? ' aktif' : ''}" href="${IMSAKIYE_YOL}">Mersin merkez</a>${ILCELER.map((i) => `<a class="cip${tur === 'ilce' && slug === i.slug ? ' aktif' : ''}" href="${imsakiyeYolu('ilce', i.slug)}">${h(i.ad)}</a>`).join('')}</div>`;
  const ilListesi = `<details class="im-iller"><summary>Diğer illerin imsakiyesi (81 il)</summary><div class="ilce-cipleri">${ILLER.filter((i) => i.slug !== 'mersin').map((i) => `<a class="cip" href="${imsakiyeYolu('il', i.slug)}">${h(i.ad)}</a>`).join('')}</div></details>`;
  return sayfa({
    baslik: `${ad} imsakiye ${RAMAZAN.yil}: Ramazan sahur ve iftar saatleri`,
    aciklama: `${ad} ${RAMAZAN.yil} Ramazan imsakiyesi: ilk oruç 8 Şubat, ilk iftar ${ilk.aksam}, ilk imsak ${ilk.imsak}. 29 günlük sahur (imsak) ve iftar saatleri, Kadir Gecesi ve bayram tarihleri.`,
    yol: imsakiyeYolu(tur, slug),
    aktif: '/namaz-vakitleri/',
    jsonLd: sssLd(sss),
    ust: `<div class="su-an-bas"><div><h1>${h(ad)} imsakiye ${RAMAZAN.yil}</h1><p style="margin-top:8px">Ramazan ${RAMAZAN.hicriYil} · ${h(gunAyi(ilk.tarih))} – ${h(gunAyi(son.tarih))} ${RAMAZAN.yil} · sahur ve iftar saatleri</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${sayacKarti(ad, vakitler, simdi)}
<p class="giris-metni">${RAMAZAN.yil} Ramazan ayı Diyanet takvimine göre <strong>${h(tarihUzun(ilk.tarih))}</strong> başlıyor. ${h(bulunma(ad))} ilk sahur ${h(ilk.imsak)}'da bitiyor, ilk iftar ${h(ilk.aksam)}'da. Aşağıda ${h(yer)} için 29 günün sahur (imsak) ve iftar saatleri yer alıyor.</p>
${tur !== 'il' ? ilceCipleri : ''}
<div class="im-onemli">${onemli.map(([a, b]) => `<div><small>${h(a)}</small><b>${h(b)}</b></div>`).join('')}</div>
<div class="bolum-bas"><h2>${h(ad)} imsakiye ${RAMAZAN.yil}</h2><span>Diyanet yöntemi</span></div>
${tablo}
<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${sss.map(([s, c]) => `<details><summary>${h(s)}</summary><p>${h(c)}</p></details>`).join('')}</section>
${tur === 'il' ? `<p><a class="hap" href="${IMSAKIYE_YOL}">Mersin imsakiye ${RAMAZAN.yil}</a></p>` : ''}
${ilListesi}
<p style="color:var(--ikincil);font-size:14px">Ramazan, Kadir Gecesi ve bayram tarihleri Diyanet İşleri Başkanlığı'nın ${RAMAZAN.yil} dini günler takviminden alınmıştır. Vakitler, Diyanet'in kullandığı hesaplama yöntemi ve temkinlerle ${h(yer)} için hesaplanmıştır; Diyanet'in resmî imsakiyesiyle en fazla 1 dakika fark olabilir. Diyanet ${RAMAZAN.yil} imsakiyesini yayımladığında karşılaştırılarak güncellenecektir. İmsak vakti sahurun son anıdır; ihtiyaten birkaç dakika önce yemeyi bırakmak önerilir.</p>
</div></main>`,
  });
}

// Tüm imsakiye sayfaları: [{ yol, html }]
export function imsakiyeSayfalari(simdi = Date.now()) {
  const mersin = ILLER.find((i) => i.slug === 'mersin');
  const l = [{ yol: IMSAKIYE_YOL, html: imsakiyeSayfasi({ tur: 'mersin', ad: 'Mersin', slug: 'mersin', lat: mersin.lat, lon: mersin.lon, simdi }) }];
  for (const i of ILCELER) if (i.lat) l.push({ yol: imsakiyeYolu('ilce', i.slug), html: imsakiyeSayfasi({ tur: 'ilce', ad: i.ad, slug: i.slug, lat: i.lat, lon: i.lon, simdi }) });
  for (const i of ILLER) if (i.slug !== 'mersin') l.push({ yol: imsakiyeYolu('il', i.slug), html: imsakiyeSayfasi({ tur: 'il', ad: i.ad, slug: i.slug, lat: i.lat, lon: i.lon, simdi }) });
  return l;
}
