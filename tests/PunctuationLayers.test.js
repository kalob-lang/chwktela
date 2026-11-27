/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TypingEngine } from '../src/engine/TypingEngine.js';
import { EditorMode } from '../src/modes/EditorMode.js';
import { FocusManager } from '../src/ui/FocusManager.js';
import { Visualizer } from '../src/ui/Visualizer.js';

global.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};

function makeGamepad({ lt = false, rt = false, north = false } = {}) {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    buttons[3] = { pressed: north, value: north ? 1 : 0 };
    buttons[6] = { pressed: lt, value: lt ? 1 : 0 };
    buttons[7] = { pressed: rt, value: rt ? 1 : 0 };
    return {
        id: 'Mock Gamepad',
        axes: [0, 0, 0, 0],
        buttons
    };
}

describe('Punctuation Array Layers & Rotation', () => {
    let engine;

    beforeEach(() => {
        engine = new TypingEngine();
        engine.setMapping('Latin');
    });

    it('rotates through PUNCTUATION layers on LT + RT + Y and wraps around', () => {
        expect(engine.getPunctuationLayers()).toHaveLength(3);
        expect(engine.state.punctuationLayer).toBe(0);

        // Seed previous frame holding both triggers (Y not pressed)
        engine.processFrame(makeGamepad({ lt: true, rt: true, north: false }));
        expect(engine.state.mode).toBe('PUNCTUATION');

        // 1st click of Y -> Layer 1 (numbers)
        engine.processFrame(makeGamepad({ lt: true, rt: true, north: true }));
        expect(engine.state.punctuationLayer).toBe(1);
        expect(engine.getActivePunctuationLayer().LEFT.NORTH).toBe('1');

        // Holding Y on next frame does not double-rotate
        engine.processFrame(makeGamepad({ lt: true, rt: true, north: true }));
        expect(engine.state.punctuationLayer).toBe(1);

        // Release Y, click Y again -> Layer 2 (symbols)
        engine.processFrame(makeGamepad({ lt: true, rt: true, north: false }));
        engine.processFrame(makeGamepad({ lt: true, rt: true, north: true }));
        expect(engine.state.punctuationLayer).toBe(2);
        expect(engine.getActivePunctuationLayer().LEFT.NORTH).toBe('@');

        // Release Y, click Y again on last layer -> wraps to Layer 0
        engine.processFrame(makeGamepad({ lt: true, rt: true, north: false }));
        engine.processFrame(makeGamepad({ lt: true, rt: true, north: true }));
        expect(engine.state.punctuationLayer).toBe(0);
        expect(engine.getActivePunctuationLayer().LEFT.NORTH).toBe(';');
    });

    it('types characters from the active PUNCTUATION layer and preserves layer across reset()', () => {
        engine.processFrame(makeGamepad({ lt: true, rt: true, north: false }));
        engine.processFrame(makeGamepad({ lt: true, rt: true, north: true })); // -> Layer 1
        expect(engine.state.punctuationLayer).toBe(1);

        // Simulated reset() after EditorMode inserts a character keeps layer index
        engine.reset('1');
        expect(engine.state.punctuationLayer).toBe(1);

        // Simulate stick release with pending char from Layer 1
        engine.state.mode = 'PUNCTUATION';
        engine.state.pendingChar = engine.getActivePunctuationLayer().LEFT.NORTH_WEST; // '2'
        engine.state.lastInput = {
            sticks: { left: { active: true, sector: 'NORTH_WEST' }, right: { active: false } },
            buttons: { dpad: {} },
            mode: { leftTrigger: true, rightTrigger: true, bothTriggers: true }
        };
        engine.lastFrameSticks = {
            left: { active: true, sector: 'NORTH_WEST' },
            right: { active: false }
        };

        engine.processFrame(makeGamepad({ lt: true, rt: true, north: false }));
        expect(engine.getBufferText()).toBe('12');

        // Switching mapping resets punctuationLayer back to 0
        engine.setMapping('Abugida');
        expect(engine.state.punctuationLayer).toBe(0);
        expect(engine.getActivePunctuationLayer().LEFT.NORTH).toBe('⸵');
    });

    it('normalizes legacy single-object PUNCTUATION mappings cleanly', () => {
        engine.mappings = {
            ...engine.mappings,
            PUNCTUATION: { LEFT: { NORTH: '?' }, RIGHT: { NORTH: '!' } }
        };
        expect(engine.getPunctuationLayers()).toHaveLength(1);
        expect(engine.getActivePunctuationLayer().LEFT.NORTH).toBe('?');
        engine.rotatePunctuationLayer();
        expect(engine.state.punctuationLayer).toBe(0);
    });
});

describe('EditorMode, Visualizer, and FocusManager PUNCTUATION layer integration', () => {
    it('rotates layer and updates visualizer immediately on LT + RT + Y in EditorMode', () => {
        const engine = new TypingEngine();
        engine.setMapping('Latin');

        const part = { content: '', cursor: 0 };
        const visualizer = { update: vi.fn() };
        const undoSpy = vi.fn().mockResolvedValue(null);
        const redoSpy = vi.fn().mockResolvedValue(null);

        const editorMode = new EditorMode({
            typingEngine: engine,
            bookManager: {
                currentPartKey: '0,0',
                getCurrentPart: () => part,
                setCurrentPartContent: vi.fn(),
                setPartCursor: vi.fn(),
                setDesiredColumn: vi.fn(),
                getDesiredColumn: vi.fn()
            },
            historyManager: { push: vi.fn(), undo: undoSpy, redo: redoSpy },
            focusManager: { setMode: vi.fn(), updateModeIcon: vi.fn() },
            gridOverview: {},
            overviewMode: {},
            visualizer,
            gamepadManager: {
                lastButtons: { dpad: {}, lt: true, rt: true, north: false },
                getActiveGamepad: () => makeGamepad({ lt: true, rt: true, north: false })
            },
            renderer: { render: vi.fn() },
            showNotification: vi.fn()
        });

        editorMode.resetState();

        const frameInput = {
            sticks: { left: { active: false, x: 0, y: 0 }, right: { active: false, x: 0, y: 0 } },
            buttons: { dpad: {}, lt: true, rt: true, north: true },
            mode: { leftTrigger: true, rightTrigger: true, bothTriggers: true }
        };

        editorMode.handleInput(frameInput, makeGamepad({ lt: true, rt: true, north: true }));

        expect(engine.state.punctuationLayer).toBe(1);
        expect(undoSpy).not.toHaveBeenCalled();
        expect(redoSpy).not.toHaveBeenCalled();
        expect(visualizer.update).toHaveBeenCalledWith(frameInput, 'PUNCTUATION', engine.mappings, 1);
    });

    it('updates Visualizer segment labels to reflect active PUNCTUATION layer', () => {
        document.body.innerHTML = `
            <div id="vis">
                <div id="left-joy"><div class="stick-point"></div></div>
                <div id="right-joy"><div class="stick-point"></div></div>
            </div>
        `;
        const vis = new Visualizer('vis');
        const engine = new TypingEngine();
        engine.setMapping('Abugida');

        const frameInput = {
            sticks: {
                left: { active: false, x: 0, y: 0, sector: null },
                right: { active: false, x: 0, y: 0, sector: null }
            }
        };

        vis.update(frameInput, 'PUNCTUATION', engine.mappings, 0);
        expect(vis.leftSegments[0].label.textContent).toBe('⸵');

        vis.update(frameInput, 'PUNCTUATION', engine.mappings, 1);
        expect(vis.leftSegments[0].label.textContent).toBe('1');
        expect(vis.rightSegments[0].label.textContent).toBe('6');

        vis.update(frameInput, 'PUNCTUATION', engine.mappings, 2);
        expect(vis.leftSegments[0].label.textContent).toBe('@');
        expect(vis.rightSegments[0].label.textContent).toBe('*');
    });

    it('updates #case-indicator with fa-circle / fa-circle-dot icons matching PUNCTUATION layers', () => {
        document.body.innerHTML = '<div id="case-indicator"></div>';
        const fm = new FocusManager();
        const el = document.getElementById('case-indicator');

        fm.updateCaseIcon(0, 'upper', { layerIndex: 0, layerCount: 3 });
        let icons = [...el.querySelectorAll('i')];
        expect(icons).toHaveLength(3);
        expect(icons[0].className).toContain('fa-circle-dot');
        expect(icons[1].className).toContain('fa-circle');
        expect(icons[1].className).not.toContain('fa-circle-dot');
        expect(icons[2].className).toContain('fa-circle');
        expect(icons[2].className).not.toContain('fa-circle-dot');

        fm.updateCaseIcon(0, 'upper', { layerIndex: 2, layerCount: 3 });
        icons = [...el.querySelectorAll('i')];
        expect(icons[0].className).not.toContain('fa-circle-dot');
        expect(icons[1].className).not.toContain('fa-circle-dot');
        expect(icons[2].className).toContain('fa-circle-dot');

        // Returning from PUNCTUATION restores case icon
        fm.updateCaseIcon(1, 'upper', null);
        icons = [...el.querySelectorAll('i')];
        expect(icons).toHaveLength(1);
        expect(icons[0].className).toContain('fa-arrow-up');
    });
});
