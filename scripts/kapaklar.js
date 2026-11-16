// İlçe kapak çizimlerini üretir: public/gorsel/<ilce>.svg
// Çizimler tek renkli siluettir; sitede CSS maskesi olarak kullanılır ve haberin
// kategori rengine boyanır. Tamamen bize ait, telif sorunu yok.
// Kullanım: node scripts/kapaklar.js

import fs from 'node:fs';
import path from 'node:path';

const W = 400;
const Y = 160; // zemin
const f = (n) => Math.round(n * 10) / 10;

// ---- Yapı taşları ----
const uzak = (noktalar) => `<polygon points="0,${Y} ${noktalar} ${W},${Y}" fill-opacity=".28"/>`;
const orta = (noktalar) => `<polygon points="0,${Y} ${noktalar} ${W},${Y}" fill-opacity=".5"/>`;
const zemin = (h = 8) => `<rect x="0" y="${Y - h}" width="${W}" height="${h}"/>`;

function deniz(y = 140) {
  let d = `<rect x="0" y="${y}" width="${W}" height="${Y - y}" fill-opacity=".45"/>`;
  for (let i = 0; i < 3; i++) {
    const yy = y + 5 + i * 6;
    let p = `M0 ${yy}`;
    for (let x = 0; x < W; x += 24) p += ` q6 -3 12 0 t12 0`;
    d += `<path d="${p}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1.6"/>`;
  }
  return d;
}

function kule(x, w, h, dis = 4) {
  const ust = Y - h;
  let s = `<rect x="${x}" y="${ust}" width="${w}" height="${h}"/>`;
  const n = Math.max(2, Math.round(w / (dis * 2)));
  const aralik = w / (n * 2 - 1);
  for (let i = 0; i < n; i++) s += `<rect x="${f(x + i * 2 * aralik)}" y="${ust - dis}" width="${f(aralik)}" height="${dis}"/>`;
  return s;
}

function sur(x, w, h) {
  return kule(x, w, h, 3);
}

function kemer(x, w, h, aw, ah) {
  const cx = x + w / 2;
  return `<path fill-rule="evenodd" d="M${x} ${Y}V${Y - h}H${x + w}V${Y}Z M${cx - aw / 2} ${Y}V${Y - ah + aw / 2}A${aw / 2} ${aw / 2} 0 0 1 ${cx + aw / 2} ${Y - ah + aw / 2}V${Y}Z"/>`;
}

function palmiye(x, h, yon = 1, taban = Y) {
  const ust = taban - h;
  let s = `<path d="M${x - 2} ${taban}Q${x + yon * 6} ${taban - h / 2} ${x + yon * 4} ${ust}l4 0Q${x + yon * 10} ${taban - h / 2} ${x + 2} ${taban}Z"/>`;
  const tx = x + yon * 6;
  for (const [aci, boy] of [[-150, 26], [-115, 22], [-65, 22], [-30, 26], [-90, 18]]) {
    s += `<ellipse cx="${tx}" cy="${ust}" rx="${boy / 2}" ry="3.2" transform="rotate(${aci} ${tx} ${ust}) translate(${boy / 2} 0)"/>`;
  }
  return s;
}

function cam(x, h, taban = Y) {
  const w = h * 0.45;
  let s = `<rect x="${x - 1.5}" y="${taban - h * 0.18}" width="3" height="${h * 0.18}"/>`;
  for (let i = 0; i < 3; i++) {
    const y0 = taban - h * 0.15 - i * h * 0.27;
    const ww = w * (1 - i * 0.22);
    s += `<polygon points="${f(x - ww / 2)},${f(y0)} ${f(x + ww / 2)},${f(y0)} ${x},${f(y0 - h * 0.42)}"/>`;
  }
  return s;
}

function zeytin(x, h, taban = Y) {
  return `<path d="M${x - 3} ${taban}q2 -${h * 0.3} -2 -${h * 0.45}l3 -1q3 ${h * 0.2} 6 0l3 1q-4 ${h * 0.15} -2 ${h * 0.45}Z"/>
<ellipse cx="${x}" cy="${taban - h * 0.62}" rx="${h * 0.42}" ry="${h * 0.26}"/>
<ellipse cx="${x - h * 0.25}" cy="${taban - h * 0.5}" rx="${h * 0.22}" ry="${h * 0.16}"/>
<ellipse cx="${x + h * 0.27}" cy="${taban - h * 0.52}" rx="${h * 0.22}" ry="${h * 0.15}"/>`;
}

function sutun(x, h, w = 8, taban = Y) {
  return `<rect x="${x}" y="${taban - h}" width="${w}" height="${h}"/><rect x="${x - 2}" y="${taban - h - 4}" width="${w + 4}" height="4"/><rect x="${x - 2}" y="${taban - 3}" width="${w + 4}" height="3"/>`;
}

function ev(x, w, h, taban = Y) {
  return `<rect x="${x}" y="${taban - h}" width="${w}" height="${h}"/><polygon points="${x - 3},${taban - h} ${x + w / 2},${taban - h - w * 0.45} ${x + w + 3},${taban - h}"/>`;
}

function gokdelen(x, w, h, taban = Y) {
  return `<rect x="${x}" y="${taban - h}" width="${w}" height="${h}"/><rect x="${x + w / 2 - 1}" y="${taban - h - 16}" width="2" height="16"/><rect x="${x + 3}" y="${taban - h - 6}" width="${w - 6}" height="6"/>`;
}

function vinc(x, h) {
  const ust = Y - h;
  return `<rect x="${x}" y="${ust}" width="5" height="${h}"/><rect x="${x - 30}" y="${ust}" width="70" height="4"/><rect x="${x + 2}" y="${ust - 10}" width="2" height="10"/><path d="M${x + 3} ${ust - 10}L${x - 30} ${ust}M${x + 3} ${ust - 10}L${x + 40} ${ust}" stroke="#000" stroke-width="1.4"/><rect x="${x - 24}" y="${ust + 4}" width="1.4" height="${h * 0.35}"/>`;
}

function gemi(x, w, y = 138) {
  let s = `<polygon points="${x},${y} ${x + w},${y} ${x + w - 10},${y + 12} ${x + 8},${y + 12}"/>`;
  for (let i = 0; i < 5; i++) s += `<rect x="${x + 12 + i * (w - 30) / 5}" y="${y - 9 - (i % 2) * 7}" width="${(w - 30) / 5 - 2}" height="${9 + (i % 2) * 7}"/>`;
  s += `<rect x="${x + w - 18}" y="${y - 22}" width="10" height="22"/>`;
  return s;
}

function kopru(x, w, h, n = 4) {
  const aw = w / n;
  let d = `M${x} ${Y - h}H${x + w}V${Y}`;
  for (let i = n - 1; i >= 0; i--) {
    const sx = x + i * aw;
    d += `H${sx + aw - 4}V${Y - 4}A${aw / 2 - 4} ${h - 10} 0 0 0 ${sx + 4} ${Y - 4}`;
  }
  d += `H${x}Z`;
  return `<path d="${d}"/>`;
}

function muz(x, h, taban = Y) {
  let s = `<rect x="${x - 2}" y="${taban - h * 0.6}" width="4" height="${h * 0.6}"/>`;
  for (const [aci, boy] of [[-160, 30], [-120, 26], [-60, 26], [-20, 30]]) {
    s += `<ellipse cx="${x}" cy="${taban - h * 0.6}" rx="${boy / 2}" ry="5" transform="rotate(${aci} ${x} ${taban - h * 0.6}) translate(${boy / 2} 0)"/>`;
  }
  return s;
}

function tepe(cx, w, h, taban = Y) {
  return `<path d="M${cx - w / 2} ${taban}Q${cx} ${taban - h * 2} ${cx + w / 2} ${taban}Z"/>`;
}

// ---- İlçe sahneleri ----
const SAHNE = {
  mersin: () =>
    uzak('0,105 60,80 120,98 190,70 260,95 330,72 400,92') + deniz(142) +
    gokdelen(70, 26, 120, 142) + gokdelen(104, 18, 78, 142) + gokdelen(130, 22, 92, 142) + gokdelen(160, 16, 64, 142) +
    gokdelen(250, 20, 70, 142) + gokdelen(276, 16, 54, 142) +
    palmiye(205, 70, 1, 142) + palmiye(225, 56, -1, 142) + palmiye(320, 66, -1, 142) + palmiye(345, 50, 1, 142) +
    `<rect x="0" y="138" width="${W}" height="4"/>`,
  // Mersin geneli için ek çeşitler (ilçesi belli olmayan haberler çok olduğu için)
  mersin2: () =>
    uzak('0,100 100,80 200,98 300,76 400,94') + deniz(132) +
    [60, 120, 250, 320].map((x, i) => `<polygon points="${x},126 ${x + 46},126 ${x + 40},134 ${x + 6},134"/><rect x="${x + 21}" y="${74 + (i % 2) * 10}" width="2.5" height="${52 - (i % 2) * 10}"/><polygon points="${x + 25},${76 + (i % 2) * 10} ${x + 25},122 ${x + 44},122"/><polygon points="${x + 19},${82 + (i % 2) * 10} ${x + 19},122 ${x + 4},122"/>`).join('') +
    palmiye(190, 74, 1, 132) + palmiye(212, 60, -1, 132) + `<rect x="160" y="130" width="80" height="4"/>`,
  mersin3: () =>
    uzak('0,96 120,74 240,94 400,78') + orta('0,124 140,108 280,122 400,110') + zemin(10) +
    `<rect x="186" y="58" width="28" height="92"/><polygon points="180,58 200,34 220,58"/><circle cx="200" cy="78" r="9" fill-opacity=".35"/><rect x="176" y="146" width="48" height="6"/>` +
    zeytin(70, 54) + zeytin(118, 44) + palmiye(290, 70, -1, 150) + palmiye(330, 56, 1, 150) + ev(360, 26, 20, 150),
  akdeniz: () =>
    uzak('0,110 80,88 150,104 230,84 320,100 400,86') + deniz(142) +
    vinc(80, 110) + vinc(170, 96) + gemi(220, 120, 130) + `<rect x="0" y="138" width="200" height="4"/>`,
  yenisehir: () =>
    uzak('0,100 90,78 170,96 250,74 330,94 400,80') + deniz(144) +
    gokdelen(150, 30, 128, 144) + gokdelen(188, 18, 80, 144) + gokdelen(118, 20, 70, 144) +
    palmiye(60, 72, 1, 144) + palmiye(86, 58, -1, 144) + palmiye(270, 70, -1, 144) + palmiye(300, 54, 1, 144) +
    `<rect x="0" y="140" width="${W}" height="4"/>`,
  mezitli: () =>
    uzak('0,106 80,86 160,100 250,82 330,98 400,86') + deniz(146) + `<rect x="0" y="140" width="${W}" height="6"/>` +
    [70, 100, 130, 160, 190, 220, 250, 280].map((x, i) => sutun(x, i % 3 === 2 ? 48 : 78 - (i % 2) * 6, 10, 140)).join('') +
    palmiye(340, 66, -1, 140),
  toroslar: () =>
    uzak('0,90 50,60 100,82 150,40 200,76 250,48 300,80 350,52 400,74') +
    orta('0,130 70,104 140,122 210,96 290,120 360,100 400,112') +
    [30, 52, 74, 300, 322, 346, 368].map((x, i) => cam(x, 46 + (i % 3) * 10)).join('') + zemin(6),
  tarsus: () =>
    uzak('0,104 90,84 180,100 270,80 400,98') + zemin(8) +
    kemer(150, 100, 112, 44, 84) + `<rect x="144" y="44" width="112" height="8"/>` +
    palmiye(80, 70, 1) + palmiye(310, 64, -1) + ev(30, 26, 22) + ev(340, 30, 26),
  erdemli: () =>
    uzak('0,96 70,76 140,92 400,90') + deniz(134) +
    `<ellipse cx="250" cy="136" rx="80" ry="8"/>` +
    sur(190, 120, 34).replace(/y="(\d+)"/g, (m, v) => `y="${Number(v) - 22}"`) +
    kule(206, 22, 70).replace(/y="(\d+)"/g, (m, v) => `y="${Number(v) - 22}"`) +
    kule(272, 22, 64).replace(/y="(\d+)"/g, (m, v) => `y="${Number(v) - 22}"`) +
    kule(40, 26, 50).replace(/y="(\d+)"/g, (m, v) => `y="${Number(v) - 26}"`) + `<rect x="0" y="130" width="90" height="4"/>`,
  silifke: () =>
    uzak('0,108 100,88 200,104 300,86 400,100') +
    tepe(140, 260, 46) +
    kule(96, 22, 92) + sur(118, 50, 74) + kule(168, 20, 98) + sur(188, 44, 72) +
    kopru(250, 130, 30, 4) + zemin(6),
  anamur: () =>
    uzak('0,100 80,84 160,98 400,94') + deniz(148) + `<rect x="0" y="142" width="${W}" height="6"/>` +
    [60, 120, 180, 240, 300].map((x, i) => kule(x, 24, 76 - (i % 2) * 14, 5).replace(/y="(\d+)"/g, (m, v) => `y="${Number(v) - 18}"`)).join('') +
    `<rect x="70" y="${Y - 18 - 52}" width="250" height="52"/>` + muz(30, 60, 142) + muz(370, 54, 142),
  bozyazi: () =>
    uzak('0,92 70,70 140,90 210,66 280,88 400,74') + deniz(146) + `<rect x="0" y="140" width="${W}" height="6"/>` +
    [40, 80, 120, 160].map((x, i) => muz(x, 58 + (i % 2) * 10, 140)).join('') +
    tepe(300, 110, 30, 140) + kule(284, 16, 52).replace(/y="(\d+)"/g, (m, v) => `y="${Number(v) - 46}"`) + sur(300, 26, 40).replace(/y="(\d+)"/g, (m, v) => `y="${Number(v) - 46}"`),
  aydincik: () =>
    uzak('0,94 100,70 200,92 300,72 400,90') + orta('0,128 120,108 240,124 400,112') + deniz(138) +
    `<polygon points="150,132 230,132 220,142 160,142"/><rect x="186" y="96" width="3" height="36"/><polygon points="190,98 190,128 222,128"/>` +
    ev(40, 24, 18, 132) + ev(70, 20, 16, 132) + ev(300, 26, 18, 132) + `<rect x="0" y="132" width="110" height="6"/><rect x="290" y="132" width="110" height="6"/>`,
  gulnar: () =>
    uzak('0,86 60,58 130,80 200,50 270,78 340,56 400,76') + orta('0,130 100,106 200,126 300,104 400,122') +
    ev(150, 30, 26) + ev(186, 24, 20) + ev(214, 32, 28) + cam(110, 56) + cam(260, 60) + cam(285, 46) + zeytin(340, 44) + zemin(6),
  mut: () =>
    uzak('0,98 80,74 170,94 260,70 350,92 400,80') +
    tepe(300, 180, 40) + kule(280, 18, 80) + sur(298, 46, 66) +
    [40, 95, 150, 205].map((x, i) => zeytin(x, 52 + (i % 2) * 8)).join('') + zemin(6),
  camliyayla: () =>
    uzak('0,80 70,46 140,72 210,36 280,66 350,40 400,60') +
    [20, 44, 68, 92, 250, 274, 298, 322, 346, 372].map((x, i) => cam(x, 60 + (i % 3) * 12)).join('') +
    ev(140, 34, 28) + ev(182, 26, 22) + zemin(6),
  genel: () =>
    `<circle cx="200" cy="96" r="58" fill-opacity=".55"/>` +
    `<path d="M150 70q20 8 30 -2t30 6q10 14 -6 22t-26 -4q-14 4 -28 -6z M218 110q16 -6 26 4t-4 22q-12 6 -20 -8z M168 120q12 2 10 14t-14 4z"/>` +
    `<ellipse cx="200" cy="96" rx="58" ry="20" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="2"/>` +
    zemin(4),
};

const klasor = path.resolve('public/gorsel');
fs.mkdirSync(klasor, { recursive: true });
for (const [ad, sahne] of Object.entries(SAHNE)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Y}" preserveAspectRatio="xMidYMax slice">${sahne()}</svg>\n`;
  fs.writeFileSync(path.join(klasor, `${ad}.svg`), svg);
}
console.log(`${Object.keys(SAHNE).length} kapak çizimi → public/gorsel/`);
