import type { Request, Response } from "express";
import { list, ok } from "../../shared/http.js";
import { requireParam } from "../properties/property.controller.js";
import type { ExpenseService } from "./expense.service.js";

export class ExpenseController {
  constructor(private readonly service: ExpenseService) {}

  listExpenses = async (req: Request, res: Response): Promise<void> => {
    res.json(list(await this.service.listExpenses(req.ctx)));
  };

  listExpensesForProperty = async (req: Request, res: Response): Promise<void> => {
    const expenses = await this.service.listExpensesForProperty(
      requireParam(req, "propertyId"),
      req.ctx,
    );
    res.json(list(expenses));
  };

  getExpense = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.getExpense(requireParam(req, "id"), req.ctx)));
  };

  createExpense = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await this.service.createExpense(req.body, req.ctx)));
  };

  updateExpense = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.updateExpense(requireParam(req, "id"), req.body, req.ctx)));
  };

  deleteExpense = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteExpense(requireParam(req, "id"), req.ctx);
    res.status(204).send();
  };
}
