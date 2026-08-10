import { TypeWithValue } from './index';
import type { TypeInfo } from './typeInfo';
import z from 'zod';
import type { JsonValue } from '@zenstackhq/orm';
import { LanguageRegistry } from '../languageRegistry';
import { LanguageType } from './languageType';
import PercentIcon from '@iconify-svelte/fa6-solid/percent';

const ValueSchema = z.object({
  value: z.string().regex(/^-?\d+(\.\d+)?(e[+-]?\d+)?$/),
  size: z.union([z.literal(32), z.literal(64)])
});

type Value = z.infer<typeof ValueSchema>;

export class Float extends TypeWithValue<Value> {
  static typeInfo: TypeInfo<Value> = {
    typeKey: 'float',
    label: 'Floating Point',
    icon: PercentIcon,
    valueSchema: ValueSchema,
    fields: {
      value: {
        name: 'value',
        label: 'Value',
        type: 'text',
        defaultValue: '0'
      },
      size: {
        name: 'size',
        label: 'Precision',
        type: 'select',
        options: [
          { label: '32-bit (float)', value: 32 },
          { label: '64-bit (double)', value: 64 }
        ],
        defaultValue: 32
      }
    },
    defaultValue: { value: '0', size: 32 }
  };

  constructor(data?: JsonValue) {
    let value: Value = { value: '0', size: 32 };
    if (data) value = ValueSchema.parse(data);

    super(value, new FloatLanguageRegistry());
  }

  static createDefault(): Float {
    return new Float();
  }

  public toString(): string {
    return this.value.value;
  }
}

class FloatLanguageRegistry extends LanguageRegistry<Value> {
  constructor() {
    super();
    this.register('c', CFloat);
  }
}

class CFloat extends LanguageType<Value> {
  private cType: string = '';
  private cExpression: string = '';

  constructor(typeWithValue: Float) {
    super(typeWithValue);

    const { value, size } = this.typeWithValue.value;

    switch (size) {
      case 64:
        this.cType = 'double';
        break;
      case 32:
      default:
        this.cType = 'float';
        break;
    }

    this.cExpression = value;
    if (value.includes('.') || value.includes('e') || size === 32) {
      this.cExpression = `${this.cExpression}f`;
    } else {
      this.cExpression = `${this.cExpression}f`;
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
    let printfTemplate = '%';

    if (this.typeWithValue.value.size == 64) {
      printfTemplate += 'lf';
    } else {
      printfTemplate += 'f';
    }

    return `printf("${printfTemplate}", ${symbol});`;
  }

  public constructEqualityCheck(resultSymbol: string, symbolA: string, symbolB: string): string {
    return `int ${resultSymbol} = ${symbolA} == ${symbolB};`;
  }

  public constructLessThanCheck(resultSymbol: string, symbolA: string, symbolB: string): string {
    return `int ${resultSymbol} = ${symbolA} < ${symbolB};`;
  }

  public constructLessThanEqualCheck(resultSymbol: string, symbolA: string, symbolB: string): string {
    return `int ${resultSymbol} = ${symbolA} <= ${symbolB};`;
  }

  public constructWithinRangeCheck(resultSymbol: string, symbol: string, actualSymbol: string, range: string): string {
    return `int ${resultSymbol} = (${actualSymbol} < ${symbol} + ${range}) && (${actualSymbol} > ${symbol} - ${range});`;
  }
}
