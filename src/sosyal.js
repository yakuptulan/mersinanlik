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
import { aktifSuKesintileri } from './templates/sayfalar.js';

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
  tasarim: 'a', // tek tasarım denemesinde kullanılan varsayılan: a | b | c | d
  sabah: { bas: 8 * 60 + 30, bit: 11 * 60 }, // 'Mersin'de bugün' kartı: 08.30–11.00 arası, günde bir kez (eczane nöbeti 08.00'de değişir)
  denenenTasarimlar: ['a', 'b'], // Instagram'da sırayla denenir; karşılaştırma için her gönderiye yazılır
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

export async function kartCiz(h, cikti, tasarim = AYAR.tasarim) {
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
  const ozetSatir = ozetSatirlari(h.ozet, 31, W - 150, 3);
  const ozetBas = sonSatir + 150;
  const gorselBit = 820;

  const ortak = { h, kat, katAd, ilce, tarih, yapayZeka, logo, yerel, sharp };
  const svg = tasarim !== 'a' ? await alternatifSvg(tasarim, ortak) : `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
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


// Özeti en fazla n satıra böler; sığmazsa son satırı "…" ile kapatır
function ozetSatirlari(metin, boyut, genis, n) {
  const ilkCumle = (metin || '').split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ"“])/)[0];
  const tum = satirlara(ilkCumle, boyut, genis);
  if (tum.length <= n) return tum;
  const kes = tum.slice(0, n);
  let son = kes[n - 1];
  while (genislik(son + '…', boyut) > genis && son.includes(' ')) son = son.replace(/\s+\S*$/, '');
  kes[n - 1] = son.replace(/[,;:]$/, '') + '…';
  return kes;
}

// ---------- Alternatif kart tasarımları ----------
function baslikYerlestir(metin, enBuyuk, enKucuk, genis, enFazlaSatir) {
  let boyut = enBuyuk;
  let satir = satirlara(metin, boyut, genis);
  while (satir.length > enFazlaSatir && boyut > enKucuk) {
    boyut -= 4;
    satir = satirlara(metin, boyut, genis);
  }
  if (satir.length > enFazlaSatir) satir = [...satir.slice(0, enFazlaSatir - 1), satir.slice(enFazlaSatir - 1).join(' ')];
  return { boyut, satir, yuk: Math.round(boyut * 1.18) };
}
const yazi = (x, y, s, boyut, renk, agirlik = 700, ek = '') => `<text x="${x}" y="${y}" font-family="Poppins" font-weight="${agirlik}" font-size="${boyut}" fill="${renk}" ${ek}>${kacis(s)}</text>`;

async function alternatifSvg(tasarim, { h, kat, katAd, ilce, tarih, yapayZeka, logo, yerel, sharp }) {
  const fotoAl = async (w, hh) => (await sharp(yerel).resize(w, hh, { fit: 'cover', position: 'attention' }).jpeg({ quality: 90 }).toBuffer()).toString('base64');
  const bas = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  const temsili = (x, y, renk = '#FFFFFF', anchor = 'start') => (yapayZeka ? yazi(x, y, 'Temsili görsel', 21, renk, 500, `fill-opacity="0.75" text-anchor="${anchor}"`) : '');

  if (tasarim === 'b') {
    // Tam ekran fotoğraf, altta güçlü karartma, "son dakika" tarzı bant
    const foto = await fotoAl(W, H);
    const ilceU = ilce.toLocaleUpperCase('tr-TR');
    const { boyut, satir, yuk } = baslikYerlestir(h.baslik, 70, 48, W - 128, 4);
    const son = H - 190;
    const ilk = son - (satir.length - 1) * yuk;
    return `${bas}
<defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050B1C" stop-opacity="0"/><stop offset="0.5" stop-color="#050B1C" stop-opacity="0.75"/><stop offset="1" stop-color="#050B1C" stop-opacity="0.97"/></linearGradient>
<linearGradient id="u" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050B1C" stop-opacity="0.65"/><stop offset="1" stop-color="#050B1C" stop-opacity="0"/></linearGradient>
<filter id="gl"><feGaussianBlur stdDeviation="5"/></filter></defs>
<image href="data:image/jpeg;base64,${foto}" x="0" y="0" width="${W}" height="${H}"/>
<rect width="${W}" height="220" fill="url(#u)"/>
<rect y="${ilk - 330}" width="${W}" height="${H - ilk + 330}" fill="url(#k)"/>
<image href="data:image/png;base64,${logo}" x="48" y="40" width="180" height="120"/>
${temsili(W - 52, 74, '#FFFFFF', 'end')}
<rect x="64" y="${ilk - boyut - 70}" width="${Math.round(genislik(ilceU, 24) + 36)}" height="46" fill="#E5484D"/>
${yazi(82, ilk - boyut - 38, ilceU, 24, '#fff', 700, 'letter-spacing="1.5"')}
<rect x="${Math.round(64 + genislik(ilceU, 24) + 36)}" y="${ilk - boyut - 70}" width="${Math.round(genislik(katAd, 24) + 36)}" height="46" fill="#ffffff"/>
${yazi(Math.round(64 + genislik(ilceU, 24) + 54), ilk - boyut - 38, katAd, 24, kat.renk, 700, 'letter-spacing="1"')}
<g filter="url(#gl)" opacity="0.7">${satir.map((s, i) => yazi(64, ilk + i * yuk + 3, s, boyut, '#000')).join('')}</g>
${satir.map((s, i) => yazi(64, ilk + i * yuk, s, boyut, '#fff')).join('\n')}
<rect x="64" y="${H - 132}" width="${W - 128}" height="2" fill="#FFFFFF" fill-opacity="0.25"/>
${yazi(64, H - 74, `${ilce} · ${tarih}`, 28, '#C9D4EA', 500)}
${yazi(W - 64, H - 74, 'mersinanlik.com', 30, '#22D3EE', 700, 'text-anchor="end"')}
</svg>`;
  }

  if (tasarim === 'c') {
    // Lacivert zemin, yuvarlak köşeli çerçeveli fotoğraf, editoryal düzen
    const fw = W - 96;
    const { boyut, satir, yuk } = baslikYerlestir(h.baslik, 60, 44, W - 170, 4);
    // Başlık ve 2 satır özet her zaman sığsın: fotoğraf yüksekliği başlığa göre ayarlanır
    const fh = Math.min(640, H - 168 - 56 - boyut - (satir.length - 1) * yuk - 64 - 84 - 140);
    const foto = await fotoAl(fw, fh);
    const ilk = 168 + fh + 56 + boyut;
    const ozet = ozetSatirlari(h.ozet, 29, W - 150, 2);
    const ozetY = ilk + (satir.length - 1) * yuk + 64;
    return `${bas}
<defs><clipPath id="c"><rect x="48" y="168" width="${fw}" height="${fh}" rx="28" ry="28"/></clipPath>
<radialGradient id="p" cx="0.85" cy="0.05" r="0.9"><stop offset="0" stop-color="#173B7A"/><stop offset="1" stop-color="#0A1530"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#p)"/>
<image href="data:image/png;base64,${logo}" x="44" y="28" width="168" height="112"/>
<rect x="${W - 48 - Math.round(genislik(katAd, 24) + 40)}" y="62" rx="23" ry="23" width="${Math.round(genislik(katAd, 24) + 40)}" height="46" fill="${kat.renk}"/>
${yazi(W - 48 - Math.round(genislik(katAd, 24) + 40) / 2, 94, katAd, 24, '#fff', 700, 'text-anchor="middle" letter-spacing="1"')}
<image href="data:image/jpeg;base64,${foto}" x="48" y="168" width="${fw}" height="${fh}" clip-path="url(#c)"/>
<rect x="48" y="168" width="${fw}" height="${fh}" rx="28" ry="28" fill="none" stroke="#22D3EE" stroke-opacity="0.35" stroke-width="2"/>
${temsili(76, 168 + fh - 28)}
${satir.map((s, i) => yazi(64, ilk + i * yuk, s, boyut, '#fff')).join('\n')}
${ozet.map((s, i) => yazi(64, ozetY + i * 42, s, 29, '#AFC0E0', 500)).join('\n')}
<rect x="64" y="${H - 104}" width="56" height="6" rx="3" fill="#22D3EE"/>
${yazi(136, H - 94, `${ilce} · ${tarih}`, 26, '#8FA3C8', 500)}
${yazi(W - 64, H - 92, 'mersinanlik.com', 30, '#22D3EE', 700, 'text-anchor="end"')}
</svg>`;
  }

  // d: açık renkli gazete manşeti tarzı (akışta koyu kartlar arasında öne çıkar)
  const fh = 720;
  const foto = await fotoAl(W, fh);
  const { boyut, satir, yuk } = baslikYerlestir(h.baslik, 62, 44, W - 190, 4);
  const ilk = fh + 70 + boyut;
  const ozet = ozetSatirlari(h.ozet, 29, W - 160, 2);
  const ozetY = ilk + (satir.length - 1) * yuk + 62;
  return `${bas}
<rect width="${W}" height="${H}" fill="#F7F9FC"/>
<image href="data:image/jpeg;base64,${foto}" x="0" y="0" width="${W}" height="${fh}"/>
${temsili(W - 40, fh - 26, '#FFFFFF', 'end')}
<rect x="64" y="${fh - 30}" rx="8" ry="8" width="${Math.round(genislik(katAd, 25) + 44)}" height="60" fill="${kat.renk}"/>
${yazi(86, fh + 10, katAd, 25, '#fff', 700, 'letter-spacing="1"')}
<rect x="64" y="${ilk - boyut + 6}" width="8" height="${(satir.length - 1) * yuk + boyut}" rx="4" fill="${kat.renk}"/>
${satir.map((s, i) => yazi(92, ilk + i * yuk, s, boyut, '#0A1530')).join('\n')}
${ozet.map((s, i) => yazi(64, ozetY + i * 42, s, 29, '#4A5874', 500)).join('\n')}
<rect y="${H - 128}" width="${W}" height="128" fill="#0A1530"/>
<image href="data:image/png;base64,${logo}" x="40" y="${H - 120}" width="168" height="112"/>
${yazi(W - 64, H - 74, 'mersinanlik.com', 32, '#22D3EE', 700, 'text-anchor="end"')}
${yazi(W - 64, H - 36, `${ilce} · ${tarih}`, 24, '#8FA3C8', 500, 'text-anchor="end"')}
</svg>`;
}


// ---------- Sabah kartı: "Mersin'de bugün" ----------
function trDakika(t = Date.now()) {
  const [s, d] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false }).format(t).split(':').map(Number);
  return s * 60 + d;
}
const tl = (n, k = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: k, maximumFractionDigits: k });

export function sabahVerisi(simdi = Date.now()) {
  const servis = JSON.parse(fs.readFileSync('data/servisler.json', 'utf8'));
  const bugun = trGun(simdi);
  const [y, a, g] = bugun.split('-');
  const eczBugun = (servis.eczane?.liste || []).filter((e) => String(e.saat || '').startsWith(`${g}.${a}.${y}`));
  const eczIlce = new Set(eczBugun.map((e) => e.ilce));
  const hv = servis.hava?.yenisehir || servis.hava?.akdeniz;
  const hg = hv?.gunler?.find((x) => x.tarih === bugun);
  const nm = (servis.namaz?.bolgeler?.['9737'] || []).find((x) => x.tarih === bugun);
  const su = aktifSuKesintileri(servis, simdi);
  const suYer = [...new Set(su.flatMap((k) => k.ilceler.map((i) => i.ad)))];
  const pk = servis.piyasa?.kalemler || {};
  const gunAd = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', weekday: 'long' }).format(simdi);
  return { bugun, gunAd, eczane: eczBugun.length, eczIlce: eczIlce.size, hava: hg ? { min: hg.min, max: hg.max, durum: hg.durum } : null, namaz: nm || null, su, suYer, gram: pk.gram, usd: pk.usd };
}

export function sabahMetni(v, platform) {
  const sat = [
    `☀️ Mersin'de bugün · ${v.gunAd}`,
    '',
    v.hava ? `🌤 Hava: ${v.hava.durum}, ${v.hava.min}° / ${v.hava.max}°` : null,
    v.eczane ? `💊 Nöbetçi eczane: ${v.eczIlce} ilçede ${v.eczane} eczane nöbette` : null,
    v.su.length ? `💧 Su kesintisi: ${v.suYer.join(', ')}` : '💧 Su kesintisi: Duyurulmuş kesinti yok',
    v.namaz ? `🕌 İmsak ${v.namaz.imsak} · Akşam ${v.namaz.aksam}` : null,
    v.gram ? `💰 Gram altın ${tl(v.gram.satis)} TL${v.usd ? ` · Dolar ${tl(v.usd.satis, 2)} TL` : ''}` : null,
    '',
    platform === 'facebook' ? `Nöbetçi eczane adresleri ve kesinti ayrıntıları: ${SITE.url}/nobetci-eczane/` : "📲 Nöbetçi eczane adresleri ve kesinti ayrıntıları profildeki bağlantıda: mersinanlik.com",
    '',
    '#Mersin #NöbetçiEczane #MersinHavaDurumu #MersinAnlık',
  ];
  return sat.filter((x) => x !== null).join('\n');
}

export async function sabahKartiCiz(v, cikti) {
  const sharp = (await import('sharp')).default;
  const { Resvg } = await import('@resvg/resvg-js');
  const logo = fs.readFileSync('assets/logo-seffaf.png').toString('base64');
  let arka = '';
  try {
    const f = await sharp('assets/kapak-mersin.jpg').resize(W, 560, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer();
    arka = `<image href="data:image/jpeg;base64,${f.toString('base64')}" x="0" y="0" width="${W}" height="560"/>`;
  } catch {}
  const kutu = (x, y, w, hh, renk, baslik, deger, alt) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="26" fill="#12244D"/>
<rect x="${x}" y="${y}" width="10" height="${hh}" rx="5" fill="${renk}"/>
${yazi(x + 36, y + 56, baslik, 26, renk, 700, 'letter-spacing="1"')}
${yazi(x + 36, y + 124, deger, deger.length > 14 ? 40 : 52, '#FFFFFF', 700)}
${alt ? yazi(x + 36, y + 172, alt, 24, '#9FB2D6', 500) : ''}`;
  const suDeger = v.su.length ? `${v.su.length} kesinti` : 'Yok';
  const suAlt = v.su.length ? kisalt(v.suYer.join(', '), 34) : 'Duyurulmuş kesinti yok';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A1530" stop-opacity="0.35"/><stop offset="0.7" stop-color="#0A1530" stop-opacity="0.85"/><stop offset="1" stop-color="#0A1530"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="#0A1530"/>
${arka}
<rect width="${W}" height="561" fill="url(#k)"/>
<image href="data:image/png;base64,${logo}" x="${W - 56 - 180}" y="40" width="180" height="120"/>
${yazi(64, 120, "MERSİN'DE BUGÜN", 30, '#22D3EE', 700, 'letter-spacing="3"')}
${yazi(64, 190, v.gunAd, 56, '#FFFFFF', 700)}
${v.hava ? `${yazi(64, 360, `${v.hava.max}°`, 150, '#FFFFFF', 700)}
${yazi(64 + genislik(`${v.hava.max}°`, 150) + 30, 300, v.hava.durum, 40, '#FFFFFF', 700)}
${yazi(64 + genislik(`${v.hava.max}°`, 150) + 30, 352, `En düşük ${v.hava.min}° · Mersin`, 30, '#C9D4EA', 500)}` : ''}
${kutu(48, 470, 476, 200, '#12A594', 'NÖBETÇİ ECZANE', v.eczane ? `${v.eczane} eczane` : 'Sitede', v.eczane ? `${v.eczIlce} ilçede, bugün 08.00'den itibaren` : 'İlçe ilçe liste sitede')}
${kutu(556, 470, 476, 200, '#3E8EDE', 'SU KESİNTİSİ', suDeger, suAlt)}
${kutu(48, 700, 476, 200, '#8E4EC6', 'NAMAZ', v.namaz ? `${v.namaz.imsak} · ${v.namaz.aksam}` : '-', 'İmsak · Akşam (Mersin)')}
${kutu(556, 700, 476, 200, '#C98A00', 'GRAM ALTIN', v.gram ? `${tl(v.gram.satis)} TL` : '-', v.usd ? `Dolar ${tl(v.usd.satis, 2)} TL` : '')}
<rect x="48" y="930" width="${W - 96}" height="250" rx="26" fill="#0E1D40" stroke="#22D3EE" stroke-opacity="0.35" stroke-width="2"/>
${yazi(84, 1000, 'Eczane adresleri, kesinti saatleri ve', 34, '#FFFFFF', 700)}
${yazi(84, 1050, "Mersin'in son dakika haberleri sitemizde.", 34, '#FFFFFF', 700)}
${yazi(84, 1118, 'Ayrıntılar: mersinanlik.com', 28, '#9FB2D6', 500)}
<rect x="0" y="${H - 116}" width="${W}" height="116" fill="#0E1D40"/>
<rect x="0" y="${H - 116}" width="${W}" height="3" fill="#22D3EE" fill-opacity="0.6"/>
${yazi(64, H - 46, 'mersinanlik.com', 36, '#22D3EE', 700)}
${yazi(W - 64, H - 48, 'Her sabah, Mersin için', 25, '#B6C4E0', 500, 'text-anchor="end"')}
</svg>`;
  const png = new Resvg(svg, { font: { fontFiles: ['assets/fonts/Poppins-Bold.ttf', 'assets/fonts/Poppins-Medium.ttf'], loadSystemFonts: true, defaultFontFamily: 'Poppins' }, fitTo: { mode: 'width', value: W } }).render().asPng();
  await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(cikti);
  return cikti;
}

function sabahSirasi(platform, d, simdi = Date.now()) {
  if (simdi < Date.parse(AYAR[platform].baslangic)) return false;
  const dk = trDakika(simdi);
  if (dk < AYAR.sabah.bas || dk > AYAR.sabah.bit) return false;
  return (d.sabah || {})[platform] !== trGun(simdi);
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
  // Sabah kartı: aynı çalışmada o platformda haber paylaşılmaz
  const sabahPlatform = ['facebook', 'instagram'].filter((p) => sabahSirasi(p, d));
  if (sabahPlatform.length) {
    const v = sabahVerisi();
    if (v.eczane) {
      fs.mkdirSync(KART_KLASORU, { recursive: true });
      await sabahKartiCiz(v, path.join(KART_KLASORU, `sabah-${v.bugun}.jpg`));
      d.kuyruk.sabah = { gun: v.bugun, platformlar: sabahPlatform };
    }
  }
  const sabahta = (p) => d.kuyruk.sabah?.platformlar.includes(p);
  const fbNeden = sabahta('facebook') ? 'sabah kartı sırada' : siraGeldi('facebook', d);
  if (!fbNeden) {
    const h = aday('facebook', d);
    if (h) d.kuyruk.facebook = h.id;
  }
  const igNeden = sabahta('instagram') ? 'sabah kartı sırada' : siraGeldi('instagram', d);
  if (!igNeden) {
    const h = aday('instagram', d);
    if (h) {
      fs.mkdirSync(KART_KLASORU, { recursive: true });
      const liste = AYAR.denenenTasarimlar;
      const tasarim = liste[(d.instagram || []).length % liste.length];
      await kartCiz(h, path.join(KART_KLASORU, `${h.id}.jpg`), tasarim);
      d.kuyruk.instagram = h.id;
      d.kuyruk.tasarim = tasarim;
    }
  }
  console.log('Sosyal kuyruk:', JSON.stringify(d.kuyruk), '| FB:', fbNeden || 'hazır', '| IG:', igNeden || 'hazır');
  durumYaz(d);
}

async function paylas() {
  const d = durumOku();
  const kuyruk = d.kuyruk || {};
  if (!kuyruk.facebook && !kuyruk.instagram && !kuyruk.sabah) return console.log('Sosyal: paylaşılacak bir şey yok.');
  const tum = Object.fromEntries(haberler().map((h) => [h.id, h]));
  const { sayfa, ig } = await hesaplar();

  if (kuyruk.sabah) {
    const v = sabahVerisi();
    const gorsel = `${SITE.url}/sosyal/sabah-${kuyruk.sabah.gun}.jpg`;
    d.sabah ||= {};
    if (kuyruk.sabah.platformlar.includes('facebook')) {
      try {
        await graph(`/${sayfa.id}/photos`, { method: 'POST', govde: { url: gorsel, caption: sabahMetni(v, 'facebook') }, token: sayfa.access_token });
        d.sabah.facebook = kuyruk.sabah.gun;
        console.log('Facebook sabah kartı paylaşıldı');
      } catch (e) {
        console.log('Facebook sabah kartı paylaşılamadı:', e.message);
      }
    }
    if (kuyruk.sabah.platformlar.includes('instagram') && ig) {
      try {
        const kap = await graph(`/${ig.id}/media`, { method: 'POST', govde: { image_url: gorsel, caption: sabahMetni(v, 'instagram') } });
        for (let i = 0; i < 10; i++) {
          const st = await graph(`/${kap.id}?fields=status_code`);
          if (st.status_code === 'FINISHED') break;
          await new Promise((r) => setTimeout(r, 3000));
        }
        await graph(`/${ig.id}/media_publish`, { method: 'POST', govde: { creation_id: kap.id } });
        d.sabah.instagram = kuyruk.sabah.gun;
        console.log('Instagram sabah kartı paylaşıldı');
      } catch (e) {
        console.log('Instagram sabah kartı paylaşılamadı:', e.message);
      }
    }
  }

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
      (d.instagram ||= []).push({ id: h.id, zaman: new Date().toISOString(), gonderi: r.id, tasarim: kuyruk.tasarim || AYAR.tasarim });
      console.log('Instagram paylaşıldı:', h.baslik);
    } catch (e) {
      console.log('Instagram paylaşılamadı:', e.message);
    }
  }
  d.kuyruk = {};
  durumYaz(d);
}

// A/B karşılaştırması: her tasarımın ortalama beğeni ve yorum sayısı
async function karsilastir() {
  const d = durumOku();
  const sonuc = {};
  for (const g of d.instagram || []) {
    if (!g.gonderi) continue;
    try {
      const m = await graph(`/${g.gonderi}?fields=like_count,comments_count`);
      const t = (sonuc[g.tasarim || '?'] ||= { gonderi: 0, begeni: 0, yorum: 0 });
      t.gonderi++;
      t.begeni += m.like_count || 0;
      t.yorum += m.comments_count || 0;
    } catch {}
  }
  for (const [t, v] of Object.entries(sonuc)) console.log(`Tasarım ${t.toUpperCase()}: ${v.gonderi} gönderi, ortalama ${(v.begeni / v.gonderi).toFixed(1)} beğeni, ${(v.yorum / v.gonderi).toFixed(1)} yorum`);
  return sonuc;
}

const mod = process.argv[2];
if (mod === '--sabah-kart') {
  const v = sabahVerisi();
  await sabahKartiCiz(v, process.argv[3] || 'sabah.jpg');
  console.log(sabahMetni(v, 'facebook'));
} else if (mod === '--kart') {
  // Deneme: node src/sosyal.js --kart <haber-id|ilk> çıktı.jpg
  const id = process.argv[3];
  const h = id && id !== 'ilk' ? haberler().find((x) => x.id === id) : haberler().find((x) => !x.genel && kapakAdresi(x)?.src);
  await kartCiz(h, process.argv[4] || 'kart.jpg', process.argv[5] || AYAR.tasarim);
  console.log('Kart çizildi:', h.baslik);
} else if (['--kontrol', '--hazirla', '--paylas', '--karsilastir'].includes(mod)) {
  if (!TOKEN) {
    console.log('Sosyal: META_TOKEN yok, atlandı.');
    process.exit(0);
  }
  try {
    if (mod === '--kontrol') await kontrol();
    if (mod === '--hazirla') await hazirla();
    if (mod === '--paylas') await paylas();
    if (mod === '--karsilastir') await karsilastir();
  } catch (e) {
    console.log('Sosyal hata:', e.message);
  }
}
