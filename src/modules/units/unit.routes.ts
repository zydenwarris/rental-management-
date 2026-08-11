import { Router } from "express";
import { asyncHandler, validateBody } from "../../shared/middleware.js";
import { unitCreateSchema, unitUpdateSchema } from "./unit.schemas.js";
import type { UnitController } from "./unit.controller.js";

export function unitRoutes(controller: UnitController): Router {
  const router = Router();

  router.get("/", asyncHandler(controller.listUnits));
  router.post("/", validateBody(unitCreateSchema), asyncHandler(controller.createUnit));
  router.get("/:id", asyncHandler(controller.getUnit));
  router.patch("/:id", validateBody(unitUpdateSchema), asyncHandler(controller.updateUnit));
  router.delete("/:id", asyncHandler(controller.deleteUnit));

  return router;
}

/** Mounted under /api/properties/:propertyId/units for property-scoped listing. */
export function propertyUnitRoutes(controller: UnitController): Router {
  const router = Router({ mergeParams: true });
  router.get("/", asyncHandler(controller.listUnitsForProperty));
  return router;
}
