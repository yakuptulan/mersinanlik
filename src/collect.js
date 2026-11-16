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
import { riskBul } from './lib/text.js';
import { AYAR } from './config.js';
import { gorselUretimHazirMi, gorselUret, gorselAdaylari, sahipsizleriSil, kurumFotosuIndir } from './lib/gorsel-uret.js';
import { kurumOku } from './lib/kurum.js';
import { geminiHazirMi, topluOzetle } from './lib/gemini.js';
import { telegramHazirMi, onayIste, kararlariOku } from './lib/telegram.js';

const DURUM_DOSYASI = path.resolve('data/durum.json');

function durumYukle() {
  try {
    return JSON.parse(fs.readFileSync(DURUM_DOSYASI, 'utf8'));
  } catch {
    return { telegramOffset: 0, kaynakHatalari: {} };
  }
}

async function dene(id) {
  const kaynak = KAYNAKLAR.find((k) => k.id === id);
  if (!kaynak) throw new Error(`Kaynak bulunamadı: ${id}`);
  const haberler = await kaynakOku(kaynak);
  let mersin = 0;
  for (const h of haberler) {
    const d = haberiDegerlendir(h, kaynak);
    if (!d) continue;
    if (!d.genel) mersin++;
    console.log(`${d.genel ? '·' : '✓'} [${d.genel ? 'genel' : d.ilceler.join(',') || 'mersin'}] [${d.kategori}]${d.riskNedenleri.length ? ' [RİSKLİ]' : ''} ${d.baslik}`);
  }
  console.log(`\n${haberler.length} haber okundu, ${mersin} tanesi Mersin ile ilgili.`);
}

async function main() {
  const i = process.argv.indexOf('--dene');
  if (i > -1) return dene(process.argv[i + 1]);

  const veri = temizle(yukle());
  const durum = durumYukle();
  const yeniRiskliler = [];
  let yeniSayi = 0;

  // 1) Kaynakları oku
  const kayitliLinkler = new Set(veri.hikayeler.flatMap((h) => h.kaynaklar.map((k) => k.link)));
  const fotoKuyrugu = [];
  for (const kaynak of aktifKaynaklar()) {
    try {
      const haberler = kaynak.tur === 'html' ? await kurumOku(kaynak, { bilinen: (l) => kayitliLinkler.has(l) }) : await kaynakOku(kaynak);
      for (const ham of haberler) {
        const haber = haberiDegerlendir(ham, kaynak);
        if (!haber) continue;
        // 24 saatten eski Türkiye/dünya haberi alınmaz (temizlenip tekrar eklenmesin)
        if (haber.genel && haber.tarih && Date.now() - new Date(haber.tarih).getTime() > 24 * 36e5) continue;
        const { yeni, hikaye } = hikayeyeEkle(veri, haber, kaynak);
        if (yeni) yeniSayi++;
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
    const bekleyen = veri.hikayeler.filter((h) => !h.ozet && h.ozetIcinMetin && h.durum === 'yayinda').slice(0, 20);
    try {
      const ozetler = await topluOzetle(bekleyen.map((h) => `${h.baslik}\n${h.ozetIcinMetin}`));
      bekleyen.forEach((h, i) => {
        if (ozetler[i]) {
          h.ozet = ozetler[i];
          delete h.ozetIcinMetin;
        }
      });
    } catch (e) {
      console.warn(`! Gemini: ${e.message}`);
    }
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
