import type { Repository } from "../../shared/repository.js";
import { InMemoryRepository } from "../../shared/inMemoryRepository.js";
import { IdPrefix } from "../../shared/ids.js";
import type { LandlordScope } from "../../shared/types.js";
import type { Expense, ExpenseCreate, ExpenseUpdate } from "./expense.types.js";

export interface ExpenseRepository extends Repository<Expense, ExpenseCreate, ExpenseUpdate> {
  findByProperty(propertyId: string, scope: LandlordScope): Promise<readonly Expense[]>;
  findByUnit(unitId: string, scope: LandlordScope): Promise<readonly Expense[]>;
}

export class InMemoryExpenseRepository
  extends InMemoryRepository<Expense>
  implements ExpenseRepository
{
  constructor() {
    super(IdPrefix.Expense);
  }

  async findByProperty(propertyId: string, scope: LandlordScope): Promise<readonly Expense[]> {
    return this.findWhere((expense) => expense.propertyId === propertyId, scope);
  }

  async findByUnit(unitId: string, scope: LandlordScope): Promise<readonly Expense[]> {
    return this.findWhere((expense) => expense.unitId === unitId, scope);
  }
}
