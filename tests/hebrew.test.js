import { describe, expect, it } from 'vitest';
import { hebrewNumber, spellingRegex, stripNiqqud } from '../src/hebrew.js';

describe('hebrewNumber', () => {
  it.each([
    [1, 'א'], [10, 'י'], [11, 'יא'], [15, 'טו'], [16, 'טז'], [20, 'כ'],
    [72, 'עב'], [100, 'ק'], [115, 'קטו'], [116, 'קטז'], [221, 'רכא'],
  ])('%i -> %s', (n, expected) => {
    expect(hebrewNumber(n)).toBe(expected);
  });
});

describe('stripNiqqud', () => {
  it('removes vowels and cantillation, keeps letters', () => {
    expect(stripNiqqud('שַׁבָּת קֹדֶשׁ')).toBe('שבת קדש');
  });
});

describe('spellingRegex', () => {
  it('matches full and defective spelling both ways', () => {
    expect(spellingRegex('מוקצה').test('דיני מקצה בשבת')).toBe(true);
    expect(spellingRegex('מקצה').test('דיני מוקצה בשבת')).toBe(true);
    expect(spellingRegex('תפילין').test('הלכות תפלין')).toBe(true);
  });

  it('ignores niqqud in the query', () => {
    expect(spellingRegex('מֻקְצֶה').test('מוקצה')).toBe(true);
  });

  it('does not match unrelated words', () => {
    expect(spellingRegex('מוקצה').test('הלכות שבת')).toBe(false);
  });

  it('returns null for a query with no letters left', () => {
    expect(spellingRegex('')).toBeNull();
    expect(spellingRegex('וי')).toBeNull();
  });

  it('treats regex characters in the query literally', () => {
    expect(() => spellingRegex('(שבת')).not.toThrow();
    expect(spellingRegex('(שבת').test('(שבת)')).toBe(true);
  });
});
