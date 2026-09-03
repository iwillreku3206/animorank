import { LanguageTypeRegistry } from '../../languageTypeRegistry';
import type { Type } from '../../type.svelte';
import type { CFunctionTestCase } from './c';
import type { CType } from './cType';
import { CInteger } from './types/integer';
import { CFloat } from './types/float';
import { CStringType } from './types/string';
import { CPointer } from './types/pointer';
import { CVoid } from './types/void';

export class CTypeRegistry extends LanguageTypeRegistry<CFunctionTestCase, CType<Type>> {
  public id = 'test_case.function.language.c.type';

  constructor() {
    super();

    this.registerType(CInteger);
    this.registerType(CFloat);
    this.registerType(CStringType);
    this.registerType(CPointer);
    this.registerType(CVoid);
  }
}
