import { LeaseStatus, MaintenancePriority, MaintenanceStatus, PaymentStatus } from "@contract";
import type { BadgeTone } from "@app/components/ui/index.js";

/**
 * Status-to-tone mapping in one place, so a lease never reads "active" in green
 * on one screen and grey on another.
 */

export const leaseStatusTones: Record<LeaseStatus, BadgeTone> = {
  [LeaseStatus.Active]: "positive",
  [LeaseStatus.Upcoming]: "accent",
  [LeaseStatus.Expired]: "neutral",
  [LeaseStatus.Terminated]: "neutral",
};

export const paymentStatusTones: Record<PaymentStatus, BadgeTone> = {
  [PaymentStatus.Paid]: "positive",
  [PaymentStatus.Partial]: "warning",
  [PaymentStatus.Pending]: "neutral",
  [PaymentStatus.Late]: "danger",
};

export const maintenancePriorityTones: Record<MaintenancePriority, BadgeTone> = {
  [MaintenancePriority.Low]: "neutral",
  [MaintenancePriority.Medium]: "accent",
  [MaintenancePriority.High]: "warning",
  [MaintenancePriority.Urgent]: "danger",
};

export const maintenanceStatusTones: Record<MaintenanceStatus, BadgeTone> = {
  [MaintenanceStatus.Open]: "warning",
  [MaintenanceStatus.Scheduled]: "accent",
  [MaintenanceStatus.InProgress]: "accent",
  [MaintenanceStatus.Completed]: "positive",
  [MaintenanceStatus.Cancelled]: "neutral",
};
