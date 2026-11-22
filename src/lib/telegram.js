// Riskli haberler için Telegram onay sistemi.
// Bot, haberi "Yayınla / Sil" düğmeleriyle gönderir. Her çalışmada basılan düğmeler okunur.
//
// Ortam değişkenleri: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export function telegramHazirMi() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
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
    chat_id: process.env.TELEGRAM_CHAT_ID,
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
    if (!cq || String(cq.message?.chat?.id) !== String(process.env.TELEGRAM_CHAT_ID)) continue;
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
