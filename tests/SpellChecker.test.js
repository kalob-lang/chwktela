/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SpellChecker } from '../src/spell/SpellChecker.js';

describe('SpellChecker', () => {
    let checker;

    beforeEach(() => {
        localStorage.clear();
        checker = new SpellChecker();
    });

    it('validates valid Kalob words, compounds, numbers, capitalized words, and citations', () => {
        const text = 'Me ibi cephwn senusvbhu Jake badcite {{cite:1,2}}.';
        const errors = checker.checkText(text);
        expect(errors).toHaveLength(1);
        expect(errors[0].segment).toBe('badcite');
        expect(errors[0].from).toBe(text.indexOf('badcite'));
        expect(errors[0].to).toBe(text.indexOf('badcite') + 'badcite'.length);
    });

    it('checks compound words at the segment level when whole word fails', () => {
        const text = 'senufook fookusen asenufook usenufook fookubad';
        const errors = checker.checkText(text);
        expect(errors.map((e) => e.segment)).toEqual([
            'fook',
            'fook',
            'fook',
            'fook',
            'fook',
            'bad',
        ]);
        expect(errors[0]).toMatchObject({
            word: 'senufook',
            segment: 'fook',
            from: 4,
            to: 8,
        });
        expect(errors[1]).toMatchObject({
            word: 'fookusen',
            segment: 'fook',
            from: 9,
            to: 13,
        });
    });

    it('persists ignore_words and add_words in localStorage as newline-separated lists', () => {
        checker.saveIgnoreWordsText('foo\n  bar  \n\n');
        expect(localStorage.getItem('ignore_words')).toBe('foo\nbar');
        expect(checker.checkText('foo bar baz').map((e) => e.segment)).toEqual(['baz']);

        checker.addIgnoreWord('baz');
        expect(localStorage.getItem('ignore_words')).toBe('foo\nbar\nbaz');
        expect(checker.checkText('foo bar baz')).toHaveLength(0);

        checker.saveAddWordsText('mykalob\nkalobnew');
        expect(localStorage.getItem('add_words')).toBe('mykalob\nkalobnew');
        expect(checker.checkText('mykalob kalobnew')).toHaveLength(0);
        // Added words appear in corrections
        const corrections = checker.getCorrections('mykalo');
        expect(corrections.some((c) => c.word === 'mykalob')).toBe(true);
        // Ignored words do NOT pollute corrections
        expect(checker.getCorrections('fo').some((c) => c.word === 'foo')).toBe(false);
    });

    it('provides valid corrections for segments and empty array when none match', () => {
        const corrections = checker.getCorrections('plon');
        expect(corrections.some((c) => c.word === 'plong')).toBe(true);

        const prefixedCorrections = checker.getCorrections('aplon');
        expect(prefixedCorrections.some((c) => c.word === 'aplong')).toBe(true);

        expect(checker.getCorrections('zzzzqqqqxxxx')).toEqual([]);
    });

    it('tracks errors across all parts in the book in grid order', () => {
        const mockBookManager = {
            getAllParts: () => ({
                '0,0': { name: 'Main', content: 'me badone' },
                '1,0': { name: 'Right', content: 'senufook' },
                '0,1': { name: 'Top', content: 'topbad' },
            }),
        };

        const report = checker.checkBook(mockBookManager);
        expect(report.totalErrors).toBe(3);
        expect(report.byPart.get('0,0')).toHaveLength(1);
        expect(report.byPart.get('1,0')).toHaveLength(1);
        expect(report.byPart.get('0,1')).toHaveLength(1);
        expect(report.allErrors.map((e) => `${e.partKey}:${e.segment}`)).toEqual([
            '0,1:topbad',
            '0,0:badone',
            '1,0:fook',
        ]);
    });
});
