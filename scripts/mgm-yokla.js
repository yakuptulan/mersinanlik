// MGM meteoalarm: ilçe kodlarından il (plaka) çıkarma varsayımını doğrular (9 + plaka + sıra)
const UA = 'Mozilla/5.0 (compatible; MersinAnlik/1.0; +https://mersinanlik.com)';
for (const gun of ['today', 'tomorrow']) {
  try {
    const r = await fetch(`https://servis.mgm.gov.tr/web/meteoalarm/${gun}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    const l = await r.json();
    console.log('MGM', gun, r.status, 'uyarı', l.length);
    for (const u of l.slice(0, 6)) {
      for (const renk of ['red', 'orange', 'yellow']) {
        const k = u.towns?.[renk] || [];
        if (!k.length) continue;
        const plaka = [...new Set(k.map((x) => String(x).slice(1, 3)))];
        console.log('MGM', gun, renk, JSON.stringify(u.weather?.[renk]), 'kod örnek', k.slice(0, 6).join(','), 'uzunluk', [...new Set(k.map((x) => String(x).length))].join('/'), 'plakalar', plaka.join(','), '| METİN', String(u.text?.[renk] || '').replace(/\s+/g, ' ').slice(0, 260));
      }
    }
  } catch (e) { console.log('MGM_HATA', gun, e.message); }
}
// Okul tatili için ek akış adayları
for (const url of ['https://www.ntv.com.tr/son-dakika.rss', 'https://www.ntv.com.tr/turkiye.rss', 'https://www.iha.com.tr/rss', 'https://www.dha.com.tr/rss', 'https://www.trthaber.com/turkiye_articles.rss', 'https://www.aa.com.tr/tr/rss/default?cat=egitim', 'https://www.haberturk.com/rss/kategori/gundem.xml', 'https://www.cumhuriyet.com.tr/rss/son_dakika.xml', 'https://www.hurriyet.com.tr/rss/gundem', 'https://www.sozcu.com.tr/feeds-son-dakika']) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    console.log('AKIS', r.status, (t.match(/<item|<entry/g) || []).length, 'öğe', url);
  } catch (e) { console.log('AKIS', 'HATA', e.message.slice(0, 60), url); }
}
