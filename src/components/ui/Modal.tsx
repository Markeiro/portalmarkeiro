import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };

export default function Modal({ open, onClose, title, description, children, size = "md" }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full bg-white rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 p-6",
            sizes[size]
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              {title && <Dialog.Title className="font-display text-xl font-bold text-charcoal">{title}</Dialog.Title>}
              {description && <Dialog.Description className="text-sm text-muted mt-0.5">{description}</Dialog.Description>}
            </div>
            <button onClick={onClose} className="text-muted hover:text-charcoal transition-colors ml-4 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
