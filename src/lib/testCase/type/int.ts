import { Language } from '$lib/zenstack/models';
import z from 'zod';
import { TypeWithValue } from '.';
import { LanguageRegistry } from '../languageRegistry';
import { LanguageType } from './languageType';

const ValueSchema = z.object({
  value: z.string().regex(/(?:0[0-7]*)|(?:0[xX][0-9a-fA-F]*)|(?:[0-9]*)|(?:'.')/),
  signed: z.enum(['signed', 'unsigned', 'none']),
  size: z.union([z.literal(8), z.literal(16), z.literal(32), z.literal(64)])
});

type Value = z.infer<typeof ValueSchema>;

export class Int extends TypeWithValue<Value> {
  constructor(value: Value) {
    super(value, new IntLanguageRegistry());
  }
}

class IntLanguageRegistry extends LanguageRegistry<Value> {
  constructor() {
    super();
    this.register('c', CInt);
  }
}

class CInt extends LanguageType<Value> {
  private cExpression: string = '';
  private cType: string = '';
  constructor(typeWithValue: Int) {
    super(typeWithValue);

    const { value, signed, size } = this.typeWithValue.value;

    if (signed !== 'none') {
      this.cType = `${signed} `;
    }

    switch (size) {
      case 64:
        this.cType = `${this.cType} long long int`;
        break;
      case 32:
        this.cType = `${this.cType} int`;
        break;
      case 16:
        this.cType = `${this.cType} short int`;
        break;
      case 8:
        this.cType = `${this.cType} char`;
        break;
    }

    this.cExpression = value;
    if (!value.startsWith("'")) {
      if (size == 64) this.cExpression = `${this.cExpression}ll`;
      if (signed == 'unsigned') this.cExpression = `${this.cExpression}u`;
    }
  }

  public constructInit(symbol: string): string {
    return `${this.cType} ${symbol} = ${this.cExpression};`;
  }

  public constructExpression(): string {
    return this.cExpression;
  }

  public constructEqualityCheck(symbolA: string, symbolB: string): string {
    return `${symbolA} == ${symbolB}`;
  }
  public constructLessThanCheck(symbolA: string, symbolB: string): string {
    return `${symbolA} < ${symbolB}`;
  }
  public constructLessThanEqualCheck(symbolA: string, symbolB: string): string {
    return `${symbolA} <= ${symbolB}`;
  }
  public constructWithinRangeCheck(symbol: string, actualSymbol: string, range: string): string {
    return `(${symbol} < ${actualSymbol} + ${range}) && (${symbol} > ${actualSymbol} - ${range})`;
  }
}
