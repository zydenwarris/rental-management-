import type { Request, Response } from "express";
import { list, ok } from "../../shared/http.js";
import type { PropertyService } from "./property.service.js";

/**
 * Controllers are pure translation: HTTP in, service call, HTTP out.
 * No business rules, no repository access — that separation is what lets the
 * data layer be swapped without touching this file.
 */
export class PropertyController {
  constructor(private readonly service: PropertyService) {}

  listProperties = async (req: Request, res: Response): Promise<void> => {
    const properties = await this.service.listProperties(req.ctx);
    res.json(list(properties));
  };

  getProperty = async (req: Request, res: Response): Promise<void> => {
    const property = await this.service.getProperty(requireParam(req, "id"), req.ctx);
    res.json(ok(property));
  };

  createProperty = async (req: Request, res: Response): Promise<void> => {
    const property = await this.service.createProperty(req.body, req.ctx);
    res.status(201).json(ok(property));
  };

  updateProperty = async (req: Request, res: Response): Promise<void> => {
    const property = await this.service.updateProperty(requireParam(req, "id"), req.body, req.ctx);
    res.json(ok(property));
  };

  deleteProperty = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteProperty(requireParam(req, "id"), req.ctx);
    res.status(204).send();
  };
}

/** A route param missing despite the route pattern matching is a bug, not a 404. */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw new Error(`BUG: route param '${name}' missing on ${req.path}`);
  return value;
}
