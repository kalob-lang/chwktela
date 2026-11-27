export class HelpManager {
    constructor(focusManager) {
        this.focusManager = focusManager;
        this.isOpen = false;
        this.currentSlideIndex = 0;

        // Define Slides
        this.slides = [
            {
                title: "Welcome to uywng Cwktela",
                text: `
                    <p>uywng Cwktela is a grid-based writing environment designed for writing Kalob without a keyboard.</p>
                    <p>Use the <strong>Overview Mode</strong> to navigate the infinite grid of 'parts'.</p>
                    <p>Use the <strong>Editor Mode</strong> to write content within a part.</p>
                    <p>Press <i class="fa-solid fa-square-caret-right icon-grey"></i> <strong>Start</strong> to focus on the gutter menu.</p>
                `
            },
            {
                title: "Book Overview",
                text: `
                    <h3>Moving Around</h3>
                    <p>Press <i class="fa-solid fa-square-caret-left icon-grey"></i> <strong>Select</strong> to open the Book Overview.</p>
                    <p>Use the <i class="fa-solid fa-arrows-up-down-left-right icon-purple"></i> to move the cursor one cell at a time.</p>
                    <p>Hold <i class="fa-solid fa-y icon-yellow"></i> + <i class="fa-solid fa-arrows-up-down-left-right icon-purple"></i> to jump to the edge of the visible screen.</p>
                    <p>Press <i class="fa-solid fa-a icon-green"></i> to open a part in Editor Mode.</p>
                    <p>Press <i class="fa-solid fa-square-caret-left icon-grey"></i> <strong>Select</strong> again to return to the part editor where you were.</p>
                    
                    <h3>Zooming</h3>
                    <p>Use <strong>LB</strong> to zoom in and see less of the grid.</p>
                    <p>Use <strong>RB</strong> to zoom out and see more of the grid.</p>
                `
            },
            {
                title: "Part Editing",
                text: `
                    <h3>Base Mode</h3>
                    <p>The left joystick selects from H, Y, R, N, M, L.</p>
                    <p>The right joystick selects from Q, K, P, T, S, C.</p>
                    <p>Release the joystick to type the selected character.</p>

                    <h3>Left Trigger Mode</h3>
                    <p>Hold the <strong>LT</strong> trigger to access vowels and additional characters.</p>
                    <br/>
                    <p>The left joystick selects: :, i, comma, x, o, a.</p>
                    <p>The right joystick selects: -, v, _, e, u, w.</p>

                    <h3>Right Trigger Mode</h3>
                    <p>Hold the <strong>RT</strong> trigger. Only the right stick changes.</p>
                    <br/>
                    <p>The right joystick selects: ., g, b, d, z, j.</p>
                    <p>The left joystick stays on base consonants (H, Y, R, N, M, L).</p>
                    
                    <h3>Shortcuts</h3>
                    <p><i class="fa-solid fa-a icon-green"></i>: Space</p>
                    <p><i class="fa-solid fa-b icon-red"></i>: Enter</p>
                    <p><i class="fa-solid fa-x icon-blue"></i>: Delete Forward</p>
                    <p><i class="fa-solid fa-y icon-yellow"></i>: Shift/Ctrl Mode</p>
                    <p><strong>L3/R3</strong>: Shift / Caps Lock (Toggle)</p>
                    <p><strong>L2</strong>: Backspace</p>
                    <p><strong>R2</strong>: Tab</p>

                    <h3>Modifier Shortcuts</h3>
                    <p><i class="fa-solid fa-y icon-yellow"></i> + <i class="fa-solid fa-arrows-left-right icon-purple"></i> Left: Word Left</p>
                    <p><i class="fa-solid fa-y icon-yellow"></i> + <i class="fa-solid fa-arrows-left-right icon-purple"></i> Right: Word Right</p>
                    <p><i class="fa-solid fa-y icon-yellow"></i> + <i class="fa-solid fa-arrows-up-down icon-purple"></i> Up: Home / Top of Part</p>
                    <p><i class="fa-solid fa-y icon-yellow"></i> + <i class="fa-solid fa-arrows-up-down icon-purple"></i> Down: End / Bottom of Part</p>
                    <p><i class="fa-solid fa-y icon-yellow"></i> + <strong>L2</strong>: Delete Word Backwards</p>
                    <p><i class="fa-solid fa-y icon-yellow"></i> + <strong>L3/R3</strong>: Paste from Clipboard</p>
                    <p><i class="fa-solid fa-y icon-yellow"></i> + <strong>RB</strong>: Enter Visual Select Mode</p>
                    <p><i class="fa-solid fa-y icon-yellow"></i> + <strong>LT</strong>: Undo</p>
                    <p><i class="fa-solid fa-y icon-yellow"></i> + <strong>RT</strong>: Redo</p>
                `
            },
            {
                title: "Part Citations",
                text: `
                    <h3>Creating Citations</h3>
                    <p>In Overview, press <i class="fa-solid fa-b icon-red"></i> to insert a citation to your current location.</p>
                    <p>This creates a <code>{{cite:x,y}}</code> tag. (x,y are the coordinates of the part)</p>
                    <p>Don't worry about the syntax, it will be automatically generated for you.</p>
                    
                    <h3>Following Citations</h3>
                    <p>In Editor, move your cursor to a citation.</p>
                    <p>Hold <i class="fa-solid fa-y icon-yellow"></i> and press <i class="fa-solid fa-b icon-red"></i> to follow the citation.</p>
                    <p>The camera will fly to the target location.</p>

                    <h3>Changing Citations</h3>
                    <p>In Editor, move your cursor to a citation.</p>
                    <p>Hold <i class="fa-solid fa-y icon-yellow"></i> and press <i class="fa-solid fa-a icon-green"></i> to update the citation.</p>
                    <p>The view will switch to Overview. Navigate to the new target and press <i class="fa-solid fa-a icon-green"></i> to confirm.</p>
                `
            },
            {
                title: "Visual Select Mode",
                text: `
                    <h3>Entering</h3>
                    <p>Hold <i class="fa-solid fa-y icon-yellow"></i> + <strong>RB</strong> in Editor Mode to enter Visual Select.</p>

                    <h3>Selection</h3>
                    <p>Use the <i class="fa-solid fa-arrows-up-down-left-right icon-purple"></i> to expand and move the selection anchor.</p>
                    <p>Hold <i class="fa-solid fa-y icon-yellow"></i> + D-Pad for word-based selection jumps.</p>

                    <h3>Actions</h3>
                    <p><i class="fa-solid fa-a icon-green"></i>: Copy</p>
                    <p><i class="fa-solid fa-x icon-blue"></i>: Cut / Delete</p>
                    <p><i class="fa-solid fa-b icon-red"></i>: Cancel</p>
                `
            }
        ];

        this.lastDpad = { up: false, down: false, left: false, right: false };
        this.lastButtons = {};
        this.debounceCounter = 0;
    }

    toggle(initialInput, returnModeOverride) {
        this.isOpen = !this.isOpen;
        this.render();

        if (this.isOpen) {
            this.debounceCounter = 15; // Ignore input for 15 frames
            if (initialInput && initialInput.buttons) {
                this.lastButtons = { ...initialInput.buttons };
            }
        } else {
            if (returnModeOverride) {
                this.focusManager.setMode(returnModeOverride);
            } else {
                const ov = document.getElementById('grid-overview');
                const isOverview = ov && (ov.style.display === 'block' || getComputedStyle(ov).display !== 'none');
                this.focusManager.setMode(isOverview ? 'OVERVIEW' : 'EDITOR');
            }
        }
    }

    handleInput(input) {
        if (!this.isOpen || !input) return;

        if (this.debounceCounter > 0) {
            this.debounceCounter--;
            this.lastButtons = { ...input.buttons };
            this.lastDpad = { ...input.buttons.dpad };
            return;
        }

        const dpad = input.buttons.dpad;
        const buttons = input.buttons;

        // CLOSE: Start -> Exit to Content (Smart Return)
        if (buttons.start && !this.lastButtons.start) {
            this.toggle(null, null); // Default smart return
            return;
        }

        // CLOSE: A (South) -> Return to Bottom Bar
        if (buttons.south && !this.lastButtons.south) {
            this.toggle(null, 'GUTTER');
            return;
        }

        // NAV: Left/Right (D-pad OR Shoulders)
        const leftInput = dpad.left || buttons.lb;
        const rightInput = dpad.right || buttons.rb;

        if (rightInput && !this.lastNav?.right) {
            this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slides.length;
            this.renderContent();
        }
        if (leftInput && !this.lastNav?.left) {
            this.currentSlideIndex = (this.currentSlideIndex - 1 + this.slides.length) % this.slides.length;
            this.renderContent();
        }

        // SCROLL: Up/Down
        const scrollAmount = buttons.north ? 20 : 5; // Y = Fast Scroll
        const contentEl = document.getElementById('help-content-text');
        if (contentEl) {
            if (dpad.down) contentEl.scrollTop += scrollAmount;
            if (dpad.up) contentEl.scrollTop -= scrollAmount;
        }

        this.lastNav = { left: leftInput, right: rightInput };
        this.lastDpad = { ...dpad };
        this.lastButtons = { ...buttons };
    }

    render() {
        let modal = document.getElementById('help-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'help-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="help-container">
                    <div class="help-header">
                        <div class="help-nav-hint">< LB</div>
                        <h2 id="help-title">Title</h2>
                        <div class="help-nav-hint">RB ></div>
                    </div>
                    <div class="help-body" id="help-content-text"></div>
                    <div class="help-footer">
                        <span><i class="fa-solid fa-arrows-up-down"></i> Scroll</span>
                        <span><i class="fa-solid fa-y"></i> + <i class="fa-solid fa-arrows-up-down"></i> Fast Scroll</span>
                        <span><i class="fa-solid fa-a"></i> Close</span>
                    </div>
                    <div class="help-dots" id="help-dots"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.style.display = this.isOpen ? 'flex' : 'none';
        if (this.isOpen) {
            this.renderContent();
        }
    }

    renderContent() {
        const slide = this.slides[this.currentSlideIndex];
        document.getElementById('help-title').innerText = slide.title;
        document.getElementById('help-content-text').innerHTML = slide.text;

        // Dots
        const dotsContainer = document.getElementById('help-dots');
        dotsContainer.innerHTML = this.slides.map((_, i) =>
            `<span class="dot ${i === this.currentSlideIndex ? 'active' : ''}"></span>`
        ).join('');
    }
}
