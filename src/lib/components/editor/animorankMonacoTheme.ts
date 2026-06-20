import type { monaco } from '$lib/monaco';

/**
 * AnimoRank's custom Monaco editor theme — resolved at runtime from the active
 * daisyUI palette.
 *
 * Monaco has its own theming system and, unlike dockview, cannot read CSS
 * custom properties directly: `defineTheme` only accepts concrete colors. So we
 * read the daisyUI `--color-*` variables off the document at runtime, convert
 * whatever color syntax they use (oklch / hex / rgb) into plain hex via a canvas
 * round-trip, and build the Monaco theme from those values. A MutationObserver
 * re-applies the theme whenever `data-theme` changes, so the editor tracks the
 * daisyUI palette the same way the dockview chrome does.
 *
 * Color-format note:
 *   - `rules[].foreground` takes hex WITHOUT a leading `#`.
 *   - `colors` keys take hex WITH a leading `#`, optionally `#rrggbbaa`.
 */

export const ANIMORANK_MONACO_THEME = 'animorank-dark';

// ---------------------------------------------------------------------------
// Color resolution helpers
// ---------------------------------------------------------------------------

let canvasCtx: CanvasRenderingContext2D | null | undefined;

function getCanvasCtx(): CanvasRenderingContext2D | null {
  if (canvasCtx === undefined) {
    canvasCtx = document.createElement('canvas').getContext('2d');
  }
  return canvasCtx;
}

/** Normalise any CSS color string (oklch, hex, rgb, named) to `#rrggbb`. */
function toHex(color: string, fallback = '#000000'): string {
  const ctx = getCanvasCtx();
  if (!ctx) return fallback;
  // Seed with a known value so an unparseable input leaves a predictable result.
  ctx.fillStyle = fallback;
  ctx.fillStyle = color;
  const resolved = ctx.fillStyle; // '#rrggbb' (opaque) or 'rgba(r, g, b, a)'
  if (resolved.startsWith('#')) return resolved.slice(0, 7);
  const m = resolved.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return fallback;
  return rgbToHex(Number(m[1]), Number(m[2]), Number(m[3]));
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
}

/** Linear blend of two `#rrggbb` colors. `t` = weight of `a` (0..1). */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(
    Math.round(ar * t + br * (1 - t)),
    Math.round(ag * t + bg * (1 - t)),
    Math.round(ab * t + bb * (1 - t))
  );
}

/** Append a two-hex-digit alpha channel to a `#rrggbb` color. */
function alpha(hex: string, aa: string): string {
  return `${hex}${aa}`;
}

/** Read a daisyUI `--color-*` variable from the document root and hex-normalise it. */
function readColor(root: Element, name: string, fallback: string): string {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  return raw ? toHex(raw, fallback) : fallback;
}

function relLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ---------------------------------------------------------------------------
// Theme construction
// ---------------------------------------------------------------------------

function buildThemeData(): monaco.editor.IStandaloneThemeData {
  const root = document.documentElement;

  const base100 = readColor(root, '--color-base-100', '#262626');
  const base200 = readColor(root, '--color-base-200', '#1a1a1a');
  const base300 = readColor(root, '--color-base-300', '#0a0a0a');
  const baseContent = readColor(root, '--color-base-content', '#e6e6e6');
  const primary = readColor(root, '--color-primary', '#77de3d');
  const secondary = readColor(root, '--color-secondary', '#4dba89');
  const accent = readColor(root, '--color-accent', '#e0a838');
  const error = readColor(root, '--color-error', '#e0584f');

  // Derived, palette-relative shades.
  const comment = mix(baseContent, base100, 0.45);
  const typeColor = mix(secondary, baseContent, 0.65);
  const funcColor = mix(primary, baseContent, 0.55);
  const punctuation = mix(baseContent, base100, 0.75);
  const lineNumber = mix(baseContent, base100, 0.4);

  const noHash = (hex: string) => hex.slice(1);
  const isDark = relLuminance(base100) < 0.5;

  return {
    base: isDark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: noHash(comment), fontStyle: 'italic' },
      { token: 'keyword', foreground: noHash(primary) },
      { token: 'keyword.control', foreground: noHash(primary) },
      { token: 'string', foreground: noHash(secondary) },
      { token: 'number', foreground: noHash(accent) },
      { token: 'constant', foreground: noHash(accent) },
      { token: 'type', foreground: noHash(typeColor) },
      { token: 'type.identifier', foreground: noHash(typeColor) },
      { token: 'function', foreground: noHash(funcColor) },
      { token: 'variable', foreground: noHash(baseContent) },
      { token: 'operator', foreground: noHash(punctuation) },
      { token: 'delimiter', foreground: noHash(punctuation) }
    ],
    colors: {
      'editor.background': base100,
      'editor.foreground': baseContent,
      'editorLineNumber.foreground': lineNumber,
      'editorLineNumber.activeForeground': baseContent,
      'editorCursor.foreground': primary,
      'editor.selectionBackground': alpha(primary, '40'),
      'editor.inactiveSelectionBackground': alpha(primary, '20'),
      'editor.lineHighlightBackground': alpha(baseContent, '0d'),
      'editor.lineHighlightBorder': '#00000000',
      'editorIndentGuide.background1': alpha(baseContent, '12'),
      'editorIndentGuide.activeBackground1': alpha(primary, '55'),
      'editorWhitespace.foreground': alpha(baseContent, '14'),
      'editorBracketMatch.background': alpha(primary, '22'),
      'editorBracketMatch.border': primary,
      'editorGutter.background': base100,
      'editorWidget.background': base200,
      'editorWidget.border': base300,
      'editorSuggestWidget.background': base200,
      'editorSuggestWidget.selectedBackground': alpha(primary, '22'),
      'editorHoverWidget.background': base200,
      'scrollbarSlider.background': alpha(baseContent, '20'),
      'scrollbarSlider.hoverBackground': alpha(baseContent, '30'),
      'scrollbarSlider.activeBackground': alpha(primary, '55'),
      'editorError.foreground': error,
      focusBorder: primary
    }
  };
}

// ---------------------------------------------------------------------------
// Registration + auto-sync
// ---------------------------------------------------------------------------

let observerInstalled = false;

function applyTheme(m: typeof monaco): void {
  m.editor.defineTheme(ANIMORANK_MONACO_THEME, buildThemeData());
}

/**
 * Defines the AnimoRank Monaco theme from the live daisyUI palette and keeps it
 * in sync with `data-theme` changes. Idempotent and SSR-safe (no-op without a
 * document). Call before creating an editor, then pass `ANIMORANK_MONACO_THEME`
 * as the editor `theme` option.
 */
export function registerAnimorankMonacoTheme(m: typeof monaco): void {
  if (typeof document === 'undefined') return;

  applyTheme(m);

  if (observerInstalled) return;
  observerInstalled = true;

  const observer = new MutationObserver(() => {
    applyTheme(m);
    // Re-applying the active theme by name re-renders every open editor.
    m.editor.setTheme(ANIMORANK_MONACO_THEME);
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class']
  });
}
