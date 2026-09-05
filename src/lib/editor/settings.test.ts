import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EDITOR_SETTINGS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  parseSettings,
  toMonacoEditorOptions,
  toMonacoModelOptions
} from './settings.svelte';

describe('parseSettings', () => {
  it('returns the defaults for values that are not objects', () => {
    for (const raw of [null, undefined, 'nonsense', 42, true]) {
      expect(parseSettings(raw)).toEqual(DEFAULT_EDITOR_SETTINGS);
    }
  });

  it('merges a partial object over the defaults', () => {
    expect(parseSettings({ fontSize: 16, minimap: true })).toEqual({
      ...DEFAULT_EDITOR_SETTINGS,
      fontSize: 16,
      minimap: true
    });
  });

  it('drops unknown keys', () => {
    const parsed = parseSettings({ fontSize: 16, somethingElse: 'ignored' });
    expect(parsed).toEqual({ ...DEFAULT_EDITOR_SETTINGS, fontSize: 16 });
    expect('somethingElse' in parsed).toBe(false);
  });

  it('clamps the font size at both ends and rounds it', () => {
    expect(parseSettings({ fontSize: 999 }).fontSize).toBe(FONT_SIZE_MAX);
    expect(parseSettings({ fontSize: -5 }).fontSize).toBe(FONT_SIZE_MIN);
    expect(parseSettings({ fontSize: 13.6 }).fontSize).toBe(14);
  });

  it('falls back when a value has the wrong type', () => {
    expect(parseSettings({ fontSize: 'huge' }).fontSize).toBe(DEFAULT_EDITOR_SETTINGS.fontSize);
    expect(parseSettings({ wordWrap: 'on' }).wordWrap).toBe(DEFAULT_EDITOR_SETTINGS.wordWrap);
  });

  it('rejects a line-numbers mode that is not one of the three', () => {
    expect(parseSettings({ lineNumbers: 'relative' }).lineNumbers).toBe('relative');
    expect(parseSettings({ lineNumbers: 'interval' }).lineNumbers).toBe(DEFAULT_EDITOR_SETTINGS.lineNumbers);
  });

  it('accepts only the offered tab sizes', () => {
    expect(parseSettings({ tabSize: 2 }).tabSize).toBe(2);
    expect(parseSettings({ tabSize: 8 }).tabSize).toBe(8);
    expect(parseSettings({ tabSize: 3 }).tabSize).toBe(DEFAULT_EDITOR_SETTINGS.tabSize);
  });
});

describe('option mapping', () => {
  it('keeps tabSize and insertSpaces out of the editor options', () => {
    // They are model options; Monaco ignores them on editor.updateOptions.
    const options = toMonacoEditorOptions(DEFAULT_EDITOR_SETTINGS) as Record<string, unknown>;
    expect(options.tabSize).toBeUndefined();
    expect(options.insertSpaces).toBeUndefined();
  });

  it('maps tabSize and insertSpaces to the model options', () => {
    expect(toMonacoModelOptions({ ...DEFAULT_EDITOR_SETTINGS, tabSize: 2, insertSpaces: false })).toEqual({
      tabSize: 2,
      insertSpaces: false
    });
  });

  it('translates the booleans into the values Monaco expects', () => {
    const on = toMonacoEditorOptions({
      ...DEFAULT_EDITOR_SETTINGS,
      wordWrap: true,
      minimap: true,
      autoClosingBrackets: true
    });
    expect(on.wordWrap).toBe('on');
    expect(on.minimap).toEqual({ enabled: true });
    expect(on.autoClosingBrackets).toBe('languageDefined');

    const off = toMonacoEditorOptions({
      ...DEFAULT_EDITOR_SETTINGS,
      wordWrap: false,
      minimap: false,
      autoClosingBrackets: false
    });
    expect(off.wordWrap).toBe('off');
    expect(off.minimap).toEqual({ enabled: false });
    expect(off.autoClosingBrackets).toBe('never');
    // Quotes follow the same toggle so the pair can't get out of step.
    expect(off.autoClosingQuotes).toBe('never');
  });

  it('ties suggestion triggers to the single suggestions toggle', () => {
    const off = toMonacoEditorOptions({ ...DEFAULT_EDITOR_SETTINGS, quickSuggestions: false });
    expect(off.quickSuggestions).toBe(false);
    expect(off.suggestOnTriggerCharacters).toBe(false);
  });
});
