// İŞKUR açık iş ilanları (esube.iskur.gov.tr, kamuya açık arama sayfası).
// Form Mersin seçilerek gönderilir, "Sonraki Sayfa" ile tüm sayfalar gezilir.
// İşveren adı İŞKUR'da yalnızca üyelere gösteriliyor; biz de göstermiyoruz.

const ARAMA = 'https://esube.iskur.gov.tr/Istihdam/AcikIsIlanAra.aspx';
const DETAY = 'https://esube.iskur.gov.tr/Istihdam/AcikIsIlanDetay.aspx';
const UA = 'Mozilla/5.0 (compatible; MersinAnlikBot/1.0; +https://mersinanlik.com)';
const MERSIN = '33';

export const ilanLinki = (no, tur = 'Özel') => `${DETAY}?uiID=${no}&isyeriTuru=${encodeURIComponent(tur)}`;

const varlik = (s) => String(s || '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const duz = (s) => varlik(String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

function oturum() {
  let cerez = '';
  return async (url, opt = {}) => {
    const r = await fetch(url, { ...opt, redirect: 'follow', signal: AbortSignal.timeout(45000), headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr', Cookie: cerez, ...(opt.headers || {}) } });
    const sc = r.headers.getSetCookie?.() || [];
    if (sc.length) cerez = [...new Map([...cerez.split('; ').filter(Boolean), ...sc.map((c) => c.split(';')[0])].map((c) => [c.split('=')[0], c])).values()].join('; ');
    if (!r.ok) throw new Error(`İŞKUR HTTP ${r.status}`);
    return r.text();
  };
}
const gizliAlanlar = (html) => Object.fromEntries([...html.matchAll(/<input[^>]+type="hidden"[^>]*>/gi)]
  .map((m) => [m[0].match(/name="([^"]+)"/)?.[1], varlik(m[0].match(/value="([^"]*)"/)?.[1] || '')]).filter(([k]) => k));

// Sonuç sayfasındaki ilan satırları
export function ilanlariCoz(html) {
  const sonuc = [];
  for (const m of html.matchAll(/PopupJobDetails\(&#39;(\d+)&#39;,&#39;([^&]+)&#39;[\s\S]*?style="font-weight:bold;">([\s\S]*?)<\/a>([\s\S]*?)İlan Bitimine Kalan Süre/g)) {
    const blok = m[4];
    const al = (id) => duz(blok.match(new RegExp(`_${id}"[^>]*>([\\s\\S]*?)<\\/span>`))?.[1] || '');
    const yer = duz(blok.match(/_ctlCalismaYeriDL"[^>]*>([\s\S]*?)<\/span>/)?.[1] || '');
    const ilce = yer.match(/MERS[İI]N\s*\/\s*([^)]+)\)/i)?.[1]?.trim() || '';
    const [g, a, y] = (al('ctlSonBasvuruTarihi').match(/(\d{2})\.(\d{2})\.(\d{4})/) || []).slice(1);
    sonuc.push({
      no: m[1],
      tur: varlik(m[2]),
      pozisyon: duz(m[3]).replace(/\s+/g, ' '),
      periyot: al('ctlCalismaPeriyotDL'),
      sekil: al('ctlCalismaSekliDL'),
      acik: Number(al('Label9')) || 1,
      ilceHam: ilce,
      genel: /ülke geneli|il geneli/i.test(yer) && !ilce,
      sonBasvuru: y ? `${y}-${a}-${g}` : null,
    });
  }
  return sonuc;
}

// Mersin'deki tüm açık ilanlar (en fazla maxSayfa sayfa)
export async function iskurMersinIlanlari({ kamu = false, maxSayfa = 40, bekleMs = 1500 } = {}) {
  const al = oturum();
  let html = await al(ARAMA);
  const temel = (h) => ({ ...gizliAlanlar(h), 'ctl04$IsyeriTuruRadios': kamu ? 'kamuRadio' : 'ozelSektorRadio', 'ctl04$ctlIl': MERSIN });
  const gonder = async (hedef, h) => al(ARAMA, { method: 'POST', body: new URLSearchParams({ ...temel(h), __EVENTTARGET: hedef, __EVENTARGUMENT: '' }), headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: ARAMA } });
  html = await gonder('ctl04$ctlAcikIsPageCommand$CommandItem_Search', html);
  const toplam = Number(html.match(/Toplam Kayıt:\s*(\d+)/)?.[1] || 0);
  const ilanlar = ilanlariCoz(html);
  for (let s = 2; s <= maxSayfa && /ctlDataPagerDetay\$btnNext/.test(html); s++) {
    await new Promise((r) => setTimeout(r, bekleMs));
    html = await gonder('ctl04$ctlDataPagerDetay$btnNext', html);
    const yeni = ilanlariCoz(html);
    if (!yeni.length) break;
    ilanlar.push(...yeni);
  }
  return { toplam, ilanlar: [...new Map(ilanlar.map((i) => [i.no, i])).values()] };
}

// İlan ayrıntısı: açıklama, nitelikler, öğrenim
export async function ilanDetayi(no, tur = 'Özel') {
  const html = await oturum()(ilanLinki(no, tur));
  const span = (id) => duz(html.match(new RegExp(`id="ctl01_ctlIsIlanBilgileri_${id}"[^>]*>([\\s\\S]*?)<\\/span>\\s*(<span|<\\/td>)`))?.[1] || '');
  const metin = duz(html.replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, ' '));
  const arasi = (a, b) => { const i = metin.indexOf(a); if (i < 0) return ''; const j = metin.indexOf(b, i + a.length); return metin.slice(i + a.length, j > i ? j : i + 600).replace(/\|/g, ' ').replace(/\s+/g, ' ').trim(); };
  // Telefon ve e-posta çıkarılır: başvuru İŞKUR üzerinden yapılsın (dolandırıcılık riskine karşı)
  const temizle = (s) => s.replace(/(\+?90[\s-]?)?\(?0?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g, '').replace(/\S+@\S+\.\S+/g, '').replace(/\s+([.,])/g, '$1').trim();
  const aciklama = temizle([span('ctlGenelSartlar'), span('ctlOzelSartlarText'), span('ctlGenelSartlarManuel')].filter(Boolean).join('\n'));
  return {
    aciklama: aciklama.slice(0, 900),
    nitelik: temizle(arasi('Nitelik ve Beceriler', 'Meslek Bilgileri')).slice(0, 400),
    ogrenim: arasi('En Az Öğrenim Seviyesi', 'En Fazla').replace(/^:\s*/, '').slice(0, 60),
  };
}
