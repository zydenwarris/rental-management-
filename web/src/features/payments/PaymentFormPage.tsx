import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { PaymentMethod } from "@contract";
import {
  Badge,
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
import { paymentMethodLabels, paymentStatusLabels, toOptions } from "@app/lib/labels.js";
import { useLeasesQuery } from "@app/features/leases/api.js";
import { useTenantsQuery } from "@app/features/tenants/api.js";
import { paymentStatusTones } from "@app/features/leases/tones.js";
import { usePaymentQuery, useRecordPayment, useUpdatePayment } from "./api.js";

interface FormValues {
  leaseId: string;
  amountDollars: number | string;
  paymentDate: string;
  dueDate: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
}

export function PaymentFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const leases = useLeasesQuery();
  const tenants = useTenantsQuery();
  const existing = usePaymentQuery(id);
  const record = useRecordPayment();
  const update = useUpdatePayment(id ?? "");

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      leaseId: searchParams.get("leaseId") ?? "",
      amountDollars: "",
      paymentDate: todayIso(),
      dueDate: todayIso(),
      method: PaymentMethod.BankTransfer,
      reference: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!existing.data) return;
    reset({
      leaseId: existing.data.leaseId,
      amountDollars: centsToDollars(existing.data.amount),
      paymentDate: existing.data.paymentDate,
      dueDate: existing.data.dueDate,
      method: existing.data.method,
      reference: existing.data.reference,
      notes: existing.data.notes,
    });
  }, [existing.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    const shared = {
      amount: dollarsToCents(Number(values.amountDollars)),
      paymentDate: values.paymentDate,
      dueDate: values.dueDate,
      method: values.method,
      reference: values.reference,
      notes: values.notes,
    };

    try {
      // leaseId is immutable: a payment applied to the wrong lease is deleted
      // and re-recorded rather than moved.
      if (isEdit) {
        await update.mutateAsync(shared);
      } else {
        await record.mutateAsync({ ...shared, leaseId: values.leaseId });
      }
      navigate("/payments");
    } catch (error) {
      if (!applyServerErrors(error, setError)) throw error;
    }
  });

  const tenantName = (tenantId: string) =>
    tenants.data?.find((tenant) => tenant.id === tenantId)?.fullName ?? "Tenant";

  const leaseOptions = [
    { value: "", label: "Select a lease" },
    ...(leases.data ?? []).map((lease) => ({
      value: lease.id,
      label: `${tenantName(lease.tenantId)} · ${lease.startDate} to ${lease.endDate}`,
    })),
  ];

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? "Edit payment" : "Record payment"}
        title={isEdit ? "Edit payment" : "Record a payment"}
        description="The payment date must fall inside the lease term."
      />

      <Panel padded>
        <form className={ui.form} onSubmit={onSubmit} noValidate>
          {errors.root?.serverError && <FormBanner message={errors.root.serverError.message ?? ""} />}

          <div className={ui.fieldGrid}>
            <Field
              label="Lease"
              required
              error={errors.leaseId?.message}
              wide
              hint={isEdit ? "Cannot be changed — delete and re-record instead." : undefined}
            >
              <Select
                options={leaseOptions}
                disabled={isEdit}
                {...register("leaseId", { required: "Choose the lease this pays." })}
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
                  {...register("amountDollars", { required: "Enter the amount received." })}
                  placeholder="3500.00"
                  autoFocus
                />
              </div>
            </Field>

            <Field label="Method" required error={errors.method?.message}>
              <Select options={toOptions(paymentMethodLabels)} {...register("method")} />
            </Field>

            <Field label="Payment date" required error={errors.paymentDate?.message}>
              <input
                type="date"
                className={cx(ui.input, errors.paymentDate && ui.inputInvalid)}
                {...register("paymentDate", { required: "When did the money arrive?" })}
              />
            </Field>

            <Field label="Due date" required error={errors.dueDate?.message}>
              <input
                type="date"
                className={cx(ui.input, errors.dueDate && ui.inputInvalid)}
                {...register("dueDate", { required: "When was it due?" })}
              />
            </Field>

            <Field label="Reference" error={errors.reference?.message}>
              <input className={ui.input} {...register("reference")} placeholder="RBC-884219" />
            </Field>

            {isEdit && existing.data && (
              <Field label="Status" hint="Worked out from the amount and dates — not editable.">
                <div>
                  <Badge tone={paymentStatusTones[existing.data.status]}>
                    {paymentStatusLabels[existing.data.status]}
                  </Badge>
                </div>
              </Field>
            )}

            <Field label="Notes" error={errors.notes?.message} wide>
              <textarea className={ui.textarea} {...register("notes")} placeholder="Balance promised next week." />
            </Field>
          </div>

          <div className={ui.formActions}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Record payment"}
            </Button>
            <Link to="/payments">
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Panel>
    </>
  );
}
