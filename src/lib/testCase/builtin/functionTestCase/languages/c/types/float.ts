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
    const normalized = /[.eE]/.test(value) ? value : `${value}.0`;
    return this.type.options.size === 64 ? normalized : `${normalized}f`;
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
    // Round-trip precision: the printed text feeds readFromPrint and the JS
    // comparison operators, so %f/%lf's 6-decimal truncation misgraded
    // correct submissions (1.0f/3.0f printed "0.333333" vs the true float
    // value 0.333333343). %.9g/%.17g print exactly enough digits to
    // round-trip float/double.
    const template = this.type.options.size === 64 ? '%.17g' : '%.9g';
    context.pushCode(`fprintf(${fileSymbol}, "${template}", ${symbol});`);
  }
}
