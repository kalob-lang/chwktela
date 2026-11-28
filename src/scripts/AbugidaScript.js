// Cypher Mapping
export const cypherMap = {
    'p': 'e', 'b': 'ɘ',
    't': 'ʌ', 'd': 'v',
    'k': 'c', 'g': 'ↄ',
    'q': 'ʊ',
    's': 's', 'z': 'ƨ',
    'c': 'ɛ', 'j': 'ɜ',
    'ph': 'e̱', 'bh': 'ɘ̱',
    'th': 'ʌ̱', 'dh': 'v̱',
    'kh': 'c̱', 'gh': 'ↄ̱',
    'qh': 'ʊ̱',
    'sh': 's̱', 'zh': 'ƨ̱',
    'ch': 'ɛ̱', 'jh': 'ɜ̱',
    'm': 'q', 'n': 'ƞ',
    'l': 'ꞁ',
    'r': 'ɽ',
    'y': 'ɥ',
    'x': 'ı'
};

// Combining marks
export const vowelDiac = {
    'a': '\u0300', // Grave `
    'e': '\u0301', // Acute ´
    'i': '\u0302', // Circumflex ˆ
    'o': '\u0307', // Dot ̇
    'u': '\u0308', // Diaeresis ¨
    'v': '\u030C', // Caron ˇ
    'w': '\u0303'  // Tilde ˜
};

export const preProc = {
    'ph': '0', 'th': '1', 'kh': '2', 'qh': '3', 'sh': '4', 'ch': '5',
    'bh': '6', 'dh': '7', 'gh': '8', 'zh': '9', 'jh': '@'
};

export const postProc = {
    '0': 'ph', '1': 'th', '2': 'kh', '3': 'qh', '4': 'sh', '5': 'ch',
    '6': 'bh', '7': 'dh', '8': 'gh', '9': 'zh', '@': 'jh'
};

export const reverseCypherMap = (() => {
    const map = {};
    for (const [latin, glyph] of Object.entries(cypherMap)) {
        const nfd = glyph.normalize('NFD');
        map[nfd] = latin;
        // Also recognize U+0332 (combining low line from Abugida.json '◌̲') as aspiration mark
        if (nfd.includes('\u0331')) {
            map[nfd.replace(/\u0331/g, '\u0332')] = latin;
        }
    }
    return map;
})();

export const reverseVowelDiac = Object.fromEntries(
    Object.entries(vowelDiac).map(([vowel, diac]) => [diac, vowel])
);

const COMBINING_MARK_RE = /\p{M}/u;
const ASPIRATION_MARKS = new Set(['\u0331', '\u0332']);

export function convertChunk(chunk, isPure = true, useToolU = true) {
    let s = chunk;
    for (const k in preProc) {
        s = s.replace(new RegExp(k, 'g'), preProc[k]);
    }

    let out = '';
    let lastWasConsonant = false;

    for (let i = 0; i < s.length; i++) {
        const char = s[i];

        if (vowelDiac[char]) {
            if (!lastWasConsonant) {
                out += cypherMap['x'];
            }
            if (isPure) {
                out += vowelDiac[char];
            }
            lastWasConsonant = false;
        } else {
            const cLat = postProc[char] || char;

            if (cypherMap[cLat]) {
                out += cypherMap[cLat];
                lastWasConsonant = true;
            } else {
                out += char;
                lastWasConsonant = false;
            }
        }
    }

    if (useToolU && isPure) {
        out = out.replace(/ı\u0308/g, ':');
    }

    return out;
}

export function convertToCypher(text, isPure = true, useToolU = true) {
    return text.replace(/[a-zA-Z\-]+/g, (word) => {
        const chunks = word.split('-');
        let out = '';
        for (const chunk of chunks) {
            out += convertChunk(chunk, isPure, useToolU);
        }
        return out;
    });
}

export function convertToAbugida(text, { isPure = true, useToolU = true } = {}) {
    if (!text) return '';
    return text
        .split(/(\{\{cite:.*?\}\})/g)
        .map((part) => {
            if (part.startsWith('{{cite:') && part.endsWith('}}')) {
                return part;
            }
            return convertToCypher(part.toLowerCase(), isPure, useToolU);
        })
        .join('');
}

function appendMapped(outParts, spanMap, str, start, end) {
    for (let k = 0; k < str.length; k++) {
        outParts.push(str[k]);
        spanMap.push({ start, end });
    }
}

export function decodeCypherWithMap(text, baseOffset = 0) {
    const outParts = [];
    const spanMap = [];

    for (let i = 0; i < text.length; ) {
        if (text[i] === ':') {
            appendMapped(outParts, spanMap, 'u', baseOffset + i, baseOffset + i + 1);
            i += 1;
            continue;
        }

        // Group one base code unit + any trailing combining marks as a cluster
        const cStart = i;
        i += 1;
        while (i < text.length && COMBINING_MARK_RE.test(text[i])) {
            i += 1;
        }
        const cEnd = i;
        const cluster = text.slice(cStart, cEnd);
        const nfd = cluster.normalize('NFD');
        const isUnchangedOrder = nfd === cluster;

        // Check 2-char aspirated glyph (base + U+0331 or U+0332) before 1-char base
        let latin = null;
        let markStartIdx = 0;
        let consonantRawEnd = cEnd;

        if (nfd.length >= 2 && reverseCypherMap[nfd[0] + nfd[1]]) {
            latin = reverseCypherMap[nfd[0] + nfd[1]];
            markStartIdx = 2;
            if (isUnchangedOrder) {
                consonantRawEnd = cStart + 2;
            }
        } else if (reverseCypherMap[nfd[0]]) {
            latin = reverseCypherMap[nfd[0]];
            markStartIdx = 1;
            if (isUnchangedOrder) {
                consonantRawEnd = cStart + 1;
            }
        } else {
            // Standalone mark or pass-through character
            let emitted = '';
            for (const ch of nfd) {
                emitted += reverseVowelDiac[ch] || ch;
            }
            appendMapped(outParts, spanMap, emitted, baseOffset + cStart, baseOffset + cEnd);
            continue;
        }

        const remainingMarks = nfd.slice(markStartIdx);

        if (remainingMarks.length === 0) {
            appendMapped(outParts, spanMap, latin, baseOffset + cStart, baseOffset + cEnd);
            continue;
        }

        // Handle marks attached to this consonant (or onset anchor 'ı')
        let consumedVowel = false;
        let consumedXMark = false;
        let emittedConsonant = false;

        for (let mIdx = 0; mIdx < remainingMarks.length; mIdx++) {
            const mark = remainingMarks[mIdx];
            const markOrigStart = isUnchangedOrder ? cStart + markStartIdx + mIdx : cStart;
            const markOrigEnd = isUnchangedOrder ? markOrigStart + 1 : cEnd;

            // Handle U+033D (from Abugida.json 'ı̽' for literal consonant 'x')
            if (mark === '\u033D' && !consumedXMark) {
                consumedXMark = true;
                if (latin === 'x') {
                    appendMapped(outParts, spanMap, 'x', baseOffset + cStart, baseOffset + markOrigEnd);
                    emittedConsonant = true;
                } else {
                    if (!emittedConsonant) {
                        appendMapped(outParts, spanMap, latin, baseOffset + cStart, baseOffset + consonantRawEnd);
                        emittedConsonant = true;
                    }
                    appendMapped(outParts, spanMap, 'x', baseOffset + markOrigStart, baseOffset + markOrigEnd);
                }
                continue;
            }

            // Handle aspiration mark if a vowel mark somehow preceded it in raw order
            if (ASPIRATION_MARKS.has(mark)) {
                continue;
            }

            if (!consumedVowel && reverseVowelDiac[mark]) {
                consumedVowel = true;
                const vowel = reverseVowelDiac[mark];
                if (latin === 'x') {
                    // 'ı' is a silent onset anchor when carrying a vowel diacritic
                    appendMapped(outParts, spanMap, vowel, baseOffset + cStart, baseOffset + markOrigEnd);
                    emittedConsonant = true;
                } else {
                    if (!emittedConsonant) {
                        appendMapped(outParts, spanMap, latin, baseOffset + cStart, baseOffset + consonantRawEnd);
                        emittedConsonant = true;
                    }
                    appendMapped(outParts, spanMap, vowel, baseOffset + markOrigStart, baseOffset + markOrigEnd);
                }
                continue;
            }

            if (!emittedConsonant) {
                appendMapped(outParts, spanMap, latin, baseOffset + cStart, baseOffset + consonantRawEnd);
                emittedConsonant = true;
            }
            const extra = reverseVowelDiac[mark] || mark;
            appendMapped(outParts, spanMap, extra, baseOffset + markOrigStart, baseOffset + markOrigEnd);
        }

        if (!emittedConsonant) {
            appendMapped(outParts, spanMap, latin, baseOffset + cStart, baseOffset + consonantRawEnd);
        }
    }

    return { text: outParts.join(''), spanMap };
}

export function decodeCypher(text) {
    if (!text) return '';
    return decodeCypherWithMap(text, 0).text;
}

function decodeSegmentWithQuotes(segment, baseOffset, outParts, spanMap) {
    const tokenRe = /[«｢]\u2009?|\u2009?[»｣]/g;
    let lastIdx = 0;
    let match;
    while ((match = tokenRe.exec(segment)) !== null) {
        if (match.index > lastIdx) {
            const chunk = segment.slice(lastIdx, match.index);
            const decoded = decodeCypherWithMap(chunk, baseOffset + lastIdx);
            for (let k = 0; k < decoded.text.length; k++) {
                outParts.push(decoded.text[k]);
                spanMap.push(decoded.spanMap[k]);
            }
        }
        outParts.push('"');
        spanMap.push({ start: baseOffset + match.index, end: baseOffset + match.index + match[0].length });
        lastIdx = match.index + match[0].length;
    }
    if (lastIdx < segment.length) {
        const chunk = segment.slice(lastIdx);
        const decoded = decodeCypherWithMap(chunk, baseOffset + lastIdx);
        for (let k = 0; k < decoded.text.length; k++) {
            outParts.push(decoded.text[k]);
            spanMap.push(decoded.spanMap[k]);
        }
    }
}

export function convertFromAbugidaWithMap(text) {
    if (!text) return { text: '', spanMap: [] };

    const outParts = [];
    const spanMap = [];
    const splitRe = /(\{\{cite:.*?\}\}|⟨[^⟩]*⟩)/g;
    let lastIdx = 0;
    let match;

    while ((match = splitRe.exec(text)) !== null) {
        if (match.index > lastIdx) {
            decodeSegmentWithQuotes(text.slice(lastIdx, match.index), lastIdx, outParts, spanMap);
        }

        const part = match[0];
        const partStart = match.index;

        if (part.startsWith('{{cite:') && part.endsWith('}}')) {
            for (let k = 0; k < part.length; k++) {
                outParts.push(part[k]);
                spanMap.push({ start: partStart + k, end: partStart + k + 1 });
            }
        } else if (part.startsWith('⟨') && part.endsWith('⟩')) {
            let innerStart = partStart + 1;
            let innerEnd = partStart + part.length - 1;
            if (innerStart < innerEnd && text[innerStart] === '\u2009') innerStart += 1;
            if (innerEnd > innerStart && text[innerEnd - 1] === '\u2009') innerEnd -= 1;
            const inner = text.slice(innerStart, innerEnd);

            if (/[A-Z]/.test(inner)) {
                for (let k = 0; k < inner.length; k++) {
                    outParts.push(inner[k]);
                    spanMap.push({ start: innerStart + k, end: innerStart + k + 1 });
                }
            } else {
                const decoded = decodeCypherWithMap(inner, innerStart);
                const capitalized = decoded.text.replace(/\b[a-z]/g, (c) => c.toUpperCase());
                for (let k = 0; k < capitalized.length; k++) {
                    outParts.push(capitalized[k]);
                    spanMap.push(decoded.spanMap[k]);
                }
            }
        }

        lastIdx = match.index + part.length;
    }

    if (lastIdx < text.length) {
        decodeSegmentWithQuotes(text.slice(lastIdx), lastIdx, outParts, spanMap);
    }

    return { text: outParts.join(''), spanMap };
}

export function convertFromAbugida(text) {
    return convertFromAbugidaWithMap(text).text;
}

export const scriptName = 'Abugida';

export const AbugidaScript = {
    name: 'Abugida',
    toLatin: convertFromAbugida,
    toLatinWithMap: convertFromAbugidaWithMap,
    fromLatin: convertToAbugida,
};

export default AbugidaScript;
