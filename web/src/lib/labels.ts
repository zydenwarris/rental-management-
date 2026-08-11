import {
  ExpenseCategory,
  LeaseStatus,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentMethod,
  PaymentStatus,
  PropertyType,
  UnitStatus,
} from "@contract";

/**
 * Wire values are snake_case; people read words. Every enum gets its label here
 * so a status is never spelled two different ways in two different screens.
 */

export const propertyTypeLabels: Record<PropertyType, string> = {
  [PropertyType.SingleFamily]: "Single-family house",
  [PropertyType.Apartment]: "Apartment",
  [PropertyType.MultiUnit]: "Multi-unit",
  [PropertyType.Townhouse]: "Townhouse",
  [PropertyType.Commercial]: "Commercial",
  [PropertyType.Other]: "Other",
};

export const unitStatusLabels: Record<UnitStatus, string> = {
  [UnitStatus.Occupied]: "Occupied",
  [UnitStatus.Vacant]: "Vacant",
  [UnitStatus.UnderMaintenance]: "Under maintenance",
};

export const leaseStatusLabels: Record<LeaseStatus, string> = {
  [LeaseStatus.Upcoming]: "Upcoming",
  [LeaseStatus.Active]: "Active",
  [LeaseStatus.Expired]: "Expired",
  [LeaseStatus.Terminated]: "Terminated",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: "Cash",
  [PaymentMethod.BankTransfer]: "Bank transfer",
  [PaymentMethod.Cheque]: "Cheque",
  [PaymentMethod.Card]: "Card",
  [PaymentMethod.Other]: "Other",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.Paid]: "Paid",
  [PaymentStatus.Partial]: "Partial",
  [PaymentStatus.Pending]: "Pending",
  [PaymentStatus.Late]: "Late",
};

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Maintenance]: "Maintenance",
  [ExpenseCategory.Utilities]: "Utilities",
  [ExpenseCategory.Insurance]: "Insurance",
  [ExpenseCategory.PropertyTax]: "Property tax",
  [ExpenseCategory.Management]: "Management",
  [ExpenseCategory.Repairs]: "Repairs",
  [ExpenseCategory.Supplies]: "Supplies",
  [ExpenseCategory.Other]: "Other",
};

export const maintenancePriorityLabels: Record<MaintenancePriority, string> = {
  [MaintenancePriority.Low]: "Low",
  [MaintenancePriority.Medium]: "Medium",
  [MaintenancePriority.High]: "High",
  [MaintenancePriority.Urgent]: "Urgent",
};

export const maintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  [MaintenanceStatus.Open]: "Open",
  [MaintenanceStatus.Scheduled]: "Scheduled",
  [MaintenanceStatus.InProgress]: "In progress",
  [MaintenanceStatus.Completed]: "Completed",
  [MaintenanceStatus.Cancelled]: "Cancelled",
};

/** Turns a label map into the { value, label } pairs a <Select> wants. */
export function toOptions<T extends string>(labels: Record<T, string>): Array<{ value: T; label: string }> {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
