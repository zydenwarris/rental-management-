import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { Button, Field, FormBanner, cx, ui } from "@app/components/ui/index.js";
import { supabase } from "@app/lib/supabase/client.js";
import { AuthLayout } from "./AuthLayout.js";
import { useAuth } from "./AuthProvider.js";
import { AuthStatus } from "./authStatus.js";
import { PasswordInput } from "./PasswordInput.js";
import { authErrorMessage } from "./messages.js";
import { DEFAULT_SIGNED_IN_PATH, type FromState } from "./routes.js";
import styles from "./auth.module.css";

interface FormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { email: "", password: "" } });

  // Where RequireAuth sent them from, so signing in returns them to the page they
  // actually wanted rather than dumping everyone on the dashboard.
  const intended = (location.state as FromState | null)?.from ?? DEFAULT_SIGNED_IN_PATH;

  if (status === AuthStatus.SignedIn) return <Navigate to={intended} replace />;

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    });

    if (error) {
      setError("root.serverError", { type: "server", message: authErrorMessage(error) });
      return;
    }

    navigate(intended, { replace: true });
  });

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Your properties, leases and rent ledger."
      footer={
        <>
          New here?{" "}
          <Link className={styles.link} to="/signup">
            Create an account
          </Link>
        </>
      }
    >
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

        <Field
          label="Password"
          required
          error={errors.password?.message}
          action={
            <Link className={styles.link} to="/forgot-password">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            autoComplete="current-password"
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
            {...register("password", { required: "Enter your password." })}
          />
        </Field>

        <Button className={styles.submit} type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
