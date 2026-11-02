// Writes public/data/<book>/search.json: every seif as plain text (no niqqud) with its
// location, labels and titles, for free text search in the browser (src/search.js).
// Rows: [topic n, siman # in topic, seif # in siman, siman label, seif label, title, text]
import { readFile, writeFile } from 'node:fs/promises';
import { stripNiqqud } from '../src/hebrew.js';

const DATA = new URL('../public/data/', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, DATA), 'utf8'));

for (const book of await readJson('books.json')) {
  const index = await readJson(`${book.id}/index.json`);
  const rows = [];
  for (const topic of index.parts.flatMap(p => p.topics)) {
    const data = await readJson(`${book.id}/topics/${topic.n}.json`);
    data.simanim.forEach((siman, i) => {
      const title = stripNiqqud(`${topic.title} · ${siman.title}`);
      siman.seifim.forEach((seif, j) => {
        rows.push([topic.n, i + 1, j + 1, siman.label, seif.label, title, stripNiqqud(seif.text)]);
      });
    });
  }
  const json = JSON.stringify({ id: book.id, rows });
  await writeFile(new URL(`${book.id}/search.json`, DATA), json);
  console.log(`${book.title}: ${rows.length} סעיפים, ${Math.round(json.length / 1024)}KB`);
}
