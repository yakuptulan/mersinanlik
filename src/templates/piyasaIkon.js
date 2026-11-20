// Altın, gümüş, döviz ve borsa için küçük SVG ikonlar (kendi çizimimiz; dış görsel yok).
// Kullanım: piyasaIkon('GRA', 32) → satır içi <svg>
let sayac = 0;
const id = () => `pi${(sayac++).toString(36)}`;

// Altın ve gümüş renk geçişleri
const ALTIN = ['#FFE79A', '#F5C542', '#C98A12', '#8A5A00'];
const GUMUS = ['#FFFFFF', '#E2E8F0', '#A3AFBF', '#5B6676'];

function kulce(boyut, renk, etiket) {
  const g = id(), p = id();
  return `<svg class="p-ikon" width="${boyut}" height="${boyut}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${renk[0]}"/><stop offset=".45" stop-color="${renk[1]}"/><stop offset="1" stop-color="${renk[2]}"/></linearGradient><linearGradient id="${p}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${renk[1]}"/><stop offset="1" stop-color="${renk[3]}"/></linearGradient></defs>
<path d="M14 22 L50 22 L60 46 L4 46 Z" fill="url(#${p})"/><path d="M17 18 L47 18 L50 22 L14 22 Z" fill="${renk[0]}"/><path d="M17 18 L47 18 L56 40 L8 40 Z" fill="url(#${g})"/><path d="M20 21 L30 21 L24 37 L13 37 Z" fill="#fff" opacity=".35"/>${etiket ? `<text x="32" y="33" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="9" fill="${renk[3]}">${etiket}</text>` : ''}</svg>`;
}

function sikke(boyut, harf, olcek = 1) {
  const g = id(), k = id();
  const r = 26 * olcek;
  return `<svg class="p-ikon" width="${boyut}" height="${boyut}" viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="${g}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${ALTIN[0]}"/><stop offset=".55" stop-color="${ALTIN[1]}"/><stop offset="1" stop-color="${ALTIN[2]}"/></radialGradient><linearGradient id="${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ALTIN[1]}"/><stop offset="1" stop-color="${ALTIN[3]}"/></linearGradient></defs>
<circle cx="32" cy="33" r="${r}" fill="url(#${k})"/><circle cx="32" cy="31" r="${r}" fill="url(#${g})"/><circle cx="32" cy="31" r="${r * 0.78}" fill="none" stroke="${ALTIN[2]}" stroke-width="1.6" stroke-dasharray="1.6 2.2" opacity=".75"/><text x="32" y="${31 + r * 0.32}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="900" font-size="${r * 0.9}" fill="${ALTIN[3]}" opacity=".85">${harf}</text><ellipse cx="${32 - r * 0.38}" cy="${31 - r * 0.45}" rx="${r * 0.32}" ry="${r * 0.16}" fill="#fff" opacity=".45" transform="rotate(-30 ${32 - r * 0.38} ${31 - r * 0.45})"/></svg>`;
}

function bilezik(boyut, etiket) {
  const g = id();
  return `<svg class="p-ikon" width="${boyut}" height="${boyut}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ALTIN[0]}"/><stop offset=".5" stop-color="${ALTIN[1]}"/><stop offset="1" stop-color="${ALTIN[3]}"/></linearGradient></defs>
<ellipse cx="32" cy="36" rx="25" ry="14" fill="none" stroke="${ALTIN[3]}" stroke-width="7"/><ellipse cx="32" cy="33" rx="25" ry="14" fill="none" stroke="url(#${g})" stroke-width="7"/><path d="M14 27 Q22 21 32 20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>${etiket ? `<rect x="22" y="44" width="20" height="13" rx="6.5" fill="#fff" stroke="${ALTIN[2]}" stroke-width="1.5"/><text x="32" y="53.5" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="900" font-size="8" fill="${ALTIN[3]}">${etiket}</text>` : ''}</svg>`;
}

function para(boyut, sembol, renk1, renk2) {
  const g = id();
  return `<svg class="p-ikon" width="${boyut}" height="${boyut}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${renk1}"/><stop offset="1" stop-color="${renk2}"/></linearGradient></defs>
<circle cx="32" cy="32" r="28" fill="url(#${g})"/><circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="1.5" opacity=".35"/><text x="32" y="${sembol.length > 1 ? 39 : 43}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="900" font-size="${sembol.length > 1 ? 18 : 30}" fill="#fff">${sembol}</text></svg>`;
}

function borsa(boyut) {
  const g = id();
  return `<svg class="p-ikon" width="${boyut}" height="${boyut}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
<rect x="4" y="4" width="56" height="56" rx="16" fill="url(#${g})"/><path d="M13 44 L25 32 L33 38 L50 20" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 20 H50 V28" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const HARITA = {
  GRA: (b) => kulce(b, ALTIN, ''),
  HAS: (b) => kulce(b, ALTIN, '24K'),
  GUMUS: (b) => kulce(b, GUMUS, 'Ag'),
  CEYREKALTIN: (b) => sikke(b, 'Ç', 0.72),
  YARIMALTIN: (b) => sikke(b, 'Y', 0.84),
  TAMALTIN: (b) => sikke(b, 'T', 0.95),
  CUMHURIYETALTINI: (b) => sikke(b, 'C', 0.95),
  ATAALTIN: (b) => sikke(b, 'A', 0.95),
  RESATALTIN: (b) => sikke(b, 'R', 0.95),
  YIA: (b) => bilezik(b, '22'),
  '18AYARALTIN': (b) => bilezik(b, '18'),
  '14AYARALTIN': (b) => bilezik(b, '14'),
  USD: (b) => para(b, '$', '#15803d', '#22c55e'),
  EUR: (b) => para(b, '€', '#1d4ed8', '#3b82f6'),
  GBP: (b) => para(b, '£', '#6d28d9', '#a855f7'),
  CHF: (b) => para(b, '₣', '#b91c1c', '#ef4444'),
  SAR: (b) => para(b, 'SR', '#065f46', '#10b981'),
  RUB: (b) => para(b, '₽', '#0e7490', '#22d3ee'),
  JPY: (b) => para(b, '¥', '#be123c', '#fb7185'),
  BTC: (b) => para(b, '₿', '#c2410c', '#f59e0b'),
  XU100: (b) => borsa(b),
};
// Şerit kodlarından (gram, usd…) da bulunsun
const KISA = { gram: 'GRA', ceyrek: 'CEYREKALTIN', gumus: 'GUMUS', usd: 'USD', eur: 'EUR', btc: 'BTC', bist: 'XU100' };

export function piyasaIkon(kod, boyut = 28) {
  const f = HARITA[kod] || HARITA[KISA[kod]];
  return f ? f(boyut) : '';
}
