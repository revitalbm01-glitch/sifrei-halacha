// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { href, isHome, loadBookmark, readLocation, saveBookmark, startLocation } from '../src/data.js';

const setHash = h => history.replaceState(null, '', h ? `/#${h}` : '/');

beforeEach(() => {
  localStorage.clear();
  setHash('');
});

describe('location', () => {
  it('reads book, topic, siman and seif from the hash', () => {
    setHash('yalkut-yosef/23/1/2');
    expect(readLocation()).toEqual({ book: 'yalkut-yosef', topic: 23, siman: 1, seif: 2 });
  });

  it('treats missing or invalid numbers as null', () => {
    setHash('yalkut-yosef/x/0');
    expect(readLocation()).toEqual({ book: 'yalkut-yosef', topic: null, siman: null, seif: null });
  });

  it('builds the same hash it reads', () => {
    const loc = { book: 'kitzur-shulchan-arukh', topic: 12, siman: 17, seif: 2 };
    expect(href(loc)).toBe('#kitzur-shulchan-arukh/12/17/2');
    setHash(href(loc).slice(1));
    expect(readLocation()).toEqual(loc);
  });

  it('leaves out levels that are not set', () => {
    expect(href({ book: 'yalkut-yosef', topic: 3 })).toBe('#yalkut-yosef/3');
  });

  it('recognizes the home page', () => {
    expect(isHome({ book: null })).toBe(true);
    expect(isHome({ book: 'home' })).toBe(true);
    expect(isHome({ book: 'yalkut-yosef' })).toBe(false);
  });
});

describe('bookmark', () => {
  const bm = { book: 'yalkut-yosef', topic: 23, siman: 3, seif: 3, label: 'ילקוט יוסף · הלכות שבת · סימן רמד סעיף ג' };

  it('saves, loads and clears', () => {
    expect(loadBookmark()).toBeNull();
    saveBookmark(bm);
    expect(loadBookmark()).toEqual(bm);
    saveBookmark(null);
    expect(loadBookmark()).toBeNull();
  });

  it('ignores a broken stored value', () => {
    localStorage.setItem('sifrei-halacha:bookmark', '{not json');
    expect(loadBookmark()).toBeNull();
    localStorage.setItem('sifrei-halacha:bookmark', JSON.stringify({ book: 'x' }));
    expect(loadBookmark()).toBeNull();
  });

  it('opens at the bookmark when the address is empty', () => {
    saveBookmark(bm);
    expect(startLocation()).toEqual({ book: 'yalkut-yosef', topic: 23, siman: 3, seif: 3 });
    expect(location.hash).toBe('#yalkut-yosef/23/3/3');
  });

  it('keeps an explicit address even when there is a bookmark', () => {
    saveBookmark(bm);
    setHash('home');
    expect(startLocation().book).toBe('home');
  });
});
