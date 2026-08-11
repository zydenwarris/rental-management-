import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { PropertyStatus, PropertyType, type PropertyCreateInput } from "@contract";
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
import { propertyTypeLabels, toOptions } from "@app/lib/labels.js";
import { useCreateProperty, usePropertyQuery, useUpdateProperty } from "./api.js";

/**
 * The form carries `status` even though creation does not: the API sets it to
 * active on create and only accepts it on update, so the field is rendered and
 * submitted only when editing.
 */
type FormValues = PropertyCreateInput & { status: PropertyStatus };

const emptyValues: FormValues = {
  name: "",
  type: PropertyType.Apartment,
  address: "",
  city: "",
  description: "",
  notes: "",
  status: PropertyStatus.Active,
};

export function PropertyFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const existing = usePropertyQuery(id);
  const create = useCreateProperty();
  const update = useUpdateProperty(id ?? "");

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: emptyValues });

  useEffect(() => {
    if (existing.data) reset(existing.data);
  }, [existing.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    const { status, ...createFields } = values;

    try {
      // Create refuses `status`; update accepts it. Two shapes, two calls.
      const saved = isEdit
        ? await update.mutateAsync({ ...createFields, status })
        : await create.mutateAsync(createFields);
      navigate(`/properties/${saved.id}`);
    } catch (error) {
      if (!applyServerErrors(error, setError)) throw error;
    }
  });

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? "Edit property" : "New property"}
        title={isEdit ? (existing.data?.name ?? "Edit property") : "Add a property"}
        description="Units, expenses, and maintenance records all attach to a property."
      />

      <Panel padded>
        <form className={ui.form} onSubmit={onSubmit} noValidate>
          {errors.root?.serverError && <FormBanner message={errors.root.serverError.message ?? ""} />}

          <div className={ui.fieldGrid}>
            <Field label="Property name" required error={errors.name?.message} wide>
              <input
                className={cx(ui.input, errors.name && ui.inputInvalid)}
                {...register("name", { required: "Give the property a name." })}
                placeholder="Palm View Apartments"
                autoFocus
              />
            </Field>

            <Field label="Type" required error={errors.type?.message}>
              <Select options={toOptions(propertyTypeLabels)} {...register("type")} />
            </Field>

            <Field label="City" required error={errors.city?.message}>
              <input
                className={cx(ui.input, errors.city && ui.inputInvalid)}
                {...register("city", { required: "Which city is it in?" })}
                placeholder="Port of Spain"
              />
            </Field>

            <Field label="Address" required error={errors.address?.message} wide>
              <input
                className={cx(ui.input, errors.address && ui.inputInvalid)}
                {...register("address", { required: "Give the street address." })}
                placeholder="12 Maraval Road"
              />
            </Field>

            {isEdit && (
              <Field label="Status" error={errors.status?.message}>
                <Select
                  options={[
                    { value: PropertyStatus.Active, label: "Active" },
                    { value: PropertyStatus.Archived, label: "Archived" },
                  ]}
                  {...register("status")}
                />
              </Field>
            )}

            <Field label="Description" error={errors.description?.message} wide>
              <textarea
                className={ui.textarea}
                {...register("description")}
                placeholder="Six-unit walk-up close to the Savannah."
              />
            </Field>

            <Field label="Notes" error={errors.notes?.message} wide>
              <textarea className={ui.textarea} {...register("notes")} placeholder="Roof resealed 2024." />
            </Field>
          </div>

          <div className={ui.formActions}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add property"}
            </Button>
            <Link to={isEdit ? `/properties/${id}` : "/properties"}>
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Panel>
    </>
  );
}
