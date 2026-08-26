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

    const value = Number(parsed.value);
    if (!Number.isFinite(value)) return new Error('Invalid floating point value');

    // size 32: the harness emits the literal as a C float, so anything
    // beyond FLT_MAX silently becomes inf and every comparison fails with a
    // cryptic "Actual: inf" (the exact double still passes validation).
    if (this.options.size === 32 && Math.abs(value) > 3.4028234663852886e38) {
      return new Error('Value is out of range for 32-bit float (max magnitude 3.4028235e38)');
    }

    return true;
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

  get valueDisplay(): ValueDisplay {
    return FloatDisplay as unknown as ValueDisplay;
  }

  get valueForm(): ValueEditor {
    return FloatEditor as unknown as ValueEditor;
  }
}
