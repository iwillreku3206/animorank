import { LanguageType } from '../../languageType';
import type { Type } from '../../type.svelte';
import type { TypeValue } from '../../typeValue.svelte';
import type { CFunctionTestCase } from './c';
import type { CExecutionContext } from './executionContext';

export abstract class CType<T extends Type> extends LanguageType<CFunctionTestCase, T> {
  // eslint-disable-next-line no-unused-vars
  public abstract generateParameterDefinition(symbol: string): string;
  public abstract generateReturnType(): string;
  // eslint-disable-next-line no-unused-vars
  public abstract pushDeclaration(context: CExecutionContext, symbol: string, value?: TypeValue<T>): void;
  // eslint-disable-next-line no-unused-vars
  public abstract pushPreDefinitions(context: CExecutionContext): void;
  // eslint-disable-next-line no-unused-vars
  public abstract pushPrint(context: CExecutionContext, symbol: string, fileSymbol: string): void;
  // eslint-disable-next-line no-unused-vars
  public abstract readFromPrint(printed: string): TypeValue<T>;
}
