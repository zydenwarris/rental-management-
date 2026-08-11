import type { Request, Response } from "express";
import { list, ok } from "../../shared/http.js";
import { requireParam } from "../properties/property.controller.js";
import type { MaintenanceService } from "./maintenance.service.js";

export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  listRequests = async (req: Request, res: Response): Promise<void> => {
    res.json(list(await this.service.listRequests(req.ctx)));
  };

  listRequestsForProperty = async (req: Request, res: Response): Promise<void> => {
    const requests = await this.service.listRequestsForProperty(
      requireParam(req, "propertyId"),
      req.ctx,
    );
    res.json(list(requests));
  };

  getRequest = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.getRequest(requireParam(req, "id"), req.ctx)));
  };

  createRequest = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await this.service.createRequest(req.body, req.ctx)));
  };

  updateRequest = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.updateRequest(requireParam(req, "id"), req.body, req.ctx)));
  };

  deleteRequest = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteRequest(requireParam(req, "id"), req.ctx);
    res.status(204).send();
  };
}
