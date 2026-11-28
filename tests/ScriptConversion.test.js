/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    convertToAbugida,
    convertFromAbugida,
    convertFromAbugidaWithMap,
    decodeCypher,
} from '../src/scripts/AbugidaScript.js';
import {
    getRegisteredScripts,
    registerScript,
    toLatin,
    fromLatin,
} from '../src/scripts/ScriptRegistry.js';
import { SpellChecker } from '../src/spell/SpellChecker.js';
import { CheckingMode } from '../src/modes/CheckingMode.js';
import { EditorRenderer } from '../src/ui/EditorRenderer.js';
import { SettingsManager } from '../src/ui/SettingsManager.js';
import { FocusManager } from '../src/ui/FocusManager.js';
import { BookManager } from '../src/data/BookManager.js';
import { HistoryManager } from '../src/data/HistoryManager.js';

function makeInput(overrides = {}) {
    return {
        buttons: {
            north: false,
            south: false,
            east: false,
            west: false,
            lb: false,
            rb: false,
            lt: false,
            rt: false,
            start: false,
            select: false,
            dpad: { up: false, down: false, left: false, right: false, ...(overrides.dpad || {}) },
            ...overrides,
        },
    };
}

describe('AbugidaScript & ScriptRegistry', () => {
    it('round-trips Latin <-> Abugida words, compounds, onset vowels, and quotes/nouns', () => {
        expect(convertToAbugida('tom')).toBe('ʌ̇q');
        expect(convertToAbugida('khozd')).toBe('ċ̱ƨv');
        expect(convertToAbugida('parjh phwn')).toBe('èɽɜ̱ ẽ̱ƞ');
        expect(convertToAbugida('aplong')).toBe('ı̀eꞁ̇ƞↄ');
        expect(convertToAbugida('tomuplong')).toBe('ʌ̇q̈eꞁ̇ƞↄ');
        expect(convertToAbugida('u')).toBe(':');

        expect(decodeCypher('ʌ̇q')).toBe('tom');
        expect(decodeCypher('ċ̱ƨv')).toBe('khozd');
        expect(decodeCypher('èɽɜ̱ ẽ̱ƞ')).toBe('parjh phwn');
        expect(decodeCypher('ı̀eꞁ̇ƞↄ')).toBe('aplong');
        expect(decodeCypher('ʌ̇q̈eꞁ̇ƞↄ')).toBe('tomuplong');
        expect(decodeCypher(':')).toBe('u');
        expect(decodeCypher('ı̈')).toBe('u');

        // Also decodes U+0332 (from Abugida.json '◌̲') and U+033D (from 'ı̽')
        expect(decodeCypher('c\u0332\u0307ƨv')).toBe('khozd');
        expect(decodeCypher('ı\u033D')).toBe('x');
        expect(decodeCypher('ɘ\u033D')).toBe('bx');

        // Unwraps quotes & proper noun brackets while preserving citations
        expect(convertFromAbugida('«\u2009q́\u2009» ⟨\u2009ċ̱ƨv\u2009⟩ ⟨\u2009Jake\u2009⟩ {{cite:1,2}}')).toBe(
            '"me" Khozd Jake {{cite:1,2}}'
        );
        expect(convertToAbugida('me {{cite:1,2}}')).toBe('q́ {{cite:1,2}}');
    });

    it('maps Abugida offsets accurately back to original spans', () => {
        const abugida = 'ʌ̇q̈eꞁ̇ƞ'; // 'tomuplon'
        const mapped = convertFromAbugidaWithMap(abugida);
        expect(mapped.text).toBe('tomuplon');
        // 'plon' is indices 4..8 in Latin -> indices 4..8 ('eꞁ̇ƞ') in Abugida
        expect(abugida.slice(mapped.spanMap[4].start, mapped.spanMap[7].end)).toBe('eꞁ̇ƞ');

        const onset = 'ı̀eꞁ̇ƞ'; // 'aplon' (length 6 in Abugida, 5 in Latin)
        const onsetMap = convertFromAbugidaWithMap(onset);
        expect(onsetMap.text).toBe('aplon');
        expect(onset.slice(onsetMap.spanMap[0].start, onsetMap.spanMap[4].end)).toBe('ı̀eꞁ̇ƞ');
    });

    it('registers Abugida automatically and supports custom script registration', () => {
        expect(getRegisteredScripts()).toContain('Latin');
        expect(getRegisteredScripts()).toContain('Abugida');

        // Register a simple custom reverse-string script to verify extensibility
        registerScript('ReverseTest', {
            toLatin: (s) => [...s].reverse().join(''),
            fromLatin: (s) => [...s].reverse().join(''),
        });

        expect(toLatin('em nolp', 'ReverseTest')).toBe('plon me');
        expect(fromLatin('plong', 'ReverseTest')).toBe('gnolp');

        const customChecker = new SpellChecker(null, () => 'ReverseTest');
        const errs = customChecker.checkText('em nolp');
        expect(errs).toHaveLength(1);
        expect(errs[0].latinSegment).toBe('plon');
        const fixes = customChecker.getCorrections(errs[0]);
        expect(fixes.some((f) => f.word === 'gnolp')).toBe(true);
    });
});

describe('SpellChecker & CheckingMode in Abugida', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        Element.prototype.scrollIntoView = vi.fn();
        document.body.innerHTML = `
            <div id="grid-overview"></div>
            <div class="editor-container">
                <div id="checking-gutter" class="checking-gutter" style="display: none;"></div>
                <div id="editor-view" class="custom-editor"></div>
                <div id="checking-corrections-dropdown" class="checking-corrections-dropdown" style="display: none;"></div>
            </div>
        `;
    });

    it('spellchecks Abugida text at segment level and presents/applies Abugida corrections', () => {
        const checker = new SpellChecker(localStorage, () => 'Abugida');
        const plonAb = convertToAbugida('plon'); // eꞁ̇ƞ
        const tomuplonAb = convertToAbugida('tomuplon'); // ʌ̇q̈eꞁ̇ƞ
        const plongAb = convertToAbugida('plong'); // eꞁ̇ƞↄ
        const text = `${convertToAbugida('me')} ${plonAb} ${tomuplonAb} ⟨\u2009${convertToAbugida('khozd')}\u2009⟩ {{cite:1,2}}`;

        const errors = checker.checkText(text);
        expect(errors).toHaveLength(2);
        expect(errors[0].segment).toBe(plonAb);
        expect(errors[0].latinSegment).toBe('plon');
        expect(errors[1].segment).toBe(plonAb);
        expect(errors[1].word).toBe(tomuplonAb);
        expect(errors[1].latinWord).toBe('tomuplon');

        const corrections = checker.getCorrections(errors[0]);
        expect(corrections.some((c) => c.word === plongAb && c.latinWord === 'plong')).toBe(true);

        // End-to-end CheckingMode replacement with RB and ignoring with Y
        const settingsManager = new SettingsManager();
        settingsManager.config.spellcheck = true;
        const focusManager = new FocusManager();
        const bookManager = new BookManager();
        bookManager.metadata.writingSystem = 'Abugida';
        bookManager.saveToStorage = vi.fn();
        bookManager.book['0,0'] = { name: 'Main', content: `${plonAb} ${tomuplonAb}`, cursor: 0 };
        const historyManager = new HistoryManager(bookManager);
        const typingEngine = {
            state: { text: '', cursor: 0, mode: 'BASE', punctuationLayer: 0 },
            mappings: {},
            reset: vi.fn(),
            resetInputState: vi.fn(),
            getFormattedSyllable: vi.fn(() => ''),
        };
        const renderer = new EditorRenderer('editor-view', typingEngine, settingsManager, checker);
        const checkingMode = new CheckingMode({
            typingEngine,
            bookManager,
            historyManager,
            focusManager,
            gridOverview: { setCursor: vi.fn() },
            overviewMode: { cursor: { x: 0, y: 0 }, syncInputState: vi.fn() },
            gamepadManager: { getActiveGamepad: vi.fn(() => ({})) },
            renderer,
            spellChecker: checker,
            showNotification: vi.fn(),
        });

        checkingMode.enter('part');
        expect(checkingMode.corrections.some((c) => c.word === plongAb)).toBe(true);
        const plongIdx = checkingMode.corrections.findIndex((c) => c.word === plongAb);
        checkingMode.selectedCorrectionIndex = plongIdx;

        // RB replaces 'eꞁ̇ƞ' with 'eꞁ̇ƞↄ' and moves to second error inside 'ʌ̇q̈eꞁ̇ƞ'
        checkingMode.handleInput(makeInput({ rb: true }));
        expect(bookManager.getCurrentPart().content).toBe(`${plongAb} ${tomuplonAb}`);
        expect(checkingMode.getCurrentError().word).toBe(tomuplonAb);

        // RB again fixes the compound segment inside 'ʌ̇q̈eꞁ̇ƞ' -> 'ʌ̇q̈eꞁ̇ƞↄ'
        const plongIdx2 = checkingMode.corrections.findIndex((c) => c.word === plongAb);
        checkingMode.selectedCorrectionIndex = plongIdx2;
        checkingMode.handleInput(makeInput());
        checkingMode.handleInput(makeInput({ rb: true }));
        expect(bookManager.getCurrentPart().content).toBe(`${plongAb} ${convertToAbugida('tomuplong')}`);
        expect(checkingMode.errors).toHaveLength(0);
    });

    it('supports Abugida words in ignore_words and add_words', () => {
        const checker = new SpellChecker(localStorage, () => 'Abugida');
        const customAb = convertToAbugida('badkalob');
        const customPartialAb = convertToAbugida('badkalo');

        checker.saveIgnoreWordsText(customAb);
        expect(checker.checkText(customAb)).toHaveLength(0);

        localStorage.clear();
        checker.saveAddWordsText(customAb);
        expect(checker.checkText(customAb)).toHaveLength(0);
        const suggestions = checker.getCorrections(customPartialAb);
        expect(suggestions.some((s) => s.word === customAb)).toBe(true);
    });
});
