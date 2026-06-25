import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { changePasswordSchema, type ChangePasswordInput } from "@/shared/schemas/auth.schema";
import { authApi } from "@/api/endpoints/auth";

/**
 * Form đổi mật khẩu (react-hook-form + zod). Endpoint /auth/change-password
 * được axios interceptor loại trừ khỏi alert toàn cục → lỗi hiển thị inline tại đây
 * (vd "Mật khẩu hiện tại không đúng" khi BE trả 401).
 */
export function ChangePasswordForm() {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setSubmitError(null);
    setSuccess(false);
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("auth.changePasswordFailed"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        label={t("auth.currentPassword")}
        type="password"
        autoComplete="current-password"
        {...register("currentPassword")}
        error={errors.currentPassword?.message ? t(errors.currentPassword.message) : undefined}
      />
      <Input
        label={t("auth.newPassword")}
        type="password"
        autoComplete="new-password"
        {...register("newPassword")}
        error={errors.newPassword?.message ? t(errors.newPassword.message) : undefined}
      />
      <Input
        label={t("auth.confirmNewPassword")}
        type="password"
        autoComplete="new-password"
        {...register("confirmNewPassword")}
        error={errors.confirmNewPassword?.message ? t(errors.confirmNewPassword.message) : undefined}
      />

      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {t("auth.changePasswordSuccess")}
        </div>
      )}

      <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
        {isSubmitting ? t("auth.changingPassword") : t("auth.changePassword")}
      </Button>
    </form>
  );
}
