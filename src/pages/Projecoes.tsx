import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Plus, ChevronDown, ChevronUp, Target, TrendingUp, TrendingDown } from "lucide-react";
import { brl } from "@/lib/format";
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { KpiCard } from "@/components/KpiCard";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface Params {
  mrr_growth: number;
  churn: number;
  new_clients_month: number;
  avg_ticket: number;
  cost_growth: number;
  fx_projection: number;
  inflation: number;
  meta_faturamento: number;
  meta_clientes: number;
  meta_margem: number;
}

const DEFAULT_PARAMS: Params = {
  mrr_growth: 5, churn: 2, new_clients_month: 1, avg_ticket: 1600,
  cost_growth: 3, fx_projection: 5.30, inflation: 4,
  meta_faturamento: 0, meta_clientes: 0, meta_margem: 30,
};

// Per-month overrides: index 0 = month+1, index 11 = month+12
type MonthOverrides = { receita?: number; custo?: number }[];

function mkMonthOverrides(): MonthOverrides {
  return Array.from({ length: 12 }, () => ({}));
}

export default function Projecoes() {
  const { canWrite } = useAuth();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [monthOverrides, setMonthOverrides] = useState<MonthOverrides>(mkMonthOverrides());
  const [baseline, setBaseline] = useState({ mrr: 0, costs: 0 });
  const [baselineMonths, setBaselineMonths] = useState(3);
  const [showMonthTable, setShowMonthTable] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: sc }, { data: tx }] = await Promise.all([
        supabase.from("projection_scenarios").select("*").order("name"),
        supabase.from("transactions").select("date,type,amount_brl"),
      ]);
      setScenarios(sc || []);
      const def = sc?.find((s: any) => s.is_default) || sc?.[0];
      if (def) {
        setActiveId(def.id);
        const loaded = { ...DEFAULT_PARAMS, ...(def.params as unknown as Partial<Params>) };
        setParams(loaded);
        if ((def.params as any)?.month_overrides) {
          setMonthOverrides((def.params as any).month_overrides);
        }
      }
      // Build baseline from last N months
      if (tx && tx.length > 0) {
        const now = new Date();
        const cutoff = new Date(now.getFullYear(), now.getMonth() - baselineMonths, 1).toISOString().substring(0, 10);
        const recent = tx.filter((t: any) => t.date >= cutoff);
        const inflows = recent.filter((t: any) => t.type === "entrada").reduce((s: number, t: any) => s + Number(t.amount_brl), 0);
        const outflows = recent.filter((t: any) => t.type === "saida").reduce((s: number, t: any) => s + Number(t.amount_brl), 0);
        setBaseline({ mrr: inflows / baselineMonths, costs: outflows / baselineMonths });
      }
    })();
  }, [baselineMonths]);

  const projection = useMemo(() => {
    const arr: any[] = [];
    let mrr = baseline.mrr;
    let costs = baseline.costs;
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      mrr = mrr * (1 + params.mrr_growth / 100) * (1 - params.churn / 100)
            + params.new_clients_month * params.avg_ticket;
      costs = costs * (1 + params.cost_growth / 100);
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const ovr = monthOverrides[i] || {};
      const receitaFinal = ovr.receita !== undefined ? ovr.receita : Math.round(mrr);
      const custoFinal = ovr.custo !== undefined ? ovr.custo : Math.round(costs);
      arr.push({
        mes: `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        receita: receitaFinal,
        custos: custoFinal,
        lucro: receitaFinal - custoFinal,
        overridden: ovr.receita !== undefined || ovr.custo !== undefined,
      });
    }
    return arr;
  }, [params, baseline, monthOverrides]);

  const totalRev = projection.reduce((s, p) => s + p.receita, 0);
  const totalCost = projection.reduce((s, p) => s + p.custos, 0);
  const totalProfit = totalRev - totalCost;
  const margem12m = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

  const lastMonthProj = projection[projection.length - 1];
  const projectedMonthlyRev = lastMonthProj?.receita || 0;
  const metaFat = params.meta_faturamento || 0;
  const metaClientes = params.meta_clientes || 0;
  const metaMargem = params.meta_margem || 30;
  const progressFat = metaFat > 0 ? Math.min((projectedMonthlyRev / metaFat) * 100, 100) : 0;
  const estimatedClients = params.avg_ticket > 0 ? Math.round(projectedMonthlyRev / params.avg_ticket) : 0;
  const progressClients = metaClientes > 0 ? Math.min((estimatedClients / metaClientes) * 100, 100) : 0;
  const progressMargem = metaMargem > 0 ? Math.min((margem12m / metaMargem) * 100, 100) : 0;

  const setP = <K extends keyof Params>(k: K) => (v: number) =>
    setParams(prev => ({ ...prev, [k]: v }));

  const setOvr = (i: number, field: "receita" | "custo", raw: string) => {
    const v = raw === "" ? undefined : parseFloat(raw);
    setMonthOverrides(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: v };
      return next;
    });
  };

  const clearOverrides = () => setMonthOverrides(mkMonthOverrides());

  const saveScenario = async () => {
    const paramsToSave = { ...params, month_overrides: monthOverrides };
    if (!activeId) {
      const name = newScenarioName || "Base";
      const { data, error } = await supabase.from("projection_scenarios").insert({
        name, params: paramsToSave as any, is_default: true,
      }).select().single();
      if (error) toast.error(error.message);
      else { setScenarios([data]); setActiveId(data.id); setNewScenarioName(""); toast.success("Cenário criado"); }
      return;
    }
    const { error } = await supabase.from("projection_scenarios").update({ params: paramsToSave as any }).eq("id", activeId);
    if (error) toast.error(error.message); else toast.success("Cenário salvo");
  };

  const createNewScenario = async () => {
    const name = newScenarioName.trim();
    if (!name) { toast.error("Informe um nome para o cenário"); return; }
    const paramsToSave = { ...params, month_overrides: monthOverrides };
    const { data, error } = await supabase.from("projection_scenarios").insert({
      name, params: paramsToSave as any, is_default: scenarios.length === 0,
    }).select().single();
    if (error) toast.error(error.message);
    else { setScenarios([...scenarios, data]); setActiveId(data.id); setNewScenarioName(""); toast.success("Novo cenário criado"); }
  };

  const PARAM_FIELDS = [
    { k: "mrr_growth", label: "Crescimento MRR/mês", suffix: "%", step: "0.5", min: -20, max: 50 },
    { k: "churn", label: "Churn mensal", suffix: "%", step: "0.5", min: 0, max: 30 },
    { k: "new_clients_month", label: "Novos clientes/mês", suffix: "", step: "1", min: 0, max: 50 },
    { k: "avg_ticket", label: "Ticket médio (R$)", suffix: "", step: "100", min: 0, max: 50000 },
    { k: "cost_growth", label: "Crescimento custos/mês", suffix: "%", step: "0.5", min: 0, max: 20 },
    { k: "fx_projection", label: "Câmbio USD/BRL projetado", suffix: "", step: "0.01", min: 4, max: 10 },
    { k: "inflation", label: "Inflação anual", suffix: "%", step: "0.5", min: 0, max: 20 },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projeções"
        description="Cenários paramétricos para 12 meses, com ajuste mensal"
        actions={
          <div className="flex gap-2 flex-wrap items-center">
            {scenarios.length > 0 && (
              <Select value={activeId} onValueChange={v => {
                setActiveId(v);
                const s = scenarios.find(x => x.id === v);
                if (s) {
                  setParams({ ...DEFAULT_PARAMS, ...(s.params as unknown as Partial<Params>) });
                  setMonthOverrides((s.params as any)?.month_overrides || mkMonthOverrides());
                }
              }}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Cenário" /></SelectTrigger>
                <SelectContent>{scenarios.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {canWrite && (
              <Button onClick={saveScenario} className="bg-gradient-brand text-primary-foreground">
                <Save className="h-4 w-4 mr-1" />{activeId ? "Salvar" : "Criar cenário"}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Parâmetros */}
        <Card className="p-5 bg-gradient-surface border-border/50 lg:col-span-1 space-y-4">
          <h3 className="font-display text-lg">Parâmetros</h3>

          {/* Baseline */}
          <div className="bg-muted/40 rounded-lg p-3 space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Baseline (histórico)</Label>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Últimos</Label>
              <Input
                type="number" min={1} max={12} step={1}
                className="w-16 h-8 text-sm"
                value={baselineMonths}
                onChange={e => setBaselineMonths(parseInt(e.target.value) || 3)}
              />
              <Label className="text-xs">meses</Label>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>MRR base: <span className="font-semibold text-foreground">{brl(baseline.mrr)}/mês</span></p>
              <p>Custos base: <span className="font-semibold text-foreground">{brl(baseline.costs)}/mês</span></p>
            </div>
          </div>

          {/* Number inputs for each param */}
          {PARAM_FIELDS.map(({ k, label, suffix, step, min, max }) => (
            <div key={k} className="flex items-center gap-2">
              <Label className="text-sm flex-1 min-w-0">{label}</Label>
              <div className="flex items-center gap-1 shrink-0">
                <Input
                  type="number"
                  step={step}
                  min={min}
                  max={max}
                  className="w-24 h-8 text-sm text-right"
                  value={(params as any)[k]}
                  onChange={e => setP(k as keyof Params)(parseFloat(e.target.value) || 0)}
                />
                {suffix && <span className="text-sm text-muted-foreground w-5">{suffix}</span>}
              </div>
            </div>
          ))}

          {/* Metas */}
          <div className="border-t border-border/50 pt-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Metas (mês 12)
            </h4>
            {[
              { k: "meta_faturamento", label: "Faturamento mensal (R$)", step: "500" },
              { k: "meta_clientes", label: "Número de clientes", step: "1" },
              { k: "meta_margem", label: "Margem líquida (%)", step: "1" },
            ].map(({ k, label, step }) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  type="number" step={step}
                  value={(params as any)[k] || ""}
                  placeholder="0"
                  onChange={e => setP(k as keyof Params)(parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>

          {/* Novo cenário */}
          {canWrite && (
            <div className="border-t border-border/50 pt-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Salvar como novo cenário</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do cenário"
                  value={newScenarioName}
                  onChange={e => setNewScenarioName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={createNewScenario}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Resultados */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="Receita 12m" value={brl(totalRev)} icon={TrendingUp} accent="success" />
            <KpiCard label="Custo 12m" value={brl(totalCost)} icon={TrendingDown} accent="destructive" />
            <KpiCard label={`Lucro 12m (${margem12m.toFixed(0)}%)`} value={brl(totalProfit)} icon={Target} accent={totalProfit >= 0 ? "success" : "destructive"} />
          </div>

          {/* Metas progress */}
          {(metaFat > 0 || metaClientes > 0 || metaMargem > 0) && (
            <Card className="p-4 bg-gradient-surface border-border/50">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Progresso das Metas (mês 12)
              </h3>
              <div className="space-y-3">
                {metaFat > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Faturamento</span>
                      <span className="font-mono">{brl(projectedMonthlyRev)} / {brl(metaFat)} ({progressFat.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-success transition-all" style={{ width: `${progressFat}%` }} />
                    </div>
                  </div>
                )}
                {metaClientes > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Clientes</span>
                      <span className="font-mono">~{estimatedClients} / {metaClientes} ({progressClients.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressClients}%` }} />
                    </div>
                  </div>
                )}
                {metaMargem > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Margem líquida</span>
                      <span className="font-mono">{margem12m.toFixed(1)}% / {metaMargem}% ({progressMargem.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${margem12m >= metaMargem ? "bg-success" : "bg-warning"}`} style={{ width: `${progressMargem}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Gráfico de área */}
          <Card className="p-5 bg-gradient-surface border-border/50">
            <h3 className="font-display text-lg mb-3">Projeção 12 meses</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={projection}>
                <defs>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(150,75%,47%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(150,75%,47%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0,70%,55%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(0,70%,55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend />
                <Area dataKey="receita" name="Receita" stroke="hsl(150,75%,47%)" fill="url(#gRec)" strokeWidth={2} />
                <Area dataKey="custos" name="Custos" stroke="hsl(0,70%,55%)" fill="url(#gCus)" strokeWidth={2} />
                <Line type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(45,100%,60%)" strokeWidth={2} strokeDasharray="4 2" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Tabela mês a mês */}
          <Card className="p-4 bg-gradient-surface border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Ajuste por Mês (override manual)</h3>
              <div className="flex gap-2">
                {monthOverrides.some(o => o.receita !== undefined || o.custo !== undefined) && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={clearOverrides}>
                    Limpar overrides
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowMonthTable(v => !v)}>
                  {showMonthTable ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                  {showMonthTable ? "Ocultar" : "Mostrar"}
                </Button>
              </div>
            </div>
            {!showMonthTable && (
              <p className="text-xs text-muted-foreground">Clique em "Mostrar" para definir receita e custo manualmente para cada mês.</p>
            )}
            {showMonthTable && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">Mês</th>
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">Receita projetada</th>
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">Override receita</th>
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">Custo projetado</th>
                      <th className="text-left py-1.5 text-muted-foreground font-medium">Override custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.map((row, i) => (
                      <tr key={i} className={`border-b border-border/20 ${row.overridden ? "bg-primary/5" : ""}`}>
                        <td className="py-1.5 pr-3 font-medium">{row.mes}</td>
                        <td className="py-1.5 pr-3 tabular-nums text-success">
                          {monthOverrides[i]?.receita !== undefined ? (
                            <span className="line-through text-muted-foreground">{brl(Math.round(row.receita))}</span>
                          ) : brl(row.receita)}
                        </td>
                        <td className="py-1.5 pr-3">
                          <Input
                            type="number"
                            className="h-7 w-28 text-xs"
                            placeholder="manual..."
                            value={monthOverrides[i]?.receita ?? ""}
                            onChange={e => setOvr(i, "receita", e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 pr-3 tabular-nums text-destructive">
                          {monthOverrides[i]?.custo !== undefined ? (
                            <span className="line-through text-muted-foreground">{brl(Math.round(row.custos))}</span>
                          ) : brl(row.custos)}
                        </td>
                        <td className="py-1.5">
                          <Input
                            type="number"
                            className="h-7 w-28 text-xs"
                            placeholder="manual..."
                            value={monthOverrides[i]?.custo ?? ""}
                            onChange={e => setOvr(i, "custo", e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
