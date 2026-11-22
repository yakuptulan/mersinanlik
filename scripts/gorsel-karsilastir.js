// Son ücretsiz (Cloudflare) görselli 3 Mersin haberini kaliteli modelle yeniden üretir;
// eski ve yeni görselleri karsilastirma/ klasörüne koyar (sadece kontrol amaçlı, depoya yazılmaz).
import fs from 'node:fs';
import path from 'node:path';
import { premiumUret, URETILEN_KLASOR } from '../src/lib/gorsel-uret.js';

const veri = JSON.parse(fs.readFileSync('data/haberler.json', 'utf8'));
const adaylar = veri.hikayeler
  .filter((h) => h.durum === 'yayinda' && !h.genel && h.gorselKaynak === 'yz' && h.gorselKalite !== 'premium' && h.gorsel && fs.existsSync(path.join(URETILEN_KLASOR, h.gorsel)))
  .sort((a, b) => new Date(b.ilkGorulme) - new Date(a.ilkGorulme))
  .slice(0, 3);
fs.mkdirSync('karsilastirma', { recursive: true });
const liste = [];
for (const [i, h] of adaylar.entries()) {
  fs.copyFileSync(path.join(URETILEN_KLASOR, h.gorsel), `karsilastirma/${i}-eski.webp`);
  try {
    const yol = await premiumUret(h, '16:9');
    fs.copyFileSync(yol, `karsilastirma/${i}-yeni.webp`);
    liste.push({ i, baslik: h.baslik });
    console.log(`Tamam: ${h.baslik}`);
  } catch (e) {
    console.log(`Olmadı: ${h.baslik} → ${e.message}`);
  }
}
fs.writeFileSync('karsilastirma/liste.json', JSON.stringify(liste, null, 1));
