/* eslint-disable @typescript-eslint/no-unused-vars -- the page hooks are no-ops a plugin overrides; each parameter is the hook's signature. */
import type { ClientAnimoRankAPI } from '$lib/api/client';
import type { ProblemEditorWindowContext } from '../../routes/edit/[slug]/context.svelte';
import type { ProblemSetEditorWindowContext } from '../../routes/instructor/problemSets/[id]/context.svelte';
import type { SolveWindowContext } from '../../routes/problem/[problem_id]/[session_id]/context.svelte';

/** The context each page-load hook receives, keyed by hook name. */
export interface PluginPageHookContexts {
  onProblemEditorLoad: ProblemEditorWindowContext;
  onProblemSetEditorLoad: ProblemSetEditorWindowContext;
  onSolvePageLoad: SolveWindowContext;
}

/** A page a plugin can be told about, named after the hook that answers it. */
export type PluginPageHook = keyof PluginPageHookContexts;

/**
 * A plugin's browser entry point. The client-side plugin loader instantiates
 * the default export of the plugin's client module and initializes it with an
 * API bound to the plugin's manifest id.
 *
 * The page-load hooks below are the pages a plugin can take part in. A plugin
 * that overrides one is loaded when that page loads and is called with the
 * page's context (see `ClientPluginLoader.notifyPageHook`); a plugin that
 * leaves them alone is not loaded for the page and never called. Overriding is
 * how a plugin answers a page — the base methods do nothing.
 */
export abstract class ClientPlugin {
  public abstract init(_api: ClientAnimoRankAPI): Promise<void>;

  /** The problem editor page has loaded, with the editor's context. */
  public onProblemEditorLoad(_context: ProblemEditorWindowContext): void | Promise<void> {}

  /** The problem set editor page has loaded, with the editor's context. */
  public onProblemSetEditorLoad(_context: ProblemSetEditorWindowContext): void | Promise<void> {}

  /** The solve page has loaded, with the session's context. */
  public onSolvePageLoad(_context: SolveWindowContext): void | Promise<void> {}
}
