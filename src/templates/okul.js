// "Mersin'de yarın okullar tatil mi?" sayfası
import { SITE, ILCELER } from '../config.js';
import { htmlKacis as h } from '../lib/text.js';
import { sayfa, saat } from './layout.js';
import { yanKutular } from './sayfalar.js';
import { gunKararlari } from '../lib/uyarilar.js';

const gunStr = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: SITE.timezone });
const gunAdi = (g) => new Date(`${g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: SITE.timezone });
const ilceAd = (s) => ILCELER.find((i) => i.slug === s)?.ad || s;

function cevap(kararlar, gun, ad) {
  const k = gunKararlari(kararlar, gun);
  if (!k.length) return null;
  const tum = k.some((x) => x.kapsam === 'tum');
  const ilceler = [...new Set(k.flatMap((x) => x.ilceler))];
  const ilk = k[0];
  return `<div class="okul-cevap evet">
<span class="okul-etiket">${ad} · ${h(gunAdi(gun))}</span>
<strong>Evet, ${tum ? "Mersin'de okullar tatil" : `${ilceler.map(ilceAd).join(', ')} ilçelerinde okullar tatil`}.</strong>
${ilk.not ? `<p>${h(ilk.not)}</p>` : ''}
<p class="okul-kaynak">${ilk.kurum ? `${h(ilk.kurum)} kararı · ` : ''}<a href="${h(ilk.link)}">${h(ilk.baslik)}</a></p>
</div>`;
}

export function okulSayfasi({ okul, servis, simdi }) {
  const kararlar = okul?.kararlar || [];
  const bugun = gunStr(simdi);
  const yarin = gunStr(simdi + 864e5);
  const yarinCevap = cevap(kararlar, yarin, 'Yarın');
  const bugunCevap = cevap(kararlar, bugun, 'Bugün');
  const yh = servis?.hava?.yenisehir?.gunler?.[1];
  const hayir = `<div class="okul-cevap hayir">
<span class="okul-etiket">Yarın · ${h(gunAdi(yarin))}</span>
<strong>Şu an için açıklanmış bir tatil kararı yok.</strong>
<p>Olumsuz hava ya da olağanüstü durumlarda tatil kararını Mersin Valiliği genellikle akşam saatlerinde duyurur. Bu sayfa yarım saatte bir kendiliğinden güncellenir; karar açıklanırsa burada ve sitenin en üstünde görünür.</p>
</div>`;
  const gecmis = kararlar
    .filter((k) => k.gunler.some((g) => g < bugun))
    .slice(0, 10)
    .map((k) => `<li><a href="${h(k.link)}">${h(k.baslik)}</a><small>${k.gunler.map((g) => new Date(`${g}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })).join(', ')}</small></li>`)
    .join('');
  const yarinMetni = yarinCevap ? 'Evet, tatil kararı açıklandı.' : 'Şu an için açıklanmış bir tatil kararı yok.';
  return sayfa({
    baslik: `Mersin'de yarın okullar tatil mi? (${new Date(`${yarin}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: SITE.timezone })})`,
    aciklama: `${gunAdi(yarin)} Mersin'de okullar tatil mi? ${yarinMetni} Valilik kararları ve ilçe ilçe tatil durumu.`,
    yol: '/okullar-tatil-mi/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: "Mersin'de yarın okullar tatil mi?", acceptedAnswer: { '@type': 'Answer', text: `${gunAdi(yarin)}: ${yarinMetni}` } }],
    },
    ust: `<div class="su-an-bas"><div><h1>Mersin'de yarın okullar tatil mi?</h1><p style="margin-top:8px">Son kontrol: ${saat(new Date(simdi).toISOString())} · yarım saatte bir güncellenir</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">
${yarinCevap || hayir}
${bugunCevap || ''}
${yh ? `<p class="giris-metni">Yarın Mersin'de hava: en yüksek ${yh.max}°, en düşük ${yh.min}°, ${h(yh.durum.toLocaleLowerCase('tr-TR'))}. <a href="/hava-durumu/">Hava durumu →</a></p>` : ''}
<p class="giris-metni">Ara tatil, yarıyıl ve yaz tatili tarihleri için <a href="/tatil-takvimi/">tatil takvimine</a> bakabilirsiniz.</p>
${gecmis ? `<div class="bolum-bas" style="margin-top:30px"><h2>Geçmiş tatil kararları</h2></div><ul class="arsiv-liste">${gecmis}</ul>` : ''}
</div>${yanKutular(servis)}</main>`,
  });
}
