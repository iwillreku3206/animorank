import z from 'zod';
import { TypeWithValue } from '.';
import { LanguageRegistry } from '../languageRegistry';
import { LanguageType } from './languageType';
import type { JsonValue } from '@zenstackhq/orm';
import { TypeRegistry } from '../typeRegistry';

/**
 * Schema for the pointer's value.
 * `target` holds the type key (as registered in TypeRegistry) and the raw data.
 * `useArithmetic` is a reserved flag for future pointer arithmetic support.
 */
const PointerSchema = z.object({
  target: z.object({
    type: z.string(),
    data: z.any()
  }),
  useArithmetic: z.boolean().optional()
});

type PointerValue = z.infer<typeof PointerSchema>;

/**
 * Represents a pointer type that wraps any inner type.
 *
 * Example data shape:
 *   { target: { type: 'int', data: { value: '5', size: 32, signed: 'none' } } }
 *   { target: { type: 'float', data: { value: '3.14', size: 64 } } }
 *   { target: { type: 'string', data: { value: 'hello', length: 5, nullTerminated: true } } }
 *
 * The C implementation dynamically resolves the inner type from TypeRegistry
 * and delegates all code generation to that type's C language implementation.
 * This means any new type added to TypeRegistry automatically works as a pointer target.
 */
export class Pointer extends TypeWithValue<PointerValue> {
  constructor(data?: JsonValue) {
    let value: PointerValue = {
      target: { type: '', data: {} },
      useArithmetic: false
    };
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

  /**
   * Check if pointer arithmetic is enabled.
   */
  public isArithmeticSupported(): boolean {
    return this.value.useArithmetic ?? false;
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
