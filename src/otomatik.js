// Resmî veriden otomatik kısa haberler (yapay zekâ kullanmadan, kalıp cümlelerle):
//  1) Akaryakıt fiyatı değişince: "Mersin'de benzine 8 kuruş zam"            (kaynak: Opet ilçe fiyatları)
//  2) Mersin'e yakın deprem (M≥4, 200 km) ya da Mersin'de M≥3,5             (kaynak: AFAD)
//  3) Büyük su kesintisi (3+ mahalle ya da 5+ saat)                          (kaynak: MESKİ)
//  4) Hava: MGM uyarısı varsa o; yoksa yarın için kuvvetli yağış/fırtına tahmini (kaynak: MET Norway)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { yukle, kaydet } from './lib/store.js';
import { ILCELER } from './config.js';
import { mesafeKm } from './lib/uyarilar.js';

const TZ = 'Europe/Istanbul';
const DOSYA = 'data/otomatik.json';
const MERKEZ = { lat: 36.8, lon: 34.63 };
const BULUNMA = { akdeniz: 'de', anamur: 'da', aydincik: 'ta', bozyazi: 'da', camliyayla: 'da', erdemli: 'de', gulnar: 'da', mezitli: 'de', mut: 'ta', silifke: 'de', tarsus: 'ta', toroslar: 'da', yenisehir: 'de' };
const ilceAd = (s) => ILCELER.find((i) => i.slug === s)?.ad || s;
const yerde = (s) => `${ilceAd(s)}'${BULUNMA[s] || 'de'}`;
const saatStr = (t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const gunStr = (t) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: TZ });
const para = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kimlik = (on, s) => on + crypto.createHash('sha1').update(s).digest('hex').slice(0, 5);

const simdi = Date.now();
const servis = JSON.parse(fs.readFileSync('data/servisler.json', 'utf8'));
let durum = {};
try {
  durum = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
} catch {}
const ilkKurulum = !durum.kuruldu;
durum.deprem ||= [];
durum.su ||= [];
durum.mgm ||= [];
durum.hava ||= [];
const veri = yukle();
const yeniler = [];

function haber({ id, baslik, ozet, metin, kategori, ilceler = [], kaynak }) {
  if (veri.hikayeler.some((x) => x.id === id)) return;
  const zaman = new Date(simdi).toISOString();
  yeniler.push(baslik);
  veri.hikayeler.push({
    id, baslik, ozet, metin, ilceler, kategori,
    genel: false, riskNedenleri: [], durum: 'yayinda', onaylandi: false,
    ilkGorulme: zaman, sonGuncelleme: zaman,
    kaynaklar: [{ kaynakId: 'veri', ad: kaynak.ad, link: kaynak.link, baslik, tarih: zaman }],
    yaziKaynak: kaynak.ad, metinDenemesi: 2, otomatik: true,
    gorselHatasi: 'otomatik haber: ilçe çizimi kullanılır',
  });
}

// ---------- 1) Akaryakıt ----------
const ak = servis.akaryakit;
if (ak?.degisim && ak.onceki && ak.degisim !== durum.yakit) {
  const yeniMi = simdi - new Date(ak.degisim).getTime() < 12 * 36e5;
  const f = ak.ilceler?.merkez || ak.ilceler?.yenisehir;
  if (!ilkKurulum && yeniMi && f) {
    const fark = (tur) => (f[tur] != null && ak.onceki[tur] != null ? Math.round((f[tur] - ak.onceki[tur]) * 100) : 0);
    const b = fark('benzin');
    const m = fark('motorin');
    if (b || m) {
      const ifade = (ad, k) => `${ad} ${Math.abs(k)} kuruş ${k > 0 ? 'zam' : 'indirim'}`;
      const parcalar = [b ? ifade('benzine', b) : '', m ? ifade('motorine', m) : ''].filter(Boolean);
      const hepsiZam = [b, m].filter(Boolean).every((x) => x > 0);
      const hepsiIndirim = [b, m].filter(Boolean).every((x) => x < 0);
      const baslik = parcalar.length === 2 && (hepsiZam || hepsiIndirim) ? `Mersin'de benzin ve motorine ${hepsiZam ? 'zam' : 'indirim'} geldi` : `Mersin'de ${parcalar.join(', ')}`;
      const tum = Object.values(ak.ilceler || {});
      const aralik = (tur) => {
        const d = tum.map((x) => x[tur]).filter((x) => x != null);
        return d.length ? [Math.min(...d), Math.max(...d)] : null;
      };
      const ab = aralik('benzin');
      const am = aralik('motorin');
      const metin = [
        `Mersin'de akaryakıt fiyatları değişti. Güncel pompa fiyatlarına göre ${parcalar.join(', ')} yapıldı.`,
        `Mersin merkezde benzinin litre fiyatı ${para(f.benzin)} TL${b ? ` (önceki ${para(ak.onceki.benzin)} TL)` : ''}, motorinin litre fiyatı ${para(f.motorin)} TL${m ? ` (önceki ${para(ak.onceki.motorin)} TL)` : ''} oldu.${f.lpg ? ` LPG'nin litresi ${para(f.lpg)} TL'den satılıyor.` : ''}`,
        ab && am ? `İlçelere göre fiyatlar küçük farklılık gösteriyor: benzin ${para(ab[0])}–${para(ab[1])} TL, motorin ${para(am[0])}–${para(am[1])} TL arasında.` : '',
        'İlçe ilçe güncel fiyatlara Mersin Anlık akaryakıt sayfasından ulaşabilirsiniz. Fiyatlar istasyona göre değişebilir.',
      ].filter(Boolean).join('\n\n');
      haber({ id: kimlik('y', ak.degisim), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'ekonomi', kaynak: { ad: 'Opet pompa fiyatları', link: 'https://www.opet.com.tr/akaryakit-fiyatlari' } });
    }
  }
  durum.yakit = ak.degisim;
}

// ---------- 2) Deprem ----------
for (const d of servis.deprem || []) {
  if (d.lat == null) continue;
  const anahtar = `${d.tarih}|${d.lat}|${d.lon}`;
  if (durum.deprem.includes(anahtar)) continue;
  const km = mesafeKm(MERKEZ, { lat: d.lat, lon: d.lon });
  const mersinde = /mersin/i.test(d.il || d.yer || '');
  const onemli = (d.buyukluk >= 4 && km <= 200) || (d.buyukluk >= 3.5 && mersinde);
  const taze = simdi - new Date(d.tarih).getTime() < 6 * 36e5;
  if (!onemli) continue;
  durum.deprem.push(anahtar);
  if (ilkKurulum || !taze) continue;
  const b = d.buyukluk.toFixed(1).replace('.', ',');
  const ilce = ILCELER.find((i) => new RegExp(i.ad, 'i').test(d.ilce || d.yer || ''));
  const yakin = [...ILCELER].filter((i) => i.lat).sort((a, x) => mesafeKm(a, d) - mesafeKm(x, d))[0];
  const yer = d.yer || `${d.ilce || ''} (${d.il || ''})`;
  const baslik = `${yer} merkezli ${b} büyüklüğünde deprem`;
  const metin = [
    `AFAD verilerine göre ${yer} merkezli ${b} büyüklüğünde deprem meydana geldi. ${gunStr(d.tarih)} saat ${saatStr(d.tarih)} itibarıyla kaydedilen deprem, yerin yaklaşık ${Math.round(d.derinlik)} kilometre derinliğinde oluştu.`,
    `Depremin merkez üssü, Mersin şehir merkezine kuş uçuşu yaklaşık ${Math.round(km)} kilometre uzaklıkta${yakin && mesafeKm(yakin, d) < 60 ? `; en yakın Mersin ilçesi ${yakin.ad} (yaklaşık ${Math.round(mesafeKm(yakin, d))} km)` : ''}.`,
    'Şu ana kadar resmî kurumlardan can ve mal kaybına ilişkin bir açıklama yapılmadı. Gelişmeler oldukça haber güncellenecek. Son depremlerin listesini Mersin Anlık deprem sayfasından takip edebilirsiniz.',
  ].join('\n\n');
  haber({ id: kimlik('d', anahtar), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'gundem', ilceler: ilce ? [ilce.slug] : [], kaynak: { ad: 'AFAD', link: 'https://deprem.afad.gov.tr/last-earthquakes.html' } });
}
durum.deprem = durum.deprem.slice(-200);

// ---------- 3) Su kesintisi ----------
for (const k of servis.suKesintisi?.liste || []) {
  const anahtar = `${k.baslangic}|${k.aciklama}`.slice(0, 300);
  if (durum.su.includes(anahtar)) continue;
  const mahalleler = (k.ilceler || []).flatMap((i) => i.mahalleler || []);
  const sure = k.bitis && k.baslangic ? (new Date(k.bitis) - new Date(k.baslangic)) / 36e5 : 0;
  const bitmedi = !k.bitis || new Date(k.bitis).getTime() > simdi + 30 * 60e3;
  if (!(mahalleler.length >= 3 || sure >= 5) || !bitmedi) continue;
  durum.su.push(anahtar);
  if (ilkKurulum) continue;
  const ilceler = (k.ilceler || []).map((i) => i.ilce).filter((s) => BULUNMA[s]);
  if (!ilceler.length) continue;
  const yer = ilceler.length === 1 ? yerde(ilceler[0]) : `${ilceler.slice(0, -1).map(ilceAd).join(', ')} ve ${yerde(ilceler.at(-1))}`;
  const baslik = `${yer} su kesintisi${mahalleler.length >= 3 ? ': birçok mahalle etkilenecek' : sure >= 5 ? `: ${Math.round(sure)} saat sürecek` : ''}`;
  const metin = [
    `Mersin Büyükşehir Belediyesi Su ve Kanalizasyon İdaresi (MESKİ), ${yer} su kesintisi yaşanacağını duyurdu.`,
    `MESKİ'nin duyurusu şöyle: "${String(k.aciklama).trim()}"`,
    k.bitis ? `Suyun ${gunStr(k.bitis)} saat ${saatStr(k.bitis)} civarında yeniden verilmesi planlanıyor. Arıza durumlarında süre uzayabilir; MESKİ'ye 185'ten ulaşılabilir.` : "Arıza ve bilgi için MESKİ'ye 185'ten ulaşılabilir.",
  ].filter(Boolean).join('\n\n');
  haber({ id: kimlik('s', anahtar), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'belediye', ilceler, kaynak: { ad: 'MESKİ', link: 'https://www.meski.gov.tr/' } });
}
durum.su = durum.su.slice(-300);

// ---------- 4) Hava ----------
const RENK_AD = { yellow: 'sarı', orange: 'turuncu', red: 'kırmızı' };
const uyarilar = servis.meteo?.uyarilar || [];
for (const u of uyarilar) {
  const anahtar = `${u.no}|${u.gun}|${u.renk}`;
  if (durum.mgm.includes(anahtar)) continue;
  durum.mgm.push(anahtar);
  if (ilkKurulum) continue;
  const tum = u.ilceler.length >= 10;
  const yer = tum ? 'Mersin geneli' : u.ilceler.map(ilceAd).join(', ');
  const hadise = (u.hadiseler.join(' ve ') || 'olumsuz hava').toLocaleLowerCase('tr-TR');
  const baslik = `Meteorolojiden Mersin için ${RENK_AD[u.renk]} kodlu ${hadise} uyarısı`;
  const metin = [
    `Meteoroloji Genel Müdürlüğü, ${u.gun === 'yarin' ? 'yarın' : 'bugün'} için Mersin'de ${hadise} beklendiğini belirterek ${RENK_AD[u.renk]} kodlu uyarı yaptı. Uyarı kapsamındaki yerler: ${yer}.`,
    u.metin ? `MGM'nin uyarı metni şöyle: "${u.metin}"` : '',
    'Vatandaşların sel, su baskını, yıldırım ve ani kuvvetli rüzgâr gibi olumsuzluklara karşı tedbirli olması öneriliyor. Acil durumlarda 112 aranabilir.',
  ].filter(Boolean).join('\n\n');
  haber({ id: kimlik('h', anahtar), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'hava', ilceler: tum ? [] : u.ilceler, kaynak: { ad: 'Meteoroloji Genel Müdürlüğü', link: 'https://www.mgm.gov.tr/meteouyari/turkiye.aspx' } });
}
durum.mgm = durum.mgm.slice(-100);

// MGM uyarısı yoksa: yarın için kuvvetli yağış / fırtına / kar tahmini (günde bir kez, saat 09.00'dan sonra)
const SERT = /kuvvetli|gök gürültü|fırtına|\bkar\b|karla/i;
const trSaat = Number(new Date(simdi).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }));
const yarin = new Date(simdi + 864e5).toLocaleDateString('sv-SE', { timeZone: TZ });
if (!uyarilar.length && trSaat >= 9 && !durum.hava.includes(yarin)) {
  const etkilenen = ILCELER.map((i) => ({ i, g: servis.hava?.[i.slug]?.gunler?.find((x) => x.tarih === yarin) })).filter((x) => x.g && SERT.test(x.g.durum));
  if (etkilenen.length >= 2) {
    durum.hava.push(yarin);
    if (!ilkKurulum) {
      const durumlar = [...new Set(etkilenen.map((x) => x.g.durum.toLocaleLowerCase('tr-TR')))];
      const tum = etkilenen.length >= 10;
      const yer = tum ? "Mersin'in büyük bölümünde" : `${etkilenen.slice(0, -1).map((x) => x.i.ad).join(', ')} ve ${yerde(etkilenen.at(-1).i.slug)}`;
      const baslik = `Mersin'de yarın ${durumlar[0]} bekleniyor`;
      const metin = [
        `Hava tahminlerine göre yarın (${gunStr(`${yarin}T12:00:00+03:00`)}) ${yer} ${durumlar.join(' ve ')} bekleniyor.`,
        etkilenen.map((x) => `${x.i.ad}: ${x.g.durum.toLocaleLowerCase('tr-TR')}, en yüksek ${x.g.max}°, en düşük ${x.g.min}°`).join('; ') + '.',
        'Bu bilgi resmî bir meteorolojik uyarı değil, hava tahminidir. Resmî uyarılar için Meteoroloji Genel Müdürlüğü duyuruları takip edilmelidir. İlçe ilçe 5 günlük tahmin Mersin Anlık hava durumu sayfasında.',
      ].join('\n\n');
      haber({ id: kimlik('t', yarin), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'hava', ilceler: tum ? [] : etkilenen.map((x) => x.i.slug), kaynak: { ad: 'MET Norway hava tahmini', link: 'https://www.yr.no/' } });
    }
  }
}
durum.hava = durum.hava.slice(-30);

durum.kuruldu = durum.kuruldu || new Date(simdi).toISOString();
fs.writeFileSync(DOSYA, JSON.stringify(durum, null, 1));
if (yeniler.length) {
  kaydet(veri);
  console.log(`Otomatik haber: ${yeniler.join(' | ')}`);
} else console.log(`Otomatik haber: yeni yok${ilkKurulum ? ' (ilk kurulum: mevcut veriler kaydedildi)' : ''}.`);
