import { InMemoryPropertyRepository, type PropertyRepository } from "./modules/properties/property.repository.js";
import { PropertyService } from "./modules/properties/property.service.js";
import { PropertyController } from "./modules/properties/property.controller.js";
import { InMemoryUnitRepository, type UnitRepository } from "./modules/units/unit.repository.js";
import { UnitService } from "./modules/units/unit.service.js";
import { UnitController } from "./modules/units/unit.controller.js";
import { InMemoryTenantRepository, type TenantRepository } from "./modules/tenants/tenant.repository.js";
import { TenantService } from "./modules/tenants/tenant.service.js";
import { TenantController } from "./modules/tenants/tenant.controller.js";
import { InMemoryLeaseRepository, type LeaseRepository } from "./modules/leases/lease.repository.js";
import { LeaseService } from "./modules/leases/lease.service.js";
import { LeaseController } from "./modules/leases/lease.controller.js";
import { InMemoryPaymentRepository, type PaymentRepository } from "./modules/payments/payment.repository.js";
import { PaymentService } from "./modules/payments/payment.service.js";
import { PaymentController } from "./modules/payments/payment.controller.js";
import { InMemoryExpenseRepository, type ExpenseRepository } from "./modules/expenses/expense.repository.js";
import { ExpenseService } from "./modules/expenses/expense.service.js";
import { ExpenseController } from "./modules/expenses/expense.controller.js";
import { InMemoryMaintenanceRepository, type MaintenanceRepository } from "./modules/maintenance/maintenance.repository.js";
import { MaintenanceService } from "./modules/maintenance/maintenance.service.js";
import { MaintenanceController } from "./modules/maintenance/maintenance.controller.js";
import { DashboardService } from "./modules/dashboard/dashboard.service.js";
import { DashboardController } from "./modules/dashboard/dashboard.controller.js";

/**
 * Composition root — the one place that knows which concrete implementations
 * are in play.
 *
 * Swapping the mock data layer for PostgreSQL means writing repository classes
 * against the same interfaces and changing the constructors in `buildRepositories`.
 * No service, controller, or route changes.
 */
export interface Repositories {
  readonly properties: PropertyRepository;
  readonly units: UnitRepository;
  readonly tenants: TenantRepository;
  readonly leases: LeaseRepository;
  readonly payments: PaymentRepository;
  readonly expenses: ExpenseRepository;
  readonly maintenance: MaintenanceRepository;
}

export interface Services {
  readonly properties: PropertyService;
  readonly units: UnitService;
  readonly tenants: TenantService;
  readonly leases: LeaseService;
  readonly payments: PaymentService;
  readonly expenses: ExpenseService;
  readonly maintenance: MaintenanceService;
  readonly dashboard: DashboardService;
}

export interface Controllers {
  readonly properties: PropertyController;
  readonly units: UnitController;
  readonly tenants: TenantController;
  readonly leases: LeaseController;
  readonly payments: PaymentController;
  readonly expenses: ExpenseController;
  readonly maintenance: MaintenanceController;
  readonly dashboard: DashboardController;
}

export interface Container {
  readonly repositories: Repositories;
  readonly services: Services;
  readonly controllers: Controllers;
}

export function buildRepositories(): Repositories {
  return {
    properties: new InMemoryPropertyRepository(),
    units: new InMemoryUnitRepository(),
    tenants: new InMemoryTenantRepository(),
    leases: new InMemoryLeaseRepository(),
    payments: new InMemoryPaymentRepository(),
    expenses: new InMemoryExpenseRepository(),
    maintenance: new InMemoryMaintenanceRepository(),
  };
}

export function buildContainer(repositories: Repositories = buildRepositories()): Container {
  // Construction order matters: services register cross-module deletion guards
  // on their dependencies as they are built.
  const properties = new PropertyService(repositories.properties);
  const units = new UnitService(repositories.units, properties);
  const tenants = new TenantService(repositories.tenants);
  const leases = new LeaseService(repositories.leases, units, tenants);
  const payments = new PaymentService(repositories.payments, leases);
  const expenses = new ExpenseService(repositories.expenses, properties, units);
  const maintenance = new MaintenanceService(repositories.maintenance, properties, units);
  const dashboard = new DashboardService(
    properties,
    units,
    leases,
    payments,
    expenses,
    maintenance,
  );

  const services: Services = {
    properties,
    units,
    tenants,
    leases,
    payments,
    expenses,
    maintenance,
    dashboard,
  };

  const controllers: Controllers = {
    properties: new PropertyController(properties),
    units: new UnitController(units),
    tenants: new TenantController(tenants),
    leases: new LeaseController(leases),
    payments: new PaymentController(payments),
    expenses: new ExpenseController(expenses),
    maintenance: new MaintenanceController(maintenance),
    dashboard: new DashboardController(dashboard),
  };

  return { repositories, services, controllers };
}
