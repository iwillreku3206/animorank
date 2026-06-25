import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

// Keep the mobile browser chrome (address bar) in step with the surface. Values
// track base-300 of each daisyUI theme.
const META_COLOR: Record<Theme, string> = {
  dark: '#141414',
  light: '#d4dde4'
};

function read(): Theme {
  if (!browser) return 'dark';
  return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

function apply(theme: Theme) {
  if (!browser) return;
  document.documentElement.setAttribute('data-theme', `animorank-${theme}`);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme]);
}

let current = $state<Theme>(read());

export const theme = {
  get current() {
    return current;
  },
  set(next: Theme) {
    if (next === current) return;
    current = next;
    if (browser) localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  },
  toggle() {
    theme.set(current === 'dark' ? 'light' : 'dark');
  }
};
