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
  // Normalize null/empty (legacy rows migrated with a NULL range_value, and
  // cleared form fields) to '0'; reject anything non-numeric so a garbage
  // range can never reach the judge-time BigInt/Number conversions.
  range: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? '0' : v),
    z.string().regex(/^\d+(\.\d+)?$/, 'Range must be a non-negative number')
  )
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

  get describeExpectation(): string {
    return `within ${this.options.range} of`;
  }
}
