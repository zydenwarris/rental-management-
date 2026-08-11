import { z } from "zod";

export const tenantCreateSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(30),
  email: z.string().trim().email().max(320).or(z.literal("")).default(""),
  emergencyContactName: z.string().trim().max(200).default(""),
  emergencyContactPhone: z.string().trim().max(30).default(""),
  notes: z.string().trim().max(2000).default(""),
});

export const tenantUpdateSchema = tenantCreateSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Update requires at least one field.",
  });

export type TenantCreateInput = z.infer<typeof tenantCreateSchema>;
export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>;
