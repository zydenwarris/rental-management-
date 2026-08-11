import { Router } from "express";
import { asyncHandler } from "../../shared/middleware.js";
import type { DashboardController } from "./dashboard.controller.js";

export function dashboardRoutes(controller: DashboardController): Router {
  const router = Router();
  router.get("/", asyncHandler(controller.getSummary));
  return router;
}
