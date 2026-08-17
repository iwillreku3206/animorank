import type { JsonValue } from '@zenstackhq/orm';
import { Pointer } from '../../../types/pointer';
import { TypeValue } from '../../../typeValue.svelte';
import type { Type } from '../../../type.svelte';
import { CType } from '../cType';
import type { CExecutionContext } from '../executionContext';
import type { CFunctionTestCase } from '../c';

export class CPointer extends CType<Pointer> {
  static type = Pointer;

  public constructor(language: CFunctionTestCase, type: Type) {
    super(language, type as Pointer);
  }

  public readFromPrint(printed: string): TypeValue<Pointer> {
    const inner = this.innerCType().readFromPrint(printed);
    return new TypeValue(this.type, inner.value as JsonValue);
  }

  private innerCType(): CType<Type> {
    return this.language.typeRegistry.getInstance(this.type.targetType.id, this.language, this.type.targetType);
  }

  private innerTypeValue(value: TypeValue<Pointer>): TypeValue<Type> {
    return new TypeValue(this.type.targetType, value.value as JsonValue);
  }

  public generateParameterDefinition(symbol: string): string {
    return `${this.innerCType().generateParameterDefinition(symbol)}*`;
  }

  public generateReturnType(): string {
    return `${this.innerCType().generateReturnType()}*`;
  }

  public pushDeclaration(context: CExecutionContext, symbol: string, value?: TypeValue<Pointer>): void {
    if (!value) {
      context.pushCode(`${this.generateReturnType()} ${symbol};`);
      return;
    }

    const innerSymbol = `${symbol}__target`;
    this.innerCType().pushDeclaration(context, innerSymbol, this.innerTypeValue(value));
    context.pushCode(`${this.generateReturnType()} ${symbol} = &${innerSymbol};`);
  }

  public pushPreDefinitions(context: CExecutionContext): void {
    this.innerCType().pushPreDefinitions(context);
  }

  public pushPrint(context: CExecutionContext, symbol: string, fileSymbol: string): void {
    this.innerCType().pushPrint(context, `*${symbol}`, fileSymbol);
  }
}
