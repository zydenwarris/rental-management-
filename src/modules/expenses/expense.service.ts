import { ApiError } from "../../shared/errors.js";
import type { Expense } from "./expense.types.js";
import type { ExpenseRepository } from "./expense.repository.js";
import type { ExpenseCreateInput, ExpenseUpdateInput } from "./expense.schemas.js";
import type { PropertyService } from "../properties/property.service.js";
import type { UnitService } from "../units/unit.service.js";
import type { RequestContext } from "../../shared/types.js";

/**
 * Invariant: an expense always names a real property, and when it also names a
 * unit, that unit belongs to that same property. A utility bill filed against
 * another property's unit would silently distort both properties' net income.
 */
export class ExpenseService {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly properties: PropertyService,
    private readonly units: UnitService,
  ) {
    this.properties.deletionGuards.register(async (propertyId, ctx) => {
      const recorded = await this.expenses.findByProperty(propertyId, ctx);
      if (recorded.length > 0) {
        throw ApiError.conflict(
          `Property '${propertyId}' has ${recorded.length} expense record(s). Delete them first.`,
        );
      }
    });
  }

  async listExpenses(ctx: RequestContext): Promise<readonly Expense[]> {
    return this.expenses.findAll(ctx);
  }

  async listExpensesForProperty(
    propertyId: string,
    ctx: RequestContext,
  ): Promise<readonly Expense[]> {
    await this.properties.getProperty(propertyId, ctx);
    return this.expenses.findByProperty(propertyId, ctx);
  }

  async getExpense(id: string, ctx: RequestContext): Promise<Expense> {
    const expense = await this.expenses.findById(id, ctx);
    if (!expense) throw ApiError.notFound("Expense", id);
    return expense;
  }

  async createExpense(input: ExpenseCreateInput, ctx: RequestContext): Promise<Expense> {
    await this.assertUnitBelongsToProperty(input.propertyId, input.unitId, ctx);
    return this.expenses.create(input, ctx);
  }

  async updateExpense(
    id: string,
    input: ExpenseUpdateInput,
    ctx: RequestContext,
  ): Promise<Expense> {
    const existing = await this.getExpense(id, ctx);
    const propertyId = input.propertyId ?? existing.propertyId;
    const unitId = input.unitId !== undefined ? input.unitId : existing.unitId;
    await this.assertUnitBelongsToProperty(propertyId, unitId, ctx);

    const updated = await this.expenses.update(id, input, ctx);
    if (!updated) throw ApiError.notFound("Expense", id);
    return updated;
  }

  async deleteExpense(id: string, ctx: RequestContext): Promise<void> {
    await this.getExpense(id, ctx);
    await this.expenses.delete(id, ctx);
  }

  private async assertUnitBelongsToProperty(
    propertyId: string,
    unitId: string | null,
    ctx: RequestContext,
  ): Promise<void> {
    await this.properties.getProperty(propertyId, ctx);
    if (unitId === null) return;
    const unit = await this.units.getUnit(unitId, ctx);
    if (unit.propertyId !== propertyId) {
      throw ApiError.invalidRelationship(
        `Unit '${unitId}' belongs to property '${unit.propertyId}', not '${propertyId}'.`,
        [{ field: "unitId", message: "Unit must belong to the named property." }],
      );
    }
  }
}
