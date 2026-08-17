import { extractZodSchema, type Form } from '$lib/form';
import type { JsonValue } from '@zenstackhq/orm';
import { z } from 'zod';
import { Type } from '../../type.svelte';
import type { ValueDisplay, ValueEditor } from '../../types';
import { TypeValue } from '../../typeValue.svelte';
import type { IntoJsonValue } from '$lib/types/utils';
import VoidDisplay from './VoidDisplay.svelte';
import VoidEditor from './VoidEditor.svelte';

const voidOptions = {
  fields: {}
} as const satisfies Form;

const voidValidator = z.object({});

export class VoidType extends Type<Record<string, never>, typeof voidOptions> {
  static id(): string {
    return 'void';
  }

  static create() {
    return new VoidType({});
  }

  constructor(options: IntoJsonValue) {
    super(extractZodSchema(voidOptions).parse(options));
  }

  public async validateValue(data: JsonValue): Promise<true | Error> {
    const { error, success } = voidValidator.safeParse(data);
    return success ? true : error;
  }

  public defaultValue(): TypeValue<this> {
    return new TypeValue(this, {});
  }

  get displayName(): string {
    return 'Void';
  }

  get optionsForm() {
    return voidOptions;
  }

  get valueDisplay(): ValueDisplay<this> {
    return VoidDisplay as unknown as ValueDisplay<this>;
  }

  get valueForm(): ValueEditor<this> {
    return VoidEditor as unknown as ValueEditor<this>;
  }
}
