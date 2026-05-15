import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Target, TrendingDown, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/format";

const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const groups = [
  { v: "receita_bruta",         l: "Receita Bruta" },
  { v: "outras_receitas",       l: "Outras Receitas" },
  { v: "deducoes",              l: "Impostos/Deduções" },
  { v: "custos",                l: "Custos" },
  { v: "despesas_operacionais", l: "Desp. Operacionais" },
  { v: "despesas_pessoal",      l: "Desp. Pessoal" },
  { v: "despesas_admin",        l: "Desp. Administrativas" },
  { v: "despesas_financeiras",  l: "Desp. Financeiras" },
  { v: "outras_despesas",       l: "Outras Despesas" },
];

const CCForm = ({ cc, onSubmit, label }: { cc?: any; onSubmit: any; label: string }) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="space-y-2"><Label>Nome</Label><Input name="name" required defaultValue={cc?.name} /></div>
    <div className="space-y-2"><Label>Tipo</Label>
      <Select name="type" required defaultValue={cc?.type}>
        <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="receita">Receita</SelectItem>
          <SelectItem value="imposto">Imposto</SelectItem>
          <SelectItem value="custo">Custo</SelectItem>
          <SelectItem value="despesa">Despesa</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2"><Label>Grupo DRE</Label>
      <Select name="group" required defaultValue={cc?.dre_group}>
        <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
        <SelectContent>{groups.map(g => <SelectItem key={g.v} value={g.v}>{g.l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label>Orçamento Mensal (R$) <span className="text-muted-foreground font-normal">— opcional</span></Label>
      <Input type="number" step="0.01" name="budget_monthly" defaultValue={cc?.budget_monthly ?? ""} placeholder="Ex: 2000.00" />
      <p className="text-xs text-muted-foreground">Usado para comparativo Orçado vs Realizado.</p>
    </div>
    <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground">{label}</Button>
  </form>
);

export default function CentrosCusto() {
  const { canWrite } = useAuth();
  const [ccs, setCcs] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [editCC, setEditCC] = useState<any | null>(null);
  const [budgetMonth, setBudgetMonth] = useState(new Date().getMonth());
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [showBudget, setShowBudget] = useState(true);

  const load = async () => {
    const [{ data: ccData }, { data: txData }] = await Promise.all([
      supabase.from("cost_centers").select("*").order("dre_group").order("name"),
      supabase.from("transactions").select("date,amount_brl,type,cost_center_id").neq("status", "cancelado"),
    ]);
    setCcs(ccData || []);
    setTx(txData || []);
  };
  useEffect(() => { load(); }, []);

  // Budget vs Actual for selected month
  const budgetData = useMemo(() => {
    const monthKey = `${budgetYear}-${String(budgetMonth + 1).padStart(2, "0")}`;
    const monthTx = tx.filter(t => t.date?.startsWith(monthKey));

    return ccs
      .filter(c => c.budget_monthly != null && c.budget_monthly > 0)
      .map(c => {
        const actual = monthTx
          .filter(t => t.cost_center_id === c.id && t.type === "saida")
          .reduce((s, t) => s + Number(t.amount_brl), 0);
        const budget = Number(c.budget_monthly);
        const variance = budget - actual;
        const pct = budget > 0 ? (actual / budget) * 100 : 0;
        return { ...c, actual, budget, variance, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [ccs, tx, budgetMonth, budgetYear]);

  // Total budget summary
  const totalBudget = budgetData.reduce((s, c) => s + c.budget, 0);
  const totalActual = budgetData.reduce((s, c) => s + c.actual, 0);
  const totalVariance = totalBudget - totalActual;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const budget = parseFloat(f.get("budget_monthly") as string);
    const { error } = await supabase.from("cost_centers").insert({
      name: f.get("name") as string,
      type: f.get("type") as any,
      dre_group: f.get("group") as any,
      budget_monthly: isNaN(budget) ? null : budget,
    });
    if (error) toast.error(error.message);
    else { toast.success("Criado"); setOpenCreate(false); load(); }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const budget = parseFloat(f.get("budget_monthly") as string);
    const { error } = await supabase.from("cost_centers").update({
      name: f.get("name") as string,
      type: f.get("type") as any,
      dre_group: f.get("group") as any,
      budget_monthly: isNaN(budget) ? null : budget,
    }).eq("id", editCC.id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizado"); setEditCC(null); load(); }
  };

  const del = async (id: string) => {
    if (!confirm("Excluir?")) return;
    const { error } = await supabase.from("cost_centers").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Centros de Custo" description="Estrutura DRE + orçamento mensal vs realizado"
        actions={canWrite && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-brand text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Novo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Centro de Custo</DialogTitle></DialogHeader>
              <CCForm onSubmit={handleCreate} label="Criar" />
            </DialogContent>
          </Dialog>
        )} />

      {/* ── Orçado vs Realizado ───────────────────────────────── */}
      <Card className="p-5 bg-gradient-surface border-border/50">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg">Orçado vs Realizado</h3>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(budgetYear)} onValueChange={v => setBudgetYear(parseInt(v))}>
              <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1 flex-wrap">
              {MONTHS_PT.map((m, i) => (
                <button key={m} onClick={() => setBudgetMonth(i)}
                  className={`month-chip ${budgetMonth === i ? "active" : ""}`}>
                  {m}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowBudget(v => !v)}>
              {showBudget ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {showBudget && (
          <>
            {budgetData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum centro de custo com orçamento configurado. Edite um CC e defina o "Orçamento Mensal".
              </p>
            ) : (
              <>
                {/* Totais */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-muted/40 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total orçado</p>
                    <p className="font-bold tabular-nums text-sm">{brl(totalBudget)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total realizado</p>
                    <p className={`font-bold tabular-nums text-sm ${totalActual > totalBudget ? "text-destructive" : ""}`}>{brl(totalActual)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className={`font-bold tabular-nums text-sm ${totalVariance >= 0 ? "text-success" : "text-destructive"}`}>
                      {totalVariance >= 0 ? "+" : ""}{brl(totalVariance)}
                    </p>
                  </div>
                </div>

                {/* Por CC */}
                <div className="space-y-3">
                  {budgetData.map(c => {
                    const over = c.pct > 100;
                    const barWidth = Math.min(c.pct, 100);
                    return (
                      <div key={c.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium truncate max-w-[200px]">{c.name}</span>
                          <div className="flex items-center gap-3 text-xs shrink-0 ml-2">
                            <span className="text-muted-foreground">{brl(c.actual)} / {brl(c.budget)}</span>
                            <span className={`font-semibold ${over ? "text-destructive" : "text-success"}`}>
                              {c.pct.toFixed(0)}%
                            </span>
                            {c.variance >= 0
                              ? <TrendingDown className="h-3.5 w-3.5 text-success" />
                              : <TrendingUp className="h-3.5 w-3.5 text-destructive" />}
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${over ? "bg-destructive" : c.pct > 80 ? "bg-warning" : "bg-success"}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        {over && (
                          <p className="text-xs text-destructive mt-0.5">
                            Acima do orçamento em {brl(Math.abs(c.variance))}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </Card>

      {/* ── Tabela de CCs ────────────────────────────────────── */}
      <Card className="bg-gradient-surface border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Grupo DRE</TableHead>
              <TableHead className="text-right">Orçamento/mês</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ccs.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{groups.find(g => g.v === c.dre_group)?.l || c.dre_group}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {c.budget_monthly ? <span className="text-primary font-semibold">{brl(Number(c.budget_monthly))}</span> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {canWrite && <>
                      <Button variant="ghost" size="icon" onClick={() => setEditCC(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!ccs.length && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum centro de custo.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editCC} onOpenChange={v => !v && setEditCC(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Centro de Custo</DialogTitle></DialogHeader>
          {editCC && <CCForm cc={editCC} onSubmit={handleEdit} label="Salvar alterações" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
