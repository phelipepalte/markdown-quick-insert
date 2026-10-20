import { expect, it } from 'vitest';
import { dictionary, templates } from '../src/templates';
import { boundBlock, formatSelection, supportsSelection } from '../src/selection';
const items = templates(dictionary('en', ''));
const item = (id: string) => items.find(entry => entry.id === id)!;
it('quotes all selected lines, including paragraph separators', () => {
  expect(formatSelection(item('quote'), 'First\n\nSecond').text).toBe('> First\n>\n> Second');
});
it('does not create an extra quote line for a trailing newline', () => {
  expect(formatSelection(item('quote'), 'First\n').text).toBe('> First\n');
});
it.each([['bullet', '- One\n- Two'], ['numbered', '1. One\n2. Two'], ['checklist', '- [ ] One\n- [ ] Two'], ['completed', '- [x] One\n- [x] Two']])('formats selected lines as %s', (id, expected) => {
  expect(formatSelection(item(id), 'One\nTwo').text).toBe(expected);
});
it('changes heading levels without duplicating heading markers', () => {
  expect(formatSelection(item('h3'), '# One\nTwo').text).toBe('### One\n### Two');
});
it('preserves literal placeholder markers in selected callout content', () => {
  const result = formatSelection(item('callout'), '{{literal}}\nNext', { calloutType: 'warning', fold: '-', title: 'Title' });
  expect(result.text).toBe('> [!warning]- Title\n> {{literal}}\n> Next');
  expect(result.text.slice(result.selection.start, result.selection.end)).toBe('Title');
});
it('uses longer fences around selected fenced code', () => {
  const selected = '```js\nhello\n```';
  const result = formatSelection(item('code'), selected, { language: 'markdown' });
  expect(result.text).toBe('````markdown\n```js\nhello\n```\n````');
  expect(result.text.slice(result.selection.start, result.selection.end)).toBe(selected);
});
it('escapes selected link labels and selects the URL for editing', () => {
  const result = formatSelection(item('link'), 'Text [label]');
  expect(result.text).toBe('[Text \\[label\\]](https://example.com)');
  expect(result.text.slice(result.selection.start, result.selection.end)).toBe('https://example.com');
});
it('only offers formats that preserve a selection', () => {
  for (const id of ['table', 'image', 'separator', 'footnote', 'tag', 'flowchart']) expect(supportsSelection(item(id), 'text')).toBe(false);
  for (const id of ['quote', 'h1', 'code', 'callout', 'alias', 'bold']) expect(supportsSelection(item(id), 'text')).toBe(true);
  expect(supportsSelection(item('inline-code'), 'two\nlines')).toBe(false);
  expect(supportsSelection(item('comment'), 'text %% end')).toBe(false);
  expect(items.every(entry => supportsSelection(entry, ''))).toBe(true);
});
it('preserves selection offsets when adding block boundaries', () => {
  const result = boundBlock(formatSelection(item('quote'), 'text'), 'before', 'after');
  expect(result.text).toBe('\n\n> text\n\n');
  expect(result.text.slice(result.selection.start, result.selection.end)).toBe('> text');
});
