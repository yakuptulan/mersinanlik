// Mersin Anlık – küçük tarayıcı betiği (çerçevesiz, hızlı)
(function () {
  var ILCELER = window.__ILCELER__ || {};

  function oku(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function yaz(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // "12 dk önce" gibi göreli zamanlar
  function once(iso) {
    var fark = (Date.now() - new Date(iso).getTime()) / 60000;
    if (fark < 1) return 'az önce';
    if (fark < 60) return Math.round(fark) + ' dk önce';
    if (fark < 24 * 60) return Math.round(fark / 60) + ' saat önce';
    return Math.round(fark / 1440) + ' gün önce';
  }
  function zamanlariGuncelle() {
    document.querySelectorAll('[data-once]').forEach(function (el) {
      el.textContent = once(el.getAttribute('data-once'));
    });
  }
  zamanlariGuncelle();
  setInterval(zamanlariGuncelle, 60000);

  // Benim ilçem
  var ilcem = oku('ilcem');
  var adlar = window.__ILCE_ADLARI__ || {};
  if (ilcem && adlar[ilcem]) {
    document.querySelectorAll('[data-ilce-sec]').forEach(function (a) { a.href = '/ilce/' + ilcem + '/'; });
    document.querySelectorAll('[data-ilcem]').forEach(function (a) { a.href = '/ilce/' + ilcem + '/'; });
    document.querySelectorAll('[data-ilce-sec] [data-ilce-ad]').forEach(function (s) { s.textContent = adlar[ilcem]; });
    var hava = (window.__HAVA__ || {})[ilcem];
    var kart = document.querySelector('[data-hava-kart]');
    var ikonlar = window.__HAVA_IKON__ || {};
    var sira = 0;
    // Aynı sayfada birden fazla SVG olacağı için gradient id'lerini benzersiz yap
    function ikon(tur, boyut) {
      var html = ikonlar[tur] || '';
      sira++;
      html = html.replace(/id="([gbkh])(\d+)"/g, 'id="$1j' + sira + '"').replace(/url\(#([gbkh])\d+\)/g, 'url(#$1j' + sira + ')');
      return boyut ? html.replace(/width="\d+" height="\d+"/, 'width="' + boyut + '" height="' + boyut + '"') : html;
    }
    if (hava && kart) {
      kart.href = '/hava-durumu/#' + ilcem;
      kart.querySelector('[data-ilce-ad]').textContent = adlar[ilcem];
      kart.querySelector('[data-hava-derece]').textContent = hava.sicaklik + '°';
      kart.querySelector('[data-hava-durum]').textContent = hava.durum;
      if (hava.tur) kart.querySelector('[data-hava-ikon]').innerHTML = ikon(hava.tur);
      var bugun = hava.gunler && hava.gunler[0];
      kart.querySelector('[data-hava-uc]').textContent = bugun ? '↑ ' + bugun.max + '°  ↓ ' + bugun.min + '°' : '';
      var g = kart.querySelector('[data-hava-gunler]');
      if (g && hava.gunler) {
        g.innerHTML = hava.gunler.slice(1, 4).map(function (d) {
          return '<div><span>' + d.gun + '</span>' + ikon(d.tur, 34) + '<b>' + d.max + '°</b></div>';
        }).join('');
      }
    }
    var ecz = (window.__ECZ__ || {})[ilcem];
    var ek = document.querySelector('[data-eczane-kart]');
    if (ek && ecz && ecz.length) {
      ek.href = '/nobetci-eczane/#' + ilcem;
      ek.querySelector('[data-eczane-liste]').innerHTML = ecz.map(function (a) { var s = document.createElement('span'); s.textContent = a; return s.outerHTML; }).join('');
      ek.querySelector('[data-eczane-ilce]').textContent = adlar[ilcem] + ' · telefon ve adres →';
    }
  }
  document.querySelectorAll('[data-ilcem-yap]').forEach(function (b) {
    var slug = b.getAttribute('data-ilcem-yap');
    if (ilcem === slug) b.querySelector('span').textContent = 'Benim ilçem ✓';
    b.addEventListener('click', function () {
      yaz('ilcem', slug);
      b.querySelector('span').textContent = 'Benim ilçem ✓';
    });
  });

  // Arama sayfası
  var kutu = document.getElementById('ara-kutu');
  if (kutu) {
    var sonuc = document.getElementById('ara-sonuc');
    var veri = null;
    function kucuk(s) { return (s || '').toLocaleLowerCase('tr-TR'); }
    function kacis(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function goster() {
      var q = kucuk(kutu.value.trim());
      if (!veri || q.length < 2) return;
      var bulunan = veri.filter(function (h) { return kucuk(h.b + ' ' + h.i + ' ' + h.k).indexOf(q) > -1; }).slice(0, 40);
      sonuc.innerHTML = bulunan.length
        ? bulunan.map(function (h) {
            return '<article class="haber"><div class="icerik"><span class="cip">' + kacis(h.i || 'Mersin') + '</span><h3><a href="' + kacis(h.l) + '" rel="noopener nofollow" target="_blank">' + kacis(h.b) + '</a></h3><span class="kaynak">Kaynak: <strong>' + kacis(h.k) + '</strong> · ' + once(h.t) + '</span></div></article>';
          }).join('')
        : '<div class="bos">Sonuç bulunamadı.</div>';
    }
    fetch('/arama.json').then(function (r) { return r.json(); }).then(function (j) { veri = j; goster(); });
    kutu.addEventListener('input', goster);
    kutu.focus();
  }
})();
