import {
  Orientation,
  type GroupviewPanelState,
  type SerializedDockview,
  type SerializedGridObject
} from 'dockview-core';

/**
 * The serialized state of a dockview group, i.e. the leaf data of the grid
 * tree. dockview's own `GroupPanelViewState` is not re-exported from the
 * package root, so this mirrors its shape.
 */
export interface GroupPanelViewState {
  id: string;
  views: string[];
  activeView?: string;
}

/**
 * A group of windows shown as tabs in a single pane. `active` selects the
 * tab shown by default; it falls back to the first tab.
 */
export interface WindowTabs {
  tabs: string[];
  active?: string;
}

export type PaneChild = Pane | string | WindowTabs;

/**
 * A declarative default layout for the dockview. The top-level `panes` are
 * arranged side by side; each `Pane` describes how its own children are
 * arranged, where a string child is the id of a registered window and a
 * `WindowTabs` child is a group of windows sharing the pane as tabs.
 */
export interface Pane {
  children: PaneChild[];
  orientation: 'horizontal' | 'vertical';
}

export interface DefaultLayout {
  panes: Pane[];
}

export interface LayoutSize {
  width: number;
  height: number;
}

type Axis = 'HORIZONTAL' | 'VERTICAL';

const ORIENTATION: Record<Pane['orientation'], Axis> = {
  horizontal: 'HORIZONTAL',
  vertical: 'VERTICAL'
};

/**
 * dockview grids alternate the split axis at every depth, starting
 * horizontal at the root (see `Gridview._deserializeNode`).
 */
const axisAt = (depth: number): Axis => (depth % 2 === 0 ? 'HORIZONTAL' : 'VERTICAL');

const extentAlong = (axis: Axis, size: LayoutSize): number => (axis === 'HORIZONTAL' ? size.width : size.height);

interface BuildState {
  size: LayoutSize;
  titles: ReadonlyMap<string, string>;
  panels: Record<string, GroupviewPanelState>;
  used: Set<string>;
  firstPanelId: string | undefined;
}

function isWindowTabs(child: PaneChild): child is WindowTabs {
  return typeof child !== 'string' && 'tabs' in child;
}

function isPlaceable(child: PaneChild, state: BuildState): boolean {
  if (typeof child === 'string') {
    return !state.used.has(child) && state.titles.has(child);
  }
  if (isWindowTabs(child)) {
    return child.tabs.some((id) => !state.used.has(id) && state.titles.has(id));
  }
  return child.children.some((grandchild) => isPlaceable(grandchild, state));
}

function registerWindow(id: string, state: BuildState): void {
  state.panels[id] = { id, title: state.titles.get(id), contentComponent: 'default' };
  state.firstPanelId ??= id;
}

function leafNode(id: string, size: number, state: BuildState): SerializedGridObject<GroupPanelViewState> | undefined {
  if (state.used.has(id)) {
    return undefined;
  }
  state.used.add(id);
  registerWindow(id, state);
  return {
    type: 'leaf',
    data: { id: `${id}-group`, views: [id], activeView: id },
    size
  };
}

function tabsNode(
  tabs: WindowTabs,
  size: number,
  state: BuildState
): SerializedGridObject<GroupPanelViewState> | undefined {
  const views: string[] = [];
  for (const id of tabs.tabs) {
    if (state.titles.has(id) && !state.used.has(id)) {
      state.used.add(id);
      views.push(id);
      registerWindow(id, state);
    }
  }
  if (views.length === 0) {
    return undefined;
  }
  const activeView = tabs.active !== undefined && views.includes(tabs.active) ? tabs.active : views[0];
  return {
    type: 'leaf',
    data: { id: `${views[0]}-group`, views, activeView },
    size
  };
}

function paneNode(
  pane: Pane,
  depth: number,
  size: number,
  state: BuildState
): SerializedGridObject<GroupPanelViewState> | undefined {
  const childAxis = ORIENTATION[pane.orientation];
  // Children of this pane are arranged along `childAxis`, but the axis at any
  // depth is fixed by parity. A mismatch needs a single-child wrapper branch
  // to flip the axis for the children.
  const childDepth = childAxis === axisAt(depth) ? depth + 1 : depth + 2;
  const children = buildChildren(pane.children, childDepth, state);
  if (children.length === 0) {
    return undefined;
  }
  if (children.length === 1) {
    // Collapse the pane to its single child, sized to the pane's own slot.
    return { ...children[0], size };
  }
  const branch: SerializedGridObject<GroupPanelViewState> = {
    type: 'branch',
    data: children,
    size
  };
  return childDepth === depth + 1 ? branch : { type: 'branch', data: [branch], size };
}

function buildChildren(
  children: PaneChild[],
  depth: number,
  state: BuildState
): SerializedGridObject<GroupPanelViewState>[] {
  const placeable = children.filter((child) => isPlaceable(child, state));
  if (placeable.length === 0) {
    return [];
  }
  // Equal split: the current extent along the split axis divided by the
  // number of panes in the split.
  const childSize = extentAlong(axisAt(depth - 1), state.size) / placeable.length;
  const nodes: SerializedGridObject<GroupPanelViewState>[] = [];
  for (const child of placeable) {
    let node: SerializedGridObject<GroupPanelViewState> | undefined;
    if (typeof child === 'string') {
      node = leafNode(child, childSize, state);
    } else if (isWindowTabs(child)) {
      node = tabsNode(child, childSize, state);
    } else {
      node = paneNode(child, depth, childSize, state);
    }
    if (node) {
      nodes.push(node);
    }
  }
  return nodes;
}

/**
 * Convert a `DefaultLayout` into the serialized form `DockviewApi.fromJSON`
 * consumes, sized from the given container dimensions. Windows not present in
 * `titles` (i.e. not registered) and duplicate window ids are dropped; returns
 * `undefined` when nothing placeable remains.
 */
export function defaultLayoutToDockview(
  layout: DefaultLayout,
  size: LayoutSize,
  titles: ReadonlyMap<string, string>
): SerializedDockview | undefined {
  const state: BuildState = { size, titles, panels: {}, used: new Set(), firstPanelId: undefined };
  const panes = buildChildren(layout.panes, 1, state);
  if (panes.length === 0) {
    return undefined;
  }
  return {
    grid: {
      root: { type: 'branch', data: panes, size: size.width },
      width: size.width,
      height: size.height,
      orientation: Orientation.HORIZONTAL
    },
    panels: state.panels,
    ...(state.firstPanelId !== undefined ? { activeGroup: state.firstPanelId } : {})
  };
}

function pruneNode(
  node: SerializedGridObject<GroupPanelViewState> | undefined,
  valid: Set<string>
): SerializedGridObject<GroupPanelViewState> | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  if (node.type === 'branch') {
    if (!Array.isArray(node.data)) {
      return undefined;
    }
    const children = node.data
      .map((child) => pruneNode(child, valid))
      .filter((child): child is SerializedGridObject<GroupPanelViewState> => child !== undefined);
    if (children.length === 0) {
      return undefined;
    }
    if (children.length === 1) {
      return children[0];
    }
    return { type: 'branch', data: children, size: node.size };
  }
  const data = node.data as GroupPanelViewState;
  if (!data || !Array.isArray(data.views)) {
    return undefined;
  }
  const views = data.views.filter((id) => valid.has(id));
  if (views.length === 0) {
    return undefined;
  }
  const activeView = data.activeView !== undefined && views.includes(data.activeView) ? data.activeView : views[0];
  return { type: 'leaf', data: { ...data, views, activeView }, size: node.size };
}

/**
 * Remove windows that are no longer registered from a saved layout, collapsing
 * branches that end up empty. Returns `undefined` when the layout is
 * malformed or nothing valid remains.
 */
export function pruneDockviewLayout(
  serialized: SerializedDockview,
  validIds: ReadonlySet<string>
): SerializedDockview | undefined {
  if (!serialized || typeof serialized !== 'object' || !serialized.grid || typeof serialized.grid !== 'object') {
    return undefined;
  }
  const valid = new Set(validIds);
  const root = pruneNode(serialized.grid.root, valid);
  if (!root) {
    return undefined;
  }
  const activeGroup =
    serialized.activeGroup !== undefined && valid.has(serialized.activeGroup) ? serialized.activeGroup : undefined;
  return {
    grid: { ...serialized.grid, root },
    panels: serialized.panels,
    ...(activeGroup !== undefined ? { activeGroup } : {})
  };
}
