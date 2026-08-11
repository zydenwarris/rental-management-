import { Link } from "react-router";
import {
  MaintenanceStatus,
  UnitStatus,
  type DashboardSummary,
  type MaintenanceRequest,
  type Unit,
} from "@contract";
import { Badge, Button, EmptyState, PageHeader, Panel, ui } from "@app/components/ui/index.js";
import { QueryBoundary } from "@app/components/feedback/QueryBoundary.js";
import { AlertIcon, ClockIcon, PlusIcon } from "@app/components/layout/icons.js";
import { formatAmount, formatMoney } from "@app/lib/money.js";
import { formatDate, formatMonthLong } from "@app/lib/dates.js";
import { maintenancePriorityLabels } from "@app/lib/labels.js";
import { useCountUp } from "@app/hooks/useCountUp.js";
import { useLeasesQuery } from "@app/features/leases/api.js";
import { usePaymentsQuery } from "@app/features/payments/api.js";
import { useTenantsQuery } from "@app/features/tenants/api.js";
import { useUnitsQuery } from "@app/features/units/api.js";
import { useMaintenanceListQuery } from "@app/features/maintenance/api.js";
import { maintenancePriorityTones } from "@app/features/leases/tones.js";
import { useDashboardQuery } from "./api.js";
import { RentBook } from "./RentBook.js";
import styles from "./dashboard.module.css";

export function DashboardPage() {
  const dashboard = useDashboardQuery();

  return (
    <QueryBoundary query={dashboard} loadingRows={6}>
      {(summary) => <DashboardContent summary={summary} />}
    </QueryBoundary>
  );
}

function DashboardContent({ summary }: { summary: DashboardSummary }) {
  const units = useUnitsQuery();
  const leases = useLeasesQuery();
  const payments = usePaymentsQuery();
  const tenants = useTenantsQuery();
  const maintenance = useMaintenanceListQuery();

  const { financials, occupancy } = summary;
  const collectedPercent = Math.min(100, financials.collectionRate);
  const collectedCountUp = useCountUp(financials.collectedRent);

  return (
    <>
      <PageHeader
        eyebrow={formatMonthLong(summary.month)}
        title="Rent this month"
        description={`${summary.totalProperties} properties · ${occupancy.totalUnits} units`}
        actions={
          <Link to="/payments/new">
            <Button variant="primary">
              <PlusIcon />
              Record payment
            </Button>
          </Link>
        }
      />

      <div className={styles.grid}>
        <Panel>
          <div className={styles.collection}>
            <div>
              <p className={ui.eyebrow}>Collected</p>
              <p className={styles.collectedAmount}>
                {formatMoney(Math.round(collectedCountUp))}
              </p>
              <p className={styles.collectedOf}>
                of <b>{formatAmount(financials.expectedRent)}</b> expected
              </p>

              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${collectedPercent}%` }}
                  role="img"
                  aria-label={`${financials.collectionRate}% of expected rent collected`}
                />
              </div>
              <div className={styles.progressLegend}>
                <span>{financials.collectionRate}% collected</span>
                <span>{formatAmount(financials.outstandingRent)} outstanding</span>
              </div>
            </div>

            <dl className={styles.figures}>
              <Figure label="Expected rent" value={formatAmount(financials.expectedRent)} />
              <Figure label="Collected" value={formatAmount(financials.collectedRent)} />
              <Figure
                label="Outstanding"
                value={formatAmount(financials.outstandingRent)}
                tone={financials.outstandingRent > 0 ? "negative" : undefined}
              />
              <Figure label="Expenses" value={formatAmount(financials.expenses)} />
              <Figure
                label="Net income"
                value={formatAmount(financials.netIncome)}
                tone={financials.netIncome >= 0 ? "positive" : "negative"}
              />
            </dl>
          </div>
        </Panel>

        <Panel title="The rent book">
          {leases.data && payments.data && tenants.data && units.data ? (
            <RentBook
              leases={leases.data}
              payments={payments.data}
              tenants={tenants.data}
              units={units.data}
            />
          ) : (
            <div className={ui.skeletonStack}>
              <div className={ui.skeleton} style={{ height: 120 }} />
            </div>
          )}
        </Panel>

        <div className={styles.twoUp}>
          <Panel title="Occupancy">
            <div className={styles.occupancy}>
              <Occupancy units={units.data ?? []} summary={summary} />
            </div>
          </Panel>

          <Panel title="Needs attention">
            <NeedsAttention summary={summary} maintenance={maintenance.data ?? []} />
          </Panel>
        </div>
      </div>
    </>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "negative" ? styles.figureNegative : tone === "positive" ? styles.figurePositive : "";
  return (
    <div className={styles.figureRow}>
      <dt className={styles.figureLabel}>{label}</dt>
      <dd className={`${styles.figureValue} ${toneClass}`} style={{ margin: 0 }}>
        {value}
      </dd>
    </div>
  );
}

/**
 * One segment per real unit rather than a percentage ring: seven units is seven
 * discrete things a landlord can point at, and "57.1%" is not.
 */
function Occupancy({ units, summary }: { units: Unit[]; summary: DashboardSummary }) {
  const { occupancy } = summary;

  const segmentClass = (status: UnitStatus) =>
    status === UnitStatus.Occupied
      ? styles.segmentOccupied
      : status === UnitStatus.UnderMaintenance
        ? styles.segmentMaintenance
        : styles.segmentVacant;

  return (
    <>
      <div
        className={styles.segments}
        role="img"
        aria-label={`${occupancy.occupied} occupied, ${occupancy.vacant} vacant, ${occupancy.underMaintenance} under maintenance, of ${occupancy.totalUnits} units`}
      >
        {units.map((unit, index) => (
          <span
            key={unit.id}
            className={`${styles.segment} ${segmentClass(unit.status)}`}
            style={{ animationDelay: `${index * 45}ms` }}
            title={`${unit.label} — ${unit.status.replace("_", " ")}`}
          />
        ))}
      </div>

      <p className={styles.collectedOf} style={{ marginTop: 0, marginBottom: "var(--space-3)" }}>
        <b>{occupancy.occupancyRate}%</b> occupied
      </p>

      <div className={styles.occupancyLegend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.segmentOccupied}`} />
          {occupancy.occupied} occupied
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.segmentVacant}`} />
          {occupancy.vacant} vacant
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.segmentMaintenance}`} />
          {occupancy.underMaintenance} under maintenance
        </span>
      </div>
    </>
  );
}

function NeedsAttention({
  summary,
  maintenance,
}: {
  summary: DashboardSummary;
  maintenance: MaintenanceRequest[];
}) {
  const openUrgent = maintenance.filter(
    (request) =>
      request.status !== MaintenanceStatus.Completed &&
      request.status !== MaintenanceStatus.Cancelled &&
      (request.priority === "urgent" || request.priority === "high"),
  );

  const hasNothing = openUrgent.length === 0 && summary.leasesExpiringSoon.length === 0;

  if (hasNothing) {
    return (
      <EmptyState
        title="Nothing needs you"
        message="No urgent repairs and no leases ending in the next 60 days."
      />
    );
  }

  return (
    <div className={styles.attention}>
      {openUrgent.map((request) => (
        <Link key={request.id} to={`/maintenance/${request.id}`} className={styles.attentionItem}>
          <span className={`${styles.attentionIcon} ${styles.attentionUrgent}`}>
            <AlertIcon />
          </span>
          <span className={styles.attentionText}>
            <span>{request.title}</span>
            <span className={styles.attentionMeta} style={{ display: "block" }}>
              Reported {formatDate(request.reportedDate)}
            </span>
          </span>
          <Badge tone={maintenancePriorityTones[request.priority]}>
            {maintenancePriorityLabels[request.priority]}
          </Badge>
        </Link>
      ))}

      {summary.leasesExpiringSoon.map((lease) => (
        <Link key={lease.leaseId} to={`/leases/${lease.leaseId}`} className={styles.attentionItem}>
          <span className={`${styles.attentionIcon} ${styles.attentionSoon}`}>
            <ClockIcon />
          </span>
          <span className={styles.attentionText}>
            <span>Lease ends {formatDate(lease.endDate)}</span>
            <span className={styles.attentionMeta} style={{ display: "block" }}>
              Renew or replace before the unit sits empty
            </span>
          </span>
          <Badge tone={lease.daysRemaining <= 30 ? "warning" : "neutral"}>
            {lease.daysRemaining} days
          </Badge>
        </Link>
      ))}
    </div>
  );
}
