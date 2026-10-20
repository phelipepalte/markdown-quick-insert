import { describe, it, expect } from 'vitest';
import { dictionary, templates, expand, prepareInsertion, filterTemplates } from '../src/templates';
describe('language resolution', () => {
  it.each(['en', 'pt', 'pt-PT', 'fr', '', 'de'])('uses English for %s', language => expect(dictionary('auto', language).table).toBe('Table'));
  it.each(['pt-BR', 'pt-br', 'pt_BR'])('detects Brazilian Portuguese %s', language => expect(dictionary('auto', language).table).toBe('Tabela'));
  it('honors manual preferences', () => { expect(dictionary('en', 'pt-BR').table).toBe('Table'); expect(dictionary('pt-BR', 'fr').table).toBe('Tabela'); });
});
describe('templates', () => {
  it.each(['en', 'pt-BR'] as const)('expands all %s templates and selects the first placeholder', language => {
    const items = templates(dictionary(language, ''));
    expect(items.length).toBeGreaterThan(45);
    expect(new Set(items.map(item => item.id)).size).toBe(items.length);
    for (const item of items) {
      const result = expand(item.source);
      expect(result.text).not.toContain('{{');
      if (item.source.includes('{{')) expect(result.text.slice(result.selection.start, result.selection.end)).toBe(item.source.match(/\{\{([^{}]+)\}\}/)![1]);
      expect(item.category).toBeTruthy();
    }
  });
  it('provides six heading levels and a valid sample table', () => {
    const items = templates(dictionary('en', ''));
    for (let level = 1; level <= 6; level++) expect(items[level - 1].source.startsWith('#'.repeat(level) + ' ')).toBe(true);
    expect(expand(items[6].source).text.split('\n')).toHaveLength(4);
  });
  it('searches accents, aliases, case and multiple words', () => {
    const items = templates(dictionary('pt-BR', ''));
    expect(filterTemplates(items, 'CITACAO').map(i => i.id)).toEqual(['quote', 'nested-quote']);
    expect(filterTemplates(items, 'heading h3').map(i => i.id)).toEqual(['h3']);
    expect(filterTemplates(items, 'unmatched')).toEqual([]);
    expect(filterTemplates(items, '  ')).toHaveLength(items.length);
  });
  it.each([['abc', 'def', '\n\n'], ['abc\n', '\ndef', '\n'], ['abc\n\n', '\n\ndef', ''], ['', '', '']])('keeps block boundaries for %j', (before, after, prefix) => {
    const result = prepareInsertion('# {{Title}}', before, after);
    expect(result.text.startsWith(prefix + '# Title')).toBe(true);
    expect(result.text.slice(result.selection.start, result.selection.end)).toBe('Title');
  });
  it('places the cursor after templates without placeholders', () => expect(expand('---').selection).toEqual({ start: 3, end: 3 }));
});

it('clarifies that example rows exclude the header in both languages', () => {
  expect(dictionary('en', 'fr').rows).toBe('Example rows (excluding header)');
  expect(dictionary('pt-BR', 'en').rows).toBe('Linhas de exemplo (além do cabeçalho)');
});
