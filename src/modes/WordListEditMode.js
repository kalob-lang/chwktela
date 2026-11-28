import { TextEntryMode } from './TextEntryMode.js';

export class WordListEditMode extends TextEntryMode {
    constructor(deps) {
        super(deps);
        this.focusManager = deps.focusManager;
        this.bookManager = deps.bookManager;
        this.editorRenderer = deps.editorRenderer;
        this.visualizer = deps.visualizer;
        this.gamepadManager = deps.gamepadManager;
        this.spellChecker = deps.spellChecker;
        this.showNotification = deps.showNotification;
        this.onExitToMenu = deps.onExitToMenu;

        this.targetType = null; // 'ignore_words' | 'add_words'
        this.content = '';
        this.cursor = 0;
        this.lastEngineTextLength = 0;
        this.lastButtons = {};
        this.wasActive = false;
        this.desiredColumn = null;
        this.lastPending = '';
    }

    start(targetType, initialInput = null) {
        this.targetType = targetType;
        const initialText =
            targetType === 'add_words'
                ? this.spellChecker.getAddWordsText()
                : this.spellChecker.getIgnoreWordsText();

        this.content = initialText;
        this.cursor = initialText.length;
        this.desiredColumn = null;

        this.typingEngine.reset(initialText);
        this.typingEngine.state.cursor = this.cursor;
        this.lastEngineTextLength = initialText.length;
        this.wasActive = true;
        this.lastDpad = { ...(initialInput?.buttons?.dpad || {}) };
        this.lastButtons = { ...(initialInput?.buttons || {}) };

        const gp = this.gamepadManager?.getActiveGamepad?.();
        if (gp) this.typingEngine.resetInputState(gp);

        this.focusManager.setMode('WORD_LIST_EDIT');
        this.render();
    }

    render() {
        if (!this.editorRenderer) return;
        this.editorRenderer.render(
            { content: this.content, cursor: this.cursor },
            null,
            false,
            { disableSpellcheck: true }
        );
    }

    _getLineInfo(content, cursor) {
        const lastNewline = content.lastIndexOf('\n', cursor - 1);
        const start = lastNewline === -1 ? 0 : lastNewline + 1;
        const nextNewline = content.indexOf('\n', cursor);
        const end = nextNewline === -1 ? content.length : nextNewline;
        return { start, end, col: cursor - start };
    }

    _updateDesiredColumn() {
        this.desiredColumn = this._getLineInfo(this.content, this.cursor).col;
    }

    _navigateVertical(dpad) {
        if (this.desiredColumn === null || this.desiredColumn === undefined) {
            this._updateDesiredColumn();
        }
        const info = this._getLineInfo(this.content, this.cursor);
        let targetStart = -1;
        let targetEnd = -1;

        if (dpad.up && !this.lastDpad.up) {
            if (info.start === 0) return this.cursor;
            const prevNewline = this.content.lastIndexOf('\n', info.start - 2);
            targetStart = prevNewline === -1 ? 0 : prevNewline + 1;
            targetEnd = info.start - 1;
        } else if (dpad.down && !this.lastDpad.down) {
            if (info.end === this.content.length) return this.cursor;
            targetStart = info.end + 1;
            const nextNewline = this.content.indexOf('\n', targetStart);
            targetEnd = nextNewline === -1 ? this.content.length : nextNewline;
        } else {
            return this.cursor;
        }

        const lineLen = targetEnd - targetStart;
        return targetStart + Math.min(this.desiredColumn, lineLen);
    }

    handleInput(frameInput, gamepad) {
        if (!frameInput) return;

        const buttons = frameInput.buttons || {};
        const dpad = buttons.dpad || {};
        const pressed = (btn) => Boolean(buttons[btn] && !this.lastButtons[btn]);

        // Select -> Cancel without saving
        if (pressed('select')) {
            this.cancel(frameInput);
            this.lastButtons = { ...buttons };
            return;
        }

        // A (South) -> Save list instead of adding space
        if (pressed('south')) {
            this.save(frameInput);
            this.lastButtons = { ...buttons };
            return;
        }

        // X (West) -> Delete forward character
        if (pressed('west')) {
            if (this.cursor < this.content.length) {
                this.content =
                    this.content.slice(0, this.cursor) + this.content.slice(this.cursor + 1);
                this._updateDesiredColumn();
                this.typingEngine.reset(this.content);
                this.typingEngine.state.cursor = this.cursor;
                this.lastEngineTextLength = this.content.length;
                const gp = this.gamepadManager?.getActiveGamepad?.();
                if (gp) this.typingEngine.resetInputState(gp);
                this.render();
            }
            this.lastButtons = { ...buttons };
            this.lastDpad = { ...dpad };
            return;
        }

        // LB + North -> Delete word backwards
        if (buttons.lb && buttons.north && !this.lastButtons.lb) {
            let target = this.cursor - 1;
            while (target > 0 && /\s/.test(this.content[target - 1])) target--;
            while (target > 0 && !/\s/.test(this.content[target - 1])) target--;
            this.content = this.content.slice(0, target) + this.content.slice(this.cursor);
            this.cursor = target;
            this._updateDesiredColumn();
            this.typingEngine.reset(this.content);
            this.typingEngine.state.cursor = this.cursor;
            this.lastEngineTextLength = this.content.length;
            const gp = this.gamepadManager?.getActiveGamepad?.();
            if (gp) this.typingEngine.resetInputState(gp);
            this.render();
            this.lastButtons = { ...buttons };
            this.lastDpad = { ...dpad };
            return;
        }

        // D-Pad navigation
        let newCursor = this.cursor;
        if ((dpad.up && !this.lastDpad.up) || (dpad.down && !this.lastDpad.down)) {
            if (buttons.north) {
                const info = this._getLineInfo(this.content, this.cursor);
                if (dpad.up) {
                    newCursor = this.cursor === info.start ? 0 : info.start;
                } else {
                    newCursor = this.cursor === info.end ? this.content.length : info.end;
                }
                this._updateDesiredColumn();
            } else {
                newCursor = this._navigateVertical(dpad);
            }
        } else if (buttons.north) {
            if (dpad.left && !this.lastDpad.left) {
                newCursor = this.navigateWordLeft(this.cursor, this.content);
                this._updateDesiredColumn();
            } else if (dpad.right && !this.lastDpad.right) {
                newCursor = this.navigateWordRight(this.cursor, this.content);
                this._updateDesiredColumn();
            }
        } else {
            const horizontalDpad = { ...dpad, up: false, down: false };
            newCursor = this.navigate(horizontalDpad, this.cursor, this.content, false);
            if (newCursor !== this.cursor) {
                this._updateDesiredColumn();
            }
        }

        if (newCursor !== this.cursor) {
            this.cursor = newCursor;
            this.typingEngine.state.cursor = this.cursor;
            this.render();
        }
        this.lastDpad = { ...dpad };

        // Modifier guard
        if (buttons.north) {
            if (frameInput.mode?.bothTriggers && this.visualizer) {
                this.visualizer.update(
                    frameInput,
                    'PUNCTUATION',
                    this.typingEngine.mappings,
                    this.typingEngine.state.punctuationLayer
                );
            }
            this.lastButtons = { ...buttons };
            return;
        }

        // Process character entry & B=newline & LB=backspace
        this.typingEngine.state.cursor = this.cursor;
        const state = this.typingEngine.processFrame(gamepad);
        if (state) {
            const result = this.processTextChange(
                this.content,
                this.cursor,
                state.text,
                this.lastEngineTextLength,
                null
            );

            if (result.diff !== 0 && result.newContent !== this.content) {
                this.content = result.newContent;
                this.cursor = result.newCursor;
                this._updateDesiredColumn();
                this.typingEngine.reset(this.content);
                this.typingEngine.state.cursor = this.cursor;
                this.lastEngineTextLength = this.content.length;
                this.render();
            } else {
                this.lastEngineTextLength = result.newLength;
                const pending = this.typingEngine.getFormattedSyllable();
                if (pending !== this.lastPending) {
                    this.lastPending = pending;
                    this.render();
                }
            }

            if (this.visualizer) {
                this.visualizer.update(
                    frameInput,
                    state.mode,
                    this.typingEngine.mappings,
                    this.typingEngine.state.punctuationLayer
                );
            }
            const isJoystickActive = frameInput.sticks?.left?.active || false;
            this.focusManager.updateModeIcon(state.mode, false, isJoystickActive);
        }

        this.lastButtons = { ...buttons };
    }

    save(frameInput) {
        if (this.targetType === 'add_words') {
            this.spellChecker.saveAddWordsText(this.content);
            this.showNotification?.('Saved Add Words');
        } else {
            this.spellChecker.saveIgnoreWordsText(this.content);
            this.showNotification?.('Saved Ignore Words');
        }
        this._exit(frameInput);
    }

    cancel(frameInput) {
        this.showNotification?.('Cancelled');
        this._exit(frameInput);
    }

    _exit(frameInput) {
        this.wasActive = false;
        this.targetType = null;

        const part = this.bookManager?.getCurrentPart?.();
        if (part) {
            this.typingEngine.reset(part.content);
            this.typingEngine.state.cursor = part.cursor ?? part.content.length;
            const gp = this.gamepadManager?.getActiveGamepad?.();
            if (gp) this.typingEngine.resetInputState(gp);
            this.editorRenderer?.render(part);
        }

        if (this.onExitToMenu) {
            this.onExitToMenu(frameInput);
        } else {
            this.focusManager.setMode('SPELLCHECK_MENU');
        }
    }
}
