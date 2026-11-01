# הלכות — קיצור שולחן ערוך

שלב 1: אפליקציה לבחירת נושא וקריאת ההלכות. שלב 2 (בהמשך): צ'אט שעונה על שאלות מתוך הספר.

## ענפים
- `feature/content` — משיכת הספר מספריא ובניית `public/data/kitzur.json` (`scripts/`).
- `feature/ui` — מסך המשתמש (React + Vite, `src/`).

המבנה המשותף מתואר ב-[docs/schema.md](docs/schema.md).

## הרצה
```bash
node scripts/fetch-sefaria.mjs   # בניית קובץ הספר
npm install
npm run dev
```
