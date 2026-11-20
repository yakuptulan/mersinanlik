// Reklam ve iş birliği sayfası: başvurular Step Digital'e WhatsApp mesajı olarak gider (sunucu gerekmez).
import { htmlKacis as h } from '../lib/text.js';
import { sayfa } from './layout.js';
import { SITE } from '../config.js';

export const REKLAM = {
  yurutucu: 'Step Digital',
  site: 'https://stepdigital.org',
  whatsapp: '905050657187',
  telefon: '0505 065 71 87',
  eposta: 'stepdigitalcom@gmail.com',
};

const HIZMETLER = [
  {
    ikon: '📰',
    ad: 'Tanıtım içeriği',
    ozet: "İşletmenizi, açılışınızı ya da kampanyanızı anlatan, Mersin Anlık'ta yayımlanan tanıtım yazısı.",
    maddeler: ['Profesyonelce yazılır, fotoğraflarla yayımlanır', 'Kalıcı olarak sitede kalır, Google\'da aranabilir', 'Açıkça "Tanıtım" olarak işaretlenir'],
  },
  {
    ikon: '🎬',
    ad: 'Video tanıtım',
    ozet: 'Ekibimiz işletmenize gelir; mekânınızı, ürünlerinizi ve hikâyenizi anlatan dikey video çeker.',
    maddeler: ['4K çekim, drone seçeneği, kurgu dahil', 'Sitede ve sosyal medyada yayın', 'Video kendi hesaplarınızda da kullanılabilir'],
    one: true,
  },
  {
    ikon: '📍',
    ad: 'Sitede reklam alanı',
    ozet: 'Ana sayfada, ilçe sayfalarında ve haber sayfalarında işletmenize ait görsel reklam.',
    maddeler: ['İlçe hedefli gösterim (ör. yalnızca Mezitli sayfaları)', 'Haftalık ya da aylık yayın', 'Görsel tasarımı bizden'],
  },
  {
    ikon: '📱',
    ad: 'Sosyal medya yönetimi',
    ozet: 'Kendi hesaplarınız için içerik planı, video çekimi, kurgu, tasarım ve reklam yönetimi.',
    maddeler: ['Instagram, TikTok, YouTube Shorts', 'Aylık içerik ve çekim planı', 'Meta reklam yönetimi'],
  },
];

export function reklamSayfasi({ istatistik = {} } = {}) {
  const wa = (metin) => `https://wa.me/${REKLAM.whatsapp}?text=${encodeURIComponent(metin)}`;
  const kutu = (x) => `<article class="rk-kart${x.one ? ' one' : ''}"><span class="rk-ikon">${x.ikon}</span><h3>${h(x.ad)}</h3><p>${h(x.ozet)}</p><ul>${x.maddeler.map((m) => `<li>${h(m)}</li>`).join('')}</ul><a class="rk-btn ikincil" href="${wa(`Merhaba, Mersin Anlık'ta "${x.ad}" hakkında bilgi almak istiyorum.`)}" rel="noopener" target="_blank">Bilgi al</a></article>`;
  const sss = [
    { soru: "Mersin Anlık'ta nasıl reklam verilir?", cevap: `Formu doldurup WhatsApp'tan gönderebilir ya da ${REKLAM.telefon} numarasını arayabilirsiniz. Reklam ve iş birlikleri ${REKLAM.yurutucu} tarafından yürütülür; ihtiyacınıza göre teklif hazırlanır.` },
    { soru: 'Tanıtım içerikleri haberlerden ayrılıyor mu?', cevap: 'Evet. Ücretli her içerik açıkça "Tanıtım" ya da "Reklam" olarak işaretlenir ve haber içeriğinden ayrı tutulur. Bu, hem okurlarımıza hem de reklam verenlere karşı sorumluluğumuzdur.' },
    { soru: 'Hangi tanıtımları kabul etmiyorsunuz?', cevap: 'Mevzuat gereği hekim, klinik ve sağlık kuruluşlarının tanıtımını yapmıyoruz. Siyasi reklam, bahis ve kumar, yanıltıcı ya da yasa dışı ürün ve hizmet tanıtımları da kabul edilmez.' },
    { soru: 'Video çekimi hangi ilçelerde yapılıyor?', cevap: "Mersin'in tüm ilçelerinde ve çevre illerde çekim yapılabilir. Çekim tarihi işletmenizin uygunluğuna göre planlanır." },
  ];
  return sayfa({
    baslik: "Reklam ve iş birliği: Mersin Anlık'ta işletmenizi tanıtın",
    aciklama: `Mersin Anlık'ta reklam verin: tanıtım içeriği, video tanıtım, sitede reklam alanı ve sosyal medya yönetimi. Mersin'in 13 ilçesindeki okurlara ulaşın. Reklam ve iş birlikleri ${REKLAM.yurutucu} tarafından yürütülür.`,
    yol: '/reklam/',
    jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: sss.map((s) => ({ '@type': 'Question', name: s.soru, acceptedAnswer: { '@type': 'Answer', text: s.cevap } })) },
    ust: `<div class="su-an-bas"><div><h1>Reklam ve iş birliği</h1><p style="margin-top:8px;max-width:640px">Mersinlilerin her gün açtığı haber ve şehir rehberinde işletmenizi tanıtın. Haber, nöbetçi eczane, kesinti ve hava durumuna bakmaya gelen okurlara ulaşın.</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
<section class="rk-sayilar">
<div><b>13</b><span>ilçede yerel haber</span></div>
<div><b>${istatistik.gunlukHaber || '50+'}</b><span>günlük haber ve güncelleme</span></div>
<div><b>${istatistik.sayfa ? istatistik.sayfa.toLocaleString('tr-TR') : '600+'}</b><span>sayfa (eczane, kesinti, hava, rehber…)</span></div>
<div><b>7/24</b><span>saatte iki kez otomatik güncellenir</span></div>
</section>
<div class="bolum-bas"><h2>Neler yapabiliriz?</h2></div>
<div class="rk-izgara">${HIZMETLER.map(kutu).join('')}</div>
<section class="rk-form">
<div><h2>Teklif alın</h2><p>Bilgilerinizi yazın, mesajınız WhatsApp'ta hazır olarak açılsın. En kısa sürede dönüş yapılır.</p>
<p class="rk-iletisim"><a href="tel:+${REKLAM.whatsapp}">📞 ${REKLAM.telefon}</a><a href="mailto:${REKLAM.eposta}?subject=${encodeURIComponent('Mersin Anlık reklam ve iş birliği')}">✉️ ${REKLAM.eposta}</a></p></div>
<form data-reklam-form data-wa="${REKLAM.whatsapp}">
<label>İşletme adı<input name="isletme" required autocomplete="organization" placeholder="Örn. Deniz Kafe"></label>
<label>Sektör ve ilçe<input name="sektor" placeholder="Örn. Kafe · Mezitli"></label>
<label>İlgilendiğiniz hizmet<select name="hizmet">${HIZMETLER.map((x) => `<option>${h(x.ad)}</option>`).join('')}<option>Henüz karar vermedim</option></select></label>
<label>Notunuz<textarea name="not" rows="3" placeholder="Kısaca ne istediğinizi yazın"></textarea></label>
<button class="rk-btn" type="submit">WhatsApp'tan gönder</button>
</form>
</section>
<section class="rk-ilke"><h2>Yayın ilkelerimiz</h2><ul>
<li>Ücretli her içerik açıkça <strong>"Tanıtım"</strong> ya da <strong>"Reklam"</strong> olarak işaretlenir; haberlerimiz reklamdan etkilenmez.</li>
<li>Mevzuat gereği <strong>hekim, klinik ve sağlık kuruluşlarının tanıtımı yapılmaz.</strong></li>
<li>Siyasi reklam, bahis, kumar ve yanıltıcı tanıtımlar kabul edilmez. Ayrıntılar: <a href="/yayin-ilkeleri/">yayın ilkeleri</a>.</li>
</ul></section>
<section class="bilgi-sss"><h2>Sık sorulanlar</h2>${sss.map((s) => `<details><summary>${h(s.soru)}</summary><p>${h(s.cevap)}</p></details>`).join('')}</section>
<p class="rk-yurutucu">Mersin Anlık reklam ve iş birlikleri <a href="${REKLAM.site}" rel="noopener" target="_blank"><strong>${REKLAM.yurutucu}</strong></a> tarafından yürütülür. Haber ihbarı ve düzeltme talepleri için: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
</div></main>`,
  });
}
