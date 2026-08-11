import type { Repository } from "../../shared/repository.js";
import { InMemoryRepository } from "../../shared/inMemoryRepository.js";
import { IdPrefix } from "../../shared/ids.js";
import type { LandlordScope } from "../../shared/types.js";
import type { Payment, PaymentCreate, PaymentUpdate } from "./payment.types.js";

export interface PaymentRepository extends Repository<Payment, PaymentCreate, PaymentUpdate> {
  findByLease(leaseId: string, scope: LandlordScope): Promise<readonly Payment[]>;
  findByTenant(tenantId: string, scope: LandlordScope): Promise<readonly Payment[]>;
  findByProperty(propertyId: string, scope: LandlordScope): Promise<readonly Payment[]>;
}

export class InMemoryPaymentRepository
  extends InMemoryRepository<Payment>
  implements PaymentRepository
{
  constructor() {
    super(IdPrefix.Payment);
  }

  async findByLease(leaseId: string, scope: LandlordScope): Promise<readonly Payment[]> {
    return this.findWhere((payment) => payment.leaseId === leaseId, scope);
  }

  async findByTenant(tenantId: string, scope: LandlordScope): Promise<readonly Payment[]> {
    return this.findWhere((payment) => payment.tenantId === tenantId, scope);
  }

  async findByProperty(propertyId: string, scope: LandlordScope): Promise<readonly Payment[]> {
    return this.findWhere((payment) => payment.propertyId === propertyId, scope);
  }
}
