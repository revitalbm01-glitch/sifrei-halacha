import { useEffect, useMemo, useState } from 'react';
import { href, readLocation, useJson } from './data.js';
import { spellingRegex } from './hebrew.js';

export default function App() {
  const [loc, setLoc] = useState(readLocation);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => { setLoc(readLocation()); setMenuOpen(false); };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const books = useJson('books.json');
  const book = books.data?.find(b => b.id === loc.book) ?? books.data?.[0];
  const index = useJson(book ? `${book.id}/index.json` : null);
  const topicFile = useJson(book && loc.topic ? `${book.id}/topics/${loc.topic}.json` : null);

  const topics = useMemo(() => index.data?.parts.flatMap(p => p.topics) ?? [], [index.data]);
  const topic = topics.find(t => t.n === loc.topic);
  const siman = loc.siman ? topicFile.data?.simanim[loc.siman - 1] : null;

  useEffect(() => {
    if (loc.seif) document.getElementById(`seif-${loc.seif}`)?.scrollIntoView({ block: 'center' });
    else window.scrollTo(0, 0);
  }, [loc, siman]);

  if (books.error) return <div className="status">לא ניתן לטעון את רשימת הספרים</div>;
  if (!book) return <div className="status">טוען…</div>;

  const at = rest => href({ book: book.id, ...rest });

  return (
    <div className="layout">
      <header className="topbar">
        <button className="menu-btn" onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen}>
          {menuOpen ? 'סגור' : 'נושאים'}
        </button>
        <a className="brand" href={at({})}>ספרי הלכה</a>
        <nav className="book-tabs" aria-label="ספר">
          {books.data.map(b => (
            <a key={b.id} href={href({ book: b.id })} className={b.id === book.id ? 'active' : ''}>
              {shortTitle(b)}
            </a>
          ))}
        </nav>
      </header>

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        {index.data && <Toc book={book} index={index.data} loc={loc} at={at} />}
      </aside>

      <main className="content">
        <Breadcrumbs book={book} topic={topic} siman={siman} loc={loc} at={at} />
        {index.error || topicFile.error ? (
          <p className="status">שגיאה בטעינת הספר. נסו לרענן את הדף.</p>
        ) : !loc.topic ? (
          index.data && <BookHome book={book} index={index.data} at={at} />
        ) : !topicFile.data ? (
          <p className="status">טוען…</p>
        ) : !siman ? (
          <TopicView topic={topicFile.data} n={loc.topic} at={at} />
        ) : (
          <SimanView topicData={topicFile.data} siman={siman} loc={loc} at={at} topics={topics} />
        )}
        <SourceNote book={book} />
      </main>
    </div>
  );
}

const shortTitle = b => (b.id === 'yalkut-yosef' ? 'ילקוט יוסף' : b.title);
const simanName = s => (s.label ? `סימן ${s.label}` : 'פתיחה');

function Toc({ book, index, loc, at }) {
  const [query, setQuery] = useState('');
  const re = spellingRegex(query.trim());
  const matches = re ? index.parts.flatMap(p => p.topics).flatMap(t => [
    ...(re.test(t.title) ? [{ key: `t${t.n}`, link: at({ topic: t.n }), main: t.title, sub: 'נושא' }] : []),
    ...t.simanim.flatMap((s, i) => re.test(s.title)
      ? [{ key: `s${t.n}-${i}`, link: at({ topic: t.n, siman: i + 1 }), main: s.title, sub: `${t.title} · ${simanName(s)}` }]
      : []),
  ]) : null;

  return (
    <>
      <input
        className="search"
        type="search"
        placeholder={`חיפוש נושא או סימן ב${shortTitle(book)}…`}
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {matches ? (
        <ul className="results">
          {matches.length === 0 && <li className="muted">לא נמצא נושא או סימן בשם הזה</li>}
          {matches.slice(0, 80).map(m => (
            <li key={m.key}>
              <a href={m.link}><span>{m.main}</span><small>{m.sub}</small></a>
            </li>
          ))}
        </ul>
      ) : (
        index.parts.map(part => (
          <section key={part.title || 'all'} className="toc-part">
            {part.title && <h2>{part.title}</h2>}
            <ul className="toc">
              {part.topics.map(t => (
                <li key={t.n}>
                  <a href={at({ topic: t.n })} className={t.n === loc.topic ? 'active' : ''}>{t.title}</a>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

function Breadcrumbs({ book, topic, siman, loc, at }) {
  return (
    <nav className="crumbs" aria-label="מיקום">
      <a href={at({})}>{book.title}</a>
      {topic && <><span aria-hidden>‹</span><a href={at({ topic: topic.n })}>{topic.title}</a></>}
      {siman && <><span aria-hidden>‹</span><a href={at({ topic: loc.topic, siman: loc.siman })}>{simanName(siman)}</a></>}
    </nav>
  );
}

function BookHome({ book, index, at }) {
  return (
    <section>
      <h1 className="page-title">{book.title}</h1>
      {book.author && <p className="muted">{book.author}</p>}
      {index.parts.map(part => (
        <div key={part.title || 'all'} className="home-part">
          {part.title && <h2>{part.title}</h2>}
          <div className="topic-grid">
            {part.topics.map(t => (
              <a key={t.n} href={at({ topic: t.n })} className="topic-card">
                <span>{t.title}</span>
                <small>{t.simanim.length} סימנים</small>
              </a>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function TopicView({ topic, n, at }) {
  return (
    <section>
      <h1 className="page-title">{topic.title}</h1>
      <ol className="siman-list">
        {topic.simanim.map((s, i) => (
          <li key={i}>
            <a href={at({ topic: n, siman: i + 1 })}>
              <span className="num">{s.label || '•'}</span>
              <span>{s.title}</span>
              <small>{s.seifim.length} סעיפים</small>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SimanView({ topicData, siman, loc, at, topics }) {
  const prev = loc.siman > 1
    ? { topic: loc.topic, siman: loc.siman - 1 }
    : neighbourTopic(topics, loc.topic, -1);
  const next = loc.siman < topicData.simanim.length
    ? { topic: loc.topic, siman: loc.siman + 1 }
    : neighbourTopic(topics, loc.topic, +1);

  return (
    <article>
      <p className="kicker">{topicData.title} · {simanName(siman)}</p>
      <h1 className="page-title">{siman.title}</h1>

      {siman.seifim.length > 1 && (
        <nav className="seif-picker" aria-label="סעיפים">
          {siman.seifim.map((s, i) => (
            <a
              key={i}
              href={at({ topic: loc.topic, siman: loc.siman, seif: i + 1 })}
              className={loc.seif === i + 1 ? 'active' : ''}
            >
              {s.label || '•'}
            </a>
          ))}
        </nav>
      )}

      <ol className="seifim">
        {siman.seifim.map((s, i) => (
          <li key={i} id={`seif-${i + 1}`} className={loc.seif === i + 1 ? 'highlight' : ''}>
            <a className="seif-num" href={at({ topic: loc.topic, siman: loc.siman, seif: i + 1 })}>{s.label}</a>
            <p>{renderSeif(s.text)}</p>
          </li>
        ))}
      </ol>

      <nav className="pager">
        {prev ? <a href={at(prev)}>→ הקודם</a> : <span />}
        {next ? <a href={at(next)}>הבא ←</a> : <span />}
      </nav>
    </article>
  );
}

// First siman of the next topic, or last siman of the previous one
function neighbourTopic(topics, n, dir) {
  const t = topics[topics.findIndex(x => x.n === n) + dir];
  if (!t) return null;
  return { topic: t.n, siman: dir > 0 ? 1 : t.simanim.length };
}

// Source references in [brackets] are shown in small type
function renderSeif(text) {
  return text.split(/(\[[^\]]*\])/g).map((part, i) =>
    part.startsWith('[') ? <span key={i} className="ref">{part}</span> : part);
}

function SourceNote({ book }) {
  const { source } = book;
  return (
    <footer className="source">
      {source.rights && <p>{source.rights}.</p>}
      <p>
        מקור: <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>
        {' '}· {source.license === 'Public Domain' ? 'נחלת הכלל' : `רישיון ${source.license}, לשימוש לא מסחרי בלבד`}
      </p>
    </footer>
  );
}
