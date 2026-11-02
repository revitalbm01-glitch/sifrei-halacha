import { describe, expect, it } from 'vitest';
import { KITZUR_TOPICS, expandTopic } from '../scripts/kitzur-topics.mjs';

describe('Kitzur Shulchan Arukh topics', () => {
  const topics = KITZUR_TOPICS.map(expandTopic);

  it('covers every siman 1-221 exactly once', () => {
    const all = topics.flatMap(t => t.numbers).sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 221 }, (_, i) => i + 1));
  });

  it('has unique, non-empty titles', () => {
    const titles = topics.map(t => t.title);
    expect(titles.every(Boolean)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('expands single numbers and ranges', () => {
    expect(expandTopic(['x', 34]).numbers).toEqual([34]);
    expect(expandTopic(['x', [35, 37], [46, 47]]).numbers).toEqual([35, 36, 37, 46, 47]);
  });
});
