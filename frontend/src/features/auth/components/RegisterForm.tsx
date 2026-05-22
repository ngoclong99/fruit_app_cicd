import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/components/ui/Button";
import { Input } from "../../../shared/components/ui/Input";
import { registerSchema, type RegisterInput } from "../../../shared/schemas/auth.schema";

interface RegisterFormProps {
  onSubmit: (data: Omit<RegisterInput, "confirmPassword">) => Promise<void>;
}

export function RegisterForm({ onSubmit }: RegisterFormProps) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", phone: "" },
  });

  const onValidSubmit = async (data: RegisterInput) => {
    setSubmitError(null);
    try {
      // Strip confirmPassword before calling API
      const { confirmPassword: _omit, phone, ...rest } = data;
      await onSubmit({ ...rest, phone: phone && phone !== "" ? phone : undefined });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("auth.registerFailed"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onValidSubmit)} className="space-y-4" noValidate>
      <Input
        label={t("auth.name")}
        type="text"
        autoComplete="name"
        placeholder={t("auth.namePlaceholder")}
        {...register("name")}
        error={errors.name?.message ? t(errors.name.message) : undefined}
      />
      <Input
        label={t("auth.email")}
        type="email"
        autoComplete="email"
        {...register("email")}
        error={errors.email?.message ? t(errors.email.message) : undefined}
      />
      <Input
        label={t("auth.phoneOptional")}
        type="tel"
        autoComplete="tel"
        {...register("phone")}
        error={errors.phone?.message ? t(errors.phone.message) : undefined}
      />
      <Input
        label={t("auth.password")}
        type="password"
        autoComplete="new-password"
        {...register("password")}
        error={errors.password?.message ? t(errors.password.message) : undefined}
      />
      <Input
        label={t("auth.confirmPassword")}
        type="password"
        autoComplete="new-password"
        {...register("confirmPassword")}
        error={errors.confirmPassword?.message ? t(errors.confirmPassword.message) : undefined}
      />

      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
        {isSubmitting ? t("auth.registering") : t("auth.register")}
      </Button>
    </form>
  );
}
