import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/components/ui/Button";
import { Input } from "../../../shared/components/ui/Input";
import { loginSchema, type LoginInput } from "../../../shared/schemas/auth.schema";

/**
 * Reusable LoginForm using react-hook-form + zod + i18n.
 * — Type-safe: `onSubmit` receives `LoginInput` with proper types.
 * — Validation: zod schema returns i18n keys, dịch tại render time.
 * — Loading/disabled states: managed by react-hook-form `isSubmitting`.
 */
interface LoginFormProps {
  onSubmit: (data: LoginInput) => Promise<void>;
  defaultValues?: Partial<LoginInput>;
  showForgotPassword?: boolean;
  onForgotPassword?: () => void;
}

export function LoginForm({ onSubmit, defaultValues, showForgotPassword, onForgotPassword }: LoginFormProps) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: defaultValues?.email ?? "", password: defaultValues?.password ?? "" },
  });

  const onValidSubmit = async (data: LoginInput) => {
    setSubmitError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("auth.loginFailed"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onValidSubmit)} className="space-y-4" noValidate>
      <Input
        label={t("auth.email")}
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        {...register("email")}
        error={errors.email?.message ? t(errors.email.message) : undefined}
      />

      <Input
        label={t("auth.password")}
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder="••••••"
        {...register("password")}
        error={errors.password?.message ? t(errors.password.message) : undefined}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-gray-500 hover:text-gray-700"
            aria-label={t(showPassword ? "auth.hidePassword" : "auth.showPassword")}
          >
            {showPassword ? "👁" : "👁‍🗨"}
          </button>
        }
      />

      {showForgotPassword && (
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-green-600 hover:text-green-700 hover:underline"
        >
          {t("auth.forgotPassword")}
        </button>
      )}

      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
        {isSubmitting ? t("auth.loggingIn") : t("auth.login")}
      </Button>
    </form>
  );
}
