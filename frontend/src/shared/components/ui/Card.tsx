import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
}

const variantClasses = {
  default: "bg-white border border-gray-200",
  elevated: "bg-white shadow-md",
  outlined: "bg-transparent border border-gray-300",
} as const;

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", padding = "md", className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg", variantClasses[variant], paddingClasses[padding], className)}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = "Card";

export const CardHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("mb-3 pb-3 border-b border-gray-200", className)}>{children}</div>
);

export const CardTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h3 className={cn("text-lg font-semibold text-gray-900", className)}>{children}</h3>
);

export const CardBody = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn(className)}>{children}</div>
);

export const CardFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("mt-3 pt-3 border-t border-gray-200", className)}>{children}</div>
);
