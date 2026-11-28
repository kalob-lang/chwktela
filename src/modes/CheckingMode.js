import { TextEntryMode } from './TextEntryMode.js';

export class CheckingMode extends TextEntryMode {
    constructor(deps) {
        super(deps);
        this.bookManager = deps.bookManager;
        this.historyManager = deps.historyManager;
        this.focusManager = deps.focusManager;
        this.gridOverview = deps.gridOverview;
        this.overviewMode = deps.overviewMode;
        this.visualizer = deps.visualizer;
        this.gamepadManager = deps.gamepadManager;
        this.renderer = deps.renderer;
        this.spellChecker = deps.spellChecker;
        this.showNotification = deps.showNotification;
        this.onReturnToSpellMenu = deps.onReturnToSpellMenu;
        this.onIndicatorsUpdate = deps.onIndicatorsUpdate;

        this.scope = 'book'; // 'part' | 'book'
        this.errors = [];
        this.currentErrorIndex = 0;
        this.corrections = [];
        this.selectedCorrectionIndex = 0;

        this.lastButtons = {};
        this.lastDpad = { up: false, down: false, left: false, right: false };
    }

    _getGutterElement() {
        return typeof document !== 'undefined' ? document.getElementById('checking-gutter') : null;
    }

    _getDropdownElement() {
        return typeof document !== 'undefined' ? document.getElementById('checking-corrections-dropdown') : null;
    }

    enter(scope = 'book', initialInput = null) {
        this.scope = scope === 'part' ? 'part' : 'book';
        this.currentErrorIndex = 0;
        this.selectedCorrectionIndex = 0;
        this.lastButtons = { ...(initialInput?.buttons || {}) };
        this.lastDpad = { ...(initialInput?.buttons?.dpad || {}) };

        const gp = this.gamepadManager?.getActiveGamepad?.();
        if (gp) this.typingEngine?.resetInputState?.(gp);

        this.focusManager.setMode('CHECKING');
        this._refreshErrors();

        if (this.errors.length > 0) {
            this.currentErrorIndex = 0;
            this._navigateToCurrentError();
        } else {
            this.corrections = [];
            this._renderCurrentState();
            this.showNotification?.('No spelling errors found');
        }
    }

    setScope(newScope) {
        const normalized = newScope === 'part' ? 'part' : 'book';
        if (this.scope === normalized) return;
        this.scope = normalized;
        this.currentErrorIndex = 0;
        this.selectedCorrectionIndex = 0;
        this._refreshErrors();

        if (this.errors.length > 0) {
            this._navigateToCurrentError();
        } else {
            this.corrections = [];
            this._renderCurrentState();
        }
    }

    _refreshErrors() {
        if (!this.spellChecker || !this.bookManager) {
            this.errors = [];
            return;
        }

        if (this.scope === 'part') {
            const part = this.bookManager.getCurrentPart();
            const partKey = this.bookManager.currentPartKey;
            if (!part) {
                this.errors = [];
                return;
            }
            const errs = this.spellChecker.checkText(part.content || '');
            this.errors = errs.map((err) => ({
                ...err,
                partKey,
                x: part.x,
                y: part.y,
            }));
        } else {
            const { allErrors } = this.spellChecker.checkBook(this.bookManager);
            this.errors = allErrors;
        }
    }

    getCurrentError() {
        if (this.errors.length === 0) return null;
        if (this.currentErrorIndex < 0 || this.currentErrorIndex >= this.errors.length) {
            this.currentErrorIndex = 0;
        }
        return this.errors[this.currentErrorIndex] || null;
    }

    _navigateToCurrentError() {
        const err = this.getCurrentError();
        if (!err) {
            this.corrections = [];
            this._renderCurrentState();
            return;
        }

        if (this.bookManager.currentPartKey !== err.partKey && err.x !== undefined && err.y !== undefined) {
            this.bookManager.selectPart(err.x, err.y);
            if (this.overviewMode?.cursor) {
                this.overviewMode.cursor.x = err.x;
                this.overviewMode.cursor.y = err.y;
            }
            if (this.gridOverview?.setCursor) {
                this.gridOverview.setCursor(err.x, err.y);
            }
        }

        this.bookManager.setPartCursor(err.to);
        const part = this.bookManager.getCurrentPart();
        if (part) {
            part.cursor = err.to;
            this.typingEngine?.reset?.(part.content || '');
            if (this.typingEngine?.state) {
                this.typingEngine.state.cursor = err.to;
            }
        }

        this.corrections = this.spellChecker.getCorrections(err.segment);
        this.selectedCorrectionIndex = 0;

        this._renderCurrentState();
    }

    _renderCurrentState() {
        const part = this.bookManager?.getCurrentPart?.();
        const currentErr = this.getCurrentError();
        const partErrors = currentErr
            ? this.errors.filter((e) => e.partKey === this.bookManager.currentPartKey)
            : (part ? this.spellChecker.checkText(part.content || '') : []);

        if (part && this.renderer) {
            this.renderer.render(part, null, false, {
                forceSpellcheck: true,
                errors: partErrors,
                activeError: currentErr,
            });
        }

        this.renderGutter();
        this.renderDropdown();
        this.onIndicatorsUpdate?.();
    }

    renderGutter() {
        const gutterEl = this._getGutterElement();
        if (!gutterEl) return;

        if (this.focusManager?.mode !== 'CHECKING') {
            gutterEl.style.display = 'none';
            return;
        }

        gutterEl.style.display = 'flex';
        const total = this.errors.length;
        const current = total > 0 ? this.currentErrorIndex + 1 : 0;

        gutterEl.innerHTML = `
            <div class="checking-scope-toggle">
                <button type="button" id="checking-scope-part" class="checking-scope-btn ${this.scope === 'part' ? 'active' : ''}">Part</button>
                <button type="button" id="checking-scope-book" class="checking-scope-btn ${this.scope === 'book' ? 'active' : ''}">Book</button>
            </div>
            <span id="checking-error-counter" class="checking-error-counter">${current} / ${total}</span>
        `;

        const partBtn = gutterEl.querySelector('#checking-scope-part');
        const bookBtn = gutterEl.querySelector('#checking-scope-book');
        if (partBtn) partBtn.onclick = () => this.setScope('part');
        if (bookBtn) bookBtn.onclick = () => this.setScope('book');
    }

    renderDropdown() {
        const dropdownEl = this._getDropdownElement();
        if (!dropdownEl) return;

        const err = this.getCurrentError();
        if (this.focusManager?.mode !== 'CHECKING' || !err) {
            dropdownEl.style.display = 'none';
            dropdownEl.innerHTML = '';
            return;
        }

        dropdownEl.style.display = 'block';

        if (this.corrections.length === 0) {
            dropdownEl.innerHTML = `<div class="checking-dropdown-empty">No Corrections</div>`;
        } else {
            const escapeHtml = (str) => (str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            dropdownEl.innerHTML = this.corrections
                .map((c, idx) => `
                    <div class="checking-dropdown-item ${idx === this.selectedCorrectionIndex ? 'selected' : ''}" data-index="${idx}">
                        <span class="correction-word">${escapeHtml(c.word)}</span>
                        ${c.eng ? `<span class="correction-eng">${escapeHtml(c.eng)}</span>` : ''}
                    </div>
                `)
                .join('');

            dropdownEl.querySelectorAll('.checking-dropdown-item').forEach((itemEl) => {
                itemEl.onclick = () => {
                    this.selectedCorrectionIndex = parseInt(itemEl.dataset.index, 10);
                    this._applySelectedCorrection();
                };
            });
        }

        // Position below the active erroneous segment
        const editorContainer = dropdownEl.parentElement;
        const activeSpan = this.renderer?.container?.querySelector?.('.spell-error-active');
        if (activeSpan && editorContainer) {
            if (activeSpan.scrollIntoView) {
                activeSpan.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
            const spanRect = activeSpan.getBoundingClientRect();
            const containerRect = editorContainer.getBoundingClientRect();
            const left = Math.max(8, spanRect.left - containerRect.left);
            const top = Math.max(54, spanRect.bottom - containerRect.top + 6);
            dropdownEl.style.left = `${left}px`;
            dropdownEl.style.top = `${top}px`;
        }
    }

    hideUI() {
        const gutterEl = this._getGutterElement();
        if (gutterEl) gutterEl.style.display = 'none';
        const dropdownEl = this._getDropdownElement();
        if (dropdownEl) {
            dropdownEl.style.display = 'none';
            dropdownEl.innerHTML = '';
        }
    }

    _findNextErrorIndexAfterEdit(prevPartKey, minOffsetInSamePart) {
        if (this.errors.length === 0) return 0;

        const orderedKeys = this.spellChecker.getOrderedPartEntries(this.bookManager).map((e) => e.key);
        const prevPartRank = orderedKeys.indexOf(prevPartKey);

        const idx = this.errors.findIndex((err) => {
            if (err.partKey === prevPartKey) {
                return err.from >= minOffsetInSamePart;
            }
            if (this.scope === 'book') {
                const rank = orderedKeys.indexOf(err.partKey);
                return rank > prevPartRank;
            }
            return false;
        });

        return idx !== -1 ? idx : 0;
    }

    _replaceSegmentAndExit(replacement, newCursorOffset) {
        const err = this.getCurrentError();
        if (!err) {
            this._exitToEditor();
            return;
        }

        const part = this.bookManager.getCurrentPart();
        if (!part) {
            this._exitToEditor();
            return;
        }

        const content = part.content || '';
        const newContent = content.slice(0, err.from) + replacement + content.slice(err.to);

        if (this.historyManager) {
            this.historyManager.push({
                type: 'REMOVE_TEXT',
                partKey: err.partKey,
                data: { text: err.segment, index: err.from },
            });
            if (replacement.length > 0) {
                this.historyManager.push({
                    type: 'ADD_TEXT',
                    partKey: err.partKey,
                    data: { text: replacement, index: err.from },
                });
            }
        }

        this.bookManager.setCurrentPartContent(newContent);
        this.bookManager.setPartCursor(newCursorOffset);
        part.content = newContent;
        part.cursor = newCursorOffset;

        this._exitToEditor();
    }

    _deleteLastCharOfWordAndExit() {
        const err = this.getCurrentError();
        if (!err) {
            this._exitToEditor();
            return;
        }

        const part = this.bookManager.getCurrentPart();
        if (!part) {
            this._exitToEditor();
            return;
        }

        const content = part.content || '';
        const deleteIdx = Math.max(0, err.to - 1);
        const removedChar = content.slice(deleteIdx, err.to);
        const newContent = content.slice(0, deleteIdx) + content.slice(err.to);
        const newCursor = deleteIdx;

        if (removedChar.length > 0 && this.historyManager) {
            this.historyManager.push({
                type: 'REMOVE_TEXT',
                partKey: err.partKey,
                data: { text: removedChar, index: deleteIdx },
            });
        }

        this.bookManager.setCurrentPartContent(newContent);
        this.bookManager.setPartCursor(newCursor);
        part.content = newContent;
        part.cursor = newCursor;

        this._exitToEditor();
    }

    _applySelectedCorrection() {
        const err = this.getCurrentError();
        if (!err) return;

        if (this.corrections.length === 0) {
            this.showNotification?.('No Corrections');
            return;
        }

        const selected = this.corrections[this.selectedCorrectionIndex];
        if (!selected) return;

        const part = this.bookManager.getCurrentPart();
        if (!part) return;

        const content = part.content || '';
        const replacement = selected.word;
        const newContent = content.slice(0, err.from) + replacement + content.slice(err.to);

        if (this.historyManager) {
            this.historyManager.push({
                type: 'REMOVE_TEXT',
                partKey: err.partKey,
                data: { text: err.segment, index: err.from },
            });
            this.historyManager.push({
                type: 'ADD_TEXT',
                partKey: err.partKey,
                data: { text: replacement, index: err.from },
            });
        }

        this.bookManager.setCurrentPartContent(newContent);
        const nextCursor = err.from + replacement.length;
        this.bookManager.setPartCursor(nextCursor);
        part.content = newContent;
        part.cursor = nextCursor;

        const prevPartKey = err.partKey;
        const minOffset = err.from + replacement.length;
        this._refreshErrors();

        if (this.errors.length > 0) {
            this.currentErrorIndex = this._findNextErrorIndexAfterEdit(prevPartKey, minOffset);
            this._navigateToCurrentError();
        } else {
            this.currentErrorIndex = 0;
            this.corrections = [];
            this._renderCurrentState();
            this.showNotification?.('No more spelling errors');
        }
    }

    _ignoreCurrentWord() {
        const err = this.getCurrentError();
        if (!err) return;

        const prevPartKey = err.partKey;
        const prevFrom = err.from;

        this.spellChecker.addIgnoreWord(err.word);
        this.showNotification?.(`Ignored "${err.word}"`);

        this._refreshErrors();
        if (this.errors.length > 0) {
            this.currentErrorIndex = this._findNextErrorIndexAfterEdit(prevPartKey, prevFrom + 1);
            this._navigateToCurrentError();
        } else {
            this.currentErrorIndex = 0;
            this.corrections = [];
            this._renderCurrentState();
            this.showNotification?.('No more spelling errors');
        }
    }

    _exitToEditor() {
        this.hideUI();
        const gp = this.gamepadManager?.getActiveGamepad?.();
        if (gp) this.typingEngine?.resetInputState?.(gp);

        this.focusManager.setMode('EDITOR');
        const part = this.bookManager?.getCurrentPart?.();
        if (part && this.renderer) {
            this.renderer.render(part);
        }
        this.onIndicatorsUpdate?.();
    }

    exitToOverview(frameInput = null) {
        this.hideUI();
        const gp = this.gamepadManager?.getActiveGamepad?.();
        if (gp) this.typingEngine?.resetInputState?.(gp);

        const part = this.bookManager?.getCurrentPart?.();
        if (part && this.overviewMode) {
            this.overviewMode.cursor.x = part.x;
            this.overviewMode.cursor.y = part.y;
            if (frameInput) this.overviewMode.syncInputState?.(frameInput);
        }

        this.focusManager.setMode('OVERVIEW');
        this.onIndicatorsUpdate?.();
    }

    returnToMenu(frameInput = null) {
        this.hideUI();
        const gp = this.gamepadManager?.getActiveGamepad?.();
        if (gp) this.typingEngine?.resetInputState?.(gp);

        if (this.onReturnToSpellMenu) {
            this.onReturnToSpellMenu(frameInput);
        } else {
            this.focusManager.setMode('SPELLCHECK_MENU');
        }
    }

    handleInput(frameInput) {
        if (!frameInput) return;

        const buttons = frameInput.buttons || {};
        const dpad = buttons.dpad || {};
        const pressed = (btn) => Boolean(buttons[btn] && !this.lastButtons[btn]);
        const dpadPressed = (dir) => Boolean(dpad[dir] && !this.lastDpad[dir]);

        // Select -> Return to OVERVIEW mode and exit CHECKING mode
        if (pressed('select')) {
            this.exitToOverview(frameInput);
            this.lastButtons = { ...buttons };
            this.lastDpad = { ...dpad };
            return;
        }

        // Start -> Return to SPELLCHECK_MENU
        if (pressed('start')) {
            this.returnToMenu(frameInput);
            this.lastButtons = { ...buttons };
            this.lastDpad = { ...dpad };
            return;
        }

        // Left / Right D-Pad -> Navigate errors in part or book
        if (dpadPressed('right') && this.errors.length > 0) {
            this.currentErrorIndex = (this.currentErrorIndex + 1) % this.errors.length;
            this._navigateToCurrentError();
        } else if (dpadPressed('left') && this.errors.length > 0) {
            this.currentErrorIndex = (this.currentErrorIndex - 1 + this.errors.length) % this.errors.length;
            this._navigateToCurrentError();
        }

        // Up / Down D-Pad -> Navigate list of corrections
        if (dpadPressed('down') && this.corrections.length > 0) {
            this.selectedCorrectionIndex = (this.selectedCorrectionIndex + 1) % this.corrections.length;
            this.renderDropdown();
        } else if (dpadPressed('up') && this.corrections.length > 0) {
            this.selectedCorrectionIndex =
                (this.selectedCorrectionIndex - 1 + this.corrections.length) % this.corrections.length;
            this.renderDropdown();
        }

        // X (West) -> Delete erroneous segment and exit CHECKING mode at that location
        if (pressed('west')) {
            const err = this.getCurrentError();
            if (err) {
                this._replaceSegmentAndExit('', err.from);
            } else {
                this._exitToEditor();
            }
            this.lastButtons = { ...buttons };
            this.lastDpad = { ...dpad };
            return;
        }

        // A (South) -> Replace erroneous segment with space, move cursor right, exit CHECKING mode
        if (pressed('south')) {
            const err = this.getCurrentError();
            if (err) {
                this._replaceSegmentAndExit(' ', err.from + 1);
            } else {
                this._exitToEditor();
            }
            this.lastButtons = { ...buttons };
            this.lastDpad = { ...dpad };
            return;
        }

        // B (East) -> Replace erroneous segment with newline, move cursor to newline, exit CHECKING mode
        if (pressed('east')) {
            const err = this.getCurrentError();
            if (err) {
                this._replaceSegmentAndExit('\n', err.from + 1);
            } else {
                this._exitToEditor();
            }
            this.lastButtons = { ...buttons };
            this.lastDpad = { ...dpad };
            return;
        }

        // Y (North) -> Add erroneous word to ignored words and move to next error
        if (pressed('north')) {
            this._ignoreCurrentWord();
            this.lastButtons = { ...buttons };
            this.lastDpad = { ...dpad };
            return;
        }

        // LB -> Backspace last character of erroneous word, move cursor left, exit CHECKING mode
        if (pressed('lb')) {
            this._deleteLastCharOfWordAndExit();
            this.lastButtons = { ...buttons };
            this.lastDpad = { ...dpad };
            return;
        }

        // RB -> Replace erroneous segment with selected correction and move to next error
        if (pressed('rb')) {
            this._applySelectedCorrection();
            this.lastButtons = { ...buttons };
            this.lastDpad = { ...dpad };
            return;
        }

        this.lastButtons = { ...buttons };
        this.lastDpad = { ...dpad };
    }
}
