import { TypeValue } from '$lib/testCase/builtin/functionTestCase/typeValue.svelte';
import { CType } from '$lib/testCase/builtin/functionTestCase/languages/c/cType';
import type { CExecutionContext } from '$lib/testCase/builtin/functionTestCase/languages/c/executionContext';
import { C_ELEMENT_SEPARATOR, C_LIST_TERMINATOR, decodeList, escapeCString, escapeElement } from './global';
import { ArrayType } from './arrayTypes';

/** The C element type for an array of the given element type id. */
function cElementType(elementId: string): string {
  if (elementId === 'int') return 'int';
  if (elementId === 'float') return 'double';
  return 'char*';
}

/** The printf conversion a printed element uses; the wire format escapes whatever these emit. */
function printfConversion(elementId: string, element: string, fileSymbol: string): string {
  if (elementId === 'int') return `fprintf(${fileSymbol}, "%d", ${element});`;
  if (elementId === 'float') return `fprintf(${fileSymbol}, "%.17g", ${element});`;
  return `fprintf(${fileSymbol}, "%s", ${element});`;
}

/**
 * An array in the generated C harness, passed as a null-terminated pointer —
 * the same shape a C string has, so one symbol is the whole argument.
 *
 * A null terminator rather than a separate length: the generated call passes
 * one symbol per parameter, and an element can never be null (the value model
 * holds strings, never pointers), so the sentinel is unambiguous. Printing
 * writes each element through its own printf conversion, separated by the wire
 * format the decoder reverses.
 */
export class CArrayType extends CType<ArrayType> {
  static type = ArrayType;

  private readonly array: ArrayType;

  constructor(_language: unknown, type: unknown) {
    super(_language as never, type as ArrayType);
    this.array = (type instanceof ArrayType ? type : ArrayType.create()) as ArrayType;
  }

  public async readFromPrint(printed: string): Promise<TypeValue<ArrayType>> {
    return new TypeValue(this.array, decodeList(printed));
  }

  public async generateParameterDefinition(symbol: string): Promise<string> {
    return `${cElementType(this.array.elementId())}* ${symbol}`;
  }

  public async generateReturnType(): Promise<string> {
    return `${cElementType(this.array.elementId())}*`;
  }

  public async pushDeclaration(
    context: CExecutionContext,
    symbol: string,
    value?: TypeValue<ArrayType>
  ): Promise<void> {
    const element = cElementType(this.array.elementId());
    if (!value) {
      context.pushCode(`${element}* ${symbol} = NULL;`);
      return;
    }

    // The wire escape runs first, then the C literal keeps it intact.
    const elements = (value.value as string[]).map((item) =>
      element === 'char*' ? `"${escapeCString(escapeElement(item))}"` : item
    );
    // The compound literal carries its own storage, so the pointer stays valid
    // for the call that consumes it.
    context.pushCode(`${element} ${symbol}_data[] = {${[...elements, 'NULL'].join(', ')}};`);
    context.pushCode(`${element}* ${symbol} = ${symbol}_data;`);
  }

  public async pushPreDefinitions(): Promise<void> {
    // Arrays declare nothing up front: their elements print through the
    // conversions the harness already includes.
  }

  public async pushPrint(context: CExecutionContext, symbol: string, fileSymbol: string): Promise<void> {
    // The index must not be a context symbol: `getNewSymbol` hands back the same
    // name the caller already used for the array itself.
    const index = `${symbol}_i`;
    // Every element is printed with a trailing separator, and the terminator
    // ends the list, so an empty array and one holding an empty element stay
    // distinguishable.
    context.pushCode(`for (int ${index} = 0; ${symbol}[${index}] != NULL; ${index}++) {`);
    context.pushCode(printfConversion(this.array.elementId(), `${symbol}[${index}]`, fileSymbol));
    context.pushCode(`fprintf(${fileSymbol}, "${C_ELEMENT_SEPARATOR}");`);
    context.pushCode('}');
    context.pushCode(`fprintf(${fileSymbol}, "${C_LIST_TERMINATOR}");`);
  }
}
