// Aday kaynakları GitHub sunucusundan dener: erişim, haber linkleri, RSS, robots.txt
const UA = 'MersinAnlikBot/1.0 (+https://mersinanlik.com/kaynaklarimiz/)';
const ADAYLAR = (process.env.ADRESLER || '').trim() ? process.env.ADRESLER.trim().split(/\s+/) : process.argv.slice(2).length ? process.argv.slice(2) : [
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
if (process.env.ARA?.startsWith('ISKUR')) {
  const g = process.env.ARA.slice(6);
  if (g) process.env.GONDER = g;
  await import('./iskur-dene.js');
  process.exit(0);
}
if (process.env.ARA === 'COMMONS') {
  // Adresler: arama terimleri (boşluk yerine _). Ticari kullanıma açık lisanslı fotoğrafları listeler.
  for (const terim of ADAYLAR) {
    const q = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: terim.replace(/_/g, ' ') + ' filetype:bitmap', gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiextmetadatafilter: 'LicenseShortName|Artist', iiurlwidth: '960' });
    const r = await fetch('https://commons.wikimedia.org/w/api.php?' + q, { headers: { 'User-Agent': UA } }).then((x) => x.json()).catch(() => ({}));
    console.log(`\n### ${terim}`);
    for (const p of Object.values(r.query?.pages || {}).sort((a, b) => a.index - b.index)) {
      const ii = p.imageinfo?.[0]; if (!ii) continue;
      const lis = ii.extmetadata?.LicenseShortName?.value || '?';
      if (!/CC BY|CC0|Public domain|Kamu/i.test(lis) || /NC|ND/.test(lis)) continue;
      const yazar = (ii.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 40);
      console.log(`${ii.width}x${ii.height} | ${lis} | ${yazar} | ${ii.url.split('/commons/')[1]}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  process.exit(0);
}
if (process.env.ARA === 'UCUS') {
  const { ucuslariGetir } = await import('../src/lib/ucus.js');
  const v = await ucuslariGetir(UA);
  for (const yon of ['giden', 'gelen']) {
    console.log(`\n### ${yon}: ${v[yon].length}`);
    for (const u of v[yon].slice(0, 15)) console.log(JSON.stringify(u));
  }
  process.exit(0);
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
  if (process.env.ARA?.startsWith('METIN')) {
    const bas = process.env.ARA.split(':')[1] || '';
    let t = metin.replace(/<(script|style|head|nav|footer)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<(br|\/p|\/li|\/tr|\/h\d|\/div)[^>]*>/gi, '\n').replace(/<\/t[dh]>/gi, ' | ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
    if (bas) { const i = t.search(new RegExp(bas, 'i')); if (i > -1) t = t.slice(i); }
    console.log(`\n### ${url}\n${durum}\n${t.slice(0, 7000)}`);
    continue;
  }
  if (process.env.ARA === 'INCELE') {
    const t = (x) => x.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const govde = metin.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ');
    const basliklar = [...govde.matchAll(/<(h[1-4])[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => `${m[1]}:${t(m[2]).slice(0, 90)}`).filter((x) => x.length > 8).slice(0, 12);
    const tarihler = [...new Set([...govde.matchAll(/\b\d{1,2}[./]\d{1,2}[./]20\d\d\b|\b\d{1,2} (Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık) 20\d\d/gi)].map((m) => m[0]))].slice(0, 8);
    const pler = [...govde.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => t(m[1])).filter((x) => x.length > 40).slice(0, 4).map((x) => x.slice(0, 120));
    const divler = [...govde.matchAll(/<div\b([^>]*)>([^<]{120,})/gi)].slice(0, 4).map((m) => `[${m[1].trim().slice(0, 60)}] ${t(m[2]).slice(0, 120)}`);
    const resim = [...new Set([...metin.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]))].filter((r) => !/logo|icon|flag|svg|ataturk/i.test(r)).slice(0, 6);
    const title = t(metin.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
    console.log(`\n### ${url}\n${durum} · title: ${title}\nBAŞLIK: ${basliklar.join(' ‖ ')}\nTARİH: ${tarihler.join(', ')}\nP: ${pler.join(' ‖ ')}\nDIV: ${divler.join(' ‖ ')}\nIMG: ${resim.join(' ')}`);
    continue;
  }
  if (process.env.ARA?.startsWith('DOKUM:')) {
    const d = new RegExp(process.env.ARA.slice(6), 'gi');
    const parcalar = [...metin.matchAll(d)].slice(0, 4).map((m) => metin.slice(Math.max(0, m.index - 300), m.index + 900).replace(/\s+/g, ' '));
    console.log(`\n### ${url}\n${durum} · ${metin.length} b\n${parcalar.map((p, i) => `--[${i}]-- ${p}`).join('\n')}`);
    continue;
  }
  if (process.env.ARA?.startsWith('LINK:')) {
    const d = new RegExp(process.env.ARA.slice(5), 'i');
    const hepsi = [...new Set([...metin.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1].replace(/&amp;/g, '&'), son || url).href; } catch { return ''; } }))].filter((l) => d.test(l));
    const resim = [...new Set([...metin.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]))].slice(0, 6);
    const og = metin.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i)?.[1] || metin.match(/content=["']([^"']+)["'][^>]*property=["']og:image/i)?.[1];
    console.log(`\n### ${url}\n${durum} · ${robots}\nLINKLER (${hepsi.length}): ${hepsi.slice(0, 25).join(' ')}\nOG: ${og || '-'}\nIMG: ${resim.join(' ')}`);
    continue;
  }
  const ara = process.env.ARA ? metin.match(new RegExp(`[\\s\\S]{0,${process.env.RAW ? 500 : 150}}(${process.env.ARA})[\\s\\S]{0,${process.env.RAW ? 1200 : 250}}`, 'i'))?.[0]?.replace(process.env.RAW ? /^\b$/ : /<[^>]+>/g, ' ').replace(/\s+/g, ' ') : '';
  console.log(`\n### ${url}\n${durum} · ${robots}\n${ozet}${ara ? `\nARA: ${ara}` : ''}`);
}
