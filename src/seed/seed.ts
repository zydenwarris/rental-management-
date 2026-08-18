import { today } from "../shared/dates.js";
import { PropertyType } from "../modules/properties/property.types.js";
import { UnitStatus } from "../modules/units/unit.types.js";
import { PaymentMethod } from "../modules/payments/payment.types.js";
import { ExpenseCategory } from "../modules/expenses/expense.types.js";
import { MaintenancePriority, MaintenanceStatus } from "../modules/maintenance/maintenance.types.js";
import type { Container } from "../container.js";
import type { RequestContext } from "../shared/types.js";

/**
 * Realistic development data so a frontend can be built against believable
 * responses before any database exists.
 *
 * Seeding goes through the services, not the repositories, so the data obeys
 * every business rule — no overlapping leases, no orphan units, correctly
 * derived lease and payment statuses. If a rule changes and the seed violates
 * it, seeding fails loudly instead of quietly producing impossible data.
 *
 * Dates are computed relative to today so the portfolio never goes stale:
 * there is always a lease expiring soon and a current month with payments.
 *
 * The landlord is passed in rather than assumed. Every row is scoped to whoever owns
 * it, and since authentication landed that owner is a real user id — seeding to an
 * invented one would produce a portfolio nobody can see.
 */
export async function seedDevelopmentData(
  container: Container,
  landlordId: string,
): Promise<void> {
  const ctx: RequestContext = { landlordId };
  const { properties, units, tenants, leases, payments, expenses, maintenance } =
    container.services;

  const now = today();
  const year = Number(now.slice(0, 4));
  const thisMonth = now.slice(0, 7);

  // ---- Properties -------------------------------------------------------
  const palmView = await properties.createProperty(
    {
      name: "Palm View Apartments",
      type: PropertyType.MultiUnit,
      address: "12 Maraval Road",
      city: "Port of Spain",
      description: "Six-unit walk-up close to the Savannah.",
      notes: "Roof resealed 2024.",
    },
    ctx,
  );

  const cocoyea = await properties.createProperty(
    {
      name: "Cocoyea Family Home",
      type: PropertyType.SingleFamily,
      address: "8 Cipero Street",
      city: "San Fernando",
      description: "Three-bedroom detached house with a yard.",
      notes: "",
    },
    ctx,
  );

  const arimaDuplex = await properties.createProperty(
    {
      name: "Arima Duplex",
      type: PropertyType.Townhouse,
      address: "45 Woodford Street",
      city: "Arima",
      description: "Two-storey duplex, separate entrances.",
      notes: "Shared water tank between units.",
    },
    ctx,
  );

  // ---- Units ------------------------------------------------------------
  const unit1A = await units.createUnit(
    { propertyId: palmView.id, label: "1A", bedrooms: 2, bathrooms: 1, marketRent: 350000, description: "Ground floor, front", notes: "" },
    ctx,
  );
  const unit1B = await units.createUnit(
    { propertyId: palmView.id, label: "1B", bedrooms: 1, bathrooms: 1, marketRent: 280000, description: "Ground floor, rear", notes: "" },
    ctx,
  );
  const unit2A = await units.createUnit(
    { propertyId: palmView.id, label: "2A", bedrooms: 2, bathrooms: 2, marketRent: 400000, description: "Upper floor, balcony", notes: "" },
    ctx,
  );
  const unit2B = await units.createUnit(
    { propertyId: palmView.id, label: "2B", bedrooms: 1, bathrooms: 1, marketRent: 275000, description: "Upper floor, rear", notes: "Awaiting repaint." },
    ctx,
  );
  const cocoyeaHouse = await units.createUnit(
    { propertyId: cocoyea.id, label: "Main House", bedrooms: 3, bathrooms: 2, marketRent: 550000, description: "Whole house", notes: "" },
    ctx,
  );
  const duplexLeft = await units.createUnit(
    { propertyId: arimaDuplex.id, label: "Left", bedrooms: 2, bathrooms: 1, marketRent: 320000, description: "Left half", notes: "" },
    ctx,
  );
  const duplexRight = await units.createUnit(
    { propertyId: arimaDuplex.id, label: "Right", bedrooms: 2, bathrooms: 1, marketRent: 320000, description: "Right half", notes: "" },
    ctx,
  );

  // ---- Tenants ----------------------------------------------------------
  const asha = await tenants.createTenant(
    { fullName: "Asha Ramkissoon", phone: "868-555-0142", email: "asha.r@example.tt", emergencyContactName: "Vishal Ramkissoon", emergencyContactPhone: "868-555-0143", notes: "Prefers WhatsApp." },
    ctx,
  );
  const devon = await tenants.createTenant(
    { fullName: "Devon Charles", phone: "868-555-0188", email: "devon.charles@example.tt", emergencyContactName: "Marcia Charles", emergencyContactPhone: "868-555-0189", notes: "" },
    ctx,
  );
  const priya = await tenants.createTenant(
    { fullName: "Priya Maharaj", phone: "868-555-0201", email: "priya.m@example.tt", emergencyContactName: "Rohan Maharaj", emergencyContactPhone: "868-555-0202", notes: "Pays by bank transfer." },
    ctx,
  );
  const kwame = await tenants.createTenant(
    { fullName: "Kwame Joseph", phone: "868-555-0233", email: "kwame.j@example.tt", emergencyContactName: "Ayana Joseph", emergencyContactPhone: "868-555-0234", notes: "" },
    ctx,
  );
  const previousTenant = await tenants.createTenant(
    { fullName: "Renee Baptiste", phone: "868-555-0277", email: "renee.b@example.tt", emergencyContactName: "", emergencyContactPhone: "", notes: "Moved out; kept for payment history." },
    ctx,
  );

  // ---- Leases -----------------------------------------------------------
  // Active, running well into next year.
  const leaseAsha = await leases.createLease(
    {
      tenantId: asha.id, unitId: unit1A.id,
      startDate: `${year}-01-01`, endDate: `${year + 1}-06-30`,
      monthlyRent: 350000, securityDeposit: 350000, rentDueDay: 1,
      utilitiesIncluded: false, notes: "Renewed once.",
    },
    ctx,
  );

  // Active but ending in ~40 days: shows up under "expiring soon".
  const expiringEnd = addDays(now, 40);
  const leaseDevon = await leases.createLease(
    {
      tenantId: devon.id, unitId: unit2A.id,
      startDate: `${year - 1}-07-01`, endDate: expiringEnd,
      monthlyRent: 400000, securityDeposit: 400000, rentDueDay: 5,
      utilitiesIncluded: true, notes: "Water and WASA included.",
    },
    ctx,
  );

  const leasePriya = await leases.createLease(
    {
      tenantId: priya.id, unitId: cocoyeaHouse.id,
      startDate: `${year}-03-01`, endDate: `${year + 1}-02-28`,
      monthlyRent: 550000, securityDeposit: 1100000, rentDueDay: 1,
      utilitiesIncluded: false, notes: "Two months' deposit held.",
    },
    ctx,
  );

  const leaseKwame = await leases.createLease(
    {
      tenantId: kwame.id, unitId: duplexLeft.id,
      startDate: `${year}-02-15`, endDate: `${year + 1}-02-14`,
      monthlyRent: 320000, securityDeposit: 320000, rentDueDay: 15,
      utilitiesIncluded: false, notes: "",
    },
    ctx,
  );

  // Expired historical lease on a now-vacant unit — proves history survives.
  await leases.createLease(
    {
      tenantId: previousTenant.id, unitId: unit1B.id,
      startDate: `${year - 2}-01-01`, endDate: `${year - 1}-12-31`,
      monthlyRent: 260000, securityDeposit: 260000, rentDueDay: 1,
      utilitiesIncluded: false, notes: "Moved out at end of term.",
    },
    ctx,
  );

  // ---- Payments ---------------------------------------------------------
  const previousMonth = shiftMonth(thisMonth, -1);

  /**
   * Six months of history, because the dashboard's rent book shows six columns
   * and a book with two entries tells the landlord nothing. Each month is only
   * recorded if it falls inside the lease term, so the seed can never invent a
   * payment the API would reject.
   */
  async function recordMonthlyRent(
    lease: { id: string; startDate: string; endDate: string; monthlyRent: number },
    options: {
      months: number;
      dueDay: string;
      method: PaymentMethod;
      reference?: (month: string) => string;
      skipMonths?: readonly number[];
      lateMonths?: readonly number[];
      partialMonths?: readonly number[];
    },
  ): Promise<void> {
    for (let monthsAgo = options.months; monthsAgo >= 1; monthsAgo -= 1) {
      if (options.skipMonths?.includes(monthsAgo)) continue;

      const month = shiftMonth(thisMonth, -monthsAgo);
      const dueDate = `${month}-${options.dueDay}`;
      if (dueDate < lease.startDate || dueDate > lease.endDate) continue;

      // Late payments land well past the 5-day grace period; partial ones pay
      // roughly a third, which the API derives as "partial".
      const isLate = options.lateMonths?.includes(monthsAgo) ?? false;
      const isPartial = options.partialMonths?.includes(monthsAgo) ?? false;
      const paymentDate = isLate ? `${month}-24` : dueDate;
      const amount = isPartial ? Math.round(lease.monthlyRent / 3) : lease.monthlyRent;

      await payments.recordPayment(
        {
          leaseId: lease.id,
          amount,
          paymentDate,
          dueDate,
          method: options.method,
          reference: options.reference?.(month) ?? "",
          notes: isPartial ? "Balance still owing." : "",
        },
        ctx,
      );
    }
  }

  // Asha pays in full and on time, every month — the reliable tenant.
  await recordMonthlyRent(leaseAsha, {
    months: 6,
    dueDay: "01",
    method: PaymentMethod.BankTransfer,
    reference: (month) => `RBC-${month.replace("-", "")}`,
  });

  // Devon is the problem tenancy: a late month, a missed one, and a short one.
  await recordMonthlyRent(leaseDevon, {
    months: 6,
    dueDay: "05",
    method: PaymentMethod.Cash,
    lateMonths: [4],
    skipMonths: [2],
    partialMonths: [5],
  });

  // Priya is reliable but started in March, so earlier columns stay empty.
  await recordMonthlyRent(leasePriya, {
    months: 6,
    dueDay: "01",
    method: PaymentMethod.BankTransfer,
    reference: (month) => `FCB-${month.replace("-", "")}`,
  });

  await recordMonthlyRent(leaseKwame, {
    months: 6,
    dueDay: "15",
    method: PaymentMethod.Cheque,
    reference: (month) => `CHQ-${month.slice(5)}`,
    lateMonths: [3],
  });

  // ---- Current month ----------------------------------------------------
  // Two paid in full, one part paid, and Kwame not yet recorded, so the
  // dashboard shows real outstanding rent rather than a tidy zero.
  await payments.recordPayment(
    { leaseId: leaseAsha.id, amount: 350000, paymentDate: `${thisMonth}-01`, dueDate: `${thisMonth}-01`, method: PaymentMethod.BankTransfer, reference: "RBC-884219", notes: "" },
    ctx,
  );
  await payments.recordPayment(
    { leaseId: leasePriya.id, amount: 550000, paymentDate: `${thisMonth}-02`, dueDate: `${thisMonth}-01`, method: PaymentMethod.BankTransfer, reference: "FCB-119043", notes: "" },
    ctx,
  );
  await payments.recordPayment(
    { leaseId: leaseDevon.id, amount: 200000, paymentDate: `${thisMonth}-07`, dueDate: `${thisMonth}-05`, method: PaymentMethod.Cash, reference: "", notes: "Balance promised next week." },
    ctx,
  );

  // ---- Expenses ---------------------------------------------------------
  await expenses.createExpense(
    { propertyId: palmView.id, unitId: null, category: ExpenseCategory.Utilities, description: "Common area electricity", amount: 62000, date: `${thisMonth}-03`, vendor: "T&TEC", notes: "" },
    ctx,
  );
  await expenses.createExpense(
    { propertyId: palmView.id, unitId: unit2B.id, category: ExpenseCategory.Repairs, description: "Bathroom tile replacement", amount: 185000, date: `${thisMonth}-06`, vendor: "Ramdial Tiling", notes: "" },
    ctx,
  );
  await expenses.createExpense(
    { propertyId: cocoyea.id, unitId: null, category: ExpenseCategory.Insurance, description: "Annual building insurance", amount: 240000, date: `${thisMonth}-01`, vendor: "Guardian General", notes: "Paid yearly." },
    ctx,
  );
  await expenses.createExpense(
    { propertyId: arimaDuplex.id, unitId: null, category: ExpenseCategory.PropertyTax, description: "Land and building tax", amount: 90000, date: `${previousMonth}-20`, vendor: "Board of Inland Revenue", notes: "" },
    ctx,
  );
  await expenses.createExpense(
    { propertyId: palmView.id, unitId: null, category: ExpenseCategory.Management, description: "Groundskeeping", amount: 45000, date: `${previousMonth}-28`, vendor: "Green Yard Services", notes: "" },
    ctx,
  );

  // ---- Maintenance ------------------------------------------------------
  await maintenance.createRequest(
    { propertyId: palmView.id, unitId: unit2A.id, title: "Kitchen tap leaking", description: "Constant drip; tenant reports rising water bill.", priority: MaintenancePriority.Medium, contractor: "Dave's Plumbing", estimatedCost: 45000, reportedDate: `${thisMonth}-04`, scheduledDate: `${thisMonth}-12`, notes: "" },
    ctx,
  );
  await maintenance.createRequest(
    { propertyId: arimaDuplex.id, unitId: duplexRight.id, title: "No hot water", description: "Water heater element suspected dead.", priority: MaintenancePriority.Urgent, contractor: "", estimatedCost: 120000, reportedDate: `${thisMonth}-07`, scheduledDate: null, notes: "Unit currently vacant." },
    ctx,
  );
  await maintenance.createRequest(
    { propertyId: cocoyea.id, unitId: null, title: "Front gate hinge", description: "Gate drags on the ground.", priority: MaintenancePriority.Low, contractor: "Ali Welding", estimatedCost: 35000, reportedDate: `${previousMonth}-18`, scheduledDate: null, notes: "" },
    ctx,
  );

  const repaired = await maintenance.createRequest(
    { propertyId: palmView.id, unitId: unit1A.id, title: "Bedroom window pane cracked", description: "Cracked during heavy rain.", priority: MaintenancePriority.High, contractor: "ClearView Glass", estimatedCost: 70000, reportedDate: `${previousMonth}-05`, scheduledDate: `${previousMonth}-09`, notes: "" },
    ctx,
  );
  await maintenance.updateRequest(
    repaired.id,
    { status: MaintenanceStatus.Completed, actualCost: 82000, completedDate: `${previousMonth}-11` },
    ctx,
  );

  // Unit 2B is between tenants and mid-refurbishment.
  await units.setStatus(unit2B.id, UnitStatus.UnderMaintenance, ctx);
}

/** Adds days to a YYYY-MM-DD date, staying in UTC so the day never shifts. */
function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Shifts a YYYY-MM month by a number of months. */
function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}
