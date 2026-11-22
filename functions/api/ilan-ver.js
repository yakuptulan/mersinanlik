// İşveren ilan formu: gelen ilanı Telegram'a "Onayla / Reddet" düğmeleriyle yollar.
// Onaylanan ilan bir sonraki güncellemede (en geç 30 dk) sitede yayınlanır (src/collect.js → data/isveren-ilanlari.json).
// Ortam: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (Cloudflare Pages gizli değişkenleri)

const ILCELER = {
  akdeniz: 'Akdeniz', anamur: 'Anamur', aydincik: 'Aydıncık', bozyazi: 'Bozyazı', camliyayla: 'Çamlıyayla', erdemli: 'Erdemli', gulnar: 'Gülnar',
  mezitli: 'Mezitli', mut: 'Mut', silifke: 'Silifke', tarsus: 'Tarsus', toroslar: 'Toroslar', yenisehir: 'Yenişehir',
};
const CALISMA = ['Tam zamanlı', 'Yarı zamanlı', 'Dönemsel / sezonluk', 'Stajyer', 'Günlük / yevmiyeli'];

const yanit = (veri, durum = 200) => new Response(JSON.stringify(veri), { status: durum, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const tek = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const cok = (s, n) => String(s || '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/^━+$/gm, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
const bugun = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);

export async function onRequestPost({ request, env }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return yanit({ hata: 'Ilan formu henuz hazir degil.' }, 503);
  let g;
  try {
    g = await request.json();
  } catch {
    return yanit({ hata: 'Form okunamadı.' }, 400);
  }
  // Basit bot koruması: gizli alan dolu ya da form 5 saniyeden kısa sürede gönderildiyse sessizce kabul et
  if (g.web || (Number(g.sure) > 0 && Number(g.sure) < 5000)) return yanit({ tamam: true });

  const ilan = {
    isyeri: tek(g.isyeri, 90),
    pozisyon: tek(g.pozisyon, 90),
    ilceSlug: ILCELER[g.ilce] ? g.ilce : '',
    kisi: Math.max(1, Math.min(99, parseInt(g.kisi, 10) || 1)),
    calisma: CALISMA.includes(g.calisma) ? g.calisma : 'Tam zamanlı',
    telefon: tek(g.telefon, 20).replace(/[^\d+ ()-]/g, ''),
    eposta: tek(g.eposta, 80),
    ucret: tek(g.ucret, 60),
    aciklama: cok(g.aciklama, 1200),
    nitelik: cok(g.nitelik, 600),
    sonBasvuru: /^\d{4}-\d{2}-\d{2}$/.test(g.sonBasvuru || '') ? g.sonBasvuru : '',
  };
  const eksik = [];
  if (ilan.isyeri.length < 2) eksik.push('işyeri adı');
  if (ilan.pozisyon.length < 2) eksik.push('pozisyon');
  if (!ilan.ilceSlug) eksik.push('ilçe');
  if (ilan.telefon.replace(/\D/g, '').length < 10) eksik.push('telefon');
  if (ilan.aciklama.length < 20) eksik.push('iş tanımı (en az 20 karakter)');
  if (ilan.eposta && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ilan.eposta)) eksik.push('geçerli e-posta');
  if (!g.onay) eksik.push('onay kutusu');
  if (eksik.length) return yanit({ hata: `Eksik ya da hatalı: ${eksik.join(', ')}.` }, 400);

  // Son başvuru: boşsa 30 gün sonrası, en fazla 60 gün
  const enGec = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  if (!ilan.sonBasvuru || ilan.sonBasvuru < bugun()) ilan.sonBasvuru = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  if (ilan.sonBasvuru > enGec) ilan.sonBasvuru = enGec;

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const metin = [
    '📝 Yeni işveren ilanı (onay bekliyor)',
    '━━━━━━━━━━',
    `İşyeri: ${ilan.isyeri}`,
    `Pozisyon: ${ilan.pozisyon}`,
    `İlçe: ${ILCELER[ilan.ilceSlug]}`,
    `İlçe kodu: ${ilan.ilceSlug}`,
    `Kişi: ${ilan.kisi}`,
    `Çalışma: ${ilan.calisma}`,
    `Son başvuru: ${ilan.sonBasvuru}`,
    `Telefon: ${ilan.telefon}`,
    `E-posta: ${ilan.eposta || '-'}`,
    `Ücret: ${ilan.ucret || '-'}`,
    'Açıklama:',
    ilan.aciklama,
    ...(ilan.nitelik ? ['Aranan nitelikler:', ilan.nitelik] : []),
    '━━━━━━━━━━',
    `Gönderen IP: ${request.headers.get('CF-Connecting-IP') || '-'}`,
  ].join('\n').slice(0, 4000);

  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: metin,
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: '✅ Onayla, yayınla', callback_data: `iok:${id}` }, { text: '🗑 Reddet', callback_data: `isil:${id}` }]] },
    }),
  });
  if (!r.ok) return yanit({ hata: 'İlan şu an iletilemedi, biraz sonra tekrar deneyin.' }, 502);
  return yanit({ tamam: true });
}
