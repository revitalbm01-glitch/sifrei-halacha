// Builds public/data/kitzur.json (see docs/schema.md) from the Sefaria API.
import { mkdir, writeFile } from 'node:fs/promises';

const API = 'https://www.sefaria.org/api';
const BOOK = 'Kitzur_Shulchan_Arukh';
const VERSION = 'Torat Emet 357'; // Hebrew, Public Domain
const CHUNK = 20; // simanim per request
const OUT = new URL('../public/data/kitzur.json', import.meta.url);

async function getJson(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i >= tries) throw new Error(`${url}: ${err.message}`);
      await new Promise(r => setTimeout(r, 1000 * i));
    }
  }
}

const cleanText = s =>
  s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// "[סימן א] דיני השכמת הבקר\n" -> "דיני השכמת הבקר"
const cleanTitle = s => s.replace(/^\[[^\]]*\]\s*/, '').trim();

const index = await getJson(`${API}/v2/raw/index/${BOOK}`);
const titles = index.alt_structs.Topic.nodes.map(n =>
  cleanTitle(n.titles.find(t => t.lang === 'he').text));
const total = index.schema.lengths[0];
if (titles.length !== total) throw new Error(`expected ${total} titles, got ${titles.length}`);

const simanim = [];
for (let from = 1; from <= total; from += CHUNK) {
  const to = Math.min(from + CHUNK - 1, total);
  const ref = from === to ? `${BOOK}.${from}` : `${BOOK}.${from}-${to}`;
  const data = await getJson(`${API}/v3/texts/${ref}?version=${encodeURIComponent(`hebrew|${VERSION}`)}`);
  const text = data.versions[0].text;
  const chunk = from === to ? [text] : text;
  chunk.forEach((seifim, i) => {
    const number = from + i;
    simanim.push({ number, title: titles[number - 1], seifim: seifim.map(cleanText).filter(Boolean) });
  });
  process.stdout.write(`\rסימנים ${from}-${to} מתוך ${total}`);
}

const seifCount = simanim.reduce((n, s) => n + s.seifim.length, 0);
const book = {
  title: 'קיצור שולחן ערוך',
  source: { name: 'Sefaria', version: VERSION, license: 'Public Domain', url: `https://www.sefaria.org/${BOOK}` },
  simanim,
};
await mkdir(new URL('.', OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(book));
console.log(`\nנשמרו ${simanim.length} סימנים, ${seifCount} סעיפים`);
