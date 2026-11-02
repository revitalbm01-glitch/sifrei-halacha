import { describe, expect, it } from 'vitest';
import subjects from '../src/search-subjects.json';
import tuning from './nl-questions.json';
import holdout from './nl-questions-holdout.json';

// Every example shown to users must be a question whose answer is checked by
// scripts/eval-search.mjs, so the list never promises something the search can't find
describe('askable subjects on the search page', () => {
  const evaluated = new Set([...tuning, ...holdout].map(q => q.q));

  it.each(subjects.flatMap(s => s.examples.map(e => [s.subject, e])))('%s: %s is evaluated', (_, example) => {
    expect(evaluated.has(example)).toBe(true);
  });

  it('has unique subjects with at least one example each', () => {
    expect(new Set(subjects.map(s => s.subject)).size).toBe(subjects.length);
    expect(subjects.every(s => s.examples.length > 0)).toBe(true);
  });
});
