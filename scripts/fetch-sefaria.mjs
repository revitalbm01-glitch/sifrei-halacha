// Builds the Kitzur Shulchan Arukh book (docs/schema.md) from the Sefaria API.
import { hebrewNumber } from '../src/hebrew.js';
import { KITZUR_TOPICS, expandTopic } from './kitzur-topics.mjs';
import { writeBook } from './write-book.mjs';

const API = 'https://www.sefaria.org/api';
const BOOK = 'Kitzur_Shulchan_Arukh';
const VERSION = 'Torat Emet 357'; // Hebrew, Public Domain
const CHUNK = 20; // simanim per request

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

const simanim = new Map();
for (let from = 1; from <= total; from += CHUNK) {
  const to = Math.min(from + CHUNK - 1, total);
  const ref = from === to ? `${BOOK}.${from}` : `${BOOK}.${from}-${to}`;
  const data = await getJson(`${API}/v3/texts/${ref}?version=${encodeURIComponent(`hebrew|${VERSION}`)}`);
  const text = data.versions[0].text;
  (from === to ? [text] : text).forEach((seifim, i) => {
    const number = from + i;
    simanim.set(number, {
      label: hebrewNumber(number),
      title: titles[number - 1],
      seifim: seifim.map(cleanText).filter(Boolean).map((t, j) => ({ label: hebrewNumber(j + 1), text: t })),
    });
  });
  process.stdout.write(`\rסימנים ${from}-${to} מתוך ${total}`);
}
process.stdout.write('\n');

const topics = KITZUR_TOPICS.map(expandTopic);
const used = topics.flatMap(t => t.numbers).sort((a, b) => a - b);
if (used.length !== total || used.some((n, i) => n !== i + 1)) {
  throw new Error('kitzur-topics.mjs must list every siman exactly once');
}

await writeBook({
  id: 'kitzur-shulchan-arukh',
  title: 'קיצור שולחן ערוך',
  author: 'רבי שלמה גאנצפריד',
  source: { name: 'Sefaria', url: `https://www.sefaria.org/${BOOK}`, license: 'Public Domain' },
  parts: [{
    title: '',
    topics: topics.map(t => ({ title: t.title, simanim: t.numbers.map(n => simanim.get(n)) })),
  }],
});
