import { TypeWithValue } from './index';
import type { TypeInfo } from './typeInfo';
import z from 'zod';
import type { JsonValue } from '@zenstackhq/orm';
import { LanguageRegistry } from '../languageRegistry';
import { LanguageType } from './languageType';
import { TypeRegistry } from '../typeRegistry';
import AsteriskIcon from '@iconify-svelte/fa6-solid/asterisk';

/**
 * Schema for the pointer's value.
 * `target` holds the type key (as registered in TypeRegistry) and the raw data.
 * `useArithmetic` is a reserved flag for future pointer arithmetic support.
 */
const PointerSchema = z.object({
  target: z.object({
    type: z.string(),
    data: z.any()
  })
});

type PointerValue = z.infer<typeof PointerSchema>;

export class Pointer extends TypeWithValue<PointerValue> {
  static typeInfo: TypeInfo<PointerValue> = {
    typeKey: 'pointer',
    label: 'Pointer',
    icon: AsteriskIcon,
    valueSchema: PointerSchema,
    fields: {
      target: {
        name: 'target',
        label: 'Pointed To Type',
        type: 'type-reference'
      }
    },
    defaultValue: {
      target: { type: 'int', data: { value: '0', size: 32, signed: 'none' } }
    }
  };

  constructor(data?: JsonValue) {
    let value: PointerValue = Pointer.typeInfo.defaultValue;
    if (data) {
      try {
        const parsed = PointerSchema.parse(data);
        value = { ...value, ...parsed };
      } catch (e) {
        console.warn('Invalid pointer data:', e);
      }
    }
    super(value, new PointerLanguageRegistry());
  }

  /**
   * Get the encapsulated target type identifier (key used in TypeRegistry).
   */
  public getTargetType(): string {
    return this.value.target.type;
  }

  /**
   * Get the encapsulated target raw data (payload of the inner type).
   */
  public getTargetData(): JsonValue {
    return this.value.target.data;
  }

  static createDefault(): Pointer {
    return new Pointer();
  }

  public toString(): string {
    const { target } = this.value;
    const tv = TypeRegistry.instance().getInstance(target.type, target.data);
    return `Pointer(${tv.toString()})`;
  }
}

/**
 * Language registry for the pointer type.
 * Registers the C implementation for pointer code generation.
 */
class PointerLanguageRegistry extends LanguageRegistry<PointerValue> {
  constructor() {
    super();
    this.register('c', CPointer);
  }
}

/**
 * C implementation for the pointer type.
 * Dynamically resolves the inner type from TypeRegistry at runtime
 * and delegates all code generation to that type's C language implementation.
 *
 * When a new type is added to TypeRegistry, it automatically becomes a
 * valid pointer target without any changes to this code.
 */
class CPointer extends LanguageType<PointerValue> {
  private innerLanguage: LanguageType<any>;

  constructor(typeWithValue: TypeWithValue<PointerValue>) {
    super(typeWithValue as Pointer);
    const resolved = this.resolveInnerLanguage(this.typeWithValue as Pointer);
    if (!resolved) {
      throw new Error(`Failed to resolve inner language for pointer target`);
    }
    this.innerLanguage = resolved;
  }

  /**
   * Dynamically resolve the inner type's C language implementation from TypeRegistry.
   * This is the key to making pointers work with ANY future type without modifying this code.
   */
  private resolveInnerLanguage(ptr: Pointer): LanguageType<any> | null {
    try {
      const targetType = ptr.getTargetType();
      const data = ptr.getTargetData();
      // Resolve the inner type from TypeRegistry
      const innerType = TypeRegistry.instance().getInstance(targetType, data);
      // Get its C language implementation
      const langImpl = innerType.getLanguage('c');
      return langImpl as LanguageType<any>;
    } catch (e) {
      console.warn(
        `Failed to resolve inner language for pointer target: ${ptr.getTargetType()}`,
        e
      );
      return null;
    }
  }

  /**
   * Get the C pointer type expression (e.g., "int*", "float*").
   * Delegates to the inner type's constructTypeExpression and appends '*'.
   */
  public constructTypeExpression(): string {
    return `${this.innerLanguage.constructTypeExpression()}*`;
  }

  /**
   * Build the C initialization statement for the pointer.
   * Generates both the inner variable declaration and the pointer declaration.
   */
  public constructInit(symbol: string): string {
    const tempVar = `${symbol}__ptr_temp`;
    const innerInit = this.innerLanguage.constructInit(tempVar);
    // Extract the expression: "int temp = 5;" -> "5"
    const parts = innerInit.split('=');
    const expr = parts[1]?.split(';')[0]?.trim() ?? 'NULL';
    const innerTypeStr = this.innerLanguage.constructTypeExpression();
    return `${innerTypeStr} ${tempVar} = ${expr}; ${innerTypeStr}* ${symbol} = &${tempVar};`;
  }

  /**
   * Build the dereferenced expression (e.g., "*ptr").
   */
  public constructExpression(): string {
    return '*ptr';
  }

  /**
   * Build the C print statement for the dereferenced pointer value.
   * Passes the dereferenced symbol to the inner type's constructPrint.
   */
  public constructPrint(symbol: string): string {
    return this.innerLanguage.constructPrint(`*${symbol}`);
  }

  /**
   * Build the C equality check for two dereferenced pointer values.
   * Passes dereferenced symbols to the inner type's constructEqualityCheck.
   */
  public constructEqualityCheck(resultSymbol: string, symbolA: string, symbolB: string): string {
    return this.innerLanguage.constructEqualityCheck(resultSymbol, `*${symbolA}`, `*${symbolB}`);
  }

  /**
   * Build the C less-than check for two dereferenced pointer values.
   * Passes dereferenced symbols to the inner type's constructLessThanCheck.
   */
  public constructLessThanCheck(resultSymbol: string, symbolA: string, symbolB: string): string {
    return this.innerLanguage.constructLessThanCheck(resultSymbol, `*${symbolA}`, `*${symbolB}`);
  }

  /**
   * Build the C less-than-or-equal check for two dereferenced pointer values.
   * Passes dereferenced symbols to the inner type's constructLessThanEqualCheck.
   */
  public constructLessThanEqualCheck(
    resultSymbol: string,
    symbolA: string,
    symbolB: string
  ): string {
    return this.innerLanguage.constructLessThanEqualCheck(
      resultSymbol,
      `*${symbolA}`,
      `*${symbolB}`
    );
  }

  public resolveSymbol(symbol: string): string {
    return `*${symbol}`;
  }

  /**
   * Build the C within-range check for a dereferenced pointer value.
   * Passes dereferenced symbols to the inner type's constructWithinRangeCheck.
   */
  public constructWithinRangeCheck(
    resultSymbol: string,
    symbol: string,
    actualSymbol: string,
    range: string
  ): string {
    return this.innerLanguage.constructWithinRangeCheck(
      resultSymbol,
      `*${symbol}`,
      `*${actualSymbol}`,
      range
    );
  }
}
