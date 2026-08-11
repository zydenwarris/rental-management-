import { ApiError } from "../../shared/errors.js";
import { GuardRegistry } from "../../shared/guards.js";
import { daysBetween, isDateAfter, isDateBefore, type IsoDate } from "../../shared/dates.js";
import { RENT_GRACE_PERIOD_DAYS } from "../../config/constants.js";
import type { Cents } from "../../shared/money.js";
import { PaymentStatus, type Payment } from "./payment.types.js";
import type { PaymentRepository } from "./payment.repository.js";
import type { PaymentCreateInput, PaymentUpdateInput } from "./payment.schemas.js";
import type { LeaseService } from "../leases/lease.service.js";
import type { RequestContext } from "../../shared/types.js";

/**
 * Payment status is derived, never supplied.
 *
 *   pre:  amountPaid > 0 (guaranteed by the schema), rentDue > 0
 *   post: returns exactly one PaymentStatus
 *   inv:  a short payment is always Partial, regardless of timing — the landlord
 *         needs to see the shortfall first; lateness is secondary information.
 */
export function derivePaymentStatus(
  amountPaid: Cents,
  rentDue: Cents,
  paymentDate: IsoDate,
  dueDate: IsoDate,
): PaymentStatus {
  if (amountPaid < rentDue) return PaymentStatus.Partial;
  const daysLate = daysBetween(dueDate, paymentDate);
  return daysLate > RENT_GRACE_PERIOD_DAYS ? PaymentStatus.Late : PaymentStatus.Paid;
}

export class PaymentService {
  readonly deletionGuards = new GuardRegistry();

  constructor(
    private readonly payments: PaymentRepository,
    private readonly leases: LeaseService,
  ) {
    this.leases.deletionGuards.register(async (leaseId, ctx) => {
      const recorded = await this.payments.findByLease(leaseId, ctx);
      if (recorded.length > 0) {
        throw ApiError.conflict(
          `Lease '${leaseId}' has ${recorded.length} recorded payment(s). Payment history is preserved; delete is blocked.`,
        );
      }
    });
  }

  async listPayments(ctx: RequestContext): Promise<readonly Payment[]> {
    return this.payments.findAll(ctx);
  }

  async listPaymentsForLease(leaseId: string, ctx: RequestContext): Promise<readonly Payment[]> {
    await this.leases.getLease(leaseId, ctx);
    return this.payments.findByLease(leaseId, ctx);
  }

  async listPaymentsForTenant(tenantId: string, ctx: RequestContext): Promise<readonly Payment[]> {
    return this.payments.findByTenant(tenantId, ctx);
  }

  async getPayment(id: string, ctx: RequestContext): Promise<Payment> {
    const payment = await this.payments.findById(id, ctx);
    if (!payment) throw ApiError.notFound("Payment", id);
    return payment;
  }

  /**
   * pre:  input is schema-valid; lease exists under this landlord; the payment
   *       date falls within the lease term.
   * post: a Payment exists whose tenant/unit/property match its lease and whose
   *       status was derived, not supplied.
   */
  async recordPayment(input: PaymentCreateInput, ctx: RequestContext): Promise<Payment> {
    const lease = await this.leases.getLease(input.leaseId, ctx);
    assertDateWithinTerm(input.paymentDate, lease.startDate, lease.endDate, "paymentDate");

    return this.payments.create(
      {
        leaseId: lease.id,
        tenantId: lease.tenantId,
        unitId: lease.unitId,
        propertyId: lease.propertyId,
        amount: input.amount,
        paymentDate: input.paymentDate,
        dueDate: input.dueDate,
        method: input.method,
        reference: input.reference,
        status: derivePaymentStatus(input.amount, lease.monthlyRent, input.paymentDate, input.dueDate),
        notes: input.notes,
      },
      ctx,
    );
  }

  async updatePayment(
    id: string,
    input: PaymentUpdateInput,
    ctx: RequestContext,
  ): Promise<Payment> {
    const existing = await this.getPayment(id, ctx);
    const lease = await this.leases.getLease(existing.leaseId, ctx);

    const amount = input.amount ?? existing.amount;
    const paymentDate = input.paymentDate ?? existing.paymentDate;
    const dueDate = input.dueDate ?? existing.dueDate;
    assertDateWithinTerm(paymentDate, lease.startDate, lease.endDate, "paymentDate");

    const updated = await this.payments.update(
      id,
      { ...input, status: derivePaymentStatus(amount, lease.monthlyRent, paymentDate, dueDate) },
      ctx,
    );
    if (!updated) throw ApiError.notFound("Payment", id);
    return updated;
  }

  async deletePayment(id: string, ctx: RequestContext): Promise<void> {
    await this.getPayment(id, ctx);
    await this.deletionGuards.assertAllPass(id, ctx);
    await this.payments.delete(id, ctx);
  }
}

/** A payment outside its lease term means the wrong lease was selected. */
function assertDateWithinTerm(
  date: IsoDate,
  startDate: IsoDate,
  endDate: IsoDate,
  field: string,
): void {
  if (isDateBefore(date, startDate) || isDateAfter(date, endDate)) {
    throw ApiError.invalidRelationship(
      `Payment date ${date} falls outside the lease term (${startDate} to ${endDate}).`,
      [{ field, message: "Payment date must fall within the lease term." }],
    );
  }
}
