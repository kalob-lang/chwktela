// Registry of writing-system script converters (Latin <-> Target Script)
// Any custom mapping in src/mappings/<Name>.json can register a matching converter
// either via a src/scripts/<Name>Script.js module or by calling registerScript(name, converter).

const LatinScript = {
    name: 'Latin',
    toLatin: (text) => text || '',
    toLatinWithMap: (text) => {
        const str = text || '';
        const spanMap = new Array(str.length);
        for (let i = 0; i < str.length; i++) {
            spanMap[i] = { start: i, end: i + 1 };
        }
        return { text: str, spanMap };
    },
    fromLatin: (text) => text || '',
};

const scriptRegistry = new Map([['Latin', LatinScript]]);

function buildFallbackSpanMap(originalText, convertedText) {
    const orig = originalText || '';
    const conv = convertedText || '';
    const spanMap = new Array(conv.length);
    for (let i = 0; i < conv.length; i++) {
        const pos = Math.min(i, Math.max(0, orig.length - 1));
        spanMap[i] = orig.length > 0 ? { start: pos, end: pos + 1 } : { start: 0, end: 0 };
    }
    return spanMap;
}

export function normalizeScriptConverter(name, converter) {
    const toLatin = converter.toLatin || ((text) => text || '');
    const fromLatin = converter.fromLatin || ((text) => text || '');
    const toLatinWithMap =
        converter.toLatinWithMap ||
        ((text) => {
            const converted = toLatin(text);
            return {
                text: converted,
                spanMap: buildFallbackSpanMap(text, converted),
            };
        });

    return {
        name: converter.name || name,
        toLatin,
        toLatinWithMap,
        fromLatin,
    };
}

export function registerScript(name, converter) {
    if (!name || !converter) {
        throw new Error('registerScript requires a script name and converter object');
    }
    const normalized = normalizeScriptConverter(name, converter);
    scriptRegistry.set(name, normalized);
    return normalized;
}

// Auto-discover *Script.js modules in src/scripts/
const scriptModules = import.meta.glob('./*Script.js', { eager: true });
for (const [path, mod] of Object.entries(scriptModules)) {
    const converter = mod.default || mod;
    const derivedName = path.split('/').pop().replace(/Script\.js$/, '');
    const name = mod.scriptName || converter?.name || derivedName;
    if (name && converter) {
        registerScript(name, converter);
    }
}

export function hasScript(name) {
    return scriptRegistry.has(name);
}

export function getRegisteredScripts() {
    return Array.from(scriptRegistry.keys());
}

export function getScript(name = 'Latin') {
    if (!name || !scriptRegistry.has(name)) {
        return LatinScript;
    }
    return scriptRegistry.get(name);
}

export function toLatin(text, scriptName = 'Latin', options) {
    return getScript(scriptName).toLatin(text, options);
}

export function toLatinWithMap(text, scriptName = 'Latin', options) {
    return getScript(scriptName).toLatinWithMap(text, options);
}

export function fromLatin(text, scriptName = 'Latin', options) {
    return getScript(scriptName).fromLatin(text, options);
}
