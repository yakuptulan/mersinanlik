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
import { DIYANET_ILCE } from './lib/namaz.js';
import { guncelEtkinlikler } from './lib/etkinlik.js';
import { arsivYukle } from './lib/arsiv.js';
import { KGM_SAYFA } from './lib/yollar.js';

const TZ = 'Europe/Istanbul';
import { ilBulunma } from './templates/ulusal.js';
import ILLER81 from './iller.json' with { type: 'json' };
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

function haber({ id, baslik, ozet, metin, kategori, ilceler = [], kaynak, gecici = false, guncelle = false, kapak = null, sonDakika = false }) {
  const var_ = veri.hikayeler.find((x) => x.id === id);
  if (var_) {
    // Aynı günün haberi (ör. uçuş aksaklığı) yeni bilgiyle güncellenir
    if (guncelle && var_.metin !== metin) {
      Object.assign(var_, { baslik, ozet, metin, sonGuncelleme: new Date(simdi).toISOString() });
      yeniler.push(`(güncellendi) ${baslik}`);
    }
    return;
  }
  const zaman = new Date(simdi).toISOString();
  yeniler.push(baslik);
  veri.hikayeler.push({
    id, baslik, ozet, metin, ilceler, kategori,
    genel: false, riskNedenleri: [], durum: 'yayinda', onaylandi: false,
    ilkGorulme: zaman, sonGuncelleme: zaman,
    kaynaklar: [{ kaynakId: 'veri', ad: kaynak.ad, link: kaynak.link, baslik, tarih: zaman }],
    yaziKaynak: kaynak.ad, metinDenemesi: 2, otomatik: true, ...(gecici ? { gecici: true } : {}), ...(kapak ? { kapak } : {}), ...(sonDakika ? { sonDakika: true } : {}),
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
      // Ülke geneli: büyük şehirlerin bu turda alınmış güncel fiyatları
      let ulusalY = {};
      try {
        ulusalY = JSON.parse(fs.readFileSync('data/ulusal.json', 'utf8')).akaryakit || {};
      } catch {}
      const medyan = (d) => { const x = d.filter((v) => v != null).sort((p, q) => p - q); return x.length ? x[Math.floor(x.length / 2)] : null; };
      const sehirler = [['istanbul', 'İstanbul'], ['ankara', 'Ankara'], ['izmir', 'İzmir'], ['antalya', 'Antalya'], ['bursa', 'Bursa'], ['adana', 'Adana']]
        .map(([sl, ad]) => ({ ad, k: ulusalY[sl] }))
        .filter((x) => x.k && new Date(x.k.guncelleme) >= new Date(ak.degisim) - 30 * 60e3)
        .map((x) => ({ ad: x.ad, benzin: medyan(Object.values(x.k.ilceler).map((i) => i.benzin)), motorin: medyan(Object.values(x.k.ilceler).map((i) => i.motorin)) }))
        .filter((x) => x.benzin && x.motorin);
      const turAdi = parcalar.length === 2 && (hepsiZam || hepsiIndirim) ? `Benzin ve motorine ${hepsiZam ? 'zam' : 'indirim'} geldi` : `${parcalar.join(', ').replace(/^./, (c) => c.toLocaleUpperCase('tr-TR'))} geldi`;
      const baslik = sehirler.length >= 3 ? `${turAdi}: İstanbul, Ankara, İzmir ve Mersin'de güncel akaryakıt fiyatları` : `Mersin'de ${parcalar.join(', ')}`;
      const tum = Object.values(ak.ilceler || {});
      const aralik = (tur) => {
        const d = tum.map((x) => x[tur]).filter((x) => x != null);
        return d.length ? [Math.min(...d), Math.max(...d)] : null;
      };
      const ab = aralik('benzin');
      const am = aralik('motorin');
      const metin = [
        sehirler.length >= 3 ? `Akaryakıt fiyatları değişti. Güncel pompa fiyatlarına göre ${parcalar.join(', ')} yapıldı; yeni fiyatlar İstanbul'dan Mersin'e tüm illerde pompaya yansıdı.` : `Mersin'de akaryakıt fiyatları değişti. Güncel pompa fiyatlarına göre ${parcalar.join(', ')} yapıldı.`,
        `Mersin merkezde benzinin litre fiyatı ${para(f.benzin)} TL${b ? ` (önceki ${para(ak.onceki.benzin)} TL)` : ''}, motorinin litre fiyatı ${para(f.motorin)} TL${m ? ` (önceki ${para(ak.onceki.motorin)} TL)` : ''} oldu.${f.lpg ? ` LPG'nin litresi ${para(f.lpg)} TL'den satılıyor.` : ''}`,
        ab && am ? `İlçelere göre fiyatlar küçük farklılık gösteriyor: benzin ${para(ab[0])}–${para(ab[1])} TL, motorin ${para(am[0])}–${para(am[1])} TL arasında.` : '',
        sehirler.length >= 3 ? ['Büyük şehirlerde güncel litre fiyatları:', ...sehirler.map((x) => `${x.ad}: benzin ${para(x.benzin)} TL, motorin ${para(x.motorin)} TL`)].join('\n') : '',
        sehirler.length >= 3 ? 'İlçe ilçe güncel fiyatlara Mersin Anlık akaryakıt sayfasından, 81 ilin fiyatlarına 81 il akaryakıt fiyatları sayfasından ulaşabilirsiniz. Fiyatlar istasyona ve markaya göre değişebilir.' : 'İlçe ilçe güncel fiyatlara Mersin Anlık akaryakıt sayfasından ulaşabilirsiniz. Fiyatlar istasyona göre değişebilir.',
      ].filter(Boolean).join('\n\n');
      haber({ id: kimlik('y', ak.degisim), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'ekonomi', kaynak: { ad: 'Opet pompa fiyatları', link: 'https://www.opet.com.tr/akaryakit-fiyatlari' } , kapak: 'yakit', sonDakika: sehirler.length >= 3 });
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
  haber({ id: kimlik('d', anahtar), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'gundem', ilceler: ilce ? [ilce.slug] : [], kaynak: { ad: 'AFAD', link: 'https://deprem.afad.gov.tr/last-earthquakes.html' } , kapak: 'deprem', sonDakika: true });
}
// Türkiye genelinde M≥5 deprem (Mersin dışı da): herkesin aradığı haber
let ulusal = {};
try {
  ulusal = JSON.parse(fs.readFileSync('data/ulusal.json', 'utf8'));
} catch {}
for (const d of ulusal.deprem?.liste || []) {
  if (d.b < 5) continue;
  const anahtar = `${d.t}|${d.lat}|${d.lon}`;
  if (durum.deprem.includes(anahtar)) continue;
  durum.deprem.push(anahtar);
  if (ilkKurulum || simdi - new Date(d.t).getTime() > 3 * 36e5 || /mersin/i.test(d.il)) continue;
  const b = d.b.toFixed(1).replace('.', ',');
  const yer = d.ilce && d.il ? `${d.ilce} (${d.il})` : d.yer;
  const km = Math.round(mesafeKm(MERKEZ, { lat: d.lat, lon: d.lon }));
  const metin = [
    `AFAD verilerine göre ${yer} merkezli ${b} büyüklüğünde deprem meydana geldi. Deprem ${gunStr(d.t)} saat ${saatStr(d.t)} itibarıyla kaydedildi ve yerin yaklaşık ${Math.round(d.d)} kilometre derinliğinde oluştu.`,
    `Depremin merkez üssü Mersin'e kuş uçuşu yaklaşık ${km} kilometre uzaklıkta${km < 350 ? '; sarsıntının Mersin\'de de hissedilmiş olabileceği değerlendiriliyor' : ''}.`,
    'Resmî kurumlardan hasar ve can kaybına ilişkin açıklama bekleniyor. Gelişmeler oldukça haber güncellenecek. Türkiye genelindeki son depremleri Mersin Anlık son depremler sayfasından anlık takip edebilirsiniz.',
  ].join('\n\n');
  haber({ id: kimlik('d', anahtar), baslik: `${d.il ? ilBulunma(d.il) : d.yer} ${b} büyüklüğünde deprem`, ozet: metin.split('\n\n')[0], metin, kategori: 'gundem', kaynak: { ad: 'AFAD', link: 'https://deprem.afad.gov.tr/last-earthquakes.html' }, kapak: 'deprem', sonDakika: true });
}
durum.deprem = durum.deprem.slice(-200);

// ---------- 3) Su kesintisi ----------
// Mahalle sayfaları için tüm kesintilerin geçmişi (1 yıl)
let gecmis = { kayitlar: [] };
try {
  gecmis = JSON.parse(fs.readFileSync('data/kesinti-gecmis.json', 'utf8'));
} catch {}
const gecmisVar = new Set(gecmis.kayitlar.map((x) => x.anahtar));
for (const k of servis.suKesintisi?.liste || []) {
  const anahtar = `${k.baslangic}|${k.aciklama}`.slice(0, 300);
  if (gecmisVar.has(anahtar)) continue;
  gecmisVar.add(anahtar);
  gecmis.kayitlar.push({ anahtar, tur: k.tur || 'su', baslangic: k.baslangic, bitis: k.bitis, aciklama: k.aciklama, ilceler: (k.ilceler || []).map((i) => ({ ilce: i.ilce, mahalleler: i.mahalleler || [] })) });
}
gecmis.kayitlar = gecmis.kayitlar.filter((x) => !x.baslangic || simdi - new Date(x.baslangic).getTime() < 365 * 864e5);
fs.writeFileSync('data/kesinti-gecmis.json', JSON.stringify(gecmis));
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
  const mAd = [...new Set(mahalleler.map((m) => String(m).replace(/\s*mahallesi$/i, '').trim()))].filter(Boolean);
  const baslik = `${yer} su kesintisi${mAd.length >= 3 ? `: ${mAd.slice(0, 2).join(', ')} ve ${mAd.length - 2} mahalle daha` : mAd.length ? `: ${mAd.join(' ve ')}` : ''}${sure >= 5 ? ` (${Math.round(sure)} saat)` : ''}`;
  const metin = [
    `Mersin Büyükşehir Belediyesi Su ve Kanalizasyon İdaresi (MESKİ), ${yer} su kesintisi yaşanacağını duyurdu.`,
    `MESKİ'nin duyurusu şöyle: "${String(k.aciklama).trim()}"`,
    k.bitis ? `Suyun ${gunStr(k.bitis)} saat ${saatStr(k.bitis)} civarında yeniden verilmesi planlanıyor. Arıza durumlarında süre uzayabilir; MESKİ'ye 185'ten ulaşılabilir.` : "Arıza ve bilgi için MESKİ'ye 185'ten ulaşılabilir.",
  ].filter(Boolean).join('\n\n');
  haber({ id: kimlik('s', anahtar), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'belediye', ilceler, kaynak: { ad: 'MESKİ', link: 'https://www.meski.gov.tr/' } , kapak: 'su' });
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
  haber({ id: kimlik('h', anahtar), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'hava', ilceler: tum ? [] : u.ilceler, kaynak: { ad: 'Meteoroloji Genel Müdürlüğü', link: 'https://www.mgm.gov.tr/meteouyari/turkiye.aspx' } , kapak: 'hava', sonDakika: true });
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
      haber({ id: kimlik('t', yarin), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'hava', ilceler: tum ? [] : etkilenen.map((x) => x.i.slug), kaynak: { ad: 'MET Norway hava tahmini', link: 'https://www.yr.no/' } , kapak: 'hava' });
    }
  }
}
durum.hava = durum.hava.slice(-30);

// ---------- 5) Akşam: bu gece nöbetçi eczaneler (17.00'den sonra, günde bir) ----------
const bugunISO = new Date(simdi).toLocaleDateString('sv-SE', { timeZone: TZ });
const [yy, aa, gg] = bugunISO.split('-');
const bugunNokta = `${gg}.${aa}.${yy}`;
const haftaGunu = new Date(`${bugunISO}T12:00:00+03:00`).getUTCDay();
const ecz = servis.eczane?.liste || [];
if (trSaat >= 17 && durum.eczane !== bugunISO && ecz.length >= 5 && ecz.some((e) => String(e.saat || '').includes(bugunNokta))) {
  durum.eczane = bugunISO;
  const tel = (t) => String(t || '').replace(/^0?(\d{3})(\d{3})(\d{2})(\d{2})$/, '0$1 $2 $3 $4');
  const gruplar = ILCELER.map((i) => ({ i, l: ecz.filter((e) => e.ilce === i.slug) })).filter((x) => x.l.length);
  const metin = [
    `Mersin'de bugün (${gunStr(simdi)}) akşam saatlerinden itibaren ${ecz.length} eczane nöbet tutuyor. İlçe ilçe nöbetçi eczanelerin adları, adresleri ve telefonları aşağıda yer alıyor.`,
    ...gruplar.map((x) => `${x.i.ad}: ${x.l.map((e) => `${e.ad.replace(/\s+Eczanesi$/i, '')} Eczanesi (${String(e.adres || '').toLocaleLowerCase('tr-TR').replace(/(^|\s)(\S)/g, (m, b, c) => b + c.toLocaleUpperCase('tr-TR'))}${e.telefon ? `, ${tel(e.telefon)}` : ''})`).join('; ')}.`),
    "Nöbet süreleri eczaneye göre değişebilir; gitmeden önce telefonla teyit etmeniz önerilir. Konumlu liste ve yol tarifi için Mersin Anlık nöbetçi eczane sayfasını kullanabilirsiniz. Acil durumlarda 112'yi arayın.",
  ].join('\n\n');
  haber({ id: kimlik('e', bugunISO), baslik: `Mersin nöbetçi eczaneler: ${gunStr(simdi)}`, ozet: metin.split('\n\n')[0], metin, kategori: 'saglik', kaynak: { ad: 'Mersin Eczacı Odası', link: 'https://www.mersineczaciodasi.org.tr/nobetci-eczaneler' }, gecici: true , kapak: 'eczane' });
}

// ---------- 6) Ramazan: iftar ve sahur vakitleri (sabah 08.00'den sonra, günde bir) ----------
const vakitler = (kod) => servis.namaz?.bolgeler?.[kod] || [];
const bugunVakit = (kod) => vakitler(kod).find((v) => v.tarih === bugunISO);
const merkezKod = DIYANET_ILCE.yenisehir;
const hicri = bugunVakit(merkezKod)?.hicri || '';
if (/Ramazan/i.test(hicri) && trSaat >= 8 && durum.iftar !== bugunISO) {
  durum.iftar = bugunISO;
  const yarinISO = new Date(simdi + 864e5).toLocaleDateString('sv-SE', { timeZone: TZ });
  const merkez = bugunVakit(merkezKod);
  const yarinSahur = vakitler(merkezKod).find((v) => v.tarih === yarinISO)?.imsak;
  const gun = hicri.split(' ')[0];
  const satirlar = ILCELER.filter((i) => !['akdeniz', 'mezitli', 'toroslar'].includes(i.slug)).map((i) => {
    const v = bugunVakit(DIYANET_ILCE[i.slug]);
    return v ? `${i.slug === 'yenisehir' ? 'Mersin merkez (Akdeniz, Mezitli, Toroslar, Yenişehir)' : i.ad}: iftar ${v.aksam}, sahur (imsak) ${v.imsak}` : '';
  }).filter(Boolean);
  const metin = [
    `Ramazan'ın ${gun}. gününde Mersin merkezde iftar vakti ${merkez.aksam}. Bugünkü sahur (imsak) vakti ${merkez.imsak} idi${yarinSahur ? `; yarın sahur için imsak vakti ${yarinSahur}` : ''}.`,
    `İlçe ilçe bugünkü vakitler: ${satirlar.join('; ')}.`,
    'Vakitler Diyanet İşleri Başkanlığı verilerinden alınmıştır. Tüm namaz vakitleri için Mersin Anlık namaz vakitleri sayfasına bakabilirsiniz.',
  ].join('\n\n');
  haber({ id: kimlik('i', bugunISO), baslik: `Mersin iftar vakti: ${gunStr(simdi)} iftar saat kaçta?`, ozet: metin.split('\n\n')[0], metin, kategori: 'kultur', kaynak: { ad: 'Diyanet İşleri Başkanlığı', link: 'https://namazvakitleri.diyanet.gov.tr/' }, gecici: true , kapak: 'iftar' });
}

// ---------- 7) Hafta içi akşam: altın ve döviz günün kapanışı (18.15'ten sonra) ----------
const pk = servis.piyasa?.kalemler;
const trDakika = trSaat * 60 + Number(new Date(simdi).toLocaleString('en-GB', { minute: '2-digit', timeZone: TZ }));
if (pk && haftaGunu >= 1 && haftaGunu <= 5 && trDakika >= 18 * 60 + 15 && durum.piyasa !== bugunISO) {
  durum.piyasa = bugunISO;
  const KUCUK = { 'Gram altın': 'gram altın', 'Çeyrek altın': 'çeyrek altın', Dolar: 'dolar', Euro: 'euro', 'BIST 100 endeksi': 'BIST 100 endeksi' };
  const kalem = [
    ['Gram altın', pk.gram, ' TL'],
    ['Çeyrek altın', pk.ceyrek, ' TL'],
    ['Dolar', pk.usd, ' TL'],
    ['Euro', pk.eur, ' TL'],
    ['BIST 100 endeksi', pk.bist, ' puan'],
  ].filter(([, x]) => x?.satis);
  const yuzde = (d) => `%${Math.abs(d).toLocaleString('tr-TR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  const hareket = (d) => (Math.abs(d) < 0.05 ? 'yatay seyretti' : d > 0 ? `${yuzde(d)} yükseldi` : `${yuzde(d)} geriledi`);
  const enCok = [...kalem].sort((a, b) => Math.abs(b[1].degisim || 0) - Math.abs(a[1].degisim || 0))[0];
  const baslik = `Piyasalarda günün kapanışı: ${KUCUK[enCok[0]]} ${hareket(enCok[1].degisim || 0)}`;
  const deger = (x, birim) => `${x.satis.toLocaleString('tr-TR', { minimumFractionDigits: birim === ' puan' ? 0 : 2, maximumFractionDigits: birim === ' puan' ? 0 : 2 })}${birim}`;
  const metin = [
    (() => {
      const grup = (f) => kalem.filter(([, x]) => f(x.degisim || 0));
      const liste = (g) => g.map(([ad, x]) => `${KUCUK[ad]} (${yuzde(x.degisim || 0)})`);
      const ve = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} ve ${a.at(-1)}` : a[0]);
      const yuk = grup((d) => d >= 0.05), dus = grup((d) => d <= -0.05), yat = grup((d) => Math.abs(d) < 0.05);
      const c = [yuk.length ? `${ve(liste(yuk))} yükseldi` : '', dus.length ? `${ve(liste(dus))} geriledi` : '', yat.length ? `${ve(yat.map(([ad]) => KUCUK[ad]))} yatay seyretti` : ''].filter(Boolean);
      return `Piyasalarda günün sonunda ${c.join('; ')}.`;
    })(),
    kalem.map(([ad, x, b]) => `${ad} ${deger(x, b)}`).join(', ') + ' seviyesinden işlem görüyor.',
    'Kuyumcu ve bankalarda fiyatlar farklılık gösterebilir. Bu haber yatırım tavsiyesi değildir. Anlık fiyatlar Mersin Anlık piyasalar sayfasında.',
  ].join('\n\n');
  haber({ id: kimlik('k', bugunISO), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'ekonomi', kaynak: { ad: 'Truncgil Finans', link: 'https://finans.truncgil.com/' } , kapak: 'piyasa' });
}

// ---------- 7b) Her sabah (Pzt–Cmt, 09.45 sonrası): "Altın fiyatları bugün" ----------
const pa = servis.piyasa;
if (pa?.altinlar?.length && haftaGunu >= 1 && haftaGunu <= 6 && trDakika >= 9 * 60 + 45 && durum.altinSabah !== bugunISO && simdi - new Date(pa.guncelleme) < 3 * 36e5) {
  durum.altinSabah = bugunISO;
  let pg = { gunler: {} };
  try {
    pg = JSON.parse(fs.readFileSync('data/piyasa-gecmis.json', 'utf8'));
  } catch {}
  const dunKey = Object.keys(pg.gunler || {}).filter((g) => g < bugunISO).sort().at(-1);
  const dun = dunKey ? pg.gunler[dunKey] : null;
  const al = (k) => [...pa.altinlar, ...(pa.dovizler || [])].find((x) => x.k === k);
  const tl = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fark = (k) => {
    const x = al(k);
    if (!x) return '';
    if (dun?.[k]) {
      const d = x.satis - dun[k];
      return Math.abs(d) < 0.01 ? ' (dünle aynı)' : ` (düne göre ${tl(Math.abs(d))} TL ${d > 0 ? 'artış' : 'düşüş'})`;
    }
    return x.degisim ? ` (günlük %${tl(Math.abs(x.degisim))} ${x.degisim > 0 ? 'artış' : 'düşüş'})` : '';
  };
  const g = al('GRA'), c = al('CEYREKALTIN');
  if (g && c) {
    const satir = (k, ad) => (al(k) ? `${ad}: alış ${tl(al(k).alis)} TL, satış ${tl(al(k).satis)} TL${fark(k)}` : null);
    const yon = dun?.GRA ? (g.satis > dun.GRA ? 'yükselişle' : g.satis < dun.GRA ? 'düşüşle' : 'yatay') : (g.degisim || 0) > 0.05 ? 'yükselişle' : (g.degisim || 0) < -0.05 ? 'düşüşle' : 'yatay';
    const tarihMetni = new Date(simdi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
    const metin = [
      `Altın fiyatları güne ${yon} başladı. Serbest piyasada gram altın ${tl(g.satis)} TL'den, çeyrek altın ${tl(c.satis)} TL'den satılıyor.`,
      ['Güncel altın fiyatları şöyle:', satir('GRA', 'Gram altın'), satir('CEYREKALTIN', 'Çeyrek altın'), satir('YARIMALTIN', 'Yarım altın'), satir('TAMALTIN', 'Tam altın'), satir('CUMHURIYETALTINI', 'Cumhuriyet altını'), satir('YIA', '22 ayar bilezik (gram)'), satir('GUMUS', 'Gümüş (gram)')].filter(Boolean).join('\n'),
      [al('USD') ? `Dolar ${tl(al('USD').satis)} TL` : '', al('EUR') ? `euro ${tl(al('EUR').satis)} TL` : ''].filter(Boolean).join(', ') + ' seviyesinde işlem görüyor.',
      'Fiyatlar serbest piyasa verileridir; kuyumculardaki satış fiyatları işçilik ve makas farkı nedeniyle farklılık gösterebilir. Bu haber yatırım tavsiyesi değildir. Gün içindeki anlık fiyatlar ve altın hesaplama aracı Mersin Anlık gram altın sayfasında.',
    ].join('\n\n');
    haber({ id: kimlik('a', bugunISO), baslik: `Altın fiyatları bugün (${tarihMetni}): Gram altın ve çeyrek altın ne kadar?`, ozet: metin.split('\n\n')[0], metin, kategori: 'ekonomi', kaynak: { ad: 'Truncgil Finans', link: 'https://finans.truncgil.com/' }, kapak: 'piyasa' });
  }
}

// ---------- 7c) 81 il okul tatili: gün başına tek, güncellenen "tatil olan iller" haberi ----------
let okul81 = { kararlar: [] };
try {
  okul81 = JSON.parse(fs.readFileSync('data/okul81.json', 'utf8'));
} catch {}
{
  const hedefGun = trSaat >= 14 ? new Date(simdi + 864e5).toLocaleDateString('sv-SE', { timeZone: TZ }) : bugunISO;
  const yarinMi = hedefGun !== bugunISO;
  const l = okul81.kararlar.filter((k) => k.gunler.includes(hedefGun));
  const ilAd = (sl) => ILLER81.find((i) => i.slug === sl)?.ad || sl;
  const iller = [...new Set(l.map((k) => k.il))];
  if (iller.length && !ilkKurulum) {
    const gunMetni = new Date(`${hedefGun}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: TZ });
    const zaman = yarinMi ? 'yarın' : 'bugün';
    const baslik = iller.length === 1 ? `${ilBulunma(ilAd(iller[0]))} ${zaman} okullar tatil mi? Valilik kararı açıklandı` : `${zaman[0].toLocaleUpperCase('tr-TR') + zaman.slice(1)} okullar tatil mi? ${iller.length} ilde eğitime ara verildi (güncel liste)`;
    const satir = (k) => `${ilAd(k.il)}: ${k.kapsam === 'ilce' ? `${k.ilceler.length ? k.ilceler.join(', ') + ' ilçelerinde' : 'bazı ilçelerde'}` : 'tüm ilde'} (${k.kurum})`;
    const metin = [
      `${gunMetni} günü ${iller.length === 1 ? `${ilAd(iller[0])} ilinde` : `${iller.length} ilde`} okullarda eğitime ara verildi. Kararlar ilgili valilikler tarafından açıklandı.`,
      ['Tatil kararı açıklanan yerler:', ...l.map(satir)].join('\n'),
      iller.length === 1 && l.find((k) => k.not) ? l.find((k) => k.not).not : '',
      'Liste yeni kararlar geldikçe güncellenir. İlinize ait son durumu Mersin Anlık "okullar tatil mi" sayfalarından takip edebilirsiniz. Kesin bilgi için valilik duyurularını esas alın.',
    ].filter(Boolean).join('\n\n');
    haber({ id: kimlik('t', hedefGun), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'egitim', kaynak: { ad: l[0].kaynak, link: l[0].link }, guncelle: true, kapak: 'okul', sonDakika: true });
  }
}

// ---------- 8) Çukurova Havalimanı: iptal ya da uzun rötar ----------
const ucuslar = [...(servis.ucus?.giden || []).map((x) => ({ ...x, yon: 'kalkış' })), ...(servis.ucus?.gelen || []).map((x) => ({ ...x, yon: 'varış' }))].filter((x) => new Date(x.planlanan).toLocaleDateString('sv-SE', { timeZone: TZ }) === bugunISO);
const iptal = ucuslar.filter((x) => /iptal|cancel/.test(String(x.durum || '').toLocaleLowerCase('tr-TR')));
const rotar = ucuslar.filter((x) => x.tahmini && new Date(x.tahmini) - new Date(x.planlanan) >= 90 * 60e3);
if (iptal.length || rotar.length >= 2) {
  const sefer = (x) => `${x.havayolu || ''} ${x.no?.[0] || ''} (${x.yon === 'kalkış' ? `${x.yer} seferi` : `${x.yer} kalkışlı sefer`}, planlanan ${saatStr(x.planlanan)}${x.tahmini ? `, tahmini ${saatStr(x.tahmini)}` : ''})`.trim();
  const baslik = iptal.length ? `Çukurova Havalimanı'nda bugün ${iptal.length} sefer iptal edildi` : `Çukurova Havalimanı'nda ${rotar.length} seferde uzun rötar`;
  const metin = [
    `Çukurova Uluslararası Havalimanı'nın uçuş bilgi ekranına göre bugün ${[iptal.length ? `${iptal.length} sefer iptal edildi` : '', rotar.length ? `${rotar.length} sefer 1,5 saatten fazla rötarlı görünüyor` : ''].filter(Boolean).join(', ')}.`,
    iptal.length ? `İptal edilen seferler: ${iptal.map(sefer).join('; ')}.` : '',
    rotar.length ? `Rötarlı seferler: ${rotar.map(sefer).join('; ')}.` : '',
    "Yolcuların havalimanına gitmeden önce havayolu şirketinden uçuş durumunu teyit etmesi öneriliyor. Havalimanı çağrı merkezi: 0324 503 00 00. Anlık kalkış ve varışlar Mersin Anlık ulaşım sayfasında.",
  ].filter(Boolean).join('\n\n');
  haber({ id: kimlik('u', bugunISO), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'ulasim', kaynak: { ad: 'Çukurova Havalimanı', link: 'https://www.cukurovaairport.aero/' }, gecici: true, guncelle: true , kapak: 'ucus', sonDakika: iptal.length > 0 });
}

const ve = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} ve ${a.at(-1)}` : a[0] || '');
const kisaTarih = (iso) => new Date(`${iso}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: TZ });

// ---------- 9) Okul tatili kararı ----------
let okul = { kararlar: [] };
try {
  okul = JSON.parse(fs.readFileSync('data/okul.json', 'utf8'));
} catch {}
durum.okul ||= [];
for (const k of okul.kararlar || []) {
  const anahtar = `${k.haberId}|${k.gunler.join(',')}`;
  if (durum.okul.includes(anahtar)) continue;
  durum.okul.push(anahtar);
  const ileri = k.gunler.filter((g) => g >= bugunISO).sort();
  if (ilkKurulum || !ileri.length) continue;
  const yarinStr = new Date(simdi + 864e5).toLocaleDateString('sv-SE', { timeZone: TZ });
  const ne = ileri[0] === bugunISO ? 'bugün' : ileri[0] === yarinStr ? 'yarın' : kisaTarih(ileri[0]);
  const tum = k.kapsam === 'tum' || !k.ilceler?.length;
  const yer = tum ? "Mersin'de" : ve(k.ilceler.slice(0, -1).map(ilceAd).concat(yerde(k.ilceler.at(-1))));
  const kaynakHaber = veri.hikayeler.find((x) => x.id === k.haberId);
  const baslik = `${tum ? "Mersin'de" : yer} ${ne}${ileri.length > 1 ? ` ve ${ileri.length > 2 ? 'sonraki günlerde' : kisaTarih(ileri[1])}` : ''} okullar tatil`;
  const metin = [
    `${k.kurum || 'Yetkililer'} tarafından yapılan açıklamaya göre ${tum ? "Mersin'in tamamında" : `${yer}`} ${ileri.map(kisaTarih).join(', ')} tarihlerinde eğitim ve öğretime ara verildi.`,
    k.not ? `Karara ilişkin bilgi: ${k.not.replace(/[.!]?$/, '.')}` : '',
    'Kararın kapsamı (öğretmenler, özel okullar, kreşler, üniversiteler) kurumun duyurusuna göre değişebilir; ayrıntılar için resmî açıklamayı takip edin. Mersin\'de okul tatili kararlarını tek sayfada "Okullar tatil mi?" bölümümüzden izleyebilirsiniz.',
  ].filter(Boolean).join('\n\n');
  haber({ id: kimlik('o', anahtar), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'egitim', ilceler: tum ? [] : k.ilceler, kaynak: kaynakHaber ? { ad: kaynakHaber.kaynaklar[0].ad, link: kaynakHaber.kaynaklar[0].link } : { ad: 'Mersin Valiliği', link: 'http://www.mersin.gov.tr/' } , kapak: 'okul', sonDakika: true });
}
durum.okul = durum.okul.slice(-100);

// ---------- 10) Pazar akşamı: Mersin'de bu hafta öne çıkan 7 gelişme ----------
if (haftaGunu === 0 && trSaat >= 18 && durum.haftaOzeti !== bugunISO) {
  durum.haftaOzeti = bugunISO;
  const canli = new Set(veri.hikayeler.map((x) => x.id));
  const havuz = [...veri.hikayeler, ...arsivYukle().filter((x) => !canli.has(x.id))]
    .filter((x) => !x.genel && !x.otomatik && !x.gecici && x.metin && (x.durum || 'yayinda') === 'yayinda' && simdi - new Date(x.ilkGorulme).getTime() < 7 * 864e5);
  const kaynakSayisi = (x) => new Set((x.kaynaklar || []).map((k) => k.ad)).size;
  const secim = havuz.sort((a, b) => kaynakSayisi(b) - kaynakSayisi(a) || new Date(b.ilkGorulme) - new Date(a.ilkGorulme)).slice(0, 7);
  if (secim.length >= 5) {
    const ilk = new Date(simdi - 6 * 864e5).toLocaleDateString('sv-SE', { timeZone: TZ });
    const aralik = `${kisaTarih(ilk)} – ${kisaTarih(bugunISO)}`;
    const cumle = (x) => String(x.ozet || x.metin).split(/(?<=[a-zçğıöşü)"”'’][.!?])\s+(?=[A-ZÇĞİÖŞÜ0-9"“])/)[0];
    const metin = [
      `Mersin'de geride kalan haftada (${aralik}) en çok konuşulan ${secim.length} gelişmeyi sizin için derledik.`,
      ...secim.map((x, i) => `${i + 1}. ${x.baslik}: ${cumle(x)}`),
      'Haberlerin tamamına sitemizdeki ilgili sayfalardan ulaşabilirsiniz. Her pazar akşamı haftanın özeti Mersin Anlık\'ta.',
    ].join('\n\n');
    haber({ id: kimlik('w', bugunISO), baslik: `Mersin'de bu hafta: öne çıkan ${secim.length} gelişme (${aralik})`, ozet: metin.split('\n\n')[0], metin, kategori: 'gundem', kaynak: { ad: 'Mersin Anlık derlemesi', link: 'https://mersinanlik.com/arsiv/' } , kapak: 'hafta' });
  }
}

// ---------- 11) Pazartesi sabahı: bu hafta Mersin'de hangi etkinlikler var? ----------
if (haftaGunu === 1 && trSaat >= 9 && durum.etkinlik !== bugunISO) {
  durum.etkinlik = bugunISO;
  const pazar = new Date(simdi + 6 * 864e5).toLocaleDateString('sv-SE', { timeZone: TZ });
  const liste = guncelEtkinlikler(servis.etkinlik, simdi).filter((e) => e.tarih && e.tarih >= bugunISO && e.tarih <= pazar);
  if (liste.length >= 2) {
    const aralik = `${kisaTarih(bugunISO)} – ${kisaTarih(pazar)}`;
    const gunler = [...new Set(liste.map((e) => e.tarih))];
    const metin = [
      `Mersin'de bu hafta (${aralik}) ${liste.length} etkinlik var. Mersin Büyükşehir Belediyesi'nin duyurduğu konser, tiyatro, sergi ve diğer etkinlikler gün gün şöyle:`,
      ...gunler.map((g) => `${gunStr(`${g}T12:00:00+03:00`)}: ${liste.filter((e) => e.tarih === g).map((e) => `${e.baslik.replace(/\.$/, '')}${[e.saat, e.yer].filter(Boolean).length ? ` (${[e.saat, e.yer].filter(Boolean).join(', ')})` : ''}`).join('; ')}.`),
      'Etkinliklerin ayrıntıları ve afişleri Mersin Anlık etkinlikler sayfasında. Saat ve yer değişiklikleri için belediyenin duyurularını takip edin.',
    ].join('\n\n');
    haber({ id: kimlik('a', bugunISO), baslik: `Bu hafta Mersin'de neler var? ${aralik} etkinlik rehberi`, ozet: metin.split('\n\n')[0], metin, kategori: 'kultur', kaynak: { ad: 'Mersin Büyükşehir Belediyesi', link: 'https://www.mersin.bel.tr/' }, gecici: true , kapak: 'etkinlik' });
  }
}

// ---------- 12) KGM: Mersin'de trafiğe kapanan / çalışma yapılan yollar ----------
durum.yol ||= [];
for (const y of servis.yollar?.liste || []) {
  if (durum.yol.includes(y.id)) continue;
  durum.yol.push(y.id);
  if (ilkKurulum) continue;
  if (y.baslangic && simdi - new Date(`${y.baslangic}+03:00`).getTime() > 3 * 864e5) continue; // eski kayıt
  const yakin = [...ILCELER].filter((i) => i.lat).sort((a, b) => mesafeKm(a, y) - mesafeKm(b, y))[0];
  const calisma = /yol çalışması|baraj/i.test(y.neden);
  const yolAd = y.yol || `${y.no} numaralı yol`;
  const baslik = calisma ? `${yolAd} yolunda çalışma: sürücüler dikkat` : `${yolAd} yolu ${y.neden.toLocaleLowerCase('tr-TR')} nedeniyle trafiğe kapandı`;
  const metin = [
    `Karayolları Genel Müdürlüğü'nün kapalı ve çalışma yapılan yollar listesine göre, ${y.no ? `${y.no} numaralı ` : ''}${yolAd} yolunun${y.km ? ` ${y.km}. kilometreleri arasında` : ''} ${calisma ? `${y.neden.toLocaleLowerCase('tr-TR')} yapılıyor` : `${y.neden.toLocaleLowerCase('tr-TR')} nedeniyle ulaşım durduruldu`}.${y.aciklama ? ` Etkilenen kesim: ${y.aciklama}.` : ''}`,
    `${y.baslangic ? `Kayıt ${new Date(`${y.baslangic}+03:00`).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ })} tarihli. ` : ''}${yakin ? `Yol, ${yakin.ad} ilçesi yakınlarında bulunuyor.` : ''}`,
    `Sürücülerin trafik işaret ve işaretçilerine uyması, mümkünse alternatif güzergâhları kullanması öneriliyor. Güncel durum ve harita için KGM'nin yol durumu sayfası (${KGM_SAYFA}) ve Mersin Anlık trafik sayfası takip edilebilir.`,
  ].join('\n\n');
  haber({ id: kimlik('r', String(y.id)), baslik, ozet: metin.split('\n\n')[0], metin, kategori: 'ulasim', ilceler: yakin && mesafeKm(yakin, y) < 40 ? [yakin.slug] : [], kaynak: { ad: 'Karayolları Genel Müdürlüğü', link: KGM_SAYFA } , kapak: 'yol', sonDakika: !calisma });
}
durum.yol = durum.yol.slice(-300);

// ---------- 12b) İŞKUR: Mersin'de yeni açılan kurs / işbaşı eğitim programı ----------
durum.kurs ||= [];
{
  let isv = null;
  try { isv = JSON.parse(fs.readFileSync(new URL('../data/is-ilanlari.json', import.meta.url), 'utf8')); } catch {}
  for (const k of isv?.kurslar || []) {
    if (durum.kurs.includes(k.no)) continue;
    durum.kurs.push(k.no);
    if (ilkKurulum || (k.sonBasvuru && k.sonBasvuru < bugunISO)) continue;
    const tur = k.programTur === 3 ? 'işbaşı eğitim programı' : 'mesleki eğitim kursu';
    const yer = k.ilceAd || 'Mersin';
    const metin = [
      `Türkiye İş Kurumu (İŞKUR), ${yer === 'Mersin' ? "Mersin'de" : `Mersin'in ${yer} ilçesinde`} ${k.meslek} alanında yeni bir ${tur} açtı.${k.sonBasvuru ? ` Başvurular ${kisaTarih(k.sonBasvuru)} tarihine kadar yapılabilecek.` : ''}${k.baslangic ? ` Programın ${kisaTarih(k.baslangic)} tarihinde başlaması planlanıyor.` : ''}`,
      `${k.kursTuru ? `Program türü: ${k.kursTuru}. ` : ''}İŞKUR kurslarına katılanlara, kurs süresince günlük harçlık ödenebiliyor ve genel sağlık ile iş kazası sigortası primleri kurum tarafından karşılanabiliyor; ayrıntılar programa göre değişiyor.`,
      `Başvurular İŞKUR e-Şube üzerinden ya da İŞKUR Mersin İl Müdürlüğü hizmet noktalarından yapılabiliyor (kurs numarası: ${k.no}). Mersin'deki tüm güncel iş ilanları ve kurslar Mersin Anlık'ın iş ilanları sayfasında (mersinanlik.com/is-ilanlari/) listeleniyor.`,
    ].join('\n\n');
    haber({ id: kimlik('q', k.no), baslik: `${ilBulunma(yer)} İŞKUR ${k.meslek} ${k.programTur === 3 ? 'işbaşı eğitimi' : 'kursu'}: başvurular başladı`, ozet: metin.split('\n\n')[0], metin, kategori: 'ekonomi', ilceler: k.ilce ? [k.ilce] : [], kaynak: { ad: 'İŞKUR', link: 'https://esube.iskur.gov.tr/Kurs/KursOnAir.aspx?ProgramTur=' + k.programTur }, kapak: 'is' });
  }
  durum.kurs = durum.kurs.slice(-300);
}

// ---------- 13) Pazartesi: Mersin'de bu hafta İŞKUR'daki iş ilanları ----------
if (haftaGunu === 1 && trSaat >= 10 && durum.isHaftalik !== bugunISO) {
  let isv = null;
  try { isv = JSON.parse(fs.readFileSync(new URL('../data/is-ilanlari.json', import.meta.url), 'utf8')); } catch {}
  const acik = Object.values(isv?.ilanlar || {}).filter((i) => !i.sonBasvuru || i.sonBasvuru >= bugunISO);
  if (acik.length >= 20) {
    durum.isHaftalik = bugunISO;
    const yeni = acik.filter((i) => simdi - new Date(i.ilkGorulme).getTime() < 7 * 864e5).sort((a, b) => b.no.localeCompare(a.no));
    const say = (l, f) => { const m = new Map(); for (const i of l) { const k = f(i); if (k) m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1]); };
    const kisi = acik.reduce((t, i) => t + (i.acik || 1), 0);
    const meslek = say(acik, (i) => i.pozisyon).slice(0, 6);
    const ilce = say(acik, (i) => i.ilceAd).slice(0, 5);
    const secki = (yeni.length >= 6 ? yeni : acik).slice(0, 8);
    const metin = [
      `Türkiye İş Kurumu'nun (İŞKUR) kayıtlarına göre Mersin'de bu hafta ${acik.length} açık iş ilanı bulunuyor; ilanlarda toplam ${kisi} kişilik pozisyon var.${yeni.length ? ` Bunların ${yeni.length} tanesi son bir haftada yayımlandı.` : ''}`,
      `En çok ilan verilen meslekler: ${meslek.map(([m, n]) => `${m} (${n})`).join(', ')}. İlçelere göre ise ${ilce.map(([m, n]) => `${m} ${n}`).join(', ')} ilanla öne çıkıyor.`,
      `${yeni.length >= 6 ? 'Bu hafta eklenen' : 'Öne çıkan'} ilanlardan bazıları:\n${secki.map((i) => `• ${i.pozisyon}${i.ilceAd ? ` – ${i.ilceAd}` : ''}${i.sonBasvuru ? ` (son başvuru ${kisaTarih(i.sonBasvuru)})` : ''}`).join('\n')}`,
      `Tüm ilanların listesine, ilçe ve meslek ayrımıyla Mersin Anlık'ın iş ilanları sayfasından (mersinanlik.com/is-ilanlari/) ulaşılabilir. Başvurular İŞKUR e-Şube üzerinden e-Devlet ile ücretsiz yapılıyor; iş karşılığında para isteyenlere itibar edilmemesi gerekiyor.`,
    ].join('\n\n');
    haber({ id: kimlik('j', bugunISO), baslik: `Mersin iş ilanları: İŞKUR'da bu hafta ${acik.length} açık ilan, ${kisi} kişilik pozisyon`, ozet: metin.split('\n\n')[0], metin, kategori: 'ekonomi', kaynak: { ad: 'İŞKUR', link: 'https://esube.iskur.gov.tr/Istihdam/AcikIsIlanAra.aspx' }, kapak: 'is' });
  }
}

durum.kuruldu = durum.kuruldu || new Date(simdi).toISOString();
fs.writeFileSync(DOSYA, JSON.stringify(durum, null, 1));
if (yeniler.length) {
  kaydet(veri);
  console.log(`Otomatik haber: ${yeniler.join(' | ')}`);
} else console.log(`Otomatik haber: yeni yok${ilkKurulum ? ' (ilk kurulum: mevcut veriler kaydedildi)' : ''}.`);
