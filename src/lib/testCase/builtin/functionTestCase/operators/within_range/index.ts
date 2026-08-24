import type { Form } from '$lib/form';
import type { IntoJsonValue } from '$lib/types/utils';
import { z } from 'zod';
import { Operator } from '../../operator.svelte';
import { WithinRangeOperatorTypeRegistry } from './registry';

const withinRangeOptions = {
  fields: {
    range: {
      label: 'Range',
      type: 'text'
    }
  }
} as const satisfies Form;

const withinRangeOptionsSchema = z.object({
  range: z.string().default('0')
});

export class WithinRangeOperator extends Operator<{ range: string }> {
  static id(): string {
    return 'within_range';
  }

  static create(): WithinRangeOperator {
    return new WithinRangeOperator({ range: '0' });
  }

  constructor(options: IntoJsonValue) {
    super(withinRangeOptionsSchema.parse(options ?? {}));
  }

  static typeRegistry = new WithinRangeOperatorTypeRegistry();

  get optionsForm(): Form | null {
    return withinRangeOptions;
  }

  get displayName(): string {
    return 'within range';
  }
}
