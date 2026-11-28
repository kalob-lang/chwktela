export class EditorRenderer {
    constructor(elementId, typingEngine, settingsManager, spellChecker = null) {
        this.container = document.getElementById(elementId);
        this.typingEngine = typingEngine;
        this.settingsManager = settingsManager;
        this.spellChecker = spellChecker;
    }

    setSpellChecker(spellChecker) {
        this.spellChecker = spellChecker;
    }

    _escapePlain(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/ /g, '&nbsp;');
    }

    _renderTextWithCitations(str) {
        return this._escapePlain(str).replace(
            /\{\{cite:(-?\d+),(-?\d+)\}\}/g,
            '<span class="citation-pill">$1 . $2</span>'
        );
    }

    _renderSliceWithCursor(content, start, end, cursor, pendingHtml, cursorType, cursorSubClass) {
        if (cursor === null || cursor < start || cursor >= end) {
            return this._renderTextWithCitations(content.slice(start, end));
        }

        const before = content.slice(start, cursor);
        const after = content.slice(cursor, end);

        let html = this._renderTextWithCitations(before);
        html += pendingHtml;

        if (cursorType === 'BAR') {
            html += `<span class="cursor ${cursorSubClass}"></span>`;
            html += this._renderTextWithCitations(after);
        } else {
            const match = /^\{\{cite:(-?\d+),(-?\d+)\}\}/.exec(after);
            if (match) {
                const x = match[1];
                const y = match[2];
                const rest = after.slice(match[0].length);
                html += `<span class="citation-pill cursor ${cursorSubClass} cursor-atomic">${x} . ${y}</span>`;
                html += this._renderTextWithCitations(rest);
            } else if (after.length > 0) {
                const targetChar = after[0];
                const rest = after.slice(1);
                html += `<span class="cursor ${cursorSubClass}">${this._escapePlain(targetChar)}</span>`;
                html += this._renderTextWithCitations(rest);
            }
        }

        return html;
    }

    render(part, selectionAnchor = null, isModifierHeld = false, renderOptions = {}) {
        if (!this.container || !part) return;

        const content = part.content || "";
        const cursor = part.cursor || 0;

        const safeEscape = (str) => this._renderTextWithCitations(str);
        const processText = safeEscape;
        const esc = safeEscape;

        // Pending Syllable Logic
        const pending = this.typingEngine.getFormattedSyllable();
        let pendingHtml = '';

        if (pending) {
            const mapping = this.typingEngine.mappings;
            const brackets = mapping?.STAGING_BRACKETS || "";
            const open = brackets.length >= 1 ? brackets[0] : "";
            const close = brackets.length >= 2 ? brackets[1] : "";
            pendingHtml = `<span class="pending-text">${open}${esc(pending)}${close}</span>`;
        }

        // Selection Logic
        const anchor = selectionAnchor;
        const isSelectionActive = (anchor !== undefined && anchor !== null && anchor !== cursor);

        const spellcheckEnabled =
            !renderOptions.disableSpellcheck &&
            (renderOptions.forceSpellcheck || Boolean(this.settingsManager?.config?.spellcheck));

        const errors = spellcheckEnabled
            ? (renderOptions.errors ?? (this.spellChecker ? this.spellChecker.checkText(content) : []))
            : [];

        const activeError = renderOptions.activeError || null;

        let html = "";

        if (isSelectionActive) {
            const start = Math.min(anchor, cursor);
            const end = Math.max(anchor, cursor);

            const preSelect = content.slice(0, start);
            const range = content.slice(start, end);
            const postSelect = content.slice(end);

            html = processText(preSelect);
            html += `<span class="selection-highlight">${esc(range)}</span>`;
            html += processText(postSelect);
        } else if (errors.length === 0) {
            const before = content.slice(0, cursor);
            const after = content.slice(cursor);

            const cursorType = this.settingsManager?.config?.cursorType || 'BAR';
            let cursorSubClass = 'cursor-bar';
            if (cursorType === 'BLOCK') cursorSubClass = 'cursor-block';
            if (cursorType === 'UNDERLINE') cursorSubClass = 'cursor-underline';

            html += processText(before);
            html += pendingHtml;

            if (cursorType === 'BAR') {
                html += `<span class="cursor ${cursorSubClass}"></span>`;
                html += processText(after);
            } else {
                if (after.length > 0) {
                    const match = /^\{\{cite:(-?\d+),(-?\d+)\}\}/.exec(after);

                    if (match) {
                        const x = match[1];
                        const y = match[2];
                        const rest = after.slice(match[0].length);
                        html += `<span class="citation-pill cursor ${cursorSubClass} cursor-atomic">${x} . ${y}</span>`;
                        html += processText(rest);
                    } else {
                        const targetChar = after[0];
                        const rest = after.slice(1);
                        html += `<span class="cursor ${cursorSubClass}">${processText(targetChar)}</span>`;
                        html += processText(rest);
                    }
                } else {
                    html += `<span class="cursor ${cursorSubClass}">&nbsp;</span>`;
                }
            }
        } else {
            const cursorType = this.settingsManager?.config?.cursorType || 'BAR';
            let cursorSubClass = 'cursor-bar';
            if (cursorType === 'BLOCK') cursorSubClass = 'cursor-block';
            if (cursorType === 'UNDERLINE') cursorSubClass = 'cursor-underline';

            const sortedErrors = [...errors].sort((a, b) => a.from - b.from);
            let pos = 0;

            for (const err of sortedErrors) {
                if (err.from < pos) continue;

                if (pos < err.from) {
                    html += this._renderSliceWithCursor(
                        content,
                        pos,
                        err.from,
                        cursor,
                        pendingHtml,
                        cursorType,
                        cursorSubClass
                    );
                }

                const isActive =
                    activeError &&
                    activeError.from === err.from &&
                    activeError.to === err.to;
                const cls = isActive ? 'spell-error spell-error-active' : 'spell-error';
                const errInner = this._renderSliceWithCursor(
                    content,
                    err.from,
                    err.to,
                    cursor,
                    pendingHtml,
                    cursorType,
                    cursorSubClass
                );
                html += `<span class="${cls}">${errInner}</span>`;
                pos = err.to;
            }

            if (pos < content.length) {
                html += this._renderSliceWithCursor(
                    content,
                    pos,
                    content.length,
                    cursor,
                    pendingHtml,
                    cursorType,
                    cursorSubClass
                );
            }

            if (cursor >= content.length) {
                html += pendingHtml;
                if (cursorType === 'BAR') {
                    html += `<span class="cursor ${cursorSubClass}"></span>`;
                } else {
                    html += `<span class="cursor ${cursorSubClass}">&nbsp;</span>`;
                }
            }
        }

        this.container.innerHTML = html;

        // Auto Scroll
        const cursorEl = this.container.querySelector('.cursor');
        if (cursorEl) {
            cursorEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }
}
