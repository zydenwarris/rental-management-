import type { BaseEntity } from "../../shared/types.js";
import type { Cents } from "../../shared/money.js";
import type { IsoDate } from "../../shared/dates.js";

export const PaymentMethod = {
  Cash: "cash",
  BankTransfer: "bank_transfer",
  Cheque: "cheque",
  Card: "card",
  Other: "other",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

/**
 * Derived from the amount paid against the rent owed and the payment date
 * against the due date. Never set directly by the caller — a landlord could
 * otherwise record a 10-dollar payment as "paid" and corrupt every total.
 */
export const PaymentStatus = {
  Paid: "paid",
  Partial: "partial",
  Pending: "pending",
  Late: "late",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export interface Payment extends BaseEntity {
  readonly leaseId: string;
  /** Denormalised from the lease so payment queries need no joins. */
  readonly tenantId: string;
  readonly unitId: string;
  readonly propertyId: string;
  readonly amount: Cents;
  readonly paymentDate: IsoDate;
  readonly dueDate: IsoDate;
  readonly method: PaymentMethod;
  readonly reference: string;
  readonly status: PaymentStatus;
  readonly notes: string;
}

export type PaymentCreate = Omit<Payment, keyof BaseEntity>;
export type PaymentUpdate = Partial<PaymentCreate>;
