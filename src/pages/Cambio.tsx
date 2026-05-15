import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, RefreshCw, TrendingUp, Pencil, Trash2, Info } from "lucide-react";
import { brl, dateBR, num } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { KpiCard } from "@/components/KpiCard";

const DEFAULT_IOF = 1.1;  // IOF PJ cartão débito internacional
const DEFAULT_SPREAD = 4.0;

function calcBreakdown(usd: number, cotacaoBcb: number, iofPct: number, spreadPct: number) {
  const brlBcb = usd * cotacaoBcb;
  const spreadAmt = brlBcb * (spreadPct / 100);
  const cotacaoEfetiva = cotacaoBcb * (1 + spreadPct / 100);
  const brlBase = usd * cotacaoEfetiva;
  const iofAmt = brlBase * (iofPct / 100);
  const total = brlBase + iofAmt;
  return { brlBcb, spreadAmt, iofAmt, brlBase, total, cotacaoEfetiva };
}

export default function Cambio() {
  const { canWrite } = useAuth();
  const [today, setToday] = useState<number | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const r = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
      const j = await r.json();
      const v = parseFloat(j.USDBRL?.bid);
      setToday(v);
      const dateIso = new Date().toISOString().substring(0, 10);
      await supabase.from("fx_rates").upsert({ date: dateIso, currency: "USD", rate_brl: v, source: "awesomeapi" }, { onConflict: "date,currency" });
    } catch { toast.error("Falha ao buscar cotação"); }
    setLoading(false);
  };

  const load = async () => {
    const [{ data: p }, { data: b }] = await Promise.all([
      supabase.from("usd_purchases").select("*, bank_accounts(name)").order("date", { ascending: false }),
      supabase.from("bank_accounts").select("*").eq("active", true),
    ]);
    setPurchases(p || []); setBanks(b || []);
  };

  useEffect(() => { fetchToday(); load(); }, []);

  const totalUsd = purchases.reduce((s, p) => s + Number(p.amount_usd), 0);
  const remaining = purchases.reduce((s, p) => s + Number(p.remaining_usd), 0);
  const totalBrl = purchases.reduce((s, p) => s + Number(p.amount_brl), 0);
  const totalIof = purchases.reduce((s, p) => s + Number(p.iof_amount_brl || 0), 0);
  const totalSpread = purchases.reduce((s, p) => s + Number(p.spread_amount_brl || 0), 0);
  const avgRate = totalUsd > 0 ? totalBrl / totalUsd : 0;

  const buildPayload = (f: FormData, remainingUsd?: number) => {
    const usd = parseFloat(f.get("usd") as string);
    const cotacao = parseFloat(f.get("cotacao") as string) || (today || 5.3);
    const iofPct = parseFloat(f.get("iof") as string) || DEFAULT_IOF;
    const spreadPct = parseFloat(f.get("spread") as string) || DEFAULT_SPREAD;
    const brlManual = parseFloat(f.get("brl") as string);
    const { spreadAmt, iofAmt, total } = calcBreakdown(usd, cotacao, iofPct, spreadPct);
    const brlFinal = !isNaN(brlManual) && brlManual > 0 ? brlManual : total;
    return {
      date: f.get("date") as string,
      amount_usd: usd,
      amount_brl: brlFinal,
      effective_rate: brlFinal / usd,
      iof_pct: iofPct,
      spread_pct: spreadPct,
      iof_amount_brl: iofAmt,
      spread_amount_brl: spreadAmt,
      bank_account_id: f.get("bank") as string || null,
      notes: f.get("notes") as string || null,
      ...(remainingUsd !== undefined ? { remaining_usd: remainingUsd } : {}),
    };
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const usd = parseFloat(f.get("usd") as string);
    const payload = buildPayload(f, usd);
    const { error } = await supabase.from("usd_purchases").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Compra registrada"); setOpen(false); load(); }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = buildPayload(f);
    const { error } = await supabase.from("usd_purchases").update(payload).eq("id", editItem.id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizado"); setEditItem(null); load(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta compra?")) return;
    const { error } = await supabase.from("usd_purchases").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído"); load(); }
  };

  const PurchaseForm = ({ item, onSubmit, label }: { item?: any; onSubmit: any; label: string }) => {
    const [usd, setUsd] = useState<string>(item?.amount_usd ?? "");
    const [cotacao, setCotacao] = useState<string>(
      item ? (Number(item.amount_brl) / Number(item.amount_usd)).toFixed(4) : today ? today.toFixed(4) : ""
    );
    const [iof, setIof] = useState<string>(String(item?.iof_pct ?? DEFAULT_IOF));
    const [spread, setSpread] = useState<string>(String(item?.spread_pct ?? DEFAULT_SPREAD));

    const usdN = parseFloat(usd) || 0;
    const cotacaoN = parseFloat(cotacao) || 0;
    const iofN = parseFloat(iof) || 0;
    const spreadN = parseFloat(spread) || 0;
    const calc = usdN > 0 && cotacaoN > 0 ? calcBreakdown(usdN, cotacaoN, iofN, spreadN) : null;

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Data</Label>
          <Input type="date" name="date" required defaultValue={item?.date || new Date().toISOString().substring(0, 10)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>USD comprado</Label>
            <Input type="number" step="0.01" name="usd" required value={usd} onChange={e => setUsd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cotação BCB (R$/US$)</Label>
            <Input type="number" step="0.0001" name="cotacao" value={cotacao} onChange={e => setCotacao(e.target.value)} placeholder={today ? String(today) : "5.30"} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>IOF (%)</Label>
            <Input type="number" step="0.01" name="iof" value={iof} onChange={e => setIof(e.target.value)} />
            <p className="text-xs text-muted-foreground">Cartão débito PJ = 1,1%</p>
          </div>
          <div className="space-y-2">
            <Label>Spread (%)</Label>
            <Input type="number" step="0.01" name="spread" value={spread} onChange={e => setSpread(e.target.value)} />
            <p className="text-xs text-muted-foreground">Diferença entre BCB e banco</p>
          </div>
        </div>

        {calc && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5 text-xs">
            <p className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Info className="h-4 w-4" /> Breakdown do custo real</p>
            <div className="flex justify-between"><span className="text-muted-foreground">Cotação BCB</span><span>R$ {cotacaoN.toFixed(4)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Spread ({spreadN}%)</span><span className="text-warning">+ {brl(calc.spreadAmt)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cotação efetiva</span><span>R$ {calc.cotacaoEfetiva.toFixed(4)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Base BRL</span><span>{brl(calc.brlBase)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IOF ({iofN}%)</span><span className="text-destructive">+ {brl(calc.iofAmt)}</span></div>
            <div className="flex justify-between font-bold border-t border-border/30 pt-1.5">
              <span>Total estimado</span>
              <span className="text-primary">{brl(calc.total)}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>BRL total pago (real)</Label>
          <Input type="number" step="0.01" name="brl" defaultValue={item?.amount_brl} placeholder={calc ? calc.total.toFixed(2) : "deixe vazio para usar estimativa"} />
          <p className="text-xs text-muted-foreground">Se deixar em branco, usa o valor calculado acima</p>
        </div>
        <div className="space-y-2">
          <Label>Banco origem</Label>
          <Select name="bank" defaultValue={item?.bank_account_id}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Input name="notes" placeholder="Ex: assinatura Anthropic, Claude..." defaultValue={item?.notes} />
        </div>
        <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground">{label}</Button>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Câmbio USD"
        description="Cotação do dia, IOF 1,1% PJ, spread e custo real das compras internacionais"
        actions={
          <Button variant="outline" onClick={fetchToday} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar cotação
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="USD/BRL Hoje" value={today ? `R$ ${num(today, 4)}` : "—"} icon={DollarSign} accent="primary" />
        <KpiCard label="USD Comprado" value={`US$ ${num(totalUsd)}`} icon={TrendingUp} accent="success" />
        <KpiCard label="USD Disponível" value={`US$ ${num(remaining)}`} icon={DollarSign} accent="warning" />
        <KpiCard label="Cotação Média" value={avgRate ? `R$ ${num(avgRate, 4)}` : "—"} icon={TrendingUp} accent="primary" />
      </div>

      {/* Totais IOF e Spread */}
      {(totalIof > 0 || totalSpread > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-surface border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Total BRL pago</p>
            <p className="text-lg font-bold tabular-nums">{brl(totalBrl)}</p>
          </Card>
          <Card className="p-4 bg-gradient-surface border-border/50">
            <p className="text-xs text-muted-foreground mb-1">IOF total pago</p>
            <p className="text-lg font-bold text-destructive tabular-nums">{brl(totalIof)}</p>
          </Card>
          <Card className="p-4 bg-gradient-surface border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Spread total pago</p>
            <p className="text-lg font-bold text-warning tabular-nums">{brl(totalSpread)}</p>
          </Card>
        </div>
      )}

      {/* Info IOF */}
      <Card className="p-4 bg-gradient-surface border-border/50 border-primary/20">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold">Como funciona o custo real em USD?</p>
            <p className="text-muted-foreground">
              <strong>IOF 1,1%</strong> — alíquota para cartão débito PJ em moeda estrangeira (pessoa jurídica).<br />
              <strong>Spread</strong> — diferença entre a cotação do Banco Central (BCB) e a taxa aplicada pelo banco.
              Tipicamente 3–5% no C6 Bank. O custo real = USD × cotação_efetiva × (1 + IOF%).
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 bg-gradient-surface border-border/50 overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-lg">Compras de USD</h3>
          {canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-brand text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Nova compra</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nova compra USD</DialogTitle></DialogHeader>
                <PurchaseForm onSubmit={handleCreate} label="Registrar compra" />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>USD</TableHead>
              <TableHead>Cotação</TableHead>
              <TableHead>Spread</TableHead>
              <TableHead>IOF</TableHead>
              <TableHead>BRL total</TableHead>
              <TableHead>Restante USD</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Notas</TableHead>
              {canWrite && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map(p => (
              <TableRow key={p.id}>
                <TableCell className="text-xs">{dateBR(p.date)}</TableCell>
                <TableCell className="tabular-nums font-semibold">US$ {num(p.amount_usd)}</TableCell>
                <TableCell className="tabular-nums text-xs">R$ {num(p.effective_rate, 4)}</TableCell>
                <TableCell className="tabular-nums text-xs text-warning">
                  {p.spread_pct ? `${Number(p.spread_pct).toFixed(1)}%` : "—"}
                  {p.spread_amount_brl > 0 && <span className="block text-[10px]">{brl(p.spread_amount_brl)}</span>}
                </TableCell>
                <TableCell className="tabular-nums text-xs text-destructive">
                  {p.iof_pct ? `${Number(p.iof_pct).toFixed(1)}%` : "—"}
                  {p.iof_amount_brl > 0 && <span className="block text-[10px]">{brl(p.iof_amount_brl)}</span>}
                </TableCell>
                <TableCell className="tabular-nums font-semibold">{brl(Number(p.amount_brl))}</TableCell>
                <TableCell className="tabular-nums text-success">US$ {num(p.remaining_usd)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.bank_accounts?.name || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{p.notes || "—"}</TableCell>
                {canWrite && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!purchases.length && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                  Nenhuma compra registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar compra USD</DialogTitle></DialogHeader>
          {editItem && <PurchaseForm item={editItem} onSubmit={handleEdit} label="Salvar alterações" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
