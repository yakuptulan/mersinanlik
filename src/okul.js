// "Yarın okullar tatil mi?" — haberlerde Mersin için okul tatili kararı geçerse yakalar.
// Aday haberleri kelime ile süzer, kararı yapay zekâya teyit ettirir (ara tatil, yarıyıl gibi
// olağan tatilleri ya da başka illerin kararlarını eler). Sonuç data/okul.json'a yazılır.
import fs from 'node:fs';
import path from 'node:path';
import { jsonYaz } from './lib/gemini.js';
import { ILCELER } from './config.js';

const DOSYA = path.resolve('data/okul.json');
export const ADAY = /(okul|eğitim|ders)[^.]{0,50}(tatil|ara veril|yapılmayacak|iptal)|tatil (edildi|ilan)|eğitime (bir gün |1 gün |2 gün )?ara/i;
const OLAGAN = /ara tatil|yarıyıl|sömestr|yaz tatili|bayram tatili|tatil takvimi|okulların açılış/i;

const TALIMAT = `Sen bir haber editörüsün. Sana Mersin ile ilgili olabilecek bir haber vereceğim.
Soru: Bu haber, Mersin ilinde (tamamında ya da bazı ilçelerinde) okulların belirli gün(ler) için tatil edildiği / eğitime ara verildiği RESMİ bir kararı mı bildiriyor?
- Kar, sel, fırtına, deprem, seçim gibi nedenlerle Valilik/Kaymakamlık/Bakanlık kararıysa "tatil": true.
- Ara tatil, yarıyıl tatili, yaz tatili gibi takvimdeki olağan tatiller, başka illerin kararları, "tatil olacak mı" tahminleri, tek bir okulun kapanması ise "tatil": false.
- gunler: tatil olan günler "YYYY-MM-DD" (haber tarihi: {TARIH}; "yarın" = bir sonraki gün).
- kapsam: "tum" (tüm Mersin) ya da "ilce"; ilceler: ilçe adları (ör. ["Tarsus","Mut"]).
- kurum: kararı veren (ör. "Mersin Valiliği"); not: kim için geçerli, kısa (ör. "Resmî ve özel tüm okullarda eğitime 1 gün ara verildi").
Yalnızca JSON döndür: {"tatil":false,"gunler":[],"kapsam":"tum","ilceler":[],"kurum":"","not":""}`;

const ilceSlug = (ad) => ILCELER.find((i) => i.ad.toLocaleLowerCase('tr-TR') === String(ad).toLocaleLowerCase('tr-TR').trim())?.slug;

export function okulYukle() {
  try {
    return JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
  } catch {
    return { kararlar: [], bakilan: [] };
  }
}

async function main() {
  const veri = okulYukle();
  const simdi = Date.now();
  const { hikayeler } = JSON.parse(fs.readFileSync(path.resolve('data/haberler.json'), 'utf8'));
  const bakilan = new Set(veri.bakilan);
  const adaylar = hikayeler.filter((x) => {
    if (bakilan.has(x.id) || x.durum !== 'yayinda') return false;
    if (simdi - new Date(x.ilkGorulme).getTime() > 48 * 36e5) return false;
    const metin = `${x.baslik} ${x.ozet || ''}`;
    if (!ADAY.test(metin) || OLAGAN.test(x.baslik)) return false;
    return !x.genel || /mersin/i.test(metin);
  });
  for (const x of adaylar.slice(0, 5)) {
    bakilan.add(x.id);
    try {
      const tarih = new Date(x.ilkGorulme).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
      const j = await jsonYaz(TALIMAT.replace('{TARIH}', tarih), `${x.baslik}\n\n${x.metin || x.ozet || ''}`.slice(0, 4000), { sicaklik: 0, sadeceGemini: true });
      const gunler = (j?.gunler || []).filter((g) => /^\d{4}-\d{2}-\d{2}$/.test(g));
      console.log(`🏫 Okul tatili adayı: ${x.baslik} → ${j?.tatil ? `TATİL ${gunler.join(', ')}` : 'değil'}`);
      if (!j?.tatil || !gunler.length) continue;
      veri.kararlar.unshift({
        haberId: x.id,
        baslik: x.baslik,
        gunler,
        kapsam: j.kapsam === 'ilce' ? 'ilce' : 'tum',
        ilceler: (j.ilceler || []).map(ilceSlug).filter(Boolean),
        kurum: String(j.kurum || '').slice(0, 80),
        not: String(j.not || '').slice(0, 220),
        tarih: x.ilkGorulme,
      });
    } catch (e) {
      bakilan.delete(x.id); // sonra yeniden denensin
      console.warn(`! Okul tatili: ${e.message.slice(0, 160)}`);
    }
  }
  veri.kararlar = veri.kararlar.slice(0, 60);
  veri.bakilan = [...bakilan].slice(-400);
  fs.writeFileSync(DOSYA, JSON.stringify(veri, null, 1));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
