/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    TypingEngine,
    extractCombiningMarkPair,
    hasPrecedingLetter
} from '../src/engine/TypingEngine.js';
import { EditorMode } from '../src/modes/EditorMode.js';
import { FocusManager } from '../src/ui/FocusManager.js';

global.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};

function makeEmptyGamepad() {
    return {
        id: 'Mock Gamepad',
        axes: [0, 0, 0, 0],
        buttons: Array(17).fill({ pressed: false, value: 0 })
    };
}

function triggerPendingLeftRelease(engine, rawChar) {
    engine.state.pendingChar = rawChar;
    engine.state.lastInput = {
        sticks: {
            left: { active: true, sector: 'NORTH' },
            right: { active: false }
        },
        buttons: { dpad: {} },
        mode: { leftTrigger: false, rightTrigger: false, bothTriggers: false }
    };
    engine.lastFrameSticks = {
        left: { active: true, sector: 'NORTH' },
        right: { active: false }
    };

    engine.processFrame(makeEmptyGamepad());
}

describe('Combining mark mapping helpers', () => {
    it('extracts the combining mark from 2-glyph glyph+mark pairs', () => {
        expect(extractCombiningMarkPair('◌̲')).toBe('\u0332');
        expect(extractCombiningMarkPair('ı̂')).toBe('\u0302');
        expect(extractCombiningMarkPair('ı̇')).toBe('\u0307');
        expect(extractCombiningMarkPair('̂ı')).toBe('\u0302');
    });

    it('returns null for single glyphs or non-combining pairs', () => {
        expect(extractCombiningMarkPair('c')).toBeNull();
        expect(extractCombiningMarkPair(':')).toBeNull();
        expect(extractCombiningMarkPair('ch')).toBeNull();
        expect(extractCombiningMarkPair('\u0302\u0332')).toBeNull();
        expect(extractCombiningMarkPair('')).toBeNull();
    });

    it('detects preceding letters including base letters with existing combining marks', () => {
        expect(hasPrecedingLetter('')).toBe(false);
        expect(hasPrecedingLetter(' ')).toBe(false);
        expect(hasPrecedingLetter('c ')).toBe(false);
        expect(hasPrecedingLetter('c\n')).toBe(false);
        expect(hasPrecedingLetter('c.')).toBe(false);
        expect(hasPrecedingLetter('1')).toBe(false);
        expect(hasPrecedingLetter('◌̲')).toBe(false);
        expect(hasPrecedingLetter('{{cite:1,1}}')).toBe(false);

        expect(hasPrecedingLetter('c')).toBe(true);
        expect(hasPrecedingLetter('c̲')).toBe(true);
        expect(hasPrecedingLetter('ẽ̱')).toBe(true);
        expect(hasPrecedingLetter('ı̂')).toBe(true);
    });
});

describe('TypingEngine combining mark entry', () => {
    let engine;

    beforeEach(() => {
        engine = new TypingEngine();
        engine.setMapping('Abugida');
    });

    it('enters full text when buffer is empty or after non-letter characters', () => {
        engine.reset('');
        triggerPendingLeftRelease(engine, '◌̲');
        expect(engine.getBufferText()).toBe('◌̲');

        engine.reset('c ');
        triggerPendingLeftRelease(engine, 'ı̂');
        expect(engine.getBufferText()).toBe('c ı̂');

        engine.reset('c.');
        triggerPendingLeftRelease(engine, 'ı̀');
        expect(engine.getBufferText()).toBe('c.ı̀');
    });

    it('enters only the combining mark when preceded by a letter', () => {
        engine.reset('c');
        triggerPendingLeftRelease(engine, '◌̲');
        expect(engine.getBufferText()).toBe('c\u0332');

        // Stacking a vowel diacritic onto a consonant that already has a combining mark
        triggerPendingLeftRelease(engine, 'ı̇');
        expect(engine.getBufferText()).toBe('c\u0332\u0307');
    });

    it('respects cursor position in the middle of text', () => {
        engine.reset('c q');
        engine.state.cursor = 1; // "c| q" -> preceded by 'c'
        triggerPendingLeftRelease(engine, 'ı̂');
        expect(engine.getBufferText()).toBe('c q\u0302');

        engine.reset('c q');
        engine.state.cursor = 2; // "c |q" -> preceded by ' '
        triggerPendingLeftRelease(engine, 'ı̂');
        expect(engine.getBufferText()).toBe('c qı̂');
    });

    it('applies Shift/Caps case to full text when CASE_MODE is "upper" and no preceding letter', () => {
        engine.mappings = { ...engine.mappings, CASE_MODE: 'upper' };
        engine.reset('');
        engine.state.caseMode = 1;
        triggerPendingLeftRelease(engine, 'ı̂');
        expect(engine.getBufferText()).toBe('I\u0302');
        expect(engine.state.caseMode).toBe(0);
    });
});

describe('CASE_MODE behavior ("upper" vs "break")', () => {
    let engine;

    beforeEach(() => {
        engine = new TypingEngine();
    });

    it('uses uppercase in "upper" mode for caseMode 1 (once) and caseMode 2 (continuous)', () => {
        engine.setMapping('Latin');
        expect(engine.mappings.CASE_MODE).toBe('upper');

        engine.reset('');
        engine.state.caseMode = 1;
        triggerPendingLeftRelease(engine, 'h');
        expect(engine.getBufferText()).toBe('H');
        expect(engine.state.caseMode).toBe(0);

        triggerPendingLeftRelease(engine, 'y');
        expect(engine.getBufferText()).toBe('Hy');

        engine.state.caseMode = 2;
        triggerPendingLeftRelease(engine, 'r');
        triggerPendingLeftRelease(engine, 'n');
        expect(engine.getBufferText()).toBe('HyRN');
        expect(engine.state.caseMode).toBe(2);
    });

    it('cancels hasPrecedingLetter check once in "break" mode when caseMode is 1', () => {
        engine.setMapping('Abugida');
        expect(engine.mappings.CASE_MODE).toBe('break');

        engine.reset('c');
        engine.state.caseMode = 1;

        // First trigger dumps full 2-codepoint mapping without uppercasing and resets caseMode to 0
        triggerPendingLeftRelease(engine, 'ı̂');
        expect(engine.getBufferText()).toBe('cı̂');
        expect(engine.state.caseMode).toBe(0);

        // Next trigger resumes combining behavior because caseMode returned to 0 and 'ı' is a letter
        triggerPendingLeftRelease(engine, 'ı̀');
        expect(engine.getBufferText()).toBe('cı̂\u0300');
    });

    it('cancels hasPrecedingLetter check continuously in "break" mode when caseMode is 2', () => {
        engine.setMapping('Abugida');

        engine.reset('c');
        engine.state.caseMode = 2;

        triggerPendingLeftRelease(engine, 'ı̂');
        triggerPendingLeftRelease(engine, 'ı̀');
        triggerPendingLeftRelease(engine, '◌̲');
        expect(engine.getBufferText()).toBe('cı̂ı̀◌̲');
        expect(engine.state.caseMode).toBe(2);
    });

    it('does not uppercase staging text in getFormattedSyllable when CASE_MODE is "break"', () => {
        engine.setMapping('Abugida');
        engine.state.pendingChar = 'ı̂';
        engine.state.caseMode = 1;
        expect(engine.getFormattedSyllable()).toBe('ı̂');

        engine.setMapping('Latin');
        engine.state.pendingChar = 'h';
        engine.state.caseMode = 1;
        expect(engine.getFormattedSyllable()).toBe('H');
    });

    it('updates case indicator icons for "upper" and "break" modes', () => {
        document.body.innerHTML = '<div id="case-indicator"></div>';
        const fm = new FocusManager();
        const el = document.getElementById('case-indicator');

        // "upper" mode
        fm.updateCaseIcon(0, 'upper');
        expect(el.innerHTML).toContain('fa-circle');
        fm.updateCaseIcon(1, 'upper');
        expect(el.innerHTML).toContain('fa-arrow-up');
        fm.updateCaseIcon(2, 'upper');
        expect(el.innerHTML).toContain('fa-circle-up');

        // "break" mode
        fm.updateCaseIcon(0, 'break');
        expect(el.innerHTML).toContain('fa-circle');
        fm.updateCaseIcon(1, 'break');
        expect(el.innerHTML).toContain('fa-xmark');
        fm.updateCaseIcon(2, 'break');
        expect(el.innerHTML).toContain('fa-circle-xmark');
    });
});

describe('EditorMode combining mark integration', () => {
    it('syncs cursor so EditorMode inserts full text vs combining mark cleanly at cursor', () => {
        const engine = new TypingEngine();
        engine.setMapping('Abugida');

        const part = { content: 'c q', cursor: 1 };
        const bookManager = {
            currentPartKey: '0,0',
            getCurrentPart: () => part,
            setCurrentPartContent: (c) => { part.content = c; },
            setPartCursor: (pos) => { part.cursor = pos; },
            setDesiredColumn: vi.fn(),
            getDesiredColumn: vi.fn()
        };

        const editorMode = new EditorMode({
            typingEngine: engine,
            bookManager,
            historyManager: { push: vi.fn(), undo: vi.fn(), redo: vi.fn() },
            focusManager: { setMode: vi.fn(), updateModeIcon: vi.fn() },
            gridOverview: {},
            overviewMode: {},
            visualizer: { update: vi.fn() },
            gamepadManager: { lastButtons: { dpad: {} }, getActiveGamepad: () => makeEmptyGamepad() },
            renderer: { render: vi.fn() },
            showNotification: vi.fn()
        });

        editorMode.resetState();

        // Simulate stick release with 'ı̂' while cursor is at index 1 ("c| q")
        engine.state.pendingChar = 'ı̂';
        engine.state.lastInput = {
            sticks: { left: { active: true, sector: 'NORTH_WEST' }, right: { active: false } },
            buttons: { dpad: {} },
            mode: { leftTrigger: true, rightTrigger: false, bothTriggers: false }
        };
        engine.lastFrameSticks = {
            left: { active: true, sector: 'NORTH_WEST' },
            right: { active: false }
        };

        const frameInput = {
            sticks: { left: { active: false, x: 0, y: 0 }, right: { active: false, x: 0, y: 0 } },
            buttons: { dpad: {} },
            mode: { leftTrigger: false, rightTrigger: false, bothTriggers: false }
        };

        editorMode.handleInput(frameInput, makeEmptyGamepad());
        expect(part.content).toBe('c\u0302 q');
        expect(part.cursor).toBe(2);

        // Now move cursor after the space ("ĉ |q", index 3) and enter '◌̲'
        part.cursor = 3;
        engine.state.pendingChar = '◌̲';
        engine.state.lastInput = {
            sticks: { left: { active: true, sector: 'NORTH' }, right: { active: false } },
            buttons: { dpad: {} },
            mode: { leftTrigger: false, rightTrigger: false, bothTriggers: false }
        };
        engine.lastFrameSticks = {
            left: { active: true, sector: 'NORTH' },
            right: { active: false }
        };

        editorMode.handleInput(frameInput, makeEmptyGamepad());
        expect(part.content).toBe('c\u0302 ◌̲q');
        expect(part.cursor).toBe(5);
    });
});
