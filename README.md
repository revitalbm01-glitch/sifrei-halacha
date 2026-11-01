# הלכות — קיצור שולחן ערוך

שלב 1: אפליקציה לבחירת נושא וקריאת ההלכות. שלב 2 (בהמשך): צ'אט שעונה על שאלות מתוך הספר.

## ענפים
- `feature/content` — משיכת הספר מספריא ובניית `public/data/kitzur.json` (`scripts/`).
- `feature/ui` — מסך המשתמש (React + Vite, `src/`).

המבנה המשותף מתואר ב-[docs/schema.md](docs/schema.md).

- `feature/chat-server` — שרת הצ'אט (`server/`): בוחר את הסימנים הרלוונטיים ועונה מתוכם בעזרת Claude. ממשק: [docs/chat-api.md](docs/chat-api.md).
- `feature/chat-ui` — מסך הצ'אט.

## הרצה
```bash
node scripts/fetch-sefaria.mjs   # בניית קובץ הספר
npm install
npm run dev
```

הצ'אט צריך מפתח API של Anthropic: מעתיקים את `.env.example` ל-`.env`, ממלאים את `ANTHROPIC_API_KEY`, ומריצים בחלון נפרד:
```bash
npm run server
```
