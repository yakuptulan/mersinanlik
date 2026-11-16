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
  // Başlıktaki canlı saat (Türkiye saati)
  function saatiGuncelle() {
    var t = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
    document.querySelectorAll('[data-canli-saat]').forEach(function (el) { el.textContent = t; });
  }
  zamanlariGuncelle();
  saatiGuncelle();
  setInterval(zamanlariGuncelle, 60000);
  setInterval(saatiGuncelle, 10000);

  // Benim ilçem
  var ilcem = oku('ilcem');
  var adlar = window.__ILCE_ADLARI__ || {};
  var ikonlar = window.__HAVA_IKON__ || {};
  var sira = 0;
  // Aynı sayfada birden fazla SVG olacağı için gradient id'lerini benzersiz yap
  function ikon(tur, boyut) {
    var html = ikonlar[tur] || '';
    sira++;
    html = html.replace(/id="([gbkh])(\d+)"/g, 'id="$1j' + sira + '"').replace(/url\(#([gbkh])\d+\)/g, 'url(#$1j' + sira + ')');
    return boyut ? html.replace(/width="\d+" height="\d+"/, 'width="' + boyut + '" height="' + boyut + '"') : html;
  }
  function ilceUygula(slug) {
    if (!slug || !adlar[slug]) return;
    document.querySelectorAll('[data-ilcem]').forEach(function (a) { a.href = '/ilce/' + slug + '/'; });
    document.querySelectorAll('[data-ilce-secici] [data-ilce-ad]').forEach(function (s) { s.textContent = adlar[slug]; });
    document.querySelectorAll('[data-ilce-deger]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-ilce-deger') === slug ? 'true' : 'false'); });
    var hava = (window.__HAVA__ || {})[slug];
    var kart = document.querySelector('[data-hava-kart]');
    if (hava && kart) {
      kart.href = '/hava-durumu/#' + slug;
      kart.querySelector('[data-ilce-ad]').textContent = adlar[slug];
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
    var ecz = (window.__ECZ__ || {})[slug] || [];
    var ek = document.querySelector('[data-eczane-kart]');
    if (ek) {
      ek.href = '/nobetci-eczane/' + (ecz.length ? '#' + slug : '');
      ek.querySelector('[data-eczane-liste]').innerHTML = ecz.length
        ? ecz.map(function (a) { var s = document.createElement('span'); s.textContent = a; return s.outerHTML; }).join('')
        : '<span>' + adlar[slug] + ' için liste yok, tüm Mersin →</span>';
      ek.querySelector('[data-eczane-ilce]').textContent = ecz.length ? adlar[slug] + ' · adres →' : 'Adres ve telefon →';
    }
  }
  if (ilcem) ilceUygula(ilcem);

  // İlçe seçici: düğmeye basınca liste açılır, sayfa değişmez
  document.querySelectorAll('[data-ilce-secici]').forEach(function (kap) {
    var dugme = kap.querySelector('.ilce-sec');
    var liste = kap.querySelector('.ilce-acilir');
    function ac(acik) {
      liste.hidden = !acik;
      dugme.setAttribute('aria-expanded', acik ? 'true' : 'false');
    }
    dugme.addEventListener('click', function (e) { e.stopPropagation(); ac(liste.hidden); });
    liste.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ilce-deger]');
      if (!b) return;
      var slug = b.getAttribute('data-ilce-deger');
      yaz('ilcem', slug);
      ilcem = slug;
      ilceUygula(slug);
      ac(false);
      dugme.focus();
    });
    document.addEventListener('click', function (e) { if (!kap.contains(e.target)) ac(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !liste.hidden) { ac(false); dugme.focus(); } });
  });
  document.querySelectorAll('[data-ilcem-yap]').forEach(function (b) {
    var slug = b.getAttribute('data-ilcem-yap');
    if (ilcem === slug) b.querySelector('span').textContent = 'Benim ilçem ✓';
    b.addEventListener('click', function () {
      yaz('ilcem', slug);
      b.querySelector('span').textContent = 'Benim ilçem ✓';
    });
  });

  // ---------- Canlı piyasa (sayfa açıkken dakikada bir) ----------
  var ONDALIK = { gram: 2, ceyrek: 0, gumus: 2, usd: 2, eur: 2, btc: 0, bist: 0 };
  var TG = { gram: 'GRA', ceyrek: 'CEYREKALTIN', gumus: 'GUMUS', usd: 'USD', eur: 'EUR', bist: 'XU100' };
  function sayi(n, d) { return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function yonHtml(d) {
    d = Number(d) || 0;
    var s = d > 0 ? 'yukari' : d < 0 ? 'asagi' : 'sabit';
    return '<span class="p-yon ' + s + '" data-p-yon>' + (d > 0 ? '▲' : d < 0 ? '▼' : '■') + ' %' + sayi(Math.abs(d), 2) + '</span>';
  }
  function kalemYaz(kod, fiyat, degisim) {
    document.querySelectorAll('[data-piyasa="' + kod + '"]').forEach(function (el) {
      var dg = el.querySelector('[data-p-deger]');
      var yeni = sayi(fiyat, ONDALIK[kod]) + (kod === 'bist' ? '' : ' ₺');
      if (dg && dg.textContent !== yeni) {
        dg.textContent = yeni;
        if (el.classList.contains('piyasa')) { el.classList.remove('parla'); void el.offsetWidth; el.classList.add('parla'); }
      }
      var y = el.querySelector('[data-p-yon]');
      if (y) y.outerHTML = yonHtml(degisim);
    });
  }
  function piyasaTazele() {
    if (!document.querySelector('[data-piyasa], [data-tg]')) return;
    fetch('https://finans.truncgil.com/v4/today.json').then(function (r) { return r.json(); }).then(function (j) {
      Object.keys(TG).forEach(function (kod) {
        var v = j[TG[kod]];
        if (v && (v.Selling || v.Buying)) kalemYaz(kod, v.Selling || v.Buying, v.Change);
      });
      document.querySelectorAll('[data-tg]').forEach(function (td) {
        var v = j[td.getAttribute('data-tg')];
        if (!v) return;
        var alan = td.getAttribute('data-alan');
        var d = td.getAttribute('data-tg') === 'XU100' ? 0 : 2;
        if (alan === 'satis' && v.Selling) td.innerHTML = '<strong>' + sayi(v.Selling, d) + '</strong>';
        if (alan === 'alis' && v.Buying) td.textContent = sayi(v.Buying, d);
        if (alan === 'degisim') td.innerHTML = yonHtml(v.Change);
      });
      var t = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
      document.querySelectorAll('[data-p-saat]').forEach(function (el) { el.textContent = t; });
    }).catch(function () {});
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=try&include_24hr_change=true').then(function (r) { return r.json(); }).then(function (j) {
      if (j.bitcoin && j.bitcoin.try) kalemYaz('btc', j.bitcoin.try, j.bitcoin.try_24h_change);
    }).catch(function () {});
  }
  piyasaTazele();
  setInterval(function () { if (!document.hidden) piyasaTazele(); }, 60000);

  // ---------- Namaz vakti: sıradaki vakit ve geri sayım ----------
  var VAKIT_ADI = { imsak: 'İmsak', gunes: 'Güneş', ogle: 'Öğle', ikindi: 'İkindi', aksam: 'Akşam', yatsi: 'Yatsı' };
  var MERKEZ = { akdeniz: 1, mezitli: 1, toroslar: 1, yenisehir: 1 };
  function namazGuncelle() {
    document.querySelectorAll('[data-namaz]').forEach(namazKutuGuncelle);
  }
  function namazKutuGuncelle(kutu) {
    var veriEl = kutu.querySelector('[data-namaz-veri]');
    if (!veriEl) return;
    var veri; try { veri = JSON.parse(veriEl.textContent); } catch (e) { return; }
    var slug = kutu.getAttribute('data-namaz-sabit') || ilcem || 'yenisehir';
    var gunler = veri.bolgeler[veri.ilce[slug] || veri.ilce.yenisehir] || [];
    var simdi = new Date();
    var bugun = simdi.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
    var dk = Number(simdi.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' })) * 60 + Number(simdi.toLocaleString('en-GB', { minute: '2-digit', timeZone: 'Europe/Istanbul' }));
    var g = gunler.filter(function (x) { return x.tarih === bugun; })[0];
    if (!g) return;
    var yerAdi = MERKEZ[slug] ? 'Mersin merkez' : (adlar[slug] || 'Mersin merkez');
    var yer = kutu.querySelector('[data-namaz-yer]');
    if (yer && !kutu.getAttribute('data-namaz-sabit')) yer.textContent = yerAdi;
    var sonraki = null, kalan = 0;
    Object.keys(VAKIT_ADI).forEach(function (k) {
      var h = g[k].split(':'), v = Number(h[0]) * 60 + Number(h[1]);
      var hucre = kutu.querySelector('[data-vakit="' + k + '"]');
      if (hucre) { hucre.querySelector('b').textContent = g[k]; hucre.classList.remove('siradaki'); }
      if (!sonraki && v > dk) { sonraki = k; kalan = v - dk; }
    });
    var yazi = kutu.querySelector('[data-namaz-sonraki]');
    var saatEl = kutu.querySelector('[data-namaz-saat]'), adEl = kutu.querySelector('[data-namaz-ad]');
    if (sonraki) {
      var hc = kutu.querySelector('[data-vakit="' + sonraki + '"]'); if (hc) hc.classList.add('siradaki');
      var s = Math.floor(kalan / 60), d = kalan % 60;
      var sure = (s ? s + ' sa ' : '') + d + ' dk';
      if (saatEl) { saatEl.textContent = g[sonraki]; adEl.textContent = VAKIT_ADI[sonraki]; yazi.textContent = sure + ' kaldı · ' + yerAdi; }
      else yazi.textContent = VAKIT_ADI[sonraki] + ' vaktine ' + sure;
    } else {
      var yarin = gunler.filter(function (x) { return x.tarih > bugun; })[0];
      if (saatEl && yarin) { saatEl.textContent = yarin.imsak; adEl.textContent = 'Yarın imsak'; yazi.textContent = yerAdi; }
      else yazi.textContent = yarin ? 'Yarın imsak ' + yarin.imsak : 'Bugünün vakitleri';
    }
  }
  namazGuncelle();
  setInterval(namazGuncelle, 30000);
  document.addEventListener('click', function (e) { if (e.target.closest('[data-ilce-deger]')) setTimeout(namazGuncelle, 0); });

  // ---------- Paylaş ----------
  document.querySelectorAll('[data-paylas]').forEach(function (p) {
    var url = p.getAttribute('data-url'), baslik = p.getAttribute('data-baslik');
    if (navigator.share) {
      var d = document.createElement('button');
      d.type = 'button'; d.textContent = 'Diğer…';
      d.addEventListener('click', function () { navigator.share({ title: baslik, url: url }).catch(function () {}); });
      p.appendChild(d);
    }
    var k = p.querySelector('[data-kopyala]');
    if (k) k.addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { k.textContent = 'Kopyalandı ✓'; setTimeout(function () { k.textContent = 'Linki kopyala'; }, 2000); }).catch(function () { prompt('Linki kopyalayın:', url); });
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
