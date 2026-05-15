import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, Calendar,
  Users, Briefcase, Heart, Star, ChevronRight,
} from "lucide-react";
import { brl, monthLabel } from "@/lib/format";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tx {
  date: string; type: string; amount_brl: number;
  bank_account_id: string | null; cost_center_id: string | null;
  cost_centers?: { name: string; dre_group: string } | null;
  bank_accounts?: { name: string; color: string; opening_balance: number; currency: string } | null;
}

type Shortcut = "hoje" | "mes" | "mes_ant" | "3m" | "ano" | "tudo";

interface Period {
  from: string | null;   // YYYY-MM-DD or null (= no lower bound)
  to: string | null;     // YYYY-MM-DD or null (= no upper bound)
  shortcut: Shortcut | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  "#10D982", "#FFD700", "#FF7A00", "#820AD1", "#06B6D4",
  "#EF4444", "#8B5CF6", "#F59E0B",
];
const CHART_STYLE = { style: { background: "transparent" } };

const SHORTCUTS: { key: Shortcut; label: string }[] = [
  { key: "hoje",    label: "Hoje" },
  { key: "mes",     label: "Este Mês" },
  { key: "mes_ant", label: "Mês Passado" },
  { key: "3m",      label: "Últimos 3 meses" },
  { key: "ano",     label: "Este Ano" },
  { key: "tudo",    label: "Tudo" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().substring(0, 10);
}

function periodFromShortcut(key: Shortcut): { from: string | null; to: string | null } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based

  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = (date: Date) => date.toISOString().substring(0, 10);

  switch (key) {
    case "hoje":
      return { from: isoToday(), to: isoToday() };
    case "mes": {
      const from = `${y}-${pad(m + 1)}-01`;
      const to = ymd(new Date(y, m + 1, 0)); // last day of month
      return { from, to };
    }
    case "mes_ant": {
      // new Date(y, m, 0) = last day of prev month; new Date(y, m-1, 1) = first day
      const prevMonthEnd   = new Date(y, m, 0);
      const prevMonthStart = new Date(y, m - 1, 1);
      return { from: ymd(prevMonthStart), to: ymd(prevMonthEnd) };
    }
    case "3m": {
      const from = ymd(new Date(y, m - 2, 1));
      const to = ymd(new Date(y, m + 1, 0));
      return { from, to };
    }
    case "ano":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "tudo":
      return { from: null, to: null };
    default:
      return { from: null, to: null };
  }
}

function txInPeriod(t: Tx, from: string | null, to: string | null): boolean {
  if (from && t.date < from) return false;
  if (to   && t.date > to)   return false;
  return true;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface OpsKpis {
  dealsAtivos: number;
  mrrPipeline: number;
  fechadosEsseMes: number;
  projetosAtivos: number;
  npsMedia: number | null;
  churnAlto: number;
}

export default function Dashboard() {
  const navigate = useNavigate();

  // ── raw data
  const [allTx, setAllTx]         = useState<Tx[]>([]);
  const [banks, setBanks]         = useState<any[]>([]);
  const [taxConfig, setTaxConfig] = useState<{ das_due_day: number } | null>(null);
  const [pendingRec, setPendingRec] = useState<number>(0);
  const [loading, setLoading]     = useState(true);
  const [opsKpis, setOpsKpis]     = useState<OpsKpis>({
    dealsAtivos: 0, mrrPipeline: 0, fechadosEsseMes: 0,
    projetosAtivos: 0, npsMedia: null, churnAlto: 0,
  });

  // ── period filter state
  const [period, setPeriod] = useState<Period>({ from: null, to: null, shortcut: "tudo" });
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");

  // ── fetch
  useEffect(() => {
    (async () => {
      const today = isoToday();
      const currentMonth = today.substring(0, 7);

      const [
        { data: txd },
        { data: bd },
        { data: taxd },
        { data: recd },
        { data: dealsd },
        { data: projd },
        { data: healthd },
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select("*, cost_centers(name, dre_group), bank_accounts(name,color,opening_balance,currency)")
          .order("date"),
        supabase.from("bank_accounts").select("*").eq("active", true),
        supabase.from("tax_config").select("das_due_day").limit(1).maybeSingle(),
        supabase
          .from("recurring_rules")
          .select("id", { count: "exact", head: true })
          .eq("active", true)
          .lte("next_run", today),
        (supabase as any).from("crm_deals").select("stage, value_mrr, closed_at"),
        (supabase as any).from("hub_projects").select("id, status").neq("status", "encerrado"),
        (supabase as any).from("cs_health").select("nps_score, churn_risk"),
      ]);

      setAllTx((txd as any) || []);
      setBanks(bd || []);
      if (taxd) setTaxConfig(taxd as any);
      setPendingRec((recd as any)?.count ?? 0);

      // Ops KPIs
      const CLOSED = ["fechado_ganho", "fechado_perdido"];
      const deals: any[] = dealsd || [];
      const ativos = deals.filter(d => !CLOSED.includes(d.stage));
      const fechadosMes = deals.filter(d =>
        d.stage === "fechado_ganho" && d.closed_at?.startsWith(currentMonth)
      );
      const projs: any[] = projd || [];
      const healths: any[] = healthd || [];
      const npsScores = healths.map(h => h.nps_score).filter((n): n is number => n != null);
      const npsMedia = npsScores.length > 0
        ? Math.round(npsScores.reduce((s, n) => s + n, 0) / npsScores.length * 10) / 10
        : null;
      const churnAlto = healths.filter(h => h.churn_risk === "alto" || h.churn_risk === "critico").length;

      setOpsKpis({
        dealsAtivos: ativos.length,
        mrrPipeline: ativos.reduce((s, d) => s + (d.value_mrr ?? 0), 0),
        fechadosEsseMes: fechadosMes.length,
        projetosAtivos: projs.length,
        npsMedia,
        churnAlto,
      });

      setLoading(false);
    })();
  }, []);

  // ── period handlers
  function applyShortcut(key: Shortcut) {
    const { from, to } = periodFromShortcut(key);
    setPeriod({ from, to, shortcut: key });
    setCustomFrom(from ?? "");
    setCustomTo(to ?? "");
  }

  function handleCustomFrom(val: string) {
    setCustomFrom(val);
    setPeriod({ from: val || null, to: period.to, shortcut: null });
  }

  function handleCustomTo(val: string) {
    setCustomTo(val);
    setPeriod({ from: period.from, to: val || null, shortcut: null });
  }

  // ── filtered tx subset (for charts / comparative KPIs)
  const tx = useMemo(
    () => allTx.filter(t => txInPeriod(t, period.from, period.to)),
    [allTx, period.from, period.to],
  );

  // ── Caixa Total always uses ALL transactions + opening balances
  const allEntradas = useMemo(
    () => allTx.filter(t => t.type === "entrada").reduce((s, t) => s + Number(t.amount_brl), 0),
    [allTx],
  );
  const allSaidas = useMemo(
    () => allTx.filter(t => t.type === "saida").reduce((s, t) => s + Number(t.amount_brl), 0),
    [allTx],
  );
  const saldoTotal = useMemo(
    () =>
      banks.reduce((s, b) => s + Number(b.opening_balance) * (b.currency === "USD" ? 5.3 : 1), 0) +
      allEntradas - allSaidas,
    [banks, allEntradas, allSaidas],
  );

  // ── filtered KPI values
  const totalEntradas = useMemo(
    () => tx.filter(t => t.type === "entrada").reduce((s, t) => s + Number(t.amount_brl), 0),
    [tx],
  );
  const totalSaidas = useMemo(
    () => tx.filter(t => t.type === "saida").reduce((s, t) => s + Number(t.amount_brl), 0),
    [tx],
  );

  // ── Monthly aggregates (filtered)
  const monthlyArr = useMemo(() => {
    const monthly: Record<string, {
      mes: string; key: string;
      entrada: number; saida: number; saldo: number;
      mrr: number; margem: number; margemPct: number;
    }> = {};

    tx.forEach(t => {
      const k = t.date.substring(0, 7);
      if (!monthly[k]) {
        monthly[k] = {
          mes: monthLabel(t.date + "T00:00:00"),
          key: k, entrada: 0, saida: 0, saldo: 0, mrr: 0, margem: 0, margemPct: 0,
        };
      }
      if (t.type === "entrada") {
        monthly[k].entrada += Number(t.amount_brl);
        if (t.cost_centers?.dre_group === "receita_bruta") monthly[k].mrr += Number(t.amount_brl);
      } else {
        monthly[k].saida += Number(t.amount_brl);
      }
    });

    let acc = 0;
    return Object.entries(monthly).sort().map(([, v]) => {
      acc += v.entrada - v.saida;
      const margem = v.entrada - v.saida;
      const margemPct = v.entrada > 0 ? (margem / v.entrada) * 100 : 0;
      return { ...v, saldo: acc, margem, margemPct: parseFloat(margemPct.toFixed(1)) };
    });
  }, [tx]);

  const lastMonth  = monthlyArr[monthlyArr.length - 1];
  const prevMonth  = monthlyArr[monthlyArr.length - 2];
  const lastMonths3 = monthlyArr.slice(-3);

  const mrrAtual = lastMonth?.mrr || 0;
  const burnRate = lastMonths3.length
    ? lastMonths3.reduce((s, m) => s + Math.max(0, m.saida - m.entrada), 0) / lastMonths3.length
    : 0;
  const runway = burnRate > 0 ? saldoTotal / burnRate : Infinity;

  const margemMesAtual   = lastMonth?.margemPct || 0;
  const margemMesAnterior = prevMonth?.margemPct || 0;
  const margemDelta = margemMesAtual - margemMesAnterior;

  // ── Cost breakdown by CC (filtered)
  const ccArr = useMemo(() => {
    const byCc: Record<string, number> = {};
    tx.filter(t => t.type === "saida").forEach(t => {
      const n = t.cost_centers?.name || "Sem centro";
      byCc[n] = (byCc[n] || 0) + Number(t.amount_brl);
    });
    return Object.entries(byCc)
      .map(([name, valor]) => ({ name, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [tx]);

  // ── Per-bank result (filtered)
  const bankArr = useMemo(() => {
    const byBank: Record<string, number> = {};
    tx.forEach(t => {
      const name = t.bank_accounts?.name || "—";
      byBank[name] = (byBank[name] || 0) + (t.type === "entrada" ? Number(t.amount_brl) : -Number(t.amount_brl));
    });
    return Object.entries(byBank).map(([name, v]) => ({ name, valor: v }));
  }, [tx]);

  // ── Alerts
  const alerts = useMemo(() => {
    const items: { key: string; message: string; severity: "warning" | "error" }[] = [];
    const today = new Date();

    // DAS due alert
    if (taxConfig?.das_due_day) {
      const dueDay = taxConfig.das_due_day;
      // Calculate next DAS due: day `dueDay` of next month
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
      const diffMs = nextMonth.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 7 && diffDays >= 0) {
        items.push({
          key: "das",
          message: `DAS vence em ${diffDays === 0 ? "hoje" : `${diffDays} dia${diffDays > 1 ? "s" : ""}`} (dia ${dueDay} do mês).`,
          severity: diffDays <= 2 ? "error" : "warning",
        });
      }
    }

    // Low balance per bank (using ALL transactions balance, not filtered)
    banks.forEach(b => {
      const bankTxs = allTx.filter(t => t.bank_account_id === b.id);
      const entradas = bankTxs.filter(t => t.type === "entrada").reduce((s, t) => s + Number(t.amount_brl), 0);
      const saidas   = bankTxs.filter(t => t.type === "saida").reduce((s, t) => s + Number(t.amount_brl), 0);
      const balance  = Number(b.opening_balance) * (b.currency === "USD" ? 5.3 : 1) + entradas - saidas;
      if (balance < 1000) {
        items.push({
          key: `bank-${b.id}`,
          message: `Saldo baixo em "${b.name}": ${brl(balance)}`,
          severity: balance < 0 ? "error" : "warning",
        });
      }
    });

    // Pending recurring
    if (pendingRec > 0) {
      items.push({
        key: "recurring",
        message: `${pendingRec} regra${pendingRec > 1 ? "s" : ""} recorrente${pendingRec > 1 ? "s" : ""} com lançamento pendente.`,
        severity: "warning",
      });
    }

    return items;
  }, [taxConfig, banks, allTx, pendingRec]);

  // ── Render guard
  if (loading) return <div className="text-muted-foreground p-6">Carregando...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral financeira da SolicitAí" />

      {/* ── Period Filter Panel ── */}
      <Card className="p-4 bg-gradient-surface border-border/50">
        <div className="flex flex-col gap-4">
          {/* Shortcut pills */}
          <div className="flex flex-wrap gap-2 items-center">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            {SHORTCUTS.map(s => {
              const active = period.shortcut === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => applyShortcut(s.key)}
                  className={[
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    active
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Custom date range inputs */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input
                type="date"
                value={customFrom}
                onChange={e => handleCustomFrom(e.target.value)}
                className="h-8 text-sm w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                value={customTo}
                onChange={e => handleCustomTo(e.target.value)}
                className="h-8 text-sm w-40"
              />
            </div>
            {period.shortcut === null && (
              <button
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                  setPeriod({ from: null, to: null, shortcut: "tudo" });
                }}
                className="px-3 py-1 rounded-full text-xs font-medium border border-border/50 text-muted-foreground hover:text-foreground transition-colors h-8"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Alerts Widget ── */}
      {alerts.length > 0 && (
        <Card className="p-4 bg-gradient-surface border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="font-display text-sm font-semibold">Avisos</h3>
          </div>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.key}
                className={[
                  "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
                  alert.severity === "error"
                    ? "bg-destructive/10 border border-destructive/30 text-destructive"
                    : "bg-warning/10 border border-warning/30 text-warning",
                ].join(" ")}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── KPIs row 1 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Caixa Total"
          value={brl(saldoTotal)}
          icon={Wallet}
          accent="primary"
          tooltip="Saldos iniciais + todas as entradas − todas as saídas. Dinheiro disponível hoje (não filtrado por período)."
        />
        <KpiCard
          label="MRR atual"
          value={brl(mrrAtual)}
          icon={TrendingUp}
          accent="success"
          tooltip="Receita recorrente mensal do último mês no período selecionado."
        />
        <KpiCard
          label="Burn Rate (3m)"
          value={brl(burnRate)}
          icon={TrendingDown}
          accent={burnRate > 0 ? "destructive" : "success"}
          tooltip="Média de consumo de caixa por mês nos últimos 3 meses do período selecionado."
        />
        <KpiCard
          label="Runway"
          value={runway === Infinity ? "∞" : `${runway.toFixed(1)} meses`}
          icon={runway > 6 ? DollarSign : AlertTriangle}
          accent={runway > 6 ? "success" : runway > 3 ? "warning" : "destructive"}
          tooltip="Quantos meses o caixa aguenta: Caixa Total ÷ Burn Rate."
        />
      </div>

      {/* ── KPIs row 2 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Entradas (período)"
          value={brl(totalEntradas)}
          icon={TrendingUp}
          accent="success"
        />
        <KpiCard
          label="Saídas (período)"
          value={brl(totalSaidas)}
          icon={TrendingDown}
          accent="destructive"
        />
        <KpiCard
          label="Resultado acum."
          value={brl(totalEntradas - totalSaidas)}
          icon={DollarSign}
          accent={totalEntradas - totalSaidas >= 0 ? "success" : "destructive"}
        />
        <KpiCard
          label={`Margem (${lastMonth?.mes || "atual"})`}
          value={`${margemMesAtual.toFixed(1)}% ${margemDelta >= 0 ? "↑" : "↓"}`}
          icon={Target}
          accent={margemMesAtual >= 30 ? "success" : margemMesAtual >= 15 ? "warning" : "destructive"}
          tooltip="Margem do último mês no período selecionado. Meta recomendada: ≥30%."
        />
      </div>

      {/* ── Visão 360° — Operações ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Visão 360° — Operações
          </h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            label="Deals ativos"
            value={String(opsKpis.dealsAtivos)}
            icon={Users}
            accent="primary"
            tooltip="Deals no funil que ainda não foram fechados (ganho ou perdido)."
          />
          <KpiCard
            label="MRR em pipeline"
            value={brl(opsKpis.mrrPipeline)}
            icon={DollarSign}
            accent="warning"
            tooltip="Soma do MRR de todos os deals ativos no funil."
          />
          <KpiCard
            label="Fechamentos (mês)"
            value={String(opsKpis.fechadosEsseMes)}
            icon={TrendingUp}
            accent={opsKpis.fechadosEsseMes > 0 ? "success" : "primary"}
            tooltip="Deals fechados com ganho neste mês."
          />
          <KpiCard
            label="Projetos ativos"
            value={String(opsKpis.projetosAtivos)}
            icon={Briefcase}
            accent="primary"
            tooltip="Projetos em execução no Hub (exceto encerrados)."
          />
          <KpiCard
            label="NPS médio"
            value={opsKpis.npsMedia != null ? `${opsKpis.npsMedia}/10` : "—"}
            icon={Star}
            accent={
              opsKpis.npsMedia == null ? "primary"
              : opsKpis.npsMedia >= 8 ? "success"
              : opsKpis.npsMedia >= 6 ? "warning"
              : "destructive"
            }
            tooltip="Média dos NPS registrados no módulo de CS."
          />
          <KpiCard
            label="Risco de churn"
            value={String(opsKpis.churnAlto)}
            icon={Heart}
            accent={opsKpis.churnAlto > 0 ? "destructive" : "success"}
            tooltip="Clientes com risco de churn alto ou crítico no CS."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/comercial")}>
            <Users className="h-3.5 w-3.5" /> CRM <ChevronRight className="h-3 w-3 opacity-50" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/hub")}>
            <Briefcase className="h-3.5 w-3.5" /> Hub <ChevronRight className="h-3 w-3 opacity-50" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/cs")}>
            <Heart className="h-3.5 w-3.5" /> CS <ChevronRight className="h-3 w-3 opacity-50" />
          </Button>
        </div>
      </div>

      {/* ── Runway alert ── */}
      {runway < 3 && runway !== Infinity && (
        <Card className="p-4 bg-destructive/10 border-destructive/40 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Runway crítico: {runway.toFixed(1)} meses</p>
            <p className="text-sm text-muted-foreground">
              O caixa atual cobre menos de 3 meses no ritmo atual. Considere reduzir custos ou antecipar receitas.
            </p>
          </div>
        </Card>
      )}

      {/* ── Fluxo de caixa + Custos por CC ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 bg-gradient-surface border-border/50">
          <h3 className="font-display text-lg font-semibold mb-4">Fluxo de Caixa Mensal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyArr} {...CHART_STYLE}>
              <defs>
                <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="hsl(150,75%,47%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(150,75%,47%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Legend />
              <Area type="monotone" dataKey="saldo"  stroke="hsl(150,75%,47%)" fill="url(#gSaldo)" name="Saldo acum." strokeWidth={2} />
              <Area type="monotone" dataKey="entrada" stroke="hsl(150,75%,60%)" fill="transparent"   name="Entradas"    strokeWidth={1.5} />
              <Area type="monotone" dataKey="saida"   stroke="hsl(0,70%,55%)"   fill="transparent"   name="Saídas"      strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 bg-gradient-surface border-border/50">
          <h3 className="font-display text-lg font-semibold mb-4">Custos por Centro</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart {...CHART_STYLE}>
              <Pie data={ccArr} dataKey="valor" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {ccArr.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => brl(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1 text-xs">
            {ccArr.slice(0, 6).map((c, i) => (
              <div key={c.name} className="flex justify-between">
                <span className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="tabular-nums ml-2 shrink-0">{brl(c.valor)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Margem % evolução ── */}
      <Card className="p-5 bg-gradient-surface border-border/50">
        <h3 className="font-display text-lg font-semibold mb-4">Evolução da Margem Líquida (%)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyArr} {...CHART_STYLE}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis fontSize={12} unit="%" domain={["auto", "auto"]} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Margem"]} />
            <ReferenceLine y={0}  stroke="hsl(0,70%,55%)"   strokeDasharray="4 2" />
            <ReferenceLine y={30} stroke="hsl(150,75%,47%)" strokeDasharray="4 2"
              label={{ value: "Meta 30%", position: "insideRight", fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="margemPct"
              name="Margem %"
              stroke="hsl(210,75%,60%)"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ── MRR + Resultado mensal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 bg-gradient-surface border-border/50">
          <h3 className="font-display text-lg font-semibold mb-4">Evolução do MRR</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyArr} {...CHART_STYLE}>
              <defs>
                <linearGradient id="gMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="hsl(150,75%,47%)" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(150,75%,47%)" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Bar dataKey="mrr" fill="url(#gMrr)" radius={[6, 6, 0, 0]} name="MRR" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 bg-gradient-surface border-border/50">
          <h3 className="font-display text-lg font-semibold mb-4">Resultado Mensal (R$)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyArr} {...CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <ReferenceLine y={0} stroke="hsl(0,70%,55%)" />
              <Bar
                dataKey="margem"
                name="Resultado"
                fill="hsl(150,75%,47%)"
                radius={[4, 4, 0, 0]}
                label={false}
                isAnimationActive
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Movimentação por banco ── */}
      {bankArr.length > 0 && (
        <Card className="p-5 bg-gradient-surface border-border/50">
          <h3 className="font-display text-lg font-semibold mb-4">Resultado por Banco (entradas − saídas)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bankArr} {...CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <ReferenceLine y={0} stroke="hsl(0,70%,55%)" />
              <Bar dataKey="valor" fill="hsl(150,75%,47%)" radius={[4, 4, 0, 0]} name="Resultado" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
