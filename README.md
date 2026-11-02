# ספרי הלכה — לפי נושא, סימן וסעיף

אפליקציה חינמית לקריאה בספרי הלכה: בוחרים ספר, נושא, סימן וסעיף.
רצה כולה בדפדפן, בלי שרת ובלי שירות בתשלום.

**לאתר: https://revitalbm01-glitch.github.io/sifrei-halacha/**

## מסמכים
| מסמך | מה בו |
|---|---|
| [SPEC](docs/SPEC.md) | מה בונים ולמה: מטרה, משתמשים, דרישות |
| [DESIGN](docs/DESIGN.md) | איך זה בנוי: ארכיטקטורה, עיצוב, החלטות |
| [PLAN](docs/PLAN.md) | שלבים, מה הושלם, מה הבא בתור, סיכונים |
| [MANAGEMENT](docs/MANAGEMENT.md) | ענפים, איך מכניסים שינוי, עדכון ספרים, פרסום |
| [schema](docs/schema.md) | מבנה קבצי הספרים |

## הספרים
| ספר | מקור | רישיון |
|---|---|---|
| קיצור שולחן ערוך ילקוט יוסף, הרב יצחק יוסף (מהדורת תשס"ז) | [תורת אמת](https://toratemetfreeware.com/online/f_01355_all.html) | כל הזכויות שמורות למו"ר הרב יצחק יוסף שליט"א. מופץ בחינם לזיכוי הרבים, CC BY-NC-SA 2.5: לא לשימוש מסחרי, ובציון המקור |
| קיצור שולחן ערוך, רבי שלמה גאנצפריד | [Sefaria](https://www.sefaria.org/Kitzur_Shulchan_Arukh) (Torat Emet 357) | Public Domain |

החלוקה של קיצור שולחן ערוך לנושאים היא שלנו ([scripts/kitzur-topics.mjs](scripts/kitzur-topics.mjs)).

## ענפים
- `feature/content` — בניית קבצי הספרים תחת `public/data/` (`scripts/`).
- `feature/ui` — מסך המשתמש (React + Vite, `src/`).
- `feature/quality` — תיעוד, טסטים והערכת נתונים.

פירוט ב-[docs/MANAGEMENT.md](docs/MANAGEMENT.md).
הצ'אט נשמר בענפים `feature/chat-server` ו-`feature/chat-ui`, ואינו חלק מהאפליקציה כרגע.

## הרצה
```bash
npm install
npm run dev
```

בנייה מחדש של שני הספרים מהמקורות (לא חובה, הקבצים כבר בפרויקט):
```bash
npm run fetch-books
```

## בדיקות
```bash
npm test       # טסטים: עברית, ניווט, סימניה, פירוק תורת אמת, נושאי קיצור שו"ע
npm run eval   # הערכת נתוני הספרים: מבנה, ניקיון הטקסט, מספרים צפויים, דגימות ידועות
```

## פרסום
כל דחיפה ל-`main` מריצה טסטים והערכת נתונים, ורק אם הם עוברים בונה את האתר ומפרסמת אותו ב-GitHub Pages ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).

## רישיון
הקוד ברישיון MIT. טקסט הספרים תחת `public/data/` אינו חלק מרישיון זה ונשאר בתנאי המקור:
ילקוט יוסף — CC BY-NC-SA 2.5 (לשימוש לא מסחרי בלבד, בציון המקור), קיצור שולחן ערוך — Public Domain. פרטים ב-[LICENSE](LICENSE).
