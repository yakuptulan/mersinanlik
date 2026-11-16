// Bölüm kapakları: sayfanın üst alanına bölüme özel arka plan ve hareketli çizim
// (spor → çim saha ve top, ekonomi → yükselen grafik, hava → bulutlar ...)

const S = (ic) => `<svg class="tema-svg" viewBox="0 0 520 240" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">${ic}</svg>`;

const SAHNELER = {
  spor: S(`<g fill="none" stroke="rgba(255,255,255,.45)" stroke-width="3"><rect x="40" y="20" width="460" height="200" rx="4"/><line x1="270" y1="20" x2="270" y2="220"/><circle cx="270" cy="120" r="46"/><rect x="420" y="70" width="80" height="100"/><rect x="465" y="95" width="35" height="50"/></g>
<g class="t-top"><circle cx="0" cy="0" r="22" fill="#fff"/><path d="M0-9l8.5 6-3.2 10h-10.6L-8.5-3z" fill="#0a1530"/><path d="M0-22v13M8.5-3l12-4M5.3 7l7 11M-5.3 7l-7 11M-8.5-3l-12-4" stroke="#0a1530" stroke-width="2"/></g>`),
  ekonomi: S(`<g stroke="rgba(255,255,255,.18)" stroke-width="1">${[60, 100, 140, 180].map((y) => `<line x1="20" y1="${y}" x2="510" y2="${y}"/>`).join('')}</g>
<polyline class="t-ciz" points="20,190 90,170 150,180 210,130 270,145 330,95 390,110 450,55 505,40" fill="none" stroke="#ffd23f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<g class="t-yuzen"><circle cx="455" cy="170" r="22" fill="#ffd23f"/><text x="455" y="178" text-anchor="middle" font-size="22" font-weight="800" fill="#8a5a00">₺</text></g>
<g class="t-yuzen g2"><circle cx="390" cy="200" r="15" fill="#ffe27a"/></g>`),
  asayis: S(`<circle class="t-isik k" cx="380" cy="110" r="90" fill="#ff2d3b"/><circle class="t-isik m" cx="470" cy="110" r="90" fill="#2d6bff"/>
<path d="M400 60l40 16v30c0 26-17 44-40 52-23-8-40-26-40-52V76z" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.6)" stroke-width="3"/>`),
  kaza: S(`<path d="M300 240L380 0h40l80 240z" fill="rgba(0,0,0,.25)"/><g class="t-serit">${[0, 1, 2, 3, 4].map((i) => `<rect x="396" y="${i * 60 - 40}" width="8" height="34" rx="3" fill="#ffd23f"/>`).join('')}</g>`),
  ulasim: S(`<path d="M260 240L370 0h60l90 240z" fill="rgba(0,0,0,.22)"/><g class="t-serit">${[0, 1, 2, 3, 4].map((i) => `<rect x="396" y="${i * 60 - 40}" width="8" height="34" rx="3" fill="#fff"/>`).join('')}</g>`),
  belediye: S(`<g fill="rgba(255,255,255,.16)">${[[250, 90, 40], [295, 60, 50], [350, 110, 36], [390, 40, 54], [450, 80, 44], [498, 120, 30]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${240 - y}" rx="3"/>`).join('')}</g>
<g class="t-pencere" fill="#ffd23f">${[[260, 110], [305, 80], [320, 120], [400, 60], [420, 100], [460, 100], [470, 140], [360, 140], [405, 150], [310, 170]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="8" height="10" style="--g:${i * 0.4}s"/>`).join('')}</g>`),
  gundem: S(`<g fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3">${[40, 80, 120].map((r, i) => `<circle class="t-dalga" cx="430" cy="120" r="${r}" style="--g:${i * 0.8}s"/>`).join('')}</g><circle cx="430" cy="120" r="14" fill="#fff"/>`),
  siyaset: S(`<g fill="none" stroke="rgba(255,255,255,.3)" stroke-width="3">${[40, 80, 120].map((r, i) => `<circle class="t-dalga" cx="430" cy="120" r="${r}" style="--g:${i * 0.8}s"/>`).join('')}</g><rect x="405" y="100" width="50" height="44" rx="6" fill="rgba(255,255,255,.85)"/><rect x="418" y="86" width="24" height="22" fill="rgba(255,255,255,.6)"/>`),
  tarim: S(`<circle class="t-gunes" cx="440" cy="60" r="34" fill="#ffd23f"/><g fill="rgba(0,60,0,.25)">${[0, 1, 2, 3].map((i) => `<path d="M220 ${170 + i * 18}Q370 ${150 + i * 18} 520 ${170 + i * 18}V240H220z"/>`).join('')}</g>
<g class="t-yuzen"><circle cx="330" cy="120" r="16" fill="#ff8a1f"/><path d="M330 104q6-10 14-8" stroke="#2b7a2b" stroke-width="3" fill="none"/></g><g class="t-yuzen g2"><circle cx="372" cy="138" r="13" fill="#ffb02e"/></g>`),
  egitim: S(`<g class="t-yuzen"><path d="M360 70l70-32 70 32-70 32z" fill="rgba(255,255,255,.85)"/><path d="M385 84v34c25 16 65 16 90 0V84l-45 20z" fill="rgba(255,255,255,.55)"/></g>
<g class="t-harf" fill="rgba(255,255,255,.35)" font-size="34" font-weight="800"><text x="260" y="90">A</text><text x="300" y="190" style="--g:1s">+</text><text x="470" y="200" style="--g:2s">π</text><text x="230" y="170" style="--g:1.5s">?</text></g>`),
  saglik: S(`<polyline class="t-ciz" points="200,130 300,130 320,130 340,80 365,180 390,100 405,130 520,130" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<g class="t-yuzen" fill="rgba(255,255,255,.3)"><path d="M440 40h16v16h16v16h-16v16h-16v-16h-16v-16h16z"/></g>`),
  hava: S(`<g class="t-gunes-don"><circle cx="440" cy="80" r="40" fill="#ffd23f"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="436" y="18" width="8" height="18" rx="4" fill="#ffd23f" transform="rotate(${a} 440 80)"/>`).join('')}</g>
<g class="t-bulut"><path d="M300 150a26 26 0 0 1 48-12 22 22 0 0 1 40 14 18 18 0 0 1-4 36H310a20 20 0 0 1-10-38z" fill="#fff"/></g><g class="t-bulut b2"><path d="M420 180a20 20 0 0 1 36-9 16 16 0 0 1 30 11 13 13 0 0 1-3 26h-56a15 15 0 0 1-7-28z" fill="rgba(255,255,255,.75)"/></g>`),
  kultur: S(`<path class="t-spot" d="M380 0l-70 240h140z" fill="rgba(255,255,255,.14)"/><path class="t-spot s2" d="M470 0l-60 240h120z" fill="rgba(255,210,63,.16)"/>
<g class="t-konfeti">${[[300, 40, '#ffd23f'], [350, 90, '#fff'], [420, 30, '#ff8a1f'], [480, 70, '#fff'], [330, 160, '#ffd23f'], [500, 150, '#ff8a1f']].map(([x, y, c], i) => `<rect x="${x}" y="${y}" width="10" height="5" rx="2" fill="${c}" style="--g:${i * 0.5}s"/>`).join('')}</g>`),
  deprem: S(`<polyline class="t-ciz" points="180,120 280,120 300,120 315,70 330,175 345,40 360,200 375,90 390,140 400,120 520,120" fill="none" stroke="#e9d5ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`),
  kesinti: S(`<g class="t-damla" fill="rgba(255,255,255,.75)">${[[340, 0], [400, 1], [460, 2]].map(([x, i]) => `<path d="M${x} 30s14 16 14 26a14 14 0 0 1-28 0c0-10 14-26 14-26z" style="--g:${i * 0.6}s"/>`).join('')}</g>
<path class="t-simsek" d="M480 100l-36 60h26l-10 50 40-66h-26l12-44z" fill="#ffd23f"/>`),
  namaz: S(`<g fill="rgba(255,255,255,.15)"><path d="M330 240v-80a50 50 0 0 1 100 0v80z"/><rect x="300" y="110" width="10" height="130"/><rect x="450" y="110" width="10" height="130"/><path d="M296 110l9-30 9 30zM446 110l9-30 9 30z"/></g>
<path d="M470 40a34 34 0 1 0 22 60 28 28 0 1 1-22-60z" fill="#ffd23f"/><g class="t-yildiz" fill="#fff">${[[250, 40], [300, 70], [380, 30], [420, 80], [230, 110]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.5" style="--g:${i * 0.5}s"/>`).join('')}</g>`),
  yakit: S(`<g fill="rgba(255,255,255,.85)"><rect x="380" y="60" width="70" height="140" rx="10"/><rect x="392" y="74" width="46" height="40" rx="6" fill="rgba(0,0,0,.25)"/><rect x="370" y="196" width="90" height="12" rx="4"/></g>
<path d="M450 90h18l14 18v60a10 10 0 0 1-20 0v-30" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="7" stroke-linecap="round"/>
<g class="t-ibre"><line x1="415" y1="108" x2="415" y2="82" stroke="#ffd23f" stroke-width="4" stroke-linecap="round"/></g>`),
  bilgi: S(`<g class="t-yuzen"><circle cx="430" cy="100" r="44" fill="#ffd23f" opacity=".95"/><rect x="414" y="140" width="32" height="26" rx="6" fill="rgba(255,255,255,.85)"/><circle class="t-isik k" cx="430" cy="100" r="80" fill="#ffd23f" opacity=".25"/></g>
<g class="t-harf" fill="rgba(255,255,255,.35)" font-size="40" font-weight="800"><text x="300" y="80">?</text><text x="350" y="200" style="--g:1s">!</text><text x="490" y="190" style="--g:2s">?</text></g>`),
  burc: S(`<g class="t-yildiz" fill="#fff">${[[260, 50], [300, 120], [340, 70], [390, 150], [430, 60], [470, 120], [500, 40], [230, 170]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3" style="--g:${i * 0.4}s"/>`).join('')}</g><polyline points="260,50 340,70 430,60 470,120 390,150 300,120" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>`),
  sehir: S(`<path d="M400 150l10-30h30l8 20 14-6 6 16z" fill="rgba(255,255,255,.4)"/><rect x="408" y="100" width="12" height="22" fill="rgba(255,255,255,.4)"/><rect x="430" y="96" width="12" height="26" fill="rgba(255,255,255,.4)"/>
<g class="t-dalga-yatay" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="4" stroke-linecap="round">${[160, 185, 210].map((y) => `<path d="M180 ${y}q20-12 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0"/>`).join('')}</g>`),
  dunya: S(`<g class="t-gunes-don yavas" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"><circle cx="430" cy="120" r="80"/><ellipse cx="430" cy="120" rx="35" ry="80"/><ellipse cx="430" cy="120" rx="65" ry="80"/><line x1="350" y1="120" x2="510" y2="120"/><path d="M362 80h136M362 160h136"/></g>`),
};

// Bölüm renkleri (üst alan arka planı)
const RENKLER = {
  spor: ['#0f5132', '#1f8f4e'], ekonomi: ['#5c3d00', '#b7791f'], asayis: ['#0b1020', '#27304a'], kaza: ['#5a1f00', '#c2410c'], ulasim: ['#053b4a', '#0797b9'],
  belediye: ['#062a5c', '#0588f0'], gundem: ['#3b0a0c', '#b4232a'], siyaset: ['#2e1065', '#7c3aed'], tarim: ['#1f4d0f', '#5ba82b'], egitim: ['#2a1a6b', '#6e56cf'],
  saglik: ['#04403a', '#12a594'], hava: ['#0b3b78', '#3e8ede'], kultur: ['#4a0a33', '#d6409f'], deprem: ['#2e1065', '#9333ea'], kesinti: ['#5a2600', '#f97316'],
  namaz: ['#062c2a', '#0f766e'], yakit: ['#4a2c00', '#d97706'], bilgi: ['#2a0f4f', '#8e4ec6'], burc: ['#120a33', '#4c1d95'], sehir: ['#062a5c', '#0e7490'], dunya: ['#111827', '#475569'],
};

export function temaBul(yol) {
  const k = yol.match(/^\/kategori\/([a-z-]+)\//)?.[1];
  if (k) return k === 'turkiye-dunya' ? 'dunya' : k === 'tum-haberler' ? 'gundem' : k;
  const tablo = [[/^\/spor\//, 'spor'], [/^\/piyasalar\//, 'ekonomi'], [/^\/hava-durumu\//, 'hava'], [/^\/deprem\//, 'deprem'], [/^\/nobetci-eczane\//, 'saglik'], [/^\/kesintiler\//, 'kesinti'], [/^\/namaz-vakitleri\//, 'namaz'], [/^\/akaryakit-fiyatlari\//, 'yakit'], [/^\/bilgi\//, 'bilgi'], [/^\/etkinlikler\//, 'kultur'], [/^\/burclar\//, 'burc'], [/^\/(rehber|tatil-takvimi)\//, 'sehir'], [/^\/ilce\//, 'sehir'], [/^\/ilceler\//, 'sehir']];
  return tablo.find(([d]) => d.test(yol))?.[1] || null;
}

export function temaSahnesi(tema) {
  if (!tema || !SAHNELER[tema]) return { sinif: '', sahne: '', stil: '' };
  const [r1, r2] = RENKLER[tema];
  return { sinif: ` tema tema-${tema}`, sahne: `<div class="tema-sahne">${SAHNELER[tema]}</div>`, stil: ` style="--t1:${r1};--t2:${r2}"` };
}
