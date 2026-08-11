import { z } from "zod";
import { isIsoDate } from "../../shared/dates.js";
import { MaintenancePriority, MaintenanceStatus } from "./maintenance.types.js";

const isoDateSchema = z
  .string()
  .refine(isIsoDate, { message: "Expected a calendar date in YYYY-MM-DD form." });

const costSchema = z.number().int().nonnegative().nullable();

export const maintenanceCreateSchema = z.object({
  propertyId: z.string().trim().min(1),
  unitId: z.string().trim().min(1).nullable().default(null),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.Medium),
  contractor: z.string().trim().max(200).default(""),
  estimatedCost: costSchema.default(null),
  reportedDate: isoDateSchema,
  scheduledDate: isoDateSchema.nullable().default(null),
  notes: z.string().trim().max(2000).default(""),
});

/** Status changes go through PATCH; the service validates the transition. */
export const maintenanceUpdateSchema = maintenanceCreateSchema
  .extend({
    status: z.nativeEnum(MaintenanceStatus),
    actualCost: costSchema,
    completedDate: isoDateSchema.nullable(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Update requires at least one field.",
  });

export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>;
export type MaintenanceUpdateInput = z.infer<typeof maintenanceUpdateSchema>;
