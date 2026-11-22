// İŞKUR açık iş ilanları (esube) deneme: formu Mersin seçerek gönderir, sonucu özetler.
const URL_ = 'https://esube.iskur.gov.tr/Istihdam/AcikIsIlanAra.aspx';
const UA = 'Mozilla/5.0 (compatible; MersinAnlikBot/1.0; +https://mersinanlik.com)';
let cerez = '';
async function al(url, opt = {}) {
  const r = await fetch(url, { ...opt, redirect: 'manual', headers: { 'User-Agent': UA, Cookie: cerez, ...(opt.headers || {}) } });
  const sc = r.headers.getSetCookie?.() || [];
  if (sc.length) cerez = [...new Map([...cerez.split('; ').filter(Boolean), ...sc.map((c) => c.split(';')[0])].map((c) => [c.split('=')[0], c])).values()].join('; ');
  return { durum: r.status, yer: r.headers.get('location'), metin: await r.text() };
}
const sayfa = await al(URL_);
const html = sayfa.metin;
const gizli = Object.fromEntries([...html.matchAll(/<input[^>]+type="hidden"[^>]*>/gi)].map((m) => [m[0].match(/name="([^"]+)"/)?.[1], (m[0].match(/value="([^"]*)"/)?.[1] || '').replace(/&amp;/g, '&')]).filter(([k]) => k));
const sel = html.match(/<select name="ctl04\$ctlIl"[\s\S]*?<\/select>/)?.[0] || '';
const mersin = sel.match(/<option[^>]*value="([^"]*)"[^>]*>\s*MERS[İI]N\s*</i)?.[1];
const butonlar = [...html.matchAll(/<input[^>]+type="(submit|button)"[^>]*>/gi)].map((m) => m[0].slice(0, 200));
const anchors = [...html.matchAll(/<a[^>]+id="([^"]*(Ara|Bul|Search)[^"]*)"[^>]*href="([^"]*)"/gi)].map((m) => `${m[1]} ${m[3].slice(0, 120)}`);
console.log('durum', sayfa.durum, 'gizli', Object.keys(gizli).join(','), '\nmersin', mersin, '\nbutonlar', butonlar.join('\n'), '\nanchors', anchors.join('\n'));
const selectler = [...html.matchAll(/<select name="([^"]+)"/g)].map((m) => m[1]);
console.log('selectler', selectler.join(', '));
if (process.env.GONDER) {
  const govde = new URLSearchParams({ ...gizli, 'ctl04$IsyeriTuruRadios': process.env.KAMU ? 'kamuRadio' : 'ozelSektorRadio', 'ctl04$ctlIl': mersin || '33', ...(JSON.parse(process.env.GONDER)) });
  const r = await al(URL_, { method: 'POST', body: govde, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: URL_ } });
  console.log('POST', r.durum, r.yer, r.metin.length);
  const t = r.metin.replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, ' ');
  const i = t.search(/ilan|sonuç|kayıt/i);
  console.log(t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(Math.max(0, i - 200), i + 3500));
}
