import { SITE, ILCELER, AYAR } from '../config.js';
import { htmlKacis as h, ayrilmaEki } from '../lib/text.js';
import { sayfa, saat, tarihUzun, ilceAdi } from './layout.js';
import { ikon } from './ikonlar.js';
import { haberListesi, mansetKarti, reklamAlani } from './parcalar.js';

// Resmî servis bağlantıları (veri entegrasyonu tamamlanana kadar doğrudan kaynağa yönlendirir)
export const RESMI = {
  eczane: 'https://www.mersineczaciodasi.org.tr/',
  meski: 'https://www.meski.gov.tr/',
  edas: 'https://www.toroslaredas.com.tr/',
  afad: 'https://deprem.afad.gov.tr/last-earthquakes',
  metno: 'https://www.yr.no/',
};

function sonDeprem(servis) {
  const d = servis?.deprem?.[0];
  return d || null;
}

function suAnKartlari(servis, ilceSlug = SITE.defaultIlce) {
  const hava = servis?.hava?.[ilceSlug];
  const dep = sonDeprem(servis);
  return `<div class="kartlar">
<a class="kart" href="/hava-durumu/#${ilceSlug}" data-hava-kart>
<div class="ust-bilgi"><span>Hava · <span data-ilce-ad>${h(ilceAdi(ilceSlug))}</span></span><span style="color:#FF8A1F">${ikon.gunes(28)}</span></div>
<span class="deger" data-hava-derece>${hava ? `${hava.sicaklik}°` : '–'}</span>
<span class="alt" data-hava-durum>${hava ? h(hava.durum) : 'Veri bekleniyor'}</span>
<span class="ek" data-hava-yarin>${hava?.gunler?.[1] ? `Yarın ${hava.gunler[1].max}° / ${hava.gunler[1].min}°` : ''}</span>
</a>
<a class="kart" href="/nobetci-eczane/">
<div class="ust-bilgi"><span>Nöbetçi eczane</span><span style="color:#7FB0FF">${ikon.eczane(28)}</span></div>
<span class="deger yazi">Bu gece açık olanlar</span>
<span class="ek">İlçene göre listeyi gör →</span>
</a>
<a class="kart uyari" href="/kesintiler/">
<div class="ust-bilgi"><span>Kesintiler</span><span style="color:#FF8A1F">${ikon.damla(28)}</span></div>
<span class="deger yazi">Su ve elektrik</span>
<span class="ek">Bugünkü planlı kesintiler →</span>
</a>
<a class="kart" href="/deprem/">
<div class="ust-bilgi"><span>Son deprem</span><span style="color:#7FB0FF">${ikon.deprem(28)}</span></div>
<span class="deger">${dep ? dep.buyukluk.toFixed(1).replace('.', ',') : '–'}</span>
<span class="alt">${dep ? h(dep.yer) : 'Son 7 günde kayıt yok'}</span>
<span class="ek">${dep ? `<span data-once="${dep.tarih}">${saat(dep.tarih)}</span> · AFAD` : 'AFAD'}</span>
</a>
</div>`;
}

// Son dakika: son 2 saatte, birden fazla kaynağın yazdığı ya da acil kategorideki en yeni haber
function sonDakikaSec(hikayeler, simdi) {
  return hikayeler.find(
    (x) =>
      (simdi - new Date(x.ilkGorulme).getTime()) / 36e5 <= AYAR.sonDakikaSaat &&
      (x.kaynaklar.length > 1 || ['hava', 'kaza', 'asayis'].includes(x.kategori))
  );
}

function sonDakikaBandi(hikaye) {
  if (!hikaye) return '';
  return `<div class="son-dakika"><span class="etiket">SON DAKİKA</span><a href="${h(hikaye.kaynaklar[0].link)}" rel="noopener nofollow" target="_blank">${h(hikaye.baslik)}</a><time datetime="${hikaye.ilkGorulme}">${saat(hikaye.ilkGorulme)}</time></div>`;
}

function mansetSec(hikayeler, simdi) {
  // Son 12 saatte en çok kaynağın yazdığı haber; eşitlikte en yenisi
  const aday = hikayeler.filter((x) => simdi - new Date(x.ilkGorulme).getTime() < 12 * 36e5);
  const liste = aday.length ? aday : hikayeler;
  return [...liste].sort((a, b) => b.kaynaklar.length - a.kaynaklar.length || new Date(b.ilkGorulme) - new Date(a.ilkGorulme))[0];
}

function yanKutular(servis) {
  return `<aside class="yan">
${reklamAlani('yan-ust')}
<section class="kutu">
<div class="kutu-bas"><h2>Bugünkü kesintiler</h2><a href="/kesintiler/">Tümü</a></div>
<a class="satir" href="${RESMI.meski}" rel="noopener" target="_blank"><span>${ikon.damla(20)} Su kesintileri</span><small>MESKİ →</small></a>
<a class="satir" href="${RESMI.edas}" rel="noopener" target="_blank"><span>${ikon.simsek(20)} Elektrik kesintileri</span><small>Toroslar EDAŞ →</small></a>
</section>
<section class="kutu">
<div class="kutu-bas"><h2>Son depremler</h2><a href="/deprem/">Tümü</a></div>
${(servis?.deprem || []).slice(0, 4).map((d) => `<div class="satir"><span><strong>${d.buyukluk.toFixed(1).replace('.', ',')}</strong> · ${h(d.yer)}</span><small>${saat(d.tarih)}</small></div>`).join('') || '<div class="satir"><small>Son 7 günde kayıt yok</small></div>'}
</section>
</aside>`;
}

function ilceDugmeleri() {
  return `<div class="ilceler">${ILCELER.map((i) => `<a href="/ilce/${i.slug}/">${h(i.ad)}</a>`).join('')}</div>`;
}

export function anaSayfa({ hikayeler, servis, simdi }) {
  const manset = mansetSec(hikayeler, simdi);
  const liste = hikayeler.filter((x) => x !== manset).slice(0, AYAR.anaSayfaHaberSayisi);
  const ust = `${sonDakikaBandi(sonDakikaSec(hikayeler, simdi))}
<div class="su-an-bas">
<div><p>${tarihUzun(new Date(simdi).toISOString())}</p><h1>Mersin'de şu an</h1></div>
<a class="ilce-sec" href="/ilceler/" data-ilce-sec>${ikon.konum(20)}<span>Benim ilçem: <span data-ilce-ad>Seç</span></span><span class="daire">${ikon.asagi(18)}</span></a>
</div>
${suAnKartlari(servis)}`;
  const icerik = `<main class="kap govde">
<div class="ana">
<div class="bolum-bas"><h2>Manşet</h2><span>Son güncelleme: ${saat(new Date(simdi).toISOString())}</span></div>
${manset ? mansetKarti(manset) : '<div class="bos">Haberler toplanıyor…</div>'}
<div class="bolum-bas" style="margin-top:14px"><h2>Son haberler</h2></div>
${haberListesi(liste)}
</div>
${yanKutular(servis)}
<section style="flex:1 1 100%;display:flex;flex-direction:column;gap:16px;margin-top:12px">
<div class="bolum-bas"><h2>İlçeler</h2></div>
${ilceDugmeleri()}
</section>
</main>`;
  return sayfa({
    yol: '/',
    ust,
    icerik,
    hava: servis?.hava || null,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url, inLanguage: 'tr' },
  });
}

export function ilceSayfasi({ ilce, hikayeler, servis, simdi }) {
  const liste = hikayeler.filter((x) => x.ilceler.includes(ilce.slug)).slice(0, AYAR.ilceHaberSayisi);
  const hava = servis?.hava?.[ilce.slug];
  const ust = `<div class="su-an-bas">
<div><p>${tarihUzun(new Date(simdi).toISOString())}</p><h1>${h(ilce.ad)} haberleri</h1></div>
<button class="ilce-sec" type="button" data-ilcem-yap="${ilce.slug}" style="border:none;font:inherit;cursor:pointer">${ikon.konum(20)}<span>Benim ilçem yap</span><span class="daire">${ikon.ok(18)}</span></button>
</div>
${hava ? `<div class="kartlar" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${hava.gunler
    .slice(0, 4)
    .map((g, i) => `<div class="kart"><div class="ust-bilgi"><span>${i === 0 ? 'Bugün' : new Date(g.tarih).toLocaleDateString('tr-TR', { weekday: 'long' })}</span></div><span class="deger">${g.max}°</span><span class="alt">${h(g.durum)} · en düşük ${g.min}°</span></div>`)
    .join('')}</div>` : ''}`;
  const icerik = `<main class="kap govde">
<div class="ana">
<div class="bolum-bas"><h2>${h(ilce.ad)}'${ayrilmaEki(ilce.ad)} son haberler</h2><span>${liste.length} haber</span></div>
${haberListesi(liste, `Son ${AYAR.saklamaGun} günde ${ilce.ad} ile ilgili haber bulunamadı.`)}
</div>
${yanKutular(servis)}
</main>`;
  return sayfa({
    baslik: `${ilce.ad} haberleri – son dakika ${ilce.ad} Mersin`,
    aciklama: `${ilce.ad} (Mersin) son dakika haberleri, hava durumu, nöbetçi eczaneler ve kesintiler.`,
    yol: `/ilce/${ilce.slug}/`,
    aktif: '/ilceler/',
    ust,
    icerik,
  });
}

export function ilcelerSayfasi() {
  return sayfa({
    baslik: 'Mersin ilçeleri',
    aciklama: "Mersin'in 13 ilçesinden son haberler.",
    yol: '/ilceler/',
    ust: `<div class="su-an-bas"><div><h1>İlçeni seç</h1><p style="margin-top:8px">Seçtiğin ilçe ana sayfada öne çıkar.</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">${ilceDugmeleri()}</div></main>`,
  });
}

export function havaSayfasi({ servis }) {
  const satirlar = ILCELER.map((i) => {
    const hv = servis?.hava?.[i.slug];
    return `<tr id="${i.slug}"><th scope="row"><a href="/ilce/${i.slug}/">${h(i.ad)}</a></th><td><strong>${hv ? hv.sicaklik + '°' : '–'}</strong> ${hv ? h(hv.durum) : ''}</td>${(hv?.gunler || [])
      .slice(1, 4)
      .map((g) => `<td>${g.max}° / ${g.min}°<br><small>${h(g.durum)}</small></td>`)
      .join('')}</tr>`;
  }).join('');
  const gunAdlari = (servis?.hava?.yenisehir?.gunler || []).slice(1, 4).map((g) => new Date(g.tarih).toLocaleDateString('tr-TR', { weekday: 'long' }));
  return sayfa({
    baslik: 'Mersin hava durumu – 13 ilçe',
    aciklama: "Mersin'in 13 ilçesi için güncel hava durumu ve 3 günlük tahmin.",
    yol: '/hava-durumu/',
    ust: `<div class="su-an-bas"><div><h1>Hava durumu</h1></div></div>`,
    icerik: `<main class="kap govde"><div class="ana"><div class="tablo-kap"><table class="tablo"><thead><tr><th>İlçe</th><th>Şu an</th>${gunAdlari.map((g) => `<th>${g}</th>`).join('')}</tr></thead><tbody>${satirlar}</tbody></table></div>
<p style="color:var(--ikincil);font-size:15px">Veri: <a href="${RESMI.metno}" rel="noopener" target="_blank">MET Norway (yr.no)</a>, CC BY 4.0. Son güncelleme: ${servis?.guncelleme ? saat(servis.guncelleme) : '–'}</p></div></main>`,
  });
}

export function depremSayfasi({ servis }) {
  const liste = servis?.deprem || [];
  return sayfa({
    baslik: 'Mersin ve çevresinde son depremler',
    aciklama: 'Mersin ve çevresinde son 7 günde olan depremler (AFAD verisi).',
    yol: '/deprem/',
    ust: `<div class="su-an-bas"><div><h1>Son depremler</h1><p style="margin-top:8px">Mersin ve çevresi · son 7 gün</p></div></div>`,
    icerik: `<main class="kap govde"><div class="ana">${
      liste.length
        ? `<div class="tablo-kap"><table class="tablo"><thead><tr><th>Büyüklük</th><th>Yer</th><th>Derinlik</th><th>Zaman</th></tr></thead><tbody>${liste
            .map((d) => `<tr><td><strong>${d.buyukluk.toFixed(1).replace('.', ',')}</strong></td><td>${h(d.yer)}</td><td>${d.derinlik.toFixed(1)} km</td><td>${new Date(d.tarih).toLocaleString('tr-TR', { timeZone: SITE.timezone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td></tr>`)
            .join('')}</tbody></table></div>`
        : '<div class="bos">Son 7 günde bölgede kayıtlı deprem yok.</div>'
    }<p style="color:var(--ikincil);font-size:15px">Veri: <a href="${RESMI.afad}" rel="noopener" target="_blank">AFAD</a>.</p></div></main>`,
  });
}

function bilgiSayfasi({ yol, baslik, aciklama, govde }) {
  return sayfa({
    baslik,
    aciklama,
    yol,
    ust: `<div class="su-an-bas"><div><h1>${h(baslik)}</h1></div></div>`,
    icerik: `<main class="kap govde"><div class="ana"><div class="metin-sayfa">${govde}</div></div></main>`,
  });
}

export function eczaneSayfasi() {
  return bilgiSayfasi({
    yol: '/nobetci-eczane/',
    baslik: 'Mersin nöbetçi eczaneler',
    aciklama: "Mersin'in 13 ilçesinde bugün nöbetçi olan eczaneler.",
    govde: `<p>Nöbetçi eczane listesi her gün Mersin Eczacı Odası tarafından yayımlanır. İlçe ilçe liste bu sayfaya çok yakında eklenecek.</p>
<p><a class="hap" href="${RESMI.eczane}" rel="noopener" target="_blank">Bugünün listesini Eczacı Odası'nda gör<span class="daire">${ikon.ok(18)}</span></a></p>`,
  });
}

export function kesintiSayfasi() {
  return bilgiSayfasi({
    yol: '/kesintiler/',
    baslik: 'Mersin su ve elektrik kesintileri',
    aciklama: "Mersin'de bugünkü planlı su ve elektrik kesintileri.",
    govde: `<p>Planlı kesintiler ilçe ve mahalle bazında bu sayfada listelenecek. O zamana kadar resmî duyurulara buradan ulaşabilirsiniz:</p>
<p><a class="hap" href="${RESMI.meski}" rel="noopener" target="_blank">Su kesintileri · MESKİ<span class="daire">${ikon.ok(18)}</span></a></p>
<p><a class="hap" href="${RESMI.edas}" rel="noopener" target="_blank">Elektrik kesintileri · Toroslar EDAŞ<span class="daire">${ikon.ok(18)}</span></a></p>`,
  });
}

export function menuSayfasi() {
  const linkler = [
    ['/', 'Ana sayfa'], ['/ilceler/', 'İlçeler'], ['/nobetci-eczane/', 'Nöbetçi eczane'], ['/kesintiler/', 'Kesintiler'],
    ['/hava-durumu/', 'Hava durumu'], ['/deprem/', 'Son depremler'], ['/ara/', 'Haber ara'], ['/kunye/', 'Künye'],
    ['/iletisim/', 'İletişim'], ['/kaynaklarimiz/', 'Kaynaklarımız'], ['/gizlilik/', 'Gizlilik'],
  ];
  return sayfa({
    baslik: 'Menü',
    yol: '/menu/',
    noindex: true,
    ust: `<div class="su-an-bas"><div><h1>Menü</h1></div></div>`,
    icerik: `<main class="kap govde"><div class="ana"><div class="ilceler">${linkler.map(([u, a]) => `<a href="${u}">${a}</a>`).join('')}</div></div></main>`,
  });
}

export function araSayfasi() {
  return sayfa({
    baslik: 'Haber ara',
    yol: '/ara/',
    noindex: true,
    ust: `<div class="su-an-bas" style="flex-direction:column;align-items:stretch"><h1>Haber ara</h1>
<label class="gizli" for="ara-kutu">Aranacak kelime</label>
<input id="ara-kutu" type="search" placeholder="Ör. su kesintisi, Tarsus, eczane" autocomplete="off" style="font:inherit;font-size:20px;padding:16px 22px;border-radius:999px;border:none;margin-top:8px">
</div>`,
    icerik: `<main class="kap govde"><div class="ana" id="ara-sonuc"><div class="bos">Aramak istediğiniz kelimeyi yazın.</div></div></main>`,
  });
}

export function bilgiSayfalari() {
  return [
    ({
      yol: '/kunye/',
      baslik: 'Künye',
      aciklama: `${SITE.name} künye bilgileri.`,
      govde: `<p><strong>Yayın adı:</strong> ${SITE.name}</p>
<p><strong>İmtiyaz sahibi ve sorumlu müdür:</strong> [AD SOYAD]</p>
<p><strong>Adres:</strong> [İŞ YERİ ADRESİ]</p>
<p><strong>E-posta:</strong> <a href="mailto:${SITE.email}">${SITE.email}</a></p>
<p><strong>Yer sağlayıcı:</strong> Cloudflare, Inc.</p>`,
    }),
    ({
      yol: '/iletisim/',
      baslik: 'İletişim',
      aciklama: `${SITE.name} ile iletişime geçin.`,
      govde: `<p>Haber ihbarı, düzeltme talebi ve reklam için: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
<p>Bir haberde hata ya da düzeltme talebiniz varsa haberin bağlantısıyla birlikte yazın; en kısa sürede inceleriz.</p>`,
    }),
    ({
      yol: '/kaynaklarimiz/',
      baslik: 'Kaynaklarımız ve çalışma şeklimiz',
      aciklama: `${SITE.name} haberleri nasıl derler?`,
      govde: `<p>${SITE.name}, Mersin ve ilçeleriyle ilgili haberleri farklı haber sitelerinden ve resmî kurumlardan derler.</p>
<ul><li>Her haberin yanında kaynağı ve kaynağa giden bağlantı bulunur. Haberin tamamı her zaman kaynağında okunur.</li>
<li>Başka sitelerin haber metinlerini ve fotoğraflarını kopyalamayız.</li>
<li>Kısa özetleri yalnızca resmî kurum duyurularında ve buna izin veren kaynaklarda kendi cümlelerimizle yazarız.</li>
<li>Aynı olayı birden fazla kaynak yazdıysa tek kartta birleştirir, tüm kaynakları gösteririz.</li></ul>
<p>Haberinizin burada yer almasını istemiyorsanız <a href="mailto:${SITE.email}">${SITE.email}</a> adresine yazmanız yeterli.</p>`,
    }),
    ({
      yol: '/yayin-ilkeleri/',
      baslik: 'Yayın ilkeleri',
      aciklama: `${SITE.name} yayın ilkeleri.`,
      govde: `<ul><li>Haberleri kaynağını göstererek ve tarafsız biçimde sunarız.</li>
<li>Suç, ölüm, çocuk ve kişisel bilgiler içeren haberler yayınlanmadan önce editör kontrolünden geçer.</li>
<li>Kişilik haklarına saygı gösterir, masumiyet karinesini gözetiriz.</li>
<li>Düzeltme ve cevap taleplerini en kısa sürede değerlendiririz.</li></ul>`,
    }),
    ({
      yol: '/gizlilik/',
      baslik: 'Gizlilik politikası',
      aciklama: `${SITE.name} gizlilik politikası.`,
      govde: `<p>Sitemizde üyelik yoktur ve sizden kişisel bilgi istemeyiz. Seçtiğiniz ilçe yalnızca kendi tarayıcınızda saklanır.</p>
<p>Reklam gösterimi için Google AdSense kullanılabilir. Google ve iş ortakları, reklamları kişiselleştirmek için çerez kullanabilir. Ayrıntılar için <a href="https://policies.google.com/technologies/ads?hl=tr" rel="noopener" target="_blank">Google reklam politikalarına</a> bakabilirsiniz.</p>
<p>Sorularınız için: <a href="mailto:${SITE.email}">${SITE.email}</a></p>`,
    }),
    ({
      yol: '/cerez-politikasi/',
      baslik: 'Çerez politikası',
      aciklama: `${SITE.name} çerez politikası.`,
      govde: `<p>Sitemiz, seçtiğiniz ilçeyi hatırlamak için tarayıcınızın yerel depolamasını kullanır. Reklam ortaklarımız (Google AdSense) kendi çerezlerini kullanabilir. Tarayıcı ayarlarınızdan çerezleri dilediğiniz zaman silebilirsiniz.</p>`,
    }),
  ].map((o) => ({ yol: o.yol, html: bilgiSayfasi(o) }));
}

export function bulunamadiSayfasi() {
  return sayfa({
    baslik: 'Sayfa bulunamadı',
    yol: '/404.html',
    noindex: true,
    ust: `<div class="su-an-bas"><div><h1>Aradığınız sayfa bulunamadı</h1></div></div>`,
    icerik: `<main class="kap govde"><div class="ana"><p><a class="hap" href="/">Ana sayfaya dön<span class="daire">${ikon.ok(18)}</span></a></p></div></main>`,
  });
}
