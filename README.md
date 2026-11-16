# Mersin Anlık – mersinanlik.com

Mersin ve 13 ilçesinden haberleri kaynak göstererek derleyen, hızlı ve sade yerel haber sitesi.

## Nasıl çalışır?

Her 30 dakikada bir GitHub üzerinde otomatik bir iş çalışır:

1. **Toplama** (`src/collect.js`): `src/sources.js` içindeki kaynaklar okunur, Mersin ile ilgili haberler ayıklanır, ilçesi ve kategorisi bulunur. Aynı olayı yazan farklı kaynaklar tek kartta birleşir.
2. **Risk filtresi**: Ölüm, suç isnadı, çocuk, siyaset içeren haberler otomatik yayınlanmaz; Telegram'a "Yayınla / Sil" düğmeleriyle gönderilir.
3. **Özet**: Sadece izin verilen kaynaklarda (resmî kurumlar vb.) Gemini 2 cümlelik özgün özet yazar. Diğerlerinde yalnızca başlık + kaynak linki gösterilir.
4. **Servisler** (`src/services.js`): 13 ilçenin hava durumu (MET Norway) ve son depremler (AFAD).
5. **Site üretimi** (`src/build.js`): Hazır HTML sayfaları `dist/` klasörüne yazılır ve Cloudflare Pages'e yüklenir.

Veriler `data/` klasöründe tutulur ve her çalışmada depoya kaydedilir.

## Gizli anahtarlar (GitHub → Settings → Secrets and variables → Actions)

| Ad | Ne için | Zorunlu mu |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Siteyi Cloudflare Pages'e yüklemek | Yayın için evet |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare hesap kimliği | Yayın için evet |
| `GEMINI_API_KEY` | Kısa özetler | Hayır |
| `TELEGRAM_BOT_TOKEN` | Onay botu | Hayır* |
| `TELEGRAM_CHAT_ID` | Onay mesajlarının gideceği sohbet | Hayır* |

\* Telegram ayarlanmazsa riskli haberler hiç yayınlanmaz (güvenli varsayılan).

## Bilgisayarda deneme

```bash
npm install
npm test
npm run sample                          # örnek veri (ornek-veri/ klasörüne, yayına çıkmaz)
VERI_KLASORU=ornek-veri npm run build   # dist/ klasörüne site üretir
node src/collect.js --dene <kaynak-id>  # tek bir kaynağı dener, hiçbir şey kaydetmez
```

## Yeni kaynak eklemek

`src/sources.js` dosyasına `aktif: false` olarak ekleyin, `node src/collect.js --dene <id>` ile deneyin, sonuç doğruysa `aktif: true` yapın. Yapay zekâ botlarını robots.txt ile engelleyen sitelerde `yapayZekaOzeti` her zaman `false` olmalıdır.
