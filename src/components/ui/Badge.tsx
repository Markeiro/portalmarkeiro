import { cn } from "@/lib/utils";

type Variant = "default" | "brand" | "copper" | "success" | "warning" | "danger" | "info" | "muted";

const styles: Record<Variant, string> = {
  default:  "bg-cream-medium text-charcoal-mid",
  brand:    "bg-brand/10 text-brand-dark",
  copper:   "bg-copper/10 text-copper-dark",
  success:  "bg-green-100 text-green-800",
  warning:  "bg-amber-100 text-amber-800",
  danger:   "bg-red-100 text-red-700",
  info:     "bg-blue-100 text-blue-800",
  muted:    "bg-cream text-muted",
};

export default function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[variant], className)}>
      {children}
    </span>
  );
}
