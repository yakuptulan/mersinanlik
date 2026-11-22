// İŞKUR açık iş ilanları (esube) deneme: formu Mersin seçerek gönderir, sonucu özetler.
const _g = process.env.GONDER ? JSON.parse(process.env.GONDER) : {};
const URL_ = _g._url || 'https://esube.iskur.gov.tr/Istihdam/AcikIsIlanAra.aspx';
delete _g._url;
if (_g._sadeceGet) process.env.GONDER = '';
const UA = 'Mozilla/5.0 (compatible; MersinAnlikBot/1.0; +https://mersinanlik.com)';
let cerez = '';
async function al(url, opt = {}) {
  const r = await fetch(url, { ...opt, redirect: 'manual', headers: { 'User-Agent': UA, Cookie: cerez, ...(opt.headers || {}) } });
  const sc = r.headers.getSetCookie?.() || [];
  if (sc.length) cerez = [...new Map([...cerez.split('; ').filter(Boolean), ...sc.map((c) => c.split(';')[0])].map((c) => [c.split('=')[0], c])).values()].join('; ');
  return { durum: r.status, yer: r.headers.get('location'), metin: await r.text() };
}
if (_g._once) { await al(_g._once); delete _g._once; }
const sayfa = await al(URL_);
const html = sayfa.metin;
const gizli = Object.fromEntries([...html.matchAll(/<input[^>]+type="hidden"[^>]*>/gi)].map((m) => [m[0].match(/name="([^"]+)"/)?.[1], (m[0].match(/value="([^"]*)"/)?.[1] || '').replace(/&amp;/g, '&')]).filter(([k]) => k));
const sel = html.match(/<select name="ctl04\$ctlIl"[\s\S]*?<\/select>/)?.[0] || '';
const tumSelect = [...html.matchAll(/<select name="([^"]+)"[\s\S]*?<\/select>/g)].map((m) => m[1] + ': ' + (m[0].match(/<option[^>]*value="([^"]*)"[^>]*>\s*MERS[İI]N\s*</i)?.[1] || '-')).join(' | ');
console.log('SELECTLER', tumSelect);
const duzMetin = html.replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
console.log('GETMETIN', duzMetin.slice(duzMetin.search(/Kurs|TYP|Program/), duzMetin.search(/Kurs|TYP|Program/) + 2500));
const mersin = sel.match(/<option[^>]*value="([^"]*)"[^>]*>\s*MERS[İI]N\s*</i)?.[1];
const butonlar = [...html.matchAll(/<input[^>]+type="(submit|button)"[^>]*>/gi)].map((m) => m[0].slice(0, 200));
const anchors = [...html.matchAll(/<a[^>]+id="([^"]*(Ara|Bul|Search)[^"]*)"[^>]*href="([^"]*)"/gi)].map((m) => `${m[1]} ${m[3].slice(0, 120)}`);
console.log('durum', sayfa.durum, 'gizli', Object.keys(gizli).join(','), '\nmersin', mersin, '\nbutonlar', butonlar.join('\n'), '\nanchors', anchors.join('\n'));
const selectler = [...html.matchAll(/<select name="([^"]+)"/g)].map((m) => m[1]);
console.log('selectler', selectler.join(', '));
if (process.env.GONDER) {
  const govde = new URLSearchParams({ ...gizli, ...(URL_.includes('AcikIsIlanAra') ? { 'ctl04$IsyeriTuruRadios': 'ozelSektorRadio', 'ctl04$ctlIl': mersin || '33' } : {}), ..._g });
  const r = await al(URL_, { method: 'POST', body: govde, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: URL_ } });
  console.log('POST', r.durum, r.yer, r.metin.length);
  const t = r.metin.replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, ' ');
  const d = t.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const i = d.search(/VENEZUE/);
  console.log(d.slice(i + 200, i + 5200));
  const fn = r.metin.match(/function PopupJobDetails[\s\S]{0,900}/)?.[0] || (await al('https://esube.iskur.gov.tr' + (r.metin.match(/src="([^"]*AcikIs[^"]*\.js[^"]*)"/i)?.[1] || '/x'))).metin.match(/PopupJobDetails[\s\S]{0,900}/)?.[0];
  console.log('\nPAGER', [...r.metin.matchAll(/<a[^>]*href="javascript:__doPostBack\(&#39;([^&]*)&#39;,&#39;([^&]*)&#39;\)"[^>]*>([^<]{0,40})</g)].filter((m) => /Sonraki|Son Sayfa|Git|^\s*\d+\s*$/i.test(m[3]) || /Page|Sayfa|Pager/i.test(m[1])).map((m) => `${m[1]} | ${m[2]} | ${m[3].trim()}`).slice(0, 12).join('\n'));
  console.log('\nPAGERHTML', r.metin.match(/[\s\S]{0,1500}Sonraki Sayfa[\s\S]{0,800}/)?.[0]?.replace(/\s+/g, ' '));
  console.log('\nSATIR1', r.metin.match(/<a onclick="PopupJobDetails[\s\S]{0,2600}/)?.[0]?.replace(/\s+/g, ' '));
  console.log('\nPOPUP', fn);
  console.log('\nJSLER', [...r.metin.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]).join(' '));
  const ilanTarihi = r.metin.match(/<select name="ctl04\$ctlIlanTarihi"[\s\S]*?<\/select>/)?.[0]?.replace(/\s+/g, ' ');
  console.log('\nILANTARIHI', ilanTarihi);
  const satir = [...r.metin.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(0, 6).map((m) => m[1].replace(/\s+/g, ' ').slice(0, 700));
  console.log('\nSATIRLAR\n' + satir.join('\n---\n'));
}
