import type { Language } from '$lib/language';
import { ServiceRegistry, type ClassServiceOf } from '$lib/services/registry';
import type { CodeExecutor } from '.';

export class CodeExecutorRegistry extends ServiceRegistry<
  CodeExecutor,
  [],
  {
    id: string;
    languages(): Language[];
  }
> {
  private languageMap: Map<Language, string[]> = new Map();

  constructor() {
    super();
  }

  public registerCodeExecutor(codeExecutor: ClassServiceOf<this>) {
    this.register(codeExecutor.id, codeExecutor);
    for (const language of codeExecutor.languages()) {
      if (!this.languageMap.has(language)) {
        this.languageMap.set(language, []);
      }
      this.languageMap.get(language)!.push(codeExecutor.id);
    }
  }

  public getDefaultForLanguage(language: Language): CodeExecutor | undefined {
    const id = this.languageMap.get(language)?.at(0);
    if (!id) return;
    this.getInstance(id);
  }
}
