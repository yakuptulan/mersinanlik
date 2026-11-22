// Facebook sayfası ve Instagram hesabına otomatik paylaşım (Meta Graph API, resmî yol).
// Anahtar: GitHub'da META_TOKEN (Mersin Anlık işletme portföyündeki "mersinanlik-paylasim" sistem kullanıcısının süresiz jetonu).
//
// Kullanım:
//   node src/sosyal.js --kontrol   → jetonun gördüğü sayfa ve Instagram hesabını yazar (paylaşım yapmaz)
//   node src/sosyal.js --hazirla   → (site üretildikten sonra, yayından önce) sıradaki haberleri seçer, Instagram kartını dist/sosyal/ içine çizer
//   node src/sosyal.js --paylas    → (yayından sonra) seçilen haberleri Facebook'a (link) ve Instagram'a (kart) gönderir
//
// Kurallar: sadece Mersin haberleri, riskli/onaylı olmayan ve siyaset haberleri yok; gece paylaşım yok;
// günlük üst sınır ve iki paylaşım arası bekleme süresi var. Yeni hesapları korumak için başlangıç tarihleri ileri alınmış.
import fs from 'node:fs';
import path from 'node:path';
import { SITE, GUNDEM, KATEGORILER, ILCELER } from './config.js';
import { haberYolu, kapakAdresi } from './templates/parcalar.js';

const API = 'https://graph.facebook.com/v23.0';
const TOKEN = process.env.META_TOKEN;
const DURUM_DOSYASI = 'data/sosyal.json';
const KART_KLASORU = 'dist/sosyal';

export const AYAR = {
  facebook: { baslangic: '2026-11-23T09:00:00+03:00', gunluk: 8, araDakika: 75 },
  instagram: { baslangic: '2026-11-25T10:00:00+03:00', gunluk: 3, araDakika: 180 },
  sessizBas: 23, // 23:00 – 08:00 arası paylaşım yok
  sessizBit: 8,
  enEskiSaat: 6, // bundan eski haber paylaşılmaz
  haricKategori: new Set(['siyaset']),
};

const ILCE_AD = Object.fromEntries(ILCELER.map((i) => [i.slug, i.ad]));
const KAT = Object.fromEntries([...KATEGORILER, GUNDEM].map((k) => [k.slug, k]));

function trSaat(t = Date.now()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false }).format(t));
}
function trGun(t = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(t);
}

function durumOku() {
  try {
    return JSON.parse(fs.readFileSync(DURUM_DOSYASI, 'utf8'));
  } catch {
    return { facebook: [], instagram: [], kuyruk: {} };
  }
}
function durumYaz(d) {
  for (const p of ['facebook', 'instagram']) d[p] = (d[p] || []).filter((x) => Date.now() - Date.parse(x.zaman) < 30 * 864e5);
  fs.writeFileSync(DURUM_DOSYASI, JSON.stringify(d, null, 1));
}

async function graph(yol, { method = 'GET', govde = null, token = TOKEN } = {}) {
  const url = new URL(API + yol);
  let istek = { method };
  if (method === 'GET') url.searchParams.set('access_token', token);
  else {
    const f = new URLSearchParams({ ...govde, access_token: token });
    istek = { method, body: f, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
  }
  const r = await fetch(url, istek);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error ? `${j.error.message} (kod ${j.error.code}${j.error.error_subcode ? '/' + j.error.error_subcode : ''})` : `HTTP ${r.status}`);
  return j;
}

async function hesaplar() {
  const sayfalar = await graph('/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}');
  const sayfa = (sayfalar.data || []).find((s) => /mersin anl[ıi]k/i.test(s.name)) || sayfalar.data?.[0];
  if (!sayfa) throw new Error('Jeton hiçbir Facebook sayfası görmüyor');
  return { sayfa, ig: sayfa.instagram_business_account || null };
}

function haberler() {
  const veri = JSON.parse(fs.readFileSync('data/haberler.json', 'utf8'));
  return veri.hikayeler || [];
}

function uygun(h) {
  if (h.durum !== 'yayinda' || h.genel) return false;
  if ((h.riskNedenleri || []).length && !h.onaylandi) return false;
  if (AYAR.haricKategori.has(h.kategori)) return false;
  if (!h.baslik || h.baslik.length < 20) return false;
  const yas = Date.now() - Date.parse(h.ilkGorulme);
  return yas >= 0 && yas < AYAR.enEskiSaat * 36e5;
}

// Önem: kaç kaynakta geçtiği + tazelik
function puan(h) {
  const yasSaat = (Date.now() - Date.parse(h.ilkGorulme)) / 36e5;
  return (h.kaynaklar?.length || 1) * 2 - yasSaat;
}

function siraGeldi(platform, d, simdi = Date.now()) {
  const a = AYAR[platform];
  if (simdi < Date.parse(a.baslangic)) return `başlangıç tarihi bekleniyor (${a.baslangic.slice(0, 10)})`;
  const saat = trSaat(simdi);
  if (saat >= AYAR.sessizBas || saat < AYAR.sessizBit) return 'gece saatleri';
  const gecmis = d[platform] || [];
  const bugun = gecmis.filter((x) => trGun(Date.parse(x.zaman)) === trGun(simdi)).length;
  if (bugun >= a.gunluk) return `günlük sınır doldu (${bugun})`;
  const son = gecmis.at(-1);
  if (son && simdi - Date.parse(son.zaman) < a.araDakika * 6e4) return 'iki paylaşım arası bekleme';
  return null;
}

function aday(platform, d, haric = new Set()) {
  const paylasilan = new Set((d[platform] || []).map((x) => x.id));
  const liste = haberler().filter((h) => uygun(h) && !paylasilan.has(h.id) && !haric.has(h.id));
  if (platform === 'instagram') {
    // Instagram'da görsel şart
    return liste.filter((h) => { const k = kapakAdresi(h); return k?.src && !k.cizim; }).sort((a, b) => puan(b) - puan(a))[0] || null;
  }
  return liste.sort((a, b) => puan(b) - puan(a))[0] || null;
}

function etiketler(h) {
  const e = ['#Mersin', '#MersinHaber'];
  for (const i of (h.ilceler || []).slice(0, 2)) if (ILCE_AD[i]) e.push('#' + ILCE_AD[i].replace(/\s/g, ''));
  return e.join(' ');
}

function kisalt(s, n) {
  if (!s || s.length <= n) return s || '';
  const k = s.slice(0, n);
  const nokta = k.lastIndexOf('. ');
  return (nokta > n * 0.5 ? k.slice(0, nokta + 1) : k.replace(/\s+\S*$/, '') + '…');
}

export function facebookMetni(h) {
  return `${h.baslik}\n\n${kisalt(h.ozet, 280)}\n\n${etiketler(h)}`;
}

export function instagramMetni(h) {
  return `${h.baslik}\n\n${kisalt(h.ozet, 600)}\n\n📲 Haberin tamamı ve Mersin'deki son gelişmeler için profildeki bağlantıya dokunun: mersinanlik.com\n\n${etiketler(h)} #SonDakika #MersinAnlık`;
}

// ---------- Instagram kartı (1080x1350) ----------
const W = 1080;
const H = 1350;
const kacis = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function genislik(metin, boyut) {
  let w = 0;
  for (const c of metin) {
    if (/[iıl'.,:;!|j]/.test(c)) w += 0.28;
    else if (/[ftrI ]/.test(c)) w += 0.36;
    else if (/[mwMW]/.test(c)) w += 0.9;
    else if (/[A-ZÇĞİÖŞÜ0-9]/.test(c)) w += 0.7;
    else w += 0.6;
  }
  return w * boyut;
}

export function satirlara(metin, boyut, enFazla) {
  const kelimeler = metin.split(/\s+/);
  const satirlar = [];
  let s = '';
  for (const k of kelimeler) {
    const dene = s ? s + ' ' + k : k;
    if (genislik(dene, boyut) > enFazla && s) {
      satirlar.push(s);
      s = k;
    } else s = dene;
  }
  if (s) satirlar.push(s);
  return satirlar;
}

export async function kartCiz(h, cikti) {
  const sharp = (await import('sharp')).default;
  const { Resvg } = await import('@resvg/resvg-js');
  const kapak = kapakAdresi(h);
  const yerel = path.join('public', kapak.src);
  const foto = await sharp(yerel).resize(W, 820, { fit: 'cover', position: 'attention' }).jpeg({ quality: 90 }).toBuffer();
  const logo = fs.readFileSync('assets/logo-seffaf.png').toString('base64');
  const kat = KAT[h.kategori] || GUNDEM;
  const ilce = (h.ilceler || []).map((i) => ILCE_AD[i]).filter(Boolean)[0] || 'Mersin';

  let boyut = 64;
  let satir = satirlara(h.baslik, boyut, W - 128);
  while (satir.length > 4 && boyut > 44) {
    boyut -= 4;
    satir = satirlara(h.baslik, boyut, W - 128);
  }
  if (satir.length > 5) satir = [...satir.slice(0, 4), satir.slice(4).join(' ')].slice(0, 5);
  const satirYuk = Math.round(boyut * 1.2);
  const sonSatir = 890; // başlığın son satırı lacivert alanda biter
  const ilkSatir = sonSatir - (satir.length - 1) * satirYuk;
  const yapayZeka = !kapak.kurum && !kapak.kapak && /\/uretilen\//.test(kapak.src) && (!h.gorselKaynak || h.gorselKaynak === 'yz');
  const tarih = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long' }).format(Date.parse(h.ilkGorulme));
  const katAd = kat.ad.toLocaleUpperCase('tr-TR');
  const ozetSatir = satirlara(kisalt(h.ozet, 210), 31, W - 150).slice(0, 3);
  const ozetBas = sonSatir + 150;
  const gorselBit = 820;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#0A1530" stop-opacity="0"/>
<stop offset="0.45" stop-color="#0A1530" stop-opacity="0.55"/>
<stop offset="0.8" stop-color="#0A1530" stop-opacity="0.92"/>
<stop offset="1" stop-color="#0A1530" stop-opacity="1"/>
</linearGradient>
<linearGradient id="ust" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#0A1530" stop-opacity="0.7"/>
<stop offset="1" stop-color="#0A1530" stop-opacity="0"/>
</linearGradient>
<filter id="golge" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="#0A1530"/>
<image href="data:image/jpeg;base64,${foto.toString('base64')}" x="0" y="0" width="${W}" height="${gorselBit}" preserveAspectRatio="xMidYMid slice"/>
<rect x="0" y="0" width="${W}" height="210" fill="url(#ust)"/>
<rect x="0" y="${ilkSatir - 260}" width="${W}" height="${gorselBit - ilkSatir + 261}" fill="url(#g)"/>
<image href="data:image/png;base64,${logo}" x="${W - 56 - 195}" y="40" width="195" height="130"/>
${yapayZeka ? `<text x="64" y="72" font-family="Poppins" font-weight="500" font-size="22" fill="#FFFFFF" fill-opacity="0.75">Temsili görsel</text>` : ''}
<rect x="64" y="${ilkSatir - boyut - 62}" rx="10" ry="10" width="${Math.round(genislik(katAd, 25) + 40)}" height="46" fill="${kat.renk}"/>
<text x="84" y="${ilkSatir - boyut - 30}" font-family="Poppins" font-weight="700" font-size="25" fill="#fff" letter-spacing="1">${kacis(katAd)}</text>
<g filter="url(#golge)" opacity="0.8">${satir.map((s, i) => `<text x="64" y="${ilkSatir + i * satirYuk + 3}" font-family="Poppins" font-weight="700" font-size="${boyut}" fill="#000">${kacis(s)}</text>`).join('')}</g>
${satir.map((s, i) => `<text x="64" y="${ilkSatir + i * satirYuk}" font-family="Poppins" font-weight="700" font-size="${boyut}" fill="#fff">${kacis(s)}</text>`).join('\n')}
<rect x="64" y="${sonSatir + 40}" width="88" height="6" rx="3" fill="#22D3EE"/>
<text x="172" y="${sonSatir + 50}" font-family="Poppins" font-weight="500" font-size="27" fill="#8FA3C8">${kacis(ilce)} · ${kacis(tarih)}</text>
${ozetSatir.map((s, i) => `<text x="64" y="${ozetBas + i * 46}" font-family="Poppins" font-weight="500" font-size="31" fill="#D5DEEE">${kacis(s)}</text>`).join('\n')}
<rect x="0" y="${H - 116}" width="${W}" height="116" fill="#0E1D40"/>
<rect x="0" y="${H - 116}" width="${W}" height="3" fill="#22D3EE" fill-opacity="0.6"/>
<text x="64" y="${H - 46}" font-family="Poppins" font-weight="700" font-size="36" fill="#22D3EE">mersinanlik.com</text>
<text x="${W - 64}" y="${H - 48}" text-anchor="end" font-family="Poppins" font-weight="500" font-size="25" fill="#B6C4E0">Haberin tamamı profildeki bağlantıda</text>
</svg>`;
  const png = new Resvg(svg, {
    font: { fontFiles: ['assets/fonts/Poppins-Bold.ttf', 'assets/fonts/Poppins-Medium.ttf'], loadSystemFonts: true, defaultFontFamily: 'Poppins' },
    fitTo: { mode: 'width', value: W },
  })
    .render()
    .asPng();
  await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(cikti);
  return cikti;
}

// ---------- Modlar ----------
async function kontrol() {
  const ben = await graph('/me?fields=id,name');
  console.log('Jeton sahibi:', ben.name, `(${ben.id})`);
  const { sayfa, ig } = await hesaplar();
  console.log('Facebook sayfası:', sayfa.name, `(${sayfa.id})`);
  console.log('Instagram:', ig ? `@${ig.username} (${ig.id})` : 'BAĞLI DEĞİL');
  const d = durumOku();
  for (const p of ['facebook', 'instagram']) console.log(`${p}:`, siraGeldi(p, d) || 'sıra geldi', '| aday:', aday(p, d)?.baslik || '-');
}

async function hazirla() {
  const d = durumOku();
  d.kuyruk = {};
  const fbNeden = siraGeldi('facebook', d);
  if (!fbNeden) {
    const h = aday('facebook', d);
    if (h) d.kuyruk.facebook = h.id;
  }
  const igNeden = siraGeldi('instagram', d);
  if (!igNeden) {
    const h = aday('instagram', d);
    if (h) {
      fs.mkdirSync(KART_KLASORU, { recursive: true });
      await kartCiz(h, path.join(KART_KLASORU, `${h.id}.jpg`));
      d.kuyruk.instagram = h.id;
    }
  }
  console.log('Sosyal kuyruk:', JSON.stringify(d.kuyruk), '| FB:', fbNeden || 'hazır', '| IG:', igNeden || 'hazır');
  durumYaz(d);
}

async function paylas() {
  const d = durumOku();
  const kuyruk = d.kuyruk || {};
  if (!kuyruk.facebook && !kuyruk.instagram) return console.log('Sosyal: paylaşılacak bir şey yok.');
  const tum = Object.fromEntries(haberler().map((h) => [h.id, h]));
  const { sayfa, ig } = await hesaplar();

  if (kuyruk.facebook && tum[kuyruk.facebook]) {
    const h = tum[kuyruk.facebook];
    try {
      const r = await graph(`/${sayfa.id}/feed`, { method: 'POST', govde: { message: facebookMetni(h), link: SITE.url + haberYolu(h) }, token: sayfa.access_token });
      (d.facebook ||= []).push({ id: h.id, zaman: new Date().toISOString(), gonderi: r.id });
      console.log('Facebook paylaşıldı:', h.baslik);
    } catch (e) {
      console.log('Facebook paylaşılamadı:', e.message);
    }
  }

  if (kuyruk.instagram && tum[kuyruk.instagram] && ig) {
    const h = tum[kuyruk.instagram];
    const gorsel = `${SITE.url}/sosyal/${h.id}.jpg`;
    try {
      const kap = await graph(`/${ig.id}/media`, { method: 'POST', govde: { image_url: gorsel, caption: instagramMetni(h) } });
      // Medya hazır olana kadar kısa bekleme
      for (let i = 0; i < 10; i++) {
        const s = await graph(`/${kap.id}?fields=status_code`);
        if (s.status_code === 'FINISHED') break;
        if (s.status_code === 'ERROR') throw new Error('Instagram görseli işleyemedi');
        await new Promise((r) => setTimeout(r, 3000));
      }
      const r = await graph(`/${ig.id}/media_publish`, { method: 'POST', govde: { creation_id: kap.id } });
      (d.instagram ||= []).push({ id: h.id, zaman: new Date().toISOString(), gonderi: r.id });
      console.log('Instagram paylaşıldı:', h.baslik);
    } catch (e) {
      console.log('Instagram paylaşılamadı:', e.message);
    }
  }
  d.kuyruk = {};
  durumYaz(d);
}

const mod = process.argv[2];
if (mod === '--kart') {
  // Deneme: node src/sosyal.js --kart <haber-id|ilk> çıktı.jpg
  const id = process.argv[3];
  const h = id && id !== 'ilk' ? haberler().find((x) => x.id === id) : haberler().find((x) => !x.genel && kapakAdresi(x)?.src);
  await kartCiz(h, process.argv[4] || 'kart.jpg');
  console.log('Kart çizildi:', h.baslik);
} else if (['--kontrol', '--hazirla', '--paylas'].includes(mod)) {
  if (!TOKEN) {
    console.log('Sosyal: META_TOKEN yok, atlandı.');
    process.exit(0);
  }
  try {
    if (mod === '--kontrol') await kontrol();
    if (mod === '--hazirla') await hazirla();
    if (mod === '--paylas') await paylas();
  } catch (e) {
    console.log('Sosyal hata:', e.message);
  }
}
