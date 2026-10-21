import { afterEach, expect, it, vi } from 'vitest';
import * as obsidian from './obsidian-mock';

afterEach(() => vi.restoreAllMocks());
import QuickInsertPlugin from '../src/main';

async function settings() {
  const plugin = new (QuickInsertPlugin as any)({ workspace: { getActiveViewOfType: () => null } });
  const register = vi.spyOn(plugin, 'addSettingTab');
  plugin.saveData = vi.fn().mockResolvedValue(undefined);
  await plugin.onload();
  return { plugin, tab: register.mock.calls[0][0] as any };
}

it('exposes searchable language settings and persists changes through the modern host', async () => {
  const { plugin, tab } = await settings();
  const language = tab.getSettingDefinitions()[0];
  expect(language.name).toBe(plugin.t.language);
  expect(language.control).toMatchObject({ type: 'dropdown', key: 'language', defaultValue: 'auto' });
  expect(language.control.options).toHaveProperty('pt-BR');
  tab.update = vi.fn();
  await tab.setControlValue('language', 'pt-BR');
  expect(tab.getControlValue('language')).toBe('pt-BR');
  expect(plugin.saveData).toHaveBeenCalledWith({ language: 'pt-BR', cardMode: 'markdown' });
  expect(tab.update).toHaveBeenCalledOnce();
  expect(tab.getSettingDefinitions()[0].name).toBe(plugin.t.language);
  expect(tab.getSettingDefinitions()[0].name).not.toBe(language.name);
});

it('renders and refreshes the legacy dropdown when the modern API is unavailable', async () => {
  vi.spyOn(obsidian, 'requireApiVersion').mockReturnValue(false);
  const { plugin, tab } = await settings();
  tab.update = vi.fn(() => { throw new Error('Modern API must not run on a legacy host'); });
  tab.display();
  expect(tab.containerEl.querySelector('select').value).toBe('auto');
  await tab.setControlValue('language', 'en');
  expect(tab.update).not.toHaveBeenCalled();
  expect(obsidian.requireApiVersion).toHaveBeenCalledWith('1.13.0');
  expect(tab.containerEl.querySelectorAll('select')).toHaveLength(1);
  expect(tab.containerEl.querySelector('select').value).toBe('en');
  expect(tab.containerEl.querySelector('p').textContent).toBe(plugin.t.hotkeyHelp);
  expect(plugin.saveData).toHaveBeenCalledWith({ language: 'en', cardMode: 'markdown' });
});

it('ignores unsupported language values and unrelated setting keys', async () => {
  const { plugin, tab } = await settings();
  await tab.setControlValue('language', 'invalid');
  await tab.setControlValue('other', 'pt-BR');
  expect(plugin.language).toBe('auto');
  expect(plugin.saveData).not.toHaveBeenCalled();
});
it('preserves the selected card mode when saving language settings', async () => {
  const { plugin, tab } = await settings();
  plugin.cardMode = 'preview'; tab.update = vi.fn();
  await tab.setControlValue('language', 'en');
  expect(plugin.saveData).toHaveBeenCalledWith({ language: 'en', cardMode: 'preview' });
});
it.each([{}, { language: 'en' }, { cardMode: 'invalid' }, { cardMode: null }])('defaults old or invalid settings to Markdown: %j', async data => {
  const plugin = new (QuickInsertPlugin as any)({ workspace: { getActiveViewOfType: () => null } });
  vi.spyOn(plugin, 'loadData').mockResolvedValue(data);
  await plugin.onload();
  expect(plugin.cardMode).toBe('markdown');
});
