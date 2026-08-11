import type { Request, Response } from "express";
import { ok } from "../../shared/http.js";
import type { DashboardService } from "./dashboard.service.js";

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  getSummary = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await this.service.getSummary(req.ctx)));
  };
}
