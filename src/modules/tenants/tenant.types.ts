import type { BaseEntity } from "../../shared/types.js";

/**
 * Deliberately minimal personal data: contact details and an emergency contact
 * only. Medical history, allergies, and similar are out of scope by design —
 * a rental system has no business storing them.
 */
export interface Tenant extends BaseEntity {
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly emergencyContactName: string;
  readonly emergencyContactPhone: string;
  readonly notes: string;
}

export type TenantCreate = Omit<Tenant, keyof BaseEntity>;
export type TenantUpdate = Partial<TenantCreate>;
