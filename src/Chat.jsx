import { useEffect, useRef, useState } from 'react';
import { hebrewNumber } from './hebrew.js';

const EXAMPLES = [
  'מה מברכים על בננה?',
  'מתי מדליקים נרות שבת?',
  'כמה זמן מחכים בין בשר לחלב?',
  'מה עושים אם שכחו יעלה ויבוא?',
];

// Talks to POST /api/chat (docs/chat-api.md) and streams the reply in.
export default function Chat({ messages, setMessages }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const updateLast = fn => setMessages(ms => [...ms.slice(0, -1), fn(ms.at(-1))]);

  async function ask(text) {
    const question = text.trim();
    if (!question || busy) return;
    const history = [...messages.filter(m => !m.error), { role: 'user', content: question }];
    setMessages([...history, { role: 'assistant', content: '', sources: null, pending: true }]);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text() || `HTTP ${res.status}`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines.filter(Boolean)) handleEvent(JSON.parse(line));
      }
    } catch {
      updateLast(m => ({ ...m, error: 'שרת הצ\'אט לא זמין. האם הוא רץ? (npm run server)' }));
    } finally {
      updateLast(m => ({ ...m, pending: false }));
      setBusy(false);
    }
  }

  function handleEvent(event) {
    if (event.type === 'sources') updateLast(m => ({ ...m, sources: event.simanim }));
    else if (event.type === 'text') updateLast(m => ({ ...m, content: m.content + event.text }));
    else if (event.type === 'error') updateLast(m => ({ ...m, error: event.message }));
  }

  return (
    <div className="chat">
      {messages.length === 0 && (
        <div className="chat-intro">
          <h2>שאלו את קיצור שולחן ערוך</h2>
          <p>התשובות נכתבות רק מתוך הספר, עם הפניה לסימן ולסעיף. הספר משקף את מנהג אשכנז.</p>
          <div className="examples">
            {EXAMPLES.map(q => <button key={q} onClick={() => ask(q)}>{q}</button>)}
          </div>
        </div>
      )}

      <ol className="messages">
        {messages.map((m, i) => (
          <li key={i} className={`msg ${m.role}`}>
            {m.role === 'user' ? <p>{m.content}</p> : <AssistantMessage message={m} />}
          </li>
        ))}
      </ol>
      <div ref={endRef} />

      <form className="composer" onSubmit={e => { e.preventDefault(); ask(input); }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
          placeholder="כתבו שאלה בהלכה…"
          rows={1}
          aria-label="שאלה"
        />
        <button type="submit" disabled={busy || !input.trim()}>{busy ? '…' : 'שאל'}</button>
      </form>
      <p className="disclaimer">התשובות נוצרות אוטומטית ועלולות לטעות. בשאלה מעשית שאלו רב.</p>
    </div>
  );
}

function AssistantMessage({ message }) {
  const { content, sources, pending, error } = message;
  return (
    <>
      {sources?.length > 0 && (
        <div className="sources">
          <span>מקורות:</span>
          {sources.map(s => (
            <a key={s.number} href={`#${s.number}`}>סימן {hebrewNumber(s.number)}: {s.title}</a>
          ))}
        </div>
      )}
      {pending && !content && !error && <p className="muted">{sources ? 'כותב תשובה…' : 'מחפש בספר…'}</p>}
      {content && <div className="answer">{renderAnswer(content)}</div>}
      {error && <p className="error">{error}</p>}
    </>
  );
}

const CITATION = /\[סימן (\d+) סעיף (\d+)\]/g;

// Turns [סימן 52 סעיף 3] into a link to #52:3, and **x** into bold
function renderAnswer(text) {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(CITATION)) {
    parts.push(...renderBold(text.slice(last, m.index), parts.length));
    const [siman, seif] = [Number(m[1]), Number(m[2])];
    parts.push(
      <a key={`c${m.index}`} className="cite" href={`#${siman}:${seif}`}>
        {hebrewNumber(siman)}:{hebrewNumber(seif)}
      </a>,
    );
    last = m.index + m[0].length;
  }
  parts.push(...renderBold(text.slice(last), parts.length));
  return parts;
}

function renderBold(text, keyBase) {
  return text.split(/\*\*(.+?)\*\*/g).map((chunk, i) =>
    i % 2 ? <strong key={`b${keyBase}-${i}`}>{chunk}</strong> : chunk);
}
