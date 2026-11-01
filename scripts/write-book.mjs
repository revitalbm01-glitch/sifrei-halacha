// Writes one book in the split format described in docs/schema.md.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const DATA = new URL('../public/data/', import.meta.url);
const BOOK_ORDER = ['yalkut-yosef', 'kitzur-shulchan-arukh'];

// book: { id, title, author, source, parts: [{ title, topics: [{ title, simanim: [{ label, title, seifim: [{ label, text }] }] }] }] }
export async function writeBook(book) {
  const dir = new URL(`${book.id}/`, DATA);
  await rm(dir, { recursive: true, force: true });
  await mkdir(new URL('topics/', dir), { recursive: true });

  let n = 0;
  const parts = [];
  for (const part of book.parts) {
    const topics = [];
    for (const topic of part.topics) {
      n++;
      await writeFile(new URL(`topics/${n}.json`, dir), JSON.stringify({ n, title: topic.title, simanim: topic.simanim }));
      topics.push({
        n,
        title: topic.title,
        simanim: topic.simanim.map(s => ({ label: s.label, title: s.title, seifCount: s.seifim.length })),
      });
    }
    parts.push({ title: part.title, topics });
  }
  await writeFile(new URL('index.json', dir), JSON.stringify({ id: book.id, parts }));
  await addToCatalog({ id: book.id, title: book.title, author: book.author, source: book.source });

  const simanim = book.parts.flatMap(p => p.topics).flatMap(t => t.simanim);
  const seifim = simanim.reduce((sum, s) => sum + s.seifim.length, 0);
  console.log(`${book.title}: ${n} נושאים, ${simanim.length} סימנים, ${seifim} סעיפים`);
}

async function addToCatalog(entry) {
  const file = new URL('books.json', DATA);
  let books = [];
  try { books = JSON.parse(await readFile(file, 'utf8')); } catch { /* first book */ }
  books = books.filter(b => b.id !== entry.id && BOOK_ORDER.includes(b.id));
  books.push(entry);
  books.sort((a, b) => BOOK_ORDER.indexOf(a.id) - BOOK_ORDER.indexOf(b.id));
  await writeFile(file, JSON.stringify(books, null, 2) + '\n');
}
