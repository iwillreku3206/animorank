import type { Component } from 'svelte';
import { TypeSchema, type Type } from './type.svelte';
import { TypeValueSchema, type TypeValue } from './typeValue.svelte';
import z from 'zod';
import type { Problem } from '$lib/problem';
import { TypeRegistry } from './typeRegistry';
import type { JsonObject } from '@zenstackhq/orm';

/**
 * @description Defines a function parameter
 */
type Parameter = {
  /**
   * @description Stable id so test-case parameter values can follow this
   * parameter across renames and removals. Created once at parameter
   * creation; backfilled for legacy parameters on edit-page load.
   */
  id?: string;

  /**
   * @description Name (or symbol) of the parameter.
   * Only used if the language supports named parameters
   */
  name: string;

  /**
   * @description Type of the parameter
   */
  type: Type | null;
};

export const ParameterSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .nullable()
    .transform((str) => str ?? undefined)
    .optional(),
  type: TypeSchema.nullable()
});

/**
 * @description Defines a function
 */
export type Function = {
  /**
   * @description Function Name
   */
  name: string;

  /**
   * @description Symbol Name
   * If not specified, the function name is used. Used for either function overloading or more readable labels
   */
  symbol: string;

  /**
   * @description Function input parameters
   */
  parameters: Parameter[];

  /**
   * @description Return value(s) of the function
   * In languages that do not support multiple return types, this will only use the first type.
   */
  returnType: (Type | null)[];
};

export const FunctionSchema = z.object({
  name: z.string(),
  symbol: z.string().optional(),
  parameters: z.array(ParameterSchema),
  returnType: z.array(TypeSchema.nullable())
});

/**
 * @description Defines a function input parameter
 */
export type ParameterValue<T extends Type = Type> = {
  /**
   * @description Stable id of the definition parameter this value belongs to.
   * Lets syncParameters keep values attached across removals and renames
   * (M8).
   */
  id?: string;

  /**
   * @description Name (or symbol) of the parameter.
   * Only used if the language supports named parameters
   */
  name?: string;

  /**
   * @description Value of the parameter
   */
  value: TypeValue<T>;
};

export const ParameterValueSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .nullable()
    .transform((str) => str ?? undefined)
    .optional(),
  value: TypeValueSchema
});

export type ValueEditor<T extends Type> = Component<{
  value: TypeValue<T>;
}>;

export type ValueDisplay<T extends Type> = Component<{
  value: TypeValue<T>;
}>;
/**
 * @description Defines symbols for functions
 * `return` just compares the `TypeValue` to the return value of the function. In multiple-return languages, it will just be the first return value
 * `return{uint}` compares to the nth return value. This is only supported in languages with multi-return, such as Lua, Python or Go
 * `param{uint}`compares to the `nth` parameter. This is intended for use with out-values or pointer-like types. However, if it is used with a constant value, it just compares two constant values, which makes the comparison useless
 */
export type Symbol = 'return' | `return${number}` | `param${number}`;

/**
 * @description Checks if a given string is a valid symbol
 * @param {string} symbol The symbol to check
 * @returns {Symbol} The symbol type, if valid
 * @throws {Error} - Throws an error if the symbol is invalid
 */
export function parseSymbol(symbol: string): Symbol {
  if (!symbol.match(/^(?:return\d*|param\d+)$/)) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }

  return symbol as Symbol;
}

/**
 * Zod schema for symbols
 */
export const SymbolSchema = z.string().regex(/^(return|return\d+|param\d+)$/);

export type FunctionTestCaseProblemData = {
  functions: Record<string, Function>;
};

export const FunctionTestCaseProblemDataSchema = z.object({
  functions: z.record(z.string(), FunctionSchema)
});

export function parseExtensionData(problem: Problem): FunctionTestCaseProblemData {
  const {
    data: parsedData,
    error,
    success
  } = FunctionTestCaseProblemDataSchema.safeParse((problem.extension_data as JsonObject)['builtin_testCase_function']);

  if (!success) {
    console.warn('Invalid extension data detected for problem ' + problem.id + ': ' + JSON.stringify(error));
    return { functions: {} };
  }

  const data: FunctionTestCaseProblemData = { functions: {} };

  for (const [key, fn] of Object.entries(parsedData.functions)) {
    data.functions[key] = {
      name: fn.name,
      symbol: fn.symbol ?? '',
      parameters: fn.parameters.map((p) => ({
        id: p.id,
        name: p.name ?? '',
        type: p.type ? TypeRegistry.instance().from(p.type) : null
      })),
      returnType: fn.returnType.map((t) => (t ? TypeRegistry.instance().from(t) : null))
    };
  }

  return data;
}

export function serializeExtensionData(data: FunctionTestCaseProblemData): JsonObject {
  return {
    functions: Object.fromEntries(
      Object.entries(data.functions).map(([id, fn]) => [
        id,
        {
          name: fn.name,
          ...(fn.symbol ? { symbol: fn.symbol } : {}),
          parameters: fn.parameters.map((p) => ({
            ...(p.id ? { id: p.id } : {}),
            ...(p.name ? { name: p.name } : {}),
            type: p.type ? (p.type.toJSON() as JsonObject) : null
          })),
          returnType: fn.returnType.map((t) => (t ? (t.toJSON() as JsonObject) : null))
        }
      ])
    )
  };
}
