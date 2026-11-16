// Namaz vakitleri: Diyanet İşleri Başkanlığı verisi (ezanvakti.emushaf.net aracılığıyla).
// Diyanet; Akdeniz, Mezitli, Toroslar ve Yenişehir için tek "MERSİN" vakti yayınlar.

export const DIYANET_ILCE = {
  akdeniz: '9737', mezitli: '9737', toroslar: '9737', yenisehir: '9737',
  anamur: '9731', aydincik: '9732', bozyazi: '9733', camliyayla: '9734', erdemli: '9735',
  gulnar: '9736', mut: '9738', silifke: '9739', tarsus: '9740',
};

export const VAKITLER = [
  ['imsak', 'İmsak'], ['gunes', 'Güneş'], ['ogle', 'Öğle'], ['ikindi', 'İkindi'], ['aksam', 'Akşam'], ['yatsi', 'Yatsı'],
];

// Diyanet satırı → { tarih: 'YYYY-MM-DD', imsak, gunes, ... }
export function vakitCoz(satir) {
  const [g, a, y] = String(satir.MiladiTarihKisa || '').split('.');
  if (!y) return null;
  return {
    tarih: `${y}-${a.padStart(2, '0')}-${g.padStart(2, '0')}`,
    imsak: satir.Imsak, gunes: satir.Gunes, ogle: satir.Ogle, ikindi: satir.Ikindi, aksam: satir.Aksam, yatsi: satir.Yatsi,
    hicri: satir.HicriTarihUzun || null,
  };
}

// Her Diyanet bölgesi için bugünden itibaren 8 gün. Kaynak sık isteğe 403 verebiliyor:
// istekler arasında bekler, olmazsa bir kez daha dener; alınamayan bölgelerde eski veri kalır.
export async function namazGetir(ua, bugun, eski = {}) {
  const sonuc = { ...(eski || {}) };
  let hata = 0;
  for (const id of [...new Set(Object.values(DIYANET_ILCE))]) {
    if ((sonuc[id] || []).some((v) => v.tarih === bugun) && (sonuc[id] || []).filter((v) => v.tarih >= bugun).length >= 5) {
      sonuc[id] = sonuc[id].filter((v) => v.tarih >= bugun);
      continue; // bu bölgenin önümüzdeki günleri zaten var
    }
    let tamam = false;
    for (let deneme = 0; deneme < 3 && !tamam; deneme++) {
      await new Promise((x) => setTimeout(x, deneme ? 8000 * deneme : 2500));
      try {
        const r = await fetch(`https://ezanvakti.emushaf.net/vakitler/${id}`, { headers: { 'User-Agent': ua, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        sonuc[id] = (await r.json()).map(vakitCoz).filter((v) => v && v.tarih >= bugun).slice(0, 8);
        tamam = true;
      } catch (e) {
        if (deneme === 2) console.warn(`! Namaz ${id}: ${e.message}`);
      }
    }
    if (!tamam) hata++;
  }
  return { guncelleme: new Date().toISOString(), bolgeler: sonuc, eksik: hata };
}
