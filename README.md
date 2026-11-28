# uywng Chwktela

![uywng Chwktela Logo](public/chwktela.jpeg)

A gamepad-only [Kalob](https://kalob-lang.github.io) text editor designed for efficient, controller-based writing and text manipulation.

## Overview
**uywng Chwktela** reimagines text entry by mapping typing, navigation, and editing commands to a standard gamepad controller. It features a modal interface similar to console text editors but optimized for thumbs, allowing for (hopefully) high-speed input and precise control without a keyboard.

## Features
- **Gamepad Typing**: Direct character entry via joystick directions.
- **Modes**:
  - **Editor**: Standard text composition.
  - **Overview**: Grid-based navigation of document parts.
  - **Visual Select**: Precise text selection and manipulation.
  - **Gutter**: Bottom bar for file management, settings, and gamepad configuration.
- **Persistence**: Auto-saves content and settings to LocalStorage.
- **Undo/Redo**: Robust history system saved to SessionStorage.
- **Citations**: Atomic citation tags `{{cite:x,y}}` with jump navigation support.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/chwktela.git
   cd chwktela
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` (or the port shown) in your browser.
   *Ensure a gamepad is connected before pressing any buttons to initialize input.*

## Controls

### General
- **Modifier (North / Y)**: Hold to access secondary layers

### Editor Mode
- **Left Stick / Right Stick**: Character Entry
- **D-Pad Left/Right**: Cursor Movement (Character)
- **D-Pad Up/Down**: Cursor Movement (Line)
- **South (A)**: Space
- **East (B)**: Enter
- **West (X)**: Delete Forward
- **L2**: Backspace
- **R2**: Tab
- **L3/R3**: Shift / Caps Lock (Toggle)
- **Select (Tap)**: Toggle Overview Mode
- **Select (Hold) + D-Pad**: Switch to Adjacent Part (Left / Right / Up / Down)
- **Modifier + D-Pad Left/Right**: Word Navigation
- **Modifier + D-Pad Up**: Home / Top of Part
- **Modifier + D-Pad Down**: End / Bottom of Part
- **Modifier + L2**: Delete Word Backwards
- **Modifier + L3/R3**: Paste from Clipboard
- **Modifier + RB**: Enter Visual Select Mode
- **Modifier + LT**: Undo
- **Modifier + RT**: Redo

### Typing Layers

#### Base Mode (No Trigger)
| Stick | N | NW | NE | SW | SE | S |
|-------|---|----|----|----|----|---|
| Left  | h | y  | r  | n  | m  | l |
| Right | q | k  | p  | t  | s  | c |

#### Left Trigger Held
| Stick | N | NW | NE | SW | SE | S |
|-------|---|----|----|----|----|---|
| Left  | : | i  | ,  | x  | o  | a |
| Right | - | v  | _  | e  | u  | w |

#### Right Trigger Held
| Stick | N | NW | NE | SW | SE | S |
|-------|---|----|----|----|----|---|
| Right | . | g  | b  | d  | z  | j |

*Left stick stays on base consonants when Right Trigger is held.*

#### Both Triggers Held — Punctuation / Numbers / Symbols
Hold both **LT + RT** to access the `PUNCTUATION` layers defined by the active writing system (punctuation, numbers/math, and symbols).
- **Rotate Layers (`LT + RT + Y`)**: While holding both triggers, click **Y (North)** to cycle forward through the punctuation layers (wrapping from the last layer back to the first).
- The joystick wheels update to show the active layer, and the focus bar indicator displays a row of circles (`fa-circle`), highlighting the active layer (`fa-circle-dot`).

### Overview Mode
- **D-Pad**: Grid Navigation
- **South (A)**: Enter Selected Part
- **Modifier + B**: Follow Link (if valid)

### Visual Select Mode
- **D-Pad**: Expand/Shrink Selection
- **West (X)**: Cut
- **South (A)**: Copy

## Custom Mappings

You can define custom input mappings by creating a `.json` file in `src/mappings/`. The format uses these layers:

```json
{
    "STARTING_BOOK_NAME": "book",
    "STARTING_MAIN_NAME": "new",
    "STARTING_PART_NAME": "part one",
    "STAGING_BRACKETS": "⟦⟧",
    "CASE_MODE": "upper",
    "BASE": {
        "LEFT": {
            "NORTH": "h",
            "NORTH_WEST": "y",
            "NORTH_EAST": "r",
            "SOUTH_WEST": "n",
            "SOUTH_EAST": "m",
            "SOUTH": "l"
        },
        "RIGHT": {
            "NORTH": "q",
            "NORTH_WEST": "k",
            "NORTH_EAST": "p",
            "SOUTH_WEST": "t",
            "SOUTH_EAST": "s",
            "SOUTH": "c"
        }
    },
    "LEFT_TRIGGER": {
        "LEFT": { ... },
        "RIGHT": { ... }
    },
    "RIGHT_TRIGGER": {
        "RIGHT": { ... }
    },
    "PUNCTUATION": [
        {
            "LEFT": { ... },
            "RIGHT": { ... }
        }
    ]
}
```

### Mapping Keys

- **STARTING_BOOK_NAME / STARTING_MAIN_NAME / STARTING_PART_NAME**: Default names for new books, main parts, and sub-parts.
- **STAGING_BRACKETS**: Characters shown around pending input (e.g. `⟦h⟧`).
- **CASE_MODE**: Controls how toggling case mode with `L3`/`R3` (`0` = default, `1` = next character, `2` = continuous lock) behaves. Defaults to `"upper"` if omitted:
  - **`"upper"`**: Standard uppercase mode. Converts typed letters in the mapping to uppercase whenever `caseMode` is `1` (single character, `fa-arrow-up` indicator) or `2` (continuous, `fa-circle-up` indicator).
  - **`"break"`**: Combining-mark break mode. Cancels the preceding-letter check on 2-codepoint normal-glyph + combining-mark mappings so the full 2-codepoint string is entered instead of only the combining mark — once in `caseMode` `1` (`fa-xmark` indicator) and continuously in `caseMode` `2` (`fa-circle-xmark` indicator).
- **BASE**: Character maps for left and right sticks in default mode.
- **LEFT_TRIGGER**: Character maps when left trigger is held.
- **RIGHT_TRIGGER**: Character map for the right stick when right trigger is held.
- **PUNCTUATION**: An array of `{ LEFT, RIGHT }` character map layers (or a single object) used when both triggers are held. While holding both triggers, clicking **Y** rotates through the layers (wrapping back to the first layer).

> **Combining-Mark Mappings**: Whenever a mapping entry contains two glyphs where one is a normal glyph and the other is a combining mark (such as `◌̲` or `ı̂`), triggering it enters the full 2-codepoint string when there is no preceding letter, and enters only the combining mark when a preceding letter (including a letter that already has combining marks) immediately precedes the cursor — unless `"CASE_MODE": "break"` is active (`caseMode` `1` or `2`).

## Roadmap

- [x] Home/End/Top/Bottom navigation keys
- [x] In Editor Mode, part navigation using Select + D-Pad
- [x] Add a joystick layer for symbols/numbers
- [ ] New Modes: SEARCH_MENU, FINDING
    - An icon <i class="fa-solid fa-magnifying-glass"></i> is next to the Case Mode icon
    - When clicked, it opens the Search Menu (SEARCH_MENU mode)
    - In the Search Menu, the following options are available:
        - Search Part: A button for entering FINDING mode (uses the new buffer style), set to search within the current part
        - Search Book: A button for entering FINDING mode (uses the new buffer style), set to search within the current book
        - Done: A button for returning to the Gutter (GUTTER mode)
    - 
    - In FINDING mode, the user is in the editor buffer and can use standard editor input mappings except for the following:
        - 
- [ ] New Modes: SPELLCHECK_MENU, CHECKING
    - Spellchecking is toggleable in the Settings menu
    - When spellchecking is enabled, an icon will appear next to the Case Mode icon (called the Check Mode icon)
        - If there are spelling errors, it will be a <i class="fa-solid fa-circle-exclamation"></i> icon
        - If there are no spelling errors, it will be a <i class="fa-solid fa-circle-check"></i> icon
    - When spellchecking is enabled, spelling errors will be tracked across all parts in the book and each error will have a red highlighted box in EDITOR and CHECKING modes. In the OVERVIEW mode, when a part has errors, a red highlight will appear around the part cell and a badge in the lower right corner will count the number of errors.
    - When spellchecking is enabled and the user is inside of the EDITOR mode, the amount of spelling errors will be displayed as a badge in the lower right corner of the Check Mode icon
    - Clicking on the Check Mode icon (or navigating to it through the gutter navigation) will open the Spelling Menu (SPELLCHECK_MENU mode)
    - In the Spelling Menu, the following options will be available:
        - Ignore Words: A button that opens an EDITOR mode that contains a newline-separated list of words that will be ignored by the spellchecker (each row in the file will represent an ignored word; hitting A, instead of adding a space, saves the list; Select to cancel). This ignore_words part is stored in localStorage.
        - Add Words: A button that opens an EDITOR mode that contains a newline-separated list of words that will be added to the autocomplete (each row in the file represents an added word; hitting A, instead of adding a space, saves the list; Select to cancel). This add_words part is stored in localStorage.
        - Check Book Spelling: A button for entering CHECKING mode (almost entirely the same as Editor mode, but with some different button shortcuts)
        - Check Part Spelling: A button for entering CHECKING mode (same as Check Book Spelling but limits the check to only the current part)
        - Done: A button for returning to the Gutter (GUTTER mode)
    - Upon entering CHECKING mode, a small gutter will drop down in the top left corner of the main editor space. It has a toggle between Part and Book that aligns with which button they clicked in the SPELLCHECK_MENU mode. It will display the number of errors in the current part or book and the current error number that the user is located at.
    - Upon entering CHECKING mode, the cursor will move to the first error in the part or the first error in the book (depending on which was selected in the SPELLCHECK_MENU mode)
    - When CHECKING Mode is active, Left/Right D-pad buttons navigate from one error to another in either the current part or the whole book (depending on which was selected in the SPELLCHECK_MENU mode), moving the cursor to the erroneous word in the editor and changing the error number in the small upper left gutter.
    - In Kalob, compound words are roots glued together by "u" and there are also a set of suffixes that can be added. Spellchecking works by looking to see if the whole word is valid but if that fails it then checks to see if each segment is valid.
    - Following the examples in @machka, each lexeme should be spellchecked separately and the errors should be reported at the segment level.
    - When an error in a particular segment is identified and has been navigated to
        - A list of possible corrections for that given segment is displayed in a dropdown menu below the erroneous segment
        - Use the Up/Down D-Pad buttons to navigate the list of corrections
        - If no corrections are found, the dropdown menu will display "No Corrections"
        - The X button deletes the erroneous segment and exits CHECKING mode at that location
        - The A button replaces the erroneous segment with a space (and moves the cursor to the right, exiting CHECKING mode)
        - The B button replaces the erroneous segment with a newline (and moves the cursor to the newline, exiting CHECKING mode)
        - The Start button returns to the Spelling Menu (SPELLCHECK_MENU mode)
        - The Select button returns to the OVERVIEW mode and exists CHECKING mode.
        - The Y button adds the erroneous word to the list of ignored words and moves the cursor to the next error in the part or book, if there are any.
        - LB (Left Shoulder) button acts as backspace to delete the last character of the erroneous word (and moves the cursor left, exiting CHECKING mode)
        - RB (Right Shoulder) button replaces the erroneous segment with the selected correction (and moves the cursor to the next error)
- [ ] Allow parts to be external links to websites that load in an iframe

## License
[ACSL](LICENSE)
