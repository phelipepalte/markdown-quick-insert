import en from './i18n/en';
import pt from './i18n/pt-BR';
export type Language = 'auto' | 'en' | 'pt-BR';
export function dictionary(preference: Language, detected: string) {
  return (preference === 'pt-BR' || (preference === 'auto' && detected.toLowerCase().replace('_', '-') === 'pt-br')) ? pt : en;
}
export function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
export type Category = 'textCategory' | 'structureCategory' | 'referenceCategory' | 'mediaCategory' | 'advancedCategory';
export interface Template { id: string; label: string; source: string; keywords: string; category?: Category; inline?: boolean; wrap?: string }
export function templates(t: typeof en): Template[] {
  const entry = (id: string, label: string, source: string, keywords = '') => ({ id, label, source, keywords });
  const basic: Template[] = [
    ...Array.from({ length: 6 }, (_, i) => entry(`h${i + 1}`, `${t.heading} H${i + 1}`, `${'#'.repeat(i + 1)} {{${t.headingText}}}`, 'heading title titulo')),
    entry('table', t.table, `| {{${t.header} 1}} | {{${t.header} 2}} |\n| --- | --- |\n| {{${t.cell} 1}} | {{${t.cell} 2}} |\n| {{${t.cell} 3}} | {{${t.cell} 4}} |`, 'table tabela'),
    entry('bullet', t.bullet, `- {{${t.item} 1}}\n- {{${t.item} 2}}`, 'list lista'),
    entry('numbered', t.numbered, `1. {{${t.item} 1}}\n2. {{${t.item} 2}}`, 'list lista'),
    entry('checklist', t.checklist, `- [ ] {{${t.task} 1}}\n- [ ] {{${t.task} 2}}`, 'task todo tarefa'),
    entry('quote', t.quote, `> {{${t.quoteText}}}`, 'quote citacao'),
    entry('code', t.code, '```{{language}}\n{{' + t.codeText + '}}\n```', 'code codigo'),
    entry('link', t.link, `[{{${t.linkText}}}](https://example.com)`, 'url link'),
    entry('callout', t.callout, `> [!note] {{${t.calloutTitle}}}\n> {{${t.calloutText}}}`, 'note aviso'),
    entry('separator', t.separator, '---', 'horizontal rule separador')
  ];
  basic.forEach(item => { item.category = 'structureCategory'; });
  basic.find(item => item.id === 'link')!.inline = true;
  basic.find(item => item.id === 'link')!.category = 'referenceCategory';
  const extra = (id: string, label: string, source: string, category: Category, inline = false, wrap?: string): Template => ({ id, label, source, category, inline, wrap, keywords: id });
  return [...basic,
    ...([['bold', t.bold, '**'], ['italic', t.italic, '*'], ['bold-italic', t.boldItalic, '***'], ['strike', t.strike, '~~'], ['highlight', t.highlight, '=='], ['inline-code', t.inlineCode, '`']] as const)
      .map(([id, label, marker]) => extra(id, label, `${marker}{{${t.text}}}${marker}`, 'textCategory', true, marker)),
    extra('nested-list', t.nestedList, `- {{${t.item} 1}}\n  - {{${t.item} 2}}`, 'structureCategory'),
    extra('nested-task', t.nestedTask, `- [ ] {{${t.task} 1}}\n  - [ ] {{${t.task} 2}}`, 'structureCategory'),
    extra('completed', t.completed, `- [x] {{${t.task}}}`, 'structureCategory'),
    extra('nested-quote', t.nestedQuote, `> {{${t.quoteText}}}\n>\n> > {{${t.quoteText}}}`, 'structureCategory'),
    ...(['note', 'alias', 'headingLink', 'blockLink', 'blockId', 'tag'] as const).map(id => extra(id, t[id], '', 'referenceCategory', true)),
    ...(['embedNote', 'embedHeading', 'embedBlock', 'image', 'audio', 'video', 'pdf', 'canvas'] as const).map(id => extra(id, t[id], '', 'mediaCategory')),
    extra('image-url', t.imageUrl, `![{{${t.text}}}](https://example.com/image.png)`, 'mediaCategory'),
    extra('footnote', t.footnote, '', 'referenceCategory', true),
    extra('inline-footnote', t.inlineFootnote, `^[{{${t.text}}}]`, 'referenceCategory', true),
    extra('comment', t.comment, `%%{{${t.text}}}%%`, 'textCategory', true, '%%'),
    extra('block-comment', t.blockComment, `%%\n{{${t.text}}}\n%%`, 'advancedCategory'),
    extra('html-comment', t.htmlComment, `<!-- {{${t.text}}} -->`, 'advancedCategory', true),
    extra('math', t.math, '${{x^2 + y^2 = z^2}}$', 'advancedCategory', true, '$'),
    extra('math-block', t.mathBlock, '$$\n{{x^2 + y^2 = z^2}}\n$$', 'advancedCategory'),
    extra('flowchart', t.flowchart, '```mermaid\nflowchart TD\n    A[{{' + t.startText + '}}] --> B[{{' + t.endText + '}}]\n```', 'advancedCategory'),
    extra('sequence', t.sequence, '```mermaid\nsequenceDiagram\n    Alice->>Bob: {{' + t.greeting + '}}\n    Bob-->>Alice: {{' + t.reply + '}}\n```', 'advancedCategory'),
    extra('html-details', t.htmlDetails, `<details>\n<summary>{{${t.calloutTitle}}}</summary>\n{{${t.text}}}\n</details>`, 'advancedCategory'),
    extra('line-break', t.lineBreak, '  \n', 'textCategory', true),
    extra('escaped', t.escaped, '\\*{{' + t.text + '}}\\*', 'textCategory', true)
  ];
}
export function filterTemplates(items: Template[], query: string) {
  const words = normalize(query).trim().split(/\s+/);
  return items.filter(item => words.every(word => normalize(`${item.id} ${item.label} ${item.keywords}`).includes(word)));
}
export function expand(source: string) {
  let text = '', end = 0;
  let selection: { start: number; end: number } | undefined;
  for (const match of source.matchAll(/\{\{([^{}]+)\}\}/g)) {
    text += source.slice(end, match.index);
    const start = text.length;
    text += match[1];
    selection ??= { start, end: text.length };
    end = match.index! + match[0].length;
  }
  text += source.slice(end);
  return { text, selection: selection ?? { start: text.length, end: text.length } };
}
export function prepareInsertion(source: string, before: string, after: string) {
  const result = expand(source);
  const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
  const suffix = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : '';
  return { text: prefix + result.text + suffix, selection: { start: prefix.length + result.selection.start, end: prefix.length + result.selection.end } };
}
