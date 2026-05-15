import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/KpiCard";
import { brl, dateBR } from "@/lib/format";
import { CheckCircle2, AlertCircle, Clock, ArrowDownCircle, ArrowUpCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Contas() {
  const { canWrite } = useAuth();
  const [tx, setTx] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [ccs, setCcs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [editTx, setEditTx] = useState<any | null>(null);

  const load = async () => {
    const [{ data: td }, { data: bd }, { data: cd }, { data: pd }] = await Promise.all([
      supabase.from("transactions").select("*, bank_accounts(name), cost_centers(name), projects(name)").eq("status", "previsto").order("date"),
      supabase.from("bank_accounts").select("*").eq("active", true),
      supabase.from("cost_centers").select("*").eq("active", true),
      supabase.from("projects").select("*"),
    ]);
    setTx(td || []); setBanks(bd || []); setCcs(cd || []); setProjects(pd || []);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().substring(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10);

  const receber = tx.filter(t => t.type === "entrada");
  const pagar = tx.filter(t => t.type === "saida");
  const totRec = receber.reduce((s, t) => s + Number(t.amount_brl), 0);
  const totPag = pagar.reduce((s, t) => s + Number(t.amount_brl), 0);
  const vencidos = tx.filter(t => t.date < today).length;
  const proximos = tx.filter(t => t.date >= today && t.date <= in7).length;

  const baixar = async (id: string) => {
    const { error } = await supabase.from("transactions").update({ status: "pago" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Baixado"); load(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este lançamento previsto?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const valor = parseFloat(f.get("valor") as string);
    const { error } = await supabase.from("transactions").insert({
      date: f.get("vencimento") as string,
      description: f.get("descricao") as string,
      type: f.get("tipo") as any,
      status: "previsto",
      amount_brl: valor,
      amount_original: valor,
      currency: "BRL",
      bank_account_id: (f.get("banco") as string) || null,
      cost_center_id: (f.get("cc") as string) || null,
      project_id: (f.get("projeto") as string) || null,
      notes: f.get("obs") as string || null,
      source: "manual",
    });
    if (error) toast.error(error.message);
    else { toast.success("Lançamento previsto criado"); setOpenCreate(false); load(); }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const valor = parseFloat(f.get("valor") as string);
    const { error } = await supabase.from("transactions").update({
      date: f.get("vencimento") as string,
      description: f.get("descricao") as string,
      type: f.get("tipo") as any,
      amount_brl: valor,
      amount_original: valor,
      bank_account_id: (f.get("banco") as string) || null,
      cost_center_id: (f.get("cc") as string) || null,
      project_id: (f.get("projeto") as string) || null,
      notes: f.get("obs") as string || null,
    }).eq("id", editTx.id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizado"); setEditTx(null); load(); }
  };

  const ContaForm = ({ item, onSubmit, label }: { item?: any; onSubmit: any; label: string }) => (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Tipo</Label>
          <Select name="tipo" required defaultValue={item?.type || "saida"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">A Receber</SelectItem>
              <SelectItem value="saida">A Pagar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Vencimento</Label>
          <Input type="date" name="vencimento" required defaultValue={item?.date || new Date().toISOString().substring(0, 10)} />
        </div>
      </div>
      <div className="space-y-2"><Label>Descrição</Label><Input name="descricao" required defaultValue={item?.description} /></div>
      <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" name="valor" required defaultValue={item?.amount_brl} /></div>
      <div className="space-y-2"><Label>Banco</Label>
        <Select name="banco" defaultValue={item?.bank_account_id || ""}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Centro de Custo</Label>
        <Select name="cc" defaultValue={item?.cost_center_id || ""}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{ccs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Projeto</Label>
        <Select name="projeto" defaultValue={item?.project_id || ""}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Observação</Label><Input name="obs" defaultValue={item?.notes} /></div>
      <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground">{label}</Button>
    </form>
  );

  const statusItem = (date: string) => {
    if (date < today) return { label: "Vencido", color: "destructive" as const, icon: AlertCircle };
    if (date <= in7) return { label: "Próximo", color: "warning" as const, icon: Clock };
    return { label: "Futuro", color: "outline" as const, icon: Clock };
  };

  const renderTable = (rows: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vencimento</TableHead><TableHead>Status</TableHead>
          <TableHead>Descrição</TableHead><TableHead>Centro</TableHead>
          <TableHead>Banco</TableHead><TableHead className="text-right">Valor</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(t => {
          const s = statusItem(t.date);
          const Ic = s.icon;
          return (
            <TableRow key={t.id}>
              <TableCell className="text-xs whitespace-nowrap">{dateBR(t.date)}</TableCell>
              <TableCell><Badge variant={s.color === "destructive" ? "destructive" : "outline"} className="gap-1"><Ic className="h-3 w-3" />{s.label}</Badge></TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {t.type === "entrada" ? <ArrowDownCircle className="h-4 w-4 text-success" /> : <ArrowUpCircle className="h-4 w-4 text-destructive" />}
                  {t.description}
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{t.cost_centers?.name || "—"}</TableCell>
              <TableCell className="text-xs">{t.bank_accounts?.name || "—"}</TableCell>
              <TableCell className={`text-right tabular-nums font-semibold ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                {brl(Number(t.amount_brl))}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end">
                  {canWrite && <Button size="sm" variant="outline" onClick={() => baixar(t.id)}><CheckCircle2 className="h-4 w-4 mr-1" />Baixar</Button>}
                  {canWrite && <Button size="icon" variant="ghost" onClick={() => setEditTx(t)}><Pencil className="h-4 w-4" /></Button>}
                  {canWrite && <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {!rows.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum lançamento previsto.</TableCell></TableRow>}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Contas a Pagar/Receber" description="Lançamentos com status previsto"
        actions={canWrite && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-brand text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Nova conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova conta a pagar/receber</DialogTitle></DialogHeader>
              <ContaForm onSubmit={handleCreate} label="Criar" />
            </DialogContent>
          </Dialog>
        )}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="A Receber" value={brl(totRec)} icon={ArrowDownCircle} accent="success" />
        <KpiCard label="A Pagar" value={brl(totPag)} icon={ArrowUpCircle} accent="destructive" />
        <KpiCard label="Vencidos" value={String(vencidos)} icon={AlertCircle} accent={vencidos > 0 ? "destructive" : "primary"} />
        <KpiCard label="Próx. 7 dias" value={String(proximos)} icon={Clock} accent="warning" />
      </div>
      <Card className="p-5 bg-gradient-surface border-border/50 overflow-x-auto">
        <Tabs defaultValue="todos">
          <TabsList>
            <TabsTrigger value="todos">Todos ({tx.length})</TabsTrigger>
            <TabsTrigger value="receber">A Receber ({receber.length})</TabsTrigger>
            <TabsTrigger value="pagar">A Pagar ({pagar.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="todos" className="mt-4">{renderTable(tx)}</TabsContent>
          <TabsContent value="receber" className="mt-4">{renderTable(receber)}</TabsContent>
          <TabsContent value="pagar" className="mt-4">{renderTable(pagar)}</TabsContent>
        </Tabs>
      </Card>

      <Dialog open={!!editTx} onOpenChange={v => !v && setEditTx(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar conta</DialogTitle></DialogHeader>
          {editTx && <ContaForm item={editTx} onSubmit={handleEdit} label="Salvar alterações" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
