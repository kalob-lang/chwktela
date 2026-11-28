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
  - **Spellcheck Menu & Checking**: Segment-level Kalob spellchecking powered by `kalob-spell`, with custom `ignore_words` / `add_words` lists and interactive error navigation.
  - **Gutter**: Bottom bar for file management, settings, spellchecking, and gamepad configuration.
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

### Spellcheck (`SPELLCHECK_MENU` & `CHECKING` Modes)
- **Enable**: Toggle **Spellcheck** in Settings. When enabled, the Check Mode icon (`fa-circle-check` / `fa-circle-exclamation`) appears next to the Case Mode icon in the bottom bar (with a lower-right error count badge in Editor Mode).
- **Script Conversion (`src/scripts/`)**: Non-Latin writing systems (such as **Abugida**) are converted back to Latin before spellchecking while preserving exact character-span offsets for error highlighting and replacements, and correction suggestions in the dropdown are converted back to the active script before display/application.
- **Highlights & Badges**: Unrecognized Kalob lexemes and invalid `u`-glued compound segments are shown in red boxes in Editor and Checking modes; Overview Mode outlines parts with errors in red and displays an error count badge in the lower-right corner.
- **Spelling Menu (`SPELLCHECK_MENU`)**: Open by clicking the Check Mode icon or selecting it in Gutter Mode (right from Book, or left from Export Logs / Gamepad):
  - **Ignore Words** / **Add Words**: Opens a newline-separated editor backed by `localStorage` (`ignore_words` / `add_words`). Press **South (A)** to save (instead of inserting a space) or **Select** to cancel.
  - **Check Book Spelling** / **Check Part Spelling**: Enters Checking Mode at the first error in the book or current part, displaying a top-left **Part / Book** toggle gutter with `current / total` error count and a corrections dropdown below the active segment.
- **Checking Mode (`CHECKING`)**:
  - **D-Pad Left / Right**: Navigate between errors in the active scope (part or book)
  - **D-Pad Up / Down**: Navigate corrections in the dropdown (or `No Corrections` if none match)
  - **RB**: Replace erroneous segment with selected correction and move to next error
  - **North (Y)**: Add erroneous word to `ignore_words` and move to next error
  - **West (X)**: Delete erroneous segment and exit to Editor Mode
  - **South (A)**: Replace erroneous segment with a space and exit to Editor Mode
  - **East (B)**: Replace erroneous segment with a newline and exit to Editor Mode
  - **LB**: Backspace the last character of the erroneous word and exit to Editor Mode
  - **Start**: Return to the Spelling Menu (`SPELLCHECK_MENU`)
  - **Select**: Exit Checking Mode and return to Overview Mode

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

### Script Converters for Spellchecking (`src/scripts/`)

Spellchecking and `kalob-spell` operate on Latin Kalob lexemes. Whenever you add a custom mapping at `src/mappings/<Name>.json`, you should also provide a bidirectional conversion path between Latin and that script so spellchecking, error highlighting, `ignore_words` / `add_words`, and dropdown corrections work in your script:

1. **Auto-discovered Script Module**: Create `src/scripts/<Name>Script.js` exporting a converter object (default export or named export alongside `export const scriptName = '<Name>'`). `ScriptRegistry.js` automatically loads all `*Script.js` files matching the mapping name (same `<Name>` as `src/mappings/<Name>.json`).
2. **Programmatic Registration**: Alternatively, register a converter at runtime with `registerScript('<Name>', converter)` from `src/scripts/ScriptRegistry.js`.
3. **Converter Interface**:
   - `toLatin(text)`: Converts text in the target script to Latin Kalob.
   - `toLatinWithMap(text)` *(recommended for scripts with multi-character glyphs, combining marks, or delimiters)*: Returns `{ text, spanMap }`, where each index `i` of the returned Latin `text` maps to `{ start, end }` in the original script string so red error boxes and replacements (`RB`, `X`, `A`, `B`, `LB`) align cleanly to the original glyphs. If omitted, `ScriptRegistry` wraps `toLatin` with a fallback span map.
   - `fromLatin(latinText)`: Converts Latin correction suggestions from `kalob-spell` back into the target script for the Checking Mode dropdown and replacement.

#### Built-in `Abugida` Converter (`src/scripts/AbugidaScript.js`)
- **Latin → Abugida (`convertToAbugida` / `convertToCypher` / `convertChunk`)**: Uses the sequential cypher and combining vowel diacritic maps (`cypherMap`, `vowelDiac`), inserting onset anchor `ı` for vowel-initial syllables and applying the `:` shortcut for onset `u` (`ı\u0308` → `:`).
- **Abugida → Latin (`convertFromAbugida` / `decodeCypher` / `convertFromAbugidaWithMap`)**: NFD-normalizes clusters so aspiration marks (`U+0331` / `U+0332`) precede vowel diacritics, expands `:` to `u`, merges onset-anchored vowels (`ı` + diacritic), unwraps quotes (`« ... »` / `｢ ... ｣`) and noun delimiters (`⟨ ... ⟩`), leaves untransliterated uppercase proper nouns and `{{cite:x,y}}` tags intact, and preserves original UTF-16 character spans.

## Roadmap

- [x] Home/End/Top/Bottom navigation keys
- [x] In Editor Mode, part navigation using Select + D-Pad
- [x] Add a joystick layer for symbols/numbers
- [x] New Modes: SPELLCHECK_MENU, CHECKING
- [ ] New Modes: SEARCH_MENU, FINDING
    - An icon <i class="fa-solid fa-magnifying-glass"></i> is next to the Case Mode icon
    - When clicked, it opens the Search Menu (SEARCH_MENU mode)
    - In the Search Menu, the following options are available:
        - Search Part: A button for entering FINDING mode (uses the new buffer style), set to search within the current part
        - Search Book: A button for entering FINDING mode (uses the new buffer style), set to search within the current book
        - Done: A button for returning to the Gutter (GUTTER mode)
    - In FINDING mode, the user is in the editor buffer and can use standard editor input mappings except for the following:
- [ ] Allow parts to be external links to websites that load in an iframe

## License
[ACSL](LICENSE)
