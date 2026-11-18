// Çukurova Uluslararası Havalimanı (COV) uçuş bilgileri.
// Kaynak: havalimanı işletmecisinin resmî sitesi (cukurovaairport.aero); robots.txt serbest.
// Sitenin kendi uçuş tablosunu doldurduğu adres okunur: /flight-data?pageId=...
import { duzMetin } from './text.js';

export const UCUS_KAYNAK = 'https://www.cukurovaairport.aero/yolcular-ve-ziyaretciler/ucus-bilgileri/tum-ucuslar';
const ADRES = (id) => `https://www.cukurovaairport.aero/flight-data?pageId=${id}`;
export const UCUS_SAYFALARI = [
  { id: 'dom-dep-flights', yon: 'giden', hat: 'ic' },
  { id: 'int-dep-flights', yon: 'giden', hat: 'dis' },
  { id: 'dom-arr-flights', yon: 'gelen', hat: 'ic' },
  { id: 'int-arr-flights', yon: 'gelen', hat: 'dis' },
];

const HAVAYOLU = {
  'turkish airlines': 'THY', 'pegasus airlines': 'Pegasus', 'ajet': 'AJet', 'anadolujet': 'AJet', 'sunexpress': 'SunExpress',
  'aeroflot': 'Aeroflot', 'corendon': 'Corendon', 'freebird': 'Freebird',
};
const havayoluAdi = (ham = '') => {
  const k = ham.toLocaleLowerCase('tr-TR').trim();
  return HAVAYOLU[k] || ham.replace(/\b\w/g, (c) => c.toUpperCase());
};

// "18.11.2026 19:45" → ISO (İstanbul saati)
function zaman(metin = '') {
  const m = metin.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00+03:00`).toISOString() : null;
}

// Satır tablosunu çöz: uçuş no, havayolu, nereye/nereden, planlanan, tahmini, kapı, durum
export function ucusCoz(html = '') {
  const satirlar = String(html).split(/<tr\b[^>]*>/i).slice(1);
  const sonuc = [];
  for (const s of satirlar) {
    const no = [...s.matchAll(/<span[^>]*>\s*([A-Z0-9]{2}\s?\d{2,5}[A-Z]?)\s*<\/span>/g)].map((m) => m[1].replace(/\s/g, ''));
    if (!no.length) continue;
    const hy = s.match(/airlines_old\/(?!fleet\/)([^"/]+)\.(?:webp|png|jpg)/i)?.[1];
    const tdler = [...s.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => duzMetin(m[1]));
    const planIdx = tdler.findIndex((t) => /Planlanan/i.test(t));
    if (planIdx < 1) continue;
    const yer = tdler[planIdx - 1].replace(/Varış\/İniş Yeri/i, '').trim();
    const planlanan = zaman(tdler[planIdx]);
    const tahmini = zaman(tdler[planIdx + 1] || '');
    const kapi = (tdler[planIdx + 2] || '').trim();
    const durum = (tdler[planIdx + 3] || '').replace(/\s+/g, ' ').replace(/^\d+\s*-\s*\d+\s*/, '').trim();
    if (!yer || !planlanan) continue;
    sonuc.push({ no: [...new Set(no)], havayolu: hy ? havayoluAdi(decodeURIComponent(hy)) : '', yer, planlanan, tahmini: tahmini && tahmini !== planlanan ? tahmini : null, kapi: /^\d{1,4}$/.test(kapi) ? kapi : '', durum });
  }
  return sonuc;
}

export async function ucuslariGetir(ua, simdi = Date.now()) {
  const veri = { guncelleme: new Date(simdi).toISOString(), giden: [], gelen: [] };
  for (const sayfa of UCUS_SAYFALARI) {
    const r = await fetch(ADRES(sayfa.id), { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${sayfa.id}`);
    for (const u of ucusCoz(await r.text())) veri[sayfa.yon].push({ ...u, hat: sayfa.hat });
  }
  // Son 1 saat ile önümüzdeki 24 saat; saate göre sırala
  for (const yon of ['giden', 'gelen']) {
    veri[yon] = veri[yon]
      .filter((u) => {
        const t = new Date(u.tahmini || u.planlanan).getTime();
        return t > simdi - 3600e3 && t < simdi + 24 * 3600e3;
      })
      .sort((a, b) => new Date(a.planlanan) - new Date(b.planlanan));
  }
  if (!veri.giden.length && !veri.gelen.length) throw new Error('uçuş bulunamadı');
  return veri;
}
