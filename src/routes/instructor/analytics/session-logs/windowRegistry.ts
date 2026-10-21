import { WindowRegistry } from '$lib/window/windowRegistry';
import type { SessionLogsViewContext } from './context.svelte';
import { RawLogsWindow } from './windows/RawLogs.window';

/**
 * Every view the session-logs page can show, keyed by view id. The page renders
 * one tab per key and hands every view the page's `SessionLogsViewContext`. A
 * plugin adds a view with its own registrar
 * (`getRegistrarById('window.session_logs')`), which qualifies its key with the
 * plugin id — `session-replay:replay` for the bundled replay plugin.
 */
export class SessionLogsWindowRegistry extends WindowRegistry<SessionLogsViewContext> {
  public id = 'window.session_logs';

  constructor() {
    super();

    this.register('raw_logs', RawLogsWindow);
  }
}
