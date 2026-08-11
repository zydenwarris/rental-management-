import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { UnitStatus } from "@contract";
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
import { unitStatusLabels, toOptions } from "@app/lib/labels.js";
import { usePropertiesQuery } from "@app/features/properties/api.js";
import { useCreateUnit, useUnitQuery, useUpdateUnit } from "./api.js";

/** Money is entered in dollars and sent in cents, so the form holds dollars. */
interface FormValues {
  propertyId: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  marketRentDollars: number | string;
  status: UnitStatus;
  description: string;
  notes: string;
}

export function UnitFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const properties = usePropertiesQuery();
  const existing = useUnitQuery(id);
  const create = useCreateUnit();
  const update = useUpdateUnit(id ?? "");

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      propertyId: searchParams.get("propertyId") ?? "",
      label: "",
      bedrooms: 1,
      bathrooms: 1,
      marketRentDollars: "",
      status: UnitStatus.Vacant,
      description: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!existing.data) return;
    reset({
      propertyId: existing.data.propertyId,
      label: existing.data.label,
      bedrooms: existing.data.bedrooms,
      bathrooms: existing.data.bathrooms,
      marketRentDollars: centsToDollars(existing.data.marketRent),
      status: existing.data.status,
      description: existing.data.description,
      notes: existing.data.notes,
    });
  }, [existing.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    const body = {
      propertyId: values.propertyId,
      label: values.label,
      bedrooms: Number(values.bedrooms),
      bathrooms: Number(values.bathrooms),
      marketRent: dollarsToCents(Number(values.marketRentDollars)),
      description: values.description,
      notes: values.notes,
      ...(isEdit ? { status: values.status } : {}),
    };

    try {
      const saved = isEdit ? await update.mutateAsync(body) : await create.mutateAsync(body);
      navigate(`/properties/${saved.propertyId}`);
    } catch (error) {
      if (!applyServerErrors(error, setError)) throw error;
    }
  });

  const propertyOptions = [
    { value: "", label: "Select a property" },
    ...(properties.data ?? []).map((property) => ({ value: property.id, label: property.name })),
  ];

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? "Edit unit" : "New unit"}
        title={isEdit ? (existing.data?.label ?? "Edit unit") : "Add a unit"}
        description="A unit belongs to one property. Labels must be unique within that property."
      />

      <Panel padded>
        <form className={ui.form} onSubmit={onSubmit} noValidate>
          {errors.root?.serverError && <FormBanner message={errors.root.serverError.message ?? ""} />}

          <div className={ui.fieldGrid}>
            <Field label="Property" required error={errors.propertyId?.message}>
              <Select
                options={propertyOptions}
                {...register("propertyId", { required: "Choose the property this unit belongs to." })}
              />
            </Field>

            <Field
              label="Unit label"
              required
              error={errors.label?.message}
              hint="For example 1A, Left, or Main House."
            >
              <input
                className={cx(ui.input, errors.label && ui.inputInvalid)}
                {...register("label", { required: "Give the unit a label." })}
                placeholder="1A"
              />
            </Field>

            <Field label="Bedrooms" required error={errors.bedrooms?.message}>
              <input
                type="number"
                min={0}
                className={cx(ui.input, ui.inputMoney, errors.bedrooms && ui.inputInvalid)}
                {...register("bedrooms", { required: "Required.", min: { value: 0, message: "Cannot be negative." } })}
              />
            </Field>

            <Field label="Bathrooms" required error={errors.bathrooms?.message}>
              <input
                type="number"
                min={0}
                className={cx(ui.input, ui.inputMoney, errors.bathrooms && ui.inputInvalid)}
                {...register("bathrooms", { required: "Required.", min: { value: 0, message: "Cannot be negative." } })}
              />
            </Field>

            <Field
              label="Market rent"
              required
              error={errors.marketRentDollars?.message}
              hint="Monthly, in TTD."
            >
              <div className={ui.prefix}>
                <span className={ui.prefixLabel}>TTD</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={cx(ui.input, ui.inputMoney, errors.marketRentDollars && ui.inputInvalid)}
                  {...register("marketRentDollars", { required: "Enter the monthly rent." })}
                  placeholder="3500.00"
                />
              </div>
            </Field>

            {isEdit && (
              <Field
                label="Status"
                error={errors.status?.message}
                hint="Occupancy normally follows lease activity."
              >
                <Select options={toOptions(unitStatusLabels)} {...register("status")} />
              </Field>
            )}

            <Field label="Description" error={errors.description?.message} wide>
              <textarea className={ui.textarea} {...register("description")} placeholder="Ground floor, front." />
            </Field>

            <Field label="Notes" error={errors.notes?.message} wide>
              <textarea className={ui.textarea} {...register("notes")} />
            </Field>
          </div>

          <div className={ui.formActions}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add unit"}
            </Button>
            <Link to="/units">
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Panel>
    </>
  );
}
