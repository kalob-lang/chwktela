import { SubMenu } from './SubMenu.js';

export class SpellcheckMenu extends SubMenu {
    constructor() {
        super('spellcheck-menu-modal', 'Spellcheck');
        this.onActionCallback = null;

        this.options = [
            { key: 'ignore_words', label: 'Ignore Words', icon: '<i class="fa-solid fa-eye-slash"></i>' },
            { key: 'add_words', label: 'Add Words', icon: '<i class="fa-solid fa-plus"></i>' },
            { key: 'check_book', label: 'Check Book Spelling', icon: '<i class="fa-solid fa-book"></i>' },
            { key: 'check_part', label: 'Check Part Spelling', icon: '<i class="fa-solid fa-file-lines"></i>' },
            { key: 'done', label: 'Done', className: 'done-btn', icon: '<i class="fa-solid fa-check"></i>' }
        ];
    }

    set onAction(cb) {
        this.onActionCallback = cb;
    }

    get onAction() {
        return this.onActionCallback;
    }

    open(initialInput) {
        if (!this.isOpen) {
            this.toggle(initialInput);
        } else if (initialInput && initialInput.buttons) {
            this.debounceCounter = 15;
            this.lastButtons = { ...initialInput.buttons };
            this.lastDpad = { ...(initialInput.buttons.dpad || {}) };
        }
    }

    onOpen() {
        this.selectedIndex = 0;
    }

    onConfirm(item) {
        if (!item) return;
        if (item.key === 'done') {
            this.close();
            return;
        }
        this.close(false);
        if (this.onActionCallback) {
            this.onActionCallback(item.key);
        }
    }

    close(triggerOnClose = true) {
        if (!this.isOpen) return;
        this.isOpen = false;
        if (triggerOnClose) {
            this.onClose();
        }
        this.render();
    }
}
