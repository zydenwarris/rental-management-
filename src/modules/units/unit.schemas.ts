import { z } from "zod";
import { UnitStatus } from "./unit.types.js";

const centsSchema = z.number().int().nonnegative();

export const unitCreateSchema = z.object({
  propertyId: z.string().trim().min(1),
  label: z.string().trim().min(1).max(50),
  bedrooms: z.number().int().min(0).max(50),
  bathrooms: z.number().int().min(0).max(50),
  marketRent: centsSchema,
  description: z.string().trim().max(2000).default(""),
  notes: z.string().trim().max(2000).default(""),
});

export const unitUpdateSchema = unitCreateSchema
  .extend({ status: z.nativeEnum(UnitStatus) })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Update requires at least one field.",
  });

export type UnitCreateInput = z.infer<typeof unitCreateSchema>;
export type UnitUpdateInput = z.infer<typeof unitUpdateSchema>;
