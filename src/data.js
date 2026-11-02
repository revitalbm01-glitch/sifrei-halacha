import { useEffect, useState } from 'react';

// Files under public/data/, as described in docs/schema.md
const cache = new Map();

export function loadJson(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(`${import.meta.env.BASE_URL}data/${path}`).then(res => {
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

export const HOME = 'home';
export const SEARCH = 'search';

// Location lives in the hash: #<bookId>/<topic n>/<siman #>/<seif #>, #home, or
// #search/<question> (the question may contain "/")
export function readLocation() {
  const raw = decodeURIComponent(location.hash.slice(1));
  if (raw === SEARCH || raw.startsWith(`${SEARCH}/`)) {
    return { book: SEARCH, topic: null, siman: null, seif: null, query: raw.slice(SEARCH.length + 1) };
  }
  const [book, topic, siman, seif] = raw.split('/');
  const num = s => (Number(s) > 0 ? Number(s) : null);
  return { book: book || null, topic: num(topic), siman: num(siman), seif: num(seif) };
}

export function href({ book, topic, siman, seif }) {
  return '#' + [book, topic, siman, seif].filter(x => x != null).join('/');
}

export const searchHref = query => `#${SEARCH}/${encodeURIComponent(query.trim())}`;

export const isHome = loc => !loc.book || loc.book === HOME;
export const isSearch = loc => loc.book === SEARCH;

export const shortTitle = book => (book.id === 'yalkut-yosef' ? 'ילקוט יוסף' : book.title);

// One bookmark per device, kept in the browser:
// { book, topic, siman, seif, label }
const BOOKMARK_KEY = 'sifrei-halacha:bookmark';

export function loadBookmark() {
  try {
    const bm = JSON.parse(localStorage.getItem(BOOKMARK_KEY));
    return bm?.book && bm.topic && bm.siman ? bm : null;
  } catch {
    return null;
  }
}

export function saveBookmark(bm) {
  try {
    if (bm) localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bm));
    else localStorage.removeItem(BOOKMARK_KEY);
  } catch {
    // storage blocked (private mode): the bookmark lasts until the page closes
  }
}

// Opening the site with no address goes to the bookmark, if there is one
export function startLocation() {
  const bm = !location.hash && loadBookmark();
  if (bm) history.replaceState(null, '', href(bm));
  return readLocation();
}
