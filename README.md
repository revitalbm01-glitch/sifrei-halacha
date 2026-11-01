# ספרי הלכה — לפי נושא, סימן וסעיף

אפליקציה חינמית לקריאה בספרי הלכה: בוחרים ספר, נושא, סימן וסעיף.
רצה כולה בדפדפן, בלי שרת ובלי שירות בתשלום.

## הספרים
| ספר | מקור | רישיון |
|---|---|---|
| קיצור שולחן ערוך ילקוט יוסף, הרב יצחק יוסף (מהדורת תשס"ז) | [תורת אמת](https://toratemetfreeware.com/online/f_01355_all.html) | כל הזכויות שמורות למו"ר הרב יצחק יוסף שליט"א. מופץ בחינם לזיכוי הרבים, CC BY-NC-SA 2.5: לא לשימוש מסחרי, ובציון המקור |
| קיצור שולחן ערוך, רבי שלמה גאנצפריד | [Sefaria](https://www.sefaria.org/Kitzur_Shulchan_Arukh) (Torat Emet 357) | Public Domain |

החלוקה של קיצור שולחן ערוך לנושאים היא שלנו ([scripts/kitzur-topics.mjs](scripts/kitzur-topics.mjs)).

## ענפים
- `feature/content` — בניית קבצי הספרים תחת `public/data/` (`scripts/`).
- `feature/ui` — מסך המשתמש (React + Vite, `src/`).

המבנה המשותף מתואר ב-[docs/schema.md](docs/schema.md).
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
