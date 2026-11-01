// Builds the Kitzur Shulchan Arukh Yalkut Yosef book (docs/schema.md) from the
// Torat Emet online edition. The page marks each level with an HTML comment:
// <!--$#--> part, <!--$@--> topic, <!--$~--> siman, <!--$!--> seif.
import { writeBook } from './write-book.mjs';

const URL_ALL = 'https://toratemetfreeware.com/online/f_01355_all.html';

const res = await fetch(URL_ALL);
if (!res.ok) throw new Error(`${URL_ALL}: HTTP ${res.status}`);
const html = new TextDecoder('windows-1255').decode(await res.arrayBuffer());

const decodeEntities = s => s
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c));
// The source writes gershayim as two apostrophes: רש''י -> רש"י
const toText = s => decodeEntities(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
  .replace(/''/g, '"')
  .replace(/\s+/g, ' ').replace(/\s+([.,:;\]])/g, '$1').replace(/\[\s+/g, '[').trim();
// "ח'" / "קכ\"ח" -> "ח" / "קכח"
const cleanLabel = s => s.replace(/['"״׳]/g, '').trim();

// Heading text is the first underlined/bold run in the chunk
function heading(chunk) {
  const m = chunk.match(/<u>([\s\S]*?)<\/u>/i) ?? chunk.match(/<B>([\s\S]*?)<\/B>/i);
  return m ? toText(m[1]) : toText(chunk);
}

// Text after the heading, e.g. an intro paragraph before the first seif
function afterHeading(chunk) {
  const end = chunk.search(/<\/U><\/B>/i);
  return end < 0 ? '' : toText(chunk.slice(end));
}

const pieces = html.split(/<!--\$([#@~!])-->/);
const parts = [];
let part, topic, siman;

const newSiman = (label, title) => {
  siman = { label, title, seifim: [] };
  topic.simanim.push(siman);
};

for (let i = 1; i < pieces.length; i += 2) {
  const kind = pieces[i];
  // Stop each chunk at the page footer, which follows the last seif
  const chunk = pieces[i + 1].split(/<\/body>/i)[0];

  if (kind === '#') {
    part = { title: heading(chunk), topics: [] };
    parts.push(part);
  } else if (kind === '@') {
    topic = { title: heading(chunk), simanim: [] };
    part.topics.push(topic);
    siman = null;
    const intro = afterHeading(chunk);
    if (intro) { newSiman('', topic.title); siman.seifim.push({ label: '', text: intro }); }
  } else if (kind === '~') {
    const full = heading(chunk);
    const m = full.match(/^סימן\s+([^\s-]+)\s*-\s*(.*)$/);
    newSiman(m ? cleanLabel(m[1]) : '', m ? m[2].trim() : full);
    const intro = afterHeading(chunk);
    if (intro) siman.seifim.push({ label: '', text: intro });
  } else {
    // <span ...><B><span ...><p></p>טו</span></B>&nbsp;</span>text...
    const m = chunk.match(/<B><span[^>]*>(?:<p><\/p>)?([^<]*)<\/span><\/B>(?:&nbsp;)?<\/span>([\s\S]*)/i);
    if (!siman) newSiman('', topic.title);
    const text = toText(m ? m[2] : chunk);
    if (text) siman.seifim.push({ label: m ? cleanLabel(m[1]) : '', text });
  }
}

for (const p of parts) p.topics = p.topics.filter(t => t.simanim.some(s => s.seifim.length));

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
  parts,
});
