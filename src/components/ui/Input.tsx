import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={inputId} className="text-sm font-medium text-charcoal-mid">{label}</label>}
        <div className="relative">
          {leftIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-lg border border-cream-medium bg-white px-3 py-2 text-sm text-charcoal placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors",
              leftIcon && "pl-9",
              error && "border-danger focus:ring-danger/40",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
export default Input;
