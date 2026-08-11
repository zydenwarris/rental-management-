import { z } from "zod";
import { PropertyStatus, PropertyType } from "./property.types.js";

/**
 * Request-body validation. Schemas are the single home for "what is a valid
 * property payload"; the service receives already-valid data.
 */

export const propertyCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.nativeEnum(PropertyType),
  address: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).default(""),
  notes: z.string().trim().max(2000).default(""),
});

export const propertyUpdateSchema = propertyCreateSchema
  .extend({ status: z.nativeEnum(PropertyStatus) })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Update requires at least one field.",
  });

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
