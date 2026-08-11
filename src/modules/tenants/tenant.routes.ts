import { Router } from "express";
import { asyncHandler, validateBody } from "../../shared/middleware.js";
import { tenantCreateSchema, tenantUpdateSchema } from "./tenant.schemas.js";
import type { TenantController } from "./tenant.controller.js";

export function tenantRoutes(controller: TenantController): Router {
  const router = Router();

  router.get("/", asyncHandler(controller.listTenants));
  router.post("/", validateBody(tenantCreateSchema), asyncHandler(controller.createTenant));
  router.get("/:id", asyncHandler(controller.getTenant));
  router.patch("/:id", validateBody(tenantUpdateSchema), asyncHandler(controller.updateTenant));
  router.delete("/:id", asyncHandler(controller.deleteTenant));

  return router;
}
