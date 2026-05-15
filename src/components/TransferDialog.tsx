import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

export function TransferDialog({ banks, onDone }: { banks: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const fromId = f.get("from") as string;
    const toId = f.get("to") as string;
    if (fromId === toId) return toast.error("Selecione contas diferentes");
    const amount = parseFloat(f.get("amount") as string);
    const date = f.get("date") as string;
    const desc = (f.get("desc") as string) || "Transferência";
    const fromBank = banks.find(b => b.id === fromId);
    const toBank = banks.find(b => b.id === toId);

    const pairId = crypto.randomUUID();
    const { error } = await supabase.from("transactions").insert([
      { date, description: `${desc} → ${toBank?.name}`, type: "transferencia", status: "pago", amount_brl: amount, bank_account_id: fromId, transfer_pair_id: pairId, source: "transfer" },
      { date, description: `${desc} ← ${fromBank?.name}`, type: "transferencia", status: "pago", amount_brl: amount, bank_account_id: toId, transfer_pair_id: pairId, source: "transfer" },
    ]);
    if (error) toast.error(error.message); else { toast.success("Transferência registrada"); setOpen(false); onDone(); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><ArrowLeftRight className="h-4 w-4 mr-1" />Transferir</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Transferência entre contas</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2"><Label>Data</Label><Input type="date" name="date" required defaultValue={new Date().toISOString().substring(0, 10)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>De</Label>
              <Select name="from" required><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Para</Label>
              <Select name="to" required><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Valor (BRL)</Label><Input type="number" step="0.01" name="amount" required /></div>
          <div className="space-y-2"><Label>Descrição</Label><Input name="desc" placeholder="Ex.: aporte para câmbio" /></div>
          <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground">Registrar transferência</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
