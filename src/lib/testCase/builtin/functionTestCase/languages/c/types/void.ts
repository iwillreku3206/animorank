import { VoidType } from '../../../types/void';
import { TypeValue } from '../../../typeValue.svelte';
import { CType } from '../cType';
import type { CExecutionContext } from '../executionContext';

export class CVoid extends CType<VoidType> {
  static type = VoidType;

  public readFromPrint(_printed: string): TypeValue<VoidType> {
    return new TypeValue(this.type, {});
  }

  public generateParameterDefinition(_symbol: string): string {
    return 'void';
  }

  public generateReturnType(): string {
    return 'void';
  }

  public pushDeclaration(_context: CExecutionContext, _symbol: string, _value?: TypeValue<VoidType>): void {
    // `void` cannot be declared as a variable; callers special-case void returns.
  }

  public pushPreDefinitions(_context: CExecutionContext): void {}

  public pushPrint(_context: CExecutionContext, _symbol: string, _fileSymbol: string): void {
    // A void return produces no value to print.
  }
}
