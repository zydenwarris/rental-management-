import { Router } from "express";
import { asyncHandler, validateBody } from "../../shared/middleware.js";
import { leaseCreateSchema, leaseUpdateSchema } from "./lease.schemas.js";
import type { LeaseController } from "./lease.controller.js";

export function leaseRoutes(controller: LeaseController): Router {
  const router = Router();

  router.get("/", asyncHandler(controller.listLeases));
  router.post("/", validateBody(leaseCreateSchema), asyncHandler(controller.createLease));
  router.get("/:id", asyncHandler(controller.getLease));
  router.patch("/:id", validateBody(leaseUpdateSchema), asyncHandler(controller.updateLease));
  // Termination is a state transition with its own rules, not a status field write.
  router.post("/:id/terminate", asyncHandler(controller.terminateLease));
  router.delete("/:id", asyncHandler(controller.deleteLease));

  return router;
}

export function unitLeaseRoutes(controller: LeaseController): Router {
  const router = Router({ mergeParams: true });
  router.get("/", asyncHandler(controller.listLeasesForUnit));
  return router;
}

export function tenantLeaseRoutes(controller: LeaseController): Router {
  const router = Router({ mergeParams: true });
  router.get("/", asyncHandler(controller.listLeasesForTenant));
  return router;
}
