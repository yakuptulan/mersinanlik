// 81 il sayfaları: akaryakıt fiyatları (/akaryakit/<il>/) ve namaz/iftar vakitleri (/namaz-vakti/<il>/)
import { htmlKacis as h } from '../lib/text.js';
import { sayfa } from './layout.js';
import { SITE } from '../config.js';
import ILLER from '../iller.json' with { type: 'json' };

const TZ = 'Europe/Istanbul';
const tl = (n) => (n == null ? '–' : `${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`);
const saatStr = (t) => new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ });
const gunAdi = (g) => new Date(`${g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: TZ });
const BULUNMA = (ad) => {
  // "Ankara'da", "İzmir'de", "Muş'ta" — son ünlüye ve sert ünsüze göre bulunma eki
  const kucuk = ad.toLocaleLowerCase('tr-TR');
  const unlu = [...kucuk].reverse().find((c) => 'aeıioöuü'.includes(c)) || 'e';
  const ince = 'eiöü'.includes(unlu);
  const sert = 'fstkçşhp'.includes(kucuk.at(-1));
  return `${ad}'${sert ? 't' : 'd'}${ince ? 'e' : 'a'}`;
};
export const ilBulunma = BULUNMA;
const medyan = (d) => {
  const s = d.filter((x) => x != null).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
const ilSecici = (yolu, aktif) => `<details class="mh-diger"><summary>Diğer iller (81)</summary><div class="mh-liste">${ILLER.map((i) => `<a href="${yolu(i.slug)}"${i.slug === aktif ? ' style="background:#dbeafe"' : ''}>${h(i.ad)}</a>`).join('')}</div></details>`;

// ---------- Akaryakıt ----------
export const akaryakitYolu = (slug) => (slug === 'mersin' ? '/akaryakit-fiyatlari/' : `/akaryakit/${slug}/`);
export function ilYakitOzeti(k) {
  const l = Object.values(k?.ilceler || {});
  const b = l.map((x) => x.benzin).filter(Boolean);
  const m = l.map((x) => x.motorin).filter(Boolean);
  return { benzin: medyan(b), motorin: medyan(m), bMin: Math.min(...b), bMax: Math.max(...b), mMin: Math.min(...m), mMax: Math.max(...m), ilce: l.length };
}

export function akaryakitIlSayfasi({ il, kayit, mersin }) {
  const o = ilYakitOzeti(kayit);
  const ilceler = Object.values(kayit.ilceler).sort((a, b) => (a.benzin || 99) - (b.benzin || 99));
  const ucuz = ilceler[0];
  const pahali = ilceler.at(-1);
  const mo = mersin ? ilYakitOzeti(mersin) : null;
  const fark = kayit.onceki && o.benzin ? Math.round((o.benzin - kayit.onceki.benzin) * 100) : 0;
  const farkM = kayit.onceki && o.motorin ? Math.round((o.motorin - kayit.onceki.motorin) * 100) : 0;
  const sss = [
    { soru: `${BULUNMA(il.ad)} benzin kaç TL?`, cevap: `${BULUNMA(il.ad)} kurşunsuz benzin (95 oktan) litre fiyatı ilçeye göre ${tl(o.bMin)} ile ${tl(o.bMax)} arasında; il genelinde en sık görülen fiyat ${tl(o.benzin)}.` },
    { soru: `${BULUNMA(il.ad)} motorin kaç TL?`, cevap: `${BULUNMA(il.ad)} motorin litre fiyatı ilçeye göre ${tl(o.mMin)} ile ${tl(o.mMax)} arasında; il genelinde ${tl(o.motorin)}.` },
    { soru: `${il.ad} ilinde en ucuz akaryakıt hangi ilçede?`, cevap: `Güncel listeye göre benzin en ucuz ${ucuz.ad || ''} ilçesinde (${tl(ucuz.benzin)}).` },
  ];
  return sayfa({
    baslik: `${il.ad} akaryakıt fiyatları: benzin ve motorin bugün kaç TL?`,
    aciklama: `${BULUNMA(il.ad)} güncel benzin ve motorin fiyatları: il genelinde benzin ${tl(o.benzin)}, motorin ${tl(o.motorin)}. ${o.ilce} ilçenin pompa fiyatları tek tabloda.`,
    yol: akaryakitYolu(il.slug),
    aktif: '/akaryakit/',
    jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) },
    ust: `<div class="su-an-bas"><div><div class="cipler"><a class="cip" href="/akaryakit/">81 il akaryakıt</a></div><h1>${h(il.ad)} akaryakıt fiyatları</h1><p style="margin-top:8px">Son güncelleme: ${h(saatStr(kayit.guncelleme))} · ${o.ilce} ilçe</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<section class="ekonomi-bugun"><div class="eb-bas"><div><h2>${h(BULUNMA(il.ad))} bugün</h2><p>Kurşunsuz benzin il genelinde ${tl(o.benzin)}, motorin ${tl(o.motorin)}.${kayit.degisim && (fark || farkM) ? ` Son fiyat değişikliği ${h(new Date(kayit.degisim).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: TZ }))}: ${[fark ? `benzine ${Math.abs(fark)} kuruş ${fark > 0 ? 'zam' : 'indirim'}` : '', farkM ? `motorine ${Math.abs(farkM)} kuruş ${farkM > 0 ? 'zam' : 'indirim'}` : ''].filter(Boolean).join(', ')}.` : ''}</p></div></div>
<div class="eb-kareler"><div class="eb-kare"><small>Benzin (95)</small><b>${tl(o.benzin)}</b><em>${tl(o.bMin)} – ${tl(o.bMax)}</em></div><div class="eb-kare"><small>Motorin</small><b>${tl(o.motorin)}</b><em>${tl(o.mMin)} – ${tl(o.mMax)}</em></div><div class="eb-kare"><small>En ucuz benzin</small><b>${h(ucuz.ad || '')}</b><em>${tl(ucuz.benzin)}</em></div><div class="eb-kare"><small>En pahalı benzin</small><b>${h(pahali.ad || '')}</b><em>${tl(pahali.benzin)}</em></div></div></section>
<div class="bolum-bas"><h2>İlçe ilçe pompa fiyatları</h2><span>Opet · litre fiyatı</span></div>
<div class="tablo-kap"><table class="tablo"><thead><tr><th>İlçe</th><th>Benzin</th><th>Motorin</th></tr></thead><tbody>${ilceler.map((x) => `<tr><th scope="row">${h(x.ad || '')}</th><td>${tl(x.benzin)}</td><td>${tl(x.motorin)}</td></tr>`).join('')}</tbody></table></div>
${mo && il.slug !== 'mersin' ? `<p class="giris-metni">Karşılaştırma: Mersin'de benzin ${tl(mo.benzin)}, motorin ${tl(mo.motorin)}. <a href="/akaryakit-fiyatlari/">Mersin akaryakıt fiyatları →</a></p>` : ''}
<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>
${ilSecici(akaryakitYolu, il.slug)}
<p style="color:var(--ikincil);font-size:14px">Fiyatlar Opet'in ilçe bazlı pompa fiyatlarıdır; istasyona ve markaya göre küçük farklar olabilir. Kaynak: opet.com.tr</p>
</div></main>`,
  });
}

export function akaryakitTurkiyeSayfasi({ veri, mersin }) {
  const satirlar = ILLER.map((il) => {
    const k = il.slug === 'mersin' ? mersin : veri[il.slug];
    return k ? { il, o: ilYakitOzeti(k) } : null;
  }).filter(Boolean);
  const sirali = [...satirlar].sort((a, b) => a.o.benzin - b.o.benzin);
  return sayfa({
    baslik: '81 il akaryakıt fiyatları: il il benzin ve motorin (bugün)',
    aciklama: "Türkiye'nin 81 ilinde güncel benzin ve motorin fiyatları. En ucuz ve en pahalı iller, il il pompa fiyatları.",
    yol: '/akaryakit/',
    ust: `<div class="su-an-bas"><div><h1>81 il akaryakıt fiyatları</h1><p style="margin-top:8px">${satirlar.length} il · il genelinde en sık görülen pompa fiyatı</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${sirali.length >= 2 ? `<section class="ekonomi-bugun"><div class="eb-kareler"><div class="eb-kare"><small>En ucuz benzin</small><b>${h(sirali[0].il.ad)}</b><em>${tl(sirali[0].o.benzin)}</em></div><div class="eb-kare"><small>En pahalı benzin</small><b>${h(sirali.at(-1).il.ad)}</b><em>${tl(sirali.at(-1).o.benzin)}</em></div></div></section>` : ''}
<div class="tablo-kap"><table class="tablo"><thead><tr><th>İl</th><th>Benzin</th><th>Motorin</th></tr></thead><tbody>${satirlar.map(({ il, o }) => `<tr${il.slug === 'mersin' ? ' class="mersin"' : ''}><th scope="row"><a href="${akaryakitYolu(il.slug)}">${h(il.ad)}</a></th><td>${tl(o.benzin)}</td><td>${tl(o.motorin)}</td></tr>`).join('')}</tbody></table></div>
<p style="color:var(--ikincil);font-size:14px">Kaynak: Opet ilçe bazlı pompa fiyatları. Liste gün içinde birkaç kez güncellenir.</p>
</div></main>`,
  });
}

// ---------- Namaz ve iftar vakitleri ----------
export const namazYolu = (slug) => (slug === 'mersin' ? '/namaz-vakitleri/' : `/namaz-vakti/${slug}/`);
const VAKIT = [['imsak', 'İmsak'], ['gunes', 'Güneş'], ['ogle', 'Öğle'], ['ikindi', 'İkindi'], ['aksam', 'Akşam'], ['yatsi', 'Yatsı']];

export function namazIlSayfasi({ il, kayit, simdi }) {
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: TZ });
  const liste = kayit.vakitler.filter((v) => v.tarih >= bugun);
  const v = liste[0];
  const ramazan = liste.some((x) => /ramazan/i.test(x.hicri || ''));
  const bugunRamazan = /ramazan/i.test(v?.hicri || '');
  const baslik = ramazan ? `${il.ad} iftar saati ve imsakiye: bugün iftar ne zaman?` : `${il.ad} namaz vakitleri: bugün ezan saat kaçta?`;
  const sss = [
    { soru: `${il.ad} bugün akşam ezanı saat kaçta?`, cevap: `${gunAdi(v.tarih)} günü ${BULUNMA(il.ad)} akşam ezanı (iftar vakti) ${v.aksam}, yatsı ${v.yatsi}.` },
    { soru: `${il.ad} sabah namazı (imsak) saat kaçta?`, cevap: `${gunAdi(v.tarih)} günü ${BULUNMA(il.ad)} imsak vakti ${v.imsak}, güneşin doğuşu ${v.gunes}.` },
    { soru: `${il.ad} cuma ve öğle namazı saat kaçta?`, cevap: `${gunAdi(v.tarih)} günü ${BULUNMA(il.ad)} öğle ezanı ${v.ogle}, ikindi ${v.ikindi}.` },
  ];
  return sayfa({
    baslik,
    aciklama: `${BULUNMA(il.ad)} bugün imsak ${v.imsak}, öğle ${v.ogle}, akşam (iftar) ${v.aksam}. Diyanet verisiyle ${il.ad} namaz vakitleri${ramazan ? ' ve Ramazan imsakiyesi' : ''}.`,
    yol: namazYolu(il.slug),
    aktif: '/namaz-vakti/',
    jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) },
    ust: `<div class="su-an-bas"><div><div class="cipler"><a class="cip" href="/namaz-vakti/">81 il namaz vakitleri</a></div><h1>${h(il.ad)} ${ramazan ? 'iftar ve namaz vakitleri' : 'namaz vakitleri'}</h1><p style="margin-top:8px">${h(gunAdi(v.tarih))}${v.hicri ? ` · ${h(v.hicri)}` : ''}</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${bugunRamazan ? `<section class="derbi-kart" style="display:block"><span class="dk-ust"><b>🌙 BUGÜN ${h(il.ad.toLocaleUpperCase('tr-TR'))} İFTAR VAKTİ</b><small>${h(v.hicri || '')}</small></span><span class="dk-orta" style="grid-template-columns:1fr"><span class="dk-merkez"><span class="dk-skor">${h(v.aksam)}</span><span class="dk-sayac" data-geri-sayim="${v.tarih}T${v.aksam}:00+03:00">–</span><small>iftara kalan · gün : saat : dk : sn</small></span></span></section>` : ''}
<div class="vakit-kartlari">${VAKIT.map(([k, ad]) => `<div class="vakit-kart${k === 'aksam' && ramazan ? ' iftar' : ''}"><small>${ad}${k === 'aksam' && ramazan ? ' (iftar)' : k === 'imsak' && ramazan ? ' (sahur sonu)' : ''}</small><b>${h(v[k])}</b></div>`).join('')}</div>
<div class="bolum-bas"><h2>${ramazan ? 'İmsakiye' : 'Önümüzdeki günler'}</h2><span>Diyanet</span></div>
<div class="tablo-kap"><table class="tablo"><thead><tr><th>Tarih</th>${VAKIT.map(([, ad]) => `<th>${ad}</th>`).join('')}</tr></thead><tbody>${liste.slice(0, ramazan ? 31 : 7).map((x) => `<tr${/ramazan/i.test(x.hicri || '') ? ' class="mersin"' : ''}><th scope="row">${h(new Date(`${x.tarih}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short', timeZone: TZ }))}</th>${VAKIT.map(([k]) => `<td>${h(x[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>
${ilSecici(namazYolu, il.slug)}
<p style="color:var(--ikincil);font-size:14px">Vakitler Diyanet İşleri Başkanlığı'nın ${h(il.ad)} il merkezi için yayımladığı verilerdir; ilçelerde birkaç dakika fark olabilir.</p>
</div></main>`,
  });
}

export function namazTurkiyeSayfasi({ veri, simdi }) {
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: TZ });
  const satirlar = ILLER.map((il) => ({ il, v: (veri[il.slug]?.vakitler || []).find((x) => x.tarih === bugun) }));
  return sayfa({
    baslik: '81 il namaz vakitleri ve iftar saatleri (bugün)',
    aciklama: "Türkiye'nin 81 ilinde bugünkü imsak, öğle, ikindi, akşam (iftar) ve yatsı vakitleri. Diyanet verisi.",
    yol: '/namaz-vakti/',
    ust: `<div class="su-an-bas"><div><h1>81 il namaz vakitleri</h1><p style="margin-top:8px">${h(gunAdi(bugun))} · Diyanet</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<div class="tablo-kap"><table class="tablo"><thead><tr><th>İl</th><th>İmsak</th><th>Öğle</th><th>İkindi</th><th>Akşam</th><th>Yatsı</th></tr></thead><tbody>${satirlar
      .map(({ il, v }) => `<tr${il.slug === 'mersin' ? ' class="mersin"' : ''}><th scope="row"><a href="${namazYolu(il.slug)}">${h(il.ad)}</a></th>${v ? ['imsak', 'ogle', 'ikindi', 'aksam', 'yatsi'].map((k) => `<td>${h(v[k])}</td>`).join('') : '<td colspan="5" style="color:var(--ikincil)">güncelleniyor</td>'}</tr>`)
      .join('')}</tbody></table></div>
</div></main>`,
  });
}
