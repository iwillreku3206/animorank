import { describe, expect, it } from 'vitest';
import { Orientation, type SerializedDockview, type SerializedGridObject } from 'dockview-core';
import { defaultLayoutToDockview, pruneDockviewLayout, type DefaultLayout, type GroupPanelViewState } from './layout';

const size = { width: 1200, height: 800 };

const titles = new Map([
  ['metadata', 'Metadata'],
  ['starter_code', 'Starter Code'],
  ['properties', 'Properties'],
  ['functions', 'Functions'],
  ['test_cases', 'Test Cases']
]);

const valid = new Set(titles.keys());

type Node = SerializedGridObject<GroupPanelViewState>;

const asBranch = (node: Node): Node[] => node.data as Node[];

describe('defaultLayoutToDockview', () => {
  it('builds the default editor layout with tab groups and equal splits', () => {
    const layout: DefaultLayout = {
      panes: [
        {
          orientation: 'vertical',
          children: [{ tabs: ['metadata', 'properties'], active: 'metadata' }, 'starter_code']
        },
        {
          orientation: 'vertical',
          children: [{ tabs: ['functions', 'test_cases'], active: 'test_cases' }]
        }
      ]
    };

    const serialized = defaultLayoutToDockview(layout, size, titles);
    expect(serialized).toBeDefined();

    const root = serialized!.grid.root;
    expect(root.type).toBe('branch');
    expect(serialized!.grid.orientation).toBe(Orientation.HORIZONTAL);
    expect(serialized!.grid.root.size).toBe(1200);

    // Two top-level panes side by side, size = width / 2.
    const [left, right] = asBranch(root);
    expect([left.size, right.size]).toEqual([600, 600]);

    // Left pane is vertical: top-left tab group over starter code, size = height / 2.
    expect(asBranch(left).map((c) => c.size)).toEqual([400, 400]);
    const [topLeft, starter] = asBranch(left);
    expect((topLeft as { data: GroupPanelViewState }).data).toEqual({
      id: 'metadata-group',
      views: ['metadata', 'properties'],
      activeView: 'metadata'
    });
    expect((starter as { data: GroupPanelViewState }).data).toEqual({
      id: 'starter_code-group',
      views: ['starter_code'],
      activeView: 'starter_code'
    });

    // Right pane has a single tab-group child and collapses to its leaf.
    expect((right as { data: GroupPanelViewState }).data).toEqual({
      id: 'functions-group',
      views: ['functions', 'test_cases'],
      activeView: 'test_cases'
    });

    // Every window gets a panel state with its title and the default component.
    expect(Object.keys(serialized!.panels).sort()).toEqual([
      'functions',
      'metadata',
      'properties',
      'starter_code',
      'test_cases'
    ]);
    expect(serialized!.panels['properties']).toEqual({
      id: 'properties',
      title: 'Properties',
      contentComponent: 'default'
    });
    // The first tab of the first group becomes the active group.
    expect(serialized!.activeGroup).toBe('metadata');
  });

  it('falls back to the first tab when the active tab is missing', () => {
    const layout: DefaultLayout = {
      panes: [
        {
          orientation: 'vertical',
          children: [{ tabs: ['metadata', 'properties'], active: 'ghost' }]
        }
      ]
    };

    const serialized = defaultLayoutToDockview(layout, size, titles);
    // The single tab-group child collapses the pane into a leaf under the root.
    const [tabs] = asBranch(serialized!.grid.root);
    expect((tabs as { data: GroupPanelViewState }).data.activeView).toBe('metadata');
  });

  it('keeps only the valid, unused tabs of a tab group', () => {
    const layout: DefaultLayout = {
      panes: [
        {
          orientation: 'vertical',
          children: [{ tabs: ['metadata', 'ghost', 'metadata', 'test_cases'] }]
        }
      ]
    };

    const serialized = defaultLayoutToDockview(layout, size, titles);
    const [tabs] = asBranch(serialized!.grid.root);
    expect((tabs as { data: GroupPanelViewState }).data).toEqual({
      id: 'metadata-group',
      views: ['metadata', 'test_cases'],
      activeView: 'metadata'
    });
  });

  it('wraps panes whose orientation mismatches the depth parity', () => {
    // Top-level panes sit at depth 1 (vertical axis); a horizontal pane needs
    // a wrapper branch to flip the axis back.
    const layout: DefaultLayout = {
      panes: [{ orientation: 'horizontal', children: ['metadata', 'test_cases'] }]
    };

    const serialized = defaultLayoutToDockview(layout, size, titles);
    const root = serialized!.grid.root;
    const [wrapper] = asBranch(root);
    expect(asBranch(wrapper)).toHaveLength(1);
    const [pane] = asBranch(wrapper);
    expect(asBranch(pane).map((c) => (c as { data: GroupPanelViewState }).data.views)).toEqual([
      ['metadata'],
      ['test_cases']
    ]);
    expect(asBranch(pane).map((c) => c.size)).toEqual([600, 600]);
  });

  it('drops unregistered windows and re-splits equally', () => {
    const layout: DefaultLayout = {
      panes: [{ orientation: 'vertical', children: ['metadata', 'ghost', 'test_cases'] }]
    };

    const serialized = defaultLayoutToDockview(layout, size, titles);
    const [pane] = asBranch(serialized!.grid.root);
    // Vertical split at depth 1: two remaining children, size = height / 2.
    expect(asBranch(pane).map((c) => c.size)).toEqual([400, 400]);
    expect(serialized!.panels['ghost']).toBeUndefined();
    expect(serialized!.activeGroup).toBe('metadata');
  });

  it('deduplicates repeated window ids, keeping the first occurrence', () => {
    const layout: DefaultLayout = {
      panes: [{ orientation: 'vertical', children: ['metadata', 'metadata', 'test_cases'] }]
    };

    const serialized = defaultLayoutToDockview(layout, size, titles);
    const [pane] = asBranch(serialized!.grid.root);
    expect(asBranch(pane)).toHaveLength(2);
    expect(asBranch(pane).map((c) => (c as { data: GroupPanelViewState }).data.views)).toEqual([
      ['metadata'],
      ['test_cases']
    ]);
  });

  it('returns undefined when nothing is placeable', () => {
    const layout: DefaultLayout = {
      panes: [{ orientation: 'vertical', children: ['ghost', 'poltergeist'] }]
    };
    expect(defaultLayoutToDockview(layout, size, titles)).toBeUndefined();
  });
});

describe('pruneDockviewLayout', () => {
  const saved: SerializedDockview = {
    grid: {
      root: {
        type: 'branch',
        data: [
          {
            type: 'leaf',
            data: { id: 'g1', views: ['metadata'], activeView: 'metadata' },
            size: 600
          },
          {
            type: 'branch',
            data: [
              { type: 'leaf', data: { id: 'g2', views: ['ghost'], activeView: 'ghost' }, size: 400 },
              {
                type: 'leaf',
                data: { id: 'g3', views: ['test_cases'], activeView: 'test_cases' },
                size: 400
              }
            ],
            size: 800
          }
        ],
        size: 1200
      },
      width: 1200,
      height: 800,
      orientation: Orientation.HORIZONTAL
    },
    panels: {
      metadata: { id: 'metadata' },
      ghost: { id: 'ghost' },
      test_cases: { id: 'test_cases' }
    },
    activeGroup: 'metadata'
  };

  it('removes groups with unregistered windows and collapses single-child branches', () => {
    const pruned = pruneDockviewLayout(saved, valid);
    const root = pruned!.grid.root;
    // The ghost group is dropped; its branch collapses to the test_cases leaf.
    expect(asBranch(root).map((c) => (c as { data: GroupPanelViewState }).data.views)).toEqual([
      ['metadata'],
      ['test_cases']
    ]);
    expect(pruned!.activeGroup).toBe('metadata');
  });

  it('keeps the valid subset of views in a tab group', () => {
    const mixed = structuredClone(saved);
    (asBranch(mixed.grid.root)[0] as { data: GroupPanelViewState }).data = {
      id: 'g1',
      views: ['metadata', 'ghost'],
      activeView: 'ghost'
    };

    const pruned = pruneDockviewLayout(mixed, valid);
    const [first] = asBranch(pruned!.grid.root);
    expect((first as { data: GroupPanelViewState }).data).toEqual({
      id: 'g1',
      views: ['metadata'],
      activeView: 'metadata'
    });
  });

  it('drops a stale activeGroup', () => {
    const stale = structuredClone(saved);
    stale.activeGroup = 'ghost';

    const pruned = pruneDockviewLayout(stale, valid);
    expect(pruned!.activeGroup).toBeUndefined();
  });

  it('returns undefined when nothing valid remains', () => {
    const empty = structuredClone(saved);
    empty.grid.root = { type: 'branch', data: [], size: 1200 };
    expect(pruneDockviewLayout(empty, valid)).toBeUndefined();
  });

  it('returns undefined for malformed input', () => {
    expect(pruneDockviewLayout(undefined as unknown as SerializedDockview, valid)).toBeUndefined();
    expect(pruneDockviewLayout({} as SerializedDockview, valid)).toBeUndefined();
  });
});
