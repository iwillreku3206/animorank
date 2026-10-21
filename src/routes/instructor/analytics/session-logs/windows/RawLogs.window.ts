import { Window } from '$lib/window';
import type { SessionLogsViewContext } from '../context.svelte';
import RawLogs from './RawLogs.window.svelte';

export class RawLogsWindow extends Window<SessionLogsViewContext> {
  static title = 'Raw logs';
  static closeable = false;
  constructor(context: SessionLogsViewContext) {
    super({ title: RawLogsWindow.title, closable: RawLogsWindow.closeable, context }, RawLogs);
  }
}
