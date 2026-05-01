import { Language } from '$lib/zenstack/models';
import z from 'zod';
import { TypeWithValue } from '.';
import { LanguageRegistry } from '../languageRegistry';
import { LanguageType } from './languageType';
import type { JsonValue } from '@zenstackhq/orm';

const ValueSchema = z.object({
  value: z.string().regex(/(?:0[0-7]*)|(?:0[xX][0-9a-fA-F]*)|(?:[0-9]*)|(?:'.')/),
  signed: z.enum(['signed', 'unsigned', 'none']),
  size: z.union([z.literal(8), z.literal(16), z.literal(32), z.literal(64)])
});

type Value = z.infer<typeof ValueSchema>;

export class Int extends TypeWithValue<Value> {
  constructor(data?: JsonValue) {
    let value: Value = { value: '0', size: 32, signed: 'none' };
    if (data) value = ValueSchema.parse(data);

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

  public constructTypeExpression(): string {
    return this.cType;
  }

  public constructExpression(): string {
    return this.cExpression;
  }

  public constructPrint(symbol: string): string {
    const { value } = this.typeWithValue;
    let printfTemplate = '%';

    if (value.size == 64) {
      printfTemplate += 'll';
    }

    if (value.size == 16) {
      printfTemplate += 'h';
    }

    if (value.size == 8) {
      printfTemplate += 'hh';
    }

    if (value.signed == 'signed' || value.signed == 'none') {
      printfTemplate += 'd';
    } else {
      printfTemplate += 'u';
    }

    if (value.size == 8) {
      printfTemplate += " (\\'%c\\')";
    }

    return `printf("${printfTemplate}", ${symbol});`;
  }

  public constructEqualityCheck(resultSymbol: string, symbolA: string, symbolB: string): string {
    return `int ${resultSymbol} = ${symbolA} == ${symbolB};`;
  }

  public constructLessThanCheck(resultSymbol: string, symbolA: string, symbolB: string): string {
    return `int ${resultSymbol} = ${symbolA} < ${symbolB};`;
  }

  public constructLessThanEqualCheck(
    resultSymbol: string,
    symbolA: string,
    symbolB: string
  ): string {
    return `int ${resultSymbol} = ${symbolA} <= ${symbolB};`;
  }

  public constructWithinRangeCheck(
    resultSymbol: string,
    symbol: string,
    actualSymbol: string,
    range: string
  ): string {
    return `int ${resultSymbol} = (${actualSymbol} < ${symbol} + ${range}) && (${actualSymbol} > ${symbol} - ${range});`;
  }
}
