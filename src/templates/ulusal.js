// 81 il sayfaları: akaryakıt fiyatları (/akaryakit/<il>/) ve namaz/iftar vakitleri (/namaz-vakti/<il>/)
import { htmlKacis as h } from '../lib/text.js';
import { sayfa } from './layout.js';
import { SITE } from '../config.js';
import ILLER from '../iller.json' with { type: 'json' };
import { havaIkonu } from './havaIkon.js';
import { piyasaIkon } from './piyasaIkon.js';

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
// Hangi il sayfalarının üretildiği (kırık bağlantı vermemek için); build.js doldurur
const MEVCUT = {};
export function ulusalMevcutAyarla(tur, kume) {
  MEVCUT[tur] = kume;
}
const sayfaVarMi = (tur, slug) => slug === 'mersin' || !MEVCUT[tur] || MEVCUT[tur].has(slug);
const ilSecici = (yolu, aktif, tur) => {
  const l = ILLER.filter((i) => !tur || sayfaVarMi(tur, i.slug));
  return `<details class="mh-diger"><summary>Diğer iller (${l.length})</summary><div class="mh-liste">${l.map((i) => `<a href="${yolu(i.slug)}"${i.slug === aktif ? ' style="background:#dbeafe"' : ''}>${h(i.ad)}</a>`).join('')}</div></details>`;
};

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
${ilSecici(akaryakitYolu, il.slug, 'akaryakit')}
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
<div class="tablo-kap"><table class="tablo"><thead><tr><th>İl</th><th>Benzin</th><th>Motorin</th></tr></thead><tbody>${satirlar.map(({ il, o }) => `<tr${il.slug === 'mersin' ? ' class="mersin"' : ''}><th scope="row">${sayfaVarMi('akaryakit', il.slug) ? `<a href="${akaryakitYolu(il.slug)}">${h(il.ad)}</a>` : h(il.ad)}</th><td>${tl(o.benzin)}</td><td>${tl(o.motorin)}</td></tr>`).join('')}</tbody></table></div>
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
    aciklama: `${BULUNMA(il.ad)} bugün imsak ${v.imsak}, öğle ${v.ogle}, akşam (iftar) ${v.aksam}. ${kayit.hesap ? "Diyanet yöntemiyle" : "Diyanet verisiyle"} ${il.ad} namaz vakitleri${ramazan ? ' ve Ramazan imsakiyesi' : ''}.`,
    yol: namazYolu(il.slug),
    aktif: '/namaz-vakti/',
    jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) },
    ust: `<div class="su-an-bas"><div><div class="cipler"><a class="cip" href="/namaz-vakti/">81 il namaz vakitleri</a><a class="cip" href="${il.slug === 'mersin' ? '/imsakiye/' : `/imsakiye/il/${il.slug}/`}">🌙 ${h(il.ad)} imsakiye 2027</a></div><h1>${h(il.ad)} ${ramazan ? 'iftar ve namaz vakitleri' : 'namaz vakitleri'}</h1><p style="margin-top:8px">${h(gunAdi(v.tarih))}${v.hicri ? ` · ${h(v.hicri)}` : ''}</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${bugunRamazan ? `<section class="derbi-kart" style="display:block"><span class="dk-ust"><b>🌙 BUGÜN ${h(il.ad.toLocaleUpperCase('tr-TR'))} İFTAR VAKTİ</b><small>${h(v.hicri || '')}</small></span><span class="dk-orta" style="grid-template-columns:1fr"><span class="dk-merkez"><span class="dk-skor">${h(v.aksam)}</span><span class="dk-sayac" data-geri-sayim="${v.tarih}T${v.aksam}:00+03:00">–</span><small>iftara kalan · gün : saat : dk : sn</small></span></span></section>` : ''}
<div class="vakit-kartlari">${VAKIT.map(([k, ad]) => `<div class="vakit-kart${k === 'aksam' && ramazan ? ' iftar' : ''}"><small>${ad}${k === 'aksam' && ramazan ? ' (iftar)' : k === 'imsak' && ramazan ? ' (sahur sonu)' : ''}</small><b>${h(v[k])}</b></div>`).join('')}</div>
<div class="bolum-bas"><h2>${ramazan ? 'İmsakiye' : 'Önümüzdeki günler'}</h2><span>Diyanet</span></div>
<div class="tablo-kap"><table class="tablo"><thead><tr><th>Tarih</th>${VAKIT.map(([, ad]) => `<th>${ad}</th>`).join('')}</tr></thead><tbody>${liste.slice(0, ramazan ? 31 : 7).map((x) => `<tr${/ramazan/i.test(x.hicri || '') ? ' class="mersin"' : ''}><th scope="row">${h(new Date(`${x.tarih}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short', timeZone: TZ }))}</th>${VAKIT.map(([k]) => `<td>${h(x[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>
${ilSecici(namazYolu, il.slug, 'namaz')}
<p style="color:var(--ikincil);font-size:14px">${kayit.hesap ? `Vakitler, Diyanet İşleri Başkanlığı'nın kullandığı yöntem ve temkinlerle ${h(il.ad)} il merkezi için hesaplanmıştır (Diyanet takvimiyle en fazla 1 dakika fark olabilir); Diyanet verisi alındığında otomatik olarak güncellenir.` : `Vakitler Diyanet İşleri Başkanlığı'nın ${h(il.ad)} il merkezi için yayımladığı verilerdir; ilçelerde birkaç dakika fark olabilir.`}</p>
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
      .map(({ il, v }) => `<tr${il.slug === 'mersin' ? ' class="mersin"' : ''}><th scope="row">${sayfaVarMi('namaz', il.slug) ? `<a href="${namazYolu(il.slug)}">${h(il.ad)}</a>` : h(il.ad)}</th>${v ? ['imsak', 'ogle', 'ikindi', 'aksam', 'yatsi'].map((k) => `<td>${h(v[k])}</td>`).join('') : '<td colspan="5" style="color:var(--ikincil)">güncelleniyor</td>'}</tr>`)
      .join('')}</tbody></table></div>
</div></main>`,
  });
}

// ---------- 81 il hava durumu: /hava-durumu/<il>/ ----------
export const ilHavaYolu = (slug) => (slug === 'mersin' ? '/hava-durumu/' : `/hava-durumu/${slug}/`);
const gunEtiket = (t, i) => (i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : new Date(`${t}T12:00:00+03:00`).toLocaleDateString('tr-TR', { weekday: 'long', timeZone: TZ }));
const kucukHarf = (s) => String(s || '').toLocaleLowerCase('tr-TR');

export function havaIlSayfasi({ il, kayit }) {
  const hv = kayit;
  const yarin = hv.gunler[1];
  const yagisli = hv.gunler.filter((g) => g.yagis >= 1);
  const bul = BULUNMA(il.ad);
  const sss = [
    { soru: `${il.ad} bugün hava nasıl?`, cevap: `${bul} şu an ${hv.sicaklik}° ve ${kucukHarf(hv.durum)}. Bugün en yüksek ${hv.gunler[0].max}°, en düşük ${hv.gunler[0].min}° bekleniyor.` },
    ...(yarin ? [{ soru: `${il.ad} yarın hava nasıl olacak?`, cevap: `${bul} yarın ${kucukHarf(yarin.durum)} bir hava bekleniyor; sıcaklık ${yarin.min}° ile ${yarin.max}° arasında.` }] : []),
    { soru: `${bul} bu hafta yağmur yağacak mı?`, cevap: yagisli.length ? `Tahmine göre ${yagisli.map((g) => new Date(`${g.tarih}T12:00:00+03:00`).toLocaleDateString('tr-TR', { weekday: 'long', timeZone: TZ })).join(', ')} günlerinde yağış bekleniyor.` : `Önümüzdeki ${hv.gunler.length} gün için kayda değer yağış beklenmiyor.` },
  ];
  return sayfa({
    baslik: `${il.ad} hava durumu: bugün, yarın ve 7 günlük tahmin`,
    aciklama: `${bul} hava şu an ${hv.sicaklik}°, ${kucukHarf(hv.durum)}.${yarin ? ` Yarın ${yarin.min}°/${yarin.max}°.` : ''} ${il.ad} için saatlik ve 7 günlük hava tahmini.`,
    yol: ilHavaYolu(il.slug),
    aktif: '/hava-durumu/',
    jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) },
    ust: `<div class="su-an-bas"><div><div class="cipler"><a class="cip" href="/hava-durumu/iller/">81 il hava durumu</a></div><h1>${h(il.ad)} hava durumu</h1><p style="margin-top:8px">Şu an ${hv.sicaklik}° · ${h(hv.durum)} · nem %${hv.nem} · rüzgâr ${hv.ruzgar} km/sa</p></div></div><div class="widgetlar widgetlar-gun gun5">${hv.gunler.slice(0, 5).map((g, i) => `<div class="widget widget-gun"><span class="widget-etiket">${gunEtiket(g.tarih, i)}</span>${havaIkonu(g.durum, 56)}<span class="hava-derece kucuk">${g.max}°</span><span class="hava-durum">${h(g.durum)}</span><span class="hava-uc">↓ en düşük ${g.min}°</span></div>`).join('')}</div>`,
    icerik: `<main class="kap govde"><div class="ana">
<p class="giris-metni">${h(bul)} hava şu an <strong>${hv.sicaklik}°</strong> ve ${h(kucukHarf(hv.durum))}.${yarin ? ` Yarın en yüksek ${yarin.max}°, en düşük ${yarin.min}° bekleniyor (${h(kucukHarf(yarin.durum))}).` : ''}</p>
${hv.saatlik?.length ? `<div class="bolum-bas"><h2>Saatlik tahmin</h2><span>önümüzdeki 24 saat</span></div><div class="saatlik">${hv.saatlik.map((s) => `<div><small>${String(s.saat).padStart(2, '0')}:00</small>${havaIkonu(s.durum, 34)}<b>${s.sicaklik}°</b></div>`).join('')}</div>` : ''}
<div class="bolum-bas"><h2>${hv.gunler.length} günlük tahmin</h2></div>
<div class="tablo-kap"><table class="tablo"><thead><tr><th>Gün</th><th>Durum</th><th>En yüksek</th><th>En düşük</th><th>Yağış</th><th>Rüzgâr</th></tr></thead><tbody>${hv.gunler.map((g, i) => `<tr><th scope="row">${gunEtiket(g.tarih, i)}</th><td>${h(g.durum)}</td><td><strong>${g.max}°</strong></td><td>${g.min}°</td><td>${g.yagis ? `${g.yagis} mm` : '–'}</td><td>${g.ruzgar} km/sa</td></tr>`).join('')}</tbody></table></div>
<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>
${ilSecici(ilHavaYolu, il.slug, 'hava')}
<p style="color:var(--ikincil);font-size:14px">Veri: MET Norway (yr.no), CC BY 4.0 · ${h(il.ad)} il merkezi için tahmin. Son güncelleme: ${h(saatStr(hv.guncelleme))}. Resmî uyarılar için MGM'yi takip edin.</p>
</div></main>`,
  });
}

export function havaTurkiyeSayfasi({ veri, mersin }) {
  const satirlar = ILLER.map((il) => ({ il, hv: il.slug === 'mersin' ? mersin : veri[il.slug] })).filter((x) => x.hv);
  const sirali = [...satirlar].sort((a, b) => (b.hv.gunler?.[0]?.max ?? -99) - (a.hv.gunler?.[0]?.max ?? -99));
  return sayfa({
    baslik: '81 il hava durumu: bugün il il sıcaklık ve tahmin',
    aciklama: "Türkiye'nin 81 ilinde bugünkü hava durumu, en yüksek ve en düşük sıcaklıklar. En sıcak ve en soğuk iller.",
    yol: '/hava-durumu/iller/',
    aktif: '/hava-durumu/',
    ust: `<div class="su-an-bas"><div><h1>81 il hava durumu</h1><p style="margin-top:8px">${satirlar.length} il · bugün</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${sirali.length > 2 ? `<section class="ekonomi-bugun"><div class="eb-kareler"><div class="eb-kare"><small>Bugün en sıcak</small><b>${h(sirali[0].il.ad)}</b><em>${sirali[0].hv.gunler[0].max}°</em></div><div class="eb-kare"><small>Bugün en serin</small><b>${h(sirali.at(-1).il.ad)}</b><em>${sirali.at(-1).hv.gunler[0].max}°</em></div></div></section>` : ''}
<div class="tablo-kap"><table class="tablo"><thead><tr><th>İl</th><th>Şu an</th><th>Bugün</th><th>En yüksek</th><th>En düşük</th></tr></thead><tbody>${satirlar.map(({ il, hv }) => `<tr${il.slug === 'mersin' ? ' class="mersin"' : ''}><th scope="row">${sayfaVarMi('hava', il.slug) ? `<a href="${ilHavaYolu(il.slug)}">${h(il.ad)}</a>` : h(il.ad)}</th><td>${hv.sicaklik}°</td><td>${h(hv.gunler?.[0]?.durum || hv.durum)}</td><td><strong>${hv.gunler?.[0]?.max ?? '–'}°</strong></td><td>${hv.gunler?.[0]?.min ?? '–'}°</td></tr>`).join('')}</tbody></table></div>
<p style="color:var(--ikincil);font-size:14px">Veri: MET Norway (yr.no), CC BY 4.0.</p>
</div></main>`,
  });
}

// ---------- Altın ve döviz sayfaları: /piyasalar/<kalem>/ ----------
export const PIYASA_KALEMLERI = [
  { k: 'GRA', slug: 'gram-altin', ad: 'Gram altın', tur: 'altin', birim: 'gram', miktar: [1, 5, 10, 20, 50, 100] },
  { k: 'CEYREKALTIN', slug: 'ceyrek-altin', ad: 'Çeyrek altın', tur: 'altin', birim: 'adet', miktar: [1, 2, 3, 5, 10, 20] },
  { k: 'YARIMALTIN', slug: 'yarim-altin', ad: 'Yarım altın', tur: 'altin', birim: 'adet', miktar: [1, 2, 3, 5, 10] },
  { k: 'TAMALTIN', slug: 'tam-altin', ad: 'Tam altın', tur: 'altin', birim: 'adet', miktar: [1, 2, 3, 5, 10] },
  { k: 'CUMHURIYETALTINI', slug: 'cumhuriyet-altini', ad: 'Cumhuriyet altını', tur: 'altin', birim: 'adet', miktar: [1, 2, 3, 5, 10] },
  { k: 'ATAALTIN', slug: 'ata-altin', ad: 'Ata altın', tur: 'altin', birim: 'adet', miktar: [1, 2, 3, 5, 10] },
  { k: 'YIA', slug: '22-ayar-bilezik', ad: '22 ayar bilezik', tur: 'altin', birim: 'gram', miktar: [1, 5, 10, 20, 50, 100] },
  { k: '18AYARALTIN', slug: '18-ayar-altin', ad: '18 ayar altın', tur: 'altin', birim: 'gram', miktar: [1, 5, 10, 20, 50] },
  { k: '14AYARALTIN', slug: '14-ayar-altin', ad: '14 ayar altın', tur: 'altin', birim: 'gram', miktar: [1, 5, 10, 20, 50] },
  { k: 'HAS', slug: 'has-altin', ad: 'Has altın', tur: 'altin', birim: 'gram', miktar: [1, 5, 10, 50, 100] },
  { k: 'GUMUS', slug: 'gumus', ad: 'Gümüş', tur: 'altin', birim: 'gram', miktar: [1, 10, 50, 100, 500, 1000] },
  { k: 'USD', slug: 'dolar', ad: 'Dolar', uzun: 'ABD doları', tur: 'doviz', birim: 'dolar', isaret: '$', miktar: [1, 10, 50, 100, 500, 1000, 5000, 10000] },
  { k: 'EUR', slug: 'euro', ad: 'Euro', uzun: 'Euro', tur: 'doviz', birim: 'euro', isaret: '€', miktar: [1, 10, 50, 100, 500, 1000, 5000, 10000] },
  { k: 'GBP', slug: 'sterlin', ad: 'Sterlin', uzun: 'İngiliz sterlini', tur: 'doviz', birim: 'sterlin', isaret: '£', miktar: [1, 10, 50, 100, 500, 1000, 5000] },
  { k: 'CHF', slug: 'isvicre-frangi', ad: 'İsviçre frangı', uzun: 'İsviçre frangı', tur: 'doviz', birim: 'frank', isaret: 'CHF', miktar: [1, 10, 100, 500, 1000] },
  { k: 'SAR', slug: 'riyal', ad: 'Riyal', uzun: 'Suudi riyali', tur: 'doviz', birim: 'riyal', isaret: 'SAR', miktar: [1, 10, 100, 500, 1000, 5000] },
  { k: 'RUB', slug: 'ruble', ad: 'Ruble', uzun: 'Rus rublesi', tur: 'doviz', birim: 'ruble', isaret: '₽', miktar: [1, 100, 1000, 5000, 10000] },
];
export const piyasaKalemYolu = (slug) => `/piyasalar/${slug}/`;
const para = (n, d = 2) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
const yonHtml = (d) => (d == null ? '–' : `<span class="${d > 0 ? 'artis' : d < 0 ? 'dusus' : ''}">${d > 0 ? '▲' : d < 0 ? '▼' : '•'} %${para(Math.abs(d))}</span>`);

function cizgi(noktalar) {
  if (noktalar.length < 2) return '';
  const W = 900, H = 200, P = 8;
  const d = noktalar.map((x) => x.v);
  const min = Math.min(...d), max = Math.max(...d), ara = max - min || 1;
  const xy = noktalar.map((x, i) => [P + (i * (W - 2 * P)) / (noktalar.length - 1), H - P - ((x.v - min) / ara) * (H - 2 * P)]);
  const yol = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const renk = d.at(-1) >= d[0] ? '#16a34a' : '#dc2626';
  return `<figure class="piyasa-grafik"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Fiyat grafiği"><path d="${yol}L${W - P},${H}L${P},${H}Z" fill="${renk}" opacity=".08"/><path d="${yol}" fill="none" stroke="${renk}" stroke-width="2.5" stroke-linejoin="round"/></svg><figcaption><span>${h(new Date(`${noktalar[0].g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }))}</span><span>en düşük ${para(min)} ₺ · en yüksek ${para(max)} ₺</span><span>${h(new Date(`${noktalar.at(-1).g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }))}</span></figcaption></figure>`;
}

export function piyasaKalemSayfasi({ kalem, servis, gecmis }) {
  const p = servis.piyasa;
  const x = [...(p.altinlar || []), ...(p.dovizler || [])].find((y) => y.k === kalem.k);
  const doviz = kalem.tur === 'doviz';
  const baslikAd = doviz ? `${kalem.ad} kuru` : `${kalem.ad} fiyatı`;
  const noktalar = Object.keys(gecmis?.gunler || {}).sort().slice(-90).map((g) => ({ g, v: gecmis.gunler[g][kalem.k] })).filter((n) => n.v);
  const son7 = noktalar.slice(-8);
  const birimTl = (m) => para(m * x.satis, x.satis * m >= 1000 ? 0 : 2);
  const kucukAd = kalem.ad.toLocaleLowerCase('tr-TR');
  const etiket = (m) => (doviz ? `${m.toLocaleString('tr-TR')} ${kalem.birim}` : kucukAd.startsWith(kalem.birim) ? `${m.toLocaleString('tr-TR')} ${kucukAd}` : `${m.toLocaleString('tr-TR')} ${kalem.birim} ${kucukAd}`);
  const sss = doviz
    ? [
        { soru: `${kalem.ad} bugün kaç TL?`, cevap: `${kalem.uzun} bugün ${para(x.satis, 4)} TL'den satılıyor, alış fiyatı ${para(x.alis, 4)} TL (serbest piyasa).` },
        { soru: `100 ${kalem.birim} kaç TL?`, cevap: `Güncel satış kuruyla 100 ${kalem.birim} ${birimTl(100)} TL ediyor.` },
        { soru: `1000 TL kaç ${kalem.birim}?`, cevap: `Güncel kurla 1.000 TL yaklaşık ${para(1000 / x.satis)} ${kalem.birim} ediyor.` },
      ]
    : [
        { soru: `${kalem.ad} bugün kaç TL?`, cevap: `${kalem.ad} bugün ${para(x.satis)} TL'den satılıyor, alış fiyatı ${para(x.alis)} TL (serbest piyasa; kuyumcuda işçilik ve makas farkı olabilir).` },
        { soru: `${kalem.ad} alış ve satış farkı ne kadar?`, cevap: `Şu an alış ile satış arasındaki fark ${para(x.satis - x.alis)} TL (%${para(((x.satis - x.alis) / x.satis) * 100)}).` },
        { soru: `${etiket(kalem.miktar[2])} kaç TL?`, cevap: `Güncel satış fiyatıyla ${etiket(kalem.miktar[2])} ${birimTl(kalem.miktar[2])} TL ediyor.` },
      ];
  const digerleri = PIYASA_KALEMLERI.filter((y) => y.tur === kalem.tur && y.k !== kalem.k);
  return sayfa({
    baslik: doviz ? `${kalem.ad} kaç TL? Bugün canlı ${kalem.ad.toLocaleLowerCase('tr-TR')} kuru ve çevirici` : `${kalem.ad} ne kadar? Bugün canlı ${kalem.ad.toLocaleLowerCase('tr-TR')} fiyatı`,
    aciklama: `${baslikAd} bugün ${para(x.satis, doviz ? 4 : 2)} TL (satış). Alış-satış, günlük değişim, ${doviz ? 'kur çevirici' : 'altın hesaplama'} ve son günlerin fiyat grafiği.`,
    yol: piyasaKalemYolu(kalem.slug),
    aktif: '/piyasalar/',
    jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) },
    ust: `<div class="su-an-bas"><div><div class="cipler"><a class="cip" href="/piyasalar/">Piyasalar</a></div><h1 class="pk-baslik">${piyasaIkon(kalem.k, 46)}${h(baslikAd)}</h1><p style="margin-top:8px">Canlı · sayfa açıkken dakikada bir yenilenir · son güncelleme <span data-p-saat>${h(saatStr(p.guncelleme))}</span></p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<section class="piyasa-kalem">
<div class="pk-ana"><span class="pk-ikon">${piyasaIkon(kalem.k, 132)}</span><small>Satış</small><span data-tg="${kalem.k}" data-alan="satis"><strong>${para(x.satis, doviz ? 4 : 2)}</strong></span><em>₺${doviz ? ` / 1 ${h(kalem.isaret)}` : ` / ${kalem.birim}`}</em></div>
<div class="pk-yan"><div><small>Alış</small><b data-tg="${kalem.k}" data-alan="alis">${x.alis ? para(x.alis, doviz ? 4 : 2) : '–'}</b></div><div><small>Günlük değişim</small><b data-tg="${kalem.k}" data-alan="degisim">${yonHtml(x.degisim)}</b></div></div>
</section>
<section class="hesap" data-hesap data-k="${kalem.k}" data-birim="${h(kalem.birim)}" data-fiyat="${x.satis}">
<h2>${doviz ? 'Kur çevirici' : 'Hesaplama'}</h2>
<div class="hesap-satir"><label><input type="number" inputmode="decimal" min="0" step="any" value="${doviz ? 100 : 1}" data-hesap-girdi> <span>${h(etiket(1).replace(/^1 /, ''))}</span></label><span class="hesap-esit">=</span><b data-hesap-sonuc>${birimTl(doviz ? 100 : 1)} TL</b></div>
${doviz ? `<div class="hesap-satir"><label><input type="number" inputmode="decimal" min="0" step="any" value="1000" data-hesap-ters> <span>TL</span></label><span class="hesap-esit">=</span><b data-hesap-ters-sonuc>${para(1000 / x.satis)} ${h(kalem.birim)}</b></div>` : ''}
</section>
<div class="bolum-bas"><h2>${doviz ? `${kalem.ad} kaç TL?` : 'Miktara göre fiyat'}</h2><span>satış fiyatıyla</span></div>
<div class="tablo-kap"><table class="tablo"><thead><tr><th>Miktar</th><th>Tutar</th></tr></thead><tbody>${kalem.miktar.map((m) => `<tr><th scope="row">${h(etiket(m))}</th><td><strong>${birimTl(m)} TL</strong></td></tr>`).join('')}</tbody></table></div>
${noktalar.length >= 2 ? `<div class="bolum-bas"><h2>Son ${noktalar.length} gün</h2><span>günlük kapanış (satış)</span></div>${cizgi(noktalar)}<div class="tablo-kap"><table class="tablo"><thead><tr><th>Tarih</th><th>Fiyat</th><th>Değişim</th></tr></thead><tbody>${son7.slice(1).reverse().map((n, i, arr) => { const o = son7[son7.length - 2 - i]; return `<tr><th scope="row">${h(new Date(`${n.g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' }))}</th><td>${para(n.v, doviz ? 4 : 2)} ₺</td><td>${yonHtml(((n.v - o.v) / o.v) * 100)}</td></tr>`; }).join('')}</tbody></table></div>` : ''}
<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>
<div class="bolum-bas"><h2>${doviz ? 'Diğer kurlar' : 'Diğer altın fiyatları'}</h2><a class="bolum-link" href="/piyasalar/">Tüm piyasalar →</a></div>
<div class="pk-diger">${digerleri.map((y) => `<a href="${piyasaKalemYolu(y.slug)}">${piyasaIkon(y.k, 34)}<span>${h(y.ad)}</span></a>`).join('')}</div>
<p style="color:var(--ikincil);font-size:14px">Kaynak: Truncgil Finans (serbest piyasa). Kuyumcu ve bankalarda fiyatlar farklı olabilir. Bu sayfa yatırım tavsiyesi değildir.</p>
</div></main>`,
  });
}

// ---------- Türkiye geneli son depremler: /son-depremler/ ve /son-depremler/<il>/ ----------

export const depremIlYolu = (slug) => `/son-depremler/${slug}/`;
const ILE_GORE = new Map(ILLER.map((i) => [i.ad.toLocaleLowerCase('tr-TR'), i]));
export const depremIli = (d) => ILE_GORE.get(String(d.il || '').toLocaleLowerCase('tr-TR')) || null;
const bSinif = (b) => (b >= 5 ? 'b5' : b >= 4 ? 'b4' : b >= 3 ? 'b3' : 'b2');
const once = (t, simdi) => {
  const dk = Math.round((simdi - new Date(t)) / 60e3);
  if (dk < 60) return `${Math.max(dk, 1)} dk önce`;
  if (dk < 24 * 60) return `${Math.floor(dk / 60)} saat önce`;
  return new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ });
};
function depremTablo(liste, simdi, ilLink = () => false) {
  return `<div class="dp-filtre" role="group" aria-label="Büyüklüğe göre süz"><button type="button" class="aktif" data-dp-min="0">Tümü</button><button type="button" data-dp-min="3">3 ve üzeri</button><button type="button" data-dp-min="4">4 ve üzeri</button></div>
<div class="tablo-kap"><table class="tablo dp-tablo"><thead><tr><th>Büyüklük</th><th>Yer</th><th>Derinlik</th><th>Zaman</th></tr></thead><tbody>${liste
    .map((d) => {
      const il = depremIli(d);
      return `<tr data-b="${d.b}"${/mersin/i.test(d.il) ? ' class="mersin"' : ''}><td><span class="dp-b ${bSinif(d.b)}">${d.b.toFixed(1).replace('.', ',')}</span></td><td><b>${h(d.ilce ? `${d.ilce}` : d.yer)}</b>${d.il ? ` <small>${il && ilLink(il) ? `<a href="${depremIlYolu(il.slug)}">${h(d.il)}</a>` : h(d.il)}</small>` : ''}</td><td>${String(d.d).replace('.', ',')} km</td><td data-zaman="${d.t}">${h(once(d.t, simdi))}</td></tr>`;
    })
    .join('')}</tbody></table></div>`;
}
function depremOzet(liste, simdi, yerAdi) {
  const gun = Math.max(1, Math.ceil((simdi - new Date(liste.at(-1)?.t || simdi)) / 864e5));
  const g24 = liste.filter((d) => simdi - new Date(d.t) < 864e5);
  const enB = [...liste].sort((a, b) => b.b - a.b)[0];
  const enB24 = [...g24].sort((a, b) => b.b - a.b)[0];
  return `<section class="ekonomi-bugun"><div class="eb-kareler"><div class="eb-kare"><small>Son 24 saat</small><b>${g24.length} deprem</b><em>${yerAdi}</em></div><div class="eb-kare"><small>24 saatin en büyüğü</small><b>${enB24 ? enB24.b.toFixed(1).replace('.', ',') : '–'}</b><em>${enB24 ? h(enB24.ilce || enB24.il || enB24.yer) : 'kayıt yok'}</em></div><div class="eb-kare"><small>Son ${gun} günün en büyüğü</small><b>${enB ? enB.b.toFixed(1).replace('.', ',') : '–'}</b><em>${enB ? h([enB.ilce, enB.il].filter(Boolean).join(', ') || enB.yer) : ''}</em></div><div class="eb-kare"><small>Son deprem</small><b>${liste[0] ? h(once(liste[0].t, simdi)) : '–'}</b><em>${liste[0] ? h(liste[0].il || liste[0].yer) : ''}</em></div></div></section>`;
}

export function sonDepremlerSayfasi({ kayit, simdi }) {
  const liste = kayit.liste;
  const son = liste.filter((d) => simdi - new Date(d.t) < 7 * 864e5).slice(0, 300);
  const ilSay = new Map();
  for (const d of liste) {
    const i = depremIli(d);
    if (i) ilSay.set(i.slug, (ilSay.get(i.slug) || 0) + 1);
  }
  const ilSayfasiVar = (i) => i && (ilSay.get(i.slug) || 0) >= 2;
  const iller = [...new Set(liste.map((d) => depremIli(d)).filter(ilSayfasiVar))].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  const buyuk = liste.filter((d) => d.b >= 4).slice(0, 10);
  return sayfa({
    baslik: 'Son depremler: Türkiye\'de bugün deprem nerede oldu? (AFAD, canlı liste)',
    aciklama: `Türkiye'de son depremler listesi: son 24 saatte ${liste.filter((d) => simdi - new Date(d.t) < 864e5).length} deprem. ${liste[0] ? `Son deprem ${liste[0].il || liste[0].yer}, büyüklük ${liste[0].b}.` : ''} AFAD verisiyle büyüklük, yer ve derinlik.`,
    yol: '/son-depremler/',
    aktif: '/deprem/',
    ust: `<div class="su-an-bas"><div><div class="cipler"><a class="cip" href="/deprem/">Mersin ve çevresi</a></div><h1>Son depremler</h1><p style="margin-top:8px">Türkiye geneli · AFAD · son güncelleme ${h(saatStr(kayit.guncelleme))}</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${depremOzet(liste, simdi, 'Türkiye geneli')}
${buyuk.length ? `<div class="bolum-bas"><h2>4 ve üzeri depremler</h2></div><div class="dp-buyuk">${buyuk.map((d) => { const il = depremIli(d); return `<a class="dp-kart" href="${ilSayfasiVar(il) ? depremIlYolu(il.slug) : '#son-7-gun'}"><span class="dp-b ${bSinif(d.b)}">${d.b.toFixed(1).replace('.', ',')}</span><span><b>${h([d.ilce, d.il].filter(Boolean).join(', ') || d.yer)}</b><small>${h(new Date(d.t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ }))} · ${String(d.d).replace('.', ',')} km derinlik</small></span></a>`; }).join('')}</div>` : ''}
<div class="bolum-bas" id="son-7-gun"><h2>Son 7 gün</h2><span>büyüklük 2 ve üzeri · en yeni üstte</span></div>
${depremTablo(son, simdi, ilSayfasiVar)}
<div class="bolum-bas"><h2>İllere göre son depremler</h2></div>
<div class="mh-liste">${iller.map((i) => `<a href="${depremIlYolu(i.slug)}">${h(i.ad)}</a>`).join('')}</div>
<p style="color:var(--ikincil);font-size:14px">Veri: AFAD Deprem Dairesi Başkanlığı. Liste yaklaşık 30 dakikada bir güncellenir; ilk dakikalarda büyüklük ve yer bilgisi AFAD tarafından revize edilebilir. Resmî açıklamalar için AFAD'ı takip edin.</p>
</div></main>`,
  });
}

export function ilDepremSayfasi({ il, liste, simdi, guncelleme }) {
  const bul = BULUNMA(il.ad);
  const enB = [...liste].sort((a, b) => b.b - a.b)[0];
  const sss = [
    { soru: `${bul} en son ne zaman deprem oldu?`, cevap: `${bul} kaydedilen son deprem ${new Date(liste[0].t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ })} tarihinde ${liste[0].ilce || il.ad} merkezli, ${liste[0].b.toFixed(1).replace('.', ',')} büyüklüğündeydi.` },
    { soru: `${bul} son günlerde kaç deprem oldu?`, cevap: `AFAD verilerine göre ${bul} son ${Math.max(1, Math.ceil((Date.now() - new Date(liste.at(-1).t)) / 864e5))} günde büyüklüğü 2 ve üzeri ${liste.length} deprem kaydedildi; en büyüğü ${enB.b.toFixed(1).replace('.', ',')} büyüklüğündeydi (${enB.ilce || il.ad}).` },
  ];
  return sayfa({
    baslik: `${il.ad} deprem: ${bul} son depremler (bugün ve son günler)`,
    aciklama: `${bul} son depremler: son deprem ${liste[0].ilce || il.ad} merkezli ${liste[0].b.toFixed(1).replace('.', ',')}. Son günlerde ${liste.length} deprem. AFAD verisiyle liste.`,
    yol: depremIlYolu(il.slug),
    aktif: '/deprem/',
    jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) },
    ust: `<div class="su-an-bas"><div><div class="cipler"><a class="cip" href="/son-depremler/">Türkiye geneli</a></div><h1>${h(il.ad)} son depremler</h1><p style="margin-top:8px">AFAD · son güncelleme ${h(saatStr(guncelleme))}</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${depremOzet(liste, simdi, il.ad)}
${depremTablo(liste.slice(0, 200), simdi)}
<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>
<p><a class="bolum-link" href="/son-depremler/">Türkiye genelindeki son depremler →</a></p>
<p style="color:var(--ikincil);font-size:14px">Veri: AFAD Deprem Dairesi Başkanlığı. Büyüklüğü 2 ve üzeri depremler listelenir.</p>
</div></main>`,
  });
}

// ---------- 81 il okullar tatil mi: /okullar-tatil-mi/<il>/ ve /kar-tatili/ ----------
export const okulIlYolu = (slug) => (slug === 'mersin' ? '/okullar-tatil-mi/' : `/okullar-tatil-mi/${slug}/`);
const KAR = /kar|karla|buz/i;
const gunUzun = (g) => new Date(`${g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: TZ });
const kararMetni = (k) => (k.kapsam === 'ilce' ? `${k.ilceler.length ? k.ilceler.join(', ') : 'bazı ilçelerde'}${k.ilceler.length ? ' ilçelerinde' : ''}` : 'ilin tamamında');

export function okulIlSayfasi({ il, kararlar, hava, simdi }) {
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: TZ });
  const yarin = new Date(simdi + 864e5).toLocaleDateString('sv-SE', { timeZone: TZ });
  const b = kararlar.filter((k) => k.gunler.includes(bugun));
  const y = kararlar.filter((k) => k.gunler.includes(yarin));
  const gecmis = kararlar.filter((k) => k.gunler.at(-1) < bugun).slice(0, 10);
  const bul = BULUNMA(il.ad);
  const yh = hava?.gunler?.find((g) => g.tarih === yarin);
  const karBekleniyor = yh && (KAR.test(yh.durum) || yh.min <= 0);
  const durum = y.length ? `${bul} yarın (${gunUzun(yarin)}) okullar ${kararMetni(y[0])} tatil. Kararı ${y[0].kurum} açıkladı.` : b.length ? `${bul} bugün okullar ${kararMetni(b[0])} tatil. Yarın için henüz açıklanmış bir tatil kararı yok.` : `${il.ad} için bugün ve yarın açıklanmış bir okul tatili kararı yok; okullar açık.`;
  const sss = [
    { soru: `${bul} yarın okullar tatil mi?`, cevap: y.length ? `Evet. ${y[0].kurum}, ${gunUzun(yarin)} günü ${kararMetni(y[0])} eğitime ara verildiğini açıkladı.` : `Şu an ${il.ad} için ${gunUzun(yarin)} gününe ait bir tatil kararı yok. Karar genellikle akşam saatlerinde valilik tarafından duyurulur; bu sayfa yarım saatte bir güncellenir.` },
    { soru: `${il.ad} kar tatili kararını kim verir?`, cevap: `Okulların hava koşulları nedeniyle tatil edilmesine il genelinde ${il.ad} Valiliği, ilçe bazında kaymakamlıklar karar verir. Resmî duyurular valiliğin internet sitesi ve sosyal medya hesaplarından yapılır.` },
  ];
  return sayfa({
    baslik: `${bul} yarın okullar tatil mi? ${il.ad} kar tatili son dakika`,
    aciklama: `${durum} ${yh ? `Yarın ${il.ad} hava durumu: ${yh.durum.toLocaleLowerCase('tr-TR')}, ${yh.min}°/${yh.max}°.` : ''} Valilik kar tatili kararları anlık takipte.`.replace(/\s+/g, ' ').trim(),
    yol: okulIlYolu(il.slug),
    aktif: '/okullar-tatil-mi/',
    jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) },
    ust: `<div class="su-an-bas"><div><div class="cipler"><a class="cip" href="/kar-tatili/">Tatil olan iller</a></div><h1>${h(bul)} okullar tatil mi?</h1><p style="margin-top:8px">Son kontrol: ${h(saatStr(simdi))} · yarım saatte bir güncellenir</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<section class="okul-durum ${y.length || b.length ? 'tatil' : 'acik'}"><span>${y.length || b.length ? '🏫❄️' : '🏫'}</span><div><b>${y.length ? 'Yarın okullar tatil' : b.length ? 'Bugün okullar tatil' : 'Okullar açık'}</b><p>${h(durum)}</p>${[...y, ...b].slice(0, 1).map((k) => `<small>${h(k.not || '')} Kaynak: <a href="${h(k.link)}" rel="noopener" target="_blank">${h(k.kaynak)}</a></small>`).join('')}</div></section>
${yh ? `<section class="ekonomi-bugun"><div class="eb-bas"><div><h2>Yarın ${h(il.ad)} hava durumu</h2><p>${h(gunUzun(yarin))}: ${h(yh.durum.toLocaleLowerCase('tr-TR'))}, en düşük ${yh.min}°, en yüksek ${yh.max}°.${karBekleniyor ? ' Kar ya da buzlanma riski var; valilik kararını bu akşam takip edin.' : ''}</p></div></div></section>` : ''}
${gecmis.length ? `<div class="bolum-bas"><h2>Son tatil kararları</h2></div><div class="tablo-kap"><table class="tablo"><thead><tr><th>Gün</th><th>Kapsam</th><th>Açıklayan</th></tr></thead><tbody>${gecmis.map((k) => `<tr><th scope="row">${h(k.gunler.map(gunUzun).join(', '))}</th><td>${h(kararMetni(k))}</td><td>${h(k.kurum)}</td></tr>`).join('')}</tbody></table></div>` : ''}
<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>
${ilSecici(okulIlYolu, il.slug)}
<p style="color:var(--ikincil);font-size:14px">Kararlar valilik açıklamalarını aktaran Anadolu Ajansı ve TRT Haber haberlerinden otomatik derlenir. Kesin bilgi için ${h(il.ad)} Valiliği duyurularını esas alın. Hava tahmini: MET Norway (yr.no).</p>
</div></main>`,
  });
}

export function karTatiliSayfasi({ kararlar, simdi }) {
  const bugun = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: TZ });
  const yarin = new Date(simdi + 864e5).toLocaleDateString('sv-SE', { timeZone: TZ });
  const ilAd = (s) => ILLER.find((i) => i.slug === s)?.ad || s;
  const liste = (g) => kararlar.filter((k) => k.gunler.includes(g));
  const blok = (g, baslik) => {
    const l = liste(g);
    return `<div class="bolum-bas"><h2>${baslik}</h2><span>${h(gunUzun(g))}</span></div>${l.length ? `<div class="tablo-kap"><table class="tablo"><thead><tr><th>İl</th><th>Kapsam</th><th>Açıklayan</th></tr></thead><tbody>${l.map((k) => `<tr><th scope="row"><a href="${okulIlYolu(k.il)}">${h(ilAd(k.il))}</a></th><td>${h(kararMetni(k))}</td><td>${h(k.kurum)} · <a href="${h(k.link)}" rel="noopener" target="_blank">${h(k.kaynak)}</a></td></tr>`).join('')}</tbody></table></div>` : `<div class="bos">${g === yarin ? 'Yarın için şu ana kadar açıklanmış bir tatil kararı yok. Kararlar genellikle akşam saatlerinde gelir; sayfa yarım saatte bir güncellenir.' : 'Bugün okulların tatil olduğu il yok.'}</div>`}`;
  };
  const sayY = new Set(liste(yarin).map((k) => k.il)).size;
  return sayfa({
    baslik: `Yarın okullar tatil mi? Kar tatili olan iller (${new Date(simdi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: TZ })} güncel liste)`,
    aciklama: sayY ? `Yarın ${sayY} ilde okullar tatil: ${[...new Set(liste(yarin).map((k) => ilAd(k.il)))].join(', ')}. Valiliklerin kar tatili kararları anlık liste.` : 'Valiliklerin açıkladığı kar tatili ve okul tatili kararları: bugün ve yarın okulların tatil olduğu iller, anlık liste.',
    yol: '/kar-tatili/',
    aktif: '/okullar-tatil-mi/',
    ust: `<div class="su-an-bas"><div><h1>Okulların tatil olduğu iller</h1><p style="margin-top:8px">Kar tatili ve valilik kararları · son kontrol ${h(saatStr(simdi))}</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${blok(yarin, 'Yarın tatil olan iller')}
${blok(bugun, 'Bugün tatil olan iller')}
<div class="bolum-bas"><h2>İlinizi seçin</h2></div>
<div class="mh-liste">${ILLER.map((i) => `<a href="${okulIlYolu(i.slug)}">${h(i.ad)}</a>`).join('')}</div>
<p style="color:var(--ikincil);font-size:14px">Kararlar valilik açıklamalarını aktaran Anadolu Ajansı ve TRT Haber haberlerinden otomatik derlenir. Kesin bilgi için ilinizin valiliğini esas alın.</p>
</div></main>`,
  });
}

// ---------- Mersin ve çevresi depremler: /deprem/ ----------
const CEVRE_ILLER = new Set(['mersin', 'adana', 'antalya', 'karaman', 'konya', 'nigde', 'hatay', 'osmaniye', 'kahramanmaras']);
const MERSIN_MERKEZ = { lat: 36.8, lon: 34.63 };
const km = (a, b) => {
  const r = (x) => (x * Math.PI) / 180;
  const d = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(d));
};
export function mersinDepremSayfasi({ kayit, yerel, simdi }) {
  const tum = kayit?.liste || [];
  const cevre = tum.filter((d) => (depremIli(d) && CEVRE_ILLER.has(depremIli(d).slug)) || (!d.il && km(MERSIN_MERKEZ, d) < 200));
  // AFAD bölge listesindeki küçük (M<2) Mersin depremlerini de ekle
  for (const d of yerel || []) {
    const t = new Date(d.tarih).toISOString();
    if (!cevre.some((x) => Math.abs(new Date(x.t) - new Date(t)) < 60e3)) cevre.push({ b: d.buyukluk, yer: d.yer, il: d.il || '', ilce: d.ilce || '', d: d.derinlik, lat: d.lat, lon: d.lon, t });
  }
  cevre.sort((a, b) => b.t.localeCompare(a.t));
  const mersin = cevre.filter((d) => /mersin/i.test(d.il) || /mersin/i.test(d.yer));
  const enB = [...mersin].sort((a, b) => b.b - a.b)[0];
  const gun = Math.max(1, Math.ceil((simdi - new Date(cevre.at(-1)?.t || simdi)) / 864e5));
  const son = mersin[0];
  const tarihStr = (t) => new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ });
  const sss = [
    { soru: "Mersin'de en son ne zaman deprem oldu?", cevap: son ? `Mersin'de kaydedilen son deprem ${tarihStr(son.t)} tarihinde ${son.ilce || 'Mersin'} merkezli, ${son.b.toFixed(1).replace('.', ',')} büyüklüğündeydi (AFAD).` : `Son ${gun} günde Mersin merkezli kayıtlı deprem yok.` },
    { soru: "Mersin'de bugün deprem oldu mu?", cevap: (() => { const b = mersin.filter((d) => simdi - new Date(d.t) < 864e5); return b.length ? `Son 24 saatte Mersin'de ${b.length} deprem kaydedildi; en büyüğü ${Math.max(...b.map((d) => d.b)).toFixed(1).replace('.', ',')} büyüklüğündeydi.` : "Son 24 saatte Mersin merkezli kayıtlı bir deprem yok."; })() },
    { soru: "Mersin deprem bölgesi mi?", cevap: "Mersin, Türkiye Deprem Tehlike Haritası'na göre ağırlıklı olarak orta ve düşük tehlike bölgesindedir; ancak çevresindeki Doğu Anadolu ve Ölü Deniz fay sistemleri ile Kıbrıs yayı nedeniyle bölgedeki depremler Mersin'de hissedilebilir." },
  ];
  return sayfa({
    baslik: "Mersin deprem: Mersin ve çevresinde son depremler (AFAD, canlı liste)",
    aciklama: `Mersin'de son depremler: ${son ? `son deprem ${tarihStr(son.t)}, ${son.ilce || 'Mersin'} merkezli ${son.b.toFixed(1).replace('.', ',')}.` : ''} Mersin, Adana, Antalya, Karaman ve Akdeniz'de son ${gun} günün depremleri, büyüklük ve derinlik.`,
    yol: '/deprem/',
    jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) },
    ust: `<div class="su-an-bas"><div><div class="cipler"><a class="cip" href="/son-depremler/">Türkiye geneli</a></div><h1>Mersin ve çevresinde son depremler</h1><p style="margin-top:8px">AFAD · son güncelleme ${h(saatStr(kayit?.guncelleme || simdi))}</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<section class="ekonomi-bugun"><div class="eb-kareler"><div class="eb-kare"><small>Mersin · son ${gun} gün</small><b>${mersin.length} deprem</b><em>AFAD kayıtları*</em></div><div class="eb-kare"><small>Mersin'de en büyüğü</small><b>${enB ? enB.b.toFixed(1).replace('.', ',') : '–'}</b><em>${enB ? h(enB.ilce || enB.yer) : 'kayıt yok'}</em></div><div class="eb-kare"><small>Mersin'de son deprem</small><b>${son ? h(once(son.t, simdi)) : '–'}</b><em>${son ? h(son.ilce || son.yer) : ''}</em></div><div class="eb-kare"><small>Çevre illerle birlikte</small><b>${cevre.length} deprem</b><em>Adana, Antalya, Karaman, Hatay…</em></div></div></section>
<div class="bolum-bas"><h2>Mersin ve çevre illerde son depremler</h2><span>en yeni üstte</span></div>
${cevre.length ? depremTablo(cevre.slice(0, 150), simdi) : '<div class="bos">Bölgede kayıtlı deprem yok.</div>'}
<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>
<p><a class="bolum-link" href="/son-depremler/">Türkiye genelinde son depremler →</a></p>
<p style="color:var(--ikincil);font-size:14px">Veri: AFAD Deprem Dairesi Başkanlığı. *Mersin'e ait 2'den küçük depremler son 7 gün için listelenir. Acil durumda: <a href="/rehber/acil-telefonlar/">Mersin acil telefon numaraları</a>.</p>
</div></main>`,
  });
}
