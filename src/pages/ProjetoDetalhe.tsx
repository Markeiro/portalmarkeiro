import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl, dateBR, monthLabel } from "@/lib/format";
import {
  TrendingUp, TrendingDown, Target, ArrowLeft, Pencil, Filter, X, Link2,
  FileText, ExternalLink, Upload, Cpu, CalendarDays, DollarSign,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo", pausado: "Pausado", concluido: "Concluído", cancelado: "Cancelado",
};

export default function ProjetoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const [p, setP] = useState<any>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkedTx, setUnlinkedTx] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contractUploading, setContractUploading] = useState(false);

  const [filterType, setFilterType] = useState("todos");
  const [filterMonth, setFilterMonth] = useState("todos");
  const [filterCC, setFilterCC] = useState("todos");

  const load = async () => {
    if (!id) return;
    const [{ data: pd }, { data: td }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("transactions").select("*, cost_centers(id, name)").eq("project_id", id).order("date", { ascending: false }),
    ]);
    setP(pd); setTx(td || []);
  };

  const loadUnlinked = async () => {
    const { data } = await supabase.from("transactions")
      .select("*, cost_centers(name), bank_accounts(name)")
      .is("project_id", null)
      .order("date", { ascending: false });
    setUnlinkedTx(data || []);
  };

  useEffect(() => { load(); }, [id]);

  const openContract = async () => {
    if (!p?.contract_url) return;
    const { data } = await supabase.storage.from("contracts").createSignedUrl(p.contract_url, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Contrato não encontrado");
  };

  const uploadContract = async (file: File) => {
    if (!id) return;
    setContractUploading(true);
    const path = `${id}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("contracts").upload(path, file);
    if (upErr) { toast.error("Erro no upload: " + upErr.message); setContractUploading(false); return; }
    const { error } = await supabase.from("projects").update({ contract_url: path }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Contrato enviado"); load(); }
    setContractUploading(false);
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("projects").update({
      name: f.get("name") as string,
      client: f.get("client") as string || null,
      status: f.get("status") as string,
      monthly_revenue_brl: parseFloat(f.get("mrr") as string) || null,
      budget_brl: parseFloat(f.get("budget") as string) || null,
      total_contract_value_brl: parseFloat(f.get("contract_value") as string) || null,
      start_date: f.get("start") as string || null,
      end_date: f.get("end") as string || null,
      entry_date: f.get("entry_date") as string || null,
      tokens_used_usd: parseFloat(f.get("tokens") as string) || 0,
      notes: f.get("notes") as string || null,
    }).eq("id", id!);
    if (error) { toast.error(error.message); return; }

    const contractFile = f.get("contract") as File;
    if (contractFile && contractFile.size > 0) {
      await uploadContract(contractFile);
    } else {
      toast.success("Projeto atualizado");
    }
    setEditOpen(false);
    load();
  };

  const handleLinkTx = async () => {
    if (selectedIds.size === 0) return;
    const { error } = await supabase.from("transactions")
      .update({ project_id: id })
      .in("id", Array.from(selectedIds));
    if (error) toast.error(error.message);
    else {
      toast.success(`${selectedIds.size} lançamento(s) vinculado(s)`);
      setSelectedIds(new Set());
      setLinkOpen(false);
      load();
    }
  };

  const toggleId = (txId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(txId) ? next.delete(txId) : next.add(txId);
      return next;
    });
  };

  const availableMonths = useMemo(() => {
    const set = new Set(tx.map(t => t.date.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [tx]);

  const usedCCs = useMemo(() => {
    const map = new Map<string, string>();
    tx.forEach(t => { if (t.cost_centers) map.set(t.cost_centers.id, t.cost_centers.name); });
    return Array.from(map.entries());
  }, [tx]);

  const filtered = useMemo(() => tx.filter(t => {
    if (filterType !== "todos" && t.type !== filterType) return false;
    if (filterMonth !== "todos" && !t.date.startsWith(filterMonth)) return false;
    if (filterCC !== "todos" && t.cost_centers?.id !== filterCC) return false;
    return true;
  }), [tx, filterType, filterMonth, filterCC]);

  const hasFilters = filterType !== "todos" || filterMonth !== "todos" || filterCC !== "todos";
  const clearFilters = () => { setFilterType("todos"); setFilterMonth("todos"); setFilterCC("todos"); };

  // Monthly chart data
  const monthlyArr = useMemo(() => {
    const m: Record<string, { mes: string; receita: number; custo: number; margem: number }> = {};
    tx.forEach(t => {
      const k = t.date.substring(0, 7);
      if (!m[k]) m[k] = { mes: monthLabel(t.date + "T00:00:00"), receita: 0, custo: 0, margem: 0 };
      if (t.type === "entrada") m[k].receita += Number(t.amount_brl);
      else m[k].custo += Number(t.amount_brl);
    });
    return Object.entries(m).sort().map(([, v]) => ({ ...v, margem: v.receita - v.custo }));
  }, [tx]);

  if (!p) return <div className="text-muted-foreground p-6">Carregando...</div>;

  const receita = tx.filter(t => t.type === "entrada").reduce((s, t) => s + Number(t.amount_brl), 0);
  const custo = tx.filter(t => t.type === "saida").reduce((s, t) => s + Number(t.amount_brl), 0);
  const margem = receita - custo;
  const marginPct = receita > 0 ? (margem / receita * 100) : 0;

  const monthsWithActivity = monthlyArr.length || 1;
  const avgMonthlyRevenue = receita / monthsWithActivity;
  const avgMonthlyCost = custo / monthsWithActivity;

  return (
    <div className="space-y-6">
      <Link to="/projetos">
        <Button variant="ghost" size="sm" className="-ml-3"><ArrowLeft className="h-4 w-4 mr-1" /> Projetos</Button>
      </Link>

      <PageHeader
        title={p.name}
        description={`Cliente: ${p.client || "—"} • Status: ${STATUS_LABELS[p.status] || p.status}${p.entry_date ? ` • Entrada: ${dateBR(p.entry_date)}` : ""}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            {p.hub_project_id && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/hub/projetos/${p.hub_project_id}`)}>
                <ExternalLink className="h-4 w-4 mr-1" /> Ver no Hub
              </Button>
            )}
            {canWrite && (
              <>
                {p.contract_url && (
                  <Button variant="outline" size="sm" onClick={openContract}>
                    <FileText className="h-4 w-4 mr-1" /> Ver contrato
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { loadUnlinked(); setLinkOpen(true); }}>
                  <Link2 className="h-4 w-4 mr-1" /> Vincular
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* KPIs principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Receita Total" value={brl(receita)} icon={TrendingUp} accent="success" />
        <KpiCard label="Custo Total" value={brl(custo)} icon={TrendingDown} accent="destructive" />
        <KpiCard label="Margem" value={`${brl(margem)} (${marginPct.toFixed(0)}%)`} icon={Target}
          accent={margem >= 0 ? "success" : "destructive"} />
        {p.tokens_used_usd > 0
          ? <KpiCard label="Tokens (USD)" value={`US$ ${Number(p.tokens_used_usd).toFixed(2)}`} icon={Cpu} accent="primary" />
          : <KpiCard label="Médias/mês" value={brl(avgMonthlyRevenue)} icon={CalendarDays} accent="primary" />
        }
      </div>

      {/* Médias mensais e info do contrato */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-surface border-border/50 col-span-1">
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Médias Mensais</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receita média/mês</span>
              <span className="font-semibold text-success tabular-nums">{brl(avgMonthlyRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo médio/mês</span>
              <span className="font-semibold text-destructive tabular-nums">{brl(avgMonthlyCost)}</span>
            </div>
            <div className="flex justify-between border-t border-border/30 pt-2">
              <span className="text-muted-foreground">Margem média/mês</span>
              <span className={`font-bold tabular-nums ${avgMonthlyRevenue - avgMonthlyCost >= 0 ? "text-success" : "text-destructive"}`}>
                {brl(avgMonthlyRevenue - avgMonthlyCost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Meses ativos</span>
              <span className="font-semibold">{monthsWithActivity}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-surface border-border/50 col-span-1">
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Contrato & MRR</h3>
          <div className="space-y-2 text-sm">
            {p.total_contract_value_brl && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor total contrato</span>
                <span className="font-semibold tabular-nums">{brl(p.total_contract_value_brl)}</span>
              </div>
            )}
            {p.monthly_revenue_brl && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">MRR</span>
                <span className="font-semibold text-success tabular-nums">{brl(p.monthly_revenue_brl)}</span>
              </div>
            )}
            {p.budget_brl && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Orçamento</span>
                <span className="font-semibold tabular-nums">{brl(p.budget_brl)}</span>
              </div>
            )}
            {p.start_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Início contrato</span>
                <span className="font-semibold">{dateBR(p.start_date)}</span>
              </div>
            )}
            {p.end_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fim contrato</span>
                <span className="font-semibold">{dateBR(p.end_date)}</span>
              </div>
            )}
            {!p.total_contract_value_brl && !p.monthly_revenue_brl && !p.budget_brl && (
              <p className="text-muted-foreground text-xs">Sem dados de contrato. Edite o projeto para adicionar.</p>
            )}
          </div>
        </Card>

        <Card className="p-4 bg-gradient-surface border-border/50 col-span-1">
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">IA & Contrato</h3>
          <div className="space-y-3">
            {p.tokens_used_usd > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tokens gastos (USD)</p>
                <p className="text-lg font-bold text-primary tabular-nums">US$ {Number(p.tokens_used_usd).toFixed(2)}</p>
              </div>
            )}
            {p.contract_url ? (
              <Button variant="outline" size="sm" className="w-full" onClick={openContract}>
                <ExternalLink className="h-4 w-4 mr-2" /> Abrir contrato PDF
              </Button>
            ) : canWrite ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Nenhum contrato anexado</p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadContract(f); }}
                    disabled={contractUploading}
                  />
                  <Button variant="outline" size="sm" className="w-full" disabled={contractUploading} asChild>
                    <span><Upload className="h-4 w-4 mr-2" />{contractUploading ? "Enviando..." : "Anexar contrato"}</span>
                  </Button>
                </label>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum contrato</p>
            )}
            {p.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{p.notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Gráfico de evolução */}
      {monthlyArr.length > 0 && (
        <Card className="p-5 bg-gradient-surface border-border/50">
          <h3 className="font-display text-lg mb-4">Evolução Mensal — Receita, Custo e Margem</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyArr}>
              <defs>
                <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(150,75%,47%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(150,75%,47%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCusto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0,70%,55%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(0,70%,55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Area dataKey="receita" name="Receita" stroke="hsl(150,75%,47%)" fill="url(#gReceita)" strokeWidth={2} />
              <Area dataKey="custo" name="Custo" stroke="hsl(0,70%,55%)" fill="url(#gCusto)" strokeWidth={2} />
              <Area dataKey="margem" name="Margem" stroke="hsl(210,75%,60%)" fill="none" strokeWidth={2} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Filtros */}
      <Card className="p-4 bg-gradient-surface border-border/50">
        <div className="flex flex-wrap items-end gap-3">
          <Filter className="h-4 w-4 text-muted-foreground mb-2" />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mês</Label>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {availableMonths.map(m => (
                  <SelectItem key={m} value={m}>{monthLabel(m + "-01T00:00:00")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {usedCCs.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
              <Select value={filterCC} onValueChange={setFilterCC}>
                <SelectTrigger className="w-48 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {usedCCs.map(([ccId, name]) => (
                    <SelectItem key={ccId} value={ccId}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-muted-foreground">
              <X className="h-3.5 w-3.5 mr-1" /> Limpar
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto mb-2">{filtered.length} lançamento{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </Card>

      <Card className="bg-gradient-surface border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-xs">{dateBR(t.date)}</TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.cost_centers?.name || "—"}</TableCell>
                <TableCell>
                  <Badge variant={t.type === "entrada" ? "default" : "destructive"} className="text-xs">
                    {t.type === "entrada" ? "Entrada" : "Saída"}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right tabular-nums font-semibold ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                  {t.type === "entrada" ? "+" : "-"} {brl(Number(t.amount_brl))}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {tx.length === 0 ? 'Nenhum lançamento vinculado. Use "Vincular" para associar.' : "Nenhum resultado com os filtros aplicados."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog vincular */}
      <Dialog open={linkOpen} onOpenChange={v => { setLinkOpen(v); if (!v) setSelectedIds(new Set()); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Vincular lançamentos ao projeto</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Selecione os lançamentos que pertencem a este projeto.</p>
          <div className="max-h-96 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Centro</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unlinkedTx.map(t => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => toggleId(t.id)}>
                    <TableCell><Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleId(t.id)} /></TableCell>
                    <TableCell className="text-xs">{dateBR(t.date)}</TableCell>
                    <TableCell className="text-sm">{t.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.cost_centers?.name || "—"}</TableCell>
                    <TableCell className={`text-right tabular-nums text-sm font-semibold ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                      {t.type === "entrada" ? "+" : "-"} {brl(Number(t.amount_brl))}
                    </TableCell>
                  </TableRow>
                ))}
                {unlinkedTx.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      Todos os lançamentos já estão vinculados a projetos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selecionado(s)</span>
            <Button onClick={handleLinkTx} disabled={selectedIds.size === 0} className="bg-gradient-brand text-primary-foreground">
              Vincular selecionados
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog editar projeto */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Projeto</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input name="name" required defaultValue={p.name} /></div>
            <div className="space-y-2"><Label>Cliente</Label><Input name="client" defaultValue={p.client} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data entrada do cliente</Label>
                <Input type="date" name="entry_date" defaultValue={p.entry_date} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={p.status || "ativo"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>MRR (R$)</Label><Input type="number" step="0.01" name="mrr" defaultValue={p.monthly_revenue_brl} /></div>
              <div className="space-y-2"><Label>Valor total contrato (R$)</Label><Input type="number" step="0.01" name="contract_value" defaultValue={p.total_contract_value_brl} /></div>
            </div>
            <div className="space-y-2"><Label>Orçamento (R$)</Label><Input type="number" step="0.01" name="budget" defaultValue={p.budget_brl} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Início contrato</Label><Input type="date" name="start" defaultValue={p.start_date} /></div>
              <div className="space-y-2"><Label>Fim contrato</Label><Input type="date" name="end" defaultValue={p.end_date} /></div>
            </div>
            <div className="space-y-2">
              <Label>Tokens gastos (USD)</Label>
              <Input type="number" step="0.01" name="tokens" defaultValue={p.tokens_used_usd || 0} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Contrato PDF {p.contract_url ? "— envie novo para substituir" : ""}</Label>
              <Input type="file" name="contract" accept="application/pdf,.pdf" />
              {p.contract_url && (
                <Button type="button" size="sm" variant="outline" onClick={openContract} className="w-full mt-1">
                  <ExternalLink className="h-4 w-4 mr-2" /> Ver contrato atual
                </Button>
              )}
            </div>
            <div className="space-y-2"><Label>Observações</Label><Input name="notes" defaultValue={p.notes} /></div>
            <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground" disabled={contractUploading}>
              {contractUploading ? "Enviando contrato..." : "Salvar alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
