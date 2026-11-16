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

// Kategori ikonları
export const katIkon = {
  gundem: (b) => svg('<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 6a8 8 0 0 1 0 12"/>', b),
  siyaset: (b) => svg('<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M9 10V4h6v6"/><path d="M8 15h8"/>', b),
  asayis: (b) => svg('<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>', b),
  kaza: (b) => svg('<path d="M5 15v-4l2-5h10l2 5v4"/><rect x="3" y="15" width="18" height="3" rx="1"/><path d="M5 11h14"/><path d="M6 18v2M18 18v2"/>', b),
  belediye: (b) => svg('<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/>', b),
  ekonomi: (b) => svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', b),
  tarim: (b) => svg('<path d="M12 21v-9"/><path d="M12 12c0-4 3-7 8-7 0 5-3 7-8 7z"/><path d="M12 15c0-3-2-5-7-5 0 4 2 5 7 5z"/>', b),
  egitim: (b) => svg('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>', b),
  saglik: (b) => svg('<path d="M20.8 8.6a5 5 0 0 0-8.8-3.2A5 5 0 0 0 3.2 8.6C3.2 14 12 20 12 20s8.8-6 8.8-11.4z"/><path d="M7 12h3l1.5-2.5L13.5 14l1.5-2H17"/>', b),
  spor: (b) => svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8 20h8M10 17h4"/>', b),
  ulasim: (b) => svg('<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M8 18v2M16 18v2"/><path d="M8.5 14.5h.01M15.5 14.5h.01"/>', b),
  hava: (b) => svg('<path d="M7 19h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.4A3.3 3.3 0 0 0 7 19z"/><path d="M15 4v1M19.5 6.5l-.7.7M21 11h-1"/>', b),
  kultur: (b) => svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', b),
  genel: (b) => svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', b),
};
