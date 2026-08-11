import type { Request, Response } from "express";
import { list, ok } from "../../shared/http.js";
import { requireParam } from "../properties/property.controller.js";
import type { LeaseService } from "./lease.service.js";

export class LeaseController {
  constructor(private readonly service: LeaseService) {}

  listLeases = async (req: Request, res: Response): Promise<void> => {
    res.json(list(await this.service.listLeases(req.ctx)));
  };

  listLeasesForUnit = async (req: Request, res: Response): Promise<void> => {
    res.json(list(await this.service.listLeasesForUnit(requireParam(req, "unitId"), req.ctx)));
  };

  listLeasesForTenant = async (req: Request, res: Response): Promise<void> => {
    res.json(list(await this.service.listLeasesForTenant(requireParam(req, "tenantId"), req.ctx)));
  };

  getLease = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.getLease(requireParam(req, "id"), req.ctx)));
  };

  createLease = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await this.service.createLease(req.body, req.ctx)));
  };

  updateLease = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.updateLease(requireParam(req, "id"), req.body, req.ctx)));
  };

  terminateLease = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.terminateLease(requireParam(req, "id"), req.ctx)));
  };

  deleteLease = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteLease(requireParam(req, "id"), req.ctx);
    res.status(204).send();
  };
}
