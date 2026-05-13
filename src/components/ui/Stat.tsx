import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: number;
  className?: string;
}

export default function Stat({ label, value, sub, icon: Icon, iconColor = "text-brand", trend, className }: StatProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-cream-medium p-5 flex items-start gap-4", className)}>
      {Icon && (
        <div className="p-2.5 rounded-lg bg-cream shrink-0">
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-display font-bold text-charcoal mt-0.5 leading-none">{value}</p>
        {(sub || trend !== undefined) && (
          <div className="flex items-center gap-2 mt-1">
            {trend !== undefined && (
              <span className={cn("text-xs font-medium", trend >= 0 ? "text-success" : "text-danger")}>
                {trend >= 0 ? "+" : ""}{trend}%
              </span>
            )}
            {sub && <span className="text-xs text-muted">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
