// 81 il "okullar tatil mi?" — AA, TRT Haber ve NTV akışlarında valilik tatil kararlarını yakalar.
// Başlık kelimeyle süzülür, karar (il, gün, kapsam) yapay zekâyla çıkarılır; yapay zekâ
// yanıt vermezse yalnızca kesin ifadeli başlıklar için kurallı çözüm kullanılır.
// Sonuç: data/okul81.json → /okullar-tatil-mi/<il>/ ve /kar-tatili/ sayfaları, günlük "tatil olan iller" haberi.
import fs from 'node:fs';
import { kaynakOku } from './lib/rss.js';
import { jsonYaz } from './lib/gemini.js';
import ILLER from './iller.json' with { type: 'json' };

const DOSYA = 'data/okul81.json';
const AKISLAR = [
  { ad: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=guncel' },
  { ad: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=yasam' },
  { ad: 'TRT Haber', url: 'https://www.trthaber.com/sondakika_articles.rss' },
  { ad: 'TRT Haber', url: 'https://www.trthaber.com/gundem_articles.rss' },
  { ad: 'TRT Haber', url: 'https://www.trthaber.com/turkiye_articles.rss' },
  { ad: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=egitim' },
  { ad: 'NTV', url: 'https://www.ntv.com.tr/son-dakika.rss' },
  { ad: 'NTV', url: 'https://www.ntv.com.tr/turkiye.rss' },
];
// Kar yağışlı akşamlarda onlarca il aynı saatlerde karar açıklar: her çalışmada bu kadar habere bakılır
const CALISMA_BASINA = 24;
const ADAY = /(okul|eğitim|ders|öğretim)[^.]{0,60}(tatil|ara veril|yapılmayacak|iptal)|tatil (edildi|ilan)|kar tatili|eğitime[^.]{0,25}ara|eğitime kar engeli/i;
const OLAGAN = /ara tatil|yarıyıl|sömestr|yaz tatili|bayram tatili|tatil takvimi|okulların açılış|tatil olacak mı|tatil mi\?/i;
const KESIN = /(tatil edildi|ara verildi|eğitim yapılmayacak|tatil ilan edildi|eğitime kar engeli)/i;
const TZ = 'Europe/Istanbul';
const gun = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: TZ });
const sade = (s) => String(s).toLocaleLowerCase('tr-TR');
const ilBul = (ad) => ILLER.find((i) => sade(i.ad) === sade(String(ad).replace(/\s*(valiliği|ili)$/i, '').trim()));
const ilAdlari = (metin) => ILLER.filter((i) => new RegExp(`(^|[^a-zçğıöşü])${sade(i.ad)}('|’|\\s|,|$)`, 'i').test(sade(metin)));

const TALIMAT = `Sen bir haber editörüsün. Türkiye'de bir okul tatili kararını bildiriyor olabilecek bir haber vereceğim.
Soru: Haber, bir ya da birden çok ilde (tamamında ya da bazı ilçelerinde) okulların belirli gün(ler) için tatil edildiğini / eğitime ara verildiğini bildiren RESMİ (Valilik, Kaymakamlık ya da Bakanlık) bir kararı mı bildiriyor?
- Kar, buzlanma, sel, fırtına, deprem gibi nedenlerle alınmış kararsa "tatil": true.
- Takvimdeki olağan tatiller (ara tatil, yarıyıl, yaz tatili), "tatil olacak mı" tahminleri, tek bir okulun kapanması ise "tatil": false.
- Her il için ayrı kayıt ver: il (il adı), kapsam: "tum" (ilin tamamı) ya da "ilce", ilceler: ilçe adları, gunler: "YYYY-MM-DD" (haber tarihi {TARIH}; "yarın" = bir sonraki gün).
- kurum: kararı veren (ör. "Erzurum Valiliği"); not: kısa açıklama (ör. "Kar nedeniyle tüm okullarda eğitime 1 gün ara verildi").
Yalnızca JSON döndür: {"tatil":false,"kararlar":[{"il":"","kapsam":"tum","ilceler":[],"gunler":[],"kurum":"","not":""}]}`;

function kuralli(x) {
  // Yalnızca kesin karar ifadesi + tek il adı geçen başlıklar
  if (!KESIN.test(x.baslik)) return null;
  const iller = ilAdlari(x.baslik);
  if (iller.length !== 1) return null;
  const t = new Date(x.tarih || Date.now());
  const yarin = /yarın/i.test(x.baslik) || (!/bugün/i.test(x.baslik) && Number(t.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ })) >= 14);
  const g = gun(yarin ? t.getTime() + 864e5 : t);
  const ilce = /ilçe/i.test(x.baslik) || / ilçesinde| ilçelerinde/i.test(x.baslik);
  return [{ il: iller[0].ad, kapsam: ilce ? 'ilce' : 'tum', ilceler: [], gunler: [g], kurum: `${iller[0].ad} Valiliği`, not: x.baslik }];
}

let veri = { kararlar: [], bakilan: [] };
try {
  veri = { ...veri, ...JSON.parse(fs.readFileSync(DOSYA, 'utf8')) };
} catch {}
const bakilan = new Set(veri.bakilan);
const adaylar = [];
for (const a of AKISLAR) {
  try {
    for (const x of await kaynakOku(a)) {
      if (bakilan.has(x.link) || Date.now() - new Date(x.tarih || 0) > 36 * 36e5) continue;
      const m = `${x.baslik} ${x.aciklama || ''}`;
      if (!ADAY.test(m) || OLAGAN.test(x.baslik)) continue;
      if (!adaylar.some((y) => y.link === x.link)) adaylar.push({ ...x, kaynak: a.ad });
    }
  } catch (e) {
    console.warn(`! Okul (${a.url}): ${e.message}`);
  }
}
// En yeni haber önce; başlıkta tek il geçiyorsa ve o ilin aynı gün(ler) için "tüm il" kararı zaten kayıtlıysa
// yapay zekâya gitmeden geçilir (aynı kararı birçok kaynak yazar)
adaylar.sort((a, b) => new Date(b.tarih || 0) - new Date(a.tarih || 0));
const zatenVar = (x) => {
  const iller = ilAdlari(x.baslik);
  if (iller.length !== 1) return false;
  const t = new Date(x.tarih || Date.now());
  const ertesi = gun(t.getTime() + 864e5);
  return veri.kararlar.some((k) => k.il === iller[0].slug && k.kapsam === 'tum' && k.gunler.includes(ertesi));
};
let yeni = 0;
let bakildi = 0;
for (const x of adaylar) {
  if (bakildi >= CALISMA_BASINA) break;
  if (zatenVar(x)) { bakilan.add(x.link); continue; }
  bakildi++;
  bakilan.add(x.link);
  let kararlar = null;
  try {
    const j = await jsonYaz(TALIMAT.replace('{TARIH}', gun(x.tarih || Date.now())), `${x.baslik}\n\n${x.aciklama || ''}`.slice(0, 3000), { sicaklik: 0, sadeceGemini: true });
    kararlar = j?.tatil ? j.kararlar || [] : [];
  } catch (e) {
    console.warn(`! Okul yapay zekâ: ${e.message.slice(0, 120)} → kurallı çözüm`);
    kararlar = kuralli(x) || [];
  }
  for (const k of kararlar) {
    const il = ilBul(k.il);
    const gunler = (k.gunler || []).filter((g) => /^\d{4}-\d{2}-\d{2}$/.test(g));
    if (!il || !gunler.length) continue;
    const ayni = veri.kararlar.find((y) => y.il === il.slug && y.gunler.join() === gunler.join() && y.kapsam === (k.kapsam === 'ilce' ? 'ilce' : 'tum'));
    if (ayni) continue;
    veri.kararlar.unshift({
      il: il.slug,
      gunler,
      kapsam: k.kapsam === 'ilce' ? 'ilce' : 'tum',
      ilceler: (k.ilceler || []).map(String).slice(0, 20),
      kurum: String(k.kurum || `${il.ad} Valiliği`).slice(0, 80),
      not: String(k.not || '').slice(0, 220),
      baslik: x.baslik,
      link: x.link,
      kaynak: x.kaynak,
      tarih: new Date().toISOString(),
    });
    yeni++;
    console.log(`🏫 ${il.ad}: ${gunler.join(', ')} (${k.kapsam === 'ilce' ? (k.ilceler || []).join(', ') : 'tüm il'})`);
  }
}
const sinir = gun(Date.now() - 60 * 864e5);
veri.kararlar = veri.kararlar.filter((k) => k.gunler.at(-1) >= sinir).slice(0, 400);
veri.bakilan = [...bakilan].slice(-1500);
fs.writeFileSync(DOSYA, JSON.stringify(veri));
console.log(`Okul (81 il): ${adaylar.length} aday, ${yeni} yeni karar, toplam ${veri.kararlar.length}`);
