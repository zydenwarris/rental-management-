import type { Request, Response } from "express";
import { list, ok } from "../../shared/http.js";
import { requireParam } from "../properties/property.controller.js";
import type { PaymentService } from "./payment.service.js";

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  listPayments = async (req: Request, res: Response): Promise<void> => {
    res.json(list(await this.service.listPayments(req.ctx)));
  };

  listPaymentsForLease = async (req: Request, res: Response): Promise<void> => {
    res.json(list(await this.service.listPaymentsForLease(requireParam(req, "leaseId"), req.ctx)));
  };

  listPaymentsForTenant = async (req: Request, res: Response): Promise<void> => {
    res.json(list(await this.service.listPaymentsForTenant(requireParam(req, "tenantId"), req.ctx)));
  };

  getPayment = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.getPayment(requireParam(req, "id"), req.ctx)));
  };

  recordPayment = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await this.service.recordPayment(req.body, req.ctx)));
  };

  updatePayment = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.updatePayment(requireParam(req, "id"), req.body, req.ctx)));
  };

  deletePayment = async (req: Request, res: Response): Promise<void> => {
    await this.service.deletePayment(requireParam(req, "id"), req.ctx);
    res.status(204).send();
  };
}
