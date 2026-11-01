# מבנה נתוני הספר (החוזה בין ענף התוכן לענף המסך)

ענף התוכן (`feature/content`) מייצר את `public/data/kitzur.json`.
ענף המסך (`feature/ui`) קורא את הקובץ הזה, ואם הוא חסר — את `public/data/sample.json` (שני סימנים לדוגמה).

```jsonc
{
  "title": "קיצור שולחן ערוך",
  "source": {
    "name": "Sefaria",
    "version": "Torat Emet 357",   // הגרסה העברית בספריא
    "license": "Public Domain",
    "url": "https://www.sefaria.org/Kitzur_Shulchan_Arukh"
  },
  "simanim": [
    {
      "number": 1,                  // מספר הסימן (1–221)
      "title": "דיני השכמת הבקר",   // שם הנושא
      "seifim": ["...", "..."]      // טקסט כל סעיף, בלי HTML, עם ניקוד
    }
  ]
}
```

כל שינוי במבנה נעשה קודם ב-`main` ובקובץ הזה, ורק אחר כך בענפים.
