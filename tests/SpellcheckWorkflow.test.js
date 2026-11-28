/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpellChecker } from '../src/spell/SpellChecker.js';
import { SettingsManager } from '../src/ui/SettingsManager.js';
import { FocusManager } from '../src/ui/FocusManager.js';
import { Gutter } from '../src/ui/Gutter.js';
import { GutterMode } from '../src/modes/GutterMode.js';
import { SpellcheckMenu } from '../src/ui/SpellcheckMenu.js';
import { EditorRenderer } from '../src/ui/EditorRenderer.js';
import { GridOverview } from '../src/ui/GridOverview.js';
import { WordListEditMode } from '../src/modes/WordListEditMode.js';
import { CheckingMode } from '../src/modes/CheckingMode.js';
import { InputRouter } from '../src/input/InputRouter.js';
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
            l3: false,
            r3: false,
            start: false,
            select: false,
            dpad: { up: false, down: false, left: false, right: false, ...(overrides.dpad || {}) },
            ...overrides,
        },
        sticks: {
            left: { active: false },
            right: { active: false },
        },
        mode: { bothTriggers: false },
    };
}

describe('Spellcheck Workflow (SPELLCHECK_MENU, WordListEditMode, CHECKING, UI)', () => {
    let spellChecker;
    let settingsManager;
    let focusManager;
    let bookManager;
    let historyManager;
    let typingEngine;
    let renderer;
    let gridOverview;
    let overviewMode;
    let spellcheckMenu;
    let wordListEditMode;
    let checkingMode;
    let gamepadManager;

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
            <div class="bottom-bar" id="bottom-bar">
                <div id="mode-indicator"></div>
                <div id="case-indicator"></div>
                <div id="check-mode-btn" style="display: none;"></div>
                <div class="header-actions">
                    <div id="export-logs-btn"></div>
                    <div id="gamepad-btn"></div>
                    <div id="settings-btn"></div>
                    <div id="help-btn"></div>
                    <div id="book-menu-btn"></div>
                </div>
            </div>
        `;

        spellChecker = new SpellChecker();
        settingsManager = new SettingsManager();
        settingsManager.config.spellcheck = true;
        focusManager = new FocusManager();
        bookManager = new BookManager();
        bookManager.saveToStorage = vi.fn();
        historyManager = new HistoryManager(bookManager);

        typingEngine = {
            state: { text: '', cursor: 0, mode: 'BASE', punctuationLayer: 0 },
            mappings: {},
            reset: vi.fn((txt = '') => {
                typingEngine.state.text = txt;
            }),
            resetInputState: vi.fn(),
            getFormattedSyllable: vi.fn(() => ''),
            processFrame: vi.fn(() => typingEngine.state),
        };

        gamepadManager = {
            lastStart: false,
            lastSelect: false,
            lastButtons: {},
            getActiveGamepad: vi.fn(() => ({})),
        };

        renderer = new EditorRenderer('editor-view', typingEngine, settingsManager, spellChecker);
        gridOverview = new GridOverview('grid-overview', bookManager, historyManager, spellChecker, settingsManager);
        overviewMode = {
            cursor: { x: 0, y: 0 },
            syncInputState: vi.fn(),
            handleInput: vi.fn(),
        };

        spellcheckMenu = new SpellcheckMenu();
        wordListEditMode = new WordListEditMode({
            typingEngine,
            bookManager,
            focusManager,
            editorRenderer: renderer,
            gamepadManager,
            spellChecker,
            showNotification: vi.fn(),
            onExitToMenu: (frameInput) => {
                focusManager.setMode('SPELLCHECK_MENU');
                spellcheckMenu.open(frameInput);
            },
        });

        checkingMode = new CheckingMode({
            typingEngine,
            bookManager,
            historyManager,
            focusManager,
            gridOverview,
            overviewMode,
            gamepadManager,
            renderer,
            spellChecker,
            showNotification: vi.fn(),
            onReturnToSpellMenu: (frameInput) => {
                focusManager.setMode('SPELLCHECK_MENU');
                spellcheckMenu.open(frameInput);
            },
        });
    });

    it('includes check-mode-btn in Gutter navigation only when visible', () => {
        const gutter = new Gutter('bottom-bar');
        const gutterMode = new GutterMode({ gutter });

        // Hidden by default when spellcheck is off
        expect(gutter.getItemCount()).toBe(5);

        // Visible when spellcheck is enabled
        document.getElementById('check-mode-btn').style.display = 'flex';
        expect(gutter.getItemCount()).toBe(6);

        gutterMode.activate(); // Starts at far right (book-menu-btn, idx 5)
        expect(gutterMode.selectedIndex).toBe(5);

        // Right from Book Menu wraps to check-mode-btn (idx 0)
        gutterMode.handleInput(makeInput({ dpad: { right: true } }));
        expect(gutterMode.selectedIndex).toBe(0);
    });

    it('exposes all 5 SpellcheckMenu options and returns to GUTTER on Done', () => {
        expect(spellcheckMenu.options.map((o) => o.label)).toEqual([
            'Ignore Words',
            'Add Words',
            'Check Book Spelling',
            'Check Part Spelling',
            'Done',
        ]);

        spellcheckMenu.onClose = () => focusManager.setMode('GUTTER');
        focusManager.setMode('SPELLCHECK_MENU');
        spellcheckMenu.open();
        spellcheckMenu.onConfirm(spellcheckMenu.options[4]); // Done
        expect(focusManager.mode).toBe('GUTTER');
    });

    it('renders red error boxes in EditorRenderer and error highlight + badge in GridOverview', () => {
        bookManager.book['0,0'] = { name: 'Main', content: 'me senufook', cursor: 11 };
        renderer.render(bookManager.getCurrentPart());
        const errSpan = document.querySelector('#editor-view .spell-error');
        expect(errSpan).not.toBeNull();
        expect(errSpan.textContent).toBe('fook');

        gridOverview.activate();
        const partCell = document.querySelector('.grid-part.has-spell-errors');
        expect(partCell).not.toBeNull();
        const badge = partCell.querySelector('.grid-error-badge');
        expect(badge.textContent).toBe('1');
    });

    it('WordListEditMode saves on A without adding space and cancels on Select', () => {
        spellChecker.saveIgnoreWordsText('alpha');
        wordListEditMode.start('ignore_words');
        expect(focusManager.mode).toBe('WORD_LIST_EDIT');
        expect(wordListEditMode.content).toBe('alpha');

        // Simulate user typing '\nbeta'
        typingEngine.processFrame.mockImplementationOnce(() => ({
            text: 'alpha\nbeta',
            mode: 'BASE',
        }));
        wordListEditMode.handleInput(makeInput(), {});
        expect(wordListEditMode.content).toBe('alpha\nbeta');

        // Press A (south) -> saves instead of inserting space
        wordListEditMode.handleInput(makeInput({ south: true }), {});
        expect(localStorage.getItem('ignore_words')).toBe('alpha\nbeta');
        expect(focusManager.mode).toBe('SPELLCHECK_MENU');

        // Re-open add_words, modify buffer, press Select -> cancels without saving
        spellcheckMenu.close(false);
        wordListEditMode.start('add_words');
        wordListEditMode.content = 'unsavedword';
        wordListEditMode.handleInput(makeInput({ select: true }), {});
        expect(localStorage.getItem('add_words')).toBeNull();
        expect(focusManager.mode).toBe('SPELLCHECK_MENU');
    });

    it('CheckingMode navigates part/book errors, updates dropdown, and handles RB, Y, X, A, B, LB, Start, Select', () => {
        bookManager.book = {
            '0,0': { name: 'Main', content: 'me plon senufook', cursor: 0 },
            '1,0': { name: 'Next', content: 'xyznotaword', cursor: 0 },
        };
        bookManager.currentPartKey = '0,0';

        // Enter Part Checking Mode -> moves to 'plon' (1 / 2 in part 0,0)
        checkingMode.enter('part');
        expect(focusManager.mode).toBe('CHECKING');
        expect(document.getElementById('checking-gutter').style.display).toBe('flex');
        expect(document.getElementById('checking-error-counter').textContent).toBe('1 / 2');
        expect(document.getElementById('checking-scope-part').classList.contains('active')).toBe(true);
        expect(bookManager.getCurrentPart().cursor).toBe(7); // End of 'plon'
        expect(checkingMode.corrections.some((c) => c.word === 'plong')).toBe(true);

        // Toggle to Book -> 3 errors across book
        checkingMode.setScope('book');
        expect(document.getElementById('checking-scope-book').classList.contains('active')).toBe(true);
        expect(document.getElementById('checking-error-counter').textContent).toBe('1 / 3');

        // Right D-pad -> moves to 2nd error ('fook' inside 'senufook')
        checkingMode.handleInput(makeInput({ dpad: { right: true } }));
        expect(document.getElementById('checking-error-counter').textContent).toBe('2 / 3');
        expect(checkingMode.getCurrentError().segment).toBe('fook');

        // Right D-pad -> moves across part to 3rd error ('xyznotaword' in 1,0)
        checkingMode.handleInput(makeInput()); // release dpad
        checkingMode.handleInput(makeInput({ dpad: { right: true } }));
        expect(document.getElementById('checking-error-counter').textContent).toBe('3 / 3');
        expect(bookManager.currentPartKey).toBe('1,0');
        expect(document.querySelector('#checking-corrections-dropdown .checking-dropdown-empty').textContent).toBe('No Corrections');

        // Left D-pad back to 1st error ('plon' in 0,0), navigate corrections Down/Up, press RB to replace with 'plong'
        checkingMode.handleInput(makeInput());
        checkingMode.handleInput(makeInput({ dpad: { right: true } })); // wraps to 1 / 3 ('plon' in 0,0)
        expect(bookManager.currentPartKey).toBe('0,0');
        const plongIdx = checkingMode.corrections.findIndex((c) => c.word === 'plong');
        expect(plongIdx).toBeGreaterThanOrEqual(0);
        checkingMode.selectedCorrectionIndex = plongIdx;

        // RB -> replaces 'plon' with 'plong' and moves to next error ('fook')
        checkingMode.handleInput(makeInput({ rb: true }));
        expect(bookManager.getPart(0, 0).content).toBe('me plong senufook');
        expect(checkingMode.getCurrentError().segment).toBe('fook');
        expect(document.getElementById('checking-error-counter').textContent).toBe('1 / 2');

        // Y -> ignores 'senufook' and moves to next error ('xyznotaword' in 1,0)
        checkingMode.handleInput(makeInput());
        checkingMode.handleInput(makeInput({ north: true }));
        expect(localStorage.getItem('ignore_words')).toBe('senufook');
        expect(bookManager.currentPartKey).toBe('1,0');
        expect(document.getElementById('checking-error-counter').textContent).toBe('1 / 1');

        // Start -> returns to SPELLCHECK_MENU
        checkingMode.handleInput(makeInput());
        checkingMode.handleInput(makeInput({ start: true }));
        expect(focusManager.mode).toBe('SPELLCHECK_MENU');

        // Re-enter CHECKING, Select -> exits CHECKING and enters OVERVIEW
        spellcheckMenu.close(false);
        checkingMode.enter('book');
        checkingMode.handleInput(makeInput({ select: true }));
        expect(focusManager.mode).toBe('OVERVIEW');
    });

    it('CheckingMode exits to EDITOR on X, A, B, and LB with exact cursor and text updates', () => {
        // X -> delete erroneous segment and exit to EDITOR at err.from
        bookManager.book['0,0'] = { name: 'Main', content: 'me badone svbh', cursor: 0 };
        checkingMode.enter('part');
        checkingMode.handleInput(makeInput({ west: true }));
        expect(bookManager.getCurrentPart().content).toBe('me  svbh');
        expect(bookManager.getCurrentPart().cursor).toBe(3);
        expect(focusManager.mode).toBe('EDITOR');

        // A -> replace erroneous segment with space and move cursor right
        bookManager.book['0,0'] = { name: 'Main', content: 'me badone svbh', cursor: 0 };
        checkingMode.enter('part');
        checkingMode.handleInput(makeInput({ south: true }));
        expect(bookManager.getCurrentPart().content).toBe('me   svbh');
        expect(bookManager.getCurrentPart().cursor).toBe(4);
        expect(focusManager.mode).toBe('EDITOR');

        // B -> replace erroneous segment with newline and move cursor to newline
        bookManager.book['0,0'] = { name: 'Main', content: 'me badone svbh', cursor: 0 };
        checkingMode.enter('part');
        checkingMode.handleInput(makeInput({ east: true }));
        expect(bookManager.getCurrentPart().content).toBe('me \n svbh');
        expect(bookManager.getCurrentPart().cursor).toBe(4);
        expect(focusManager.mode).toBe('EDITOR');

        // LB -> backspace last char of erroneous word and move cursor left, exiting CHECKING mode
        bookManager.book['0,0'] = { name: 'Main', content: 'me badone svbh', cursor: 0 };
        checkingMode.enter('part');
        checkingMode.handleInput(makeInput({ lb: true }));
        expect(bookManager.getCurrentPart().content).toBe('me badon svbh');
        expect(bookManager.getCurrentPart().cursor).toBe(8);
        expect(focusManager.mode).toBe('EDITOR');
    });

    it('InputRouter routes Start and Select properly for CHECKING, SPELLCHECK_MENU, and WORD_LIST_EDIT', () => {
        const router = new InputRouter({
            focusManager,
            gutterMode: { handleInput: vi.fn() },
            overviewMode,
            editorMode: { handleInput: vi.fn(), lastDpad: {} },
            visualSelectMode: { handleInput: vi.fn() },
            renamingMode: { handleInput: vi.fn() },
            checkingMode,
            wordListEditMode,
            settingsManager,
            gamepadMenu: { handleInput: vi.fn(), close: vi.fn() },
            bookMenu: { handleInput: vi.fn(), toggle: vi.fn() },
            spellcheckMenu,
            helpManager: { isOpen: false, handleInput: vi.fn() },
            gridOverview,
            gamepadManager,
            typingEngine,
        });

        bookManager.book['0,0'] = { name: 'Main', content: 'badone', cursor: 0 };
        checkingMode.enter('part');

        // Start in CHECKING -> returns to SPELLCHECK_MENU
        router.route(makeInput({ start: true }), {});
        expect(focusManager.mode).toBe('SPELLCHECK_MENU');
        expect(spellcheckMenu.isOpen).toBe(true);

        // Select in CHECKING -> goes to OVERVIEW without InputRouter toggling back
        spellcheckMenu.close(false);
        gamepadManager.lastStart = false;
        checkingMode.enter('part');
        router.route(makeInput({ select: true }), {});
        expect(focusManager.mode).toBe('OVERVIEW');
        router.route(makeInput({ select: false }), {});
        expect(focusManager.mode).toBe('OVERVIEW');
    });
});
