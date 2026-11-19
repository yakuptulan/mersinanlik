// Benim Gündemim: tercihler bu cihazda (localStorage) tutulur, haberler /akis.json'dan gelir.
(function () {
  'use strict';
  var kok = document.querySelector('[data-gundemim]');
  if (!kok) return;
  var VERI = JSON.parse(document.getElementById('gm-veri').textContent);
  var ANAHTAR = 'mersinanlik-gundemim';
  var OKUNAN = 'mersinanlik-okunan';
  var KUTULAR = [
    { slug: 'hava', ad: 'Hava durumu' },
    { slug: 'eczane', ad: 'Nöbetçi eczane' },
    { slug: 'mac', ad: 'Bugünün maçları' },
    { slug: 'yakit', ad: 'Akaryakıt' },
  ];
  var ADETLER = [{ slug: '10', ad: '10 haber' }, { slug: '15', ad: '15 haber' }, { slug: '20', ad: '20 haber' }];

  function oku(k, varsayilan) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : varsayilan; } catch (e) { return varsayilan; }
  }
  function yaz(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var tercih = oku(ANAHTAR, null);
  var okunan = oku(OKUNAN, []);
  var secim = tercih ? JSON.parse(JSON.stringify(tercih)) : { ilce: [], kategori: [], kutu: ['hava', 'eczane'], adet: ['15'] };

  // ---------- Kurulum ----------
  var kurulum = kok.querySelector('[data-gm-kurulum]');
  var akisBolumu = kok.querySelector('[data-gm-akis]');
  var SECENEK = { ilce: VERI.ilceler, kategori: VERI.kategoriler, kutu: KUTULAR, adet: ADETLER };
  function cipleriCiz() {
    Object.keys(SECENEK).forEach(function (tur) {
      var kap = kurulum.querySelector('[data-gm-secim="' + tur + '"]');
      kap.innerHTML = SECENEK[tur].map(function (s) {
        var secili = secim[tur].indexOf(s.slug) > -1;
        return '<button type="button" class="gm-cip' + (secili ? ' secili' : '') + '" data-tur="' + tur + '" data-slug="' + esc(s.slug) + '"' + (s.renk ? ' style="--r:' + s.renk + '"' : '') + ' aria-pressed="' + secili + '">' + esc(s.ad) + '</button>';
      }).join('');
    });
  }
  kurulum.addEventListener('click', function (e) {
    var c = e.target.closest('.gm-cip');
    if (!c) return;
    var tur = c.dataset.tur, slug = c.dataset.slug;
    if (tur === 'adet') secim.adet = [slug];
    else {
      var i = secim[tur].indexOf(slug);
      if (i > -1) secim[tur].splice(i, 1); else secim[tur].push(slug);
    }
    cipleriCiz();
  });
  kurulum.querySelector('[data-gm-kaydet]').addEventListener('click', function () {
    tercih = JSON.parse(JSON.stringify(secim));
    yaz(ANAHTAR, tercih);
    goster();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  kok.querySelector('[data-gm-duzenle]').addEventListener('click', function () {
    akisBolumu.hidden = true;
    kurulum.hidden = false;
    cipleriCiz();
  });

  // ---------- Sıralama ----------
  function puanla(x, simdi) {
    var p = 0;
    var ilceSecili = tercih.ilce.length > 0;
    var katSecili = tercih.kategori.length > 0;
    if (x.k === 'turkiye-dunya' && tercih.kategori.indexOf('turkiye-dunya') < 0) return -1;
    if (ilceSecili) {
      if (x.il.some(function (i) { return tercih.ilce.indexOf(i) > -1; })) p += 6;
      else if (!x.il.length) p += 2; // Mersin geneli
      else p -= 3;
    }
    if (katSecili) p += tercih.kategori.indexOf(x.k) > -1 ? 4 : 0;
    p += Math.min(x.s, 5) * 0.5;
    var saat = (simdi - new Date(x.z).getTime()) / 36e5;
    p += Math.max(0, 24 - saat) / 8;
    if (okunan.indexOf(x.i) > -1) p -= 6;
    return p;
  }
  var haberler = [];
  function sec() {
    var simdi = Date.now();
    var adet = Number(tercih.adet[0] || 15);
    var puanli = haberler.map(function (x) { return { x: x, p: puanla(x, simdi) }; }).filter(function (o) { return o.p >= 0; });
    // Aynı kategoriden üst üste yığılmasın: her seçilen haber, kendi kategorisindeki diğerlerinin puanını biraz düşürür
    var secilen = [], sayac = {};
    while (secilen.length < adet && puanli.length) {
      var en = 0;
      for (var i = 1; i < puanli.length; i++) {
        if (puanli[i].p - (sayac[puanli[i].x.k] || 0) * 1.5 > puanli[en].p - (sayac[puanli[en].x.k] || 0) * 1.5) en = i;
      }
      var o = puanli.splice(en, 1)[0];
      sayac[o.x.k] = (sayac[o.x.k] || 0) + 1;
      secilen.push(o.x);
    }
    return secilen;
  }

  // ---------- Kişisel kutular ----------
  function kutular() {
    var S = VERI.servis;
    var ilce = S.ilce[tercih.ilce[0] || 'yenisehir'];
    var html = [];
    if (tercih.kutu.indexOf('hava') > -1 && ilce.hava) html.push('<a class="gm-kutu" href="/hava-durumu/' + (tercih.ilce[0] || 'yenisehir') + '/"><small>' + esc(ilce.ad) + ' · hava</small><strong>' + ilce.hava.s + '°</strong><span>' + esc(ilce.hava.d) + (ilce.hava.mx != null ? ' · ↑' + ilce.hava.mx + '° ↓' + ilce.hava.mn + '°' : '') + '</span></a>');
    if (tercih.kutu.indexOf('eczane') > -1) html.push('<a class="gm-kutu" href="/nobetci-eczane/' + (tercih.ilce[0] || 'yenisehir') + '/"><small>' + esc(ilce.ad) + ' · nöbetçi eczane</small><strong>' + ilce.eczSayi + ' açık</strong><span>' + esc(ilce.ecz.map(function (e) { return e.ad; }).join(', ') || 'Liste için dokunun') + '</span></a>');
    if (tercih.kutu.indexOf('yakit') > -1 && ilce.yakit) html.push('<a class="gm-kutu" href="/akaryakit-fiyatlari/' + (tercih.ilce[0] || 'yenisehir') + '/"><small>' + esc(ilce.ad) + ' · akaryakıt</small><strong>' + ilce.yakit.b.toFixed(2).replace('.', ',') + ' ₺</strong><span>Benzin · motorin ' + ilce.yakit.m.toFixed(2).replace('.', ',') + ' ₺</span></a>');
    if (tercih.kutu.indexOf('mac') > -1 && S.maclar.length) html.push('<a class="gm-kutu gm-kutu-mac" href="/spor/"><small>Bugünün maçları</small>' + S.maclar.slice(0, 3).map(function (m) { return '<span><b>' + esc(m.ev) + '</b> ' + (m.durum === 'baslamadi' ? esc(m.saat || '') : esc(String(m.skor || '0-0').replace('-', ' – '))) + ' <b>' + esc(m.dep) + '</b></span>'; }).join('') + '</a>');
    return html.join('');
  }

  // ---------- Liste ----------
  var KAT = {};
  VERI.kategoriler.forEach(function (k) { KAT[k.slug] = k; });
  var ILCE = {};
  VERI.ilceler.forEach(function (i) { ILCE[i.slug] = i.ad; });
  function zaman(z) {
    var dk = Math.round((Date.now() - new Date(z).getTime()) / 6e4);
    if (dk < 60) return dk + ' dk önce';
    if (dk < 24 * 60) return Math.round(dk / 60) + ' saat önce';
    return Math.round(dk / 1440) + ' gün önce';
  }
  function kart(x, n) {
    var k = KAT[x.k] || { ad: 'Gündem', renk: '#DC3E42' };
    var yer = x.il.length ? ILCE[x.il[0]] : 'Mersin';
    var okundu = okunan.indexOf(x.i) > -1;
    return '<a class="gm-kart' + (okundu ? ' okundu' : '') + '" href="' + esc(x.y) + '"' + (x.d ? ' rel="noopener nofollow" target="_blank"' : '') + ' data-id="' + esc(x.i) + '">' +
      '<span class="gm-no">' + n + '</span>' +
      '<img src="' + esc(x.g) + '" alt="" loading="lazy" width="120" height="90">' +
      '<span class="gm-kart-metin"><span class="gm-etiket" style="--r:' + k.renk + '">' + esc(k.ad) + '</span> <span class="gm-yer">' + esc(yer) + ' · ' + zaman(x.z) + (okundu ? ' · okundu' : '') + '</span>' +
      '<strong>' + esc(x.b) + '</strong>' + (x.o ? '<span class="gm-ozet">' + esc(x.o) + '</span>' : '') + '</span></a>';
  }
  function selam() {
    var s = new Date().getHours();
    return s < 6 ? 'İyi geceler' : s < 12 ? 'Günaydın' : s < 18 ? 'İyi günler' : 'İyi akşamlar';
  }
  var secilenler = [];
  function goster() {
    kurulum.hidden = true;
    akisBolumu.hidden = false;
    secilenler = sec();
    var yeni = secilenler.filter(function (x) { return okunan.indexOf(x.i) < 0; }).length;
    akisBolumu.querySelector('[data-gm-selam]').textContent = selam() + ', gündemin hazır';
    var ilceAd = tercih.ilce.length ? tercih.ilce.map(function (i) { return ILCE[i]; }).join(', ') : 'Tüm Mersin';
    akisBolumu.querySelector('[data-gm-alt]').textContent = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }) + ' · ' + ilceAd + ' · ' + yeni + ' yeni haber';
    akisBolumu.querySelector('[data-gm-kutular]').innerHTML = kutular();
    akisBolumu.querySelector('[data-gm-liste]').innerHTML = secilenler.length ? secilenler.map(function (x, i) { return kart(x, i + 1); }).join('') : '<div class="bos">Seçimlerine uyan haber henüz yok. Tercihlerini genişletebilirsin.</div>';
    akisBolumu.querySelector('[data-gm-son]').textContent = secilenler.length ? 'Hepsi bu kadar. Yeni haberler geldikçe bu sayfa güncellenir.' : '';
  }
  function okunduYap(id) {
    if (okunan.indexOf(id) > -1) return;
    okunan.push(id);
    okunan = okunan.slice(-400);
    yaz(OKUNAN, okunan);
  }
  akisBolumu.addEventListener('click', function (e) {
    var k = e.target.closest('.gm-kart');
    if (k) okunduYap(k.dataset.id);
  });

  // ---------- Hızlı oku (hikâye görünümü) ----------
  var perde = document.querySelector('[data-gm-hikaye]');
  var sahne = perde.querySelector('[data-gm-sahne]');
  var cubuklar = perde.querySelector('[data-gm-cubuklar]');
  var sira = 0, zamanlayici = null, SURE = 9000;
  function hikayeCiz() {
    var x = secilenler[sira];
    if (!x) return kapat();
    okunduYap(x.i);
    var k = KAT[x.k] || { ad: 'Gündem', renk: '#DC3E42' };
    sahne.innerHTML = '<div class="gm-arka" style="background-image:url(\'' + esc(x.g) + '\')"></div><div class="gm-icerik">' +
      '<span class="gm-etiket" style="--r:' + k.renk + '">' + esc(k.ad) + '</span><span class="gm-hikaye-yer">' + esc(x.il.length ? ILCE[x.il[0]] : 'Mersin') + ' · ' + zaman(x.z) + '</span>' +
      '<h2>' + esc(x.b) + '</h2>' + (x.o ? '<p>' + esc(x.o) + '</p>' : '') +
      '<a class="gm-ac" href="' + esc(x.y) + '"' + (x.d ? ' rel="noopener nofollow" target="_blank"' : '') + '>Haberin tamamı →</a>' +
      '<span class="gm-sayac">' + (sira + 1) + ' / ' + secilenler.length + '</span></div>';
    cubuklar.innerHTML = secilenler.map(function (_, i) { return '<span class="' + (i < sira ? 'dolu' : i === sira ? 'aktif' : '') + '"><i style="animation-duration:' + SURE + 'ms"></i></span>'; }).join('');
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(ileri, SURE);
  }
  function ileri() { if (sira < secilenler.length - 1) { sira++; hikayeCiz(); } else kapat(); }
  function geri() { if (sira > 0) sira--; hikayeCiz(); }
  function kapat() { clearTimeout(zamanlayici); perde.hidden = true; document.body.style.overflow = ''; goster(); }
  kok.querySelector('[data-gm-hizli]').addEventListener('click', function () {
    if (!secilenler.length) return;
    sira = 0;
    perde.hidden = false;
    document.body.style.overflow = 'hidden';
    hikayeCiz();
  });
  perde.querySelector('[data-gm-ileri]').addEventListener('click', ileri);
  perde.querySelector('[data-gm-geri]').addEventListener('click', geri);
  perde.querySelector('[data-gm-kapat]').addEventListener('click', kapat);
  document.addEventListener('keydown', function (e) {
    if (perde.hidden) return;
    if (e.key === 'ArrowRight') ileri();
    else if (e.key === 'ArrowLeft') geri();
    else if (e.key === 'Escape') kapat();
  });
  // Kaydırma ile geçiş (telefon)
  var dokunX = null;
  perde.addEventListener('touchstart', function (e) { dokunX = e.touches[0].clientX; }, { passive: true });
  perde.addEventListener('touchend', function (e) {
    if (dokunX == null) return;
    var fark = e.changedTouches[0].clientX - dokunX;
    if (Math.abs(fark) > 50) (fark < 0 ? ileri : geri)();
    dokunX = null;
  });

  // ---------- Sabah bildirimi (her gün 08.00) ----------
  var zil = kok.querySelector('[data-gm-zil]');
  function b64(s) {
    var p = '='.repeat((4 - (s.length % 4)) % 4);
    var r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
    var a = new Uint8Array(r.length);
    for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i);
    return a;
  }
  function zilDurum(acik) {
    zil.classList.toggle('acik', acik);
    zil.textContent = acik ? '🔔 Sabah bildirimi açık' : '🔔 Her sabah 08.00\'de bildir';
  }
  function aboneGonder(abonelik) {
    return fetch('/api/abone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ abonelik: abonelik.toJSON(), tercih: { ilce: tercih.ilce, kategori: tercih.kategori } }) })
      .then(function (r) { if (!r.ok) throw new Error('kayıt'); });
  }
  if (VERI.vapid && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
    navigator.serviceWorker.register('/sw.js').then(function (kayit) {
      zil.hidden = false;
      kayit.pushManager.getSubscription().then(function (a) {
        zilDurum(Boolean(a));
        if (a && tercih) aboneGonder(a).catch(function () {}); // tercihler değiştiyse güncelle
      });
      zil.addEventListener('click', function () {
        kayit.pushManager.getSubscription().then(function (a) {
          if (a) {
            if (!confirm('Sabah bildirimlerini kapatmak istiyor musun?')) return;
            fetch('/api/abone', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: a.endpoint }) }).catch(function () {});
            return a.unsubscribe().then(function () { zilDurum(false); });
          }
          return Notification.requestPermission().then(function (izin) {
            if (izin !== 'granted') { alert('Bildirim izni verilmedi. Tarayıcı ayarlarından açabilirsin.'); return; }
            return kayit.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VERI.vapid) }).then(function (yeni) {
              return aboneGonder(yeni).then(function () { zilDurum(true); });
            });
          });
        }).catch(function () { alert('Bildirim şu an açılamadı, biraz sonra tekrar dene.'); });
      });
    }).catch(function () {});
  }

  // ---------- Başlat ----------
  fetch('/akis.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      haberler = j;
      if (tercih) goster();
      else { kurulum.hidden = false; cipleriCiz(); }
    })
    .catch(function () {
      kok.insertAdjacentHTML('afterbegin', '<div class="bos">Haberler yüklenemedi, lütfen sayfayı yenileyin.</div>');
    });
})();
