import { beforeEach, expect, it, vi } from 'vitest';
import Plugin from '../src/main';
import { ChoiceModal } from '../src/choices';
import { modals, notices, TFile } from './obsidian-mock';

let plugin: Plugin, app: any, editor: any, files: TFile[], caches: Record<string, any>, view: any;
beforeEach(async () => {
  document.body.replaceChildren(); modals.length = 0; notices.length = 0;
  files = [new TFile('Current.md'), new TFile('Study/Note.md'), new TFile('Other/Note.md'), new TFile('Assets/picture.png'), new TFile('Assets/manual.pdf')];
  caches = { 'Study/Note.md': { frontmatter: { aliases: ['Reference'], tags: ['study/topic'] }, headings: [{ heading: 'Overview', level: 2 }], blocks: { example: { id: 'example' } }, tags: [{ tag: '#study' }] } };
  editor = {
    text: 'Before after', start: 7, end: 7,
    getValue() { return this.text; },
    getCursor(which: string) { return this.offsetToPos(which === 'from' || which === 'anchor' ? this.start : this.end); },
    listSelections() { return [{ anchor: this.offsetToPos(this.start), head: this.offsetToPos(this.end) }]; },
    hasFocus() { return true; },
    offsetToPos(offset: number) { const lines = this.text.slice(0, offset).split('\n'); return { line: lines.length - 1, ch: lines.at(-1)!.length }; },
    posToOffset(pos: { line: number; ch: number }) { return this.text.split('\n').slice(0, pos.line).reduce((sum: number, line: string) => sum + line.length + 1, 0) + pos.ch; },
    replaceRange(text: string, from: any, to = from) { const start = this.posToOffset(from), end = this.posToOffset(to); this.text = this.text.slice(0, start) + text + this.text.slice(end); },
    transaction(change: any) { const changes = change.changes.map((item: any, index: number) => ({ start: this.posToOffset(item.from), end: this.posToOffset(item.to ?? item.from), text: item.text, index })); changes.sort((a: any, b: any) => b.start - a.start || b.index - a.index); for (const item of changes) this.text = this.text.slice(0, item.start) + item.text + this.text.slice(item.end); },
    focus: vi.fn(),
    setSelection(from: any, to: any) { this.start = this.posToOffset(from); this.end = this.posToOffset(to); }
  };
  view = { editor, file: files[0] };
  app = {
    workspace: { getActiveViewOfType: () => view },
    vault: { getMarkdownFiles: () => files.filter(file => file.extension === 'md'), getFiles: () => files, getAbstractFileByPath: (path: string) => files.find(file => file.path === path) },
    metadataCache: { getFileCache: (file: TFile) => caches[file.path] },
    fileManager: { generateMarkdownLink: vi.fn((file: TFile, _source: string, subpath = '', alias?: string) => `[[${file.path.replace(/\.md$/, '')}${subpath}${alias ? '|' + alias : ''}]]`) }
  };
  plugin = new (Plugin as any)(app);
  await plugin.onload();
});
function open(label: string) {
  (plugin as any).commands[0].editorCallback(editor, view);
  const button = [...document.querySelectorAll('button')].find(el => el.querySelector('strong')?.textContent === label);
  expect(button).toBeTruthy(); button!.click();
}
function choose(query: string) {
  const modal = modals.at(-1) as unknown as ChoiceModal;
  const choices = modal.getSuggestions(query);
  expect(choices.length).toBeGreaterThan(0);
  modal.close(); modal.onChooseSuggestion(choices[0]);
}
function submit() { [...document.querySelectorAll('button')].find(el => el.textContent === 'Insert')!.click(); }
it('registers the default shortcut and inserts a note found by alias', () => {
  expect((plugin as any).commands[0].hotkeys).toEqual([{ modifiers: ['Mod'], key: '.' }]);
  open('Note reference'); choose('reference');
  expect(editor.text).toBe('Before [[Study/Note|Reference]]after');
  expect(app.fileManager.generateMarkdownLink).toHaveBeenCalledWith(files[1], 'Current.md', '', 'Reference');
});
it('distinguishes duplicate names by folder path', () => {
  open('Note reference'); choose('Other/Note'); expect(editor.text).toContain('[[Other/Note]]');
});
it('selects headings in two steps', () => {
  open('Heading reference'); choose('Study/Note'); choose('overview'); expect(editor.text).toContain('[[Study/Note#Overview]]');
});
it('embeds only an existing block without changing its target note', () => {
  open('Embed block'); choose('Study/Note'); choose('example'); expect(editor.text).toContain('![[Study/Note#^example]]');
  expect(Object.keys(caches['Study/Note.md'].blocks)).toEqual(['example']);
});
it('does not insert on empty block cache or cancellation', () => {
  open('Block reference'); choose('Current'); expect(notices.at(-1)).toContain('No items'); expect(editor.text).toBe('Before after');
  open('Note reference'); modals.at(-1)!.close(); expect(editor.text).toBe('Before after');
});
it('rejects edits made during note selection', () => {
  open('Note reference'); editor.text += '!'; choose('Study/Note'); expect(editor.text).toBe('Before after!'); expect(notices.at(-1)).toContain('changed');
});
it('rejects a deleted target and changed active source', () => {
  open('Heading reference'); choose('Study/Note'); files.splice(1, 1); choose('overview'); expect(editor.text).toBe('Before after'); expect(notices.at(-1)).toContain('no longer exists');
});
it('rejects a removed heading', () => {
  open('Heading reference'); choose('Study/Note'); caches['Study/Note.md'].headings = []; choose('overview'); expect(editor.text).toBe('Before after');
});
it('rejects switching the source note during selection', () => {
  open('Note reference'); view = { editor: {}, file: files[2] }; choose('Study/Note'); expect(editor.text).toBe('Before after');
});
it('offers only matching media and allows width or PDF page options', () => {
  open('Embed image'); expect((modals.at(-1) as any).getSuggestions('').map((item: any) => item.value)).toEqual(['Assets/picture.png']);
  choose('picture'); const input = document.querySelector('input')!; input.value = '320'; input.dispatchEvent(new Event('change')); submit();
  expect(editor.text).toContain('![[Assets/picture.png|320]]');
});
it('inserts tags collected from metadata with word boundaries', () => {
  open('Existing tag'); choose('study/topic'); expect(editor.text).toBe('Before #study/topic after');
});
it('wraps selected text instead of replacing it with an example', () => {
  editor.start = 0; editor.end = 6; open('Bold'); expect(editor.text).toBe('**Before** after'); expect(editor.text.slice(editor.start, editor.end)).toBe('Before');
});
it('creates a footnote definition at the end and selects its content', () => {
  open('Footnote'); expect(editor.text).toBe('Before [^mqi-1]after\n\n[^mqi-1]: Text'); expect(editor.text.slice(editor.start, editor.end)).toBe('Text');
});
it('handles a footnote at EOF without overlapping changes', () => {
  editor.start = editor.end = editor.text.length; open('Footnote'); expect(editor.text).toBe('Before after[^mqi-1]\n\n[^mqi-1]: Text');
});
it('builds a configured table and selects its first header', () => {
  open('Table'); submit(); expect(editor.text).toContain('| Header 1 | Header 2 |'); expect(editor.text.slice(editor.start, editor.end)).toBe('Header 1');
});
it('keeps footnote definitions separate after inserting at an EOF with blank lines', () => {
  editor.text = 'Note\n\n'; editor.start = editor.end = editor.text.length;
  open('Footnote'); expect(editor.text).toBe('Note\n\n[^mqi-1]\n\n[^mqi-1]: Text');
});
it('inserts chosen collapsible callouts', () => {
  open('Callout'); choose('warning'); const select = document.querySelector('select')!; select.value = '-'; select.dispatchEvent(new Event('change')); submit(); expect(editor.text).toContain('> [!warning]- Title');
});
it('keeps generated links literal when note names contain template delimiters', () => {
  files.push(new TFile('Study/{{literal}}.md')); open('Note reference'); choose('literal'); expect(editor.text).toContain('[[Study/{{literal}}]]');
});
it('shows compatible selection formats with previews of the actual selected text', () => {
  editor.start = 0; editor.end = 6;
  (plugin as any).commands[0].editorCallback(editor, view);
  expect(document.querySelector('[aria-label="Format selected text"]')).toBeTruthy();
  const cards = [...document.querySelectorAll('button')];
  const quote = cards.find(el => el.querySelector('strong')?.textContent === 'Quote')!;
  expect(quote.querySelector('code')!.textContent).toBe('> Before');
  expect(cards.some(el => el.querySelector('strong')?.textContent === 'Table')).toBe(false);
  expect(cards.some(el => el.querySelector('strong')?.textContent === 'Embed image')).toBe(false);
  quote.click(); expect(editor.text).toBe('> Before\n\n after');
});
it('converts multiline selections to quotes without replacing their contents', () => {
  editor.text = 'One\n\n{{Two}}'; editor.start = 0; editor.end = editor.text.length;
  open('Quote'); expect(editor.text).toBe('> One\n>\n> {{Two}}');
});
it('preserves selected text through the callout configuration steps', () => {
  editor.start = 0; editor.end = 6;
  open('Callout'); choose('warning'); submit();
  expect(editor.text).toBe('> [!warning] Title\n> Before\n\n after');
});
it('preserves selected code through language selection', () => {
  editor.start = 0; editor.end = 6;
  open('Code block'); choose('typescript');
  expect(editor.text).toBe('```typescript\nBefore\n```\n\n after');
});
it('does not change selected text when cancelling the picker', () => {
  editor.start = 0; editor.end = 6;
  (plugin as any).commands[0].editorCallback(editor, view);
  modals.at(-1)!.close(); expect(editor.text).toBe('Before after');
  expect(editor.start).toBe(0); expect(editor.end).toBe(6);
});
it('retains the selection when shortcut dispatch collapses it before the command callback', () => {
  editor.start = 0; editor.end = 6;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true }));
  editor.start = editor.end = 6;
  open('Quote'); expect(editor.text).toBe('> Before\n\n after');
});
it('recognizes backwards selections', () => {
  editor.start = 6; editor.end = 0;
  open('Quote'); expect(editor.text).toBe('> Before\n\n after');
});

it('supports bounded native table spinners and manual dimensions excluding the header', () => {
  open('Table');
  const [columns, rows] = [...document.querySelectorAll('input')];
  expect([columns.type, columns.min, columns.max, columns.step]).toEqual(['number', '1', '12', '1']);
  expect([rows.type, rows.min, rows.max, rows.step]).toEqual(['number', '1', '50', '1']);
  expect(rows.getAttribute('aria-label')).toBe('Example rows (excluding header)');
  columns.value = '3'; columns.dispatchEvent(new Event('change'));
  rows.value = '4'; rows.dispatchEvent(new Event('change'));
  submit();
  const lines = editor.text.split('\n').filter((line: string) => line.startsWith('|'));
  expect(lines).toHaveLength(6);
  expect(lines[0]).toBe('| Header 1 | Header 2 | Header 3 |');
});
it.each([['0', '2'], ['13', '2'], ['2', '0'], ['2', '51'], ['1.5', '2'], ['', '2']])('rejects invalid manual table dimensions %s x %s', (c, r) => {
  open('Table');
  const [columns, rows] = [...document.querySelectorAll('input')];
  columns.value = c; columns.dispatchEvent(new Event('change'));
  rows.value = r; rows.dispatchEvent(new Event('change'));
  submit();
  expect(editor.text).toBe('Before after');
  expect(notices.at(-1)).toBe('Use 1–12 columns and 1–50 rows.');
  expect(document.querySelector('input')).toBeTruthy();
});

it('uses native number inputs without extra tab stops', () => {
  open('Table');
  const inputs = [...document.querySelectorAll('input')];
  expect(inputs).toHaveLength(2);
  expect(inputs.every(input => input.type === 'number' && input.tabIndex === 0)).toBe(true);
  expect(document.querySelector('.mqi-number-arrows')).toBeNull();
  expect([...document.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Cancel', 'Insert']);
});

it('submits the current table alignment with Enter without opening its list', () => {
  open('Table');
  const select = document.querySelector('select')!;
  select.value = 'center';
  const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  select.dispatchEvent(enter);
  expect(enter.defaultPrevented).toBe(true);
  expect(editor.text).toContain('| :---: | :---: |');
  expect(document.querySelector('select')).toBeNull();
});
it('retains validation when submitting table alignment with Enter', () => {
  open('Table');
  const input = document.querySelector('input')!;
  input.value = '13'; input.dispatchEvent(new Event('change'));
  document.querySelector('select')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(editor.text).toBe('Before after');
  expect(notices.at(-1)).toBe('Use 1–12 columns and 1–50 rows.');
  expect(document.querySelector('select')).toBeTruthy();
});

it.each([0, 1, 2])('submits current table values with Enter from field %s', index => {
  open('Table');
  const controls = [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')];
  controls[0].value = '3';
  controls[1].value = '4';
  controls[2].value = 'right';
  const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  controls[index].dispatchEvent(enter);
  expect(enter.defaultPrevented).toBe(true);
  const lines = editor.text.split('\n').filter((line: string) => line.startsWith('|'));
  expect(lines).toHaveLength(6);
  expect(lines[1]).toBe('| ---: | ---: | ---: |');
  expect(document.querySelector('select')).toBeNull();
});
it.each([0, 1])('validates table dimensions on Enter from numeric field %s', index => {
  open('Table');
  const inputs = [...document.querySelectorAll('input')];
  inputs[index].value = '0';
  inputs[index].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(editor.text).toBe('Before after');
  expect(notices.at(-1)).toBe('Use 1\u201312 columns and 1\u201350 rows.');
  expect(document.querySelector('input')).toBeTruthy();
});
