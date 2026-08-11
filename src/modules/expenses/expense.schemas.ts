import { z } from "zod";
import { isIsoDate } from "../../shared/dates.js";
import { ExpenseCategory } from "./expense.types.js";

const isoDateSchema = z
  .string()
  .refine(isIsoDate, { message: "Expected a calendar date in YYYY-MM-DD form." });

export const expenseCreateSchema = z.object({
  propertyId: z.string().trim().min(1),
  unitId: z.string().trim().min(1).nullable().default(null),
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().trim().min(1).max(500),
  amount: z.number().int().positive({ message: "Amount must be greater than zero." }),
  date: isoDateSchema,
  vendor: z.string().trim().max(200).default(""),
  notes: z.string().trim().max(2000).default(""),
});

export const expenseUpdateSchema = expenseCreateSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Update requires at least one field.",
  });

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
