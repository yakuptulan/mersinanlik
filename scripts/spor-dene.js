// TFF lig sayfalarını dener: puan tablosu satır sayısı ve "Lig" geçen bağlantılar
import { puanCoz, haftaCoz } from '../src/lib/spor.js';
const UA = 'mersinanlik.com iletisim@mersinanlik.com';
for (const url of (process.env.ADRESLER || '').trim().split(/\s+/)) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  const b = Buffer.from(await r.arrayBuffer());
  let html = new TextDecoder('utf-8').decode(b);
  if (/�/.test(html)) html = new TextDecoder('windows-1254').decode(b);
  const p = puanCoz(html);
  const linkler = [...new Set([...html.matchAll(/href=["']?([^"' >]*pageID=\d+[^"' >]*)["']?[^>]*>([^<]{2,60})</gi)].map((m) => `${m[2].trim()} => ${m[1]}`).filter((x) => /lig|grup/i.test(x)))].slice(0, 40);
  console.log(`\n### ${url}\nHTTP ${r.status} · puan: ${p.length} takım (${p.slice(0, 3).map((x) => x.takim).join(', ')}) · maç: ${haftaCoz(html).length}\n${linkler.join('\n')}`);
}
