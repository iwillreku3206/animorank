import { describe, expect, it, vi } from 'vitest';
import { DockviewWindowManager } from './dockviewWindowManager';
import type { Window } from './index';
import type { WindowRegistry } from './windowRegistry';

/** The dockview the manager would build, stood in for so no DOM is needed. */
const dockview = { dispose: vi.fn(), fromJSON: vi.fn(), addPanel: vi.fn(), getPanel: vi.fn(() => undefined) };
const mocks = vi.hoisted(() => ({ createDockview: vi.fn() }));

vi.mock('dockview-core', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createDockview: mocks.createDockview
}));

/** A promise the test resolves by hand, to hold a window's construction open. */
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

/** A window built by the registry; only what the manager uses matters here. */
function fakeWindow(destroy: () => void): Window<unknown> {
  return { title: 'window', closable: false, destroy } as unknown as Window<unknown>;
}

/** A registry whose windows the manager builds through `getInstance`. */
function registryOf(keys: string[], build: (_key: string) => Promise<Window<unknown>>): WindowRegistry<unknown> {
  return {
    keys: () => keys,
    getInstance: (key: string) => build(key),
    getStatic: async (key: string) => ({ title: key })
  } as unknown as WindowRegistry<unknown>;
}

describe('DockviewWindowManager teardown during attach', () => {
  it('builds no dockview and releases the window when torn down mid-attach', async () => {
    mocks.createDockview.mockReset();
    mocks.createDockview.mockReturnValue(dockview);
    const gate = deferred();
    const destroy = vi.fn();
    const registry = registryOf(['panel'], async () => {
      await gate.promise;
      return fakeWindow(destroy);
    });
    const manager = new DockviewWindowManager({}, registry);

    const attaching = manager.attach({} as HTMLDivElement);
    // The component unmounts while its window is still being built.
    manager.destroy();
    gate.resolve();
    await attaching;

    expect(mocks.createDockview).not.toHaveBeenCalled();
    // The window that arrived after the teardown is released, not leaked.
    expect(destroy).toHaveBeenCalled();
  });

  it('opens its windows when nothing tears it down', async () => {
    mocks.createDockview.mockReset();
    mocks.createDockview.mockReturnValue(dockview);
    dockview.addPanel.mockClear();
    const destroy = vi.fn();
    const registry = registryOf(['panel'], async () => fakeWindow(destroy));

    await new DockviewWindowManager({}, registry).attach({} as HTMLDivElement);

    expect(mocks.createDockview).toHaveBeenCalledTimes(1);
    expect(dockview.addPanel).toHaveBeenCalledWith(expect.objectContaining({ id: 'panel' }));
    expect(destroy).not.toHaveBeenCalled();
  });

  it('ignores an open after teardown', async () => {
    mocks.createDockview.mockReset();
    mocks.createDockview.mockReturnValue(dockview);
    dockview.addPanel.mockClear();
    const manager = new DockviewWindowManager(
      {},
      registryOf(['panel'], async () => fakeWindow(vi.fn()))
    );
    await manager.attach({} as HTMLDivElement);
    dockview.addPanel.mockClear();

    manager.destroy();
    await manager.openWindow('panel');

    expect(dockview.addPanel).not.toHaveBeenCalled();
  });
});
