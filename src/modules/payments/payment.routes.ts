import { Router } from "express";
import { asyncHandler, validateBody } from "../../shared/middleware.js";
import { paymentCreateSchema, paymentUpdateSchema } from "./payment.schemas.js";
import type { PaymentController } from "./payment.controller.js";

export function paymentRoutes(controller: PaymentController): Router {
  const router = Router();

  router.get("/", asyncHandler(controller.listPayments));
  router.post("/", validateBody(paymentCreateSchema), asyncHandler(controller.recordPayment));
  router.get("/:id", asyncHandler(controller.getPayment));
  router.patch("/:id", validateBody(paymentUpdateSchema), asyncHandler(controller.updatePayment));
  router.delete("/:id", asyncHandler(controller.deletePayment));

  return router;
}

export function leasePaymentRoutes(controller: PaymentController): Router {
  const router = Router({ mergeParams: true });
  router.get("/", asyncHandler(controller.listPaymentsForLease));
  return router;
}

export function tenantPaymentRoutes(controller: PaymentController): Router {
  const router = Router({ mergeParams: true });
  router.get("/", asyncHandler(controller.listPaymentsForTenant));
  return router;
}
