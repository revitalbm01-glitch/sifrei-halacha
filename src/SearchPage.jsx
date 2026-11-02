import { useEffect, useMemo, useState } from 'react';
import concepts from './concepts.json';
import { href, loadJson, searchHref, shortTitle } from './data.js';
import { createIndex, search, snippet, splitWords, wordForms } from './search.js';

const LIMIT = 20;
const EXAMPLES = ['אפשר לחמם שניצל בשבת?', 'כמה זמן מחכים בין בשר לחלב?', 'מה מברכים על בננה?', 'איך מכינים תה בשבת?'];

// Both books' search files are loaded once, the first time someone searches
let indexPromise = null;
function loadIndex(books) {
  indexPromise ??= Promise.all(books.map(async book => {
    const { rows } = await loadJson(`${book.id}/search.json`);
    return rows.map(([topic, siman, seif, simanLabel, seifLabel, title, text]) => ({
      id: `${book.id}/${topic}/${siman}/${seif}`,
      book: book.id,
      loc: { book: book.id, topic, siman, seif },
      simanLabel, seifLabel, title, text,
    }));
  })).then(lists => createIndex(lists.flat())).catch(err => {
    indexPromise = null;
    throw err;
  });
  return indexPromise;
}

export default function SearchPage({ books, query }) {
  const [input, setInput] = useState(query);
  const [bookFilter, setBookFilter] = useState(null);
  const [index, setIndex] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    if (!query || index) return;
    let cancelled = false;
    loadIndex(books).then(i => !cancelled && setIndex(i), e => !cancelled && setError(e));
    return () => { cancelled = true; };
  }, [query, books, index]);

  const result = useMemo(
    () => (index && query ? search(index, query, { concepts, limit: LIMIT, book: bookFilter }) : null),
    [index, query, bookFilter],
  );

  const submit = e => {
    e.preventDefault();
    if (input.trim()) location.hash = searchHref(input);
  };

  return (
    <section className="search-page">
      <h1 className="page-title">חיפוש בשאלה חופשית</h1>
      <form className="ask" onSubmit={submit} role="search">
        <input
          type="search"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="למשל: אפשר לחמם שניצל בשבת?"
          aria-label="שאלה"
          autoFocus={!query}
        />
        <button type="submit">חיפוש</button>
      </form>

      {!query && (
        <div className="examples">
          {EXAMPLES.map(q => <a key={q} href={searchHref(q)}>{q}</a>)}
        </div>
      )}

      {query && (
        <div className="filters" role="group" aria-label="ספר">
          {[null, ...books.map(b => b.id)].map(id => (
            <button key={id ?? 'all'} className={bookFilter === id ? 'on' : ''} onClick={() => setBookFilter(id)}>
              {id ? shortTitle(books.find(b => b.id === id)) : 'שני הספרים'}
            </button>
          ))}
        </div>
      )}

      {query && !index && !error && <p className="status">טוען את מאגר החיפוש (בפעם הראשונה בלבד)…</p>}
      {error && <p className="status">לא ניתן לטעון את מאגר החיפוש. נסו לרענן את הדף.</p>}

      {result && (
        <>
          {result.query.concepts.length > 0 && (
            <p className="concepts">
              חיפשנו גם לפי: {result.query.concepts.map(c => <span key={c}>{c}</span>)}
            </p>
          )}
          {result.results.length === 0 ? (
            <p className="status">לא נמצאו סעיפים מתאימים. נסו לנסח אחרת או להשתמש במילים מהספר.</p>
          ) : (
            <ol className="search-results">
              {result.results.map(({ doc, matched }) => (
                <li key={doc.id}>
                  <a href={href(doc.loc)}>
                    <span className="where">
                      {shortTitle(books.find(b => b.id === doc.book))} · {doc.title}
                      {doc.simanLabel && ` · סימן ${doc.simanLabel}`}
                      {doc.seifLabel && ` סעיף ${doc.seifLabel}`}
                    </span>
                    <span className="text"><Highlighted text={snippet(doc.text, matched, 220)} words={matched} /></span>
                  </a>
                </li>
              ))}
            </ol>
          )}
          <p className="disclaimer">
            אלה תוצאות חיפוש ולא פסק הלכה. קראו את הסעיף המלא, ובשאלה מעשית שאלו רב.
          </p>
        </>
      )}
    </section>
  );
}

// Marks the words of the snippet that matched the search
function Highlighted({ text, words }) {
  const wanted = new Set(words.flatMap(w => splitWords(w).flatMap(wordForms)));
  return text.split(/(\s+)/).map((part, i) =>
    wordForms(part).some(f => wanted.has(f)) ? <mark key={i}>{part}</mark> : part);
}
