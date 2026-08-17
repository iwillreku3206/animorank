import { extractZodSchema, type Form } from '$lib/form';
import type { JsonValue } from '@zenstackhq/orm';
import { z } from 'zod';
import { Type } from '../../type.svelte';
import type { ValueDisplay, ValueEditor } from '../../types';
import { TypeValue } from '../../typeValue.svelte';
import type { IntoJsonValue } from '$lib/types/utils';
import StringDisplay from './StringDisplay.svelte';
import StringEditor from './StringEditor.svelte';

const stringOptions = {
  fields: {}
} as const satisfies Form;

const stringValidator = z.object({
  value: z.string()
});

type Value = z.output<typeof stringValidator>;

export class StringType extends Type<Value, typeof stringOptions> {
  static id(): string {
    return 'string';
  }

  static create() {
    return new StringType({});
  }

  constructor(options: IntoJsonValue) {
    super(extractZodSchema(stringOptions).parse(options));
  }

  public async validateValue(data: JsonValue): Promise<true | Error> {
    const { error, success } = stringValidator.safeParse(data);
    return success ? true : error;
  }

  public defaultValue(): TypeValue<this> {
    return new TypeValue(this, { value: '' });
  }

  get displayName(): string {
    return 'String';
  }

  get optionsForm() {
    return stringOptions;
  }

  get valueDisplay(): ValueDisplay<this> {
    return StringDisplay as unknown as ValueDisplay<this>;
  }

  get valueForm(): ValueEditor<this> {
    return StringEditor as unknown as ValueEditor<this>;
  }
}
