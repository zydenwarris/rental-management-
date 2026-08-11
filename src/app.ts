import express, { type Express } from "express";
import { attachContext, errorHandler, notFoundHandler } from "./shared/middleware.js";
import { propertyRoutes } from "./modules/properties/property.routes.js";
import { propertyUnitRoutes, unitRoutes } from "./modules/units/unit.routes.js";
import { tenantRoutes } from "./modules/tenants/tenant.routes.js";
import { leaseRoutes, tenantLeaseRoutes, unitLeaseRoutes } from "./modules/leases/lease.routes.js";
import {
  leasePaymentRoutes,
  paymentRoutes,
  tenantPaymentRoutes,
} from "./modules/payments/payment.routes.js";
import { expenseRoutes, propertyExpenseRoutes } from "./modules/expenses/expense.routes.js";
import {
  maintenanceRoutes,
  propertyMaintenanceRoutes,
} from "./modules/maintenance/maintenance.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import type { Container } from "./container.js";

/**
 * Builds the Express app from a container. Kept separate from server.ts so
 * tests can build an app with fresh in-memory state without opening a port.
 */
export function buildApp(container: Container): Express {
  const app = express();
  const { controllers } = container;

  app.use(express.json());
  // Every route below this line has req.ctx. Real authentication replaces this
  // single middleware; nothing downstream changes.
  app.use(attachContext);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/dashboard", dashboardRoutes(controllers.dashboard));

  app.use("/api/properties", propertyRoutes(controllers.properties));
  app.use("/api/properties/:propertyId/units", propertyUnitRoutes(controllers.units));
  app.use("/api/properties/:propertyId/expenses", propertyExpenseRoutes(controllers.expenses));
  app.use("/api/properties/:propertyId/maintenance", propertyMaintenanceRoutes(controllers.maintenance));

  app.use("/api/units", unitRoutes(controllers.units));
  app.use("/api/units/:unitId/leases", unitLeaseRoutes(controllers.leases));

  app.use("/api/tenants", tenantRoutes(controllers.tenants));
  app.use("/api/tenants/:tenantId/leases", tenantLeaseRoutes(controllers.leases));
  app.use("/api/tenants/:tenantId/payments", tenantPaymentRoutes(controllers.payments));

  app.use("/api/leases", leaseRoutes(controllers.leases));
  app.use("/api/leases/:leaseId/payments", leasePaymentRoutes(controllers.payments));

  app.use("/api/payments", paymentRoutes(controllers.payments));
  app.use("/api/expenses", expenseRoutes(controllers.expenses));
  app.use("/api/maintenance", maintenanceRoutes(controllers.maintenance));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
