// Aday kaynakları GitHub sunucusundan dener: erişim, haber linkleri, RSS, robots.txt
const UA = 'MersinAnlikBot/1.0 (+https://mersinanlik.com/kaynaklarimiz/)';
const ADAYLAR = process.argv.slice(2).length ? process.argv.slice(2) : [
  'https://www.mersin.pol.tr/', 'https://www.mersin.gov.tr/haberler', 'https://mersin.meb.gov.tr/', 'https://www.mersin.edu.tr/haberler',
  'https://www.mtso.org.tr/haberler', 'https://www.akdeniz.bel.tr/haberler', 'https://www.toroslar.bel.tr/', 'https://www.mezitli.bel.tr/',
  'https://www.silifke.bel.tr/', 'https://www.anamur.bel.tr/', 'https://www.bozyazi.bel.tr/', 'https://www.gulnar.bel.tr/', 'https://www.aydincik.bel.tr/',
  'https://mersinism.saglik.gov.tr/', 'https://www.tarsus.edu.tr/', 'https://www.trthaber.com/yerelhaberler/mersin/', 'https://www.ntv.com.tr/mersin',
  'https://www.haberturk.com/mersin-haberleri', 'https://www.milliyet.com.tr/haberler/mersin', 'https://www.posta.com.tr/mersin-haberleri/',
  'https://news.google.com/rss/search?q=Mersin&hl=tr&gl=TR&ceid=TR:tr', 'https://www.mersingundem.com.tr/rss', 'https://www.yenimersin.com/rss',
  'https://www.gazetemersin.com/rss', 'https://www.mersinekspres.com/rss', 'https://www.tarsushaber.com/rss', 'https://www.erdemlihaber.com/rss',
  'https://www.silifkehaber.com/rss', 'https://www.anamurhaber.com/rss', 'https://www.mersinsehir.com/rss', 'https://www.icelhaber.com/rss',
  'https://www.mersinkent.com/rss', 'https://www.mersinsondakika.com/rss', 'https://www.mersinhaberajansi.com/rss', 'https://www.tarsusgazetesi.com/rss',
];
async function al(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000), redirect: 'follow' });
    return { durum: r.status, metin: await r.text(), son: r.url };
  } catch (e) {
    return { durum: 'HATA ' + (e.cause?.code || e.message).toString().slice(0, 40), metin: '' };
  }
}
for (const url of ADAYLAR) {
  const { durum, metin, son } = await al(url);
  const rss = /<rss|<feed|<channel/i.test(metin.slice(0, 2000));
  let ozet = '';
  if (rss) {
    const items = [...metin.matchAll(/<item[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/gi)];
    const tarih = metin.match(/<pubDate>([^<]+)/i)?.[1];
    ozet = `RSS ${items.length} öğe, ilk tarih ${tarih} | ${items.slice(0, 3).map((m) => m[1].trim().slice(0, 60)).join(' / ')}`;
  } else if (metin) {
    const host = new URL(son || url).host;
    const linkler = [...new Set([...metin.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1].replace(/&amp;/g, '&'), son || url).href; } catch { return ''; } }))]
      .filter((l) => l.includes(host) && /haber|duyuru|icerik|news|\d{4,}/i.test(l) && l.split('/').pop().length > 15);
    ozet = `HTML ${metin.length} b, ${linkler.length} aday link: ${linkler.slice(0, 6).join(' ')}`;
  }
  const kok = new URL(url).origin;
  const rb = (await al(kok + '/robots.txt')).metin;
  const robots = /User-agent:\s*\*[\s\S]{0,200}?Disallow:\s*\/\s*$/im.test(rb) ? 'robots: * HEPSİ YASAK' : /GPTBot|CCBot|Google-Extended|ClaudeBot/i.test(rb) ? 'robots: YZ botları anılıyor' : 'robots: serbest';
  const ara = process.env.ARA ? metin.match(new RegExp(`[\\s\\S]{0,${process.env.RAW ? 500 : 150}}(${process.env.ARA})[\\s\\S]{0,${process.env.RAW ? 1200 : 250}}`, 'i'))?.[0]?.replace(process.env.RAW ? /^\b$/ : /<[^>]+>/g, ' ').replace(/\s+/g, ' ') : '';
  console.log(`\n### ${url}\n${durum} · ${robots}\n${ozet}${ara ? `\nARA: ${ara}` : ''}`);
}
