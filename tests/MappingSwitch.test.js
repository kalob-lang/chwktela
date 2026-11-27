/**
 * @vitest-environment jsdom
 */
import { test, expect, vi, beforeAll } from 'vitest';
import { TypingEngine } from '../src/engine/TypingEngine.js';

beforeAll(() => {
    global.localStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
    };
});

test('TypingEngine switches mappings correctly', () => {
    const engine = new TypingEngine();

    // Default should be Latin
    expect(engine.currentMappingName).toBe('Latin');
    // New format: BASE instead of ONSET
    expect(engine.mappings.BASE.LEFT.NORTH).toBe('h');

    // Switch to Abugida
    engine.setMapping('Abugida');

    expect(engine.currentMappingName).toBe('Abugida');
    // Abugida uses combining underline carrier on BASE.LEFT.NORTH
    expect(engine.mappings.BASE.LEFT.NORTH).toBe('◌̲');

    // But different punctuation
    expect(Array.isArray(engine.mappings.PUNCTUATION)).toBe(true);
    expect(engine.mappings.PUNCTUATION[0].LEFT.NORTH).toBe('⸵');
    expect(engine.mappings.PUNCTUATION[0].LEFT.NORTH).not.toBe(';'); // Should NOT be Latin
});
