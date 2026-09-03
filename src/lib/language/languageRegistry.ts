import { ServiceRegistry, type ClassServiceOf } from '$lib/registry';
import type { Language } from '.';
import { CLanguage } from './c';

export class LanguageRegistry extends ServiceRegistry<
  Language,
  [],
  {
    id: string;
  }
> {
  public id = 'language';

  constructor() {
    super();
    super.register('c', CLanguage);
  }

  public registerLanguage(language: ClassServiceOf<this>) {
    super.register(language.id, language);
  }
}
