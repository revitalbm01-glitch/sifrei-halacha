// Builds the Kitzur Shulchan Arukh Yalkut Yosef book (docs/schema.md) from the
// Torat Emet online edition.
import { parseBook } from './torat-emet-parse.mjs';
import { writeBook } from './write-book.mjs';

const URL_ALL = 'https://toratemetfreeware.com/online/f_01355_all.html';

const res = await fetch(URL_ALL);
if (!res.ok) throw new Error(`${URL_ALL}: HTTP ${res.status}`);
const html = new TextDecoder('windows-1255').decode(await res.arrayBuffer());

await writeBook({
  id: 'yalkut-yosef',
  title: 'קיצור שולחן ערוך ילקוט יוסף',
  author: 'הרב יצחק יוסף',
  source: {
    name: 'תורת אמת',
    url: URL_ALL,
    license: 'CC BY-NC-SA 2.5',
    rights: 'כל הזכויות שמורות למו"ר הרב יצחק יוסף שליט"א',
  },
  parts: parseBook(html),
});
