import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import type { TenantCreateInput } from "@contract";
import { Button, Field, FormBanner, PageHeader, Panel, ui, cx } from "@app/components/ui/index.js";
import { applyServerErrors } from "@app/lib/form/applyServerErrors.js";
import { useCreateTenant, useTenantQuery, useUpdateTenant } from "./api.js";

export function TenantFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const existing = useTenantQuery(id);
  const create = useCreateTenant();
  const update = useUpdateTenant(id ?? "");

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TenantCreateInput>({
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (existing.data) reset(existing.data);
  }, [existing.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    try {
      const saved = isEdit ? await update.mutateAsync(values) : await create.mutateAsync(values);
      navigate(`/tenants/${saved.id}`);
    } catch (error) {
      if (!applyServerErrors(error, setError)) throw error;
    }
  });

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? "Edit tenant" : "New tenant"}
        title={isEdit ? (existing.data?.fullName ?? "Edit tenant") : "Add a tenant"}
        description="Contact details only. This system deliberately does not collect medical information."
      />

      <Panel padded>
        <form className={ui.form} onSubmit={onSubmit} noValidate>
          {errors.root?.serverError && <FormBanner message={errors.root.serverError.message ?? ""} />}

          <div className={ui.fieldGrid}>
            <Field label="Full name" required error={errors.fullName?.message} wide>
              <input
                className={cx(ui.input, errors.fullName && ui.inputInvalid)}
                {...register("fullName", { required: "Enter the tenant's name." })}
                placeholder="Asha Ramkissoon"
                autoFocus
              />
            </Field>

            <Field label="Phone" required error={errors.phone?.message}>
              <input
                className={cx(ui.input, errors.phone && ui.inputInvalid)}
                {...register("phone", { required: "Enter a contact number." })}
                placeholder="868-555-0142"
              />
            </Field>

            <Field label="Email" error={errors.email?.message}>
              <input
                type="email"
                className={cx(ui.input, errors.email && ui.inputInvalid)}
                {...register("email")}
                placeholder="asha.r@example.tt"
              />
            </Field>

            <Field label="Emergency contact" error={errors.emergencyContactName?.message}>
              <input className={ui.input} {...register("emergencyContactName")} placeholder="Vishal Ramkissoon" />
            </Field>

            <Field label="Emergency phone" error={errors.emergencyContactPhone?.message}>
              <input className={ui.input} {...register("emergencyContactPhone")} placeholder="868-555-0143" />
            </Field>

            <Field label="Notes" error={errors.notes?.message} wide>
              <textarea className={ui.textarea} {...register("notes")} placeholder="Prefers WhatsApp." />
            </Field>
          </div>

          <div className={ui.formActions}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add tenant"}
            </Button>
            <Link to={isEdit ? `/tenants/${id}` : "/tenants"}>
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Panel>
    </>
  );
}
