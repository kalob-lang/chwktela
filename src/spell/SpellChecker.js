import {
  commonSuffixes,
  createKalobSpell,
  lexiconData,
  numRegex,
  nounRegex,
  suffixesArray,
  strictNounRootsArray,
} from 'kalob-spell';

export const IGNORE_WORDS_STORAGE_KEY = 'ignore_words';
export const ADD_WORDS_STORAGE_KEY = 'add_words';

const CITATION_REGEX = /\{\{cite:.*?\}\}/g;
const LOOKBEHIND = '(?<=^|[\\s\\-"\'“«<¿])';
const LOOKAHEAD = '(?=[\\s\\.,;:\\-"\'”»>?]|$)';
const WORD_REGEX = new RegExp(`${LOOKBEHIND}\\p{Letter}+${LOOKAHEAD}`, 'gv');

// Mirror compound part rules from kalob-spell / machka SpellCheckEditor.tsx
const nonZeroDigit = 'phwn|tvbh|threz|qad|phabh|sigz|sebd|khogd|nobh';
const digit = `ling|${nonZeroDigit}`;
const teens = `ce(?:${nonZeroDigit})`;
const tenBase = `cen|${teens}|(?:${nonZeroDigit}|${teens})en`;
const hundredsDigit = `tvbh|threz|qad|phabh|sigz|sebd|khogd|nobh|${teens}`;
const hundredBase = `khwnd|(?:${hundredsDigit})wnd`;
const multiplier = `(?:${hundredBase}|${tenBase}|${digit})`;
const myoBlock = `(?:${multiplier})?myo(?:n|${multiplier})`;
const numberEntity = `(?:${myoBlock}|${multiplier})`;
const numberSuffixPattern = `(?:am|idh|oz|om|erl|old|in|ag|od)`;
const nounPattern = `(?:${strictNounRootsArray.join('|')})`;
const suffixPattern = `(?:${suffixesArray.join('|')})`;
const headNoun = `${nounPattern}(?:${suffixPattern}){0,3}`;
const headNumber = `${numberEntity}(?:${numberSuffixPattern}){0,3}`;
const compoundPart = `(?:${headNoun}|${headNumber})`;

const firstPartRegex = new RegExp(`^[aeiouvw]?${compoundPart}$`);
const middlePartRegex = new RegExp(`^${compoundPart}$`);
const lastPartRegex = new RegExp(`^${compoundPart}[eioavw]?(?:zh|j)?$`);
const firstAndLastPartRegex = new RegExp(`^[aeiouvw]?${compoundPart}[eioavw]?(?:zh|j)?$`);

export function parseWordList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((w) => String(w).trim()).filter(Boolean);
      }
    } catch {
      // Fall through to newline parsing
    }
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function normalizeWordListText(text) {
  return parseWordList(text).join('\n');
}

export class SpellChecker {
  constructor(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.storage = storage;
    this.kalobSpell = createKalobSpell({
      storageKey: false,
      customWords: () => this.getAddWords(),
    });
  }

  _readStorage(key) {
    if (!this.storage) return '';
    try {
      return this.storage.getItem(key) || '';
    } catch {
      return '';
    }
  }

  _writeStorage(key, value) {
    if (!this.storage) return;
    try {
      this.storage.setItem(key, value);
    } catch (e) {
      console.error(`[SpellChecker] Failed to save ${key}:`, e);
    }
  }

  getIgnoreWordsText() {
    return this._readStorage(IGNORE_WORDS_STORAGE_KEY);
  }

  saveIgnoreWordsText(text) {
    const normalized = normalizeWordListText(text);
    this._writeStorage(IGNORE_WORDS_STORAGE_KEY, normalized);
    return normalized;
  }

  getIgnoreWords() {
    return parseWordList(this.getIgnoreWordsText());
  }

  getIgnoreWordsSet() {
    return new Set(this.getIgnoreWords().map((w) => w.toLowerCase()));
  }

  addIgnoreWord(word) {
    const clean = (word || '').trim();
    if (!clean) return false;
    const current = this.getIgnoreWords();
    const lower = clean.toLowerCase();
    if (current.some((w) => w.toLowerCase() === lower)) {
      return false;
    }
    this._writeStorage(IGNORE_WORDS_STORAGE_KEY, [...current, clean].join('\n'));
    return true;
  }

  getAddWordsText() {
    return this._readStorage(ADD_WORDS_STORAGE_KEY);
  }

  saveAddWordsText(text) {
    const normalized = normalizeWordListText(text);
    this._writeStorage(ADD_WORDS_STORAGE_KEY, normalized);
    this.kalobSpell.refresh();
    return normalized;
  }

  getAddWords() {
    return parseWordList(this.getAddWordsText());
  }

  getAddWordsSet() {
    return new Set(this.getAddWords().map((w) => w.toLowerCase()));
  }

  _isSegmentValid(seg, { isFirst, isLast, hasLeadingU, ignoredSet, addedSet }) {
    if (!seg) return false;
    if (ignoredSet.has(seg) || addedSet.has(seg)) return true;

    if (isFirst && isLast) {
      return hasLeadingU
        ? lastPartRegex.test(seg) || this.kalobSpell.check(seg)
        : firstAndLastPartRegex.test(seg) || this.kalobSpell.check(seg);
    }
    if (isFirst && !hasLeadingU) {
      return firstPartRegex.test(seg);
    }
    if (isLast) {
      return lastPartRegex.test(seg);
    }
    return middlePartRegex.test(seg);
  }

  _checkCompoundSegments(word, wordFrom, ignoredSet, addedSet) {
    const lower = word.toLowerCase();
    if (!lower.includes('u')) {
      return [
        {
          from: wordFrom,
          to: wordFrom + word.length,
          segment: word,
          word,
          wordFrom,
          wordTo: wordFrom + word.length,
        },
      ];
    }

    // Split by 'u' glue while tracking exact offsets in the original word
    const rawParts = [];
    let start = 0;
    for (let i = 0; i <= lower.length; i++) {
      if (i === lower.length || lower[i] === 'u') {
        rawParts.push({
          text: lower.slice(start, i),
          original: word.slice(start, i),
          start,
          end: i,
        });
        start = i + 1;
      }
    }

    const hasLeadingU = rawParts.length > 1 && rawParts[0].text === '';
    const hasTrailingU = rawParts.length > 1 && rawParts[rawParts.length - 1].text === '';

    const sliceStart = hasLeadingU ? 1 : 0;
    const sliceEnd = hasTrailingU ? rawParts.length - 1 : rawParts.length;
    const activeParts = rawParts.slice(sliceStart, sliceEnd);

    if (activeParts.length === 0) {
      return [
        {
          from: wordFrom,
          to: wordFrom + word.length,
          segment: word,
          word,
          wordFrom,
          wordTo: wordFrom + word.length,
        },
      ];
    }

    const errors = [];
    for (let i = 0; i < activeParts.length; i++) {
      const part = activeParts[i];
      const isFirst = i === 0;
      const isLast = i === activeParts.length - 1;

      if (part.text === '') {
        // Double 'uu' in the middle of a compound
        const errFrom = Math.max(0, part.start - 1);
        const errTo = Math.min(word.length, part.end + 1);
        errors.push({
          from: wordFrom + errFrom,
          to: wordFrom + errTo,
          segment: word.slice(errFrom, errTo),
          word,
          wordFrom,
          wordTo: wordFrom + word.length,
        });
        continue;
      }

      if (
        !this._isSegmentValid(part.text, {
          isFirst,
          isLast,
          hasLeadingU,
          ignoredSet,
          addedSet,
        })
      ) {
        errors.push({
          from: wordFrom + part.start,
          to: wordFrom + part.end,
          segment: part.original,
          word,
          wordFrom,
          wordTo: wordFrom + word.length,
        });
      }
    }

    if (errors.length === 0) {
      errors.push({
        from: wordFrom,
        to: wordFrom + word.length,
        segment: word,
        word,
        wordFrom,
        wordTo: wordFrom + word.length,
      });
    }

    return errors;
  }

  checkText(content) {
    if (!content) return [];

    const ignoredSet = this.getIgnoreWordsSet();
    const addedSet = this.getAddWordsSet();

    const citationSpans = [];
    let citeMatch;
    CITATION_REGEX.lastIndex = 0;
    while ((citeMatch = CITATION_REGEX.exec(content)) !== null) {
      citationSpans.push({
        from: citeMatch.index,
        to: citeMatch.index + citeMatch[0].length,
      });
    }

    const errors = [];
    for (const match of content.matchAll(WORD_REGEX)) {
      const word = match[0];
      const wordFrom = match.index;
      const wordTo = wordFrom + word.length;

      if (citationSpans.some((c) => wordFrom < c.to && wordTo > c.from)) {
        continue;
      }
      if (/^[A-Z]/.test(word)) {
        continue;
      }

      const lower = word.toLowerCase();
      if (ignoredSet.has(lower)) {
        continue;
      }
      if (this.kalobSpell.check(word)) {
        continue;
      }

      const segmentErrors = this._checkCompoundSegments(word, wordFrom, ignoredSet, addedSet);
      errors.push(...segmentErrors);
    }

    return errors;
  }

  getOrderedPartEntries(bookManager) {
    const partsMap = bookManager?.getAllParts?.() || {};
    return Object.entries(partsMap)
      .map(([key, part]) => {
        const [x, y] = key.split(',').map(Number);
        return { key, x, y, part };
      })
      .sort((a, b) => {
        if (b.y !== a.y) return b.y - a.y; // Top-to-bottom (Y+ is Up)
        return a.x - b.x; // Left-to-right
      });
  }

  checkBook(bookManager) {
    const ordered = this.getOrderedPartEntries(bookManager);
    const byPart = new Map();
    const allErrors = [];

    for (const entry of ordered) {
      const partErrors = this.checkText(entry.part?.content || '');
      byPart.set(entry.key, partErrors);
      for (const err of partErrors) {
        allErrors.push({
          ...err,
          partKey: entry.key,
          x: entry.x,
          y: entry.y,
        });
      }
    }

    return {
      totalErrors: allErrors.length,
      byPart,
      allErrors,
    };
  }

  getCorrections(segment, limit = 8) {
    const clean = (segment || '').trim();
    if (!clean) return [];

    const lower = clean.toLowerCase();
    const candidates = new Map();

    const addCandidate = (word, item, score) => {
      const wLower = word.toLowerCase();
      if (wLower === lower) return;
      if (!this.kalobSpell.check(word)) return;
      const existing = candidates.get(wLower);
      if (!existing || score < existing.score) {
        candidates.set(wLower, {
          word,
          eng: item.eng || '',
          cat: item.cat || '',
          pos: item.pos || '',
          score,
        });
      }
    };

    for (const res of this.kalobSpell.suggestCorrections(clean, { threshold: 0.4, limit: 12 })) {
      addCandidate(res.item.word, res.item, res.score ?? 0.4);
    }

    // Try stripping optional leading vowel prefix [aeiouvw]
    if (/^[aeiouvw]/.test(lower) && lower.length >= 3) {
      const prefix = lower[0];
      const stem = lower.slice(1);
      for (const res of this.kalobSpell.suggestCorrections(stem, { threshold: 0.4, limit: 8 })) {
        addCandidate(prefix + res.item.word, res.item, (res.score ?? 0.4) + 0.01);
      }
    }

    // Try stripping optional trailing primary ending [eioavw]?(zh|j)?
    const endingMatch = lower.match(/^(.{2,}?)([eioavw]?(?:zh|j)|[eioavw])$/);
    if (endingMatch) {
      const [, stem, ending] = endingMatch;
      for (const res of this.kalobSpell.suggestCorrections(stem, { threshold: 0.4, limit: 8 })) {
        addCandidate(res.item.word + ending, res.item, (res.score ?? 0.4) + 0.02);
      }
    }

    return Array.from(candidates.values())
      .sort((a, b) => a.score - b.score)
      .slice(0, limit)
      .map(({ word, eng, cat, pos }) => ({ word, eng, cat, pos }));
  }
}

export { lexiconData, commonSuffixes, numRegex, nounRegex };
