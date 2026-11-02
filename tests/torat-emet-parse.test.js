import { describe, expect, it } from 'vitest';
import { cleanLabel, parseBook, parseSimanHeading, toText } from '../scripts/torat-emet-parse.mjs';

describe('parseSimanHeading', () => {
  it.each([
    ["סימן ח' - מהלכות ציצית - סדר עטיפת הציצית", 'ח', 'מהלכות ציצית - סדר עטיפת הציצית'],
    ['סימן א - הלכות השכמת הבוקר', 'א', 'הלכות השכמת הבוקר'],
    ['סימנים שח, שיא - דיני מוקצה בשבת', 'שח, שיא', 'דיני מוקצה בשבת'],
    ["סימן יד סעיף ג' - דין טלית שאולה", 'יד סעיף ג', 'דין טלית שאולה'],
    ['המשך סימן קו - חינוך קטנים להתפלל', 'קו', 'חינוך קטנים להתפלל'],
    ["סימן סט סעיף ה' -חתך הבשר אחר המליחה", 'סט סעיף ה', 'חתך הבשר אחר המליחה'],
  ])('%s', (heading, label, title) => {
    expect(parseSimanHeading(heading)).toEqual({ label, title });
  });

  it('keeps abbreviations inside a compound reference', () => {
    expect(parseSimanHeading('סימן תנג סעיף ד בש"ע - דין').label).toBe('תנג סעיף ד בש"ע');
  });

  it('uses the whole heading as title when there is no title part', () => {
    expect(parseSimanHeading("סימן פז סעיף ב'")).toEqual({ label: 'פז סעיף ב', title: "סימן פז סעיף ב'" });
  });

  it('leaves subheadings without a siman unlabeled', () => {
    expect(parseSimanHeading('דיני תיקון חצות')).toEqual({ label: '', title: 'דיני תיקון חצות' });
  });
});

describe('toText and cleanLabel', () => {
  it('strips tags, decodes entities and fixes gershayim', () => {
    expect(toText("ופירש רש''י,&nbsp;<small>[ילקו''י  עמוד א]</small> .")).toBe('ופירש רש"י, [ילקו"י עמוד א].');
  });

  it('removes geresh and gershayim from labels', () => {
    expect(cleanLabel("ח'")).toBe('ח');
    expect(cleanLabel('קכ"ח')).toBe('קכח');
  });
});

// A trimmed copy of the real page structure
const seif = (label, text) =>
  `<!--$!-->\n<a name="x-${label}"></a><span style="font-size:26px; ">\n<B><span style='color:RGB(47,109,187);'><p></p>${label}</span></B>&nbsp;</span>${text}\n`;
const headingTag = text => `<B><U><span style='color:RGB(47,109,187);'><u>${text}</u></span><BR></U></B></span>\n`;
const PAGE = [
  '<html><body>',
  `<!--$#-->${headingTag('אורח חיים')}`,
  `<!--$@-->${headingTag('הלכות ציצית')}`,
  `<!--$~-->${headingTag("סימן ח' - מהלכות ציצית - סדר עטיפת הציצית")}`,
  seif('א', "מצות עשה מן התורה. <small><small>[ילקו''י ציצית, עמוד א']</small></small>."),
  seif('ב', 'כל הלובש בגד שהוא חייב בציצית.'),
  `<!--$~-->${headingTag('דיני טלית קטן')}`,
  seif('א', 'טלית קטן צריך שיהיה בו שיעור.'),
  `<!--$@-->${headingTag('נושא ריק')}`,
  '</body><div>footer</div></html>',
].join('\n');

describe('parseBook', () => {
  const parts = parseBook(PAGE);

  it('builds parts, topics, simanim and seifim', () => {
    expect(parts).toHaveLength(1);
    expect(parts[0].title).toBe('אורח חיים');
    const [topic] = parts[0].topics;
    expect(topic.title).toBe('הלכות ציצית');
    expect(topic.simanim.map(s => [s.label, s.title, s.seifim.length])).toEqual([
      ['ח', 'מהלכות ציצית - סדר עטיפת הציצית', 2],
      ['', 'דיני טלית קטן', 1],
    ]);
  });

  it('keeps seif labels and source references', () => {
    const [first] = parts[0].topics[0].simanim[0].seifim;
    expect(first).toEqual({ label: 'א', text: 'מצות עשה מן התורה. [ילקו"י ציצית, עמוד א\'].' });
  });

  it('drops topics with no text and ignores the page footer', () => {
    expect(parts[0].topics.map(t => t.title)).toEqual(['הלכות ציצית']);
    expect(JSON.stringify(parts)).not.toContain('footer');
  });
});
