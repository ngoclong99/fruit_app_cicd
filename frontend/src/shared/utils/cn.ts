import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classNames safely: later classes override earlier ones,
 * conflicts (e.g. `px-2` vs `px-4`) are resolved by twMerge.
 *
 * Usage:
 *   <div className={cn("px-2 py-1", isLarge && "px-4 py-2", className)} />
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
