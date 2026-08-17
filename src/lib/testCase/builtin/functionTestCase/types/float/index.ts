import { extractZodSchema, type Form } from '$lib/form';
import type { JsonValue } from '@zenstackhq/orm';
import { z } from 'zod';
import { Type } from '../../type.svelte';
import type { ValueDisplay, ValueEditor } from '../../types';
import { TypeValue } from '../../typeValue.svelte';
import type { IntoJsonValue } from '$lib/types/utils';
import FloatDisplay from './FloatDisplay.svelte';
import FloatEditor from './FloatEditor.svelte';

const floatOptions = {
  fields: {
    size: {
      label: 'Precision',
      type: 'radio',
      options: [
        {
          label: '32-bit (float)',
          value: 32
        },
        {
          label: '64-bit (double)',
          value: 64
        }
      ] as const,
      default: 32
    }
  }
} as const satisfies Form;

const floatValidator = z.object({
  value: z.string().regex(/^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/)
});

type Value = z.output<typeof floatValidator>;

export class Float extends Type<Value, typeof floatOptions> {
  static id(): string {
    return 'float';
  }

  static create() {
    return new Float({ size: 32 });
  }

  constructor(options: IntoJsonValue) {
    super(extractZodSchema(floatOptions).parse(options));
  }

  public async validateValue(data: JsonValue): Promise<true | Error> {
    const { data: parsed, error, success } = floatValidator.safeParse(data);
    if (!success) return error;
    return Number.isFinite(Number(parsed.value)) ? true : new Error('Invalid floating point value');
  }

  public defaultValue(): TypeValue<this> {
    return new TypeValue(this, { value: '0' });
  }

  get displayName(): string {
    return 'Floating Point';
  }

  get optionsForm() {
    return floatOptions;
  }

  get valueDisplay(): ValueDisplay<this> {
    return FloatDisplay as unknown as ValueDisplay<this>;
  }

  get valueForm(): ValueEditor<this> {
    return FloatEditor as unknown as ValueEditor<this>;
  }
}
