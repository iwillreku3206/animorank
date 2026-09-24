import { TypeValue } from '$lib/testCase/builtin/functionTestCase/typeValue.svelte';
import type { Type } from '$lib/testCase/builtin/functionTestCase/type.svelte';
import { CType } from '$lib/testCase/builtin/functionTestCase/languages/c/cType';
import type { CExecutionContext } from '$lib/testCase/builtin/functionTestCase/languages/c/executionContext';
import { CFunctionTestCase } from '$lib/testCase/builtin/functionTestCase/languages/c/c';
import { C_ELEMENT_SEPARATOR, C_LIST_TERMINATOR, decodeList, escapeElement } from './global';
import { elementText, elementValueOf } from './elementText';
import { ArrayType } from './arrayTypes';

/**
 * An array in the generated C harness: a pointer to a fixed-length array of the
 * element type, so one symbol is the whole argument (the harness passes one
 * symbol per parameter).
 *
 * The length is the array type's own, not a sentinel: the generated code
 * declares exactly that many slots, initializes every one of them, and prints
 * exactly that many elements. A function of this type therefore receives — and
 * returns — a pointer to `ArrayType.length` elements; that is the contract a
 * submission is written against.
 *
 * Every element is declared, initialized and printed by the element type's own
 * C binding: an int array's elements are ints of the element's size and
 * signedness, a float array's are floats or doubles, an array of pointers
 * points at what its element type says it points at. Nothing about an element
 * is decided here.
 */
export class CArrayType extends CType<ArrayType> {
  static type = ArrayType;

  private readonly array: ArrayType;

  public constructor(language: unknown, type: unknown) {
    super(language as never, type as ArrayType);
    this.array = (type instanceof ArrayType ? type : ArrayType.create()) as ArrayType;
  }

  public async readFromPrint(printed: string): Promise<TypeValue<ArrayType>> {
    return TypeValue.assumedValid(this.array, decodeList(printed));
  }

  /** The element type's own C binding, which this binding defers to. */
  private async elementCType(): Promise<CType<Type>> {
    return CFunctionTestCase.getTypeRegistry().getInstance(
      this.array.elementId(),
      this.language,
      this.array.elementType
    );
  }

  /**
   * One element as a value of the element type, from the text the wire format
   * carries. The wire escape runs first: an element's text is the escaped form,
   * and what the element writes to C has to print back as that same form (see
   * `global.ts`) — which is a no-op for the numeric element types.
   */
  private elementValue(text: string): TypeValue<Type> {
    const elementType = this.array.elementType;
    return TypeValue.assumedValid(elementType, elementValueOf(elementType, escapeElement(text)));
  }

  /** The text a slot holds before anything is written to it: the element type's default. */
  private defaultElementText(): string {
    return elementText(this.array.elementType.defaultValue().value);
  }

  /** The pointer form: the element count is the type's, so it is not a parameter of its own. */
  public async generateParameterDefinition(symbol: string): Promise<string> {
    return `${await (await this.elementCType()).generateReturnType()}* ${symbol}`;
  }

  public async generateReturnType(): Promise<string> {
    return `${await (await this.elementCType()).generateReturnType()}*`;
  }

  public async pushPreDefinitions(context: CExecutionContext): Promise<void> {
    await (await this.elementCType()).pushPreDefinitions(context);
  }

  public async pushDeclaration(
    context: CExecutionContext,
    symbol: string,
    value?: TypeValue<ArrayType>
  ): Promise<void> {
    const element = await this.elementCType();
    const elementType = await element.generateReturnType();
    const length = this.array.length;
    const declared = value ? (value.value as string[]) : [];

    // Exactly `length` slots, and every one of them initialized: the declared
    // elements first, then the element type's own default. Each slot is written
    // by the element's declaration, which is what knows how to spell one.
    const slots: string[] = [];
    for (let index = 0; index < length; index += 1) {
      const slot = `${symbol}_e${index}`;
      await element.pushDeclaration(context, slot, this.elementValue(declared[index] ?? this.defaultElementText()));
      slots.push(slot);
    }

    context.pushCode(`${elementType} ${symbol}_data[${length}] = {${slots.join(', ')}};`);
    context.pushCode(`${elementType}* ${symbol} = ${symbol}_data;`);
  }

  public async pushPrint(context: CExecutionContext, symbol: string, fileSymbol: string): Promise<void> {
    const element = await this.elementCType();
    // The index must not be a context symbol: `getNewSymbol` hands back the same
    // name the caller already used for the array itself.
    const index = `${symbol}_i`;
    // The type fixes how many elements there are, so the loop is bounded by it
    // rather than by a sentinel. Each element prints through the element type's
    // own conversion, and the element's own printing handles what an element
    // means (a pointer prints its pointee). The separator after each element and
    // the terminator after the loop are the wire format the decoder reverses.
    context.pushCode(`for (int ${index} = 0; ${index} < ${this.array.length}; ${index}++) {`);
    await element.pushPrint(context, `${symbol}[${index}]`, fileSymbol);
    context.pushCode(`fprintf(${fileSymbol}, "${C_ELEMENT_SEPARATOR}");`);
    context.pushCode('}');
    context.pushCode(`fprintf(${fileSymbol}, "${C_LIST_TERMINATOR}");`);
  }
}
