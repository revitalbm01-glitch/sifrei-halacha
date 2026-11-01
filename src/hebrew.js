// Removes niqqud and cantillation so searches match vowelized text.
export const stripNiqqud = s => s.replace(/[֑-ׇ]/g, '');

// The text uses defective spelling (מֻקְצֶה -> מקצה), so ו and י are optional
// when matching: "מוקצה" and "מקצה" both match either spelling.
export function spellingRegex(query) {
  const letters = [...stripNiqqud(query).replace(/[וי]/g, '')]
    .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return letters.length ? new RegExp(letters.join('[וי]*')) : null;
}

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת'];

// 72 -> "עב", 15 -> "טו", 221 -> "רכא"
export function hebrewNumber(n) {
  let out = HUNDREDS[Math.floor(n / 100)] ?? '';
  const rest = n % 100;
  if (rest === 15) return out + 'טו';
  if (rest === 16) return out + 'טז';
  return out + TENS[Math.floor(rest / 10)] + ONES[rest % 10];
}
