import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-sm",
  secondary: "bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900",
  danger: "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
  outline: "bg-transparent border border-gray-300 hover:bg-gray-50 text-gray-700",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

const Spinner = ({ size }: { size: Size }) => {
  const dim = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <svg className={cn("animate-spin", dim)} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path
        fill="currentColor"
        className="opacity-75"
        d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4zm2 5.3A8 8 0 014 12H0c0 3 1.1 5.8 3 7.9l3-2.6z"
      />
    </svg>
  );
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {isLoading ? <Spinner size={size} /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  ),
);
Button.displayName = "Button";
