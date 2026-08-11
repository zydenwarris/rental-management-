import type { BaseEntity } from "../../shared/types.js";
import type { Cents } from "../../shared/money.js";
import type { IsoDate } from "../../shared/dates.js";

export const MaintenancePriority = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Urgent: "urgent",
} as const;

export type MaintenancePriority = (typeof MaintenancePriority)[keyof typeof MaintenancePriority];

export const MaintenanceStatus = {
  Open: "open",
  Scheduled: "scheduled",
  InProgress: "in_progress",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;

export type MaintenanceStatus = (typeof MaintenanceStatus)[keyof typeof MaintenanceStatus];

/** Statuses that still need the landlord's attention; drives the dashboard count. */
export const OPEN_MAINTENANCE_STATUSES: readonly MaintenanceStatus[] = [
  MaintenanceStatus.Open,
  MaintenanceStatus.Scheduled,
  MaintenanceStatus.InProgress,
];

/**
 * Which status may follow which. A request cannot jump from Completed back to
 * Open, or move on after being Cancelled — both are terminal.
 */
export const ALLOWED_STATUS_TRANSITIONS: Readonly<
  Record<MaintenanceStatus, readonly MaintenanceStatus[]>
> = {
  [MaintenanceStatus.Open]: [
    MaintenanceStatus.Scheduled,
    MaintenanceStatus.InProgress,
    MaintenanceStatus.Completed,
    MaintenanceStatus.Cancelled,
  ],
  [MaintenanceStatus.Scheduled]: [
    MaintenanceStatus.InProgress,
    MaintenanceStatus.Completed,
    MaintenanceStatus.Cancelled,
    MaintenanceStatus.Open,
  ],
  [MaintenanceStatus.InProgress]: [
    MaintenanceStatus.Completed,
    MaintenanceStatus.Cancelled,
  ],
  [MaintenanceStatus.Completed]: [],
  [MaintenanceStatus.Cancelled]: [],
};

export interface MaintenanceRequest extends BaseEntity {
  readonly propertyId: string;
  /** null when the issue affects common areas rather than one unit. */
  readonly unitId: string | null;
  readonly title: string;
  readonly description: string;
  readonly priority: MaintenancePriority;
  readonly status: MaintenanceStatus;
  readonly contractor: string;
  readonly estimatedCost: Cents | null;
  readonly actualCost: Cents | null;
  readonly reportedDate: IsoDate;
  readonly scheduledDate: IsoDate | null;
  readonly completedDate: IsoDate | null;
  readonly notes: string;
}

export type MaintenanceCreate = Omit<MaintenanceRequest, keyof BaseEntity>;
export type MaintenanceUpdate = Partial<MaintenanceCreate>;
