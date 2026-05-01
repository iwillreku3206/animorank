import { Language } from '$lib/zenstack/models';
import z from 'zod';
import { TypeWithValue } from '.';
import { LanguageRegistry } from '../languageRegistry';
import { LanguageType } from './languageType';
import type { JsonValue } from '@zenstackhq/orm';

const ValueSchema = z.object({
  value: z.string(),
  length: z.number().min(0),
  nullTerminated: z.boolean()
});

type Value = z.infer<typeof ValueSchema>;

export class String extends TypeWithValue<Value> {
  constructor(data?: JsonValue) {
    let value: Value = { value: '', length: 1, nullTerminated: true };
    if (data) value = ValueSchema.parse(data);

    super(value, new StringLanguageRegistry());
  }
}

class StringLanguageRegistry extends LanguageRegistry<Value> {
  constructor() {
    super();
    this.register('c', CString);
  }
}

class CString extends LanguageType<Value> {
  private cType: string = '';
  private cExpression: string = '';

  constructor(typeWithValue: String) {
    super(typeWithValue);

    const { value, length, nullTerminated } = this.typeWithValue.value;

    this.cType = 'char *';
    this.cExpression = value;
  }

  public constructInit(symbol: string): string {
    const { value, length, nullTerminated } = this.typeWithValue.value;
    const actualLength = Math.max(value.length, length);
    const buffer = `[${actualLength}]`;
    const nullTerm = nullTerminated ? `\\0` : '';

    // Create a string literal with padding
    const paddedValue = value.padEnd(actualLength, '\0');
    const charArray = `"${paddedValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}${nullTerm}"`;

    return `${this.cType}${buffer} ${symbol} = ${charArray};`;
  }

  public constructTypeExpression(): string {
    const { value, length, nullTerminated } = this.typeWithValue.value;
    const actualLength = Math.max(value.length, length);
    return `char[${actualLength}]`;
  }

  public constructExpression(): string {
    const { value, length, nullTerminated } = this.typeWithValue.value;
    const actualLength = Math.max(value.length, length);
    return `char[${actualLength}]`;
  }

  public constructPrint(symbol: string): string {
    return `printf("%s", ${symbol});`;
  }

  public constructEqualityCheck(resultSymbol: string, symbolA: string, symbolB: string): string {
    return `int ${resultSymbol} = strcmp(${symbolA}, ${symbolB}) == 0;`;
  }

  public constructLessThanCheck(resultSymbol: string, symbolA: string, symbolB: string): string {
    return `int ${resultSymbol} = strcmp(${symbolA}, ${symbolB}) < 0;`;
  }

  public constructLessThanEqualCheck(
    resultSymbol: string,
    symbolA: string,
    symbolB: string
  ): string {
    return `int ${resultSymbol} = strcmp(${symbolA}, ${symbolB}) <= 0;`;
  }

  public constructWithinRangeCheck(
    resultSymbol: string,
    symbol: string,
    actualSymbol: string,
    range: string
  ): string {
    return `int ${resultSymbol} = (strlen(${actualSymbol}) < strlen(${symbol}) + ${range}) && (strlen(${actualSymbol}) > strlen(${symbol}) - ${range});`;
  }
}
