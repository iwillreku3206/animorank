import { browser } from '$app/environment';
import type { monaco } from '$lib/monaco';
import { DEFAULT_MONACO_THEME } from '$lib/components/editor/themes';

/**
 * User-adjustable Monaco settings, persisted per-device to localStorage and
 * shared by every editor in the app.
 *
 * `tabSize` and `insertSpaces` are *model* options in Monaco, not editor
 * options — see `toMonacoModelOptions`.
 */
export interface EditorSettings {
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  autoClosingBrackets: boolean;
  quickSuggestions: boolean;
  tabSize: number;
  insertSpaces: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 12,
  wordWrap: true,
  minimap: false,
  lineNumbers: 'on',
  autoClosingBrackets: true,
  quickSuggestions: true,
  tabSize: 4,
  insertSpaces: true
};

/** Bounds for the font size slider, and the clamp applied to stored values. */
export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 24;

/** The tab widths offered in the UI; any other stored value is rejected. */
export const TAB_SIZES = [2, 4, 8] as const;

const LINE_NUMBER_MODES: EditorSettings['lineNumbers'][] = ['on', 'off', 'relative'];

export const EDITOR_SETTINGS_STORAGE_KEY = 'animorank:editor-settings';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Coerce arbitrary stored JSON into a usable settings object: unknown keys are
 * dropped, missing ones fall back to the default, and out-of-range values are
 * clamped rather than honoured.
 *
 * localStorage is user-editable, so this is a correctness boundary and not just
 * defensive style — a stored `fontSize` of 999 would otherwise leave the editor
 * unusable with no way to get back to the settings dialog.
 */
export function parseSettings(raw: unknown): EditorSettings {
  if (raw === null || typeof raw !== 'object') {
    return { ...DEFAULT_EDITOR_SETTINGS };
  }
  const input = raw as Partial<Record<keyof EditorSettings, unknown>>;

  const fontSize = Number(input.fontSize);
  const tabSize = Number(input.tabSize);

  return {
    fontSize: Number.isFinite(fontSize)
      ? clamp(Math.round(fontSize), FONT_SIZE_MIN, FONT_SIZE_MAX)
      : DEFAULT_EDITOR_SETTINGS.fontSize,
    wordWrap: boolOr(input.wordWrap, DEFAULT_EDITOR_SETTINGS.wordWrap),
    minimap: boolOr(input.minimap, DEFAULT_EDITOR_SETTINGS.minimap),
    lineNumbers: LINE_NUMBER_MODES.includes(input.lineNumbers as EditorSettings['lineNumbers'])
      ? (input.lineNumbers as EditorSettings['lineNumbers'])
      : DEFAULT_EDITOR_SETTINGS.lineNumbers,
    autoClosingBrackets: boolOr(input.autoClosingBrackets, DEFAULT_EDITOR_SETTINGS.autoClosingBrackets),
    quickSuggestions: boolOr(input.quickSuggestions, DEFAULT_EDITOR_SETTINGS.quickSuggestions),
    tabSize: (TAB_SIZES as readonly number[]).includes(tabSize) ? tabSize : DEFAULT_EDITOR_SETTINGS.tabSize,
    insertSpaces: boolOr(input.insertSpaces, DEFAULT_EDITOR_SETTINGS.insertSpaces)
  };
}

/**
 * Options every editor in the app shares regardless of user settings. Kept here
 * so the two `monaco.editor.create` call sites cannot drift apart.
 *
 * `detectIndentation` is off deliberately: left on, Monaco infers indentation
 * from the starter code and silently overrides the user's chosen tab size.
 */
export const BASE_MONACO_OPTIONS = {
  automaticLayout: true,
  fontFamily: 'DM Mono',
  theme: DEFAULT_MONACO_THEME,
  wordBasedSuggestions: 'currentDocument',
  bracketPairColorization: { enabled: true },
  detectIndentation: false
} as const satisfies monaco.editor.IStandaloneEditorConstructionOptions;

/** The settings that belong on the editor instance (`editor.updateOptions`). */
export function toMonacoEditorOptions(settings: EditorSettings): monaco.editor.IEditorOptions {
  return {
    fontSize: settings.fontSize,
    wordWrap: settings.wordWrap ? 'on' : 'off',
    minimap: { enabled: settings.minimap },
    lineNumbers: settings.lineNumbers,
    autoClosingBrackets: settings.autoClosingBrackets ? 'languageDefined' : 'never',
    autoClosingQuotes: settings.autoClosingBrackets ? 'languageDefined' : 'never',
    quickSuggestions: settings.quickSuggestions,
    suggestOnTriggerCharacters: settings.quickSuggestions
  };
}

/**
 * The settings that belong on the text model (`model.updateOptions`). Passing
 * these to `editor.updateOptions` silently does nothing.
 */
export function toMonacoModelOptions(settings: EditorSettings): monaco.editor.ITextModelUpdateOptions {
  return {
    tabSize: settings.tabSize,
    insertSpaces: settings.insertSpaces
  };
}

const SAVE_DEBOUNCE_MS = 200;

/**
 * The app-wide editor settings. Editors read `current` reactively, so a change
 * here reaches every open editor without any prop threading.
 */
export class EditorSettingsStore {
  public current: EditorSettings = $state({ ...DEFAULT_EDITOR_SETTINGS });

  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  /** Replace the current settings with whatever is in storage. */
  public load(): void {
    let raw: string | null;
    try {
      raw = localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY);
    } catch {
      return;
    }
    if (!raw) {
      return;
    }
    try {
      this.current = parseSettings(JSON.parse(raw));
    } catch {
      // Malformed JSON — keep the defaults already in place.
    }
  }

  public reset(): void {
    this.current = { ...DEFAULT_EDITOR_SETTINGS };
  }

  public scheduleSave(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      this.saveNow();
    }, SAVE_DEBOUNCE_MS);
  }

  public saveNow(): void {
    try {
      localStorage.setItem(EDITOR_SETTINGS_STORAGE_KEY, JSON.stringify($state.snapshot(this.current)));
    } catch {
      // localStorage unavailable (private mode, quota) — skip persistence.
    }
  }
}

export const editorSettings = new EditorSettingsStore();

// Restore and then track changes once, at module load, rather than from a
// component: persistence must not depend on the settings dialog being mounted.
// The root is never torn down because the store lives as long as the tab.
if (browser) {
  editorSettings.load();
  $effect.root(() => {
    $effect(() => {
      // Touch every field so any change schedules a write.
      $state.snapshot(editorSettings.current);
      editorSettings.scheduleSave();
    });
  });
}
