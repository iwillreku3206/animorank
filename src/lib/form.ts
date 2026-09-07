import type { Component, ComponentType } from 'svelte';
import { z } from 'zod';
import type { Type } from '$lib/testCase/builtin/functionTestCase/type.svelte';
import type { IntoJsonValue } from './types/utils';

export type FormFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'code'
  | 'markdown'
  | 'typeEditor'
  | 'checkbox'
  | 'radio'
  | 'segmented'
  | 'date'
  | 'time'
  | 'datetime'
  | 'range'
  | 'url';

interface NumericExtra {
  min?: number;
  max?: number;
  isInteger?: boolean;
}

interface TemporalExtra {
  earliest?: string | Date;
  latest?: string | Date;
}

interface SelectionExtra {
  // Legacy class components (e.g. @iconify-svelte) and modern svelte 5
  // function components are both renderable as dynamic components.
  options:
    | readonly string[]
    | readonly number[]
    | readonly { label: string; value: unknown; icon?: Component | ComponentType }[];
}

interface TextExtra {
  regex?: RegExp | string;
}

interface TypeEditorExtra {
  /** Type ids the picker should not offer (e.g. pointer targets can't be void). */
  excludeTypeIds?: readonly string[];
}

type FieldConfigLookup = {
  text: TextExtra;
  url: TextExtra;
  code: TextExtra;
  markdown: TextExtra;
  number: NumericExtra;
  range: NumericExtra;
  date: TemporalExtra;
  time: TemporalExtra;
  datetime: TemporalExtra;
  select: SelectionExtra;
  radio: SelectionExtra;
  segmented: SelectionExtra;
  typeEditor: TypeEditorExtra;
  checkbox: object;
};

export type FormFieldDefinition = {
  [K in FormFieldType]: {
    label: string;
    type: K;
    default?: InferValueType<K>;
  } & FieldConfigLookup[K];
}[FormFieldType];

export interface Form {
  fields: Record<string, FormFieldDefinition>;
}

export type InferValueType<T extends FormFieldType> = T extends 'number' | 'range'
  ? number
  : T extends 'checkbox'
    ? boolean
    : T extends 'date' | 'time' | 'datetime'
      ? Date | string
      : T extends 'select' | 'radio' | 'segmented'
        ? FieldConfigLookup[T] extends { options: readonly (infer O)[] }
          ? O extends { value: infer V }
            ? V
            : O
          : IntoJsonValue
        : T extends 'typeEditor'
          ? Type
          : string;

export type ExtractExactValue<F> = F extends { type: 'number' | 'range' }
  ? number
  : F extends { type: 'checkbox' }
    ? boolean
    : F extends { type: 'date' | 'time' | 'datetime' }
      ? Date | string
      : F extends { type: 'select' | 'radio' | 'segmented'; options: readonly (infer O)[] }
        ? O extends { value: infer V }
          ? V
          : O
        : F extends { type: 'typeEditor' }
          ? Type
          : string;

export type FormValue<T extends Form> = {
  [K in keyof T['fields']]: ExtractExactValue<T['fields'][K]>;
};

function buildFieldSchema(field: FormFieldDefinition): z.ZodTypeAny {
  switch (field.type) {
    case 'text':
    case 'code':
    case 'markdown': {
      let s = z.string();
      if (field.regex) {
        s = s.regex(field.regex instanceof RegExp ? field.regex : new RegExp(field.regex));
      }
      return field.default !== undefined ? s.default(field.default) : s;
    }
    case 'url': {
      const s = z.url();
      return field.default !== undefined ? s.default(field.default) : s;
    }
    case 'number':
    case 'range': {
      let s = z.number();
      if (field.min !== undefined) s = s.min(field.min);
      if (field.max !== undefined) s = s.max(field.max);
      if (field.isInteger) s = s.int();
      return field.default !== undefined ? s.default(field.default) : s;
    }
    case 'typeEditor': {
      const s = z.any();
      return field.default !== undefined ? s.default(field.default) : s;
    }
    case 'checkbox': {
      const s = z.boolean();
      return field.default !== undefined ? s.default(field.default) : s;
    }

    case 'date':
    case 'time':
    case 'datetime': {
      const s = z.union([z.date(), z.string()]);
      return field.default !== undefined ? s.default(field.default) : s;
    }
    case 'select':
    case 'radio':
    case 'segmented': {
      const opts = field.options;
      const values: readonly unknown[] =
        opts.length === 0
          ? []
          : typeof opts[0] === 'string' || typeof opts[0] === 'number'
            ? opts
            : opts.map((o) => (o as { value: unknown }).value);

      if (values.length > 0 && values.every((v) => typeof v === 'string')) {
        const s = z.enum(values as string[]);
        return field.default !== undefined ? s.default(field.default as string) : s;
      }
      // Non-string option values (numbers, booleans, null): build a literal
      // union so out-of-enum stored values are rejected instead of passing
      // through z.any() and reaching codegen's strict-equality branches.
      const s =
        values.length > 0
          ? z.union(
              values.map((v) => z.literal(v as string | number | boolean | null)) as unknown as [
                z.ZodTypeAny,
                z.ZodTypeAny,
                ...z.ZodTypeAny[]
              ]
            )
          : z.any();
      return field.default !== undefined ? s.default(field.default) : s;
    }
  }
}

export function extractZodSchema<F extends Form>(form: F): z.ZodType<FormValue<F>> {
  const shape: Record<string, z.ZodType> = {};

  for (const [key, field] of Object.entries(form.fields)) {
    shape[key] = buildFieldSchema(field);
  }

  // TODO: make this stricter
  return z.object(shape) as z.ZodType<FormValue<F>>;
}
