import { type Form } from '$lib/form';
import type { ComponentType } from 'svelte';
import type { JsonValue } from '@zenstackhq/orm';
import type { IntoJsonValue } from '$lib/types/utils';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { Type, TypeSchema } from '$lib/testCase/builtin/functionTestCase/type.svelte';
import type z from 'zod';
import type { ValueDisplay, ValueEditor } from '$lib/testCase/builtin/functionTestCase/types';
import ListIcon from '@iconify-svelte/fa6-solid/list';
import { TypeRegistry } from '$lib/testCase/builtin/functionTestCase/typeRegistry';
import { TypeValue } from '$lib/testCase/builtin/functionTestCase/typeValue.svelte';
import { StringType } from '$lib/testCase/builtin/functionTestCase/types/string';
import { Float } from '$lib/testCase/builtin/functionTestCase/types/float';
import { Integer } from '$lib/testCase/builtin/functionTestCase/types/int';
import { VoidType } from '$lib/testCase/builtin/functionTestCase/types/void';

/** Options form with a TypeEditor for the element type; see {@link ArrayType} for what it accepts. */
const arrayOptions = {
  fields: {
    element: {
      label: 'Element Type',
      type: 'typeEditor',
      // A void element has no value, and an array of arrays would need a nested
      // wire format: neither is supported end to end.
      excludeTypeIds: [VoidType.id(), 'array'],
      default: StringType.create()
    }
  }
} as const satisfies Form;

/**
 * The element type an array hydrates to, from whatever its options carry: a
 * live `Type` (constructed here or rebuilt by the type editor), a type id, or
 * the serialized `{ type, options }` the server receives. A serialized element
 * is rebuilt through the registry so its own options survive — an element of
 * `{ type: 'int', options: { size: 64 } }` stays int64. A type that is not
 * registered (or no longer is) falls back to string, so a test case written
 * against a removed type still opens.
 */
export async function resolveElementType(element: unknown): Promise<Type> {
  if (element instanceof Type) return element;

  const registry = GlobalRegistryProvider.instance().getRegistry(TypeRegistry);
  if (typeof element === 'string') {
    try {
      return (await registry.getStatic(element)).create();
    } catch {
      // fall through to the default
    }
  }
  if (element !== null && typeof element === 'object' && 'type' in element) {
    try {
      return await registry.from(element as z.infer<typeof TypeSchema>);
    } catch {
      // fall through to the default
    }
  }
  return StringType.create();
}

const integerElement = /^-?\d+$/;
const floatElement = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;

/** The element option a raw (serialized or in-memory) options value carries. */
function elementOption(options: unknown): unknown {
  return options !== null && typeof options === 'object' && 'element' in options ? options.element : undefined;
}

/**
 * An array of values sharing one element type.
 *
 * The value is the JSON encoding of the elements (`['a', 'b']`), matching how
 * the scalar types carry their value as `{ value }`; elements are strings on
 * the wire, so an integer or float array holds each element's decimal text.
 *
 * The element is a `Type` instance, as the type editor binds, and serializes
 * through it: the wire form is `{ element: { type, options } }`, which the
 * server reads without needing the element's class.
 *
 * This module stays free of components so the server can import it; the two
 * entries provide the concrete class (see `client/arrayType.ts`).
 */
export class ArrayType extends Type<
  string[],
  typeof arrayOptions,
  // The type editor binds a live `Type`; the serialized form is a plain object,
  // so the declared type names what the code works with.
  { element: Type }
> {
  static id(): string {
    return 'array';
  }

  constructor(options: IntoJsonValue | { element?: Type }) {
    const element =
      options !== null && typeof options === 'object' && 'element' in options ? options.element : undefined;
    super({ element: element instanceof Type ? element : StringType.create() });
  }

  /** The element type id, as registered. */
  public elementId(): string {
    return this.elementType.id;
  }

  /** The element type, nested in the options as a live instance. */
  public get elementType(): Type {
    return this.options.element;
  }

  public async validateValue(data: JsonValue): Promise<true | Error> {
    if (!Array.isArray(data)) return new Error(`Expected an array of ${this.elementId()} values`);

    // Every element is carried as text (the wire format is textual), so an
    // element that is not a string is never a valid element.
    const element = this.elementType;
    const numeric = element.id === Float.id() || element.id === Integer.id();
    const validator = element.id === Float.id() ? floatElement : integerElement;

    for (const [index, item] of data.entries()) {
      if (typeof item !== 'string' || (numeric && !validator.test(item))) {
        return new Error(`Element ${index} (${JSON.stringify(item)}) is not a valid ${element.detailedName}`);
      }
    }
    return true;
  }

  public defaultValue(): TypeValue<this> {
    return new TypeValue(this, []);
  }

  get staticName(): string {
    return 'array';
  }

  /** The C spelling of an array of this element, e.g. `char*[]` or `int32[]`. */
  get detailedName(): string {
    return `${this.options.element.detailedName}[]`;
  }

  static icon: ComponentType = ListIcon;

  get optionsForm() {
    return arrayOptions;
  }

  /**
   * The value's editor and display, installed by the client entry. The server
   * never renders a value, so they stay unset there — and this module stays
   * importable without dragging components into the server build.
   */
  private static components: { valueForm: ValueEditor; valueDisplay: ValueDisplay } | null = null;

  public static installComponents(components: { valueForm: ValueEditor; valueDisplay: ValueDisplay }): void {
    ArrayType.components = components;
  }

  public static async from(options: IntoJsonValue | { element?: unknown }): Promise<ArrayType> {
    return new ArrayType({ element: await resolveElementType(elementOption(options)) });
  }

  public static create(): ArrayType {
    return new ArrayType({ element: StringType.create() });
  }

  get valueDisplay(): ValueDisplay {
    if (!ArrayType.components) throw new Error('The array type has no value display on this runtime');
    return ArrayType.components.valueDisplay;
  }

  get valueForm(): ValueEditor {
    if (!ArrayType.components) throw new Error('The array type has no value editor on this runtime');
    return ArrayType.components.valueForm;
  }
}
