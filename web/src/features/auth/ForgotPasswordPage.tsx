import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { Button, Field, FormBanner, cx, ui } from "@app/components/ui/index.js";
import { CheckIcon } from "@app/components/layout/icons.js";
import { supabase } from "@app/lib/supabase/client.js";
import { AuthLayout } from "./AuthLayout.js";
import { authErrorMessage } from "./messages.js";
import { RESET_REDIRECT_PATH } from "./recovery.js";
import styles from "./auth.module.css";

interface FormValues {
  email: string;
}

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    const email = values.email.trim();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${RESET_REDIRECT_PATH}`,
    });

    // Two failures are about the address itself, not about who holds an account, so
    // reporting them leaks nothing and saves the user waiting for an email that was
    // never going to arrive. Everything else is reported as success on purpose — see
    // the note on the confirmation state.
    if (error && (error.status === 429 || error.code === "email_address_invalid")) {
      setError("email", { type: "server", message: authErrorMessage(error) });
      return;
    }

    setSentTo(email);
  });

  if (sentTo !== null) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="If that address has an account, a reset link is on its way."
        footer={
          <Link className={styles.link} to="/login">
            Back to sign in
          </Link>
        }
      >
        <div className={styles.sent}>
          <span className={styles.sentMark} aria-hidden="true">
            <CheckIcon />
          </span>
          <p className={styles.sentAddress}>{sentTo}</p>
          <p className={styles.sentNote}>
            The link is valid for one hour and can be used once. If nothing arrives, check
            your spam folder before requesting another.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email you signed up with and we'll send a link to set a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link className={styles.link} to="/login">
            Back to sign in
          </Link>
        </>
      }
    >
      {/*
        The confirmation above is shown whether or not the address has an account.
        Reporting "no account with that email" would turn this form into a way of
        discovering who has one, which is the standard way password-reset flows leak
        their user list.
      */}
      <form className={cx(styles.form, styles.stagger)} onSubmit={onSubmit} noValidate>
        {errors.root?.serverError && <FormBanner message={errors.root.serverError.message ?? ""} />}

        <Field label="Email" required error={errors.email?.message}>
          <input
            className={cx(ui.input, errors.email && ui.inputInvalid)}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            autoFocus
            {...register("email", { required: "Enter your email address." })}
          />
        </Field>

        <Button className={styles.submit} type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
