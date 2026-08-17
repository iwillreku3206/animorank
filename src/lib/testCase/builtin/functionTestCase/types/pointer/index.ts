import { type Form } from '$lib/form';
import type { JsonValue } from '@zenstackhq/orm';
import { Type, TypeSchema } from '../../type.svelte';
import type { ValueDisplay, ValueEditor } from '../../types';
import { TypeRegistry } from '../../typeRegistry';
import { TypeValue } from '../../typeValue.svelte';
import type { IntoJsonValue } from '$lib/types/utils';
import type z from 'zod';
import PointerDisplay from './PointerDisplay.svelte';
import PointerEditor from './PointerEditor.svelte';

/**
 * Options form with a TypeEditor for the pointer's target type.
 */
function buildPointerOptions(): Form {
  return {
    fields: {
      target: {
        label: 'Pointed To Type',
        type: 'typeEditor',
        default: TypeRegistry.instance().getStatic('int').create()
      }
    }
  };
}

/**
 * Hydrate the target type from whatever the options carry: a Type instance
 * (in-memory), a type id (legacy wire), or a serialized type `{type, options}`.
 */
function normalizeTarget(target: unknown): Type {
  if (target instanceof Type) return target;
  if (typeof target === 'string') {
    try {
      return TypeRegistry.instance().getStatic(target).create();
    } catch {
      // fall through to the default
    }
  }
  if (target !== null && typeof target === 'object' && 'type' in target) {
    try {
      return TypeRegistry.instance().from(target as z.infer<typeof TypeSchema>);
    } catch {
      // fall through to the default
    }
  }
  return TypeRegistry.instance().getStatic('int').create();
}

export class Pointer extends Type<IntoJsonValue, Form, { target: Type }> {
  static id(): string {
    return 'pointer';
  }

  static create() {
    return new Pointer({ target: TypeRegistry.instance().getStatic('int').create() });
  }

  constructor(options: { target?: unknown }) {
    super({ target: normalizeTarget(options.target) });
  }

  /**
   * @description The target type held by this pointer's options.
   */
  public get targetType(): Type {
    return this.options.target;
  }

  public async validateValue(data: JsonValue): Promise<true | Error> {
    try {
      return await this.targetType.validateValue(data);
    } catch {
      return new Error(`Unknown pointer target type: ${this.options.target.id}`);
    }
  }

  public defaultValue(): TypeValue<this> {
    return new TypeValue(this, this.targetType.defaultValue().value);
  }

  get displayName(): string {
    return 'Pointer';
  }

  get optionsForm() {
    return buildPointerOptions();
  }

  get valueDisplay(): ValueDisplay<this> {
    return PointerDisplay as unknown as ValueDisplay<this>;
  }

  get valueForm(): ValueEditor<this> {
    return PointerEditor as unknown as ValueEditor<this>;
  }
}
