import { describe, expect, it } from 'vitest';
import concepts from '../src/concepts.json';
import { analyzeQuery, cleanWord, createIndex, search, snippet, wordForms } from '../src/search.js';

describe('wordForms', () => {
  it('removes niqqud and maps final letters', () => {
    expect(cleanWord('שַׁבָּת')).toBe('שבת');
    expect(cleanWord('חמם')).toBe('חממ');
  });

  it('meets full and defective spelling', () => {
    expect(wordForms('חימום')).toContain('חממ');
    expect(wordForms('חמם')).toContain('חממ');
  });

  it('strips prefixes but keeps at least three letters', () => {
    expect(wordForms('בשבת')).toEqual(expect.arrayContaining(['בשבת', 'שבת']));
    expect(wordForms('בשבת')).not.toContain('בת');
    expect(wordForms('לכבות')).not.toContain('בת');
  });

  it('matches construct ת with ה', () => {
    expect(wordForms('תפילת')).toContain('תפלה');
    expect(wordForms('התפלה')).toContain('תפלה');
  });
});

describe('analyzeQuery', () => {
  it('drops question words', () => {
    const q = analyzeQuery('האם מותר לחמם שניצל בשבת?');
    expect(q.terms.map(t => t.label)).toEqual(['לחמם', 'שניצל', 'בשבת']);
  });

  it('adds halachic terms from concepts that apply', () => {
    const q = analyzeQuery('האם מותר לחמם שניצל בשבת?', concepts);
    expect(q.concepts).toEqual(expect.arrayContaining(['שבת', 'חימום אוכל בשבת']));
    expect(q.terms.map(t => t.label)).toEqual(expect.arrayContaining(['בישול אחר בישול', 'תבשיל יבש', 'רוטב']));
    expect(q.concepts).not.toContain('חשמל ואש בשבת');
  });

  it('lets a question word trigger a concept without searching for it', () => {
    const q = analyzeQuery('מתי מדליקים נרות חנוכה?', concepts);
    expect(q.concepts).toContain('שאלת זמן');
    expect(q.terms.some(t => t.label === 'מתי')).toBe(false);
  });
});

describe('search', () => {
  const docs = [
    { id: 'a', book: 'x', title: 'הלכות שבת דין בישול אחר בישול', text: 'תבשיל יבש כגון שניצל מותר לחממו על פלאטה, ואם יש בו רוטב נחשב דבר לח.' },
    { id: 'b', book: 'x', title: 'הלכות ברכות', text: 'על שניצל מברכים שהכל.' },
    { id: 'c', book: 'y', title: 'הלכות שבת הדלקת נרות', text: 'מדליקים נרות שבת קודם השקיעה.' },
  ];
  const index = createIndex(docs);

  it('ranks the seif that answers the question first', () => {
    const { results } = search(index, 'אפשר לחמם שניצל בשבת?', { concepts });
    expect(results[0].doc.id).toBe('a');
  });

  it('can be limited to one book', () => {
    const { results } = search(index, 'נרות שבת', { book: 'x' });
    expect(results.every(r => r.doc.book === 'x')).toBe(true);
  });

  it('returns nothing for a query of only question words', () => {
    expect(search(index, 'מה האם', { concepts }).results).toEqual([]);
  });

  it('builds a snippet around a matched word', () => {
    expect(snippet(docs[0].text, ['שניצל'], 40)).toContain('שניצל');
  });
});
