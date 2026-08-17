import { Integer } from '../../../types/int';
import { TypeValue } from '../../../typeValue.svelte';
import { CType } from '../cType';
import type { CExecutionContext } from '../executionContext';

export class CInteger extends CType<Integer> {
  public readFromPrint(printed: string): TypeValue<Integer> {
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

  public generateParameterDefinition(symbol: string): string {
    return `${this.typeDef()} ${symbol}`;
  }
  public generateReturnType(): string {
    return this.typeDef();
  }
  public pushDeclaration(context: CExecutionContext, symbol: string, value?: TypeValue<Integer> | undefined): void {
    const { size } = this.type.options;
    context.pushCode(`${this.typeDef()} ${symbol};`);
    if (value) {
      const decString = BigInt(value.value.value).toString(10);
      context.pushCode(`${symbol} = ${decString}${size === 64 ? 'll' : ''};`);
    }
  }
  public pushPreDefinitions(context: CExecutionContext): void {
    context.pushHeader('stdio.h');
  }
  public pushPrint(context: CExecutionContext, symbol: string, fileSymbol: string): void {
    context.pushCode(`fprintf(${fileSymbol}, "${this.printfSymbol()}", ${symbol});`);
  }
}
