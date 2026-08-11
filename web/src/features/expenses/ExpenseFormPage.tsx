import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { ExpenseCategory } from "@contract";
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
import { expenseCategoryLabels, toOptions } from "@app/lib/labels.js";
import { usePropertiesQuery } from "@app/features/properties/api.js";
import { useUnitsQuery } from "@app/features/units/api.js";
import { useCreateExpense, useExpenseQuery, useUpdateExpense } from "./api.js";

/** Sentinel for "no unit" — the API wants null, and a select can only hold strings. */
const WHOLE_PROPERTY = "";

interface FormValues {
  propertyId: string;
  unitId: string;
  category: ExpenseCategory;
  description: string;
  amountDollars: number | string;
  date: string;
  vendor: string;
  notes: string;
}

export function ExpenseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const properties = usePropertiesQuery();
  const units = useUnitsQuery();
  const existing = useExpenseQuery(id);
  const create = useCreateExpense();
  const update = useUpdateExpense(id ?? "");

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
      unitId: WHOLE_PROPERTY,
      category: ExpenseCategory.Maintenance,
      description: "",
      amountDollars: "",
      date: todayIso(),
      vendor: "",
      notes: "",
    },
  });

  const selectedPropertyId = useWatch({ control, name: "propertyId" });

  useEffect(() => {
    if (!existing.data) return;
    reset({
      propertyId: existing.data.propertyId,
      unitId: existing.data.unitId ?? WHOLE_PROPERTY,
      category: existing.data.category,
      description: existing.data.description,
      amountDollars: centsToDollars(existing.data.amount),
      date: existing.data.date,
      vendor: existing.data.vendor,
      notes: existing.data.notes,
    });
  }, [existing.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    const body = {
      propertyId: values.propertyId,
      // The API accepts null, not an empty string, for a property-wide cost.
      unitId: values.unitId === WHOLE_PROPERTY ? null : values.unitId,
      category: values.category,
      description: values.description,
      amount: dollarsToCents(Number(values.amountDollars)),
      date: values.date,
      vendor: values.vendor,
      notes: values.notes,
    };

    try {
      if (isEdit) await update.mutateAsync(body);
      else await create.mutateAsync(body);
      navigate("/expenses");
    } catch (error) {
      if (!applyServerErrors(error, setError)) throw error;
    }
  });

  const propertyOptions = [
    { value: "", label: "Select a property" },
    ...(properties.data ?? []).map((property) => ({ value: property.id, label: property.name })),
  ];

  // Only the chosen property's units: the API refuses a unit from elsewhere.
  const unitOptions = [
    { value: WHOLE_PROPERTY, label: "Whole property" },
    ...(units.data ?? [])
      .filter((unit) => unit.propertyId === selectedPropertyId)
      .map((unit) => ({ value: unit.id, label: unit.label })),
  ];

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? "Edit expense" : "New expense"}
        title={isEdit ? "Edit expense" : "Add an expense"}
        description="Leave the unit as “Whole property” for costs that apply to the whole building."
      />

      <Panel padded>
        <form className={ui.form} onSubmit={onSubmit} noValidate>
          {errors.root?.serverError && <FormBanner message={errors.root.serverError.message ?? ""} />}

          <div className={ui.fieldGrid}>
            <Field label="Property" required error={errors.propertyId?.message}>
              <Select
                options={propertyOptions}
                {...register("propertyId", { required: "Choose the property this cost belongs to." })}
              />
            </Field>

            <Field label="Unit" error={errors.unitId?.message}>
              <Select options={unitOptions} {...register("unitId")} />
            </Field>

            <Field label="Category" required error={errors.category?.message}>
              <Select options={toOptions(expenseCategoryLabels)} {...register("category")} />
            </Field>

            <Field label="Date" required error={errors.date?.message}>
              <input
                type="date"
                className={cx(ui.input, errors.date && ui.inputInvalid)}
                {...register("date", { required: "When was this spent?" })}
              />
            </Field>

            <Field label="Description" required error={errors.description?.message} wide>
              <input
                className={cx(ui.input, errors.description && ui.inputInvalid)}
                {...register("description", { required: "Say what the money was for." })}
                placeholder="Common area electricity"
              />
            </Field>

            <Field label="Amount" required error={errors.amountDollars?.message}>
              <div className={ui.prefix}>
                <span className={ui.prefixLabel}>TTD</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={cx(ui.input, ui.inputMoney, errors.amountDollars && ui.inputInvalid)}
                  {...register("amountDollars", { required: "Enter the amount." })}
                  placeholder="620.00"
                />
              </div>
            </Field>

            <Field label="Vendor" error={errors.vendor?.message}>
              <input className={ui.input} {...register("vendor")} placeholder="T&TEC" />
            </Field>

            <Field label="Notes" error={errors.notes?.message} wide>
              <textarea className={ui.textarea} {...register("notes")} />
            </Field>
          </div>

          <div className={ui.formActions}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add expense"}
            </Button>
            <Link to="/expenses">
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Panel>
    </>
  );
}
