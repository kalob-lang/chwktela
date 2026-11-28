export class Gutter {
    constructor(elementId, config) {
        this.container = document.getElementById(elementId);
        this.config = config || {};

        // Define items (order matches UI)
        // Check Mode (when enabled) | Export | Gamepad | Settings | Help | Book Menu
        this.items = [
            'check-mode-btn',
            'export-logs-btn',
            'gamepad-btn',
            'settings-btn',
            'help-btn',
            'book-menu-btn'
        ];

        const visible = this.getVisibleItems();
        this.selectedIndex = Math.max(0, visible.length - 1);
        this.isActive = false;
    }

    getVisibleItems() {
        return this.items.filter((id) => {
            if (typeof document === 'undefined') return id !== 'check-mode-btn';
            const el = document.getElementById(id);
            if (!el) return id !== 'check-mode-btn';
            if (el.style.display === 'none') return false;
            if (typeof window !== 'undefined' && window.getComputedStyle) {
                return window.getComputedStyle(el).display !== 'none';
            }
            return true;
        });
    }

    activate() {
        this.isActive = true;
        this.render();
    }

    deactivate() {
        this.isActive = false;
        this.render();
    }

    getItemCount() {
        return this.getVisibleItems().length;
    }

    setSelectedIndex(index) {
        this.selectedIndex = index;
        this.render();
    }

    triggerAction(index, input) {
        const visible = this.getVisibleItems();
        if (index < 0 || index >= visible.length) return;
        const id = visible[index];
        const el = document.getElementById(id);

        if (el) {
            if (id === 'help-btn') {
                window.dispatchEvent(new CustomEvent('request-help-toggle', { detail: { input } }));
                el.click();
            } else if (id === 'export-logs-btn') {
                window.dispatchEvent(new CustomEvent('request-export-logs'));
                el.click();
            } else {
                el.click();
            }
        }
    }

    render() {
        if (!this.container) return;

        if (this.isActive) {
            this.container.classList.add('nav-active');
        } else {
            this.container.classList.remove('nav-active');
        }

        const visible = this.getVisibleItems();
        const selectedId = this.isActive ? visible[this.selectedIndex] : null;

        this.items.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;

            if (this.isActive && id === selectedId) {
                el.classList.add('nav-selected');
            } else {
                el.classList.remove('nav-selected');
            }
        });
    }
}
