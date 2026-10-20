import { type SettingDefinitionItem, Editor, getLanguage, getAllTags, MarkdownView, Modal, Notice, parseFrontMatterAliases, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { Category, dictionary, filterTemplates, Language, prepareInsertion, Template, templates, expand } from './templates';
import { buildTable, calloutTypes, Choice, codeLanguages, literal, matchesMedia, nextIdentifier, wrapSelection } from './automation';
import { ChoiceModal, OptionsModal } from './choices';
import { boundBlock, formatSelection, SelectionOptions, supportsSelection } from './selection';
import { captureEditor, EditorSnapshot, resolveEditorSnapshot } from './editor-context';

export default class QuickInsertPlugin extends Plugin {
  language: Language = 'auto';
  private beforeCommand?: EditorSnapshot;
  async onload() {
    const data: unknown = await this.loadData();
    if (typeof data === 'object' && data !== null && 'language' in data) {
      const language = data.language;
      if (language === 'auto' || language === 'en' || language === 'pt-BR') this.language = language;
    }
    // Capture before Obsidian's shortcut dispatch can move focus or collapse the selection.
    this.registerDomEvent(document, 'keydown', event => {
      this.beforeCommand = undefined;
      if (event.key === 'Control' || event.key === 'Meta' || event.key === 'Alt' || event.key === 'Shift') return;
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view?.file && view.editor.hasFocus()) this.beforeCommand = captureEditor(view.editor, view.file.path);
    }, true);
    this.registerDomEvent(document, 'pointerdown', () => { this.beforeCommand = undefined; }, true);
    this.addCommand({ id: 'open-picker', name: this.t.command, editorCallback: (editor, view) => {
      const snapshot = resolveEditorSnapshot(captureEditor(editor, view.file?.path ?? ''), this.beforeCommand);
      this.beforeCommand = undefined;
      new Picker(this, editor, view.file?.path ?? '', snapshot).open();
    } });
    this.addSettingTab(new Settings(this));
  }
  get t() { return dictionary(this.language, getLanguage()); }
}

class Settings extends PluginSettingTab {
  constructor(private plugin: QuickInsertPlugin) { super(plugin.app, plugin); }
  getSettingDefinitions(): SettingDefinitionItem[] {
    const t = this.plugin.t;
    return [
      { name: t.language, desc: t.languageHelp, control: {
        type: 'dropdown', key: 'language', defaultValue: 'auto',
        options: { auto: t.automatic, en: 'English', 'pt-BR': 'Português brasileiro' }
      } },
      { name: t.hotkeyHelp }
    ];
  }
  getControlValue(key: string): unknown {
    return key === 'language' ? this.plugin.language : undefined;
  }
  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key !== 'language' || (value !== 'auto' && value !== 'en' && value !== 'pt-BR')) return;
    this.plugin.language = value;
    await this.plugin.saveData({ language: value });
    if (typeof this.update === 'function') this.update();
    else this.renderLegacy();
  }
  // Obsidian versions before 1.13 use this fallback instead of setting definitions.
  display() { this.renderLegacy(); }
  private renderLegacy() {
    const t = this.plugin.t;
    this.containerEl.empty();
    new Setting(this.containerEl).setName(t.language).setDesc(t.languageHelp).addDropdown(dropdown => dropdown
      .addOptions({ auto: t.automatic, en: 'English', 'pt-BR': 'Português brasileiro' }).setValue(this.plugin.language)
      .onChange(value => this.setControlValue('language', value)));
    this.containerEl.createEl('p', { text: t.hotkeyHelp });
  }
}

class Picker extends Modal {
  private original: string;
  private from: number;
  private to: number;
  private items: Template[] = [];
  private active = 0;
  private buttons: HTMLButtonElement[] = [];
  private grid!: HTMLDivElement;
  private input!: HTMLInputElement;
  private category = '';
  private t;
  constructor(private plugin: QuickInsertPlugin, private editor: Editor, private sourcePath: string, snapshot: EditorSnapshot) {
    super(plugin.app);
    this.t = plugin.t;
    this.original = snapshot.document;
    this.from = snapshot.from;
    this.to = snapshot.to;
  }
  onOpen() {
    this.modalEl.addClass('mqi-modal');
    this.setTitle(this.to > this.from ? this.t.selectionTitle : this.t.title);
    this.input = this.contentEl.createEl('input', { type: 'search', cls: 'mqi-search', attr: { placeholder: this.t.search, 'aria-label': this.t.search } });
    const categories = this.contentEl.createEl('select', { cls: 'mqi-category', attr: { 'aria-label': this.t.category } });
    categories.createEl('option', { text: this.t.all, value: '' });
    for (const category of ['textCategory', 'structureCategory', 'referenceCategory', 'mediaCategory', 'advancedCategory'] as Category[]) categories.createEl('option', { text: this.t[category], value: category });
    categories.addEventListener('change', () => { this.category = categories.value; this.render(); });
    if (this.to > this.from) this.contentEl.createEl('p', { text: this.t.selectionHelp, cls: 'mqi-help' });
    this.contentEl.createEl('p', { text: this.t.help, cls: 'mqi-help' });
    this.grid = this.contentEl.createDiv({ cls: 'mqi-grid', attr: { 'aria-label': this.t.title } });
    this.input.addEventListener('input', () => this.render());
    this.contentEl.addEventListener('keydown', event => {
      if (event.target !== this.input && !this.buttons.includes(event.target as HTMLButtonElement)) return;
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key) || !this.items.length) return;
      if (event.key === 'Enter') {
        if (event.target === this.input) { event.preventDefault(); this.choose(this.items[this.active]); }
        return;
      }
      event.preventDefault();
      const columns = Math.max(1, getComputedStyle(this.grid).gridTemplateColumns.split(' ').length);
      const delta = { ArrowDown: columns, ArrowUp: -columns, ArrowLeft: -1, ArrowRight: 1 }[event.key] ?? 0;
      this.active = (this.active + delta + this.items.length) % this.items.length;
      this.highlight();
      if (event.target !== this.input) this.buttons[this.active].focus();
    });
    this.render();
    this.input.focus();
  }
  private render() {
    const selected = this.original.slice(this.from, this.to);
    this.items = filterTemplates(templates(this.t), this.input.value).filter(item => (!this.category || item.category === this.category) && supportsSelection(item, selected));
    this.active = 0;
    this.grid.empty();
    this.buttons = this.items.map((item, index) => {
      const button = this.grid.createEl('button', { cls: 'mqi-card', attr: { type: 'button' } });
      button.createEl('strong', { text: item.label });
      const preview = selected && item.id !== 'alias' ? formatSelection(item, selected, { title: this.t.calloutTitle }).text : item.source ? expand(item.source).text : this.t[item.category ?? 'referenceCategory'];
      button.createEl('code', { text: preview });
      button.addEventListener('focus', () => { this.active = index; this.highlight(); });
      button.addEventListener('click', () => this.choose(item));
      return button;
    });
    if (!this.items.length) this.grid.createEl('p', { text: this.t.empty, attr: { role: 'status' } });
    this.highlight();
  }
  private highlight() {
    this.buttons.forEach((button, index) => button.toggleClass('is-active', index === this.active));
    this.buttons[this.active]?.scrollIntoView({ block: 'nearest' });
  }
  private valid() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (this.editor.getValue() !== this.original || view?.editor !== this.editor || view.file?.path !== this.sourcePath) {
      new Notice(this.t.stale); return false;
    }
    return true;
  }
  private insert(item: Template, raw = false, target?: () => boolean, selectionOptions: SelectionOptions = {}) {
    if (!this.valid()) { this.close(); return; }
    if (target && !target()) { new Notice(this.t.missing); return; }
    const before = this.original.slice(0, this.from), after = this.original.slice(this.to);
    const selected = this.original.slice(this.from, this.to);
    let result = raw ? literal(item.source) : item.inline ? wrapSelection(item, selected) : prepareInsertion(item.source, before, after);
    if (selected && !raw) {
      result = formatSelection(item, selected, { title: this.t.calloutTitle, ...selectionOptions });
      if (!item.inline) result = boundBlock(result, before, after);
    }
    if (raw && !item.inline) {
      const bounded = prepareInsertion('{{content}}', before, after);
      const prefix = bounded.text.slice(0, bounded.selection.start), suffix = bounded.text.slice(bounded.selection.end);
      result = literal(prefix + item.source + suffix);
    }
    this.close();
    this.editor.replaceRange(result.text, this.editor.offsetToPos(this.from), this.editor.offsetToPos(this.to));
    this.editor.focus();
    this.editor.setSelection(this.editor.offsetToPos(this.from + result.selection.start), this.editor.offsetToPos(this.from + result.selection.end));
  }
  private suggest(title: string, choices: Choice[], select: (choice: Choice) => void) {
    this.close();
    if (!choices.length) { new Notice(this.t.noCandidates); return; }
    new ChoiceModal(this.app, title, choices, select).open();
  }
  private choose(item: Template) {
    const t = this.t;
    const send = (source: string, raw = false, target?: () => boolean, selectionOptions?: SelectionOptions) => this.insert({ ...item, source }, raw, target, selectionOptions);
    const options = (fields: ConstructorParameters<typeof OptionsModal>[2], submit: ConstructorParameters<typeof OptionsModal>[4]) => {
      this.close(); new OptionsModal(this.app, item.label, fields, t, submit).open();
    };
    if (item.id === 'table') {
      options([{ key: 'columns', label: t.columns, value: '2', number: { min: 1, max: 12 } }, { key: 'rows', label: t.rows, value: '2', number: { min: 1, max: 50 } }, { key: 'alignment', label: t.alignment, value: 'left', options: { left: t.left, center: t.center, right: t.right } }], values => {
        let source: string;
        try { source = buildTable(Number(values.columns), Number(values.rows), values.alignment, t.header, t.cell); } catch { return t.invalidTable; }
        send(source);
      }); return;
    }
    if (item.id === 'callout') {
      this.suggest(t.chooseCallout, calloutTypes.map(value => ({ value, label: t.calloutNames[value as keyof typeof t.calloutNames], detail: value })), choice => {
        options([{ key: 'fold', label: t.fold, value: '', options: { '': t.unfolded, '+': t.expanded, '-': t.collapsed } }], values => send(`> [!${choice.value}]${values.fold} {{${t.calloutTitle}}}\n> {{${t.calloutText}}}`, false, undefined, { calloutType: choice.value, fold: values.fold }));
      }); return;
    }
    if (item.id === 'code') {
      this.suggest(t.chooseLanguage, codeLanguages.map(value => ({ value, label: value })), choice => send('```' + choice.value + '\n{{' + t.codeText + '}}\n```', false, undefined, { language: choice.value })); return;
    }
    if (item.id === 'footnote') {
      if (!this.valid()) return;
      const id = nextIdentifier(this.original, 'mqi-');
      const reference = `[^${id}]`;
      const updated = this.original.slice(0, this.from) + reference + this.original.slice(this.to);
      const tail = updated.endsWith('\n\n') ? '' : updated.endsWith('\n') ? '\n' : '\n\n';
      const definition = `${tail}[^${id}]: ${t.text}`;
      this.close();
      // Offsets in a transaction refer to the original document.
      this.editor.transaction({ changes: this.to === this.original.length ? [
        { from: this.editor.offsetToPos(this.from), to: this.editor.offsetToPos(this.to), text: reference + definition }
      ] : [
        { from: this.editor.offsetToPos(this.from), to: this.editor.offsetToPos(this.to), text: reference },
        { from: this.editor.offsetToPos(this.original.length), text: definition }
      ] });
      const end = this.editor.getValue().length;
      this.editor.focus();
      this.editor.setSelection(this.editor.offsetToPos(end - t.text.length), this.editor.offsetToPos(end));
      return;
    }
    if (item.id === 'blockId') {
      this.insert({ ...item, inline: false, source: `{{${t.text}}} ^${nextIdentifier(this.original, 'mqi-block-')}` }); return;
    }
    if (item.id === 'tag') {
      const tags = new Set<string>();
      for (const file of this.app.vault.getMarkdownFiles()) {
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache) for (const tag of getAllTags(cache) ?? []) tags.add(tag);
      }
      this.suggest(t.chooseTag, [...tags].sort().map(value => ({ value, label: value })), choice => {
        const before = this.original.slice(0, this.from), after = this.original.slice(this.to);
        send((before && !/\s$/.test(before) ? ' ' : '') + choice.value + (after && !/^\s/.test(after) ? ' ' : ''), true);
      }); return;
    }
    const noteActions = ['note', 'alias', 'headingLink', 'blockLink', 'embedNote', 'embedHeading', 'embedBlock'];
    if (noteActions.includes(item.id) || ['image', 'audio', 'video', 'pdf', 'canvas'].includes(item.id)) {
      const notes = noteActions.includes(item.id);
      const files = notes ? this.app.vault.getMarkdownFiles() : this.app.vault.getFiles().filter(file => matchesMedia(item.id, file.extension));
      const choices: Choice[] = files.sort((a, b) => a.path.localeCompare(b.path)).flatMap(file => {
        const base: Choice = { label: file.basename, detail: file.path, value: file.path };
        if (!notes) return [base];
        const aliases = parseFrontMatterAliases(this.app.metadataCache.getFileCache(file)?.frontmatter) ?? [];
        return [base, ...aliases.map(alias => ({ ...base, label: alias, alias }))];
      });
      this.suggest(notes ? t.chooseNote : t.chooseFile, choices, choice => {
        const file = this.app.vault.getAbstractFileByPath(choice.value);
        if (!(file instanceof TFile)) { new Notice(t.missing); return; }
        const exists = () => this.app.vault.getAbstractFileByPath(choice.value) === file;
        const link = (subpath = '', alias?: string, embed = false) => {
          const generated = this.app.fileManager.generateMarkdownLink(file, this.sourcePath, subpath, alias);
          return (embed ? '!' : '') + generated;
        };
        if (['headingLink', 'embedHeading', 'blockLink', 'embedBlock'].includes(item.id)) {
          const heading = ['headingLink', 'embedHeading'].includes(item.id);
          const cache = this.app.metadataCache.getFileCache(file);
          const sections: Choice[] = heading ? (cache?.headings ?? []).map(h => ({ label: h.heading, detail: `H${h.level} · ${file.path}`, value: '#' + h.heading }))
            : Object.values(cache?.blocks ?? {}).map(block => ({ label: '^' + block.id, detail: file.path, value: '#^' + block.id }));
          this.suggest(heading ? t.chooseHeading : t.chooseBlock, sections, section => send(link(section.value, undefined, item.id.startsWith('embed')), true, () => {
            const latest = this.app.metadataCache.getFileCache(file);
            return exists() && (heading ? !!latest?.headings?.some(h => '#' + h.heading === section.value) : !!latest?.blocks?.[section.value.slice(2)]);
          })); return;
        }
        if (item.id === 'alias') {
          options([{ key: 'alias', label: t.displayText, value: this.original.slice(this.from, this.to) || choice.alias || file.basename }], values => send(link('', values.alias), true, exists)); return;
        }
        if (item.id === 'image' || item.id === 'pdf') {
          options([{ key: 'number', label: item.id === 'image' ? t.width : t.page, value: '' }], values => {
            if (values.number && (!/^\d+$/.test(values.number) || !Number.isSafeInteger(Number(values.number)) || Number(values.number) < 1)) return t.invalidNumber;
            send(link(item.id === 'pdf' && values.number ? '#page=' + values.number : '', item.id === 'image' && values.number ? values.number : undefined, true), true, exists);
          }); return;
        }
        send(link('', choice.alias, item.id.startsWith('embed') || !notes), true, exists);
      }); return;
    }
    this.insert(item);
  }
  onClose() { this.contentEl.empty(); }
}
