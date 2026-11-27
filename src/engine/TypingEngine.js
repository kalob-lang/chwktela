import { InputMapper } from '../input/InputMapper.js';
import { logger } from '../utils/DebugLogger.js';

// Load all JSON mappings from src/mappings
const mappingFiles = import.meta.glob('../mappings/*.json', { eager: true });
const availableMappings = {};

Object.keys(mappingFiles).forEach(path => {
    // Extract filename without extension: "../mappings/Latin.json" -> "Latin"
    const name = path.split('/').pop().replace(/\.json$/, '');
    availableMappings[name] = mappingFiles[path].default || mappingFiles[path];
});

/**
 * If value is a 2-glyph mapping containing one non-combining glyph and one combining mark,
 * return the combining mark. Otherwise return null.
 */
export function extractCombiningMarkPair(value) {
    if (!value) return null;
    const chars = [...value];
    if (chars.length !== 2) return null;
    const isMark0 = /\p{M}/u.test(chars[0]);
    const isMark1 = /\p{M}/u.test(chars[1]);
    if (isMark0 === isMark1) return null;
    return isMark1 ? chars[1] : chars[0];
}

/**
 * Return true if the text immediately before the cursor ends with a letter
 * (skipping over any trailing combining marks attached to that base glyph).
 */
export function hasPrecedingLetter(textBeforeCursor) {
    if (!textBeforeCursor) return false;
    const chars = [...textBeforeCursor];
    let i = chars.length - 1;
    while (i >= 0 && /\p{M}/u.test(chars[i])) {
        i--;
    }
    return i >= 0 && /\p{L}/u.test(chars[i]);
}

export class TypingEngine {
    constructor() {
        this.mapper = new InputMapper();
        this.state = {
            mode: 'BASE',
            text: '',

            // Case: 0=lower, 1=shift (next char), 2=caps (lock)
            caseMode: 0,

            // Actions (consumed by main loop)
            action: null,

            // Tracking
            lastInput: null,
            pendingChar: null,

            // Debounce / Dwell State
            leftStick: { sector: null, enterTime: 0, locked: false },
            rightStick: { sector: null, enterTime: 0, locked: false },

            modeSwitchTime: 0
        };

        this.DWELL_THRESHOLD = 60;

        // Load default mapping (Latin) or fallback to first available
        this.currentMappingName = 'Latin';
        this.mappings = availableMappings['Latin'] || Object.values(availableMappings)[0];

        this.lastFrameSticks = {
            left: { active: false, sector: null, enterTime: 0 },
            right: { active: false, sector: null, enterTime: 0 }
        };
    }

    getAvailableMappings() {
        return Object.keys(availableMappings);
    }

    setMapping(name) {
        if (availableMappings[name]) {
            this.currentMappingName = name;
            this.mappings = availableMappings[name];
            logger.log('SYSTEM', `Mapping switched to ${name}`);
        } else {
            console.error(`Mapping ${name} not found`);
        }
    }

    processFrame(gamepad) {
        this.state.action = null; // Reset action flag
        const input = this.mapper.map(gamepad);
        if (!input) return null;

        // Detect Mode Transition
        let newMode = 'BASE';
        if (input.mode.bothTriggers) {
            newMode = 'PUNCTUATION';
        } else if (input.mode.leftTrigger) {
            newMode = 'LEFT_TRIGGER';
        } else if (input.mode.rightTrigger) {
            newMode = 'RIGHT_TRIGGER';
        }

        // Handle Mode Change logic (Triggers)
        if (this.state.mode !== newMode) {
            this.state.mode = newMode;
            this.state.modeSwitchTime = Date.now(); // Record switch time
            logger.log('MODE', `Switched to ${newMode}`);
        }

        this.handleStickInput(input, this.state.lastInput);
        this.handleButtons(input, this.state.lastInput);

        this.state.lastInput = input;
        return this.state;
    }

    handleStickInput(current, last) {
        if (!last) return;

        const now = Date.now();

        const processStick = (stickName, map) => {
            if (!map) return; // No mapping for this stick in this mode

            const curStick = current.sticks[stickName];
            const lastStick = this.lastFrameSticks[stickName] || { active: false, sector: null, enterTime: 0 };
            const stickState = this.state[`${stickName}Stick`];

            // 1. Dwell / Active Handling
            if (!curStick.active) {
                if (stickState.locked) logger.log('STICK', `${stickName} Unlocked`);
                stickState.locked = false; // Unlock on release
            }
            if (stickState.locked) return; // Ignore if locked

            // 2. Sector Stability Check
            if (curStick.active && curStick.sector) {
                if (stickState.sector !== curStick.sector) {
                    // Entered new sector
                    logger.log('SECTOR', `${stickName} -> ${curStick.sector} (${Math.round(curStick.angle)}°)`);
                    stickState.sector = curStick.sector;
                    stickState.enterTime = now;
                } else {
                    // Holding same sector
                    const holdDuration = now - stickState.enterTime;

                    // Only act if held > threshold
                    if (holdDuration > this.DWELL_THRESHOLD) {
                        // Filter: If we held this stick BEFORE the last mode switch, ignore it.
                        if (stickState.enterTime > this.state.modeSwitchTime) {
                            const char = map[curStick.sector];
                            if (char) {
                                this.state.pendingChar = char;
                            }
                        }
                    }
                }
            } else {
                // Stick inactive
                stickState.sector = null;
                stickState.enterTime = 0;
            }

            // 3. Commit on Release - type the character immediately
            if (lastStick.active && !curStick.active) {
                if (this.state.pendingChar) {
                    const caseType = this.getCaseModeType();
                    const bypassPrecedingCheck = (caseType === 'break' && this.state.caseMode > 0);
                    let char = this.resolveMappedText(this.state.pendingChar, { bypassPrecedingCheck });

                    // Apply case
                    if (caseType === 'upper' && (this.state.caseMode === 1 || this.state.caseMode === 2)) {
                        char = char.toUpperCase();
                    }

                    if (this.state.caseMode === 1) {
                        this.consumeShift();
                    }

                    this.typeCharacter(char);
                    this.state.pendingChar = null;
                    stickState.locked = true;
                }
            }
        };

        // Determine maps based on current mode
        if (this.state.mode === 'BASE') {
            processStick('left', this.mappings.BASE?.LEFT);
            processStick('right', this.mappings.BASE?.RIGHT);
        }
        else if (this.state.mode === 'LEFT_TRIGGER') {
            processStick('left', this.mappings.LEFT_TRIGGER?.LEFT);
            processStick('right', this.mappings.LEFT_TRIGGER?.RIGHT);
        }
        else if (this.state.mode === 'RIGHT_TRIGGER') {
            // Left stick stays on BASE, right stick uses RIGHT_TRIGGER
            processStick('left', this.mappings.BASE?.LEFT);
            processStick('right', this.mappings.RIGHT_TRIGGER?.RIGHT);
        }
        else if (this.state.mode === 'PUNCTUATION') {
            processStick('left', this.mappings.PUNCTUATION?.LEFT);
            processStick('right', this.mappings.PUNCTUATION?.RIGHT);
        }

        // IMPORTANT: Update state for next frame
        if (current.sticks) {
            this.lastFrameSticks = {
                left: { ...current.sticks.left },
                right: { ...current.sticks.right }
            };
        }
    }

    handleButtons(current, last) {
        if (!last) return;

        const pressed = (btn) => current.buttons[btn] && !last.buttons[btn];
        const holdingModifier = current.buttons.north; // Y Button (North)

        if (pressed('south')) { // A Button: Space
            this.typeCharacter(' ');
        }
        if (pressed('east')) { // B Button: Enter
            this.typeCharacter('\n');
        }

        // --- EDITING KEYS ---

        // LB (Left Shoulder): Backspace / Ctrl+Backspace
        if (pressed('lb')) {
            if (holdingModifier) {
                this.state.action = 'DELETE_WORD_LEFT';
            } else {
                this.deleteCharacter();
            }
        }

        // X (West): Delete (Forward)
        if (pressed('west')) {
            this.state.action = 'DELETE_FORWARD';
        }

        // RB (Right Shoulder): Tab
        if (pressed('rb')) {
            if (holdingModifier) {
                // Stub: Y + RB
                // Handled in main.js
            } else {
                this.typeCharacter('\t');
            }
        }

        // Case Switching (L3/R3)
        if (pressed('l3') || pressed('r3')) {
            this.state.caseMode = (this.state.caseMode + 1) % 3;
        }
    }

    /**
     * Get the currently pending character (for display in the staging area).
     * Returns the pending char with case applied, or empty string.
     */
    getFormattedSyllable() {
        const char = this.state.pendingChar;
        if (!char) return '';

        if (this.getCaseModeType() === 'upper' && (this.state.caseMode === 1 || this.state.caseMode === 2)) {
            return char.toUpperCase();
        }
        return char;
    }

    getCaseModeType() {
        return this.mappings?.CASE_MODE || 'upper';
    }

    getTextBeforeCursor() {
        const text = this.state.text || '';
        const cursor = (this.state.cursor !== null && this.state.cursor !== undefined)
            ? this.state.cursor
            : text.length;
        return text.slice(0, cursor);
    }

    resolveMappedText(rawChar, { bypassPrecedingCheck = false } = {}) {
        const mark = extractCombiningMarkPair(rawChar);
        if (mark && !bypassPrecedingCheck && hasPrecedingLetter(this.getTextBeforeCursor())) {
            return mark;
        }
        return rawChar;
    }

    typeCharacter(char) {
        this.state.text += char;
        console.log("Typed:", char);
        logger.log('TYPE', `Char: ${JSON.stringify(char)}`);
    }

    deleteCharacter() {
        if (this.state.text.length > 0) {
            const char = this.state.text.slice(-1);
            this.state.text = this.state.text.slice(0, -1);
            logger.log('DELETE', `Removed: ${JSON.stringify(char)}`);
        }
    }

    consumeShift() {
        if (this.state.caseMode === 1) { // Shift
            this.state.caseMode = 0; // Reset to lower
        }
    }

    getBufferText() {
        return this.state.text;
    }

    reset(text = '') {
        this.state.text = text;
        this.state.cursor = undefined;
        this.state.pendingChar = null;
        this.state.mode = 'BASE';
        this.state.caseMode = 0;
    }

    // Force sync input state (e.g. after mode switch) to prevent stale triggers
    resetInputState(gamepad) {
        const input = this.mapper.map(gamepad);
        if (input) {
            this.state.lastInput = input;
        }
    }
}
