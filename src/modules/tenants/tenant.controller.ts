import type { Request, Response } from "express";
import { list, ok } from "../../shared/http.js";
import { requireParam } from "../properties/property.controller.js";
import type { TenantService } from "./tenant.service.js";

export class TenantController {
  constructor(private readonly service: TenantService) {}

  listTenants = async (req: Request, res: Response): Promise<void> => {
    res.json(list(await this.service.listTenants(req.ctx)));
  };

  getTenant = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.getTenant(requireParam(req, "id"), req.ctx)));
  };

  createTenant = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await this.service.createTenant(req.body, req.ctx)));
  };

  updateTenant = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.updateTenant(requireParam(req, "id"), req.body, req.ctx)));
  };

  deleteTenant = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteTenant(requireParam(req, "id"), req.ctx);
    res.status(204).send();
  };
}
