
import { test, expect, vi } from 'vitest';
import { TypingEngine } from '../src/engine/TypingEngine.js';

// Mock localStorage
global.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};

test('TypingEngine types character directly on stick release (no default vowel)', () => {
    const engine = new TypingEngine();

    // Set internal state to simulate stick held in BASE mode
    engine.state.pendingChar = 'h';
    engine.lastFrameSticks = {
        left: { active: true, sector: 'NORTH' },
        right: { active: false }
    };

    // Simulate input frame where left stick is released
    const input = {
        sticks: {
            left: { active: false, x: 0, y: 0 },
            right: { active: false, x: 0, y: 0 }
        },
        buttons: { dpad: {} },
        mode: { leftTrigger: false, rightTrigger: false, bothTriggers: false },
        id: "Mock Gamepad",
        axes: [0, 0, 0, 0]
    };

    engine.state.lastInput = {
        sticks: {
            left: { active: true, sector: 'NORTH' },
            right: { active: false }
        },
        buttons: { dpad: {} },
        mode: { leftTrigger: false, rightTrigger: false, bothTriggers: false }
    };

    let typed = "";
    engine.typeCharacter = (char) => { typed = char; };

    engine.processFrame(input);

    // Expect just 'h', NOT 'ho' (no default vowel appended)
    expect(typed).toBe('h');
});
