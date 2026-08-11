import type { BaseEntity } from "../../shared/types.js";
import type { Cents } from "../../shared/money.js";
import type { IsoDate } from "../../shared/dates.js";

export const ExpenseCategory = {
  Maintenance: "maintenance",
  Utilities: "utilities",
  Insurance: "insurance",
  PropertyTax: "property_tax",
  Management: "management",
  Repairs: "repairs",
  Supplies: "supplies",
  Other: "other",
} as const;

export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export interface Expense extends BaseEntity {
  readonly propertyId: string;
  /** null when the cost belongs to the property as a whole rather than one unit. */
  readonly unitId: string | null;
  readonly category: ExpenseCategory;
  readonly description: string;
  readonly amount: Cents;
  readonly date: IsoDate;
  readonly vendor: string;
  readonly notes: string;
}

export type ExpenseCreate = Omit<Expense, keyof BaseEntity>;
export type ExpenseUpdate = Partial<ExpenseCreate>;
