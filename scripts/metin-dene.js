// Güçlü metin modelini (Vertex) tek bir haberle dener; siteye yazmaz.
import fs from 'node:fs';
import { topluOzetle } from '../src/lib/gemini.js';
const h = JSON.parse(fs.readFileSync('data/haberler.json', 'utf8')).hikayeler.find((x) => x.metin && x.durum === 'yayinda' && !x.genel);
const sonuc = await topluOzetle([`${h.baslik}\n${h.metin}`]);
console.log('BAŞLIK:', h.baslik);
console.log('SONUÇ:', JSON.stringify(sonuc).slice(0, 900));
console.log('HARCAMA:', fs.readFileSync('data/harcama.json', 'utf8').replace(/\s+/g, ' '));
