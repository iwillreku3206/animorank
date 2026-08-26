import { type Form } from '$lib/form';
import type { JsonValue } from '@zenstackhq/orm';
import type { IntoJsonValue } from '$lib/types/utils';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { Type, TypeSchema } from '../../type.svelte';
import type { ValueDisplay, ValueEditor } from '../../types';
import { TypeRegistry } from '../../typeRegistry';
import { TypeValue } from '../../typeValue.svelte';
import type z from 'zod';
import PointerDisplay from './PointerDisplay.svelte';
import PointerEditor from './PointerEditor.svelte';
import { Integer } from '../int';
import { VoidType } from '../void';

/**
 * Options form with a TypeEditor for the pointer's target type. Void is
 * excluded: `void*` has no backing value and the generated harness would
 * reference an undeclared symbol.
 */
function buildPointerOptions(): Form {
  return {
    fields: {
      target: {
        label: 'Pointed To Type',
        type: 'typeEditor',
        excludeTypeIds: [VoidType.id()],
        default: GlobalRegistryProvider.instance().getRegistry(TypeRegistry).getStatic('int').create()
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
      return GlobalRegistryProvider.instance().getRegistry(TypeRegistry).getStatic(target).create();
    } catch {
      // fall through to the default
    }
  }
  if (target !== null && typeof target === 'object' && 'type' in target) {
    try {
      return GlobalRegistryProvider.instance()
        .getRegistry(TypeRegistry)
        .from(target as z.infer<typeof TypeSchema>);
    } catch {
      // fall through to the default
    }
  }
  return GlobalRegistryProvider.instance().getRegistry(TypeRegistry).getStatic('int').create();
}

export class Pointer extends Type<JsonValue, Form, { target: Type }> {
  static id(): string {
    return 'pointer';
  }

  static create() {
    // Direct class reference (not the registry): operator type registries
    // construct this at module-eval time, before the provider is initialized.
    return new Pointer({ target: Integer.create() });
  }

  constructor(options: IntoJsonValue | { target?: Type }) {
    const target = options !== null && typeof options === 'object' && 'target' in options ? options.target : undefined;
    super({ target: normalizeTarget(target) });
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

  get valueDisplay(): ValueDisplay {
    return PointerDisplay as unknown as ValueDisplay;
  }

  get valueForm(): ValueEditor {
    return PointerEditor as unknown as ValueEditor;
  }
}
