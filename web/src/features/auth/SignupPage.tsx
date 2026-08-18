import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router";
import { Button, Field, FormBanner, cx, ui } from "@app/components/ui/index.js";
import { supabase } from "@app/lib/supabase/client.js";
import { AuthLayout } from "./AuthLayout.js";
import { useAuth } from "./AuthProvider.js";
import { AuthStatus } from "./authStatus.js";
import { PasswordInput } from "./PasswordInput.js";
import { authErrorMessage } from "./messages.js";
import { DEFAULT_SIGNED_IN_PATH, MIN_PASSWORD_LENGTH } from "./routes.js";
import styles from "./auth.module.css";

interface FormValues {
  displayName: string;
  email: string;
  password: string;
}

export function SignupPage() {
  const { status } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { displayName: "", email: "", password: "" } });

  if (status === AuthStatus.SignedIn) return <Navigate to={DEFAULT_SIGNED_IN_PATH} replace />;

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");

    // display_name rides along in user_metadata, which lands in the access token —
    // that is how the API fills in the landlords row without a second round trip.
    const { data, error } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: { data: { display_name: values.displayName.trim() } },
    });

    if (error) {
      setError("root.serverError", { type: "server", message: authErrorMessage(error) });
      return;
    }

    // No session means the project requires email confirmation. Signing them in
    // regardless would be a lie, so say what actually has to happen next.
    if (!data.session) {
      setError("root.serverError", {
        type: "server",
        message: "Check your inbox for a confirmation link, then sign in.",
      });
      return;
    }

    navigate(DEFAULT_SIGNED_IN_PATH, { replace: true });
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="One account holds your whole portfolio. Nobody else can see it."
      footer={
        <>
          Already have an account?{" "}
          <Link className={styles.link} to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form className={cx(styles.form, styles.stagger)} onSubmit={onSubmit} noValidate>
        {errors.root?.serverError && <FormBanner message={errors.root.serverError.message ?? ""} />}

        <Field label="Your name" required error={errors.displayName?.message}>
          <input
            className={cx(ui.input, errors.displayName && ui.inputInvalid)}
            autoComplete="name"
            placeholder="Asha Ramkissoon"
            autoFocus
            {...register("displayName", { required: "What should we call you?" })}
          />
        </Field>

        <Field label="Email" required error={errors.email?.message}>
          <input
            className={cx(ui.input, errors.email && ui.inputInvalid)}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email", { required: "Enter your email address." })}
          />
        </Field>

        <Field
          label="Password"
          required
          error={errors.password?.message}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        >
          <PasswordInput
            autoComplete="new-password"
            placeholder="••••••••"
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

        <Button className={styles.submit} type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
