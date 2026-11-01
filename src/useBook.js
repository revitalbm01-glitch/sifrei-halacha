import { useEffect, useState } from 'react';

// Loads the full book built by feature/content, falling back to the sample.
export function useBook() {
  const [state, setState] = useState({ book: null, isSample: false, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const [file, isSample] of [['kitzur.json', false], ['sample.json', true]]) {
        try {
          const res = await fetch(`/data/${file}`);
          if (!res.ok || !res.headers.get('content-type')?.includes('json')) continue;
          const book = await res.json();
          if (!cancelled) setState({ book, isSample, error: null });
          return;
        } catch {
          // try the next file
        }
      }
      if (!cancelled) setState({ book: null, isSample: false, error: 'לא נמצא קובץ ספר' });
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}
