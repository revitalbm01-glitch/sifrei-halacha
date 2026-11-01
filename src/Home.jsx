import learningPhoto from './assets/learning.jpg';
import { href } from './data.js';

// Quoted from the original texts on Sefaria, without niqqud
const SOURCES = [
  {
    text: 'תלת דרגין אינון מתקשרן דא בדא, קודשא בריך הוא, אורייתא, וישראל.',
    meaning: 'שלוש דרגות קשורות זו בזו: הקדוש ברוך הוא, התורה וישראל.',
    cite: 'זוהר, פרשת אחרי מות (ח"ג עג ע"א)',
  },
  {
    text: 'כשאדם יודע ומשיג בשכלו פסק זה כהלכה הערוכה במשנה או גמרא או פוסקים, הרי זה משיג ותופס ומקיף בשכלו רצונו וחכמתו של הקדוש ברוך הוא… והוא יחוד נפלא שאין יחוד כמוהו.',
    cite: 'תניא, ליקוטי אמרים פרק ה',
  },
  {
    text: 'שכל ההלכות הן פרטי המשכות פנימיות רצון העליון עצמו, שכך עלה ברצונו יתברך, שדבר זה מותר או כשר או פטור או זכאי או להפך.',
    cite: 'תניא, ליקוטי אמרים פרק כג',
  },
];

export default function Home({ books, bookmark }) {
  return (
    <div className="home">
      <section className="hero">
        <img src={learningPhoto} alt="שני בחורים צעירים לומדים יחד בספר ומחייכים" width="507" height="507" />
        <div className="hero-text">
          <h1>ספרי הלכה</h1>
          <p>לימוד הלכה לפי נושא, סימן וסעיף — ילקוט יוסף וקיצור שולחן ערוך.</p>
          {bookmark && (
            <a className="resume" href={href(bookmark)}>
              <BookmarkIcon filled />
              <span>
                <strong>המשך מהסימניה</strong>
                <small>{bookmark.label}</small>
              </span>
            </a>
          )}
        </div>
      </section>

      <section className="home-books" aria-label="ספרים">
        {books.map(b => (
          <a key={b.id} href={href({ book: b.id })} className="book-card">
            <strong>{b.title}</strong>
            {b.author && <span>{b.author}</span>}
          </a>
        ))}
      </section>

      <section className="importance">
        <h2>חשיבות לימוד ההלכה</h2>
        {SOURCES.map(s => (
          <figure key={s.cite}>
            <blockquote>{s.text}</blockquote>
            {s.meaning && <p className="meaning">{s.meaning}</p>}
            <figcaption>{s.cite}</figcaption>
          </figure>
        ))}
      </section>
    </div>
  );
}

export function BookmarkIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
