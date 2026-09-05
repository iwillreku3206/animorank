import type { Language } from '$lib/language';
import { ServiceRegistry, type ClassServiceOf } from '$lib/services/registry';
import type { CodeExecutor } from '.';

/**
 * Registry of code executors, keyed by the language ids they support.
 *
 * Executors declare the languages they handle via their static
 * `languages()` and register themselves with `registerCodeExecutor`; the
 * registry resolves the default executor for a language.
 */
export class CodeExecutorRegistry extends ServiceRegistry<
  CodeExecutor,
  [],
  {
    id: string;
    languages(): Language[];
  }
> {
  // Keyed by language id, not Language instance identity: executors and
  // callers each mint their own instances, so an identity key could never
  // match (getDefaultForLanguage was dead on arrival because of it).
  private languageMap: Map<string, string[]> = new Map();

  constructor() {
    super();
  }

  /**
   * Register an executor class and the languages it supports.
   *
   * @param codeExecutor - The executor class to register. Its static `id`
   *   keys the service registry, and its static `languages()` determines
   *   which language ids resolve to it.
   * @description After registration, `getDefaultForLanguage` can resolve
   *   this executor for any of its declared languages.
   */
  public registerCodeExecutor(codeExecutor: ClassServiceOf<this>) {
    this.register(codeExecutor.id, codeExecutor);
    for (const language of codeExecutor.languages()) {
      if (!this.languageMap.has(language.id)) {
        this.languageMap.set(language.id, []);
      }
      this.languageMap.get(language.id)!.push(codeExecutor.id);
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
  public getDefaultForLanguage(language: Language): CodeExecutor | undefined {
    const id = this.languageMap.get(language.id)?.at(0);
    if (!id || !this.keys().includes(id)) return undefined;
    return this.getInstance(id);
  }
}
