// Milli maçlarda ülke bayrakları: Türkçe ülke adı → ISO kodu (bayraklar flagcdn.com'dan indirilir, public/bayrak/)
export const ULKE_KOD = {
  'türkiye': 'tr', 'belçika': 'be', 'italya': 'it', 'fransa': 'fr', 'abd': 'us', 'amerika birleşik devletleri': 'us', 'paraguay': 'py', 'avustralya': 'au',
  'almanya': 'de', 'ispanya': 'es', 'portekiz': 'pt', 'hollanda': 'nl', 'ingiltere': 'gb-eng', 'iskoçya': 'gb-sct', 'galler': 'gb-wls', 'kuzey irlanda': 'gb-nir',
  'irlanda': 'ie', 'gürcistan': 'ge', 'ermenistan': 'am', 'azerbaycan': 'az', 'yunanistan': 'gr', 'bulgaristan': 'bg', 'romanya': 'ro', 'macaristan': 'hu',
  'polonya': 'pl', 'çekya': 'cz', 'çek cumhuriyeti': 'cz', 'slovakya': 'sk', 'slovenya': 'si', 'hırvatistan': 'hr', 'sırbistan': 'rs', 'bosna hersek': 'ba',
  'bosna-hersek': 'ba', 'karadağ': 'me', 'arnavutluk': 'al', 'kuzey makedonya': 'mk', 'kosova': 'xk', 'avusturya': 'at', 'isviçre': 'ch', 'danimarka': 'dk',
  'isveç': 'se', 'norveç': 'no', 'finlandiya': 'fi', 'izlanda': 'is', 'estonya': 'ee', 'letonya': 'lv', 'litvanya': 'lt', 'ukrayna': 'ua', 'rusya': 'ru',
  'belarus': 'by', 'beyaz rusya': 'by', 'moldova': 'md', 'kazakistan': 'kz', 'lüksemburg': 'lu', 'malta': 'mt', 'kıbrıs': 'cy', 'güney kıbrıs': 'cy',
  'faroe adaları': 'fo', 'cebelitarık': 'gi', 'andorra': 'ad', 'san marino': 'sm', 'lihtenştayn': 'li', 'israil': 'il', 'brezilya': 'br', 'arjantin': 'ar',
  'uruguay': 'uy', 'kolombiya': 'co', 'şili': 'cl', 'peru': 'pe', 'ekvador': 'ec', 'meksika': 'mx', 'kanada': 'ca', 'japonya': 'jp', 'güney kore': 'kr',
  'katar': 'qa', 'suudi arabistan': 'sa', 'iran': 'ir', 'irak': 'iq', 'mısır': 'eg', 'fas': 'ma', 'tunus': 'tn', 'cezayir': 'dz', 'senegal': 'sn',
  'nijerya': 'ng', 'gana': 'gh', 'kamerun': 'cm', 'fildişi sahili': 'ci', 'güney afrika': 'za', 'venezuela': 've', 'bolivya': 'bo', 'panama': 'pa',
  'kosta rika': 'cr', 'jamaika': 'jm', 'yeni zelanda': 'nz', 'çin': 'cn', 'özbekistan': 'uz', 'birleşik arap emirlikleri': 'ae', 'ürdün': 'jo',
};
export const ulkeKodu = (ad) => ULKE_KOD[String(ad || '').trim().toLocaleLowerCase('tr-TR')] || null;
