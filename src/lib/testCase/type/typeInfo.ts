import type Component from '@iconify-svelte/fa6-solid/0';
import type { ZodType } from 'zod';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio-group' | 'type-reference';
  options?: { label: string; value: string | number }[];
  defaultValue?: string | number | boolean;
  /** Which registered types are valid targets for this type-reference field. If undefined, any registered type is valid. */
  targetTypeKey?: string | string[];
}

export interface TypeInfo<T> {
  typeKey: string;
  icon: typeof Component;
  label: string;

  fields: Record<keyof T, FormField>;

  valueSchema: ZodType<T>;
  defaultValue: T;
}
