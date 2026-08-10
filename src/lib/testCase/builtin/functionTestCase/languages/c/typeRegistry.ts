import { LanguageTypeRegistry } from '../../languageTypeRegistry';
import type { Type } from '../../type.svelte';
import type { CFunctionTestCase } from './c';
import type { CType } from './cType';
import { CInteger } from './types/integer';

export class CTypeRegistry extends LanguageTypeRegistry<CFunctionTestCase, CType<Type>> {
  constructor() {
    super();

    this.registerType(CInteger);
  }
}
