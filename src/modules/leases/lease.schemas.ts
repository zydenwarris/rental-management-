import { z } from "zod";
import { isIsoDate, isDateBefore } from "../../shared/dates.js";
import { MAX_RENT_DUE_DAY, MIN_RENT_DUE_DAY } from "../../config/constants.js";
import { LeaseStatus } from "./lease.types.js";

const isoDateSchema = z
  .string()
  .refine(isIsoDate, { message: "Expected a calendar date in YYYY-MM-DD form." });

const centsSchema = z.number().int().nonnegative();

const leaseFields = z.object({
  tenantId: z.string().trim().min(1),
  unitId: z.string().trim().min(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  monthlyRent: centsSchema.positive(),
  securityDeposit: centsSchema,
  rentDueDay: z.number().int().min(MIN_RENT_DUE_DAY).max(MAX_RENT_DUE_DAY),
  utilitiesIncluded: z.boolean().default(false),
  notes: z.string().trim().max(2000).default(""),
});

/** The term must span at least one day: endDate strictly after startDate. */
const termIsOrdered = (lease: { startDate: string; endDate: string }) =>
  isDateBefore(lease.startDate, lease.endDate);

export const leaseCreateSchema = leaseFields.refine(termIsOrdered, {
  message: "endDate must be after startDate.",
  path: ["endDate"],
});

/**
 * Updates may not change tenant or unit — that is a different lease, not an
 * edit. Status is also excluded: it changes only through create-derivation and
 * terminateLease, never by direct write.
 */
export const leaseUpdateSchema = leaseFields
  .omit({ tenantId: true, unitId: true })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Update requires at least one field.",
  });

export const leaseStatusFilterSchema = z.nativeEnum(LeaseStatus).optional();

export type LeaseCreateInput = z.infer<typeof leaseCreateSchema>;
export type LeaseUpdateInput = z.infer<typeof leaseUpdateSchema>;
