// Evaluates free text search on everyday questions (tests/nl-questions.json).
// For each question: the rank of the first expected source, with three methods:
//   today    - the title search the site had before (src/hebrew.js spellingRegex on titles)
//   words    - the search engine without the concept dictionary
//   concepts - the search engine with src/concepts.json
// Expected sources were found by reading the books, not by the engine. A source may be
// a seif "book/topic/siman/seif" or a whole siman/topic with "*".
// The concept dictionary was tuned on tests/nl-questions.json. tests/nl-questions-holdout.json
// was written afterwards and is never tuned on: it shows how well the search generalizes.
// Fails (exit 1) if "concepts" puts a correct source in the top 5 for fewer than the minimum.
import { readFile } from 'node:fs/promises';
import { spellingRegex, stripNiqqud } from '../src/hebrew.js';
import { createIndex, search } from '../src/search.js';

const SETS = [
  { file: 'tests/nl-questions.json', title: 'שאלות כיוונון', minTop5: 0.8 },
  { file: 'tests/nl-questions-holdout.json', title: 'שאלות בדיקה (לא כוונן עליהן)', minTop5: 0.5 },
];
const DEPTH = 10;
const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));

const concepts = await readJson('src/concepts.json');
const docs = [];
for (const book of await readJson('public/data/books.json')) {
  const { rows } = await readJson(`public/data/${book.id}/search.json`);
  for (const [t, s, f, , , title, text] of rows) docs.push({ id: `${book.id}/${t}/${s}/${f}`, book: book.id, title, text });
}
const index = createIndex(docs);

const matches = (id, pattern) => {
  const a = id.split('/');
  return pattern.split('/').every((p, i) => p === '*' || p === a[i]);
};
const rankOf = (ids, expect) => {
  const i = ids.findIndex(id => expect.some(p => matches(id, p)));
  return i < 0 ? null : i + 1;
};

// The old site search: the whole query as one pattern over topic + siman titles
function titleSearch(query) {
  const re = spellingRegex(stripNiqqud(query).trim());
  if (!re) return [];
  const seen = new Set();
  return docs.filter(d => {
    const key = d.id.split('/').slice(0, 3).join('/');
    if (seen.has(key) || !re.test(d.title)) return false;
    seen.add(key);
    return true;
  }).map(d => d.id);
}

const methods = {
  today: q => titleSearch(q),
  words: q => search(index, q, { limit: DEPTH }).results.map(r => r.doc.id),
  concepts: q => search(index, q, { concepts, limit: DEPTH }).results.map(r => r.doc.id),
};

const pct = x => `${Math.round(x * 100)}%`;
let failed = false;

for (const set of SETS) {
  const questions = await readJson(set.file);
  const rows = questions.map(({ q, expect }) => {
    const row = { question: q };
    for (const [name, run] of Object.entries(methods)) row[name] = rankOf(run(q).slice(0, DEPTH), expect) ?? '-';
    return row;
  });
  console.log(`\n${set.title} (${questions.length}) — המיקום של המקור הנכון הראשון:`);
  console.table(rows);

  console.table(Object.keys(methods).map(name => {
    const ranks = rows.map(r => (r[name] === '-' ? null : r[name]));
    const within = k => ranks.filter(r => r && r <= k).length / ranks.length;
    const mrr = ranks.reduce((sum, r) => sum + (r ? 1 / r : 0), 0) / ranks.length;
    return { method: name, 'top 1': pct(within(1)), 'top 5': pct(within(5)), 'top 10': pct(within(10)), MRR: mrr.toFixed(2) };
  }));

  const top5 = rows.filter(r => r.concepts !== '-' && r.concepts <= 5).length / rows.length;
  if (top5 < set.minTop5) {
    console.error(`${set.title}: top 5 is ${pct(top5)}, below the minimum ${pct(set.minTop5)}`);
    failed = true;
  } else {
    console.log(`${set.title}: ${pct(top5)} מוצאות מקור נכון ב-5 התוצאות הראשונות ✓`);
  }
}
if (failed) process.exit(1);
