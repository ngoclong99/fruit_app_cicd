import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../../shared/components/ui/Button";
import { Input } from "../../../shared/components/ui/Input";
import { loginSchema, type LoginInput } from "../../../shared/schemas/auth.schema";

/**
 * Reusable LoginForm using react-hook-form + zod.
 * — Type-safe: `onSubmit` receives `LoginInput` with proper types.
 * — Validation: client-side via zod schema (must mirror backend).
 * — Loading/disabled states: managed by react-hook-form `isSubmitting`.
 *
 * Drop-in usage:
 *   <LoginForm onSubmit={async (data) => { await authApi.login(data); }} />
 */
interface LoginFormProps {
  onSubmit: (data: LoginInput) => Promise<void>;
  defaultValues?: Partial<LoginInput>;
  showForgotPassword?: boolean;
  onForgotPassword?: () => void;
}

export function LoginForm({ onSubmit, defaultValues, showForgotPassword, onForgotPassword }: LoginFormProps) {
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
      setSubmitError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    }
  };

  return (
    <form onSubmit={handleSubmit(onValidSubmit)} className="space-y-4" noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        {...register("email")}
        error={errors.email?.message}
      />

      <Input
        label="Mật khẩu"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder="••••••"
        {...register("password")}
        error={errors.password?.message}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
          Quên mật khẩu?
        </button>
      )}

      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
        Đăng nhập
      </Button>
    </form>
  );
}
