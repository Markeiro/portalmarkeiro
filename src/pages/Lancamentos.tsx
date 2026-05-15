import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Filter, Paperclip, Pencil, X, Download, Sparkles } from "lucide-react";
import { brl, dateBR } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { TransferDialog } from "@/components/TransferDialog";
import { Checkbox } from "@/components/ui/checkbox";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PAYMENT_METHODS = ["Boleto","Pix","Cartão Crédito Inter","Cartão Débito USD C6","Pró-Labore","DAS / Imposto","Contabilidade","Terceirizados","Transferência","Outros"];

const GEMINI_API_KEY = "AIzaSyA2RYCAxLZXHMOuxP3a2VW1B14Mt9WKF4w";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export default function Lancamentos() {
  const { canWrite } = useAuth();
  const [tx, setTx] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [ccs, setCcs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editTx, setEditTx] = useState<any | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filter, setFilter] = useState({ bank: "", cc: "", type: "", dateFrom: "", dateTo: "" });

  const load = async () => {
    const { data } = await supabase.from("transactions")
      .select("*, bank_accounts(name,color), cost_centers(name), projects(name)")
      .order("date", { ascending: false });
    setTx(data || []);
  };

  useEffect(() => {
    (async () => {
      const [b, c, p] = await Promise.all([
        supabase.from("bank_accounts").select("*").eq("active", true),
        supabase.from("cost_centers").select("*").eq("active", true),
        supabase.from("projects").select("*"),
      ]);
      setBanks(b.data || []); setCcs(c.data || []); setProjects(p.data || []);
      await load();
    })();
  }, []);

  // Meses disponíveis nos dados
  const availableYears = useMemo(() => {
    const years = new Set(tx.map(t => parseInt(t.date?.substring(0, 4))));
    return Array.from(years).sort().reverse();
  }, [tx]);

  const filtered = useMemo(() => tx.filter(t => {
    if (selectedMonth !== null) {
      const m = parseInt(t.date?.substring(5, 7)) - 1;
      const y = parseInt(t.date?.substring(0, 4));
      if (m !== selectedMonth || y !== selectedYear) return false;
    }
    if (filter.bank && t.bank_account_id !== filter.bank) return false;
    if (filter.cc && t.cost_center_id !== filter.cc) return false;
    if (filter.type && t.type !== filter.type) return false;
    if (filter.dateFrom && t.date < filter.dateFrom) return false;
    if (filter.dateTo && t.date > filter.dateTo) return false;
    return true;
  }), [tx, selectedMonth, selectedYear, filter]);

  // Somas por centro de custo
  const ccSums = useMemo(() => {
    const map: Record<string, { name: string; entrada: number; saida: number }> = {};
    filtered.forEach(t => {
      const id = t.cost_center_id || "__sem__";
      const name = t.cost_centers?.name || "Sem centro";
      if (!map[id]) map[id] = { name, entrada: 0, saida: 0 };
      if (t.type === "entrada") map[id].entrada += Number(t.amount_brl);
      else if (t.type === "saida") map[id].saida += Number(t.amount_brl);
    });
    return Object.entries(map).map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (b.entrada + b.saida) - (a.entrada + a.saida));
  }, [filtered]);

  const totalEntrada = filtered.filter(t => t.type === "entrada").reduce((s, t) => s + Number(t.amount_brl), 0);
  const totalSaida = filtered.filter(t => t.type === "saida").reduce((s, t) => s + Number(t.amount_brl), 0);

  const hasExtraFilters = filter.bank || filter.cc || filter.type || filter.dateFrom || filter.dateTo;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const currency = f.get("currency") as string;
    const original = parseFloat(f.get("amount") as string);
    const fxRate = currency === "USD" ? parseFloat(f.get("fx_rate") as string || "5.3") : null;
    const amountBrl = currency === "USD" ? original * (fxRate || 5.3) : original;

    let attachmentUrl: string | null = null;
    const file = f.get("attachment") as File | null;
    if (file && file.size > 0) {
      const path = `${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, file);
      if (upErr) { toast.error("Falha no upload: " + upErr.message); return; }
      attachmentUrl = path;
    }

    const { error } = await supabase.from("transactions").insert({
      date: f.get("date") as string,
      description: f.get("description") as string,
      type: f.get("type") as any,
      status: (f.get("status") as any) || "pago",
      amount_brl: amountBrl,
      amount_original: currency === "USD" ? original : null,
      currency: currency as any,
      fx_rate: fxRate,
      bank_account_id: (f.get("bank") as string) || null,
      cost_center_id: (f.get("cc") as string) || null,
      project_id: (f.get("project") as string) || null,
      payment_method: f.get("payment_method") as string || null,
      notes: f.get("notes") as string || null,
      attachment_url: attachmentUrl,
      source: "manual",
    });
    if (error) toast.error(error.message);
    else { toast.success("Lançamento criado"); setOpen(false); load(); }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const currency = f.get("currency") as string;
    const original = parseFloat(f.get("amount") as string);
    const fxRate = currency === "USD" ? parseFloat(f.get("fx_rate") as string || "5.3") : null;
    const amountBrl = currency === "USD" ? original * (fxRate || 5.3) : original;
    const { error } = await supabase.from("transactions").update({
      date: f.get("date") as string,
      description: f.get("description") as string,
      type: f.get("type") as any,
      status: (f.get("status") as any) || "pago",
      amount_brl: amountBrl,
      amount_original: currency === "USD" ? original : null,
      currency: currency as any,
      fx_rate: fxRate,
      bank_account_id: (f.get("bank") as string) || null,
      cost_center_id: (f.get("cc") as string) || null,
      project_id: (f.get("project") as string) || null,
      payment_method: f.get("payment_method") as string || null,
      notes: f.get("notes") as string || null,
    }).eq("id", editTx.id);
    if (error) toast.error(error.message);
    else { toast.success("Lançamento atualizado"); setEditTx(null); load(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído"); load(); }
  };

  const openAttachment = async (path: string) => {
    const { data } = await supabase.storage.from("attachments").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Anexo não encontrado");
  };

  const handleExportCsv = () => {
    const periodLabel = selectedMonth !== null
      ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`
      : "todos";
    const filename = `Lancamentos_${periodLabel}.csv`;

    const header = ["Data", "Descrição", "Tipo", "Centro de Custo", "Banco", "Projeto", "Forma Pgto", "Valor BRL", "Moeda", "Observação"];
    const rows = filtered.map(t => [
      t.date || "",
      t.description || "",
      t.type || "",
      t.cost_centers?.name || "",
      t.bank_accounts?.name || "",
      t.projects?.name || "",
      t.payment_method || "",
      String(Number(t.amount_brl).toFixed(2)).replace(".", ","),
      t.currency || "BRL",
      t.notes || "",
    ]);

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csvContent = [header, ...rows]
      .map(row => row.map(escape).join(";"))
      .join("\r\n");

    // BOM prefix for Excel compatibility
    const bom = "﻿";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado: ${filename}`);
  };

  const TxForm = ({ item, onSubmit, label }: { item?: any; onSubmit: any; label: string }) => {
    const [aiLoading, setAiLoading] = useState(false);
    const [selectedCc, setSelectedCc] = useState<string>(item?.cost_center_id || "");
    const [description, setDescription] = useState<string>(item?.description || "");

    const handleAiSuggest = async () => {
      if (description.length < 5) return;
      setAiLoading(true);
      try {
        const ccNames = ccs.map(c => c.name).join(", ");
        const prompt = `Given this financial transaction description: "${description}"\nAnd these available cost centers: ${ccNames}\nWhich cost center best fits? Reply with ONLY the exact cost center name from the list, nothing else.`;

        const response = await fetch(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${GEMINI_API_KEY}` },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          throw new Error(err);
        }

        const data = await response.json();
        const suggested = data.choices?.[0]?.message?.content?.trim() || "";
        const match = ccs.find(c => c.name.toLowerCase() === suggested.toLowerCase());

        if (match) {
          setSelectedCc(match.id);
          toast.success(`Centro de custo sugerido: ${match.name}`);
        } else {
          toast.error(`IA sugeriu "${suggested}", mas não foi encontrado na lista.`);
        }
      } catch (err: any) {
        toast.error("Erro ao consultar IA: " + (err.message || "desconhecido"));
      } finally {
        setAiLoading(false);
      }
    };

    return (
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Data</Label><Input type="date" name="date" required defaultValue={item?.date || new Date().toISOString().substring(0, 10)} /></div>
        <div className="space-y-2"><Label>Tipo</Label>
          <Select name="type" required defaultValue={item?.type || "saida"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
              <SelectItem value="transferencia">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Descrição</Label>
          <div className="flex gap-2 items-center">
            <Input
              name="description"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={description.length < 5 || aiLoading}
              onClick={handleAiSuggest}
              title="Sugerir Centro de Custo via IA"
              className="shrink-0 gap-1.5"
            >
              {aiLoading
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <Sparkles className="h-4 w-4" />}
              Sugerir CC via IA
            </Button>
          </div>
        </div>
        <div className="space-y-2"><Label>Moeda</Label>
          <Select name="currency" defaultValue={item?.currency || "BRL"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" name="amount" required defaultValue={item?.amount_original || item?.amount_brl} /></div>
        <div className="space-y-2"><Label>Câmbio (se USD)</Label><Input type="number" step="0.0001" name="fx_rate" placeholder="5.30" defaultValue={item?.fx_rate} /></div>
        <div className="space-y-2"><Label>Status</Label>
          <Select name="status" defaultValue={item?.status || "pago"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="previsto">Previsto</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Banco</Label>
          <Select name="bank" defaultValue={item?.bank_account_id || ""}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Centro de Custo</Label>
          <Select name="cc" value={selectedCc} onValueChange={setSelectedCc}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{ccs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Projeto</Label>
          <Select name="project" defaultValue={item?.project_id || ""}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Forma de Pagamento</Label>
          <Select name="payment_method" defaultValue={item?.payment_method || ""}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {!item && <div className="space-y-2 col-span-2"><Label>Anexo (NF, comprovante)</Label><Input type="file" name="attachment" accept="image/*,application/pdf" /></div>}
        <div className="col-span-2 space-y-2"><Label>Observação</Label><Textarea name="notes" rows={2} defaultValue={item?.notes} /></div>
        <Button type="submit" className="col-span-2 bg-gradient-brand text-primary-foreground">{label}</Button>
      </form>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Lançamentos" description="Receitas e despesas registradas"
        actions={canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <TransferDialog banks={banks} onDone={load} />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-brand text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
                <TxForm onSubmit={handleSubmit} label="Salvar" />
              </DialogContent>
            </Dialog>
          </div>
        )}
      />

      {/* Seletor de Ano + Chips de Mês */}
      <Card className="p-4 bg-gradient-surface border-border/50">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-medium text-muted-foreground">Ano:</span>
          <div className="flex gap-1">
            {(availableYears.length ? availableYears : [new Date().getFullYear()]).map(y => (
              <button key={y}
                className={`month-chip ${selectedYear === y && selectedMonth !== null ? "active" : ""}`}
                onClick={() => setSelectedYear(y)}
              >{y}</button>
            ))}
          </div>
          {selectedMonth !== null && (
            <button className="ml-auto text-xs text-muted-foreground flex items-center gap-1 hover:text-destructive"
              onClick={() => setSelectedMonth(null)}>
              <X className="h-3 w-3" /> Limpar mês
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {MONTHS.map((m, i) => (
            <button key={m}
              className={`month-chip ${selectedMonth === i ? "active" : ""}`}
              onClick={() => setSelectedMonth(selectedMonth === i ? null : i)}
            >{m}</button>
          ))}
        </div>
      </Card>

      {/* Filtros adicionais */}
      <Card className="p-4 bg-gradient-surface border-border/50">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-muted-foreground"><Filter className="h-4 w-4" /><span className="text-sm">Filtros:</span></div>
          <div className="space-y-1"><Label className="text-xs">Tipo</Label>
            <Select value={filter.type || "all"} onValueChange={v => setFilter({ ...filter, type: v === "all" ? "" : v })}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Banco</Label>
            <Select value={filter.bank || "all"} onValueChange={v => setFilter({ ...filter, bank: v === "all" ? "" : v })}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Centro de Custo</Label>
            <Select value={filter.cc || "all"} onValueChange={v => setFilter({ ...filter, cc: v === "all" ? "" : v })}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{ccs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {hasExtraFilters && (
            <Button variant="ghost" size="sm" onClick={() => setFilter({ bank: "", cc: "", type: "", dateFrom: "", dateTo: "" })}>Limpar</Button>
          )}
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="text-success font-semibold">+{brl(totalEntrada)}</span>
            <span className="text-destructive font-semibold">-{brl(totalSaida)}</span>
            <span className="text-muted-foreground">{filtered.length} lançamentos</span>
          </div>
        </div>
      </Card>

      {/* Somas por Centro de Custo */}
      {ccSums.length > 0 && (
        <Card className="p-4 bg-gradient-surface border-border/50">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Soma por Centro de Custo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {ccSums.map(cc => (
              <div key={cc.id} className="rounded-lg border border-border/50 bg-card p-3">
                <p className="text-xs text-muted-foreground truncate mb-1">{cc.name}</p>
                {cc.entrada > 0 && <p className="text-xs text-success tabular-nums font-semibold">+{brl(cc.entrada)}</p>}
                {cc.saida > 0 && <p className="text-xs text-destructive tabular-nums font-semibold">-{brl(cc.saida)}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tabela de lançamentos */}
      <Card className="bg-gradient-surface border-border/50 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Centro</TableHead>
              <TableHead>Banco</TableHead><TableHead>Pgto</TableHead><TableHead>Projeto</TableHead>
              <TableHead className="text-right">Valor</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-xs whitespace-nowrap">{dateBR(t.date)}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {t.type === "entrada"
                      ? <ArrowDownCircle className="h-4 w-4 text-success shrink-0" />
                      : <ArrowUpCircle className="h-4 w-4 text-destructive shrink-0" />}
                    <span className="truncate max-w-[180px]">{t.description}</span>
                    {t.currency === "USD" && <Badge variant="outline" className="text-[10px] shrink-0">USD {Number(t.amount_original).toFixed(2)}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.cost_centers?.name || "—"}</TableCell>
                <TableCell className="text-xs">{t.bank_accounts?.name || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.payment_method || "—"}</TableCell>
                <TableCell className="text-xs">{t.projects?.name || "—"}</TableCell>
                <TableCell className={`text-right tabular-nums font-semibold ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                  {t.type === "entrada" ? "+" : "-"} {brl(Number(t.amount_brl))}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {t.attachment_url && (
                      <Button variant="ghost" size="icon" onClick={() => openAttachment(t.attachment_url)} title="Ver anexo">
                        <Paperclip className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {canWrite && <Button variant="ghost" size="icon" onClick={() => setEditTx(t)}><Pencil className="h-4 w-4" /></Button>}
                    {canWrite && <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sem lançamentos{selectedMonth !== null ? ` em ${MONTHS[selectedMonth]}/${selectedYear}` : ""}.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog editar */}
      <Dialog open={!!editTx} onOpenChange={v => !v && setEditTx(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar Lançamento</DialogTitle></DialogHeader>
          {editTx && <TxForm item={editTx} onSubmit={handleEdit} label="Salvar alterações" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
