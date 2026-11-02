// Free text search over seifim, shared by the app and the eval (no network, no AI).
// Matching is per word: niqqud, final letters, prefixes (ו ה ב ל מ ש כ) and the
// matres ו/י are normalized away, so "לחמם", "חימום" and "מחממים" meet. Ranking is
// BM25 over seif text plus a boost for words in the topic/siman title, and the
// query is widened with halachic terms from the concept dictionary.
import { stripNiqqud } from './hebrew.js';

const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const PREFIXES = 'והבלמשכ';
const MAX_PREFIX = 3;
const MIN_STEM = 3; // letters left after removing prefixes ("בשבת" -> "שבת", but not "בת")
const K1 = 1.2;
const B = 0.75;
const TITLE_WEIGHT = 1.5;

// Hebrew letters only, no niqqud, final letters mapped to regular ones
export function cleanWord(word) {
  return stripNiqqud(word).replace(/[^א-ת]/g, '').replace(/[ךםןףץ]/g, c => FINALS[c]);
}

// Question words that say nothing about the topic
const STOP_WORDS = new Set([
  'מה', 'מי', 'איך', 'האם', 'אם', 'את', 'של', 'על', 'עם', 'אני', 'הוא', 'היא', 'זה', 'זו',
  'כל', 'לא', 'כן', 'או', 'גם', 'אבל', 'יש', 'אין', 'כמה', 'מתי', 'למה', 'אפשר', 'מותר',
  'אסור', 'צריך', 'צריכים', 'חייב', 'חייבים', 'דין', 'הלכה', 'אצל', 'כדי', 'לי', 'לו', 'לנו',
  'שלי', 'ביום', 'בזמן', 'זמן', 'עד', 'אחרי', 'לפני', 'בין', 'אותו', 'אותה', 'מותרת', 'אסורה',
  'יכול', 'יכולה', 'מותרים', 'אסורים', 'אפשרי', 'כך', 'ככה', 'מישהו', 'משהו', 'עושים', 'לעשות',
].map(cleanWord));

// Drop ו/י after the first letter: "חימום" -> "חממ", "חמם" -> "חממ"
const skeleton = w => w[0] + w.slice(1).replace(/[וי]/g, '');

// Every form the word might be indexed under: itself and with up to 3 prefixes removed.
// A construct ending ת also gets the ה form: "תפילת" meets "התפלה", "ברכת" meets "ברכה".
export function wordForms(word) {
  const w = cleanWord(word);
  if (w.length < 2) return [];
  const forms = new Set([skeleton(w)]);
  for (let i = 0; i < MAX_PREFIX && PREFIXES.includes(w[i]); i++) {
    const stem = skeleton(w.slice(i + 1));
    if (stem.length < MIN_STEM) break;
    forms.add(stem);
  }
  for (const f of [...forms]) {
    if (f.length >= 4 && f.endsWith('ת')) forms.add(f.slice(0, -1) + 'ה');
  }
  return [...forms];
}

export const splitWords = text => stripNiqqud(text).split(/[^א-ת"'״׳]+/).filter(Boolean);

// A query word as alternatives: the word itself first, then with prefixes removed
// ("בשבת" -> ["בשבת", "שבת"]). A seif matches if it has any of them.
const queryAlternatives = word => wordForms(word);

// docs: [{ id, book, title, text }] -> index used by search()
export function createIndex(docs) {
  const df = new Map();
  let totalLength = 0;
  const entries = docs.map(doc => {
    const tf = new Map();
    const words = splitWords(doc.text);
    for (const word of words) {
      for (const form of wordForms(word)) tf.set(form, (tf.get(form) ?? 0) + 1);
    }
    const titleForms = new Set(splitWords(doc.title).flatMap(wordForms));
    for (const form of new Set([...tf.keys(), ...titleForms])) df.set(form, (df.get(form) ?? 0) + 1);
    totalLength += words.length;
    return { doc, tf, titleForms, length: words.length || 1 };
  });
  return { entries, df, avgLength: totalLength / (entries.length || 1), size: entries.length };
}

const idf = (index, form) => {
  const n = index.df.get(form) ?? 0;
  return Math.log(1 + (index.size - n + 0.5) / (n + 0.5));
};

// A term is a word or a phrase: words: [[alternatives of word 1], [word 2], ...]
const makeTerm = (text, weight, original) => {
  const words = splitWords(text).map(queryAlternatives).filter(a => a.length);
  return words.length ? { words, weight, original, label: text } : null;
};

// Query words and phrases, with weights, after the concept dictionary
export function analyzeQuery(query, concepts = []) {
  const allWords = splitWords(query);
  const words = allWords.filter(w => !STOP_WORDS.has(cleanWord(w)));
  const terms = [];
  for (const w of words) {
    const term = makeTerm(w, 1, true);
    if (term && !terms.some(t => t.words[0][0] === term.words[0][0])) terms.push(term);
  }
  // A concept applies when its trigger words, as written, are among the forms of the
  // query words ("שבת" matches the query's "בשבת", but "לכבות" is not cut down to "בת").
  // Question words count here ("מתי" can trigger a time concept) though not as search terms.
  const present = new Set(allWords.flatMap(queryAlternatives));
  const has = phrase => splitWords(phrase).every(w => present.has(queryAlternatives(w)[0]));
  const topics = [];
  const matchedConcepts = [];

  for (const concept of concepts) {
    if (!concept.when.every(group => [].concat(group).some(has))) continue;
    matchedConcepts.push(concept.name);
    for (const text of concept.add ?? []) {
      const term = makeTerm(text, concept.weight ?? 0.6, false);
      if (term && !terms.some(t => t.label === text)) terms.push(term);
    }
    if (concept.topic) topics.push(concept.topic);
  }
  return { terms, topics, concepts: matchedConcepts, originalCount: terms.filter(t => t.original).length };
}

// Best alternative of one word in this seif: [tf, form]
function wordFrequency(counts, alternatives) {
  let best = [0, alternatives[0]];
  for (const f of alternatives) {
    const n = counts.get(f) ?? 0;
    if (n > best[0]) best = [n, f];
  }
  return best;
}

// A phrase counts as many times as its rarest word, and only if all its words appear
function termFrequency(entry, term) {
  let tf = Infinity;
  const forms = [];
  for (const alternatives of term.words) {
    const [n, form] = wordFrequency(entry.tf, alternatives);
    tf = Math.min(tf, n);
    forms.push(form);
  }
  return [tf, forms];
}

const inTitle = (entry, term) => term.words.every(alts => alts.some(f => entry.titleForms.has(f)));

export function search(index, query, { concepts = [], limit = 20, book = null } = {}) {
  const q = analyzeQuery(query, concepts);
  if (!q.terms.length) return { results: [], query: q };

  const results = [];
  for (const entry of index.entries) {
    if (book && entry.doc.book !== book) continue;
    let score = 0;
    let originalHits = 0;
    const matched = [];
    for (const term of q.terms) {
      const [tf, forms] = termFrequency(entry, term);
      const titled = inTitle(entry, term);
      if (!tf && !titled) continue;
      const termIdf = Math.min(...(tf ? forms : term.words.map(a => a[a.length - 1])).map(f => idf(index, f)));
      const bm25 = tf ? (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * entry.length / index.avgLength)) : 0;
      score += term.weight * termIdf * (bm25 + (titled ? TITLE_WEIGHT : 0));
      if (term.original) originalHits++;
      matched.push(term.label);
    }
    if (!score) continue;
    // Prefer seifim that answer more of what was asked
    if (q.originalCount) score *= 1 + originalHits / q.originalCount;
    if (q.topics.some(t => entry.doc.title.includes(t))) score *= 1.5;
    results.push({ doc: entry.doc, score, matched });
  }
  results.sort((a, b) => b.score - a.score);
  return { results: results.slice(0, limit), query: q };
}

// A short piece of the seif around the first matched word, for the results list
export function snippet(text, labels, size = 160) {
  const plain = stripNiqqud(text);
  const words = plain.split(/(\s+)/);
  const wanted = new Set(labels.flatMap(l => splitWords(l).flatMap(queryAlternatives)));
  let pos = 0;
  let at = -1;
  for (const w of words) {
    if (at < 0 && wordForms(w).some(f => wanted.has(f))) at = pos;
    pos += w.length;
  }
  const start = Math.max(0, (at < 0 ? 0 : at) - size / 3);
  const piece = plain.slice(start, start + size);
  return (start > 0 ? '…' : '') + piece + (start + size < plain.length ? '…' : '');
}
