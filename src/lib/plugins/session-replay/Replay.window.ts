import { Window } from '$lib/window';
import type { SessionLogsViewContext } from '../../../routes/instructor/analytics/session-logs/context.svelte';
import Replay from './Replay.window.svelte';

export class ReplayWindow extends Window<SessionLogsViewContext> {
  static title = 'Replay';
  static closeable = false;
  constructor(context: SessionLogsViewContext) {
    super({ title: ReplayWindow.title, closable: ReplayWindow.closeable, context }, Replay);
  }
}
