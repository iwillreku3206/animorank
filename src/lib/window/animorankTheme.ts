import type { DockviewTheme } from 'dockview-core';

/**
 * AnimoRank's custom dockview theme.
 *
 * This is a *full* theme: every consumed `--dv-*` variable is defined from
 * scratch in `animorank-theme.css` under the `.dockview-theme-animorank`
 * class, so it does not depend on any of the stock dockview themes.
 *
 * The color variables are bound to daisyUI's `--color-*` tokens, so the dock
 * automatically tracks the active daisyUI theme (including light/dark).
 * Structural variables (heights, radii, gaps) are literal values.
 */
export const themeAnimoRank: DockviewTheme = {
  name: 'animorank',
  className: 'dockview-theme-animorank',
  colorScheme: 'dark',
  gap: 8,
  dndPanelOverlay: 'group',
  dndOverlayMounting: 'absolute'
};
