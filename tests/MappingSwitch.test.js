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
    // Abugida should have same BASE consonants
    expect(engine.mappings.BASE.LEFT.NORTH).toBe('h');

    // But different punctuation
    expect(engine.mappings.PUNCTUATION.LEFT.NORTH).toBe('ʭ');
    expect(engine.mappings.PUNCTUATION.LEFT.NORTH).not.toBe(';'); // Should NOT be Latin
});
