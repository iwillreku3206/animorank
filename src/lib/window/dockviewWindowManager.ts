import { createDockview, type DockviewApi, type SerializedDockview } from 'dockview-core';
import { themeAnimoRank } from './animorank-theme';
import { Window } from './index';
import { WindowRegistry } from './windowRegistry';
import { defaultLayoutToDockview, pruneDockviewLayout, type DefaultLayout, type LayoutSize } from './layout';

export interface DockviewWindowManagerOptions {
  /**
   * localStorage key scoping the persisted layout to this editor. Omit to
   * disable persistence.
   */
  storageKey?: string;
  /**
   * The layout to restore when no saved layout exists.
   */
  defaultLayout?: DefaultLayout;
}

/**
 * Owns the dockview instance and the windows opened in it. Attach a root
 * element to restore the saved layout (or the default layout, or every
 * registered window), open or focus additional windows by key, and dispose on
 * teardown. When a `storageKey` is configured, layout changes are
 * automatically persisted to localStorage (debounced).
 */
export class DockviewWindowManager<T> {
  private dockview: DockviewApi | undefined;
  private readonly windows = new Map<string, Window<T>>();
  private readonly context: T;
  private readonly windowRegistry: WindowRegistry<T>;
  private readonly storageKey: string | undefined;
  private readonly defaultLayout: DefaultLayout | undefined;
  private layoutChangeSubscription: { dispose(): void } | undefined;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(context: T, windowRegistry: WindowRegistry<T>, options: DockviewWindowManagerOptions = {}) {
    this.context = context;
    this.windowRegistry = windowRegistry;
    this.storageKey = options.storageKey;
    this.defaultLayout = options.defaultLayout;
  }

  public attach(root: HTMLDivElement): void {
    this.dockview = createDockview(root, {
      theme: themeAnimoRank,
      createComponent: (options) => this.ensureWindow(options.id).getRenderer()
    });

    const serialized = this.loadSavedLayout() ?? this.buildDefaultLayout(root);
    if (serialized) {
      try {
        this.dockview.fromJSON(serialized);
      } catch {
        // dockview logs and reverts on deserialization failure; fall back to
        // opening every registered window.
        for (const key of this.windowRegistry.keys()) {
          this.openWindow(key);
        }
      }
    } else {
      for (const key of this.windowRegistry.keys()) {
        this.openWindow(key);
      }
    }

    if (this.storageKey) {
      this.layoutChangeSubscription = this.dockview.onDidLayoutChange(() => this.scheduleSave());
    }
  }

  public openWindow(key: string): Window<T> {
    const window = this.ensureWindow(key);
    const panel = this.dockview?.getPanel(key);
    if (panel) {
      panel.api.setActive();
    } else {
      this.dockview?.addPanel({ id: key, title: window.title, component: 'default' });
    }
    return window;
  }

  public destroy(): void {
    this.layoutChangeSubscription?.dispose();
    this.layoutChangeSubscription = undefined;
    if (this.saveTimer !== undefined) {
      clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
      // Flush the last pending change so teardown doesn't drop it.
      this.saveNow();
    }
    for (const window of this.windows.values()) {
      window.destroy();
    }
    this.windows.clear();
    this.dockview?.dispose();
    this.dockview = undefined;
  }

  private ensureWindow(key: string): Window<T> {
    const existing = this.windows.get(key);
    if (existing) {
      return existing;
    }
    const window = this.windowRegistry.getInstance(key, this.context);
    this.windows.set(key, window);
    return window;
  }

  private loadSavedLayout(): SerializedDockview | undefined {
    if (!this.storageKey) {
      return undefined;
    }
    let raw: string | null;
    try {
      raw = localStorage.getItem(this.storageKey);
    } catch {
      return undefined;
    }
    if (!raw) {
      return undefined;
    }
    try {
      return pruneDockviewLayout(JSON.parse(raw) as SerializedDockview, new Set(this.windowRegistry.keys()));
    } catch {
      return undefined;
    }
  }

  private buildDefaultLayout(root: HTMLDivElement): SerializedDockview | undefined {
    if (!this.defaultLayout) {
      return undefined;
    }
    const size: LayoutSize = {
      width: root.clientWidth || window.innerWidth,
      height: root.clientHeight || window.innerHeight
    };
    const titles = new Map<string, string>();
    for (const key of this.windowRegistry.keys()) {
      titles.set(key, this.windowRegistry.getStatic(key).title);
    }
    return defaultLayoutToDockview(this.defaultLayout, size, titles);
  }

  private scheduleSave(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      this.saveNow();
    }, 300);
  }

  private saveNow(): void {
    if (!this.storageKey || !this.dockview) {
      return;
    }
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.dockview.toJSON()));
    } catch {
      // localStorage unavailable (private mode, quota) — skip persistence.
    }
  }
}
