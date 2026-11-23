// Riskli haberler için Telegram onay sistemi.
// Bot, haberi "Yayınla / Sil" düğmeleriyle gönderir. Her çalışmada basılan düğmeler okunur.
//
// Ortam değişkenleri: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

import fs from 'node:fs';

const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const DOSYA = 'data/telegram.json';

// Sohbet kimliği: önce ortam değişkeni, yoksa bota ilk "Start" diyen kişiden bulunup data/telegram.json'a yazılır
function kayitliSohbet() {
  try { return JSON.parse(fs.readFileSync(DOSYA, 'utf8')).sohbet || null; } catch { return null; }
}
const sohbet = () => process.env.TELEGRAM_CHAT_ID || kayitliSohbet();

export async function sohbetBul() {
  if (!process.env.TELEGRAM_BOT_TOKEN || sohbet()) return sohbet();
  try {
    const r = await (await fetch(`${API()}/getUpdates?allowed_updates=${encodeURIComponent('["message"]')}`)).json();
    const m = (r.result || []).map((u) => u.message).find((x) => x?.chat?.type === 'private');
    if (!m) return null;
    fs.writeFileSync(DOSYA, JSON.stringify({ sohbet: String(m.chat.id) }, null, 1));
    await fetch(`${API()}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: m.chat.id, text: '✅ Mersin Anlık onay botu bağlandı. Onay bekleyen haberler ve işveren ilanları buraya gelecek.' }) });
    return String(m.chat.id);
  } catch {
    return null;
  }
}

export function telegramHazirMi() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && sohbet());
}

async function cagir(metod, govde) {
  const res = await fetch(`${API()}/${metod}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(govde),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${metod}: ${json.description}`);
  return json.result;
}

export async function onayIste(hikaye) {
  const kaynaklar = hikaye.kaynaklar.map((k) => `• ${k.ad}`).join('\n');
  const metin =
    `🟠 Onay bekleyen haber\n\n${hikaye.baslik}\n\n` +
    `Neden: ${hikaye.riskNedenleri.join(', ')}\n${kaynaklar}\n${hikaye.kaynaklar[0].link}`;
  const mesaj = await cagir('sendMessage', {
    chat_id: sohbet(),
    text: metin,
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Yayınla', callback_data: `ok:${hikaye.id}` },
        { text: '🗑 Sil', callback_data: `sil:${hikaye.id}` },
      ]],
    },
  });
  return mesaj.message_id;
}

// Basılan düğmeleri okur. offset, aynı düğmenin iki kez işlenmemesi içindir.
export async function kararlariOku(offset = 0) {
  const guncellemeler = await cagir('getUpdates', { offset, timeout: 0, allowed_updates: ['callback_query'] });
  const kararlar = [];
  let sonOffset = offset;
  for (const g of guncellemeler) {
    sonOffset = Math.max(sonOffset, g.update_id + 1);
    const cq = g.callback_query;
    if (!cq || String(cq.message?.chat?.id) !== String(sohbet())) continue;
    const [islem, id] = String(cq.data).split(':');
    kararlar.push({ islem, id, metin: cq.message?.text || '' });
    await cagir('answerCallbackQuery', {
      callback_query_id: cq.id,
      text: islem === 'ok' || islem === 'iok' ? 'Yayınlanacak' : 'Silindi',
    }).catch(() => {});
    await cagir('editMessageReplyMarkup', {
      chat_id: cq.message.chat.id,
      message_id: cq.message.message_id,
      reply_markup: { inline_keyboard: [[{ text: islem === 'ok' || islem === 'iok' ? '✅ Yayınlandı' : '🗑 Silindi', callback_data: 'x' }]] },
    }).catch(() => {});
  }
  return { kararlar, offset: sonOffset };
}
