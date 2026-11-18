// Resmî kurumların (belediye, valilik) haber sayfalarını okur.
// Kurumlar bu haberleri ve fotoğrafları basında yayınlansın diye paylaşır; biz de
// fotoğrafı "Foto: <Kurum adı>" diye kaynağını yazarak kullanırız.
//
// Kaynak ayarı (sources.js): { tur: 'html', liste, linkDesen, gorselDesen, enFazla }

import { duzMetin, baslikTemizle } from './text.js';
import { ILCELER } from '../config.js';

const UA = 'MersinAnlikBot/1.0 (+https://mersinanlik.com/kaynaklarimiz/)';

// Sayfa kodlamasını (UTF-8 / ISO-8859-9) doğru çöz
async function sayfaGetir(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ham = Buffer.from(await res.arrayBuffer());
  const basta = ham.subarray(0, 4000).toString('latin1');
  const bildirilen = (res.headers.get('content-type') || '').match(/charset=([\w-]+)/i)?.[1] || basta.match(/charset=["']?([\w-]+)/i)?.[1] || 'utf-8';
  let metin = new TextDecoder('utf-8').decode(ham);
  // UTF-8 olarak bozuk çıkarsa (� karakterleri) bildirilen Türkçe kodlamayı dene
  if (/�/.test(metin) && !/utf-?8/i.test(bildirilen)) metin = new TextDecoder(bildirilen).decode(ham);
  return metin;
}

const meta = (html, ad) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${ad}["'][^>]+content=["']([^"']*)`, 'i'))?.[1] ||
  html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${ad}["']`, 'i'))?.[1];

function mutlak(src, taban, kokten = false) {
  try {
    src = src.replace(/&amp;/g, '&');
    if (kokten && !/^(https?:)?\//i.test(src)) return new URL(src, new URL(taban).origin + '/').href;
    return new URL(src, taban).href;
  } catch {
    return null;
  }
}

// Haberin gövdesi: sayfadaki paragraflar (menü, çerez uyarısı vb. hariç)
export function govdeCoz(html, formDahil = false) {
  const etiketler = formDahil ? 'script|style|nav|header|footer|aside|noscript' : 'script|style|nav|header|footer|aside|form|noscript';
  const temiz = html.replace(new RegExp(`<(${etiketler})\\b[\\s\\S]*?<\\/\\1>`, 'gi'), ' ');
  const paragraflar = [...temiz.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => duzMetin(m[1]).replace(/\s+/g, ' ').trim())
    .filter((t) => t.length >= 60 && !/çerez|cookie|kvkk|kişisel veri|tüm hakları|copyright|©|editörlerinin hiçbir müdahalesi|tarafından geçilen tüm/i.test(t));
  const sonuc = [...new Set(paragraflar)].join('\n').slice(0, 5000);
  return sonuc || formDahil ? sonuc : govdeCoz(html, true);
}

const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
// Haber başlığından (h1) sonra geçen ilk tarihi bul: 09.11.2026 ya da 12 Kasım 2026.
// Kenardaki "diğer haberler" tarihleri karışmasın diye en yeni değil, ilk tarih alınır.
export function metindenTarih(html) {
  let govde = html.replace(/<(script|style|head|header|nav)\b[\s\S]*?<\/\1>/gi, ' ');
  const h1 = govde.search(/<h1\b/i);
  if (h1 > -1) govde = govde.slice(h1);
  const simdi = Date.now() + 864e5;
  const sira = (m) => m.index;
  const hepsi = [
    ...[...govde.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](20\d\d)\b/g)].map((m) => [sira(m), +m[3], +m[2], +m[1]]),
    ...[...govde.matchAll(/\b(\d{1,2}) (Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık) (20\d\d)\b/gi)].map((m) => [sira(m), +m[3], AYLAR.indexOf(m[2].toLocaleLowerCase('tr')) + 1, +m[1]]),
  ].sort((a, b) => a[0] - b[0]);
  for (const [, y, a, g] of hepsi) {
    if (a < 1 || a > 12 || g < 1 || g > 31) continue;
    const t = new Date(`${y}-${String(a).padStart(2, '0')}-${String(g).padStart(2, '0')}T12:00:00+03:00`).getTime();
    if (t <= simdi && y >= 2020) return new Date(t).toISOString();
  }
  return null;
}

export function detayCoz(html, link, kaynak) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const secili = kaynak.baslikEtiket
    ? [...html.matchAll(new RegExp(`<${kaynak.baslikEtiket}\\b[^>]*>([\\s\\S]*?)<\\/${kaynak.baslikEtiket}>`, 'gi'))].map((m) => duzMetin(m[1]).replace(/\s*(--|\|).*$/, '').trim()).find((t) => t.length > 15)
    : null;
  const baslikHam = secili || (kaynak.baslikH1 && h1 && duzMetin(h1).length > 15 ? h1 : null) || meta(html, 'og:title') || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';
  let baslik = duzMetin(baslikHam);
  // Sondaki site/bölüm adlarını at: " | Mersin Yenişehir Belediyesi", " - Haberler", " | ... Resmi Web Sitesi"
  for (let i = 0; i < 3; i++) baslik = baslik.replace(/\s*[|–-]\s*[^|–]*(Belediye|Valili|Resmi Web|Haberler|Duyurular)[^|–]*$/i, '');
  baslik = baslik.replace(/\s*\|\s*Mersin\s+g\S{0,3}ndem\s*$/i, '');
  baslik = baslikTemizle(baslik.replace(/[\p{Extended_Pictographic}\u200B-\u200D\uFE0F]/gu, '').replace(/\s+/g, ' ').trim(), kaynak.ad);
  const aciklama = duzMetin(meta(html, 'og:description') || meta(html, 'description') || '').slice(0, 1200);

  // Fotoğraf: önce og:image, yoksa sayfadaki haber fotoğrafı (adında haberin adresi ya da tarih damgası geçen)
  let foto = meta(html, 'og:image');
  if (foto && /^https?:\/\/[^/]+\/?$/.test(foto)) foto = null; // sadece site adresi verilmişse işe yaramaz
  if (foto && kaynak.gorselDuzelt) foto = foto.replace(kaynak.gorselDuzelt[0], kaynak.gorselDuzelt[1]);
  if (!foto && kaynak.gorselDesen) {
    const desen = new RegExp(kaynak.gorselDesen, 'i');
    const adaylar = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => duzMetin(m[1])).filter((s) => desen.test(s));
    const kisa = link.split('/').pop().slice(0, 20).toLowerCase();
    foto = adaylar.find((s) => s.toLowerCase().includes(kisa)) || adaylar.find((s) => /\d{12,}/.test(s)) || (kaynak.gorselIlk ? adaylar[0] : null);
  }

  // Tarih: sayfa bilgisi, yoksa adresin sonundaki zaman damgası (ör. ...-1794810851)
  let tarih = meta(html, 'article:published_time') || html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] || null;
  const damga = link.match(/-(\d{10})(?:$|[/?#])/)?.[1];
  if (!tarih && damga) tarih = new Date(Number(damga) * 1000).toISOString();
  const gunAyYil = link.match(/-(\d{2})(\d{2})(20\d{2})\.html$/);
  if (!tarih && gunAyYil) tarih = new Date(`${gunAyYil[3]}-${gunAyYil[2]}-${gunAyYil[1]}T12:00:00+03:00`).toISOString();

  // Fotoğraf adındaki zaman damgası (ör. 30514-20261110151655.jpeg)
  const fotoDamga = kaynak.tarihGorselden && (foto?.match(/(20\d\d)(\d\d)(\d\d)(\d\d)(\d\d)\d{2,}/) || foto?.match(/(20\d\d)(\d\d)(\d\d)-at-(\d\d)(\d\d)/));
  if (!tarih && fotoDamga) tarih = new Date(`${fotoDamga[1]}-${fotoDamga[2]}-${fotoDamga[3]}T${fotoDamga[4]}:${fotoDamga[5]}:00+03:00`).toISOString();
  if (!tarih && kaynak.tarihMetinden) tarih = metindenTarih(html);

  const govde = govdeCoz(html);
  return { baslik, aciklama, govde, link, tarih, foto: foto ? mutlak(foto, link, kaynak.gorselKokten) : null };
}

// Kayıtlı bir kurum haberinin metnini sonradan almak için (eski kayıtlar)
export async function kurumMetniGetir(link, kaynak) {
  return detayCoz(await sayfaGetir(link), link, kaynak);
}

// bilinen(link) → zaten kayıtlı haberse detay sayfası tekrar indirilmez.
// gorulen: bu kaynakta daha önce görülen linkler (durum.json'da saklanır). İlk çalışmada
// liste sadece kaydedilir; tarihi belli olmayan eski haberler "yeni" diye yayınlanmasın.
export async function kurumOku(kaynak, { bilinen = () => false, gorulen = null, eskiDahil = false } = {}) {
  const desen = new RegExp(kaynak.linkDesen, 'i');
  const tumu = [];
  for (const adres of [].concat(kaynak.liste)) {
    try {
      const liste = await sayfaGetir(adres);
      tumu.push(...[...liste.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => mutlak(m[1], adres)).filter((u) => u && desen.test(u)));
    } catch (e) {
      if (adres === [].concat(kaynak.liste)[0]) throw e;
    }
  }
  const linkler = [...new Set(tumu)].slice(0, kaynak.enFazla || 8);
  const ilkKez = gorulen && gorulen.length === 0;
  const onceki = new Set(gorulen || []);
  if (gorulen) for (const l of linkler) if (!onceki.has(l)) gorulen.push(l);
  if (gorulen && gorulen.length > 200) gorulen.splice(0, gorulen.length - 200);
  const sonuc = [];
  for (const link of linkler) {
    if (bilinen(link) || onceki.has(link)) continue;
    try {
      const d = detayCoz(await sayfaGetir(link), link, kaynak);
      // Tarihi olan eski haberleri (3 günden eski) alma; tarihsizleri ilk çalışmada alma
      if (!eskiDahil && d.tarih && Date.now() - new Date(d.tarih).getTime() > 3 * 864e5) continue;
      if (!d.tarih && ilkKez) continue;
      // Adreste ilçe varsa (ör. DHA: /yerel-haberler/mersin/tarsus/...) ilçe adını metne ekle
      if (kaynak.ilceLinkten) {
        const ilce = ILCELER.find((i) => new RegExp(`/mersin/${i.slug}/`).test(link));
        if (ilce) d.aciklama = `${ilce.ad} ${d.aciklama || ''}`.trim();
      }
      if (d.baslik) sonuc.push(d);
    } catch (e) {
      console.warn(`! ${kaynak.ad} detay: ${e.message}`);
    }
  }
  return sonuc;
}
