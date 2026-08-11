import { Router } from "express";
import { asyncHandler, validateBody } from "../../shared/middleware.js";
import { expenseCreateSchema, expenseUpdateSchema } from "./expense.schemas.js";
import type { ExpenseController } from "./expense.controller.js";

export function expenseRoutes(controller: ExpenseController): Router {
  const router = Router();

  router.get("/", asyncHandler(controller.listExpenses));
  router.post("/", validateBody(expenseCreateSchema), asyncHandler(controller.createExpense));
  router.get("/:id", asyncHandler(controller.getExpense));
  router.patch("/:id", validateBody(expenseUpdateSchema), asyncHandler(controller.updateExpense));
  router.delete("/:id", asyncHandler(controller.deleteExpense));

  return router;
}

export function propertyExpenseRoutes(controller: ExpenseController): Router {
  const router = Router({ mergeParams: true });
  router.get("/", asyncHandler(controller.listExpensesForProperty));
  return router;
}
