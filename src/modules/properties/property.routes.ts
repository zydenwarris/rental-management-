import { Router } from "express";
import { asyncHandler, validateBody } from "../../shared/middleware.js";
import { propertyCreateSchema, propertyUpdateSchema } from "./property.schemas.js";
import type { PropertyController } from "./property.controller.js";

export function propertyRoutes(controller: PropertyController): Router {
  const router = Router();

  router.get("/", asyncHandler(controller.listProperties));
  router.post("/", validateBody(propertyCreateSchema), asyncHandler(controller.createProperty));
  router.get("/:id", asyncHandler(controller.getProperty));
  router.patch("/:id", validateBody(propertyUpdateSchema), asyncHandler(controller.updateProperty));
  router.delete("/:id", asyncHandler(controller.deleteProperty));

  return router;
}
