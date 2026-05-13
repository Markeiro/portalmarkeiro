import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const btn = cva(
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none",
  {
    variants: {
      variant: {
        primary:   "bg-brand text-white hover:bg-brand-light focus:ring-brand shadow-sm",
        copper:    "bg-copper text-white hover:bg-copper-light focus:ring-copper shadow-sm",
        outline:   "border border-brand text-brand hover:bg-brand hover:text-white focus:ring-brand",
        ghost:     "text-charcoal hover:bg-cream focus:ring-brand",
        danger:    "bg-danger text-white hover:bg-red-600 focus:ring-red-500 shadow-sm",
        secondary: "bg-cream-medium text-charcoal hover:bg-cream focus:ring-brand",
      },
      size: {
        xs: "text-xs px-2.5 py-1",
        sm: "text-sm px-3 py-1.5",
        md: "text-sm px-4 py-2",
        lg: "text-base px-5 py-2.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof btn> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(btn({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
export default Button;
