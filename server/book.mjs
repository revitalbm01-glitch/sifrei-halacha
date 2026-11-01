// Loads public/data/kitzur.json and finds simanim related to a question.
import { readFile } from 'node:fs/promises';
import { hebrewNumber, spellingRegex, stripNiqqud } from '../src/hebrew.js';

const BOOK_FILE = new URL('../public/data/kitzur.json', import.meta.url);

const book = JSON.parse(await readFile(BOOK_FILE, 'utf8'));

// Niqqud roughly doubles the token count and adds nothing for the model
const plain = book.simanim.map(s => ({
  number: s.number,
  title: stripNiqqud(s.title),
  seifim: s.seifim.map(stripNiqqud),
}));

export const bookTitle = book.title;
export const simanCount = plain.length;

export const tableOfContents = plain
  .map(s => `${s.number}. ${s.title}`)
  .join('\n');

export function getSiman(number) {
  return plain.find(s => s.number === number) ?? null;
}

// Plain text of one siman with a citation tag before every seif
export function simanText(number) {
  const s = getSiman(number);
  if (!s) return '';
  const seifim = s.seifim.map((t, i) => `[סימן ${s.number} סעיף ${i + 1}] ${t}`);
  return `סימן ${s.number} (${hebrewNumber(s.number)}): ${s.title}\n${seifim.join('\n')}`;
}

const STOP_WORDS = new Set([
  'מה', 'מי', 'איך', 'האם', 'אם', 'את', 'של', 'על', 'עם', 'אני', 'הוא', 'היא',
  'זה', 'זו', 'כל', 'לא', 'כן', 'או', 'גם', 'אבל', 'צריך', 'מותר', 'אסור', 'דין',
  'מברכים', 'לברך', 'עושים', 'יש', 'אין', 'אחרי', 'לפני', 'כמה', 'מתי', 'למה',
]);

// Simanim ranked by how many question words appear in them (title counts more)
export function keywordCandidates(question, limit = 8) {
  const words = [...new Set(stripNiqqud(question).split(/[^א-ת]+/))]
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  const patterns = words.map(spellingRegex).filter(Boolean);
  if (!patterns.length) return [];

  return plain
    .map(s => {
      let score = 0;
      for (const re of patterns) {
        if (re.test(s.title)) score += 5;
        score += Math.min(3, s.seifim.filter(t => re.test(t)).length);
      }
      return { number: s.number, score };
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(c => c.number);
}
