const svg = (ic, boyut = 24, ek = '') =>
  `<svg width="${boyut}" height="${boyut}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${ek}>${ic}</svg>`;

export const ikon = {
  ara: (b) => svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', b),
  konum: (b) => svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', b),
  asagi: (b) => svg('<path d="M6 9l6 6 6-6"/>', b),
  ok: (b) => svg('<path d="M7 17L17 7M9 7h8v8"/>', b),
  gunes: (b) => svg('<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>', b),
  eczane: (b) => svg('<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/>', b),
  damla: (b) => svg('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', b),
  simsek: (b) => svg('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>', b),
  deprem: (b) => svg('<path d="M2 12h4l3-7 4 14 3-7h6"/>', b),
  ev: (b) => svg('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', b),
  menu: (b) => svg('<path d="M4 7h16M4 12h16M4 17h16"/>', b),
};

export const logoIsaret = (boyut = 44, kare = '#1E66F5') =>
  `<svg width="${boyut}" height="${boyut}" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="13" fill="${kare}"/><path d="M8 31 C14 24 19 24 24 30 S34 37 40 30" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="34" cy="15" r="5.5" fill="#FF8A1F"/></svg>`;
