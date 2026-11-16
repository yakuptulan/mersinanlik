// Mersin sayaçları için veriler: deniz suyu sıcaklığı ve hava kalitesi (Open-Meteo, ücretsiz, anahtarsız)
const KIYI = { lat: 36.77, lon: 34.65 }; // Mersin merkez açıkları
const MERKEZ = { lat: 36.8, lon: 34.63 };

async function getir(url, ua) {
  const r = await fetch(url, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function sayacGetir(ua) {
  const sonuc = { guncelleme: new Date().toISOString() };
  try {
    const d = await getir(`https://marine-api.open-meteo.com/v1/marine?latitude=${KIYI.lat}&longitude=${KIYI.lon}&current=sea_surface_temperature,wave_height`, ua);
    sonuc.deniz = { sicaklik: d.current?.sea_surface_temperature ?? null, dalga: d.current?.wave_height ?? null };
  } catch (e) {
    console.warn(`! Deniz suyu: ${e.message}`);
  }
  try {
    const h = await getir(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${MERKEZ.lat}&longitude=${MERKEZ.lon}&current=european_aqi,pm2_5,pm10&daily=uv_index_max&timezone=Europe%2FIstanbul&forecast_days=1`, ua);
    sonuc.hava = { aqi: h.current?.european_aqi ?? null, pm25: h.current?.pm2_5 ?? null, pm10: h.current?.pm10 ?? null, uvMax: h.daily?.uv_index_max?.[0] ?? null };
  } catch (e) {
    console.warn(`! Hava kalitesi: ${e.message}`);
  }
  return sonuc;
}

// Avrupa hava kalitesi endeksi (EAQI) sınıfları
export function aqiSinif(aqi) {
  if (aqi == null) return null;
  if (aqi <= 20) return { ad: 'Çok iyi', renk: '#10b981' };
  if (aqi <= 40) return { ad: 'İyi', renk: '#84cc16' };
  if (aqi <= 60) return { ad: 'Orta', renk: '#eab308' };
  if (aqi <= 80) return { ad: 'Kötü', renk: '#f97316' };
  if (aqi <= 100) return { ad: 'Çok kötü', renk: '#ef4444' };
  return { ad: 'Aşırı kötü', renk: '#a21caf' };
}
