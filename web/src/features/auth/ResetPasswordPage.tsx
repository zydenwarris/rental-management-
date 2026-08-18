import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { Button, Field, FormBanner, cx } from "@app/components/ui/index.js";
import { supabase } from "@app/lib/supabase/client.js";
import { AuthLayout } from "./AuthLayout.js";
import { useAuth } from "./AuthProvider.js";
import { AuthStatus } from "./authStatus.js";
import { PasswordInput } from "./PasswordInput.js";
import { authErrorMessage } from "./messages.js";
import { DEFAULT_SIGNED_IN_PATH, MIN_PASSWORD_LENGTH } from "./routes.js";
import styles from "./auth.module.css";

interface FormValues {
  password: string;
  confirmation: string;
}

/**
 * Where a password-reset link lands.
 *
 * Supabase puts the recovery tokens in the URL fragment and the client exchanges them
 * for a real session before this renders — so "is the link valid?" is answered by
 * whether a session exists, not by anything this page parses itself.
 *
 * Deliberately outside RequireAuth. The recovery session *is* a session, so a guard
 * would let it through anyway; keeping it outside means an expired link shows an
 * explanation instead of bouncing to the dashboard.
 */
export function ResetPasswordPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [linkError, setLinkError] = useState<string | null>(null);

  // Gotrue reports a dead link in the fragment rather than by failing a request, so
  // this is the only place the failure is visible.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = params.get("error_code");
    if (!code) return;
    setLinkError(
      code === "otp_expired"
        ? "That link has expired. Reset links are valid for one hour."
        : "That link is no longer valid. Request a new one.",
    );
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { password: "", confirmation: "" } });

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");

    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setError("root.serverError", { type: "server", message: authErrorMessage(error) });
      return;
    }

    // The recovery session is a full session, so they are already signed in.
    navigate(DEFAULT_SIGNED_IN_PATH, { replace: true });
  });

  if (status === AuthStatus.Loading) {
    return (
      <div className={styles.booting}>
        <div className={styles.bootingMark} aria-label="Checking your link" />
      </div>
    );
  }

  if (linkError !== null || status === AuthStatus.SignedOut) {
    return (
      <AuthLayout
        title="This link has expired"
        subtitle={linkError ?? "Reset links are valid for one hour and can be used once."}
        footer={
          <Link className={styles.link} to="/login">
            Back to sign in
          </Link>
        }
      >
        <Link to="/forgot-password">
          <Button className={styles.submit} variant="primary">
            Request a new link
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="You'll be signed in as soon as it's saved."
      footer={
        <Link className={styles.link} to="/login">
          Back to sign in
        </Link>
      }
    >
      <form className={cx(styles.form, styles.stagger)} onSubmit={onSubmit} noValidate>
        {errors.root?.serverError && <FormBanner message={errors.root.serverError.message ?? ""} />}

        <Field
          label="New password"
          required
          error={errors.password?.message}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        >
          <PasswordInput
            autoComplete="new-password"
            placeholder="••••••••"
            autoFocus
            invalid={Boolean(errors.password)}
            {...register("password", {
              required: "Choose a password.",
              minLength: {
                value: MIN_PASSWORD_LENGTH,
                message: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
              },
            })}
          />
        </Field>

        <Field label="Confirm password" required error={errors.confirmation?.message}>
          <PasswordInput
            autoComplete="new-password"
            placeholder="••••••••"
            invalid={Boolean(errors.confirmation)}
            {...register("confirmation", {
              required: "Type the password again.",
              validate: (value) => value === watch("password") || "Both passwords must match.",
            })}
          />
        </Field>

        <Button className={styles.submit} type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
