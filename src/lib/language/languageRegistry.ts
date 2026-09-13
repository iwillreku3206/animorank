import { ServiceRegistry } from '$lib/registry';
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
    super.register(CLanguage.id, CLanguage);
  }
}
