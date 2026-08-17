import { StringType } from '../../../types/string';
import { TypeValue } from '../../../typeValue.svelte';
import { CType } from '../cType';
import type { CExecutionContext } from '../executionContext';

function escapeCLiteral(value: string): string {
  return (
    '"' +
    value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t') +
    '"'
  );
}

export class CStringType extends CType<StringType> {
  public readFromPrint(printed: string): TypeValue<StringType> {
    return new TypeValue(this.type, { value: printed });
  }
  static type = StringType;

  public generateParameterDefinition(symbol: string): string {
    return `char* ${symbol}`;
  }

  public generateReturnType(): string {
    return 'char*';
  }

  public pushDeclaration(context: CExecutionContext, symbol: string, value?: TypeValue<StringType>): void {
    context.pushCode(`char* ${symbol};`);
    if (value) {
      context.pushCode(`${symbol} = ${escapeCLiteral(value.value.value)};`);
    }
  }

  public pushPreDefinitions(context: CExecutionContext): void {
    context.pushHeader('stdio.h');
  }

  public pushPrint(context: CExecutionContext, symbol: string, fileSymbol: string): void {
    context.pushCode(`fprintf(${fileSymbol}, "%s", ${symbol});`);
  }
}
