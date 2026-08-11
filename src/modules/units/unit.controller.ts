import type { Request, Response } from "express";
import { list, ok } from "../../shared/http.js";
import { requireParam } from "../properties/property.controller.js";
import type { UnitService } from "./unit.service.js";

export class UnitController {
  constructor(private readonly service: UnitService) {}

  listUnits = async (req: Request, res: Response): Promise<void> => {
    res.json(list(await this.service.listUnits(req.ctx)));
  };

  listUnitsForProperty = async (req: Request, res: Response): Promise<void> => {
    const units = await this.service.listUnitsForProperty(requireParam(req, "propertyId"), req.ctx);
    res.json(list(units));
  };

  getUnit = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.getUnit(requireParam(req, "id"), req.ctx)));
  };

  createUnit = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await this.service.createUnit(req.body, req.ctx)));
  };

  updateUnit = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.updateUnit(requireParam(req, "id"), req.body, req.ctx)));
  };

  deleteUnit = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteUnit(requireParam(req, "id"), req.ctx);
    res.status(204).send();
  };
}
