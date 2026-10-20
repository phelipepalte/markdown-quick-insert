import { expand, normalize, Template } from './templates';

export const calloutTypes = ['note', 'abstract', 'info', 'todo', 'tip', 'success', 'question', 'warning', 'failure', 'danger', 'bug', 'example', 'quote'];
export const codeLanguages = ['text', 'javascript', 'typescript', 'python', 'java', 'kotlin', 'json', 'yaml', 'html', 'css', 'bash', 'powershell', 'sql', 'markdown', 'mermaid'];
const mediaExtensions: Record<string, string[]> = {
  image: ['avif', 'bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'],
  audio: ['flac', 'm4a', 'mp3', 'ogg', 'wav', '3gp'],
  video: ['mkv', 'mov', 'mp4', 'ogv', 'webm'], pdf: ['pdf'], canvas: ['canvas']
};
export function matchesMedia(kind: string, extension: string) { return mediaExtensions[kind]?.includes(extension.toLowerCase()) ?? false; }
export interface Choice { label: string; detail?: string; value: string; alias?: string }
export function searchChoices(items: Choice[], query: string) {
  const terms = normalize(query).trim().split(/\s+/);
  return items.filter(item => terms.every(term => normalize(`${item.label} ${item.detail ?? ''}`).includes(term)));
}
export function nextIdentifier(document: string, prefix: string) {
  let index = 1;
  while (document.includes(`${prefix}${index}`)) index++;
  return `${prefix}${index}`;
}
export function buildTable(columns: number, rows: number, alignment: string, header: string, cell: string) {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || columns > 12 || rows < 1 || rows > 50) throw new Error('Invalid table dimensions');
  const line = (values: string[]) => `| ${values.join(' | ')} |`;
  const align = alignment === 'center' ? ':---:' : alignment === 'right' ? '---:' : ':---';
  return [line(Array.from({ length: columns }, (_, i) => `{{${header} ${i + 1}}}`)), line(Array.from({ length: columns }, () => align)),
    ...Array.from({ length: rows }, (_, r) => line(Array.from({ length: columns }, (_, c) => `{{${cell} ${r + 1}.${c + 1}}}`)))].join('\n');
}
export function literal(text: string) { return { text, selection: { start: text.length, end: text.length } }; }
export function wrapSelection(item: Template, selected: string) {
  if (!item.wrap || !selected) return expand(item.source);
  let marker = item.wrap;
  let padding = '';
  if (item.id === 'inline-code') {
    const longest = Math.max(0, ...(selected.match(/`+/g) ?? []).map(run => run.length));
    marker = '`'.repeat(longest + 1);
    if (/^`|`$/.test(selected)) padding = ' ';
  }
  const start = marker.length + padding.length;
  return { text: marker + padding + selected + padding + marker, selection: { start, end: start + selected.length } };
}
