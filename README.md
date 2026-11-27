# uywng Cwktela

![uywng Cwktela Logo](public/cwktela.svg)

A gamepad-only [Kalob](https://kalob.org/) text editor designed for efficient, controller-based writing and text manipulation.

## Overview
**uywng Cwktela** reimagines text entry by mapping typing, navigation, and editing commands to a standard gamepad controller. It features a modal interface similar to console text editors but optimized for thumbs, allowing for (hopefully) high-speed input and precise control without a keyboard.

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
   git clone https://github.com/your-repo/cwktela.git
   cd cwktela
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

#### Both Triggers Held — Punctuation
Uses a separate punctuation mapping defined in the active writing system.

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
    "PUNCTUATION": {
        "LEFT": { ... },
        "RIGHT": { ... }
    }
}
```

### Mapping Keys

- **STARTING_BOOK_NAME / STARTING_MAIN_NAME / STARTING_PART_NAME**: Default names for new books, main parts, and sub-parts.
- **STAGING_BRACKETS**: Characters shown around pending input (e.g. `⟦h⟧`).
- **BASE**: Character maps for left and right sticks in default mode.
- **LEFT_TRIGGER**: Character maps when left trigger is held.
- **RIGHT_TRIGGER**: Character map for the right stick when right trigger is held.
- **PUNCTUATION**: Character maps when both triggers are held.

## Roadmap

- [x] Home/End/Top/Bottom navigation keys
- [ ] In Overview Mode, Home navigates to the part with the lowest X coordinate, End navigates to the part with the highest X coordinate
- [ ] In Editor Mode, part navigation using Select + D-Pad
- [ ] Add a joystick layer for symbols/numbers
- [ ] Allow parts to be external links to websites that load in an iframe
- [ ] New buffer style (called Navigator, now there are 3 buffer styles: Editor, Navigator, and Overview) used for FINDING and CHECKING modes
    - The buffer fills the space that Editor and Overview utilize
    - The buffer containers a header and a main content area
    - In FINDING mode, the header contains a search box and search result location indicator
    - In CHECKING mode, the header contains a spelling error location indicator
    - The main content area contains something like an editor but one word or phrase is highlighted (either the text being searched for or the misspelled word)
    - 
- [ ] New Modes: SEARCH_MENU, FINDING
    - An icon <i class="fa-solid fa-magnifying-glass"></i> is next to the Case Mode icon
    - When clicked, it opens the Search Menu (SEARCH_MENU mode)
    - In the Search Menu, the following options are available:
        - Search Part: A button for entering FINDING mode (uses the new buffer style), set to search within the current part
        - Search Book: A button for entering FINDING mode (uses the new buffer style), set to search within the current book
        - Done: A button for returning to the Gutter (GUTTER mode)
    - In FINDING mode, the user is in the editor buffer and can use standard editor input mappings except for the following:
        - 
- [ ] New Modes: SPELLCHECK_MENU, CHECKING
    - Spellchecking is toggleable in the Settings menu
    - When enabled, an icon will appear next to the Search icon
        - If there are spelling errors, it will be a <i class="fa-solid fa-circle-exclamation"></i> icon
        - If there are no spelling errors, it will be a <i class="fa-solid fa-circle-check"></i> icon
    - When enabled, spelling errors will be tracked across all parts in the book and will have a red squiggly underline in EDITOR and CHECKING modes.
    - When enabled, the amount of spelling errors will be displayed as a badge on the Spelling Mode icon
    - Clicking on the Spelling Mode icon will open the Spelling Menu (SPELLCHECK_MENU mode)
    - In the Spelling Menu, the following options will be available:
        - Ignored Words: A button that opens a scrollable list modal (IGNORED_WORDS mode) of words that will be ignored by the spellchecker (hit X to remove from list, hit B to return to Spelling Menu, Start to return to Gutter)
        - Hunspell File: A dropdown menu for selection which Hunspell file to use (populates with files in the `dictionaries` directory)
        - Check Spelling: A button for entering CHECKING mode (almost entirely the same as Editor mode, but with some different button shortcuts)
        - Done: A button for returning to the Gutter (GUTTER mode)
    - No Editor Mode shortcut for entering CHECKING mode, nav to it from the gutter
    - Upon entering CHECKING mode, the cursor will move to the first error in the part, or the first error in the book if no errors are found in the part
    - When Gutter Mode is active, go right from the Book icon to get to it
    - When Gutter Mode is active, go left from Export Logs icon (if Developer Mode is active) or Gamepad icon to get to it
    - When Gutter Mode is active and the Spelling Icon is selected, hit A to open the Spelling Menu (SPELLCHECK_MENU mode)
    - When CHECKING Mode is active, Left/Right D-pad buttons navigate from one error to another in the current part only, moving the cursor to the erroneous word in the editor
    - When CHECKING Mode is active, Y (North) + Left/Right D-pad buttons navigate from one error to another in the entire book, moving the cursor to the erroneous word in the editor (and the current part will change to the part containing the error)
    - When an error has been navigated to
        - A list of possible corrections is displayed in a dropdown menu below the erroneous word
        - Use the Up/Down D-Pad buttons to navigate the list of corrections
        - If no corrections are found, the dropdown menu will display "No Corrections"
        - X (East) button deletes the erroneous word and moves the cursor to the next error
        - A (South) button replaces the erroneous word with a space (and moves the cursor to the right)
        - B (West) button returns to the Spelling Menu (SPELLCHECK_MENU mode)
        - Y (North) button adds the erroneous word to the list of ignored words
        - LB (Left Shoulder) button acts as backspace to delete the last character of the erroneous word (and moves the cursor left)
        - RB (Right Shoulder) button replaces the erroneous word with the selected correction (and moves the cursor to the next error)
        - NOTE: A and LB are normal EDITOR mode behaviors in CHECKING mode because they are used for typing the corrections

## License
[ACSL](LICENSE)
