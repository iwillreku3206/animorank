import { TypeWithValue } from './index';
import type { TypeInfo } from './typeInfo';
import z from 'zod';
import type { JsonValue } from '@zenstackhq/orm';
import { LanguageRegistry } from '../languageRegistry';
import { LanguageType } from './languageType';
import FontIcon from '@iconify-svelte/fa6-solid/font';

const ValueSchema = z.object({
  value: z.string()
});

type Value = z.infer<typeof ValueSchema>;

export class StringType extends TypeWithValue<Value> {
  static typeInfo: TypeInfo<Value> = {
    typeKey: 'string',
    label: 'String',
    icon: FontIcon,
    valueSchema: ValueSchema,
    fields: {
      value: {
        name: 'value',
        label: 'String Value',
        type: 'text',
        defaultValue: ''
      }
    },
    defaultValue: { value: '' }
  };

  static valueSchema = ValueSchema;

  constructor(data?: JsonValue) {
    let value: Value = { value: '' };
    if (data) value = ValueSchema.parse(data);

    super(value, new StringLanguageRegistry());
  }

  static createDefault(): StringType {
    return new StringType();
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

  constructor(typeWithValue: StringType) {
    super(typeWithValue);

    this.cType = 'char *';
  }

  public constructInit(symbol: string): string {
    const { value } = this.typeWithValue.value;
    const actualLength = Math.max(value.length);
    const buffer = `[${actualLength}]`;

    // Create a string literal with padding
    const paddedValue = value.padEnd(actualLength, '\0');
    const charArray = `"${paddedValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

    return `${this.cType}${buffer} ${symbol} = ${charArray};`;
  }

  public constructTypeExpression(): string {
    return `char*`;
  }

  public constructExpression(): string {
    const { value } = this.typeWithValue.value;
    return `"${value}"`;
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
