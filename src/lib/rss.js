import { XMLParser } from 'fast-xml-parser';
import { duzMetin, baslikTemizle } from './text.js';

const UA = 'MersinAnlikBot/1.0 (+https://mersinanlik.com/kaynaklarimiz/)';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  cdataPropName: false,
  trimValues: true,
});

function metin(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return metin(v[0]);
  return v['#text'] != null ? String(v['#text']) : '';
}

function liste(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function tarih(v) {
  const d = new Date(metin(v));
  return isNaN(d) ? null : d.toISOString();
}

// RSS 2.0 ve Atom akışlarını aynı biçime çevirir: { baslik, link, aciklama, tarih }
export function akisiCoz(xml, kaynakAdi = '') {
  const doc = parser.parse(xml);
  if (doc.rss?.channel) {
    return liste(doc.rss.channel.item).map((it) => ({
      baslik: baslikTemizle(metin(it.title), kaynakAdi),
      link: metin(it.link).trim() || metin(it.guid).trim(),
      aciklama: duzMetin(metin(it.description)).slice(0, 1200),
      tarih: tarih(it.pubDate || it['dc:date']),
    }));
  }
  if (doc.feed?.entry) {
    return liste(doc.feed.entry).map((it) => {
      const linkler = liste(it.link);
      const alt = linkler.find((l) => !l['@rel'] || l['@rel'] === 'alternate') || linkler[0] || {};
      return {
        baslik: baslikTemizle(metin(it.title), kaynakAdi),
        link: (alt['@href'] || '').trim(),
        aciklama: duzMetin(metin(it.summary || it.content)).slice(0, 1200),
        tarih: tarih(it.updated || it.published),
      };
    });
  }
  // Haber site haritası (news sitemap)
  if (doc.urlset?.url) {
    return liste(doc.urlset.url).map((u) => {
      const n = u['news:news'] || {};
      return {
        baslik: baslikTemizle(metin(n['news:title']), kaynakAdi),
        link: metin(u.loc).trim(),
        aciklama: '',
        tarih: tarih(n['news:publication_date'] || u.lastmod),
      };
    });
  }
  return [];
}

export async function kaynakOku(kaynak, { zamanAsimi = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), zamanAsimi);
  try {
    const res = await fetch(kaynak.url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return akisiCoz(xml, kaynak.ad).filter((h) => h.baslik && h.link);
  } finally {
    clearTimeout(t);
  }
}
