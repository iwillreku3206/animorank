import { extractZodSchema, type Form } from '$lib/form';
import type { JsonValue } from '@zenstackhq/orm';
import { z } from 'zod';
import { Type } from '../../type.svelte';
import type { ValueDisplay, ValueEditor } from '../../types';
import { TypeValue } from '../../typeValue.svelte';
import { SerializableBigInt } from '$lib/types/serializableBigInt';
import IntegerDisplay from './IntegerDisplay.svelte';
import IntegerEditor from './IntegerEditor.svelte';
import type { IntoJsonValue } from '$lib/types/utils';

const integerOptions = {
  fields: {
    size: {
      label: 'Size (bits)',
      type: 'radio',
      options: [
        {
          label: '8',
          value: 8
        },
        {
          label: '16',
          value: 16
        },
        {
          label: '32',
          value: 32
        },
        {
          label: '64',
          value: 64
        }
      ] as const,
      default: '32'
    },
    signed: {
      label: 'Signed',
      type: 'segmented',
      options: [
        {
          label: 'Unset (Default)',
          value: null
        },
        {
          label: 'Signed',
          value: true
        },
        {
          label: 'Unsigned',
          value: false
        }
      ] as const,
      default: null
    }
  }
} as const satisfies Form;

const intValidator = z.object({
  value: z.string()
});

type Value = z.output<typeof intValidator>;

export class Integer extends Type<Value, typeof integerOptions> {
  static id(): string {
    return 'int';
  }

  static create() {
    return new Integer({ signed: null, size: 32 });
  }

  constructor(options: IntoJsonValue) {
    super(extractZodSchema(integerOptions).parse(options));
  }

  public async validateValue(data: JsonValue): Promise<true | Error> {
    const { data: zData, error: zError, success: zSuccess } = intValidator.safeParse(data);

    if (!zSuccess) return zError;

    try {
      new SerializableBigInt(zData.value);
      return true;
    } catch (error) {
      return error as Error;
    }
  }
  public defaultValue(): TypeValue<this> {
    return new TypeValue(this, { value: '0' });
  }

  get displayName(): string {
    const { size, signed } = this.options;
    if (signed === false) return `uint${size}`;
    if (signed === true) return `signed int${size}`;
    return `int${size}`;
  }

  get optionsForm() {
    return integerOptions;
  }

  get valueDisplay(): ValueDisplay<this> {
    return IntegerDisplay as unknown as ValueDisplay<this>;
  }

  get valueForm(): ValueEditor<this> {
    return IntegerEditor as unknown as ValueEditor<this>;
  }
}
