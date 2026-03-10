import { z } from 'zod';
import { BaseType, SizeModifier, type CType } from '../../../zenstack/models';

const BaseTypeEnum = z.enum(BaseType)
const SizeModifierEnum = z.enum(SizeModifier);

export const CTypeSchema = z.object({
  base: BaseTypeEnum,
  signed: z.boolean().nullable().optional(),
  sizeModifier: SizeModifierEnum.nullable().optional(),
  isPointer: z.boolean().nullable(),
})
  .superRefine((data, ctx) => {
    // @@validate(base == INT || sizeModifier == null)
    if (data.base !== 'INT' && data.sizeModifier !== null && data.sizeModifier !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Size modifier only applies to int",
        path: ['sizeModifier'],
      });
    }

    // @@validate(base == INT || base == CHAR || signed == null)
    if (data.base !== 'INT' && data.base !== 'CHAR' && data.signed !== null) {
      ctx.addIssue({
        code: "custom",
        message: "Signedness only applies to int or char",
        path: ['signed'],
      });
    }
  });

export const CTypeWithValueSchema = CTypeSchema.extend({
  value: z.string(),
});
