import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { MaintenancePriority } from "@contract";
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
import { todayIso } from "@app/lib/dates.js";
import { maintenancePriorityLabels, toOptions } from "@app/lib/labels.js";
import { usePropertiesQuery } from "@app/features/properties/api.js";
import { useUnitsQuery } from "@app/features/units/api.js";
import { useCreateMaintenance, useMaintenanceQuery, useUpdateMaintenance } from "./api.js";

const COMMON_AREA = "";

interface FormValues {
  propertyId: string;
  unitId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  contractor: string;
  estimatedCostDollars: number | string;
  actualCostDollars: number | string;
  reportedDate: string;
  scheduledDate: string;
  notes: string;
}

export function MaintenanceFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const properties = usePropertiesQuery();
  const units = useUnitsQuery();
  const existing = useMaintenanceQuery(id);
  const create = useCreateMaintenance();
  const update = useUpdateMaintenance(id ?? "");

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      propertyId: "",
      unitId: COMMON_AREA,
      title: "",
      description: "",
      priority: MaintenancePriority.Medium,
      contractor: "",
      estimatedCostDollars: "",
      actualCostDollars: "",
      reportedDate: todayIso(),
      scheduledDate: "",
      notes: "",
    },
  });

  const selectedPropertyId = useWatch({ control, name: "propertyId" });

  useEffect(() => {
    if (!existing.data) return;
    reset({
      propertyId: existing.data.propertyId,
      unitId: existing.data.unitId ?? COMMON_AREA,
      title: existing.data.title,
      description: existing.data.description,
      priority: existing.data.priority,
      contractor: existing.data.contractor,
      estimatedCostDollars:
        existing.data.estimatedCost !== null ? centsToDollars(existing.data.estimatedCost) : "",
      actualCostDollars:
        existing.data.actualCost !== null ? centsToDollars(existing.data.actualCost) : "",
      reportedDate: existing.data.reportedDate,
      scheduledDate: existing.data.scheduledDate ?? "",
      notes: existing.data.notes,
    });
  }, [existing.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    // Empty cost fields mean "not known", which the API models as null rather
    // than zero — zero would claim the job was free.
    const optionalCents = (value: number | string) =>
      value === "" || value === null ? null : dollarsToCents(Number(value));

    const shared = {
      propertyId: values.propertyId,
      unitId: values.unitId === COMMON_AREA ? null : values.unitId,
      title: values.title,
      description: values.description,
      priority: values.priority,
      contractor: values.contractor,
      estimatedCost: optionalCents(values.estimatedCostDollars),
      reportedDate: values.reportedDate,
      scheduledDate: values.scheduledDate === "" ? null : values.scheduledDate,
      notes: values.notes,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ ...shared, actualCost: optionalCents(values.actualCostDollars) });
        navigate(`/maintenance/${id}`);
      } else {
        const saved = await create.mutateAsync(shared);
        navigate(`/maintenance/${saved.id}`);
      }
    } catch (error) {
      if (!applyServerErrors(error, setError)) throw error;
    }
  });

  const propertyOptions = [
    { value: "", label: "Select a property" },
    ...(properties.data ?? []).map((property) => ({ value: property.id, label: property.name })),
  ];

  const unitOptions = [
    { value: COMMON_AREA, label: "Common area" },
    ...(units.data ?? [])
      .filter((unit) => unit.propertyId === selectedPropertyId)
      .map((unit) => ({ value: unit.id, label: unit.label })),
  ];

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? "Edit request" : "New request"}
        title={isEdit ? "Edit maintenance request" : "Log a maintenance issue"}
        description="Status is changed from the request's own page, so only legal moves are offered."
      />

      <Panel padded>
        <form className={ui.form} onSubmit={onSubmit} noValidate>
          {errors.root?.serverError && <FormBanner message={errors.root.serverError.message ?? ""} />}

          <div className={ui.fieldGrid}>
            <Field label="Property" required error={errors.propertyId?.message}>
              <Select
                options={propertyOptions}
                {...register("propertyId", { required: "Choose the property." })}
              />
            </Field>

            <Field label="Unit" error={errors.unitId?.message}>
              <Select options={unitOptions} {...register("unitId")} />
            </Field>

            <Field label="Title" required error={errors.title?.message} wide>
              <input
                className={cx(ui.input, errors.title && ui.inputInvalid)}
                {...register("title", { required: "Summarise the issue." })}
                placeholder="Kitchen tap leaking"
                autoFocus
              />
            </Field>

            <Field label="Description" required error={errors.description?.message} wide>
              <textarea
                className={cx(ui.textarea, errors.description && ui.inputInvalid)}
                {...register("description", { required: "Describe what is wrong." })}
                placeholder="Constant drip; tenant reports a rising water bill."
              />
            </Field>

            <Field label="Priority" required error={errors.priority?.message}>
              <Select options={toOptions(maintenancePriorityLabels)} {...register("priority")} />
            </Field>

            <Field label="Contractor" error={errors.contractor?.message}>
              <input className={ui.input} {...register("contractor")} placeholder="Dave's Plumbing" />
            </Field>

            <Field label="Reported" required error={errors.reportedDate?.message}>
              <input
                type="date"
                className={cx(ui.input, errors.reportedDate && ui.inputInvalid)}
                {...register("reportedDate", { required: "When was it reported?" })}
              />
            </Field>

            <Field label="Scheduled" error={errors.scheduledDate?.message} hint="Leave blank if not booked.">
              <input type="date" className={ui.input} {...register("scheduledDate")} />
            </Field>

            <Field label="Estimated cost" error={errors.estimatedCostDollars?.message}>
              <div className={ui.prefix}>
                <span className={ui.prefixLabel}>TTD</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={cx(ui.input, ui.inputMoney)}
                  {...register("estimatedCostDollars")}
                  placeholder="450.00"
                />
              </div>
            </Field>

            {isEdit && (
              <Field label="Actual cost" error={errors.actualCostDollars?.message}>
                <div className={ui.prefix}>
                  <span className={ui.prefixLabel}>TTD</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className={cx(ui.input, ui.inputMoney)}
                    {...register("actualCostDollars")}
                    placeholder="620.00"
                  />
                </div>
              </Field>
            )}

            <Field label="Notes" error={errors.notes?.message} wide>
              <textarea className={ui.textarea} {...register("notes")} />
            </Field>
          </div>

          <div className={ui.formActions}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Log issue"}
            </Button>
            <Link to="/maintenance">
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Panel>
    </>
  );
}
