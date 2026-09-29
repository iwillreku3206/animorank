import type { Language } from '$lib/language';
import { ServiceRegistry } from '$lib/registry';
import type { CodeExecutor } from '.';
import { Judge0Executor } from './judge0';

/**
 * Registry of code executors, keyed by the language ids they support.
 *
 * Executors declare the languages they handle via their static `languages()`
 * and are registered under their static `id` — by the constructor, or by a
 * plugin through the registrar; either way the language map is kept in sync
 * and the registry resolves the default executor for a language.
 */
export class CodeExecutorRegistry extends ServiceRegistry<
  CodeExecutor,
  [],
  {
    id: string;
    languages(): Language[];
  }
> {
  public id = 'executor';

  // Keyed by language id, not Language instance identity: executors and
  // callers each mint their own instances, so an identity key could never
  // match (getDefaultForLanguage was dead on arrival because of it).
  private languageMap: Map<string, string[]> = new Map();

  constructor() {
    super();
    this.register(Judge0Executor.id, Judge0Executor);
  }

  /**
   * Register an executor class and the languages it supports.
   *
   * @param key - The registry key the executor is stored under.
   * @param value - The executor class; its static `languages()` determines
   *   which language ids resolve to it.
   * @param origin - The namespace the key is attributed to; passed through to
   *   the base registry, which is what `registeredBy`/`writers` report.
   * @description Kept in sync with `languageMap` for every registration, so
   *   `getDefaultForLanguage` resolves plugin-registered executors too.
   *
   * The parameter type is spelled out instead of using `ClassServiceOf<this>`:
   * this class is its own service (`T = CodeExecutor`), so the alias would have
   * to resolve through the class being declared (TS2502/TS2589).
   */
  protected override register(
    key: string,
    value: (new (..._args: []) => CodeExecutor) & { id: string; languages(): Language[] },
    origin?: string
  ): void {
    super.register(key, value, origin);
    for (const language of value.languages()) {
      if (!this.languageMap.has(language.id)) {
        this.languageMap.set(language.id, []);
      }
      this.languageMap.get(language.id)!.push(key);
    }
  }

  /**
   * Resolve the default executor registered for a language.
   *
   * @param language - The language to resolve an executor for, matched by
   *   its `id`.
   * @returns The first executor registered for the language, or `undefined`
   *   when no executor supports it — including when the registry holds no
   *   executors at all, or a mapped executor id is not actually registered
   *   (inconsistent state). This method never throws.
   * @description Callers must handle the `undefined` case (e.g. skip
   *   execution or report a configuration error) rather than assume an
   *   executor always exists.
   */
  public async getDefaultForLanguage(language: Language): Promise<CodeExecutor | undefined> {
    const id = this.languageMap.get(language.id)?.at(0);
    if (!id || !this.keys().includes(id)) return undefined;
    return this.getInstance(id);
  }
}
