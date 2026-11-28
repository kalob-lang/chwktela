export class InputRouter {
    constructor(deps) {
        this.deps = deps;
        this.confirmCallback = null;
        this.lastRenamingState = null;
        this.selectActive = false;
        this.selectUsedForNav = false;
        this.lastSelectDpad = { up: false, down: false, left: false, right: false };
    }

    route(frameInput, gamepad) {
        const {
            focusManager,
            gutterMode,
            overviewMode,
            editorMode,
            visualSelectMode,
            checkingMode,
            wordListEditMode,
            settingsManager,
            gamepadMenu,
            bookMenu,
            spellcheckMenu,
            helpManager,
            gridOverview,
            gamepadManager,
        } = this.deps;

        const startPressed = frameInput.buttons.start;
        const selectPressed = frameInput.buttons.select;

        // Help Menu
        if (helpManager.isOpen) {
            helpManager.handleInput(frameInput);
            return;
        }

        // --- Global Start Toggle ---
        if (startPressed && !gamepadManager.lastStart) {
            if (focusManager.mode === 'GUTTER') {
                focusManager.toggleBottomBar();
            } else if (focusManager.mode === 'CHECKING') {
                checkingMode?.returnToMenu?.(frameInput);
                gamepadManager.lastStart = startPressed;
                gamepadManager.lastSelect = selectPressed;
                return;
            } else if (focusManager.mode === 'WORD_LIST_EDIT') {
                wordListEditMode?.cancel?.(frameInput);
                gamepadManager.lastStart = startPressed;
                gamepadManager.lastSelect = selectPressed;
                return;
            } else if (['EDITOR', 'OVERVIEW', 'VISUAL_SELECT', 'RENAMING'].includes(focusManager.mode)) {
                focusManager.setMode('GUTTER');
            } else {
                if (focusManager.mode === 'BOOK_MENU') bookMenu.toggle();
                else if (focusManager.mode === 'SETTINGS_MENU') settingsManager.toggle();
                else if (focusManager.mode === 'GAMEPAD_MENU') gamepadMenu.close();
                else if (focusManager.mode === 'SPELLCHECK_MENU') spellcheckMenu?.toggle?.();
                else if (focusManager.mode === 'DIALOG_CONFIRM') this.closeConfirmModal();

                if (focusManager.mode === 'GUTTER') {
                    focusManager.toggleBottomBar();
                }
            }
        }

        // --- Global Select Handler ---
        const dpad = frameInput.buttons?.dpad || {};

        if (
            focusManager.mode === 'DIALOG_CONFIRM' ||
            focusManager.mode === 'RENAMING' ||
            focusManager.mode === 'CHECKING' ||
            focusManager.mode === 'WORD_LIST_EDIT'
        ) {
            this.selectActive = false;
            this.selectUsedForNav = false;
        } else {
            if (selectPressed && !gamepadManager.lastSelect) {
                this.selectActive = true;
                this.selectUsedForNav = false;
            }

            if (this.selectActive && selectPressed) {
                if (focusManager.mode === 'EDITOR') {
                    focusManager.updateModeIcon?.('BASE', false, false, true);

                    const justPressed = (dir) => Boolean(dpad[dir] && !this.lastSelectDpad[dir]);
                    let dx = 0;
                    let dy = 0;
                    if (justPressed('left')) dx = -1;
                    else if (justPressed('right')) dx = 1;
                    else if (justPressed('up')) dy = 1;
                    else if (justPressed('down')) dy = -1;

                    if (dx !== 0 || dy !== 0) {
                        this.selectUsedForNav = true;
                        editorMode?.switchAdjacentPart?.(dx, dy);
                    }

                    if (editorMode) {
                        editorMode.lastDpad = { ...dpad };
                    }
                }
            } else if (this.selectActive && !selectPressed && gamepadManager.lastSelect) {
                if (!this.selectUsedForNav) {
                    if (focusManager.mode === 'OVERVIEW') {
                        focusManager.citationUpdateTarget = null;
                        gridOverview?.setLinkTarget?.(null);
                    }
                    focusManager.toggleOverview();
                }

                if (focusManager.mode === 'OVERVIEW') {
                    focusManager.updateModeIcon?.();
                } else if (focusManager.mode === 'EDITOR') {
                    focusManager.updateModeIcon?.(
                        this.deps.typingEngine?.state?.mode || 'BASE',
                        Boolean(frameInput.buttons?.north),
                        false,
                        false
                    );
                }

                this.selectActive = false;
                this.selectUsedForNav = false;
            }
        }

        this.lastSelectDpad = { ...dpad };

        // --- Mode Routing ---
        switch (focusManager.mode) {
            case 'GUTTER':
                gutterMode.handleInput(frameInput);
                break;

            case 'SETTINGS_MENU':
                settingsManager.handleInput(frameInput);
                break;

            case 'GAMEPAD_MENU':
                gamepadMenu.handleInput(frameInput);
                break;

            case 'BOOK_MENU':
                bookMenu.handleInput(frameInput);
                break;

            case 'SPELLCHECK_MENU':
                spellcheckMenu?.handleInput(frameInput);
                break;

            case 'OVERVIEW':
                overviewMode.handleInput(frameInput);
                break;

            case 'EDITOR':
                if (!(this.selectActive && selectPressed)) {
                    editorMode.handleInput(frameInput, gamepad);
                }
                break;

            case 'CHECKING':
                checkingMode?.handleInput(frameInput, gamepad);
                break;

            case 'WORD_LIST_EDIT':
                wordListEditMode?.handleInput(frameInput, gamepad);
                break;

            case 'VISUAL_SELECT':
                visualSelectMode.handleInput(frameInput);
                break;

            case 'DIALOG_CONFIRM':
                if (frameInput.buttons.east) {
                    if (this.confirmCallback) this.confirmCallback();
                    this.closeConfirmModal();
                }
                break;

            case 'RENAMING':
                this.handleRenaming(frameInput, gamepad);
                break;
        }

        gamepadManager.lastStart = startPressed;
        gamepadManager.lastSelect = selectPressed;
    }

    handleRenaming(frameInput, gamepad) {
        if (this.deps.renamingMode) {
            this.deps.renamingMode.handleInput(frameInput, gamepad);
        } else {
            console.error("RenamingMode dependency missing in InputRouter");
        }
    }

    requestConfirm(message, callback) {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        if (modal && msgEl) {
            msgEl.textContent = message;
            modal.style.display = 'flex';
            this.confirmCallback = callback;
            this.deps.focusManager.setMode('DIALOG_CONFIRM');
        }
    }

    closeConfirmModal() {
        const modal = document.getElementById('confirm-modal');
        if (modal) modal.style.display = 'none';
        this.confirmCallback = null;

        const target = this.deps.focusManager.previousMode || 'EDITOR';
        this.deps.focusManager.setMode(target);
    }
}
