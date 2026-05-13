import { cn } from "@/lib/utils";

export default function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="w-8 h-8 border-3 border-cream-medium border-t-brand rounded-full animate-spin" />
    </div>
  );
}

export function PageSpinner() {
  return <Spinner className="h-64" />;
}
