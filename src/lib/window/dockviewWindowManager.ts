import { createDockview, type AddPanelPositionOptions, type DockviewApi, type SerializedDockview } from 'dockview-core';
import { themeAnimoRank } from './animorank-theme';
import { Window } from './index';
import { WindowRegistry } from './windowRegistry';
import { WindowTab } from './windowTab';
import { defaultLayoutToDockview, pruneDockviewLayout, type DefaultLayout, type LayoutSize } from './layout';

export interface DockviewWindowManagerOptions {
  /**
   * localStorage key scoping the persisted layout to this editor. Omit to
   * disable persistence.
   *
   * A saved layout wins over `defaultLayout`, so changing the default only
   * reaches people whose saved layout is gone: every change to `defaultLayout`
   * needs a new key. Date the key `YYYY-MM-DD` with the day the change landed
   * (`solve-layout-2026-09-18`) rather than numbering it `v3`. ISO dates still
   * sort into order, and they answer the question a retired key actually
   * raises — how long ago was this, and has every browser holding it had a
   * chance to be swept? — which a version number cannot. Retire the old key
   * by passing it to `discardSavedLayouts` on mount. If two changes land on
   * one day, suffix the second `-2`.
   */
  storageKey?: string;
  /**
   * The layout to restore when no saved layout exists.
   */
  defaultLayout?: DefaultLayout;
}

/**
 * Opens (or focuses) a window in the dockview, optionally placing it. The
 * window type is erased on purpose: a page context hands this to plugins, which
 * have no business knowing the windows of the page they run on.
 */
export type OpenWindow = (
  _key: string,
  _positions?: AddPanelPositionOptions | AddPanelPositionOptions[]
) => Promise<unknown>;

/**
 * Delete every persisted layout whose key starts with `keyPrefix`.
 *
 * Renaming a `storageKey` orphans whatever was saved under the old name: no
 * code reads it again, but it sits in the visitor's browser indefinitely. Call
 * this once on mount with the retired prefix and the entries are swept the
 * first time the page loads. Safe to call repeatedly — after the first sweep
 * there is nothing left to match — and safe to delete once the retired keys
 * have had time to disappear from the browsers that hold them.
 *
 * `keyPrefix` is matched with `startsWith`, so it must not be a prefix of the
 * live key — that would delete the layout it is meant to preserve on every
 * mount.
 */
export function discardSavedLayouts(keyPrefix: string): void {
  try {
    for (const key of Object.keys(localStorage).filter((candidate) => candidate.startsWith(keyPrefix))) {
      localStorage.removeItem(key);
    }
  } catch {
    // localStorage unavailable (private mode, quota) — nothing to clean up.
  }
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
  /**
   * Whether {@link destroy} has run. `attach` and `openWindow` await while they
   * build windows, so a component that unmounts mid-attach (a panel the user
   * closed while the dock was still coming up) would otherwise keep creating
   * panels on a disposed dockview — or a dockview that was never disposed,
   * because it was created after the teardown.
   */
  private destroyed = false;

  constructor(context: T, windowRegistry: WindowRegistry<T>, options: DockviewWindowManagerOptions = {}) {
    this.context = context;
    this.windowRegistry = windowRegistry;
    this.storageKey = options.storageKey;
    this.defaultLayout = options.defaultLayout;
  }

  public async attach(root: HTMLDivElement): Promise<void> {
    if (this.destroyed) return;

    // Pre-ensure every registered window so dockview's synchronous callbacks
    // below can read the populated map (they must not await).
    await Promise.all(this.windowRegistry.keys().map((key) => this.ensureWindow(key)));
    // The awaits above are the gaps a teardown can land in; every one of them
    // is followed by this check, so nothing below runs for a destroyed manager.
    if (this.destroyed) return;

    this.dockview = createDockview(root, {
      theme: themeAnimoRank,
      // A default tab component name routes every tab through
      // createTabComponent, which supplies the closable-tab renderer.
      defaultTabComponent: 'window-tab',
      createComponent: (options) => this.windows.get(options.id)!.getRenderer(),
      createTabComponent: (options) => (this.windows.get(options.id)!.closable ? new WindowTab(true) : undefined)
    });

    const serialized = this.loadSavedLayout() ?? (await this.buildDefaultLayout(root));
    if (this.destroyed) return;

    if (serialized) {
      try {
        this.dockview.fromJSON(serialized);
      } catch {
        // dockview logs and reverts on deserialization failure; fall back to
        // opening every registered window.
        for (const key of this.windowRegistry.keys()) {
          if (this.destroyed) return;
          await this.openWindow(key);
        }
      }
    } else {
      for (const key of this.windowRegistry.keys()) {
        if (this.destroyed) return;
        await this.openWindow(key);
      }
    }

    if (this.storageKey) {
      this.layoutChangeSubscription = this.dockview.onDidLayoutChange(() => this.scheduleSave());
    }
  }

  /**
   * Open the window, focusing it when it is already open. When it needs to be
   * created, `positions` (a single position or a list of candidates) places
   * the panel relative to an existing panel or group; the first candidate
   * whose reference is open is used.
   */
  public async openWindow(
    key: string,
    positions?: AddPanelPositionOptions | AddPanelPositionOptions[]
  ): Promise<Window<T>> {
    const window = await this.ensureWindow(key);
    const panel = this.dockview?.getPanel(key);
    if (panel) {
      panel.api.setActive();
    } else {
      const position = this.resolvePosition(positions);
      this.dockview?.addPanel({
        id: key,
        title: window.title,
        component: 'default',
        ...(position !== undefined ? { position } : {})
      });
      // Positioned additions are not activated by dockview; focus the panel.
      this.dockview?.getPanel(key)?.api.setActive();
    }
    return window;
  }

  private resolvePosition(
    positions: AddPanelPositionOptions | AddPanelPositionOptions[] | undefined
  ): AddPanelPositionOptions | undefined {
    if (!positions || !this.dockview) {
      return undefined;
    }
    const candidates = Array.isArray(positions) ? positions : [positions];
    return candidates.find((position) => this.isPositionUsable(position));
  }

  private isPositionUsable(position: AddPanelPositionOptions): boolean {
    if (!this.dockview) {
      return false;
    }
    if ('referencePanel' in position) {
      const id = typeof position.referencePanel === 'string' ? position.referencePanel : position.referencePanel.id;
      return this.dockview.getPanel(id) !== undefined;
    }
    if ('referenceGroup' in position) {
      return typeof position.referenceGroup === 'string'
        ? this.dockview.getGroup(position.referenceGroup) !== undefined
        : true;
    }
    return true;
  }

  public destroy(): void {
    this.destroyed = true;
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

  private async ensureWindow(key: string): Promise<Window<T>> {
    const existing = this.windows.get(key);
    if (existing) {
      return existing;
    }
    const window = await this.windowRegistry.getInstance(key, this.context);
    if (this.destroyed) {
      // The manager was torn down while this window was being built. `destroy()`
      // has already cleared the map, so nothing else will ever release it.
      window.destroy();
    } else {
      this.windows.set(key, window);
    }
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

  private async buildDefaultLayout(root: HTMLDivElement): Promise<SerializedDockview | undefined> {
    if (!this.defaultLayout) {
      return undefined;
    }
    const size: LayoutSize = {
      width: root.clientWidth || window.innerWidth,
      height: root.clientHeight || window.innerHeight
    };
    const titles = new Map<string, string>();
    for (const key of this.windowRegistry.keys()) {
      titles.set(key, (await this.windowRegistry.getStatic(key)).title);
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
