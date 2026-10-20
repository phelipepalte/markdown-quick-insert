import { Template } from './templates';
import { wrapSelection } from './automation';

export interface SelectionOptions { language?: string; calloutType?: string; fold?: string; title?: string }
export interface Prepared { text: string; selection: { start: number; end: number } }
const supported = new Set(['quote', 'nested-quote', 'bullet', 'numbered', 'checklist', 'completed', 'code', 'callout', 'link', 'alias', 'inline-footnote', 'block-comment', 'html-comment', 'math-block', 'escaped']);
export function supportsSelection(item: Template, selected: string) {
  if (!selected) return true;
  // Inline math, code, and comments cannot safely span Markdown paragraphs.
  if (item.inline && /[\r\n]/.test(selected) && !['link', 'alias', 'inline-footnote', 'escaped'].includes(item.id)) return false;
  if (item.id === 'comment' && selected.includes('%%')) return false;
  if (item.id === 'block-comment' && selected.includes('%%')) return false;
  if (item.id === 'html-comment' && selected.includes('-->')) return false;
  return !!item.wrap || /^h[1-6]$/.test(item.id) || supported.has(item.id);
}
export function formatSelection(item: Template, selected: string, options: SelectionOptions = {}): Prepared {
  if (!supportsSelection(item, selected)) throw new Error('Unsupported selection formatting');
  if (item.wrap) return wrapSelection(item, selected);
  const all = (text: string): Prepared => ({ text, selection: { start: 0, end: text.length } });
  const lines = selected.replace(/\r\n/g, '\n').split('\n');
  const prefixLines = (prefix: (line: string, index: number) => string) => {
    let index = 0;
    return lines.map((line, position) => {
      // A selection ending at the beginning of the next line must not create an extra item.
      if (!line && position === lines.length - 1) return '';
      return prefix(line, line.trim() ? index++ : index);
    }).join('\n');
  };
  if (/^h[1-6]$/.test(item.id)) return all(prefixLines(line => line.trim() ? '#'.repeat(Number(item.id[1])) + ' ' + line.replace(/^#{1,6}\s+/, '') : line));
  if (item.id === 'quote' || item.id === 'nested-quote') return all(prefixLines(line => (item.id === 'quote' ? '>' : '> >') + (line ? ' ' + line : '')));
  if (['bullet', 'numbered', 'checklist', 'completed'].includes(item.id)) {
    return all(prefixLines((line, index) => line.trim() ? ({ bullet: '- ', numbered: `${index + 1}. `, checklist: '- [ ] ', completed: '- [x] ' }[item.id] ?? '') + line : line));
  }
  if (item.id === 'code') {
    const longest = Math.max(2, ...(selected.match(/`+/g) ?? []).map(run => run.length));
    const fence = '`'.repeat(longest + 1);
    const prefix = fence + (options.language ?? 'text') + '\n';
    return { text: prefix + selected + (selected.endsWith('\n') ? '' : '\n') + fence, selection: { start: prefix.length, end: prefix.length + selected.length } };
  }
  if (item.id === 'callout') {
    const title = options.title ?? 'Title';
    const prefix = `> [!${options.calloutType ?? 'note'}]${options.fold ?? ''} `;
    const body = prefixLines(line => '>' + (line ? ' ' + line : ''));
    return { text: prefix + title + '\n' + body, selection: { start: prefix.length, end: prefix.length + title.length } };
  }
  if (item.id === 'link') {
    const label = selected.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\r?\n/g, ' ');
    const prefix = `[${label}](`, url = 'https://example.com';
    return { text: prefix + url + ')', selection: { start: prefix.length, end: prefix.length + url.length } };
  }
  if (item.id === 'inline-footnote') return all(`^[${selected}]`);
  if (item.id === 'block-comment') return all(`%%\n${selected}\n%%`);
  if (item.id === 'html-comment') return all(`<!-- ${selected} -->`);
  if (item.id === 'math-block') return all(`$$\n${selected}\n$$`);
  if (item.id === 'escaped') return all(selected.replace(/[\\`*_{}\[\]()#+.!|>~=-]/g, '\\$&'));
  throw new Error('Selection formatting requires a target');
}
export function boundBlock(result: Prepared, before: string, after: string): Prepared {
  const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
  const suffix = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : '';
  return { text: prefix + result.text + suffix, selection: { start: prefix.length + result.selection.start, end: prefix.length + result.selection.end } };
}
