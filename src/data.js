import { useEffect, useState } from 'react';

// Files under public/data/, as described in docs/schema.md
const cache = new Map();

function loadJson(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(`/data/${path}`).then(res => {
      if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
      return res.json();
    }).catch(err => {
      cache.delete(path); // allow a retry
      throw err;
    }));
  }
  return cache.get(path);
}

// { data, error } for one file; path null means "nothing to load yet"
export function useJson(path) {
  const [state, setState] = useState({ path: null, data: null, error: null });

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    loadJson(path).then(
      data => !cancelled && setState({ path, data, error: null }),
      error => !cancelled && setState({ path, data: null, error }),
    );
    return () => { cancelled = true; };
  }, [path]);

  // Hide the previous file's data while the next one loads
  return state.path === path ? state : { path, data: null, error: null };
}

// Location lives in the hash: #<bookId>/<topic n>/<siman #>/<seif #>
export function readLocation() {
  const [book, topic, siman, seif] = decodeURIComponent(location.hash.slice(1)).split('/');
  const num = s => (Number(s) > 0 ? Number(s) : null);
  return { book: book || null, topic: num(topic), siman: num(siman), seif: num(seif) };
}

export function href({ book, topic, siman, seif }) {
  return '#' + [book, topic, siman, seif].filter(x => x != null).join('/');
}
