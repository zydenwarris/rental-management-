import { z } from "zod";
import { isIsoDate } from "../../shared/dates.js";
import { PaymentMethod } from "./payment.types.js";

const isoDateSchema = z
  .string()
  .refine(isIsoDate, { message: "Expected a calendar date in YYYY-MM-DD form." });

/**
 * A recorded payment must move money: whole cents, strictly positive. Zero and
 * negative "payments" are the classic way a rent ledger silently goes wrong, so
 * they are rejected at the boundary rather than corrected downstream.
 */
const paymentAmountSchema = z
  .number()
  .int({ message: "Amount must be whole cents (no fractions)." })
  .positive({ message: "Amount must be greater than zero." });

export const paymentCreateSchema = z.object({
  leaseId: z.string().trim().min(1),
  amount: paymentAmountSchema,
  paymentDate: isoDateSchema,
  dueDate: isoDateSchema,
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().max(100).default(""),
  notes: z.string().trim().max(2000).default(""),
});

/** leaseId is immutable: a payment applied to the wrong lease is deleted and re-recorded. */
export const paymentUpdateSchema = paymentCreateSchema
  .omit({ leaseId: true })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Update requires at least one field.",
  });

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;
