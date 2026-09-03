import type { JsonValue } from '@zenstackhq/orm';
import { Pointer } from '../../../types/pointer';
import { TypeValue } from '../../../typeValue.svelte';
import type { Type } from '../../../type.svelte';
import { CType } from '../cType';
import type { CExecutionContext } from '../executionContext';
import { CFunctionTestCase } from '../c';

export class CPointer extends CType<Pointer> {
  static type = Pointer;

  public constructor(language: CFunctionTestCase, type: Type) {
    super(language, type as Pointer);
  }

  public async readFromPrint(printed: string): Promise<TypeValue<Pointer>> {
    const inner = await (await this.innerCType()).readFromPrint(printed);
    return new TypeValue(this.type, inner.value as JsonValue);
  }

  private async innerCType(): Promise<CType<Type>> {
    return CFunctionTestCase.getTypeRegistry().getInstance(
      this.type.targetType.id,
      this.language,
      this.type.targetType
    );
  }

  private innerTypeValue(value: TypeValue<Pointer>): TypeValue<Type> {
    return new TypeValue(this.type.targetType, value.value as JsonValue);
  }

  public async generateParameterDefinition(symbol: string): Promise<string> {
    // generateReturnType() already appends the trailing `*` (int*), so a
    // pointer-to-int yields `int* p` and a pointer-to-pointer `int** p`.
    return `${await this.generateReturnType()} ${symbol}`;
  }

  public async generateReturnType(): Promise<string> {
    return `${await (await this.innerCType()).generateReturnType()}*`;
  }

  public async pushDeclaration(context: CExecutionContext, symbol: string, value?: TypeValue<Pointer>): Promise<void> {
    if (!value) {
      context.pushCode(`${await this.generateReturnType()} ${symbol};`);
      return;
    }

    const innerSymbol = `${symbol}__target`;
    await (await this.innerCType()).pushDeclaration(context, innerSymbol, this.innerTypeValue(value));
    context.pushCode(`${await this.generateReturnType()} ${symbol} = &${innerSymbol};`);
  }

  public async pushPreDefinitions(context: CExecutionContext): Promise<void> {
    await (await this.innerCType()).pushPreDefinitions(context);
  }

  public async pushPrint(context: CExecutionContext, symbol: string, fileSymbol: string): Promise<void> {
    await (await this.innerCType()).pushPrint(context, `*${symbol}`, fileSymbol);
  }
}
