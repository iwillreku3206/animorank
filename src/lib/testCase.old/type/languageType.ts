/* eslint-disable no-unused-vars */
import type { TypeWithValue } from '.';

export abstract class LanguageType<T, TV = TypeWithValue<T>> {
  protected typeWithValue: TV;

  constructor(typeWithValue: TV) {
    this.typeWithValue = typeWithValue;
  }

  public abstract constructInit(symbol: string): string;
  public abstract constructExpression(): string;
  public abstract constructTypeExpression(): string;
  public abstract constructPrint(symbol: string): string;
  public abstract constructEqualityCheck(resultSymbol: string, symbolA: string, symbolB: string): string;
  public abstract constructLessThanCheck(resultSymbol: string, symbolA: string, symbolB: string): string;
  public abstract constructLessThanEqualCheck(resultSymbol: string, symbolA: string, symbolB: string): string;
  public abstract constructWithinRangeCheck(
    resultSymbol: string,
    symbol: string,
    actualSymbol: string,
    range: string
  ): string;

  public resolveSymbol(symbol: string): string {
    return symbol;
  }
}
