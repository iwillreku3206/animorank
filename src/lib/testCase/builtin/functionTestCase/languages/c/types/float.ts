import { Float } from '../../../types/float';
import { TypeValue } from '../../../typeValue.svelte';
import { CType } from '../cType';
import type { CExecutionContext } from '../executionContext';

export class CFloat extends CType<Float> {
  public readFromPrint(printed: string): TypeValue<Float> {
    return new TypeValue(this.type, { value: printed });
  }
  static type = Float;

  private typeDef() {
    return this.type.options.size === 64 ? 'double' : 'float';
  }

  private literal(value: string) {
    return this.type.options.size === 64 ? value : `${value}f`;
  }

  public generateParameterDefinition(symbol: string): string {
    return `${this.typeDef()} ${symbol}`;
  }

  public generateReturnType(): string {
    return this.typeDef();
  }

  public pushDeclaration(context: CExecutionContext, symbol: string, value?: TypeValue<Float>): void {
    context.pushCode(`${this.typeDef()} ${symbol};`);
    if (value) {
      context.pushCode(`${symbol} = ${this.literal(value.value.value)};`);
    }
  }

  public pushPreDefinitions(context: CExecutionContext): void {
    context.pushHeader('stdio.h');
  }

  public pushPrint(context: CExecutionContext, symbol: string, fileSymbol: string): void {
    const template = this.type.options.size === 64 ? '%lf' : '%f';
    context.pushCode(`fprintf(${fileSymbol}, "${template}", ${symbol});`);
  }
}
