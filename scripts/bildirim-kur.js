// @ts-nocheck
// KV alanını (mersinanlik-bildirim) bulur ya da oluşturur; VAPID anahtarlarını üretip KV'ye yazar.
import crypto from 'node:crypto';
const API = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_HESAP}/storage/kv/namespaces`;
const H = { Authorization: `Bearer ${process.env.CF_TOKEN}`, 'Content-Type': 'application/json' };
const ADI = 'mersinanlik-bildirim';

const liste = await (await fetch(`${API}?per_page=100`, { headers: H })).json();
if (!liste.success) {
  console.log('KV listelenemedi:', JSON.stringify(liste.errors));
  process.exit(1);
}
let ns = liste.result.find((x) => x.title === ADI);
if (!ns) {
  const r = await (await fetch(API, { method: 'POST', headers: H, body: JSON.stringify({ title: ADI }) })).json();
  if (!r.success) {
    console.log('KV oluşturulamadı:', JSON.stringify(r.errors));
    process.exit(1);
  }
  ns = r.result;
  console.log('KV oluşturuldu');
}
console.log('KV_ID=' + ns.id);
const var_ = await fetch(`${API}/${ns.id}/values/vapid`, { headers: H });
if (var_.ok) {
  console.log('VAPID_PUBLIC=' + JSON.parse(await var_.text()).publicKey);
} else {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwkPub = publicKey.export({ format: 'jwk' });
  const jwkPri = privateKey.export({ format: 'jwk' });
  const b64 = (b) => Buffer.from(b, 'base64url');
  const pub = Buffer.concat([Buffer.from([4]), b64(jwkPub.x), b64(jwkPub.y)]).toString('base64url');
  const pri = b64(jwkPri.d).toString('base64url');
  const r = await fetch(`${API}/${ns.id}/values/vapid`, { method: 'PUT', headers: { Authorization: H.Authorization }, body: JSON.stringify({ publicKey: pub, privateKey: pri }) });
  if (!r.ok) {
    console.log('Anahtar yazılamadı:', await r.text());
    process.exit(1);
  }
  console.log('VAPID_PUBLIC=' + pub);
}
