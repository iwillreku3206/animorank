import { TypeWithValue } from './index';
import type { TypeInfo } from './typeInfo';
import z from 'zod';
import type { JsonValue } from '@zenstackhq/orm';
import { LanguageRegistry } from '../languageRegistry';
import { LanguageType } from './languageType';
import SlashIcon from '@iconify-svelte/fa6-solid/slash';

const ValueSchema = z.object({});

type Value = z.infer<typeof ValueSchema>;

export class VoidType extends TypeWithValue<Value> {
  static typeInfo: TypeInfo<Value> = {
    typeKey: 'void',
    label: 'Void',
    icon: SlashIcon,
    valueSchema: ValueSchema,
    fields: {},
    defaultValue: {}
  };

  constructor(data?: JsonValue) {
    let value: Value = {};
    if (data) value = ValueSchema.parse(data);

    super(value, new VoidLanguageRegistry());
  }

  static createDefault(): VoidType {
    return new VoidType();
  }

  public toString(): string {
    return 'void';
  }
}

class VoidLanguageRegistry extends LanguageRegistry<Value> {
  constructor() {
    super();
    this.register('c', CVoid);
  }
}

class CVoid extends LanguageType<Value> {
  constructor(typeWithValue: VoidType) {
    super(typeWithValue);
  }

  public constructInit(symbol: string): string {
    return `void ${symbol};`;
  }

  public constructTypeExpression(): string {
    return 'void';
  }

  public constructExpression(): string {
    return '';
  }

  public constructPrint(): string {
    return `printf("(void)");`;
  }

  public constructEqualityCheck(resultSymbol: string): string {
    return `int ${resultSymbol} = 0;`;
  }

  public constructLessThanCheck(resultSymbol: string): string {
    return `int ${resultSymbol} = 0;`;
  }

  public constructLessThanEqualCheck(resultSymbol: string): string {
    return `int ${resultSymbol} = 0;`;
  }

  public constructWithinRangeCheck(resultSymbol: string): string {
    return `int ${resultSymbol} = 0;`;
  }
}
