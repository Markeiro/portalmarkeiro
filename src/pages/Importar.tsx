import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, dateBR } from "@/lib/format";

export default function Importar() {
  const { canWrite, user } = useAuth();
  const [imports, setImports] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [activeImport, setActiveImport] = useState<string>("");
  const [banks, setBanks] = useState<any[]>([]);
  const [ccs, setCcs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [imp, b, c] = await Promise.all([
      supabase.from("imports").select("*").order("created_at", { ascending: false }),
      supabase.from("bank_accounts").select("*").eq("active", true),
      supabase.from("cost_centers").select("*").eq("active", true),
    ]);
    setImports(imp.data || []); setBanks(b.data || []); setCcs(c.data || []);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!activeImport) return setItems([]);
    supabase.from("import_items").select("*").eq("import_id", activeImport).order("date").then(({ data }) => setItems(data || []));
  }, [activeImport]);

  const onUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const file = (f.get("file") as File);
    const bankId = f.get("bank") as string;
    if (!file || !file.name) return toast.error("Selecione um arquivo");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const path = `${user?.id}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("imports").upload(path, file);
      if (up.error) throw up.error;
      const { data: imp, error: ie } = await supabase.from("imports").insert({
        file_name: file.name, file_url: path, file_type: ext,
        bank_account_id: bankId || null, status: "processando",
        created_by: user?.id,
      }).select().single();
      if (ie) throw ie;
      // call edge function
      const { error: fe } = await supabase.functions.invoke("parse-statement", {
        body: { import_id: imp.id, file_path: path, file_type: ext, bank_account_id: bankId },
      });
      if (fe) throw fe;
      toast.success("Importação processada — revise os itens abaixo");
      setActiveImport(imp.id);
      load();
    } catch (e: any) { toast.error(e.message || "Falhou"); }
    setBusy(false);
  };

  const approveItem = async (item: any, ccId: string) => {
    const { data: imp } = await supabase.from("imports").select("bank_account_id").eq("id", item.import_id).single();
    const { data: tx, error } = await supabase.from("transactions").insert({
      date: item.date, description: item.description, type: item.type, status: "pago",
      amount_brl: Number(item.amount), currency: item.currency,
      bank_account_id: imp?.bank_account_id || null,
      cost_center_id: ccId || item.suggested_cost_center_id,
      source: "import",
    }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("import_items").update({ approved: true, transaction_id: tx.id }).eq("id", item.id);
    setItems(items.map(i => i.id === item.id ? { ...i, approved: true, transaction_id: tx.id } : i));
    toast.success("Aprovado");
  };

  const rejectItem = async (id: string) => {
    await supabase.from("import_items").update({ rejected: true }).eq("id", id);
    setItems(items.map(i => i.id === id ? { ...i, rejected: true } : i));
  };

  const approveAll = async () => {
    const pending = items.filter(i => !i.approved && !i.rejected && i.suggested_cost_center_id);
    if (!pending.length) return toast.error("Nenhum item pendente com centro sugerido");
    if (!confirm(`Aprovar ${pending.length} itens em lote?`)) return;
    for (const it of pending) await approveItem(it, it.suggested_cost_center_id);
    toast.success(`${pending.length} itens aprovados`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Importar Extratos & Faturas" description="Upload de PDF, CSV ou OFX — IA extrai e categoriza" />

      {canWrite && (
        <Card className="p-5 bg-gradient-surface border-border/50">
          <form onSubmit={onUpload} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-2"><Label>Arquivo (PDF, CSV, OFX)</Label><Input type="file" name="file" accept=".pdf,.csv,.ofx" required /></div>
            <div className="space-y-2"><Label>Banco</Label>
              <Select name="bank">
                <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={busy} className="bg-gradient-brand text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Processar com IA
            </Button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-surface border-border/50">
          <h3 className="font-display text-lg mb-3">Histórico</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {imports.map(i => (
              <button key={i.id} onClick={() => setActiveImport(i.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${activeImport === i.id ? "border-primary bg-primary/10" : "border-border/40 hover:border-primary/40"}`}>
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium truncate">{i.file_name}</span></div>
                <div className="flex justify-between text-xs mt-1"><span className="text-muted-foreground">{dateBR(i.created_at)}</span><Badge variant="outline">{i.status}</Badge></div>
              </button>
            ))}
            {!imports.length && <p className="text-center text-muted-foreground text-sm py-6">Nenhuma importação.</p>}
          </div>
        </Card>

        <Card className="p-4 bg-gradient-surface border-border/50 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg">Itens extraídos {items.length > 0 && <Badge>{items.length}</Badge>}</h3>
            {activeImport && canWrite && items.some(i => !i.approved && !i.rejected) && (
              <Button size="sm" onClick={approveAll} className="bg-gradient-brand text-primary-foreground">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar todos
              </Button>
            )}
          </div>
          {!activeImport && <p className="text-muted-foreground text-sm py-6 text-center">Selecione uma importação.</p>}
          {activeImport && (
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Centro sugerido</TableHead><TableHead className="text-right">Valor</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map(it => (
                  <TableRow key={it.id} className={it.approved ? "opacity-60" : it.rejected ? "opacity-30" : ""}>
                    <TableCell className="text-xs">{dateBR(it.date)}</TableCell>
                    <TableCell className="text-sm">{it.description}</TableCell>
                    <TableCell>
                      <Select disabled={it.approved || it.rejected} defaultValue={it.suggested_cost_center_id || undefined}
                        onValueChange={(v) => supabase.from("import_items").update({ suggested_cost_center_id: v }).eq("id", it.id)}>
                        <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{ccs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${it.type === "entrada" ? "text-success" : "text-destructive"}`}>
                      {it.type === "entrada" ? "+" : "-"} {brl(Number(it.amount))}
                    </TableCell>
                    <TableCell>
                      {!it.approved && !it.rejected && canWrite && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => approveItem(it, it.suggested_cost_center_id)}><CheckCircle2 className="h-4 w-4 text-success" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => rejectItem(it.id)}><XCircle className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      )}
                      {it.approved && <Badge className="bg-success/20 text-success">Aprovado</Badge>}
                      {it.rejected && <Badge variant="destructive">Rejeitado</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
                {!items.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum item.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
