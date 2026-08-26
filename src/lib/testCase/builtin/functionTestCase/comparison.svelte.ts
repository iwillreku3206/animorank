import type { JsonValue } from '@zenstackhq/orm';
import { OperatorSchema, type Operator } from './operator.svelte';
import type { Type } from './type.svelte';
import { SymbolSchema, type Symbol } from './types';
import { TypeValueSchema, type TypeValue } from './typeValue.svelte';
import z from 'zod';

export type ComparisonDefinition = {
  /**
   * @description The data to compare to
   */
  value: TypeValue;

  /**
   * @description The symbol to compare
   */
  symbol: Symbol;

  /**
   * @description The operator to use.
   * The left operand is the expected, the right operand is the actual result.
   */
  operator: Operator;
};

let comparisonSchema: ReturnType<typeof buildComparisonSchema> | undefined;

function buildComparisonSchema() {
  return z.object({
    symbol: SymbolSchema,
    operator: OperatorSchema,
    value: TypeValueSchema
  });
}

/**
 * @description Zod schema for a comparison
 * @see Comparison
 *
 * Lazily built: the provider import graph (types → registry/global →
 * testCaseRegistry → functionTestCase) is cyclic at module-eval, so schemas
 * must not reference cross-module bindings until first use.
 */
export function getComparisonSchema() {
  return (comparisonSchema ??= buildComparisonSchema());
}

/**
 * @description Defines a comparison to test
 */
export class Comparison {
  /**
   * @description The data to compare to
   */
  public value: TypeValue = $state() as TypeValue;

  /**
   * @description The symbol to compare
   */
  public symbol: Symbol = $state() as Symbol;

  /**
   * @description The operator to use.
   * The left operand is the expected, the right operand is the actual result.
   */
  public operator: Operator = $state() as Operator;

  public toJSON(): JsonValue {
    return {
      value: this.value.toJSON(),
      operator: this.operator.toJSON(),
      symbol: this.symbol
    };
  }

  private constructor({ value, symbol, operator }: ComparisonDefinition) {
    this.value = value;
    this.operator = operator;
    this.symbol = symbol;
  }

  /**
   * Constructs with a default type and operator
   */
  static create(type: Type, operator: Operator) {
    return new Comparison({
      value: type.defaultValue(),
      operator,
      symbol: 'return'
    });
  }

  /**
   * Constructs with specific (loaded) values
   */
  public static from(value: ComparisonDefinition) {
    return new Comparison(value);
  }
}
