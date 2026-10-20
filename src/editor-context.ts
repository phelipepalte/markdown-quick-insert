import type { Editor } from 'obsidian';

export interface EditorSnapshot { editor: Editor; sourcePath: string; document: string; from: number; to: number; capturedAt: number }
export function captureEditor(editor: Editor, sourcePath: string, now = Date.now()): EditorSnapshot {
  const document = editor.getValue();
  const anchor = editor.posToOffset(editor.getCursor('anchor'));
  const head = editor.posToOffset(editor.getCursor('head'));
  let from = Math.min(anchor, head), to = Math.max(anchor, head);
  if (from === to) {
    // Some host adapters expose the range through listSelections after focus changes.
    const range = editor.listSelections().find(range => editor.posToOffset(range.anchor) !== editor.posToOffset(range.head));
    if (range) {
      const start = editor.posToOffset(range.anchor), end = editor.posToOffset(range.head);
      from = Math.min(start, end); to = Math.max(start, end);
    }
  }
  return { editor, sourcePath, document, from, to, capturedAt: now };
}
export function resolveEditorSnapshot(current: EditorSnapshot, beforeCommand?: EditorSnapshot, now = Date.now()) {
  if (current.from !== current.to) return current;
  if (beforeCommand && beforeCommand.from !== beforeCommand.to && beforeCommand.editor === current.editor && beforeCommand.sourcePath === current.sourcePath && beforeCommand.document === current.document && now - beforeCommand.capturedAt >= 0 && now - beforeCommand.capturedAt < 500) return beforeCommand;
  return current;
}
