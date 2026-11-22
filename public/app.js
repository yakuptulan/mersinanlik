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
        if (alan === 'satis' && v.Selling) document.querySelectorAll('[data-hesap][data-k="' + td.getAttribute('data-tg') + '"]').forEach(function (hs) { hs.setAttribute('data-fiyat', v.Selling); hesapla(hs); });
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
  // ---------- Altın/döviz hesaplayıcı ----------
  function tl(n) { return n.toLocaleString('tr-TR', { minimumFractionDigits: n >= 1000 ? 0 : 2, maximumFractionDigits: n >= 1000 ? 0 : 2 }); }
  function hesapla(hs) {
    var f = parseFloat(hs.getAttribute('data-fiyat'));
    var g = hs.querySelector('[data-hesap-girdi]'), s = hs.querySelector('[data-hesap-sonuc]');
    if (g && s) s.textContent = tl((parseFloat(String(g.value).replace(',', '.')) || 0) * f) + ' TL';
    var t = hs.querySelector('[data-hesap-ters]'), ts = hs.querySelector('[data-hesap-ters-sonuc]');
    if (t && ts) ts.textContent = ((parseFloat(String(t.value).replace(',', '.')) || 0) / f).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' ' + hs.getAttribute('data-birim');
  }
  document.querySelectorAll('[data-hesap]').forEach(function (hs) {
    hs.addEventListener('input', function () { hesapla(hs); });
  });
  // ---------- Son depremler: büyüklük süzgeci ve "x dk önce" ----------
  document.querySelectorAll('.dp-filtre').forEach(function (f) {
    f.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dp-min]');
      if (!b) return;
      f.querySelectorAll('button').forEach(function (x) { x.classList.toggle('aktif', x === b); });
      var min = parseFloat(b.getAttribute('data-dp-min'));
      var tablo = f.nextElementSibling;
      tablo.querySelectorAll('tr[data-b]').forEach(function (tr) { tr.hidden = parseFloat(tr.getAttribute('data-b')) < min; });
    });
  });
  function depremZaman() {
    var n = Date.now();
    document.querySelectorAll('[data-zaman]').forEach(function (td) {
      var dk = Math.round((n - new Date(td.getAttribute('data-zaman'))) / 60000);
      if (dk < 60) td.textContent = Math.max(dk, 1) + ' dk önce';
      else if (dk < 1440) td.textContent = Math.floor(dk / 60) + ' saat önce';
    });
  }
  depremZaman();
  setInterval(depremZaman, 60000);
  // ---------- İş ilanları arama ----------
  document.querySelectorAll('[data-is-ara]').forEach(function (inp) {
    var kartlar = Array.prototype.slice.call(document.querySelectorAll('[data-is-liste] .is-kart'));
    var sayac = document.querySelector('[data-is-sayac]');
    var bos = document.querySelector('[data-is-bos]');
    inp.addEventListener('input', function () {
      var q = inp.value.toLocaleLowerCase('tr-TR').trim();
      var n = 0;
      kartlar.forEach(function (k) { var g = !q || k.getAttribute('data-ara').indexOf(q) > -1; k.hidden = !g; if (g) n++; });
      if (sayac) sayac.textContent = n + ' ilan';
      if (bos) bos.hidden = n > 0;
    });
  });
  // ---------- Reklam formu → WhatsApp ----------
  document.querySelectorAll('[data-reklam-form]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(f);
      var metin = 'Merhaba, Mersin Anlık üzerinden yazıyorum.\n\nİşletme: ' + (d.get('isletme') || '') + '\nSektör/ilçe: ' + (d.get('sektor') || '-') + '\nİlgilendiğim hizmet: ' + (d.get('hizmet') || '-') + '\nNot: ' + (d.get('not') || '-');
      window.open('https://wa.me/' + f.getAttribute('data-wa') + '?text=' + encodeURIComponent(metin), '_blank', 'noopener');
    });
  });
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

  // ---------- Sekmeler (su / elektrik) ----------
  document.querySelectorAll('[data-sekme-kap]').forEach(function (kap) {
    kap.querySelectorAll('[data-sekme]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var ad = b.getAttribute('data-sekme');
        kap.querySelectorAll('[data-sekme]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
        kap.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== ad; p.classList.toggle('gecis', !p.hidden); });
      });
    });
  });

  // ---------- Manşet kaydırıcısı ----------
  document.querySelectorAll('[data-kaydirici]').forEach(function (k) {
    var slaytlar = [].slice.call(k.querySelectorAll('[data-slayt]'));
    var noktalar = [].slice.call(k.querySelectorAll('[data-git]'));
    var bar = k.querySelector('[data-ilerleme]');
    var sure = 6000, sira = 0, zaman = null, durdu = false;
    var azHareket = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (slaytlar.length < 2) return;
    function goster(i) {
      sira = (i + slaytlar.length) % slaytlar.length;
      slaytlar.forEach(function (s, j) {
        var aktif = j === sira;
        s.classList.toggle('aktif', aktif);
        if (aktif) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
        var a = s.querySelector('a'); if (a) a.tabIndex = aktif ? 0 : -1;
      });
      noktalar.forEach(function (n, j) { if (j === sira) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current'); });
      basla();
    }
    function basla() {
      clearTimeout(zaman);
      if (bar) { bar.classList.remove('akiyor'); void bar.offsetWidth; }
      if (durdu || azHareket || document.hidden) return;
      if (bar) { bar.style.setProperty('--sure', sure + 'ms'); bar.classList.add('akiyor'); }
      zaman = setTimeout(function () { goster(sira + 1); }, sure);
    }
    noktalar.forEach(function (n) { n.addEventListener('click', function () { goster(Number(n.getAttribute('data-git'))); }); });
    k.querySelectorAll('[data-kaydir]').forEach(function (b) { b.addEventListener('click', function () { goster(sira + Number(b.getAttribute('data-kaydir'))); }); });
    var sahne = k.querySelector('.mk-sahne');
    sahne.addEventListener('mouseenter', function () { durdu = true; basla(); });
    sahne.addEventListener('mouseleave', function () { durdu = false; basla(); });
    k.addEventListener('focusin', function () { durdu = true; basla(); });
    k.addEventListener('focusout', function () { durdu = false; basla(); });
    document.addEventListener('visibilitychange', basla);
    var x0 = null;
    sahne.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    sahne.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) goster(sira + (dx < 0 ? 1 : -1));
    });
    basla();
  });

  // ---------- Son dakika akışı ----------
  document.querySelectorAll('[data-son-dakika]').forEach(function (b) {
    var ogeler = [].slice.call(b.querySelectorAll('.sd-oge')), no = b.querySelector('[data-sd-no]'), i = 0, dur = false;
    if (ogeler.length < 2) return;
    b.addEventListener('mouseenter', function () { dur = true; });
    b.addEventListener('mouseleave', function () { dur = false; });
    setInterval(function () {
      if (dur || document.hidden) return;
      var eski = ogeler[i]; i = (i + 1) % ogeler.length; var yeni = ogeler[i];
      eski.classList.remove('aktif'); eski.classList.add('cikti'); eski.tabIndex = -1;
      yeni.classList.remove('cikti'); yeni.classList.add('aktif'); yeni.tabIndex = 0;
      setTimeout(function () { eski.classList.remove('cikti'); }, 600);
      if (no) no.textContent = i + 1;
    }, 4500);
  });

  // ---------- Kaydırınca beliren kartlar ----------
  if ('IntersectionObserver' in window) {
    var gozcu = new IntersectionObserver(function (girdiler) {
      girdiler.forEach(function (g) { if (g.isIntersecting) { g.target.classList.add('gorundu'); gozcu.unobserve(g.target); } });
    }, { rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.govde .haber, .govde .kutu-haber, .bolum-kart, .govde .kat-blok, .yan .kutu, .bilgi-kart, .etkinlik, .gundem-kutu').forEach(function (el, n) {
      el.classList.add('belir');
      el.style.setProperty('--gecikme', ((n % 4) * 0.06) + 's');
      gozcu.observe(el);
    });
  }

  // ---------- Mersin sayaçları ----------
  (function () {
    var fmt0 = function (n) { return Math.floor(n).toLocaleString('tr-TR'); };
    var nufus = [].slice.call(document.querySelectorAll('[data-nufus]'));
    var geri = [].slice.call(document.querySelectorAll('[data-geri-sayim]'));
    var gunGeri = [].slice.call(document.querySelectorAll('[data-geri-gun]'));
    var gunes = [].slice.call(document.querySelectorAll('[data-gunbatimi]'));
    if (!nufus.length && !geri.length && !gunGeri.length && !gunes.length) return;
    function trDakika() { var d = new Date(); return Number(d.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' })) * 60 + Number(d.toLocaleString('en-GB', { minute: '2-digit', timeZone: 'Europe/Istanbul' })); }
    function dk(s) { var p = s.split(':'); return Number(p[0]) * 60 + Number(p[1]); }
    function sure(m) { var s = Math.floor(m / 60), d = m % 60; return (s ? s + ' sa ' : '') + d + ' dk'; }
    function tikla() {
      var simdi = Date.now();
      nufus.forEach(function (el) {
        var taban = Number(el.getAttribute('data-taban')), artis = Number(el.getAttribute('data-artis')), t0 = Date.parse(el.getAttribute('data-tarih'));
        el.textContent = fmt0(taban + artis * (simdi - t0) / 31557600000);
      });
      geri.forEach(function (el) {
        var kalan = Math.max(0, Date.parse(el.getAttribute('data-geri-sayim')) - simdi) / 1000;
        var g = Math.floor(kalan / 86400), s = Math.floor(kalan % 86400 / 3600), d = Math.floor(kalan % 3600 / 60), sn = Math.floor(kalan % 60);
        el.textContent = g + ' : ' + String(s).padStart(2, '0') + ' : ' + String(d).padStart(2, '0') + ' : ' + String(sn).padStart(2, '0');
      });
      gunGeri.forEach(function (el) {
        var hedef = Date.parse(el.getAttribute('data-geri-gun') + 'T00:00:00+03:00');
        el.textContent = Math.max(0, Math.ceil((hedef - simdi) / 864e5));
      });
      gunes.forEach(function (el) {
        var n = trDakika(), bat = dk(el.getAttribute('data-gunbatimi')), dog = dk(el.getAttribute('data-gundogumu'));
        el.textContent = n < dog ? 'doğuşa ' + sure(dog - n) : n < bat ? 'batışa ' + sure(bat - n) : 'yarın doğuş ' + el.getAttribute('data-gundogumu');
      });
    }
    tikla();
    setInterval(tikla, 1000);
  })();

  // ---------- Trafik haritası: bölge seçimi ----------
  document.querySelectorAll('[data-trafik]').forEach(function (k) {
    var cerceve = document.querySelector('.trafik-harita iframe');
    k.querySelectorAll('[data-harita]').forEach(function (b) {
      b.addEventListener('click', function () {
        k.querySelectorAll('[data-harita]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        if (cerceve) cerceve.src = b.getAttribute('data-harita');
      });
    });
  });

  // ---------- Taze haber rozeti: son 60 dakikadaki haberler ----------
  document.querySelectorAll('[data-once]').forEach(function (el) {
    var t = Date.parse(el.getAttribute('data-once'));
    if (!t || Date.now() - t > 3600000) return;
    var kart = el.closest('.haber, .kutu-haber, .kare-kart, .okunan-liste li');
    if (kart && !kart.classList.contains('taze')) kart.classList.add('taze');
  });

  // ---------- Yeni haber bildirimi: sayfa açıkken yeni haber yayınlanırsa ----------
  (function () {
    if (!document.querySelector('.govde')) return;
    var ilk = null;
    function kontrol() {
      if (document.hidden) return;
      fetch('/son.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (liste) {
        if (!Array.isArray(liste) || !liste.length) return;
        if (ilk === null) { ilk = liste[0].z; return; }
        var yeni = liste.filter(function (x) { return x.z > ilk; }).length;
        if (!yeni) return;
        var hap = document.querySelector('.yeni-haber-hap');
        if (!hap) {
          hap = document.createElement('button');
          hap.type = 'button';
          hap.className = 'yeni-haber-hap';
          hap.addEventListener('click', function () { location.reload(); });
          document.body.appendChild(hap);
        }
        hap.innerHTML = '<span class="canli-nokta"></span>' + yeni + ' yeni haber · göster';
        hap.classList.add('gorunur');
      }).catch(function () {});
    }
    kontrol();
    setInterval(kontrol, 120000);
  })();

  // ---------- Okuma ilerleme çubuğu (haber ve bilgi yazıları) ----------
  (function () {
    var yazi = document.querySelector('.haber-yazi');
    if (!yazi) return;
    var cubuk = document.createElement('div');
    cubuk.className = 'okuma-cubugu';
    document.body.appendChild(cubuk);
    function guncelle() {
      var r = yazi.getBoundingClientRect();
      var oran = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight * 0.6)));
      cubuk.style.transform = 'scaleX(' + oran + ')';
    }
    window.addEventListener('scroll', guncelle, { passive: true });
    guncelle();
  })();

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

// Dinle: haberi tarayıcının Türkçe sesiyle okur
(function () {
  var dugme = document.querySelector('[data-dinle]');
  if (!dugme || !('speechSynthesis' in window)) return;
  var ss = window.speechSynthesis;
  var ses = null;
  function sesSec() {
    var liste = ss.getVoices().filter(function (v) { return /^tr/i.test(v.lang); });
    ses = liste.find(function (v) { return /google|natural|neural|yelda|emel/i.test(v.name); }) || liste[0] || null;
    if (ses) dugme.hidden = false;
  }
  sesSec();
  if (ss.onvoiceschanged !== undefined) ss.addEventListener('voiceschanged', sesSec);
  var metin = dugme.querySelector('[data-dinle-metin]');
  function bitir() { ss.cancel(); dugme.classList.remove('caliyor'); metin.textContent = 'Sesli dinle'; }
  dugme.addEventListener('click', function () {
    if (dugme.classList.contains('caliyor')) return bitir();
    var yazi = dugme.closest('article');
    var baslik = (document.querySelector('h1') || {}).textContent || '';
    var dugumler = Array.prototype.filter.call(yazi.querySelectorAll('.haber-spot, p, li h2'), function (p) {
      return !p.closest('.haber-kaynak, .haber-kaynak-kisa, .haber-konular, .paylas, .google-kaynak, figure');
    });
    var parcalar = [baslik].concat(dugumler.map(function (p) { return p.textContent; }));
    // Uzun metinler bazı tarayıcılarda yarıda kesildiği için cümle cümle sıraya konur
    var cumleler = parcalar.join('. ').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) || [];
    ss.cancel();
    cumleler.forEach(function (c, i) {
      var u = new SpeechSynthesisUtterance(c.trim());
      u.lang = 'tr-TR';
      if (ses) u.voice = ses;
      u.rate = 0.95;
      if (i === cumleler.length - 1) u.onend = bitir;
      ss.speak(u);
    });
    dugme.classList.add('caliyor');
    metin.textContent = 'Durdur';
  });
  window.addEventListener('pagehide', function () { ss.cancel(); });
})();

// "Sen yokken": siteye 1,5 günden uzun aradan sonra gelen okura ana sayfada kaçırdığı öne çıkan haberler
(function () {
  var ANAHTAR = 'mersinanlik-son-ziyaret';
  var simdi = Date.now();
  var onceki = 0;
  try { onceki = Number(localStorage.getItem(ANAHTAR)) || 0; localStorage.setItem(ANAHTAR, String(simdi)); } catch (e) { return; }
  if (location.pathname !== '/' || !onceki) return;
  var fark = simdi - onceki;
  if (fark < 36 * 36e5) return;
  var yer = document.querySelector('[data-gm-davet]');
  if (!yer) return;
  fetch('/akis.json').then(function (r) { return r.json(); }).then(function (liste) {
    var secilen = liste.filter(function (x) { return new Date(x.z).getTime() > onceki && x.k !== 'turkiye-dunya'; })
      .sort(function (a, b) { return b.s - a.s || new Date(b.z) - new Date(a.z); }).slice(0, 5);
    if (secilen.length < 3) return;
    var gun = Math.round(fark / 864e5);
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var kutu = document.createElement('section');
    kutu.className = 'kacirdin';
    kutu.innerHTML = '<div class="kc-bas"><b>👋 Tekrar hoş geldin!</b><span>Sen yokken (' + (gun < 2 ? 'son 1 günde' : 'son ' + Math.min(gun, 3) + ' günde') + ') Mersin\'de öne çıkanlar</span><button type="button" aria-label="Kapat">✕</button></div><ol>' +
      secilen.map(function (x) { return '<li><a href="' + esc(x.y) + '"><img src="' + esc(x.g) + '" alt="" width="72" height="54" loading="lazy"><span>' + esc(x.b) + '</span></a></li>'; }).join('') + '</ol>';
    kutu.querySelector('button').addEventListener('click', function () { kutu.remove(); });
    yer.parentNode.insertBefore(kutu, yer);
  }).catch(function () {});
})();
