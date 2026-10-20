import { expect, it } from 'vitest';
import type { Editor } from 'obsidian';
import { captureEditor, EditorSnapshot, resolveEditorSnapshot } from '../src/editor-context';
const editor = {} as Editor;
const snapshot = (from: number, to: number, capturedAt = 100): EditorSnapshot => ({ editor, sourcePath: 'Note.md', document: 'One two', from, to, capturedAt });
it('recovers a recent selection captured before command dispatch', () => {
  expect(resolveEditorSnapshot(snapshot(3, 3), snapshot(0, 3), 150).to).toBe(3);
  expect(resolveEditorSnapshot(snapshot(3, 3), snapshot(0, 3), 150).from).toBe(0);
});
it('prefers a current nonempty selection', () => expect(resolveEditorSnapshot(snapshot(4, 7), snapshot(0, 3), 150).from).toBe(4));
it('rejects stale snapshots or changed editor, source, or content', () => {
  const current = snapshot(3, 3);
  expect(resolveEditorSnapshot(current, snapshot(0, 3, 0), 600)).toBe(current);
  for (const cached of [{ ...snapshot(0, 3), sourcePath: 'Other.md' }, { ...snapshot(0, 3), document: 'Changed' }, { ...snapshot(0, 3), editor: {} as Editor }]) expect(resolveEditorSnapshot(current, cached, 150)).toBe(current);
});
it('uses listed ranges when the primary range is collapsed', () => {
  const host = { getValue: () => 'One two', getCursor: () => ({ line: 0, ch: 3 }), posToOffset: (pos: { ch: number }) => pos.ch, listSelections: () => [{ anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 3 } }] } as unknown as Editor;
  expect(captureEditor(host, 'Note.md').from).toBe(0);
  expect(captureEditor(host, 'Note.md').to).toBe(3);
});
