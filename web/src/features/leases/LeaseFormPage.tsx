import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import {
  Button,
  Field,
  FormBanner,
  PageHeader,
  Panel,
  Select,
  ui,
  cx,
} from "@app/components/ui/index.js";
import { applyServerErrors } from "@app/lib/form/applyServerErrors.js";
import { centsToDollars, dollarsToCents } from "@app/lib/money.js";
import { useTenantsQuery } from "@app/features/tenants/api.js";
import { useUnitsQuery } from "@app/features/units/api.js";
import { usePropertiesQuery } from "@app/features/properties/api.js";
import { useCreateLease, useLeaseQuery, useUpdateLease } from "./api.js";

interface FormValues {
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRentDollars: number | string;
  securityDepositDollars: number | string;
  rentDueDay: number;
  utilitiesIncluded: boolean;
  notes: string;
}

export function LeaseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const tenants = useTenantsQuery();
  const units = useUnitsQuery();
  const properties = usePropertiesQuery();
  const existing = useLeaseQuery(id);
  const create = useCreateLease();
  const update = useUpdateLease(id ?? "");

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      tenantId: "",
      unitId: "",
      startDate: "",
      endDate: "",
      monthlyRentDollars: "",
      securityDepositDollars: "",
      rentDueDay: 1,
      utilitiesIncluded: false,
      notes: "",
    },
  });

  useEffect(() => {
    if (!existing.data) return;
    reset({
      tenantId: existing.data.tenantId,
      unitId: existing.data.unitId,
      startDate: existing.data.startDate,
      endDate: existing.data.endDate,
      monthlyRentDollars: centsToDollars(existing.data.monthlyRent),
      securityDepositDollars: centsToDollars(existing.data.securityDeposit),
      rentDueDay: existing.data.rentDueDay,
      utilitiesIncluded: existing.data.utilitiesIncluded,
      notes: existing.data.notes,
    });
  }, [existing.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    const shared = {
      startDate: values.startDate,
      endDate: values.endDate,
      monthlyRent: dollarsToCents(Number(values.monthlyRentDollars)),
      securityDeposit: dollarsToCents(Number(values.securityDepositDollars)),
      rentDueDay: Number(values.rentDueDay),
      utilitiesIncluded: Boolean(values.utilitiesIncluded),
      notes: values.notes,
    };

    try {
      // Tenant and unit are immutable on an existing lease: moving a tenant is a
      // new lease, which is what preserves the history.
      const saved = isEdit
        ? await update.mutateAsync(shared)
        : await create.mutateAsync({ ...shared, tenantId: values.tenantId, unitId: values.unitId });
      navigate(`/leases/${saved.id}`);
    } catch (error) {
      if (!applyServerErrors(error, setError)) throw error;
    }
  });

  const propertyName = (propertyId: string) =>
    properties.data?.find((property) => property.id === propertyId)?.name ?? "";

  const tenantOptions = [
    { value: "", label: "Select a tenant" },
    ...(tenants.data ?? []).map((tenant) => ({ value: tenant.id, label: tenant.fullName })),
  ];

  const unitOptions = [
    { value: "", label: "Select a unit" },
    ...(units.data ?? []).map((unit) => ({
      value: unit.id,
      label: `${propertyName(unit.propertyId)} · ${unit.label}`,
    })),
  ];

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? "Edit lease" : "New lease"}
        title={isEdit ? "Edit lease" : "Create a lease"}
        description="A unit cannot hold two running leases over the same dates. Overlaps are refused."
      />

      <Panel padded>
        <form className={ui.form} onSubmit={onSubmit} noValidate>
          {errors.root?.serverError && <FormBanner message={errors.root.serverError.message ?? ""} />}

          <div className={ui.fieldGrid}>
            <Field
              label="Tenant"
              required
              error={errors.tenantId?.message}
              hint={isEdit ? "Cannot be changed — create a new lease instead." : undefined}
            >
              <Select
                options={tenantOptions}
                disabled={isEdit}
                {...register("tenantId", { required: "Choose a tenant." })}
              />
            </Field>

            <Field
              label="Unit"
              required
              error={errors.unitId?.message}
              hint={isEdit ? "Cannot be changed — create a new lease instead." : undefined}
            >
              <Select
                options={unitOptions}
                disabled={isEdit}
                {...register("unitId", { required: "Choose a unit." })}
              />
            </Field>

            <Field label="Start date" required error={errors.startDate?.message}>
              <input
                type="date"
                className={cx(ui.input, errors.startDate && ui.inputInvalid)}
                {...register("startDate", { required: "When does the term begin?" })}
              />
            </Field>

            <Field label="End date" required error={errors.endDate?.message}>
              <input
                type="date"
                className={cx(ui.input, errors.endDate && ui.inputInvalid)}
                {...register("endDate", { required: "When does the term end?" })}
              />
            </Field>

            <Field label="Monthly rent" required error={errors.monthlyRentDollars?.message}>
              <div className={ui.prefix}>
                <span className={ui.prefixLabel}>TTD</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={cx(ui.input, ui.inputMoney, errors.monthlyRentDollars && ui.inputInvalid)}
                  {...register("monthlyRentDollars", { required: "Enter the monthly rent." })}
                  placeholder="3500.00"
                />
              </div>
            </Field>

            <Field label="Security deposit" required error={errors.securityDepositDollars?.message}>
              <div className={ui.prefix}>
                <span className={ui.prefixLabel}>TTD</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={cx(ui.input, ui.inputMoney, errors.securityDepositDollars && ui.inputInvalid)}
                  {...register("securityDepositDollars", { required: "Enter the deposit held." })}
                  placeholder="3500.00"
                />
              </div>
            </Field>

            <Field
              label="Rent due day"
              required
              error={errors.rentDueDay?.message}
              hint="1–28, so the day exists in every month."
            >
              <input
                type="number"
                min={1}
                max={28}
                className={cx(ui.input, ui.inputMoney, errors.rentDueDay && ui.inputInvalid)}
                {...register("rentDueDay", {
                  required: "Required.",
                  min: { value: 1, message: "Must be between 1 and 28." },
                  max: { value: 28, message: "Must be between 1 and 28." },
                })}
              />
            </Field>

            <Field label="Utilities" error={errors.utilitiesIncluded?.message}>
              <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <input type="checkbox" {...register("utilitiesIncluded")} />
                <span className={ui.hint}>Included in the rent</span>
              </label>
            </Field>

            <Field label="Notes" error={errors.notes?.message} wide>
              <textarea className={ui.textarea} {...register("notes")} placeholder="Two months' deposit held." />
            </Field>
          </div>

          <div className={ui.formActions}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create lease"}
            </Button>
            <Link to="/leases">
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Panel>
    </>
  );
}
