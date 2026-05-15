import { ReactNode } from "react";

export const PageHeader = ({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 pb-4 border-b border-border/50">
    <div className="min-w-0">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight truncate">{title}</h1>
      {description && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
  </div>
);
