import { useEffect, useMemo, useState } from 'react';
import { useBook } from './useBook.js';
import { hebrewNumber, spellingRegex, stripNiqqud } from './hebrew.js';

const MAX_TEXT_HITS = 40;

// Selection lives in the URL hash: #72 or #72:3 (siman:seif)
function readHash() {
  const [siman, seif] = location.hash.slice(1).split(':').map(Number);
  return { siman: siman || null, seif: seif || null };
}

export default function App() {
  const { book, isSample, error } = useBook();
  const [selected, setSelected] = useState(readHash);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(!readHash().siman);

  useEffect(() => {
    const onHash = () => setSelected(readHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  // Plain-text copy of every seif for searching without niqqud
  const searchIndex = useMemo(() => book?.simanim.map(s => ({
    number: s.number,
    title: stripNiqqud(s.title),
    seifim: s.seifim.map(stripNiqqud),
  })) ?? [], [book]);

  const q = query.trim();
  const re = useMemo(() => spellingRegex(q), [q]);
  const titleHits = re ? searchIndex.filter(s => re.test(s.title)).map(s => s.number) : null;
  const textHits = useMemo(() => {
    if (!re || stripNiqqud(q).length < 2) return [];
    const hits = [];
    for (const s of searchIndex) {
      s.seifim.forEach((text, i) => {
        if (hits.length >= MAX_TEXT_HITS) return;
        const m = re.exec(text);
        if (m) hits.push({ siman: s.number, seif: i + 1, snippet: snippet(text, m.index, m[0].length) });
      });
    }
    return hits;
  }, [q, re, searchIndex]);

  const siman = book?.simanim.find(s => s.number === selected.siman);

  useEffect(() => {
    if (selected.seif) document.getElementById(`seif-${selected.seif}`)?.scrollIntoView({ block: 'center' });
    else window.scrollTo(0, 0);
  }, [selected, siman]);

  const go = (simanNum, seif) => {
    location.hash = seif ? `${simanNum}:${seif}` : `${simanNum}`;
    setMenuOpen(false);
  };

  if (error) return <div className="status">{error}</div>;
  if (!book) return <div className="status">טוען את הספר…</div>;

  const listed = titleHits ? book.simanim.filter(s => titleHits.includes(s.number)) : book.simanim;

  return (
    <div className="layout">
      <header className="topbar">
        <button className="menu-btn" onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen}>
          {menuOpen ? 'סגור' : 'נושאים'}
        </button>
        <h1>{book.title}</h1>
        {isSample && <span className="badge">נתוני דוגמה</span>}
      </header>

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <input
          className="search"
          type="search"
          placeholder="חיפוש נושא או מילה…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <nav aria-label="סימנים">
          {listed.length === 0 && <p className="muted">אין נושא בשם הזה</p>}
          <ul className="toc">
            {listed.map(s => (
              <li key={s.number}>
                <button
                  className={s.number === selected.siman ? 'active' : ''}
                  onClick={() => go(s.number)}
                >
                  <span className="num">{hebrewNumber(s.number)}</span>
                  <span>{s.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {textHits.length > 0 && (
          <section className="hits">
            <h2>נמצא בתוך ההלכות{textHits.length >= MAX_TEXT_HITS ? ` (${MAX_TEXT_HITS} ראשונים)` : ''}</h2>
            <ul>
              {textHits.map(h => (
                <li key={`${h.siman}:${h.seif}`}>
                  <button onClick={() => go(h.siman, h.seif)}>
                    <span className="ref">סימן {hebrewNumber(h.siman)} סעיף {hebrewNumber(h.seif)}</span>
                    <span className="snippet">{h.snippet}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      <main className="content">
        {siman ? (
          <article>
            <p className="kicker">סימן {hebrewNumber(siman.number)}</p>
            <h2 className="siman-title">{siman.title}</h2>
            <ol className="seifim">
              {siman.seifim.map((text, i) => (
                <li key={i} id={`seif-${i + 1}`} className={selected.seif === i + 1 ? 'highlight' : ''}>
                  <span className="seif-num">{hebrewNumber(i + 1)}</span>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
            <nav className="pager">
              {book.simanim.some(s => s.number === siman.number - 1) && (
                <button onClick={() => go(siman.number - 1)}>→ הסימן הקודם</button>
              )}
              {book.simanim.some(s => s.number === siman.number + 1) && (
                <button onClick={() => go(siman.number + 1)}>הסימן הבא ←</button>
              )}
            </nav>
          </article>
        ) : (
          <div className="empty">
            <h2>בחרו נושא</h2>
            <p>{book.simanim.length} סימנים. אפשר לבחור מהרשימה או לחפש מילה בתוך ההלכות.</p>
          </div>
        )}
        <footer className="source">
          מקור: <a href={book.source.url} target="_blank" rel="noreferrer">{book.source.name}</a>,
          {' '}{book.source.version} ({book.source.license})
        </footer>
      </main>
    </div>
  );
}

function snippet(text, at, len) {
  const start = Math.max(0, at - 30);
  const end = Math.min(text.length, at + len + 50);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}
