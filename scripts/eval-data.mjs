// Evaluates the generated books under public/data/ (docs/schema.md):
// structure, text quality, expected counts per book, and known text samples.
// Exits with code 1 if anything fails, so CI stops before publishing.
import { readFile, stat } from 'node:fs/promises';
import { stripNiqqud } from '../src/hebrew.js';

const DATA = new URL('../public/data/', import.meta.url);
const MAX_TOPIC_BYTES = 2_000_000;

// Update these only after checking a source change by hand
const EXPECTED = {
  'yalkut-yosef': {
    parts: ['אורח חיים', 'יורה דעה', 'חושן משפט', 'אבן העזר'],
    topics: 87, simanim: 1050, seifim: 14361,
    samples: [
      { topic: 'הלכות ציצית', siman: 'ח', seif: 'א', startsWith: 'מצות עשה מן התורה' },
      { topic: 'הלכות שבת', siman: 'שח, שיא', titleIncludes: 'מוקצה' },
      { topic: 'הלכות שבת', siman: 'רמב', titleIncludes: 'כבוד שבת' },
      { topic: 'הלכות בשר בחלב', anySimanTitleIncludes: 'בשר' },
    ],
  },
  'kitzur-shulchan-arukh': {
    parts: [''],
    topics: 29, simanim: 221, seifim: 2765,
    samples: [
      { topic: 'הנהגת הבוקר', siman: 'א', seif: 'א', includes: 'שויתי' },
      { topic: 'שבת', siman: 'פח', titleIncludes: 'מקצה בשבת' },
      { topic: 'חנוכה ופורים', siman: 'קלט', titleIncludes: 'חנכה' },
    ],
  },
};

const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);
const readJson = async path => JSON.parse(await readFile(new URL(path, DATA), 'utf8'));
const plain = s => stripNiqqud(s ?? '');

const books = await readJson('books.json');
const report = [];

for (const book of books) {
  const where = book.id;
  if (!book.title || !book.source?.name || !book.source?.url || !book.source?.license) {
    fail(where, 'books.json entry is missing title or source name/url/license');
  }
  const expected = EXPECTED[book.id];
  if (!expected) fail(where, 'no expectations defined in eval-data.mjs');

  const index = await readJson(`${book.id}/index.json`);
  const topics = index.parts.flatMap(p => p.topics);
  const loaded = new Map();
  let simanim = 0, seifim = 0, largest = 0;

  topics.forEach((t, i) => {
    if (t.n !== i + 1) fail(where, `topic numbers are not 1..N (position ${i + 1} has n=${t.n})`);
  });

  for (const t of topics) {
    const file = `${book.id}/topics/${t.n}.json`;
    let data;
    try {
      data = await readJson(file);
      largest = Math.max(largest, (await stat(new URL(file, DATA))).size);
    } catch (err) {
      fail(file, `cannot read (${err.message})`);
      continue;
    }
    loaded.set(t.title, data);
    if (data.n !== t.n || data.title !== t.title) fail(file, 'n/title differ from index.json');
    if (data.simanim.length !== t.simanim.length) fail(file, 'siman count differs from index.json');
    if (!data.simanim.length) fail(file, 'topic has no simanim');

    data.simanim.forEach((s, i) => {
      const at = `${file} siman #${i + 1} (${s.label || s.title.slice(0, 20)})`;
      const meta = t.simanim[i];
      if (meta && (meta.label !== s.label || meta.title !== s.title || meta.seifCount !== s.seifim.length)) {
        fail(at, 'label/title/seifCount differ from index.json');
      }
      if (!s.title) fail(at, 'empty title');
      if (/['"״׳]$/.test(s.label)) fail(at, `label ends with a quote mark: ${s.label}`);
      if (!s.seifim.length) fail(at, 'no seifim');
      simanim++;
      s.seifim.forEach((f, j) => {
        seifim++;
        const fat = `${at} seif #${j + 1}`;
        if (!f.text || f.text.trim().length < 3) fail(fat, 'empty or near-empty text');
        if (/<[a-z/][^>]*>/i.test(f.text)) fail(fat, 'HTML tag left in text');
        if (/&[a-z]+;|&#\d+;/i.test(f.text)) fail(fat, 'HTML entity left in text');
        if (f.text.includes("''")) fail(fat, 'two apostrophes instead of gershayim');
      });
    });
  }

  if (largest > MAX_TOPIC_BYTES) fail(where, `largest topic file is ${largest} bytes (limit ${MAX_TOPIC_BYTES})`);

  if (expected) {
    const partTitles = index.parts.map(p => p.title);
    if (JSON.stringify(partTitles) !== JSON.stringify(expected.parts)) {
      fail(where, `parts are ${JSON.stringify(partTitles)}, expected ${JSON.stringify(expected.parts)}`);
    }
    for (const key of ['topics', 'simanim', 'seifim']) {
      const actual = { topics: topics.length, simanim, seifim }[key];
      if (actual !== expected[key]) fail(where, `${key}: ${actual}, expected ${expected[key]}`);
    }
    for (const sample of expected.samples) {
      const at = `${where} sample ${JSON.stringify(sample)}`;
      const topic = loaded.get(sample.topic);
      if (!topic) { fail(at, 'topic not found'); continue; }
      if (sample.anySimanTitleIncludes) {
        if (!topic.simanim.some(s => plain(s.title).includes(sample.anySimanTitleIncludes))) fail(at, 'no matching siman title');
        continue;
      }
      const siman = topic.simanim.find(s => s.label === sample.siman);
      if (!siman) { fail(at, 'siman not found'); continue; }
      if (sample.titleIncludes && !plain(siman.title).includes(sample.titleIncludes)) {
        fail(at, `title is "${siman.title}"`);
      }
      if (sample.seif) {
        const seif = siman.seifim.find(f => f.label === sample.seif);
        const text = plain(seif?.text);
        if (!seif) fail(at, 'seif not found');
        else if (sample.startsWith && !text.startsWith(sample.startsWith)) fail(at, `text starts "${text.slice(0, 30)}"`);
        else if (sample.includes && !text.includes(sample.includes)) fail(at, 'expected text not found');
      }
    }
  }

  report.push({ book: book.id, parts: index.parts.length, topics: topics.length, simanim, seifim, largestTopicKB: Math.round(largest / 1024) });
}

console.table(report);
if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures.slice(0, 50)) console.error(' - ' + f);
  if (failures.length > 50) console.error(` ...and ${failures.length - 50} more`);
  process.exit(1);
}
console.log('\nכל הבדיקות עברו ✓');
