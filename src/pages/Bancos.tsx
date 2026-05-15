import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { brl, dateBR } from "@/lib/format";
import { Building2, ArrowDownCircle, ArrowUpCircle, Filter, Wallet, CreditCard, TrendingUp, User, Pencil, X, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/KpiCard";
import { toast } from "sonner";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function Bancos() {
  const [banks, setBanks] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeBank, setActiveBank] = useState<string>("");

  // Edit balance modal
  const [editingBank, setEditingBank] = useState<any | null>(null);
  const [newBalanceStr, setNewBalanceStr] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);

  const loadData = async () => {
    const [{ data: bd }, { data: td }] = await Promise.all([
      supabase.from("bank_accounts").select("*").eq("active", true),
      supabase.from("transactions").select("*, cost_centers(name), projects(name)").order("date", { ascending: false }),
    ]);
    setBanks(bd || []);
    setTx(td || []);
    if (bd && bd.length > 0 && !activeBank) setActiveBank(bd[0].id);
  };

  useEffect(() => { loadData(); }, []);

  const saldoCorrente = (bankId: string, opening: number) => {
    const movs = tx.filter(t => t.bank_account_id === bankId && t.status !== "cancelado");
    return Number(opening) + movs.reduce((s, t) =>
      s + (t.type === "entrada" ? Number(t.amount_brl) : t.type === "saida" ? -Number(t.amount_brl) : 0), 0);
  };

  // Fatura por mês de um banco específico (saídas no cartão)
  const faturaByMonth = (bankId: string) => {
    const byMonth: Record<string, number> = {};
    tx.filter(t => t.bank_account_id === bankId && t.type === "saida").forEach(t => {
      const m = t.date?.substring(0, 7);
      if (m) byMonth[m] = (byMonth[m] || 0) + Number(t.amount_brl);
    });
    return byMonth;
  };

  // Soma de pro-labore para um banco
  const sumProlabore = (bankId: string) => {
    return tx.filter(t =>
      t.bank_account_id === bankId &&
      (t.description?.toLowerCase().includes("pro labore") ||
       t.description?.toLowerCase().includes("pró-labore") ||
       t.description?.toLowerCase().includes("prolabore"))
    ).reduce((s, t) => s + Number(t.amount_brl), 0);
  };

  // Saldo USD disponível (para C6)
  const saldoUSD = (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    if (bank?.currency !== "USD") return null;
    const opening = Number(bank.opening_balance || 0);
    const movs = tx.filter(t => t.bank_account_id === bankId && t.currency === "USD");
    return opening + movs.reduce((s, t) =>
      s + (t.type === "entrada" ? Number(t.amount_original || 0) : -Number(t.amount_original || 0)), 0);
  };

  const year = new Date().getFullYear();

  // ─── Edit balance ─────────────────────────────────────────────────────────

  const openEditBalance = (bank: any) => {
    const current = bank.currency === "USD"
      ? saldoUSD(bank.id) ?? 0
      : saldoCorrente(bank.id, bank.opening_balance);
    setEditingBank(bank);
    setNewBalanceStr(current.toFixed(2));
  };

  const saveBalance = async () => {
    if (!editingBank) return;
    const desired = parseFloat(newBalanceStr.replace(",", "."));
    if (isNaN(desired)) { toast.error("Valor inválido"); return; }
    setSavingBalance(true);

    let newOpening: number;
    if (editingBank.currency === "USD") {
      // saldoUSD = opening + usd_tx_net → new_opening = desired - usd_tx_net
      const current = saldoUSD(editingBank.id) ?? 0;
      const usdTxNet = current - Number(editingBank.opening_balance || 0);
      newOpening = desired - usdTxNet;
    } else {
      // saldoCorrente(id, 0) = tx_net_brl
      const txNet = saldoCorrente(editingBank.id, 0);
      newOpening = desired - txNet;
    }

    const { error } = await supabase
      .from("bank_accounts")
      .update({ opening_balance: newOpening })
      .eq("id", editingBank.id);

    if (error) { toast.error(error.message); }
    else { toast.success("Saldo atualizado!"); setEditingBank(null); await loadData(); }
    setSavingBalance(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bancos" description="Saldos, extratos e visão detalhada por conta" />

      {/* Cards de saldo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {banks.map(b => {
          const bal = saldoCorrente(b.id, b.opening_balance);
          const isUSD = b.currency === "USD";
          const usdBal = saldoUSD(b.id);
          return (
            <Card
              key={b.id}
              className={`p-5 bg-gradient-surface border-border/50 cursor-pointer transition-all hover:border-primary/40 ${activeBank === b.id ? "border-primary/50 shadow-glow" : ""}`}
              onClick={() => setActiveBank(b.id)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: `${b.color}25`, color: b.color }}>
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">{b.bank}</p>
                  <p className="font-semibold truncate">{b.name}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); openEditBalance(b); }}
                  className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors shrink-0"
                  title="Ajustar saldo"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-4 font-display text-2xl tabular-nums">
                {isUSD && usdBal !== null ? `US$ ${usdBal.toFixed(2)}` : brl(bal)}
              </p>
              {isUSD && <p className="text-xs text-muted-foreground mt-1">≈ {brl(bal)} (BRL)</p>}
              <p className="text-xs text-muted-foreground mt-1">
                {tx.filter(t => t.bank_account_id === b.id).length} movimentações
              </p>
            </Card>
          );
        })}
      </div>

      {/* Filtro de período */}
      <Card className="p-4 bg-gradient-surface border-border/50">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex items-center gap-2 text-muted-foreground"><Filter className="h-4 w-4" /><span className="text-sm">Período:</span></div>
          <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        </div>
      </Card>

      {/* Tabs por banco */}
      <Tabs value={activeBank} onValueChange={setActiveBank}>
        <TabsList className="flex-wrap h-auto">
          {banks.map(b => <TabsTrigger key={b.id} value={b.id}>{b.name}</TabsTrigger>)}
        </TabsList>

        {banks.map(b => {
          const isNubank = b.name?.toLowerCase().includes("nu") || b.name?.toLowerCase().includes("nubank");
          const isC6 = b.name?.toLowerCase().includes("c6");
          const isUSD = b.currency === "USD";

          const filtered = tx.filter(t => {
            if (t.bank_account_id !== b.id) return false;
            if (dateFrom && t.date < dateFrom) return false;
            if (dateTo && t.date > dateTo) return false;
            return true;
          });

          const entradas = filtered.filter(t => t.type === "entrada").reduce((s, t) => s + Number(t.amount_brl), 0);
          const saidas = filtered.filter(t => t.type === "saida").reduce((s, t) => s + Number(t.amount_brl), 0);
          const saldo = saldoCorrente(b.id, b.opening_balance);
          const prolaboreTotal = sumProlabore(b.id);
          const fatura = faturaByMonth(b.id);

          // USD saídas detalhadas para C6
          const usdSaidas = filtered.filter(t => t.currency === "USD" && t.type === "saida");
          const usdTotal = usdSaidas.reduce((s, t) => s + Number(t.amount_original || 0), 0);

          return (
            <TabsContent key={b.id} value={b.id} className="space-y-4">
              {/* KPIs do banco */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Saldo Atual" value={isUSD ? `US$ ${(saldoUSD(b.id) || 0).toFixed(2)}` : brl(saldo)} icon={Wallet} accent="primary" />
                <KpiCard label="Entradas (período)" value={brl(entradas)} icon={ArrowDownCircle} accent="success" />
                <KpiCard label="Saídas (período)" value={brl(saidas)} icon={ArrowUpCircle} accent="destructive" />
                {isNubank && prolaboreTotal > 0
                  ? <KpiCard label="Pró-Labore recebido" value={brl(prolaboreTotal)} icon={User} accent="warning" />
                  : isUSD
                  ? <KpiCard label="USD gasto (período)" value={`US$ ${usdTotal.toFixed(2)}`} icon={CreditCard} accent="warning" />
                  : <KpiCard label="Resultado" value={brl(entradas - saidas)} icon={TrendingUp} accent={entradas >= saidas ? "success" : "destructive"} />
                }
              </div>

              {/* Fatura mensal por mês (ano atual) */}
              <Card className="p-4 bg-gradient-surface border-border/50">
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Saídas / Fatura por Mês — {year}
                </h3>
                <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                  {MONTHS.map((m, i) => {
                    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
                    const val = fatura[key] || 0;
                    return (
                      <div key={m} className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">{m}</p>
                        <p className={`text-xs font-semibold tabular-nums ${val > 0 ? "text-destructive" : "text-muted-foreground/40"}`}>
                          {val > 0 ? brl(val) : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Destaque Nubank: pro-labore */}
              {isNubank && prolaboreTotal > 0 && (
                <Card className="p-4 bg-gradient-surface border-border/50 border-warning/30">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-warning" /> Pró-Labore recebido nesta conta
                  </h3>
                  <div className="space-y-1">
                    {tx.filter(t => t.bank_account_id === b.id &&
                      (t.description?.toLowerCase().includes("pro labore") ||
                       t.description?.toLowerCase().includes("pró-labore") ||
                       t.description?.toLowerCase().includes("prolabore")))
                      .map(t => (
                        <div key={t.id} className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
                          <span className="text-muted-foreground">{dateBR(t.date)} — {t.description}</span>
                          <span className="font-semibold text-warning tabular-nums">{brl(Number(t.amount_brl))}</span>
                        </div>
                      ))}
                    <div className="flex justify-between text-sm font-bold pt-2">
                      <span>Total pró-labore</span>
                      <span className="text-warning">{brl(prolaboreTotal)}</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Destaque C6: detalhamento USD */}
              {isC6 && usdSaidas.length > 0 && (
                <Card className="p-4 bg-gradient-surface border-border/50 border-primary/20">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Gastos em USD — Cartão Débito C6
                  </h3>
                  <div className="space-y-1">
                    {usdSaidas.map(t => (
                      <div key={t.id} className="flex justify-between items-center text-sm py-1 border-b border-border/30 last:border-0">
                        <div>
                          <span className="text-muted-foreground text-xs">{dateBR(t.date)}</span>
                          <span className="ml-2">{t.description}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground mr-2">US$ {Number(t.amount_original || 0).toFixed(2)}</span>
                          <span className="font-semibold text-destructive tabular-nums">{brl(Number(t.amount_brl))}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold pt-2">
                      <span>Total USD gasto</span>
                      <span className="text-primary">US$ {usdTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Extrato completo */}
              <Card className="bg-gradient-surface border-border/50 p-4">
                <h3 className="font-display text-lg mb-3">
                  Extrato — {b.name}
                  {filtered.length !== tx.filter(t => t.bank_account_id === b.id).length &&
                    <span className="text-sm text-muted-foreground ml-2">({filtered.length} de {tx.filter(t => t.bank_account_id === b.id).length})</span>}
                </h3>
                <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
                  {filtered.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {t.type === "entrada"
                          ? <ArrowDownCircle className="h-4 w-4 text-success shrink-0" />
                          : <ArrowUpCircle className="h-4 w-4 text-destructive shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm truncate">{t.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground">{dateBR(t.date)}</p>
                            {t.cost_centers?.name && <Badge variant="outline" className="text-[9px] py-0 h-4">{t.cost_centers.name}</Badge>}
                            {t.projects?.name && <Badge variant="outline" className="text-[9px] py-0 h-4 text-primary">{t.projects.name}</Badge>}
                            {t.currency === "USD" && <Badge variant="outline" className="text-[9px] py-0 h-4">USD {Number(t.amount_original).toFixed(2)}</Badge>}
                          </div>
                        </div>
                      </div>
                      <span className={`tabular-nums font-semibold text-sm shrink-0 ml-4 ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                        {t.type === "entrada" ? "+" : "-"} {brl(Number(t.amount_brl))}
                      </span>
                    </div>
                  ))}
                  {!filtered.length && (
                    <p className="text-center text-muted-foreground py-6 text-sm">Sem movimentações no período.</p>
                  )}
                </div>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* ── Edit balance modal ────────────────────────────────────────── */}
      {editingBank && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingBank(null)}
        >
          <Card
            className="w-full max-w-sm p-6 space-y-4 bg-card border-border"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Ajustar saldo — {editingBank.name}</h2>
              <button onClick={() => setEditingBank(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Informe o saldo atual real da conta. O sistema ajusta automaticamente
              o saldo inicial para bater com o valor informado.
            </p>

            <div className="space-y-1">
              <Label className="text-xs">
                Saldo atual ({editingBank.currency === "USD" ? "USD" : "R$"})
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {editingBank.currency === "USD" ? "US$" : "R$"}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={newBalanceStr}
                  onChange={e => setNewBalanceStr(e.target.value)}
                  className="pl-10"
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && saveBalance()}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveBalance} disabled={savingBalance} className="flex-1">
                {savingBalance
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
                  : "Confirmar saldo"}
              </Button>
              <Button variant="outline" onClick={() => setEditingBank(null)}>
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
