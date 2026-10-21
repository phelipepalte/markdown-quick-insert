import { App, Modal, Notice, Setting, SuggestModal } from 'obsidian';
import { Choice, searchChoices } from './automation';
import en from './i18n/en';

export class ChoiceModal extends SuggestModal<Choice> {
  constructor(app: App, title: string, private choices: Choice[], private select: (choice: Choice) => void) {
    super(app);
    this.setPlaceholder(title);
  }
  getSuggestions(query: string) { return searchChoices(this.choices, query); }
  renderSuggestion(choice: Choice, el: HTMLElement) {
    el.createDiv({ text: choice.label });
    if (choice.detail) el.createDiv({ text: choice.detail, cls: 'mqi-help' });
  }
  onChooseSuggestion(choice: Choice) { this.select(choice); }
}

export interface Field { key: string; label: string; value: string; options?: Record<string, string>; number?: { min: number; max: number } }
export class OptionsModal extends Modal {
  private values: Record<string, string> = {};
  constructor(app: App, private title: string, private fields: Field[], private t: typeof en, private submit: (values: Record<string, string>) => string | void) { super(app); }
  onOpen() {
    this.setTitle(this.title);
    for (const field of this.fields) {
      this.values[field.key] = field.value;
      const row = new Setting(this.contentEl).setName(field.label);
      if (field.options) row.addDropdown(input => {
        input.addOptions(field.options!).setValue(field.value).onChange(value => { this.values[field.key] = value; });

      });
      else row.addText(input => {
        if (field.number) {
          input.inputEl.type = 'number';
          input.inputEl.min = String(field.number.min);
          input.inputEl.max = String(field.number.max);
          input.inputEl.step = '1';
          input.inputEl.classList.add('mqi-number');
          input.inputEl.setAttribute('aria-label', field.label);

        }
        input.setValue(field.value).onChange(value => { this.values[field.key] = value; });
      });
    }
    if (this.fields.some(field => field.key === 'alignment')) {
      this.contentEl.addEventListener('keydown', event => {
        if (event.key !== 'Enter' || event.isComposing || event.repeat) return;
        if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)) return;
        event.preventDefault();
        event.stopPropagation();
        const controls = this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select');
        this.fields.forEach((field, index) => { this.values[field.key] = controls[index].value; });
        this.submitValues();
      });
    }
    new Setting(this.contentEl).addButton(button => button.setButtonText(this.t.cancel).onClick(() => this.close()))
      .addButton(button => button.setButtonText(this.t.insert).setCta().onClick(() => this.submitValues()));
  }
  private submitValues() {
    const error = this.submit(this.values);
    if (error) new Notice(error); else this.close();
  }
  onClose() { this.contentEl.empty(); }
}
