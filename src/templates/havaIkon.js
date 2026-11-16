// Widget tarzı, renkli hava durumu ikonları (inline SVG, harici dosya yok).
// Durum metni services.js'deki Türkçe karşılıklardan gelir.

let sayac = 0;

export function havaTuru(durum = '') {
  const d = durum.toLocaleLowerCase('tr-TR');
  if (d.includes('gök gürültü') || d.includes('fırtına')) return 'firtina';
  if (d.includes('kar')) return 'kar';
  if (d.includes('yağmur') || d.includes('sağanak')) return 'yagmur';
  if (d.includes('sis')) return 'sis';
  if (d.includes('parçalı') || d.includes('az bulutlu')) return 'parcali';
  if (d.includes('bulutlu')) return 'bulut';
  if (d.includes('açık')) return 'gunes';
  return 'parcali';
}

function tanimlar(n) {
  return `<defs>
<radialGradient id="h${n}"><stop offset=".55" stop-color="#FFC233" stop-opacity=".45"/><stop offset="1" stop-color="#FFC233" stop-opacity="0"/></radialGradient>
<radialGradient id="g${n}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFE27A"/><stop offset=".6" stop-color="#FFC233"/><stop offset="1" stop-color="#FF9F1C"/></radialGradient>
<linearGradient id="b${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9D3EA"/></linearGradient>
<linearGradient id="k${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCE3F2"/><stop offset="1" stop-color="#8E9BB8"/></linearGradient>
</defs>`;
}

const gunes = (n, x = 32, y = 32, r = 15) =>
  `<circle cx="${x}" cy="${y}" r="${r * 1.7}" fill="url(#h${n})"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#g${n})"/>`;

const bulut = (n, dx = 0, dy = 0, renk = 'b') =>
  `<path transform="translate(${dx} ${dy})" d="M20 52h28a11 11 0 0 0 1.5-21.9A15 15 0 0 0 21 27.5 12.5 12.5 0 0 0 20 52z" fill="url(#${renk}${n})"/>`;

const damlalar = (renk = '#6FB6FF') =>
  `<g stroke="${renk}" stroke-width="3.2" stroke-linecap="round"><path d="M24 56l-3 6"/><path d="M34 56l-3 6"/><path d="M44 56l-3 6"/></g>`;

export function havaIkonu(durum, boyut = 64) {
  const n = ++sayac;
  const tur = havaTuru(durum);
  let ic = '';
  if (tur === 'gunes') ic = gunes(n, 32, 32, 16);
  else if (tur === 'parcali') ic = gunes(n, 40, 22, 12) + bulut(n, -4, 4);
  else if (tur === 'bulut') ic = bulut(n, 6, -6, 'k') + bulut(n, -4, 4);
  else if (tur === 'yagmur') ic = bulut(n, -2, -4, 'k') + damlalar();
  else if (tur === 'firtina') ic = bulut(n, -2, -4, 'k') + `<path d="M34 50l-6 9h6l-4 8 10-12h-6l4-5z" fill="#FFC233"/>`;
  else if (tur === 'kar') ic = bulut(n, -2, -4) + `<g fill="#fff"><circle cx="24" cy="58" r="2.6"/><circle cx="34" cy="61" r="2.6"/><circle cx="44" cy="58" r="2.6"/></g>`;
  else if (tur === 'sis') ic = bulut(n, -2, -8, 'k') + `<g stroke="#C9D3EA" stroke-width="3" stroke-linecap="round"><path d="M16 50h32"/><path d="M20 57h28"/></g>`;
  return `<svg class="hava-ikon" width="${boyut}" height="${boyut}" viewBox="0 0 64 68" aria-hidden="true">${tanimlar(n)}${ic}</svg>`;
}
