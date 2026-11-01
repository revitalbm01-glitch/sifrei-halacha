// Answers a question in two calls: pick the relevant simanim from the table of
// contents, then answer from their full text with [סימן N סעיף M] citations.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { bookTitle, getSiman, keywordCandidates, simanCount, simanText, tableOfContents } from './book.mjs';

const MODEL = 'claude-opus-5-5';
const MAX_SOURCES = 4;
const HISTORY_FOR_SELECTION = 4; // recent messages shown to the selection step

const client = new Anthropic();

const SELECT_SYSTEM = `אתה עוזר שמאתר מקורות בספר "${bookTitle}".
לפניך תוכן העניינים של הספר (${simanCount} סימנים). בהינתן שאלה, בחר את הסימנים שבהם נמצאת התשובה.
בחר לכל היותר ${MAX_SOURCES} סימנים, מהרלוונטי ביותר לפחות. אם השאלה אינה בתחום הספר, החזר רשימה ריקה.

תוכן העניינים:
${tableOfContents}`;

const ANSWER_SYSTEM = `אתה עונה על שאלות בהלכה אך ורק מתוך הספר "${bookTitle}" (לרבי שלמה גאנצפריד).
בכל שאלה תקבל את הטקסט של הסימנים הרלוונטיים. כל סעיף מסומן בתג כמו [סימן 52 סעיף 3].

כללים:
- ענה בעברית, בשפה ברורה ופשוטה, וקצר ככל שהשאלה מאפשרת.
- כל קביעה הלכתית חייבת לבוא עם ציון מקור בדיוק במבנה [סימן N סעיף M], עם המספרים כפי שהם מופיעים בתגים.
- הסתמך רק על הטקסט שקיבלת. אם התשובה לא נמצאת בו, אמור זאת במפורש ואל תשלים מידע מבחוץ.
- אם יש מחלוקת או "יש אומרים" בטקסט, הצג אותה כפי שהיא כתובה.
- הספר משקף את מנהג אשכנז. אם השאלה נוגעת לעניין שבו מנהג ספרד עשוי להיות שונה, ציין זאת במשפט אחד.
- בשאלה מעשית שתלויה בפרטי המקרה, המלץ בסוף לשאול רב.`;

const Selection = z.object({
  simanim: z.array(z.number().int()).describe('מספרי הסימנים, מהרלוונטי ביותר'),
});

async function selectSimanim(messages) {
  const question = messages.at(-1).content;
  const recent = messages.slice(-HISTORY_FOR_SELECTION)
    .map(m => `${m.role === 'user' ? 'שואל' : 'תשובה'}: ${m.content.slice(0, 600)}`)
    .join('\n');
  const hints = keywordCandidates(question);

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    system: [{ type: 'text', text: SELECT_SYSTEM, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: 'low', format: zodOutputFormat(Selection) },
    messages: [{
      role: 'user',
      content: `השיחה עד כה:\n${recent}\n\nסימנים שבהם מופיעות מילים מהשאלה (רמז בלבד): ${hints.join(', ') || 'אין'}\n\nאילו סימנים עונים על השאלה האחרונה?`,
    }],
  });

  const chosen = (response.parsed_output?.simanim ?? [])
    .filter((n, i, all) => getSiman(n) && all.indexOf(n) === i)
    .slice(0, MAX_SOURCES);
  return chosen.length ? chosen : hints.slice(0, 3);
}

// Streams the answer as NDJSON events (see docs/chat-api.md) through send()
export async function answer(messages, send) {
  const simanim = await selectSimanim(messages);
  send({ type: 'sources', simanim: simanim.map(n => ({ number: n, title: getSiman(n).title })) });

  const sources = simanim.length
    ? simanim.map(simanText).join('\n\n')
    : 'לא נמצאו סימנים רלוונטיים בספר.';
  const history = messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
  const question = messages.at(-1).content;

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system: [{ type: 'text', text: ANSWER_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [
      ...history,
      { role: 'user', content: `מקורות מהספר:\n\n${sources}\n\n---\nשאלה: ${question}` },
    ],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      send({ type: 'text', text: event.delta.text });
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') throw new UserFacingError('לא ניתן לענות על השאלה הזו.');
  if (final.stop_reason === 'max_tokens') send({ type: 'text', text: '\n\n(התשובה נקטעה באמצע)' });
}

export class UserFacingError extends Error {}

export function describeError(err) {
  if (err instanceof UserFacingError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) return 'מפתח ה-API של Anthropic חסר או שגוי. ראו README.';
  if (err instanceof Anthropic.RateLimitError) return 'יותר מדי בקשות כרגע. נסו שוב בעוד דקה.';
  if (err instanceof Anthropic.APIConnectionError) return 'אין חיבור לשרת של Anthropic.';
  if (err instanceof Anthropic.APIError) return `שגיאה מהשרת (${err.status}).`;
  if (/api key|apiKey|authentication/i.test(err?.message ?? '')) return 'מפתח ה-API של Anthropic חסר. ראו README.';
  return 'שגיאה לא צפויה בשרת.';
}
