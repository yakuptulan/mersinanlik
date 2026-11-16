// Kalıcı rehber sayfaları: gezilecek yerler, acil telefonlar, hastaneler.
// Bilgiler genel ve doğrulanmış olanlarla sınırlı tutuldu; adres/telefon yerine harita araması verilir.
import { htmlKacis as h } from '../lib/text.js';
import { sayfa } from './layout.js';
import { yanKutular } from './sayfalar.js';
import { FOTOLAR } from '../fotolar.js';
import { fotoKunye } from './parcalar.js';
import { ikon } from './ikonlar.js';

const harita = (ad) => `https://www.google.com/maps/search/${encodeURIComponent(`${ad}, Mersin`)}`;
const foto = (id) => FOTOLAR.find((f) => f.id === id);

export const GEZILECEK = [
  { ilce: 'Erdemli', foto: 'erdemli-1', yerler: [
    ['Kızkalesi', 'Denizin içindeki Bizans kalesi ve karşısındaki Korykos Kalesi; Mersin\'in simgelerinden. Sahili yazın çok kalabalık olur.'],
    ['Kanlıdivane', 'Derin bir obruğun çevresine kurulmuş antik Kanytelis kenti; kilise ve mezar yapılarıyla ilgi çekici.'],
    ['Adamkayalar', 'Kayalara oyulmuş Roma dönemi insan kabartmaları; vadiye inen yürüyüş yolu dikkat ister.'],
    ['Elaiussa Sebaste (Ayaş)', 'Sahil kenarındaki antik kent; tiyatro ve mozaik kalıntıları var.'],
  ] },
  { ilce: 'Silifke', foto: 'silifke-1', yerler: [
    ['Cennet ve Cehennem Obrukları', 'Doğal çöküntü obrukları; Cennet obruğunun dibinde Bizans kilisesi bulunur. Merdivenle inilir.'],
    ['Narlıkuyu ve Astım Mağarası', 'Balık restoranlarıyla bilinen koy ve damlataşlarıyla ünlü mağara.'],
    ['Uzuncaburç (Olba / Diokaisareia)', 'Zeus tapınağı ve kulesiyle dağlık bölgedeki antik kent.'],
    ['Silifke Kalesi ve Taşköprü', 'Şehre hâkim tepedeki Orta Çağ kalesi ve Göksu üzerindeki tarihî köprü.'],
    ['Göksu Deltası', 'Kuş gözlemi için Türkiye\'nin önemli sulak alanlarından biri.'],
  ] },
  { ilce: 'Tarsus', foto: 'tarsus-1', yerler: [
    ['Kleopatra Kapısı', 'Şehir merkezindeki antik kapı; Tarsus\'un en bilinen simgesi.'],
    ['Tarsus Şelalesi', 'Berdan Çayı üzerindeki şelale; çevresinde çay bahçeleri ve restoranlar var.'],
    ['St. Paul Kuyusu ve Kilisesi', 'Hristiyanlık tarihi açısından önemli ziyaret noktaları.'],
    ['Antik Roma Yolu ve tarihî evler', 'Kazılarla ortaya çıkan Roma dönemi caddesi ve çevresindeki eski Tarsus evleri.'],
    ['Eshab-ı Kehf Mağarası', 'Yedi Uyurlar inancıyla bilinen ziyaret yeri.'],
    ['Gülek Kalesi', 'Toros Dağları\'ndaki Gülek Boğazı\'na hâkim kale; manzarası için de gidilir.'],
  ] },
  { ilce: 'Mersin merkez', foto: 'yenisehir-3', yerler: [
    ['Sahil yolu ve Marina', 'Yenişehir ve Mezitli boyunca uzanan yürüyüş ve bisiklet yolu; gün batımında çok güzel.'],
    ['Soli Pompeiopolis', 'Mezitli\'de sütunlu caddesiyle bilinen antik liman kenti.'],
    ['Yumuktepe Höyüğü', 'Toroslar\'da, binlerce yıllık yerleşim katmanlarına sahip önemli höyük.'],
    ['Arslanköy ve Toros yaylaları', 'Şehrin hemen kuzeyinde serin yaylalar ve köy kahvaltısı.'],
  ] },
  { ilce: 'Anamur ve Bozyazı', foto: 'anamur-1', yerler: [
    ['Mamure Kalesi', 'Deniz kenarındaki iyi korunmuş Orta Çağ kalesi.'],
    ['Anemurium Antik Kenti', 'Türkiye\'nin en güney ucundaki antik kent; mozaikler ve hamamlar.'],
    ['Softa Kalesi', 'Bozyazı\'da tepeye kurulmuş kale; sahil manzarası geniştir.'],
    ['Anamur sahilleri', 'Uzun kumsallar ve muz bahçeleri; deniz kaplumbağalarının yuvalama alanı (kurallara uyun).'],
  ] },
  { ilce: 'Mut, Gülnar, Aydıncık, Çamlıyayla', foto: 'camliyayla-1', yerler: [
    ['Alahan Manastırı', 'Mut\'ta, Göksu vadisine bakan erken Bizans dönemi manastır kompleksi.'],
    ['Gilindire Mağarası', 'Aydıncık\'ta deniz kıyısında, damlataşlarıyla ünlü mağara.'],
    ['Meydancık Kalesi', 'Gülnar\'da tarihi Kilikya dönemine uzanan kale.'],
    ['Çamlıyayla ve Namrun Kalesi', 'Serin yayla havası, çam ormanları ve Orta Çağ kalesi.'],
  ] },
];

export const ACIL = [
  ['112', 'Acil Çağrı', 'Ambulans, itfaiye, polis, jandarma, sahil güvenlik ve orman yangını için tek numara.', 'kirmizi'],
  ['185', 'Teksin – Büyükşehir ve MESKİ', 'Su arızası, su kesintisi ve Büyükşehir Belediyesi ile ilgili talepler (7/24).', 'mavi'],
  ['186', 'Elektrik arıza (Toroslar EDAŞ)', 'Elektrik kesintisi ve arıza bildirimi.', 'turuncu'],
  ['187', 'Doğalgaz acil', 'Gaz kokusu ve doğalgaz kaçağı ihbarı.', 'turuncu'],
  ['182', 'MHRS hastane randevusu', 'Devlet hastanelerinden ve aile hekiminden randevu.', 'yesil'],
  ['183', 'Aile ve sosyal destek', 'Kadın, çocuk, yaşlı ve engelliler için sosyal destek hattı.', 'mor'],
];

export const HASTANELER = [
  ['Mersin Şehir Eğitim ve Araştırma Hastanesi', 'Toroslar', 'Kentin en büyük kamu hastanesi; acil servis 7/24.'],
  ['Mersin Üniversitesi Hastanesi', 'Yenişehir', 'Üniversite hastanesi; ileri tetkik ve tedaviler.'],
  ['Tarsus Devlet Hastanesi', 'Tarsus', 'Tarsus ve çevresinin ana devlet hastanesi.'],
  ['Erdemli Devlet Hastanesi', 'Erdemli', ''],
  ['Silifke Devlet Hastanesi', 'Silifke', ''],
  ['Anamur Devlet Hastanesi', 'Anamur', ''],
  ['Mut Devlet Hastanesi', 'Mut', ''],
];
const ILCE_ADLARI = ['Akdeniz', 'Anamur', 'Aydıncık', 'Bozyazı', 'Çamlıyayla', 'Erdemli', 'Gülnar', 'Mezitli', 'Mut', 'Silifke', 'Tarsus', 'Toroslar', 'Yenişehir'];

const ust = (baslik, alt) => `<div class="su-an-bas"><div><h1>${h(baslik)}</h1>${alt ? `<p style="margin-top:8px">${h(alt)}</p>` : ''}</div></div>`;

export function gezilecekSayfasi({ servis }) {
  const bolumler = GEZILECEK.map((b) => {
    const f = foto(b.foto);
    return `<section class="rehber-bolum">
${f ? `<figure class="rehber-foto"><img src="/foto/${f.id}-800.webp" alt="${h(b.ilce)}" loading="lazy" width="800" height="500"><figcaption>${h(fotoKunye(f))}</figcaption></figure>` : ''}
<h2>${h(b.ilce)}</h2>
<ul class="rehber-liste">${b.yerler.map(([ad, ac]) => `<li><b>${h(ad)}</b><span>${h(ac)}</span><a href="${harita(ad)}" rel="noopener" target="_blank">Haritada gör →</a></li>`).join('')}</ul>
</section>`;
  }).join('');
  return sayfa({
    baslik: "Mersin'de gezilecek yerler – ilçe ilçe rehber",
    aciklama: "Kızkalesi, Cennet-Cehennem obrukları, Tarsus Şelalesi, Mamure Kalesi ve daha fazlası: Mersin'de gezilecek yerler ilçe ilçe.",
    yol: '/rehber/gezilecek-yerler/',
    aktif: '/rehber/',
    ust: ust("Mersin'de gezilecek yerler", 'Tarih, deniz ve yayla: ilçe ilçe öneriler'),
    icerik: `<main class="kap govde"><div class="ana">${bolumler}
<p style="color:var(--ikincil);font-size:15px">Ziyaret saatleri ve ücretler değişebilir; gitmeden önce müze ve ören yerlerinin güncel bilgisini kontrol edin.</p></div>${yanKutular(servis)}</main>`,
  });
}

export function acilSayfasi({ servis }) {
  return sayfa({
    baslik: 'Mersin acil ve önemli telefon numaraları',
    aciklama: 'Mersin için acil çağrı 112, su arızası 185, elektrik arızası 186, doğalgaz acil 187 ve diğer önemli numaralar.',
    yol: '/rehber/acil-telefonlar/',
    aktif: '/rehber/',
    ust: ust('Acil ve önemli numaralar', 'Numaraya dokununca arama başlar'),
    icerik: `<main class="kap govde"><div class="ana">
<div class="acil-izgara">${ACIL.map(([no, ad, ac, renk]) => `<a class="acil ${renk}" href="tel:${no}"><span class="acil-no">${no}</span><span class="acil-ic"><b>${h(ad)}</b><small>${h(ac)}</small></span></a>`).join('')}</div>
<p style="color:var(--ikincil);font-size:15px">Türkiye'de 155, 156 ve 110 gibi eski acil numaralar da 112'ye yönlendirilir. Nöbetçi eczaneler için <a href="/nobetci-eczane/">nöbetçi eczane sayfasına</a> bakın.</p>
</div>${yanKutular(servis)}</main>`,
  });
}

export function hastaneSayfasi({ servis }) {
  return sayfa({
    baslik: 'Mersin hastaneleri – devlet ve şehir hastaneleri',
    aciklama: "Mersin Şehir Hastanesi, Mersin Üniversitesi Hastanesi ve ilçe devlet hastaneleri; haritada konum ve randevu bilgisi.",
    yol: '/rehber/hastaneler/',
    aktif: '/rehber/',
    ust: ust('Hastaneler', 'Acil durumda 112 · Randevu için 182 (MHRS)'),
    icerik: `<main class="kap govde"><div class="ana">
<div class="yan-liste">${HASTANELER.map(([ad, ilce, ac]) => `<a class="yan-satir" href="${harita(ad)}" rel="noopener" target="_blank"><span class="yan-rozet saglik">${ikon.eczane(18)}</span><span class="yan-metin"><b>${h(ad)}</b><small>${h(ilce)}${ac ? ` · ${h(ac)}` : ''}</small></span><span class="yan-sag"><small>harita</small><b>→</b></span></a>`).join('')}</div>
<div class="bolum-bas" style="margin-top:18px"><h2>İlçene yakın hastaneler</h2></div>
<div class="ilceler">${ILCE_ADLARI.map((i) => `<a href="${harita(`${i} hastane`)}" rel="noopener" target="_blank">${h(i)}</a>`).join('')}</div>
<p style="color:var(--ikincil);font-size:15px">Haritada gör bağlantıları Google Haritalar'da arama açar. Hastane randevusu için MHRS (182 veya mhrs.gov.tr) kullanılır.</p>
</div>${yanKutular(servis)}</main>`,
  });
}

export function rehberSayfasi({ servis }) {
  const kart = (url, baslik, ac, ik) => `<a class="rehber-kart" href="${url}"><span class="yan-rozet">${ik}</span><b>${h(baslik)}</b><small>${h(ac)}</small></a>`;
  return sayfa({
    baslik: 'Mersin rehberi',
    aciklama: "Mersin'de gezilecek yerler, acil telefonlar, hastaneler, nöbetçi eczaneler, namaz vakitleri ve daha fazlası.",
    yol: '/rehber/',
    ust: ust('Mersin rehberi', 'Şehirde işine yarayacak her şey'),
    icerik: `<main class="kap govde"><div class="ana"><div class="rehber-izgara">
${kart('/rehber/gezilecek-yerler/', 'Gezilecek yerler', 'İlçe ilçe tarih, deniz ve yayla', ikon.konum(22))}
${kart('/rehber/acil-telefonlar/', 'Acil telefonlar', '112, su, elektrik, doğalgaz', ikon.simsek(22))}
${kart('/rehber/hastaneler/', 'Hastaneler', 'Şehir hastanesi ve ilçe hastaneleri', ikon.eczane(22))}
${kart('/nobetci-eczane/', 'Nöbetçi eczaneler', 'Bugün açık eczaneler', ikon.eczane(22))}
${kart('/namaz-vakitleri/', 'Namaz vakitleri', '13 ilçe için Diyanet vakitleri', ikon.hilal(22))}
${kart('/akaryakit-fiyatlari/', 'Akaryakıt fiyatları', 'İlçe ilçe benzin ve motorin', ikon.yakit(22))}
${kart('/etkinlikler/', 'Etkinlikler', "Bu hafta Mersin'de ne var?", ikon.gunes(22))}
${kart('/kesintiler/', 'Kesintiler', 'Su ve elektrik kesintileri', ikon.damla(22))}
</div></div>${yanKutular(servis)}</main>`,
  });
}
