import { Integer } from '../../../types/int';
import { TypeValue } from '../../../typeValue.svelte';
import { CType } from '../cType';
import type { CExecutionContext } from '../executionContext';

export class CInteger extends CType<Integer> {
  public async readFromPrint(printed: string): Promise<TypeValue<Integer>> {
    return new TypeValue(this.type, { value: printed });
  }
  static type = Integer;

  private typeDef() {
    const { signed, size } = this.type.options;
    let def = signed === false ? 'unsigned ' : signed === true ? 'signed ' : '';
    def += size === 8 ? 'char' : size === 16 ? 'short' : size === 32 ? 'int' : 'long long int';
    return def;
  }

  private printfSymbol() {
    const { signed, size } = this.type.options;
    let printfTemplate = '%';

    if (size === 64) {
      printfTemplate += 'll';
    }

    if (size === 16) {
      printfTemplate += 'h';
    }

    if (size === 8) {
      printfTemplate += 'hh';
    }

    if (signed === true || signed === null) {
      printfTemplate += 'd';
    } else {
      printfTemplate += 'u';
    }

    return printfTemplate;
  }

  public async generateParameterDefinition(symbol: string): Promise<string> {
    return `${this.typeDef()} ${symbol}`;
  }
  public async generateReturnType(): Promise<string> {
    return this.typeDef();
  }
  public async pushDeclaration(
    context: CExecutionContext,
    symbol: string,
    value?: TypeValue<Integer> | undefined
  ): Promise<void> {
    const { signed, size } = this.type.options;
    context.pushCode(`${this.typeDef()} ${symbol};`);
    if (value) {
      const decString = BigInt(value.value.value).toString(10);
      // 64-bit literals need the correct suffix: `ll` for signed, `ull` for
      // unsigned — UINT64_MAX as `…ll` exceeds `long long` and fails -Werror.
      // INT64_MIN cannot be written as a single literal, so emit it as an
      // arithmetic expression. (signed === null behaves as signed, matching
      // printfSymbol.)
      let literal = `${decString}${size === 64 ? (signed === false ? 'ull' : 'll') : ''}`;
      if (size === 64 && signed !== false && decString === '-9223372036854775808') {
        literal = '(-9223372036854775807ll - 1ll)';
      }
      context.pushCode(`${symbol} = ${literal};`);
    }
  }
  public async pushPreDefinitions(context: CExecutionContext): Promise<void> {
    context.pushHeader('stdio.h');
  }
  public async pushPrint(context: CExecutionContext, symbol: string, fileSymbol: string): Promise<void> {
    context.pushCode(`fprintf(${fileSymbol}, "${this.printfSymbol()}", ${symbol});`);
  }
}
