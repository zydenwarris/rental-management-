import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPropertyRepository } from "../properties/property.repository.js";
import { PropertyService } from "../properties/property.service.js";
import { InMemoryUnitRepository } from "../units/unit.repository.js";
import { UnitService } from "../units/unit.service.js";
import { InMemoryExpenseRepository } from "../expenses/expense.repository.js";
import { ExpenseService } from "../expenses/expense.service.js";
import { ExpenseCategory } from "../expenses/expense.types.js";
import { InMemoryMaintenanceRepository } from "./maintenance.repository.js";
import { MaintenanceService } from "./maintenance.service.js";
import { MaintenancePriority, MaintenanceStatus } from "./maintenance.types.js";
import { PropertyType } from "../properties/property.types.js";
import { ErrorCode, isApiError } from "../../shared/errors.js";
import type { RequestContext } from "../../shared/types.js";

const ctx: RequestContext = { landlordId: "lord_test" };
const TODAY = "2026-08-09";

async function expectApiError(promise: Promise<unknown>, code: ErrorCode): Promise<void> {
  try {
    await promise;
    expect.fail(`expected ApiError ${code}, but the call succeeded`);
  } catch (error) {
    if (!isApiError(error)) throw error;
    expect(error.code).toBe(code);
  }
}

describe("Expenses and maintenance", () => {
  let propertyService: PropertyService;
  let unitService: UnitService;
  let expenseService: ExpenseService;
  let maintenanceService: MaintenanceService;
  let propertyId: string;
  let unitId: string;
  let otherPropertyId: string;

  beforeEach(async () => {
    propertyService = new PropertyService(new InMemoryPropertyRepository());
    unitService = new UnitService(new InMemoryUnitRepository(), propertyService);
    expenseService = new ExpenseService(
      new InMemoryExpenseRepository(),
      propertyService,
      unitService,
    );
    maintenanceService = new MaintenanceService(
      new InMemoryMaintenanceRepository(),
      propertyService,
      unitService,
      () => TODAY,
    );

    const property = await propertyService.createProperty(
      { name: "P", type: PropertyType.MultiUnit, address: "1 St", city: "POS", description: "", notes: "" },
      ctx,
    );
    propertyId = property.id;
    const other = await propertyService.createProperty(
      { name: "Other", type: PropertyType.SingleFamily, address: "2 St", city: "Arima", description: "", notes: "" },
      ctx,
    );
    otherPropertyId = other.id;
    const unit = await unitService.createUnit(
      { propertyId, label: "1A", bedrooms: 1, bathrooms: 1, marketRent: 300000, description: "", notes: "" },
      ctx,
    );
    unitId = unit.id;
  });

  describe("ExpenseService", () => {
    const validExpense = () => ({
      propertyId,
      unitId: null,
      category: ExpenseCategory.Utilities,
      description: "WASA bill",
      amount: 45000,
      date: "2026-08-01",
      vendor: "WASA",
      notes: "",
    });

    it("records a property-level expense with no unit", async () => {
      const expense = await expenseService.createExpense(validExpense(), ctx);
      expect(expense.unitId).toBeNull();
    });

    it("records a unit-level expense when the unit belongs to the property", async () => {
      const expense = await expenseService.createExpense({ ...validExpense(), unitId }, ctx);
      expect(expense.unitId).toBe(unitId);
    });

    it("rejects an expense whose unit belongs to a different property", async () => {
      await expectApiError(
        expenseService.createExpense({ ...validExpense(), propertyId: otherPropertyId, unitId }, ctx),
        ErrorCode.INVALID_RELATIONSHIP,
      );
    });

    it("rejects an expense against a property that does not exist", async () => {
      await expectApiError(
        expenseService.createExpense({ ...validExpense(), propertyId: "prop_ghost" }, ctx),
        ErrorCode.NOT_FOUND,
      );
    });

    it("blocks deleting a property that still has expenses", async () => {
      await expenseService.createExpense(validExpense(), ctx);
      await expectApiError(propertyService.deleteProperty(propertyId, ctx), ErrorCode.CONFLICT);
    });
  });

  describe("MaintenanceService", () => {
    const validRequest = () => ({
      propertyId,
      unitId,
      title: "Leaking tap",
      description: "Kitchen tap drips constantly",
      priority: MaintenancePriority.Medium,
      contractor: "",
      estimatedCost: 50000,
      reportedDate: "2026-08-05",
      scheduledDate: null,
      notes: "",
    });

    it("opens a new request with no costs or completion recorded", async () => {
      const request = await maintenanceService.createRequest(validRequest(), ctx);
      expect(request.status).toBe(MaintenanceStatus.Open);
      expect(request.actualCost).toBeNull();
      expect(request.completedDate).toBeNull();
    });

    it("rejects a request whose unit belongs to a different property", async () => {
      await expectApiError(
        maintenanceService.createRequest({ ...validRequest(), propertyId: otherPropertyId }, ctx),
        ErrorCode.INVALID_RELATIONSHIP,
      );
    });

    it("allows a common-area request with no unit", async () => {
      const request = await maintenanceService.createRequest({ ...validRequest(), unitId: null }, ctx);
      expect(request.unitId).toBeNull();
    });

    it("advances Open to InProgress", async () => {
      const request = await maintenanceService.createRequest(validRequest(), ctx);
      const updated = await maintenanceService.updateRequest(
        request.id,
        { status: MaintenanceStatus.InProgress },
        ctx,
      );
      expect(updated.status).toBe(MaintenanceStatus.InProgress);
    });

    it("stamps the completion date when a request is completed without one", async () => {
      const request = await maintenanceService.createRequest(validRequest(), ctx);
      const completed = await maintenanceService.updateRequest(
        request.id,
        { status: MaintenanceStatus.Completed, actualCost: 62000 },
        ctx,
      );
      expect(completed.completedDate).toBe(TODAY);
      expect(completed.actualCost).toBe(62000);
    });

    it("rejects reopening a completed request", async () => {
      const request = await maintenanceService.createRequest(validRequest(), ctx);
      await maintenanceService.updateRequest(request.id, { status: MaintenanceStatus.Completed }, ctx);
      await expectApiError(
        maintenanceService.updateRequest(request.id, { status: MaintenanceStatus.Open }, ctx),
        ErrorCode.CONFLICT,
      );
    });

    it("rejects moving a cancelled request onward", async () => {
      const request = await maintenanceService.createRequest(validRequest(), ctx);
      await maintenanceService.updateRequest(request.id, { status: MaintenanceStatus.Cancelled }, ctx);
      await expectApiError(
        maintenanceService.updateRequest(request.id, { status: MaintenanceStatus.InProgress }, ctx),
        ErrorCode.CONFLICT,
      );
    });

    it("blocks deleting a property that still has maintenance records", async () => {
      await maintenanceService.createRequest(validRequest(), ctx);
      await expectApiError(propertyService.deleteProperty(propertyId, ctx), ErrorCode.CONFLICT);
    });
  });
});
