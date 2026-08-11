import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPropertyRepository } from "../properties/property.repository.js";
import { PropertyService } from "../properties/property.service.js";
import { InMemoryUnitRepository } from "./unit.repository.js";
import { UnitService } from "./unit.service.js";
import { UnitStatus } from "./unit.types.js";
import { PropertyType } from "../properties/property.types.js";
import { ErrorCode, isApiError } from "../../shared/errors.js";
import type { RequestContext } from "../../shared/types.js";

const ctx: RequestContext = { landlordId: "lord_test" };
const otherCtx: RequestContext = { landlordId: "lord_other" };

async function expectApiError(promise: Promise<unknown>, code: ErrorCode): Promise<void> {
  try {
    await promise;
    expect.fail(`expected ApiError ${code}, but the call succeeded`);
  } catch (error) {
    if (!isApiError(error)) throw error;
    expect(error.code).toBe(code);
  }
}

describe("UnitService", () => {
  let propertyService: PropertyService;
  let unitService: UnitService;
  let propertyId: string;

  beforeEach(async () => {
    const properties = new InMemoryPropertyRepository();
    propertyService = new PropertyService(properties);
    unitService = new UnitService(new InMemoryUnitRepository(), propertyService);
    const property = await propertyService.createProperty(
      {
        name: "Test Property",
        type: PropertyType.Apartment,
        address: "1 Test St",
        city: "Port of Spain",
        description: "",
        notes: "",
      },
      ctx,
    );
    propertyId = property.id;
  });

  const validUnit = () => ({
    propertyId,
    label: "Apt 1A",
    bedrooms: 2,
    bathrooms: 1,
    marketRent: 350000,
    description: "",
    notes: "",
  });

  it("creates a unit on an existing property, vacant by default", async () => {
    const unit = await unitService.createUnit(validUnit(), ctx);
    expect(unit.propertyId).toBe(propertyId);
    expect(unit.status).toBe(UnitStatus.Vacant);
  });

  it("rejects a unit pointing at a property that does not exist", async () => {
    await expectApiError(
      unitService.createUnit({ ...validUnit(), propertyId: "prop_ghost" }, ctx),
      ErrorCode.NOT_FOUND,
    );
  });

  it("rejects a unit pointing at another landlord's property", async () => {
    await expectApiError(unitService.createUnit(validUnit(), otherCtx), ErrorCode.NOT_FOUND);
  });

  it("rejects a duplicate label within the same property", async () => {
    await unitService.createUnit(validUnit(), ctx);
    await expectApiError(unitService.createUnit(validUnit(), ctx), ErrorCode.DUPLICATE_UNIT);
  });

  it("treats labels as duplicates case-insensitively", async () => {
    await unitService.createUnit(validUnit(), ctx);
    await expectApiError(
      unitService.createUnit({ ...validUnit(), label: "apt 1a" }, ctx),
      ErrorCode.DUPLICATE_UNIT,
    );
  });

  it("allows the same label on a different property", async () => {
    const second = await propertyService.createProperty(
      {
        name: "Second Property",
        type: PropertyType.MultiUnit,
        address: "2 Test St",
        city: "San Fernando",
        description: "",
        notes: "",
      },
      ctx,
    );
    await unitService.createUnit(validUnit(), ctx);
    const unit = await unitService.createUnit({ ...validUnit(), propertyId: second.id }, ctx);
    expect(unit.propertyId).toBe(second.id);
  });

  it("rejects renaming a unit to a label already used in the property", async () => {
    await unitService.createUnit(validUnit(), ctx);
    const other = await unitService.createUnit({ ...validUnit(), label: "Apt 1B" }, ctx);
    await expectApiError(
      unitService.updateUnit(other.id, { label: "Apt 1A" }, ctx),
      ErrorCode.DUPLICATE_UNIT,
    );
  });

  it("allows updating a unit without changing its label", async () => {
    const unit = await unitService.createUnit(validUnit(), ctx);
    const updated = await unitService.updateUnit(unit.id, { bedrooms: 3 }, ctx);
    expect(updated.bedrooms).toBe(3);
    expect(updated.label).toBe("Apt 1A");
  });

  it("lists only units belonging to the requested property", async () => {
    const second = await propertyService.createProperty(
      {
        name: "Second",
        type: PropertyType.Townhouse,
        address: "3 Test St",
        city: "Arima",
        description: "",
        notes: "",
      },
      ctx,
    );
    await unitService.createUnit(validUnit(), ctx);
    await unitService.createUnit({ ...validUnit(), propertyId: second.id }, ctx);
    const units = await unitService.listUnitsForProperty(propertyId, ctx);
    expect(units).toHaveLength(1);
    expect(units[0]?.propertyId).toBe(propertyId);
  });

  it("blocks deleting a property that still has units", async () => {
    await unitService.createUnit(validUnit(), ctx);
    await expectApiError(propertyService.deleteProperty(propertyId, ctx), ErrorCode.CONFLICT);
  });

  it("allows deleting a property once its units are gone", async () => {
    const unit = await unitService.createUnit(validUnit(), ctx);
    await unitService.deleteUnit(unit.id, ctx);
    await expect(propertyService.deleteProperty(propertyId, ctx)).resolves.toBeUndefined();
  });
});
