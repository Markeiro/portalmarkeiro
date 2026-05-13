import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({ className, padding = "md", children, ...props }: CardProps) {
  const padMap = { none: "", sm: "p-3", md: "p-5", lg: "p-6" };
  return (
    <div
      className={cn("bg-white rounded-xl border border-cream-medium shadow-sm", padMap[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between mb-4", className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-lg font-bold text-charcoal", className)} {...props}>{children}</h3>;
}
