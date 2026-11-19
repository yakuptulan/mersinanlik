// Haber toplayıcı: kaynakları okur, Mersin haberlerini ayıklar (Türkiye/dünya haberlerini birden çok site yazdıysa alır), aynı haberleri birleştirir,
// riskli olanları Telegram onayına gönderir, izin verilen kaynaklarda özet yazdırır.
//
// Kullanım:  node src/collect.js            → tüm aktif kaynaklar
//            node src/collect.js --dene aa  → tek kaynağı dener, hiçbir şey kaydetmez

import fs from 'node:fs';
import path from 'node:path';
import { KAYNAKLAR, aktifKaynaklar } from './sources.js';
import { kaynakOku } from './lib/rss.js';
import { yukle, kaydet, temizle, haberiDegerlendir, hikayeyeEkle, onemliMi } from './lib/store.js';
import { arsiveEkle } from './lib/arsiv.js';
import { riskBul } from './lib/text.js';
import { AYAR } from './config.js';
import { gorselUretimHazirMi, gorselUret, gorselAdaylari, sahipsizleriSil, kurumFotosuIndir } from './lib/gorsel-uret.js';
import { kurumOku, kurumMetniGetir } from './lib/kurum.js';
import { trendGetir, trendEslesir } from './lib/trend.js';
import { kucuk } from './lib/text.js';

// Hikâyenin bir kurum kaynağı varsa (belediye vb.) o kaynağı ve kaydını döndürür
function kurumKaynagi(h) {
  for (const kayit of h.kaynaklar) {
    const kaynak = KAYNAKLAR.find((k) => k.id === kayit.kaynakId);
    if (kaynak?.kapsam === 'kurum') return { kaynak, kayit };
  }
  return null;
}
import { geminiHazirMi, topluOzetle, jsonYaz } from './lib/gemini.js';
import { telegramHazirMi, onayIste, kararlariOku } from './lib/telegram.js';

const DURUM_DOSYASI = path.resolve('data/durum.json');

function durumYukle() {
  try {
    return JSON.parse(fs.readFileSync(DURUM_DOSYASI, 'utf8'));
  } catch {
    return { telegramOffset: 0, kaynakHatalari: {} };
  }
}

async function benzerleriBirlestir(veri, yeniIdler, tam = false) {
  const simdi = Date.now();
  const aday = veri.hikayeler
    .filter((h) => !h.genel && h.durum !== 'reddedildi' && simdi - new Date(h.ilkGorulme).getTime() < 36 * 36e5)
    .sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme))
    .slice(0, 90);
  if (aday.length < 2 || (!tam && !aday.some((h) => yeniIdler.has(h.id)))) return 0;
  const talimat = `Aşağıda numaralı yerel haber başlıkları var. AYNI OLAYI (aynı kişi/kurum, aynı yer, aynı gelişme) anlatan başlıkları grupla.
Sadece kesinlikle aynı olay olanları grupla. Aynı konudaki farklı olaylar (iki ayrı kaza, iki ayrı operasyon, aynı belediyenin iki ayrı hizmeti) ayrı kalsın. Emin değilsen gruplama.
Yalnızca JSON döndür: {"gruplar": [[1, 4], [2, 7, 9]]}. Aynı olay yoksa {"gruplar": []}.`;
  const j = await jsonYaz(talimat, aday.map((h, i) => `${i + 1}. ${h.baslik}`).join('\n'), { sicaklik: 0 });
  let birlesen = 0;
  for (const grup of j?.gruplar || []) {
    const uyeler = [...new Set(grup)].map((n) => aday[Number(n) - 1]).filter((h) => h && veri.hikayeler.includes(h));
    if (uyeler.length < 2 || uyeler.length > 6 || (!tam && !uyeler.some((h) => yeniIdler.has(h.id)))) continue;
    // Ana haber: kendi yazımız olan, yoksa ilk görülen
    uyeler.sort((a, b) => Boolean(b.metin) - Boolean(a.metin) || new Date(a.ilkGorulme) - new Date(b.ilkGorulme));
    const [ana, ...digerleri] = uyeler;
    for (const d of digerleri) {
      for (const k of d.kaynaklar) if (!ana.kaynaklar.some((x) => x.link === k.link)) ana.kaynaklar.push(k);
      ana.ilceler = [...new Set([...ana.ilceler, ...d.ilceler])];
      if (!ana.gorsel && d.gorsel) Object.assign(ana, { gorsel: d.gorsel, gorselKaynak: d.gorselKaynak });
      ana.riskNedenleri = [...new Set([...ana.riskNedenleri, ...d.riskNedenleri])];
      veri.hikayeler.splice(veri.hikayeler.indexOf(d), 1);
      birlesen++;
    }
    ana.sonGuncelleme = new Date().toISOString();
  }
  return birlesen;
}

async function dene(id) {
  const kaynak = KAYNAKLAR.find((k) => k.id === id);
  if (!kaynak) throw new Error(`Kaynak bulunamadı: ${id}`);
  const haberler = kaynak.tur === 'html' ? await kurumOku(kaynak, { eskiDahil: true }) : await kaynakOku(kaynak);
  let mersin = 0;
  for (const h of haberler) {
    const d = haberiDegerlendir(h, kaynak);
    if (!d) continue;
    if (!d.genel) mersin++;
    console.log(`${d.genel ? '·' : '✓'} [${d.genel ? 'genel' : d.ilceler.join(',') || 'mersin'}] [${d.kategori}]${d.riskNedenleri.length ? ' [RİSKLİ]' : ''} ${d.baslik}${h.govde !== undefined ? ` (metin ${h.govde.length} kr${h.foto ? ', foto' : ''})` : ''}`);
    if (kaynak.tur === 'html') console.log(`    tarih: ${h.tarih || '-'} · foto: ${h.foto || '-'} · ${h.link}`);
  }
  console.log(`\n${haberler.length} haber okundu, ${mersin} tanesi Mersin ile ilgili.`);
}

async function main() {
  const i = process.argv.indexOf('--dene');
  if (i > -1) return dene(process.argv[i + 1]);

  const ham = yukle();
  // Silinmek üzere olan kendi haberlerimiz kalıcı arşive geçer (temizle listeyi yerinde değiştirir)
  const onceki = [...ham.hikayeler];
  const veri = temizle(ham);
  const kalan = new Set(veri.hikayeler.map((h) => h.id));
  const arsiveGiden = arsiveEkle(onceki.filter((h) => !kalan.has(h.id)));
  if (arsiveGiden) console.log(`🗄  Arşive alınan haber: ${arsiveGiden}`);
  // Hariç tutulan bağlantılar (ör. video galerileri) sonradan eklendiyse eski kayıtlardan da çıkar
  for (const h of veri.hikayeler) {
    h.kaynaklar = h.kaynaklar.filter((k) => {
      const kk = KAYNAKLAR.find((x) => x.id === k.kaynakId);
      return !(kk?.haricDesen && new RegExp(kk.haricDesen).test(k.link));
    });
  }
  veri.hikayeler = veri.hikayeler.filter((h) => h.kaynaklar.length);
  // Başlığa haberin spotu da yapışmışsa kes ("... buldu Hakkında ...")
  for (const h of veri.hikayeler) {
    if (h.baslik.length <= 110) continue;
    const m = h.baslik.slice(40).search(/[a-zçğıöşü0-9] [A-ZÇĞİÖŞÜ][a-zçğıöşü]/);
    if (m > -1) h.baslik = h.baslik.slice(0, 40 + m + 1);
  }
  const durum = durumYukle();
  const yeniRiskliler = [];
  let yeniSayi = 0;
  const yeniIdler = new Set();

  // 1) Kaynakları oku
  const kayitliLinkler = new Set(veri.hikayeler.flatMap((h) => h.kaynaklar.map((k) => k.link)));
  const fotoKuyrugu = [];
  for (const kaynak of aktifKaynaklar()) {
    try {
      durum.kurumGorulen ??= {};
      const haberler =
        kaynak.tur === 'html'
          ? await kurumOku(kaynak, { bilinen: (l) => kayitliLinkler.has(l), gorulen: (durum.kurumGorulen[kaynak.id] ??= []) })
          : await kaynakOku(kaynak);
      for (const ham of haberler) {
        const haber = haberiDegerlendir(ham, kaynak);
        if (!haber) continue;
        // 24 saatten eski Türkiye/dünya haberi alınmaz (temizlenip tekrar eklenmesin)
        if (haber.genel && haber.tarih && Date.now() - new Date(haber.tarih).getTime() > 24 * 36e5) continue;
        const { yeni, hikaye } = hikayeyeEkle(veri, haber, kaynak);
        if (yeni) yeniSayi++;
        if (yeni && hikaye) yeniIdler.add(hikaye.id);
        // Kurum fotoğrafı: yapay zekâ görselinden ve temsili fotoğraftan önce gelir
        if (kaynak.fotoKullan && ham.foto && hikaye && (!hikaye.gorsel || hikaye.gorselKaynak === 'yz')) {
          fotoKuyrugu.push({ hikaye, url: ham.foto, ad: kaynak.ad });
        }
      }
      delete durum.kaynakHatalari[kaynak.id];
    } catch (e) {
      durum.kaynakHatalari[kaynak.id] = { hata: String(e.message || e), zaman: new Date().toISOString() };
      console.warn(`! ${kaynak.ad}: ${e.message}`);
    }
  }

  // Aynı olayı farklı başlıklarla yazan haberleri tek haberde birleştir (yapay zekâ ile, sadece yeni haber varsa)
  // Günde bir kez son 36 saatin tamamı taranır, diğer çalışmalarda sadece yeni haberler
  const bugunGun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const tamTarama = durum.tamBirlestirme !== bugunGun;
  if (geminiHazirMi() && (yeniIdler.size || tamTarama)) {
    try {
      const n = await benzerleriBirlestir(veri, yeniIdler, tamTarama);
      durum.tamBirlestirme = bugunGun;
      if (n) console.log(`🔗 Aynı olay olduğu için birleştirilen haber: ${n}`);
    } catch (e) {
      console.warn(`! Birleştirme: ${e.message.slice(0, 160)}`);
    }
  }

  // Google'da çok arananlar: eşleşen Türkiye/dünya haberleri öne çıkar
  try {
    durum.trendler = { guncelleme: new Date().toISOString(), liste: (await trendGetir('MersinAnlikBot/1.0 (+https://mersinanlik.com)')).slice(0, 25) };
  } catch (e) {
    console.warn(`! Trendler: ${e.message}`);
  }
  const trendler = durum.trendler?.liste || [];
  let trendSayi = 0;
  // Eski, gevşek kuralla verilmiş eşleşmeleri temizle (her arama için tek haber kalsın)
  const gorulenTrend = new Set();
  const trafikBul = (t) => trendler.find((x) => kucuk(x.baslik) === kucuk(t))?.trafik ?? 0;
  for (const h of [...veri.hikayeler].sort((a, b) => new Date(a.ilkGorulme) - new Date(b.ilkGorulme))) {
    if (!h.trend) continue;
    const k = kucuk(h.trend);
    if (!trendEslesir(h.trend, h.baslik, trafikBul(h.trend)) || gorulenTrend.has(k)) delete h.trend;
    else gorulenTrend.add(k);
  }
  // Her çok aranan konu için en fazla bir haber öne çıkar (aynı aramaya onlarca haber bağlanmasın)
  const kullanilan = new Set(veri.hikayeler.filter((h) => h.trend).map((h) => kucuk(h.trend)));
  for (const h of veri.hikayeler) {
    if (!h.genel || h.trend) continue;
    const t = trendler.find((x) => !kullanilan.has(kucuk(x.baslik)) && trendEslesir(x.baslik, h.baslik, x.trafik));
    if (t) {
      kullanilan.add(kucuk(t.baslik));
      h.trend = t.baslik;
      trendSayi++;
    }
  }
  if (trendSayi) console.log(`🔥 Çok aranan konuyla eşleşen haber: ${trendSayi}`);

  // Risk kuralları değişmiş olabilir: bekleyenleri güncel kurallarla yeniden değerlendir
  for (const h of veri.hikayeler) {
    if (h.durum !== 'onay-bekliyor' || h.onaylandi) continue;
    h.riskNedenleri = [...new Set(h.kaynaklar.flatMap((k) => riskBul(k.baslik)))];
    if (!h.riskNedenleri.length) h.durum = 'yayinda';
  }

  // Onaya gidecekler: riskli olup henüz sorulmamış, ve Türkiye/dünya haberiyse önemli hâle gelmiş olanlar
  for (const h of veri.hikayeler) {
    if (h.durum === 'onay-bekliyor' && !h.onaySoruldu && onemliMi(h)) yeniRiskliler.push(h);
  }

  // 2) Telegram: önce basılan düğmeleri oku, sonra yeni riskli haberleri gönder
  if (telegramHazirMi()) {
    try {
      const { kararlar, offset } = await kararlariOku(durum.telegramOffset || 0);
      durum.telegramOffset = offset;
      for (const { islem, id } of kararlar) {
        const h = veri.hikayeler.find((x) => x.id === id);
        if (!h) continue;
        h.durum = islem === 'ok' ? 'yayinda' : 'reddedildi';
        h.onaylandi = islem === 'ok';
      }
      for (const h of [...new Set(yeniRiskliler)]) {
        await onayIste(h);
        h.onaySoruldu = true;
      }
    } catch (e) {
      console.warn(`! Telegram: ${e.message}`);
    }
  }

  // 3) Özet: sadece izin verilen kaynaklardan gelen, özeti olmayan yayındaki haberler
  if (geminiHazirMi()) {
    // Haberleri kendi cümlelerimizle yaz: kaynakların metnini al (önce kurum, sonra ajans, sonra yerel site),
    // aynı olayı yazan iki kaynağın metnini birleştirip yapay zekâya yazdır. Kaynak, haber sayfasının en altında yer alır.
    const ONCELIK = { kurum: 0, yerel: 1, ulusal: 2, karma: 3 };
    const simdi = Date.now();
    const eksikMetin = veri.hikayeler
      .filter((h) => h.durum === 'yayinda' && !h.metin && !h.ozetIcinMetin && (h.metinDenemesi || 0) < 2 && !h.metinDenendi && simdi - new Date(h.ilkGorulme).getTime() < 36 * 36e5 && (!h.genel || onemliMi(h)))
      .sort((x, y) => new Date(y.ilkGorulme) - new Date(x.ilkGorulme))
      .slice(0, 10);
    for (const h of eksikMetin) {
      h.metinDenemesi = (h.metinDenemesi || 0) + 1;
      const adaylar = h.kaynaklar
        .map((kayit) => ({ kayit, kaynak: KAYNAKLAR.find((k) => k.id === kayit.kaynakId) }))
        .filter((x) => x.kaynak)
        .sort((x, y) => (ONCELIK[x.kaynak.kapsam] ?? 9) - (ONCELIK[y.kaynak.kapsam] ?? 9));
      const parcalar = [];
      for (const { kayit, kaynak } of adaylar) {
        if (parcalar.length >= 2 || parcalar.some((p) => p.ad === kaynak.ad)) continue;
        try {
          const d = await kurumMetniGetir(kayit.link, kaynak);
          if (d.govde && d.govde.length > 250) parcalar.push({ ad: kaynak.ad, kurum: kaynak.kapsam === 'kurum', metin: d.govde.slice(0, 3200) });
        } catch (e) {
          console.warn(`! Haber metni (${kaynak.ad}): ${e.message}`);
        }
      }
      if (!parcalar.length) continue;
      h.ozetIcinMetin = parcalar.map((p, i) => (parcalar.length > 1 ? `[Kaynak ${i + 1}]\n${p.metin}` : p.metin)).join('\n\n');
      h.yaziKaynak = parcalar[0].ad;
      if (parcalar[0].kurum) h.kurum = parcalar[0].ad;
    }
    const bekleyen = veri.hikayeler.filter((h) => h.ozetIcinMetin && !h.metin && h.durum === 'yayinda' && (h.yazimDenemesi || 0) < 5).slice(0, 10);
    for (const h of bekleyen) h.yazimDenemesi = (h.yazimDenemesi || 0) + 1;
    const uygula = (liste, sonuclar) =>
      liste.forEach((h, i) => {
        const r = sonuclar[i];
        if (!r) return;
        h.ozet = r.ozet;
        if (r.metin) h.metin = r.metin;
        delete h.ozetIcinMetin;
      });
    // Önce toplu, toplu yanıt bozuk gelirse (ör. JSON hatası) tek tek dene: biri yüzünden hepsi kalmasın
    const toplu = bekleyen.filter((h) => (h.yazimDenemesi || 0) <= 1);
    const tekli = bekleyen.filter((h) => (h.yazimDenemesi || 0) > 1);
    try {
      if (toplu.length) uygula(toplu, await topluOzetle(toplu.map((h) => `${h.baslik}\n${h.ozetIcinMetin}`)));
    } catch (e) {
      console.warn(`! Gemini toplu: ${e.message} → tek tek deneniyor`);
      tekli.push(...toplu);
    }
    for (const h of tekli) {
      try {
        uygula([h], await topluOzetle([`${h.baslik}\n${h.ozetIcinMetin}`]));
      } catch (e) {
        console.warn(`! Gemini (${h.baslik.slice(0, 40)}): ${e.message}`);
      }
    }
    if (bekleyen.length) console.log(`✍️  Haber yazısı: ${bekleyen.filter((h) => h.metin).length}/${bekleyen.length}`);
  }

  // 4a) Kurum fotoğrafları
  for (const { hikaye, url, ad } of fotoKuyrugu) {
    try {
      hikaye.gorsel = await kurumFotosuIndir(hikaye, url, ad);
      console.log(`📷 Kurum fotoğrafı: ${hikaye.baslik}`);
    } catch (e) {
      console.warn(`! Kurum fotoğrafı: ${e.message}`);
    }
  }

  // 4b) Yapay zekâ görselleri (günlük limitle)
  for (const h of veri.hikayeler) if (/HTTP (401|403|429)/.test(h.gorselHatasi || '')) delete h.gorselHatasi;
  if (gorselUretimHazirMi()) {
    const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
    if (durum.gorsel?.gun !== bugun) durum.gorsel = { gun: bugun, adet: 0 };
    const kalan = Math.min(AYAR.calismaBasinaGorsel, AYAR.gunlukGorselLimiti - durum.gorsel.adet);
    for (const h of gorselAdaylari(veri.hikayeler).slice(0, Math.max(0, kalan))) {
      try {
        h.gorsel = await gorselUret(h);
        durum.gorsel.adet++;
        console.log(`🖼  Görsel üretildi: ${h.baslik}`);
      } catch (e) {
        console.warn(`! Görsel: ${e.message}`);
        if (/HTTP (401|403|429|5\d\d)/.test(e.message)) break; // anahtar/kota/sunucu sorunu: sonra tekrar denenir
        h.gorselHatasi = String(e.message).slice(0, 120); // görsel bu haber için üretilemiyor (ör. güvenlik filtresi)
      }
    }
  }
  const silinen = sahipsizleriSil(veri.hikayeler);
  if (silinen) console.log(`${silinen} eski görsel silindi.`);

  kaydet(veri);
  fs.writeFileSync(DURUM_DOSYASI, JSON.stringify(durum, null, 1));
  console.log(`Bitti: ${yeniSayi} yeni haber, ${yeniRiskliler.length} onaya gönderildi, toplam ${veri.hikayeler.length}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
