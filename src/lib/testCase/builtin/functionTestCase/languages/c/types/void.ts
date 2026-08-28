import { VoidType } from '../../../types/void';
import { TypeValue } from '../../../typeValue.svelte';
import { CType } from '../cType';
import type { CExecutionContext } from '../executionContext';

export class CVoid extends CType<VoidType> {
  static type = VoidType;

  public async readFromPrint(_printed: string): Promise<TypeValue<VoidType>> {
    return new TypeValue(this.type, {});
  }

  public async generateParameterDefinition(_symbol: string): Promise<string> {
    return 'void';
  }

  public async generateReturnType(): Promise<string> {
    return 'void';
  }

  public async pushDeclaration(
    _context: CExecutionContext,
    _symbol: string,
    _value?: TypeValue<VoidType>
  ): Promise<void> {
    // `void` cannot be declared as a variable; the harness consults
    // `type.isVoid` and never declares, prints, or compares a void value.
  }

  public async pushPreDefinitions(_context: CExecutionContext): Promise<void> {}

  public async pushPrint(_context: CExecutionContext, _symbol: string, _fileSymbol: string): Promise<void> {
    // A void return produces no value to print.
  }
}
