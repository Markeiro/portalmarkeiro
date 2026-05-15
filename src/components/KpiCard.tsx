import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LucideIcon, TrendingDown, TrendingUp, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const KpiCard = ({
  label, value, delta, icon: Icon, accent = "primary", tooltip,
}: {
  label: string;
  value: string;
  delta?: { value: number; label?: string };
  icon: LucideIcon;
  accent?: "primary" | "success" | "destructive" | "warning";
  tooltip?: string;
}) => {
  const accentClass = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    destructive: "text-destructive bg-destructive/10",
    warning: "text-warning bg-warning/10",
  }[accent];

  return (
    <Card className="p-4 sm:p-5 bg-gradient-surface border-border/50 shadow-card hover:shadow-elegant transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-xl sm:text-2xl font-display font-semibold tabular-nums break-all">{value}</p>
          {delta !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs", delta.value >= 0 ? "text-success" : "text-destructive")}>
              {delta.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta.value).toFixed(1)}% {delta.label}
            </div>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl shrink-0 ml-2", accentClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
};
