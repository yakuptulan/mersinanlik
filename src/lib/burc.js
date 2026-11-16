// Günlük burç yorumları: günde bir kez yapay zekâ ile yazılır. Eğlence amaçlıdır.
import { jsonYaz } from './gemini.js';

export const BURCLAR = [
  ['koc', 'Koç', '21 Mart – 19 Nisan', '♈'], ['boga', 'Boğa', '20 Nisan – 20 Mayıs', '♉'], ['ikizler', 'İkizler', '21 Mayıs – 20 Haziran', '♊'],
  ['yengec', 'Yengeç', '21 Haziran – 22 Temmuz', '♋'], ['aslan', 'Aslan', '23 Temmuz – 22 Ağustos', '♌'], ['basak', 'Başak', '23 Ağustos – 22 Eylül', '♍'],
  ['terazi', 'Terazi', '23 Eylül – 22 Ekim', '♎'], ['akrep', 'Akrep', '23 Ekim – 21 Kasım', '♏'], ['yay', 'Yay', '22 Kasım – 21 Aralık', '♐'],
  ['oglak', 'Oğlak', '22 Aralık – 19 Ocak', '♑'], ['kova', 'Kova', '20 Ocak – 18 Şubat', '♒'], ['balik', 'Balık', '19 Şubat – 20 Mart', '♓'],
];

const TALIMAT = `Bir yerel haber sitesinin eğlence köşesi için günlük burç yorumları yazıyorsun.
Her burç için Türkçe, sıcak ve olumlu tonda, 2-3 cümlelik (40-60 kelime) bir günlük yorum yaz.
Kurallar:
- Sağlık, hastalık, ilaç, hukuki konu, yatırım/borsa/kripto tavsiyesi, kumar ve şans oyunu önerisi verme.
- Korkutucu, kesin kehanet gibi ifadeler kullanma ("kesinlikle olacak" yerine "olabilir", "iyi gelebilir").
- Her burç için farklı bir konuya değin (iş, aile, arkadaşlık, kendine vakit, yeni bir hobi, ev düzeni gibi).
- Yalnızca JSON döndür: {"koc": "...", "boga": "...", ... } anahtarlar: ${BURCLAR.map((b) => b[0]).join(', ')}`;

export async function burcYaz(tarihMetni) {
  const j = await jsonYaz(TALIMAT, `Tarih: ${tarihMetni}. 12 burcun bugünkü yorumlarını yaz.`, { sicaklik: 0.9 });
  const yorumlar = {};
  for (const [slug] of BURCLAR) if (typeof j?.[slug] === 'string' && j[slug].length > 20) yorumlar[slug] = j[slug].trim();
  if (Object.keys(yorumlar).length < 10) throw new Error('Burç yorumları eksik geldi');
  return yorumlar;
}
