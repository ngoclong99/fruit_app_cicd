import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../../shared/components/ui/Button";
import { Input } from "../../../shared/components/ui/Input";
import { registerSchema, type RegisterInput } from "../../../shared/schemas/auth.schema";

interface RegisterFormProps {
  onSubmit: (data: Omit<RegisterInput, "confirmPassword">) => Promise<void>;
}

export function RegisterForm({ onSubmit }: RegisterFormProps) {
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
      setSubmitError(err instanceof Error ? err.message : "Đăng ký thất bại");
    }
  };

  return (
    <form onSubmit={handleSubmit(onValidSubmit)} className="space-y-4" noValidate>
      <Input label="Tên" type="text" autoComplete="name" {...register("name")} error={errors.name?.message} />
      <Input label="Email" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
      <Input
        label="Số điện thoại (tuỳ chọn)"
        type="tel"
        autoComplete="tel"
        {...register("phone")}
        error={errors.phone?.message}
      />
      <Input
        label="Mật khẩu"
        type="password"
        autoComplete="new-password"
        {...register("password")}
        error={errors.password?.message}
      />
      <Input
        label="Xác nhận mật khẩu"
        type="password"
        autoComplete="new-password"
        {...register("confirmPassword")}
        error={errors.confirmPassword?.message}
      />

      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
        Đăng ký
      </Button>
    </form>
  );
}
