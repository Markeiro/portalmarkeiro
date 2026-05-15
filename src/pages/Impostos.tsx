import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/KpiCard";
import { brl, dateBR } from "@/lib/format";
import { Plus, Pencil, Trash2, Receipt, Settings2, Info, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const TAX_TYPES = [
  "DAS (Simples Nacional)",
  "DARF - IRPJ",
  "DARF - CSLL",
  "ISS",
  "INSS",
  "FGTS",
  "Outros",
];

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function Impostos() {
  const { canWrite } = useAuth();
  const [taxes, setTaxes] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [taxConfig, setTaxConfig] = useState<any>(null);
  const [editConfig, setEditConfig] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [editTax, setEditTax] = useState<any | null>(null);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [configDraft, setConfigDraft] = useState<any>({});

  const load = async () => {
    const [{ data: td }, { data: bd }, { data: cfg }] = await Promise.all([
      supabase.from("transactions")
        .select("*, bank_accounts(name), cost_centers(name, dre_group)")
        .eq("type", "saida")
        .gte("date", `${yearFilter}-01-01`)
        .lte("date", `${yearFilter}-12-31`)
        .order("date", { ascending: false }),
      supabase.from("bank_accounts").select("*").eq("active", true),
      supabase.from("tax_config").select("*").limit(1).maybeSingle(),
    ]);
    const taxTx = (td || []).filter((t: any) =>
      t.cost_centers?.dre_group === "deducoes" ||
      (t.description || "").toLowerCase().includes("imposto") ||
      (t.description || "").toLowerCase().includes("das") ||
      (t.description || "").toLowerCase().includes("darf")
    );
    setTaxes(taxTx);
    setBanks(bd || []);
    if (cfg) { setTaxConfig(cfg); setConfigDraft(cfg); }
  };

  useEffect(() => { load(); }, [yearFilter]);

  const saveConfig = async () => {
    if (!taxConfig) return;
    const { error } = await supabase.from("tax_config").update({
      regime: configDraft.regime,
      anexo: configDraft.anexo,
      aliquota_percent: parseFloat(configDraft.aliquota_percent),
      fator_r_active: configDraft.fator_r_active,
      fator_r_threshold_percent: parseFloat(configDraft.fator_r_threshold_percent || 28),
      prolabore_monthly_brl: parseFloat(configDraft.prolabore_monthly_brl || 1621),
      cnae_principal: configDraft.cnae_principal,
      cnae_descricao: configDraft.cnae_descricao,
      das_due_day: parseInt(configDraft.das_due_day || 20),
      notes: configDraft.notes,
      updated_at: new Date().toISOString(),
    }).eq("id", taxConfig.id);
    if (error) toast.error(error.message);
    else { toast.success("Configuração fiscal salva"); setEditConfig(false); load(); }
  };

  const totalYear = taxes.reduce((s, t) => s + Number(t.amount_brl), 0);
  const totalMonth = taxes
    .filter(t => t.date?.startsWith(new Date().toISOString().substring(0, 7)))
    .reduce((s, t) => s + Number(t.amount_brl), 0);

  const byMonth: Record<string, number> = {};
  taxes.forEach(t => {
    const m = t.date?.substring(0, 7);
    if (m) byMonth[m] = (byMonth[m] || 0) + Number(t.amount_brl);
  });

  // Cálculo Fator R
  const calcFatorR = () => {
    if (!taxConfig) return null;
    const prolabore12 = (taxConfig.prolabore_monthly_brl || 1621) * 12;
    const fat12 = taxes.reduce((s, t) => s + Number(t.amount_brl), 0) * (12 / Math.max(taxes.length, 1));
    if (fat12 === 0) return null;
    return (prolabore12 / fat12) * 100;
  };
  const fatorR = calcFatorR();

  const loadAllCcs = async () => {
    const { data } = await supabase.from("cost_centers").select("*").eq("active", true);
    return data || [];
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const valor = parseFloat(f.get("valor") as string);
    const allCcs = await loadAllCcs();
    const taxCC = allCcs.find((c: any) => c.dre_group === "deducoes");
    if (!taxCC) {
      toast.error("Configure um Centro de Custo com grupo DRE 'Impostos e Deduções' primeiro.");
      return;
    }
    const tipo = f.get("tipo") as string;
    const ref = f.get("referencia") as string;
    const { error } = await supabase.from("transactions").insert({
      date: f.get("data") as string,
      description: tipo + (ref ? ` — ${ref}` : ""),
      type: "saida",
      status: "pago",
      amount_brl: valor,
      amount_original: valor,
      currency: "BRL",
      bank_account_id: (f.get("banco") as string) || null,
      cost_center_id: taxCC.id,
      notes: f.get("obs") as string || null,
      source: "manual",
    });
    if (error) toast.error(error.message);
    else { toast.success("Imposto registrado"); setOpenCreate(false); load(); }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const valor = parseFloat(f.get("valor") as string);
    const tipo = f.get("tipo") as string;
    const ref = f.get("referencia") as string;
    const { error } = await supabase.from("transactions").update({
      date: f.get("data") as string,
      description: tipo + (ref ? ` — ${ref}` : ""),
      amount_brl: valor,
      amount_original: valor,
      bank_account_id: (f.get("banco") as string) || null,
      notes: f.get("obs") as string || null,
    }).eq("id", editTax.id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizado"); setEditTax(null); load(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este lançamento de imposto?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído"); load(); }
  };

  const TaxForm = ({ item, onSubmit, label }: { item?: any; onSubmit: any; label: string }) => {
    const descParts = item?.description?.split(" — ") || [];
    const defaultTipo = TAX_TYPES.includes(descParts[0]) ? descParts[0] : "DAS (Simples Nacional)";
    const defaultRef = descParts.slice(1).join(" — ") || "";
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Tipo</Label>
            <Select name="tipo" required defaultValue={defaultTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TAX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Data Pagamento</Label>
            <Input type="date" name="data" required defaultValue={item?.date || new Date().toISOString().substring(0, 10)} />
          </div>
        </div>
        <div className="space-y-2"><Label>Referência (ex: Jan/2026, PA 01/2026)</Label>
          <Input name="referencia" placeholder="Jan/2026" defaultValue={defaultRef} />
        </div>
        <div className="space-y-2"><Label>Valor (R$)</Label>
          <Input type="number" step="0.01" name="valor" required defaultValue={item?.amount_brl} />
        </div>
        <div className="space-y-2"><Label>Banco debitado</Label>
          <Select name="banco" defaultValue={item?.bank_account_id || ""}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Observação / Código de barras</Label>
          <Input name="obs" defaultValue={item?.notes} />
        </div>
        <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground">{label}</Button>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Impostos" description="Controle tributário — Simples Nacional com Fator R"
        actions={
          <div className="flex gap-2 items-center">
            <Select value={String(yearFilter)} onValueChange={v => setYearFilter(parseInt(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            {canWrite && (
              <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-brand text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Novo imposto</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar imposto pago</DialogTitle></DialogHeader>
                  <TaxForm onSubmit={handleCreate} label="Registrar" />
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      {/* Configuração Fiscal */}
      {taxConfig && (
        <Card className="p-5 bg-gradient-surface border-border/50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" /> Configuração Fiscal
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Regime tributário e parâmetros contábeis — editáveis</p>
            </div>
            {canWrite && (
              <div className="flex gap-2">
                {editConfig
                  ? <><Button size="sm" onClick={saveConfig} className="bg-gradient-brand text-primary-foreground"><Save className="h-4 w-4 mr-1" />Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditConfig(false); setConfigDraft(taxConfig); }}>Cancelar</Button></>
                  : <Button size="sm" variant="outline" onClick={() => setEditConfig(true)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
                }
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {editConfig ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Regime</Label>
                  <Select value={configDraft.regime} onValueChange={v => setConfigDraft({...configDraft, regime: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                      <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="lucro_real">Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Anexo</Label>
                  <Select value={configDraft.anexo} onValueChange={v => setConfigDraft({...configDraft, anexo: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["I","II","III","IV","V"].map(a => <SelectItem key={a} value={a}>Anexo {a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Alíquota (%)</Label>
                  <Input type="number" step="0.01" value={configDraft.aliquota_percent}
                    onChange={e => setConfigDraft({...configDraft, aliquota_percent: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Pró-Labore mensal (R$)</Label>
                  <Input type="number" step="0.01" value={configDraft.prolabore_monthly_brl}
                    onChange={e => setConfigDraft({...configDraft, prolabore_monthly_brl: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Fator R — Limiar (%)</Label>
                  <Input type="number" step="0.1" value={configDraft.fator_r_threshold_percent}
                    onChange={e => setConfigDraft({...configDraft, fator_r_threshold_percent: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">CNAE Principal</Label>
                  <Input value={configDraft.cnae_principal}
                    onChange={e => setConfigDraft({...configDraft, cnae_principal: e.target.value})} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs">Descrição CNAE</Label>
                  <Input value={configDraft.cnae_descricao}
                    onChange={e => setConfigDraft({...configDraft, cnae_descricao: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Vencimento DAS (dia do mês)</Label>
                  <Input type="number" min="1" max="31" value={configDraft.das_due_day}
                    onChange={e => setConfigDraft({...configDraft, das_due_day: e.target.value})} />
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-card border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Regime</p>
                  <p className="font-semibold text-sm">{taxConfig.regime === 'simples_nacional' ? 'Simples Nacional' : taxConfig.regime}</p>
                </div>
                <div className="rounded-lg bg-card border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Anexo</p>
                  <p className="font-semibold text-sm">Anexo {taxConfig.anexo}</p>
                </div>
                <div className="rounded-lg bg-card border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Alíquota</p>
                  <p className="font-semibold text-sm text-primary">{taxConfig.aliquota_percent}%</p>
                </div>
                <div className="rounded-lg bg-card border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Pró-Labore / mês</p>
                  <p className="font-semibold text-sm">{brl(taxConfig.prolabore_monthly_brl)}</p>
                </div>
                <div className="rounded-lg bg-card border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">CNAE Principal</p>
                  <p className="font-semibold text-sm">{taxConfig.cnae_principal}</p>
                  <p className="text-xs text-muted-foreground truncate">{taxConfig.cnae_descricao}</p>
                </div>
                <div className="rounded-lg bg-card border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">DAS — Vencimento</p>
                  <p className="font-semibold text-sm">Dia {taxConfig.das_due_day} do mês seguinte</p>
                </div>
                <div className={`rounded-lg border p-3 ${taxConfig.fator_r_active ? 'bg-success/10 border-success/30' : 'bg-card border-border/50'}`}>
                  <p className="text-xs text-muted-foreground mb-1">Fator R</p>
                  <p className="font-semibold text-sm">{taxConfig.fator_r_active ? `Ativo — limiar ${taxConfig.fator_r_threshold_percent}%` : 'Inativo'}</p>
                  {fatorR !== null && (
                    <p className={`text-xs mt-1 font-medium ${fatorR >= (taxConfig.fator_r_threshold_percent || 28) ? 'text-success' : 'text-warning'}`}>
                      Atual: {fatorR.toFixed(1)}% {fatorR >= (taxConfig.fator_r_threshold_percent || 28) ? '✓ Anexo III' : '⚠ Abaixo do limiar'}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {!editConfig && (
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/15 flex gap-2">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Fator R:</strong> Quando a folha de pagamento (incluindo pró-labore) ÷ faturamento dos últimos 12 meses ≥ {taxConfig.fator_r_threshold_percent}%, a empresa migra automaticamente para o Anexo III, com alíquotas menores. O DAS vence dia {taxConfig.das_due_day} do mês seguinte ao faturamento.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label={`Total ${yearFilter}`} value={brl(totalYear)} icon={Receipt} accent="destructive" />
        <KpiCard label="Mês atual" value={brl(totalMonth)} icon={Receipt} accent="warning" />
        <KpiCard label="Lançamentos" value={String(taxes.length)} icon={Receipt} accent="primary" />
      </div>

      {/* Resumo mensal */}
      <Card className="p-5 bg-gradient-surface border-border/50">
        <h3 className="font-display text-lg font-semibold mb-4">Resumo Mensal {yearFilter}</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
          {MONTHS.map((m, i) => {
            const key = `${yearFilter}-${String(i + 1).padStart(2, "0")}`;
            const val = byMonth[key] || 0;
            const dueDate = `Vence dia ${taxConfig?.das_due_day || 20}/${String(i + 2 > 12 ? 1 : i + 2).padStart(2,"0")}`;
            return (
              <div key={m} className="text-center" title={val > 0 ? dueDate : ""}>
                <p className="text-xs text-muted-foreground mb-1">{m}</p>
                <p className={`text-sm font-semibold tabular-nums ${val > 0 ? "text-destructive" : "text-muted-foreground/40"}`}>
                  {val > 0 ? brl(val) : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tabela detalhada */}
      <Card className="bg-gradient-surface border-border/50 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Referência</TableHead>
              <TableHead>Banco</TableHead><TableHead className="text-right">Valor</TableHead>
              {canWrite && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxes.map(t => {
              const parts = t.description?.split(" — ") || [];
              const tipo = parts[0] || t.description;
              const ref = parts.slice(1).join(" — ") || "—";
              return (
                <TableRow key={t.id}>
                  <TableCell className="text-xs whitespace-nowrap">{dateBR(t.date)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{tipo}</span>
                      {tipo?.includes("DAS") && <Badge variant="outline" className="text-[10px]">Simples Nacional</Badge>}
                      {tipo?.includes("DARF") && <Badge variant="outline" className="text-[10px]">DARF</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{ref}</TableCell>
                  <TableCell className="text-xs">{t.bank_accounts?.name || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-destructive">{brl(Number(t.amount_brl))}</TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => setEditTax(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!taxes.length && (
              <TableRow>
                <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-muted-foreground py-8">
                  Nenhum imposto registrado para {yearFilter}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editTax} onOpenChange={v => !v && setEditTax(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar imposto</DialogTitle></DialogHeader>
          {editTax && <TaxForm item={editTax} onSubmit={handleEdit} label="Salvar alterações" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
