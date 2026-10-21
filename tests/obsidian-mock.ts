// A focused host adapter for integration tests; this does not emulate rendering in Obsidian.
export const notices: string[] = [];
export const modals: Modal[] = [];
Object.assign(HTMLElement.prototype, {
  empty(this: HTMLElement) { this.replaceChildren(); },
  addClass(this: HTMLElement, value: string) { this.classList.add(value); },
  toggleClass(this: HTMLElement, value: string, enabled: boolean) { this.classList.toggle(value, enabled); },
  createEl(this: HTMLElement, tag: string, options: Record<string, any> = {}) {
    const el = document.createElement(tag);
    if (options.text) el.textContent = options.text;
    if (options.cls) el.className = options.cls;
    for (const [name, value] of Object.entries(options.attr ?? {})) el.setAttribute(name, String(value));
    if (options.value !== undefined) (el as HTMLInputElement).value = options.value;
    if (options.type) el.setAttribute('type', options.type);
    this.append(el); return el;
  },
  createDiv(this: HTMLElement, options: Record<string, any> = {}) { return (this as any).createEl('div', options); },
  scrollIntoView() {}
});
export class Modal {
  modalEl = document.createElement('div');
  contentEl = document.createElement('div');
  constructor(public app: any) { this.modalEl.append(this.contentEl); }
  setTitle(text: string) { this.modalEl.setAttribute('aria-label', text); }
  open() { document.body.append(this.modalEl); modals.push(this); (this as any).onOpen?.(); }
  close() { this.modalEl.remove(); const index = modals.indexOf(this); if (index >= 0) modals.splice(index, 1); (this as any).onClose?.(); }
}
export class SuggestModal<T> extends Modal {
  inputEl = document.createElement('input');
  setPlaceholder(value: string) { this.inputEl.placeholder = value; }
}
export class Notice { constructor(text: string) { notices.push(text); } }
export class MarkdownView {}
export class Plugin {
  commands: any[] = [];
  constructor(public app: any) {}
  async loadData() { return {}; }
  async saveData(_data: unknown) {}
  addCommand(command: any) { this.commands.push(command); }
  addSettingTab() {}
  registerDomEvent(target: EventTarget, type: string, callback: EventListener, options?: boolean) { target.addEventListener(type, callback, options); }
}
export class PluginSettingTab { containerEl = document.createElement('div'); }
class Control {
  element: HTMLInputElement | HTMLSelectElement | HTMLButtonElement;
  constructor(parent: HTMLElement, tag: string) { this.element = document.createElement(tag) as Control['element']; parent.append(this.element); }
  get selectEl() { return this.element as HTMLSelectElement; }
  get inputEl() { return this.element as HTMLInputElement; }
  setValue(value: string) { this.element.value = value; return this; }
  addOptions(values: Record<string, string>) { for (const [value, text] of Object.entries(values)) { const option = document.createElement('option'); option.value = value; option.textContent = text; this.element.append(option); } return this; }
  onChange(callback: (value: string) => void) { this.element.addEventListener('change', () => callback(this.element.value)); return this; }
  setButtonText(text: string) { this.element.textContent = text; return this; }
  setCta() { return this; }
  onClick(callback: () => void) { this.element.addEventListener('click', callback); return this; }
}
export class Setting {
  constructor(private parent: HTMLElement) {}
  setName(_name: string) { return this; }
  setDesc(_description: string) { return this; }
  addDropdown(callback: (control: Control) => void) { callback(new Control(this.parent, 'select')); return this; }
  addText(callback: (control: Control) => void) { callback(new Control(this.parent, 'input')); return this; }
  addButton(callback: (control: Control) => void) { callback(new Control(this.parent, 'button')); return this; }
}
export class TFile {
  basename: string;
  extension: string;
  constructor(public path: string) { const name = path.split('/').pop()!; this.extension = name.split('.').pop()!; this.basename = name.slice(0, -this.extension.length - 1); }
}
export const getLanguage = () => 'en';
export const getAllTags = (cache: any) => [...(cache.tags ?? []).map((tag: any) => tag.tag), ...(cache.frontmatter?.tags ?? []).map((tag: string) => '#' + tag)];
export const parseFrontMatterAliases = (frontmatter: any) => frontmatter?.aliases ?? [];

export function requireApiVersion(_version: string) { return true; }

export class Component {
  loaded = false;
  load() { this.loaded = true; }
  unload() { this.loaded = false; }
}
export class MarkdownRenderer {
  static async render(_app: unknown, markdown: string, el: HTMLElement, _sourcePath: string, _component: Component) {
    el.textContent = markdown;
  }
}
