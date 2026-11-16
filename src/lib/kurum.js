// Resmî kurumların (belediye, valilik) haber sayfalarını okur.
// Kurumlar bu haberleri ve fotoğrafları basında yayınlansın diye paylaşır; biz de
// fotoğrafı "Foto: <Kurum adı>" diye kaynağını yazarak kullanırız.
//
// Kaynak ayarı (sources.js): { tur: 'html', liste, linkDesen, gorselDesen, enFazla }

import { duzMetin, baslikTemizle } from './text.js';

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

function mutlak(src, taban) {
  try {
    return new URL(src, taban).href;
  } catch {
    return null;
  }
}

export function detayCoz(html, link, kaynak) {
  const baslikHam = meta(html, 'og:title') || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';
  const baslik = baslikTemizle(duzMetin(baslikHam), kaynak.ad);
  const aciklama = duzMetin(meta(html, 'og:description') || meta(html, 'description') || '').slice(0, 1200);

  // Fotoğraf: önce og:image, yoksa sayfadaki haber fotoğrafı (adında haberin adresi ya da tarih damgası geçen)
  let foto = meta(html, 'og:image');
  if (!foto && kaynak.gorselDesen) {
    const desen = new RegExp(kaynak.gorselDesen, 'i');
    const adaylar = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]).filter((s) => desen.test(s));
    const kisa = link.split('/').pop().slice(0, 20).toLowerCase();
    foto = adaylar.find((s) => s.toLowerCase().includes(kisa)) || adaylar.find((s) => /\d{12,}/.test(s));
  }

  // Tarih: sayfa bilgisi, yoksa adresin sonundaki zaman damgası (ör. ...-1794810851)
  let tarih = meta(html, 'article:published_time') || html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] || null;
  const damga = link.match(/-(\d{10})(?:$|[/?#])/)?.[1];
  if (!tarih && damga) tarih = new Date(Number(damga) * 1000).toISOString();

  return { baslik, aciklama, link, tarih, foto: foto ? mutlak(foto, link) : null };
}

// bilinen(link) → zaten kayıtlı haberse detay sayfası tekrar indirilmez
export async function kurumOku(kaynak, { bilinen = () => false } = {}) {
  const liste = await sayfaGetir(kaynak.liste);
  const desen = new RegExp(kaynak.linkDesen, 'i');
  const linkler = [...new Set([...liste.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => mutlak(m[1], kaynak.liste)).filter((u) => u && desen.test(u)))];
  const sonuc = [];
  for (const link of linkler.slice(0, kaynak.enFazla || 8)) {
    if (bilinen(link)) continue;
    try {
      const d = detayCoz(await sayfaGetir(link), link, kaynak);
      if (d.baslik) sonuc.push(d);
    } catch (e) {
      console.warn(`! ${kaynak.ad} detay: ${e.message}`);
    }
  }
  return sonuc;
}
