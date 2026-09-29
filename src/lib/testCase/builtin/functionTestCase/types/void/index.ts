import { extractZodSchema, type Form } from '$lib/form';
import type { ComponentType } from 'svelte';
import type { JsonValue } from '@zenstackhq/orm';
import { z } from 'zod';
import { Type } from '../../type.svelte';
import type { ValueDisplay, ValueEditor } from '../../types';
import { TypeValue } from '../../typeValue.svelte';
import type { IntoJsonValue } from '$lib/types/utils';
import VoidDisplay from './VoidDisplay.svelte';
import VoidEditor from './VoidEditor.svelte';
import BanIcon from '@iconify-svelte/fa6-solid/ban';

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

  public override get isVoid(): boolean {
    return true;
  }

  public async validateValue(data: JsonValue): Promise<true | Error> {
    const { error, success } = voidValidator.safeParse(data);
    return success ? true : error;
  }

  public defaultValue(): TypeValue<this> {
    return TypeValue.assumedValid(this, {});
  }

  get staticName(): string {
    return 'void';
  }

  /** The C spelling of the type, as for every other type's detail. */
  get detailedName(): string {
    return 'void';
  }

  static icon: ComponentType = BanIcon;

  get optionsForm() {
    return voidOptions;
  }

  get valueDisplay(): ValueDisplay {
    return VoidDisplay as unknown as ValueDisplay;
  }

  get valueForm(): ValueEditor {
    return VoidEditor as unknown as ValueEditor;
  }
}
