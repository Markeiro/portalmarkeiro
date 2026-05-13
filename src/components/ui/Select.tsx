import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option { value: string; label: string; }

interface SelectProps {
  value?: string;
  onValueChange?: (v: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export default function Select({ value, onValueChange, options, placeholder = "Selecione...", label, className, disabled }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-charcoal-mid">{label}</label>}
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger
          className={cn(
            "inline-flex items-center justify-between w-full rounded-lg border border-cream-medium bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors disabled:opacity-50",
            className
          )}
        >
          <RadixSelect.Value placeholder={<span className="text-muted-fg">{placeholder}</span>} />
          <RadixSelect.Icon><ChevronDown className="w-4 h-4 text-muted" /></RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content className="z-50 bg-white rounded-xl border border-cream-medium shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
            <RadixSelect.Viewport className="p-1 max-h-56">
              {options.map((opt) => (
                <RadixSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className="relative flex items-center px-8 py-2 text-sm text-charcoal rounded-lg hover:bg-cream cursor-pointer outline-none data-[highlighted]:bg-cream"
                >
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute left-2">
                    <Check className="w-4 h-4 text-brand" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
