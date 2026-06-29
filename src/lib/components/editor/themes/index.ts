import type { monaco } from '$lib/monaco';
import { animorankDark } from './animorank-dark';

/**
 * AnimoRank's Monaco editor themes.
 *
 * Each theme is a fully-static `IStandaloneThemeData` kept in its own file under
 * this folder. They are registered with Monaco by name at load time; the editor
 * does not read CSS variables or track the daisyUI palette at runtime. To add a
 * theme, create a sibling file and list it in `MONACO_THEMES` below.
 */
export const MONACO_THEMES = {
  'animorank-dark': animorankDark
} satisfies Record<string, monaco.editor.IStandaloneThemeData>;

export type MonacoThemeId = keyof typeof MONACO_THEMES;

/** The theme applied to editors by default. */
export const DEFAULT_MONACO_THEME: MonacoThemeId = 'animorank-dark';

/** Register every static theme with Monaco. Call once after Monaco loads. */
export function registerMonacoThemes(m: typeof monaco): void {
  for (const [id, data] of Object.entries(MONACO_THEMES)) {
    m.editor.defineTheme(id, data);
  }
}

/** Switch the active theme on all open editors (future platform theme-picker hook). */
export function setActiveMonacoTheme(m: typeof monaco, id: MonacoThemeId): void {
  m.editor.setTheme(id);
}
