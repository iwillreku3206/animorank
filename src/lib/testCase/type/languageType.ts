import type { TypeWithValue } from '.';

export abstract class LanguageType<T, TV = TypeWithValue<T>> {
  protected typeWithValue: TV;

  constructor(typeWithValue: TV) {
    this.typeWithValue = typeWithValue;
  }

  public abstract constructInit(symbol: string): string;
  public abstract constructExpression(): string;
  public abstract constructEqualityCheck(symbolA: string, symbolB: string): string;
  public abstract constructLessThanCheck(symbolA: string, symbolB: string): string;
  public abstract constructLessThanEqualCheck(symbolA: string, symbolB: string): string;
  public abstract constructWithinRangeCheck(
    symbol: string,
    actualSymbol: string,
    range: string
  ): string;
}
