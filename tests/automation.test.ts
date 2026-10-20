import { expect, it } from 'vitest';
import { buildTable, calloutTypes, literal, matchesMedia, nextIdentifier, searchChoices, wrapSelection } from '../src/automation';
import { dictionary, templates } from '../src/templates';

it('filters attachments by type and extension', () => {
  expect(matchesMedia('image', 'PNG')).toBe(true);
  expect(matchesMedia('pdf', 'png')).toBe(false);
  expect(matchesMedia('audio', 'mp3')).toBe(true);
  expect(matchesMedia('video', 'webm')).toBe(true);
  expect(matchesMedia('canvas', 'canvas')).toBe(true);
  expect(matchesMedia('unknown', 'md')).toBe(false);
});
it('searches paths and aliases with multiple accent-insensitive terms', () => {
  const entries = [{ label: 'Referência', detail: 'Study/Notes.md', value: 'Study/Notes.md' }];
  expect(searchChoices(entries, 'referencia STUDY')).toEqual(entries);
  expect(searchChoices(entries, 'missing')).toEqual([]);
});
it('allocates unused IDs', () => {
  expect(nextIdentifier('[^mqi-1] and [^mqi-2]', 'mqi-')).toBe('mqi-3');
  expect(nextIdentifier('text ^mqi-block-1', 'mqi-block-')).toBe('mqi-block-2');
});
it('builds bounded aligned tables', () => {
  const source = buildTable(3, 4, 'center', 'Header', 'Example');
  expect(source.split('\n')).toHaveLength(6);
  expect(source.split('\n')[1]).toBe('| :---: | :---: | :---: |');
  expect(buildTable(1, 1, 'right', 'H', 'C')).toContain('| ---: |');
});
it.each([[0, 1], [13, 1], [1, 51], [1.5, 2], [2, NaN]])('rejects invalid table %s × %s', (columns, rows) => {
  expect(() => buildTable(columns, rows, 'left', 'H', 'C')).toThrow();
});
it('preserves selected text, including placeholder-like content', () => {
  const bold = templates(dictionary('en', '')).find(item => item.id === 'bold')!;
  expect(wrapSelection(bold, '{{literal}}')).toEqual({ text: '**{{literal}}**', selection: { start: 2, end: 13 } });
});
it('uses safe inline code delimiters around selected backticks', () => {
  const code = templates(dictionary('en', '')).find(item => item.id === 'inline-code')!;
  expect(wrapSelection(code, '`x`').text).toBe('`` `x` ``');
});
it('never parses generated vault links as placeholders', () => {
  expect(literal('[[{{Note}}]]').text).toBe('[[{{Note}}]]');
});
it('includes thirteen unique native callout types', () => expect(new Set(calloutTypes).size).toBe(13));
