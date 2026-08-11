import { Router } from "express";
import { asyncHandler, validateBody } from "../../shared/middleware.js";
import { maintenanceCreateSchema, maintenanceUpdateSchema } from "./maintenance.schemas.js";
import type { MaintenanceController } from "./maintenance.controller.js";

export function maintenanceRoutes(controller: MaintenanceController): Router {
  const router = Router();

  router.get("/", asyncHandler(controller.listRequests));
  router.post("/", validateBody(maintenanceCreateSchema), asyncHandler(controller.createRequest));
  router.get("/:id", asyncHandler(controller.getRequest));
  router.patch("/:id", validateBody(maintenanceUpdateSchema), asyncHandler(controller.updateRequest));
  router.delete("/:id", asyncHandler(controller.deleteRequest));

  return router;
}

export function propertyMaintenanceRoutes(controller: MaintenanceController): Router {
  const router = Router({ mergeParams: true });
  router.get("/", asyncHandler(controller.listRequestsForProperty));
  return router;
}
