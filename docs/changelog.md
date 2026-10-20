# Changelog

## Unreleased - Documentation - 2026-10-20

- Add four user-provided screenshots and an English README gallery covering the insertion grid, tables, references, and note selection.

- Link the Markdown Quick Insert privacy policy hosted on the Reve Signum Studios website.

- Clarify the product summary, requirements, and unverified mobile and minimum-version compatibility.
- Add manual release installation, upgrade instructions, and conditional community-directory installation.
- Document local data processing, external content, support reporting, and release history.
- Documentation only; plugin code and version remain unchanged.


## 0.2.6 - 2026-10-20

- Submit the table modal with Enter while Alignment is focused, using its current selected value and existing validation.
- Preserve native dropdown arrow navigation and mouse interaction; leave other dropdowns unchanged.
- Ignore repeated and composing Enter events and update all version metadata.

### Validation

- Run production build and regression tests for Enter submission and invalid table dimensions.
- Live Obsidian keyboard interaction remains to be confirmed.


## 0.2.5 - 2026-10-20

- Restore native number input spinners and remove separate increment/decrement buttons so Tab moves directly between fields.
- Override host rules that hide native Chromium spin buttons; retain the original field width, numeric bounds, and manual entry.
- Update version metadata and rebuild the production bundle.

### Validation

- TypeScript checking, production build, and 82 automated tests passed.
- Regression coverage checks native numeric fields and absence of extra button tab stops.
- Live Obsidian spinner rendering still requires visual verification.


## 0.2.4 - 2026-10-20

- Replace theme-dependent native table spinners with explicit, accessible increment/decrement buttons.
- Restore the dimension controls to their previous text-field width without changing modal dimensions.
- Preserve manual entry, numeric bounds, keyboard input, and English/Brazilian Portuguese labels.
- Update version metadata and rebuild the production bundle.

### Validation

- Automated regression tests cover arrow clicks, bounds, empty input recovery, and insertion using updated values.
- Live Obsidian dark/light visual verification remains pending.


## 0.2.3 - 2026-10-20

- Add native number spinners with manual entry for table columns (1–12) and example rows (1–50), preserving insertion validation.
- Clarify that example rows exclude the header in English and Brazilian Portuguese.
- Keep spinner styling scoped to table dimensions and inherit the host theme.
- Update version metadata and the production bundle.

### Validation

- TypeScript checking and production build passed; all 81 automated tests passed across five files.
- Regression tests cover numeric bounds, manual entry, header exclusion, and both translated labels.
- Live Obsidian dark/light rendering remains unverified.

## 0.2.2 - 2026-10-20

- Capture selection anchor/head before shortcut dispatch and pass an immutable snapshot to the picker.
- Recover a recent selection if command dispatch collapses it, checking editor identity, source path, document content, and a 500 ms expiry.
- Clear cached keyboard context on pointer interaction and consume it once per command.
- Normalize reversed selections and consult listed ranges when the primary range is collapsed.
- Add regression tests for collapsed/reversed selections and expired/mismatched source snapshots.
- Update all version metadata to 0.2.2 and document supported editor modes.

### Validation

- TypeScript checking and production build passed; 73 tests passed across five files.
- The installed 0.2.1 bundle matched the project bundle by SHA-256 before this change.
- Selection collapse is reproduced in a host-adapter regression test; the exact cause in the user's live session is not confirmed.
- No vault files were modified. A live Obsidian retest of the new package is still required.

## 0.2.1 - 2026-10-20

- Add a contextual formatting mode when opening Ctrl+. with selected text.
- Show only compatible transformations and preview the captured text in each formatting card.
- Apply quotes, headings, lists, tasks, callouts, code, links, comments, math, and escaping to the selection instead of replacing it with sample content.
- Preserve multiline content, paragraph separators, literal placeholder syntax, and selected text through callout/code configuration.
- Replace heading levels, use collision-safe code fences, and select external-link URLs for editing.
- Hide insertion-only entries and unsafe inline/comment formats while a selection is active.
- Preserve the complete insertion catalog when no text is selected.
- Update English/Brazilian Portuguese instructions and version metadata to 0.2.1.

### Validation

- TypeScript checking and production build passed.
- All 67 automated tests passed across four test files.
- Dependency installation audit reported zero vulnerabilities.
- Real Obsidian UI/undo validation remains pending. No vault was modified.

## 0.2.0 - 2026-10-20

- Expand the grid to 52 entries across five searchable categories.
- Add note discovery by name, path, and frontmatter alias; distinguish duplicate names by path.
- Add selectors for existing headings and block IDs, plus note/heading/block embeds.
- Generate links using Obsidian's link and path preferences, preserving selected aliases.
- Add attachment discovery, optional image width/PDF page, and existing-tag suggestions.
- Add table dimensions/alignment, all 13 native callout types with collapse options, and code-language selection.
- Add inline formatting/selection wrapping, nested lists/quotes/tasks, comments, math, Mermaid examples, HTML details, and escaping.
- Add unused block/footnote identifiers; append footnote definitions in the same editor transaction.
- Reject stale source selections and removed/renamed targets without modifying referenced notes.
- Preserve generated links literally, including placeholder-like text in filenames.
- Add bilingual controls and integration tests using a focused host adapter.
- Update package, lockfile, manifest, and compatibility history to version 0.2.0.

### Validation

- TypeScript checking and production build passed.
- All 50 automated tests passed across three test files.
- Dependency installation audit reported zero vulnerabilities.
- Live Obsidian rendering, keyboard interaction, and undo/redo remain unverified. No vault was modified during development.

## 0.1.0 - 2026-10-19

- Add a searchable, keyboard-accessible template grid and configurable Ctrl+. command.
- Add 15 Markdown templates with editable example text and first-placeholder selection.
- Preserve surrounding Markdown block boundaries and reject insertion after document changes.
- Add automatic English/Brazilian Portuguese localization and a persisted language override.
- Add responsive theme-aware styles, TypeScript build, automated tests, and installation instructions.

### Validation

- TypeScript checking and production build passed.
- All 19 automated tests passed.
- Dependency audit reported zero vulnerabilities.
- Live Obsidian UI validation remains pending; no vault was modified.

