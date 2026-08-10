import type { Component } from 'svelte';

export interface ChangelogEntry {
  /** Stable anchor (`/changelog#slug`) and RSS GUID, derived from the filename. */
  slug: string;
  /** ISO date (YYYY-MM-DD) the change shipped. Drives ordering. */
  date: string;
  title: string;
  /** One-line summary used in the RSS feed and as the page meta description. */
  summary: string;
  /** Rendered Markdown body, as a Svelte component. */
  body: Component;
}

interface EntryModule {
  // YAML auto-parses an unquoted `date: 2026-06-24` into a Date, so accept both
  // and normalize to a YYYY-MM-DD string below.
  metadata: { date: string | Date; title: string; summary: string };
  default: Component;
}

const toIsoDate = (d: string | Date): string => (d instanceof Date ? d.toISOString() : d).slice(0, 10);

// Eagerly bundle every entry. Content lives in src/lib (not src/routes) so the
// `.svx` files are never treated as standalone pages.
const modules = import.meta.glob<EntryModule>('./entries/*.svx', { eager: true });

/** All published entries, newest first. */
export const entries: ChangelogEntry[] = Object.entries(modules)
  .map(([path, mod]) => ({
    slug: path
      .split('/')
      .pop()!
      .replace(/\.svx$/, ''),
    body: mod.default,
    ...mod.metadata,
    date: toIsoDate(mod.metadata.date)
  }))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
