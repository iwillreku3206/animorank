import { WindowRegistry } from '$lib/window/windowRegistry';
import type { ProblemSetEditorWindowContext } from './context.svelte';
import { GeneralWindow } from './windows/General.window';
import { CollaboratorsWindow } from './windows/Collaborators.window';
import { StudentAccessWindow } from './windows/StudentAccess.window';
import { AnalyticsWindow } from './windows/Analytics.window';

export class ProblemSetEditorWindowRegistry extends WindowRegistry<ProblemSetEditorWindowContext> {
  constructor() {
    super();

    this.register('general', GeneralWindow);
    this.register('collaborators', CollaboratorsWindow);
    this.register('student_access', StudentAccessWindow);
    this.register('analytics', AnalyticsWindow);
  }
}
