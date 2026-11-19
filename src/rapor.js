// Günlük işleyiş raporu: bugün kaç haber toplandı, kaçı yazıldı, hangi otomatik haberler çıktı, kaynak hataları.
// Her çalışmada data/rapor.json güncellenir (son 30 gün); site /durum/ sayfasında gösterir.
// Telegram ayarlıysa her akşam 21.00'den sonra bir kez özet mesajı gönderilir.
import fs from 'node:fs';
import { arsivYukle } from './lib/arsiv.js';

const TZ = 'Europe/Istanbul';
const simdi = Date.now();
const gun = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: TZ });
const bugun = gun(simdi);
const oku = (y, v) => {
  try {
    return JSON.parse(fs.readFileSync(y, 'utf8'));
  } catch {
    return v;
  }
};
const veri = oku('data/haberler.json', { hikayeler: [] });
const durum = oku('data/durum.json', {});
const bilgi = oku('data/bilgi.json', { yazilar: [] });
const gezi = oku('data/gezi.json', { yerler: [] });
const rapor = oku('data/rapor.json', { gunler: {} });

const canli = new Set(veri.hikayeler.map((x) => x.id));
const tum = [...veri.hikayeler, ...arsivYukle().filter((x) => !canli.has(x.id))].filter((x) => gun(x.ilkGorulme) === bugun);
const mersin = tum.filter((x) => !x.genel);
const otomatik = tum.filter((x) => x.otomatik || x.macHaberi);
const turSay = {};
for (const x of otomatik) turSay[x.kapak || 'diger'] = (turSay[x.kapak || 'diger'] || 0) + 1;
const hatalar = Object.entries(durum.kaynakHatalari || {}).filter(([, v]) => simdi - new Date(v.zaman).getTime() < 24 * 36e5).map(([k, v]) => `${k} (${v.hata})`);

rapor.gunler[bugun] = {
  guncelleme: new Date(simdi).toISOString(),
  mersinHaber: mersin.length,
  kendiYazimiz: mersin.filter((x) => x.metin).length,
  turkiyeDunya: tum.filter((x) => x.genel).length,
  otomatik: otomatik.length,
  otomatikTurler: turSay,
  otomatikBasliklar: otomatik.map((x) => ({ baslik: x.baslik, tur: x.kapak || '', saat: new Date(x.ilkGorulme).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) })),
  gorsel: durum.gorsel?.gun === bugun ? durum.gorsel.adet : 0,
  bilgi: (bilgi.yazilar || []).filter((y) => gun(y.tarih) === bugun).length,
  gezi: (gezi.yerler || []).filter((y) => gun(y.tarih) === bugun).length,
  kaynakHatalari: hatalar,
};
for (const g of Object.keys(rapor.gunler).sort().slice(0, -30)) delete rapor.gunler[g];

// Telegram: akşam bir kez
const saat = Number(new Date(simdi).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }));
if (saat >= 21 && rapor.gonderilen !== bugun && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
  const r = rapor.gunler[bugun];
  const dun = rapor.gunler[gun(simdi - 864e5)];
  const fark = (a, b) => (b == null ? '' : a === b ? ' (dünle aynı)' : ` (dün ${b}, ${a > b ? '+' : ''}${a - b})`);
  const metin = [
    `📊 Mersin Anlık günlük rapor · ${bugun}`,
    `Mersin haberi: ${r.mersinHaber}${fark(r.mersinHaber, dun?.mersinHaber)}`,
    `Kendi yazımız: ${r.kendiYazimiz}${fark(r.kendiYazimiz, dun?.kendiYazimiz)}`,
    `Otomatik haber: ${r.otomatik}${fark(r.otomatik, dun?.otomatik)}`,
    ...r.otomatikBasliklar.map((x) => `  • ${x.saat} ${x.baslik}`),
    `Üretilen görsel: ${r.gorsel} · Bilgi yazısı: ${r.bilgi} · Gezi rehberi: ${r.gezi}`,
    r.kaynakHatalari.length ? `⚠️ Erişilemeyen kaynak: ${r.kaynakHatalari.join(', ')}` : '✅ Kaynak hatası yok',
    'Ayrıntı: https://mersinanlik.com/durum/',
  ].join('\n');
  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: metin, disable_web_page_preview: true }) });
    if ((await res.json()).ok) rapor.gonderilen = bugun;
  } catch (e) {
    console.warn('! Rapor Telegram:', e.message);
  }
}
fs.writeFileSync('data/rapor.json', JSON.stringify(rapor, null, 1));
const r = rapor.gunler[bugun];
console.log(`Rapor: ${r.mersinHaber} Mersin haberi, ${r.kendiYazimiz} yazı, ${r.otomatik} otomatik haber, ${r.kaynakHatalari.length} kaynak hatası`);
