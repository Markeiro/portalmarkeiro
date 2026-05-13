import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, DollarSign, MousePointer, Eye, Target, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Stat from "@/components/ui/Stat";
import { brl, pct } from "@/lib/utils";
import type { Campanha, Cliente } from "@/types";

function useClientes() {
  return useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes" as never).select("id, nome").order("nome");
      return (data ?? []) as Cliente[];
    },
  });
}

function useCampanhas(clienteId: string) {
  return useQuery<Campanha[]>({
    queryKey: ["campanhas", clienteId],
    queryFn: async () => {
      let q = supabase.from("campanhas" as never).select("*").order("nome");
      if (clienteId !== "todos") q = q.eq("cliente_id", clienteId) as typeof q;
      const { data } = await q;
      return (data ?? []) as Campanha[];
    },
  });
}

function useMetricas(campanhaId: string) {
  return useQuery({
    queryKey: ["metricas", campanhaId],
    queryFn: async () => {
      if (campanhaId === "todos") return [];
      const { data } = await supabase
        .from("metricas_snapshots" as never)
        .select("*")
        .eq("campanha_id", campanhaId)
        .order("data", { ascending: true })
        .limit(30);
      return data ?? [];
    },
    enabled: campanhaId !== "todos",
  });
}

const mockData = Array.from({ length: 14 }, (_, i) => ({
  data: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  gasto: Math.random() * 500 + 200,
  leads: Math.floor(Math.random() * 20 + 5),
  impressoes: Math.floor(Math.random() * 10000 + 3000),
  cliques: Math.floor(Math.random() * 300 + 50),
}));

export default function Metricas() {
  const [clienteId, setClienteId] = useState("todos");
  const [campanhaId, setCampanhaId] = useState("todos");

  const { data: clientes = [] } = useClientes();
  const { data: campanhas = [] } = useCampanhas(clienteId);
  const { data: metricas = [] } = useMetricas(campanhaId);

  const chartData = metricas.length > 0 ? metricas : mockData;

  const totalGasto = (chartData as { gasto: number }[]).reduce((acc, d) => acc + d.gasto, 0);
  const totalLeads = (chartData as { leads: number }[]).reduce((acc, d) => acc + d.leads, 0);
  const totalImpress = (chartData as { impressoes: number }[]).reduce((acc, d) => acc + d.impressoes, 0);
  const totalCliques = (chartData as { cliques: number }[]).reduce((acc, d) => acc + d.cliques, 0);
  const cpl = totalLeads > 0 ? totalGasto / totalLeads : 0;
  const ctr = totalImpress > 0 ? (totalCliques / totalImpress) * 100 : 0;

  const isDemo = metricas.length === 0;

  return (
    <div>
      <PageHeader
        title="Métricas"
        subtitle="Performance de campanhas em tempo real"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select
          value={clienteId}
          onValueChange={(v) => { setClienteId(v); setCampanhaId("todos"); }}
          options={[{ value: "todos", label: "Todos os clientes" }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]}
          className="w-52"
        />
        <Select
          value={campanhaId}
          onValueChange={setCampanhaId}
          options={[{ value: "todos", label: "Todas as campanhas" }, ...campanhas.map((c) => ({ value: c.id, label: c.nome }))]}
          disabled={clienteId === "todos"}
          className="w-64"
        />
      </div>

      {isDemo && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Exibindo dados de demonstração. Conecte as APIs do Meta Ads e Google Ads em{" "}
            <strong>Configurações → Integrações</strong> para ver dados reais.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <Stat label="Gasto total" value={brl(totalGasto)} icon={DollarSign} iconColor="text-danger" />
        <Stat label="Leads" value={totalLeads} icon={Target} iconColor="text-success" />
        <Stat label="Impressões" value={totalImpress.toLocaleString()} icon={Eye} iconColor="text-info" />
        <Stat label="Cliques" value={totalCliques.toLocaleString()} icon={MousePointer} iconColor="text-copper" />
        <Stat label="CPL" value={brl(cpl)} icon={TrendingUp} iconColor="text-brand" />
        <Stat label="CTR" value={pct(ctr)} icon={BarChart3} iconColor="text-charcoal-mid" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads chart */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por dia</CardTitle>
            {isDemo && <span className="text-xs text-muted bg-cream px-2 py-0.5 rounded">demo</span>}
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="leads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4B6040" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4B6040" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D4BC" />
              <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#7A6A58" }} />
              <YAxis tick={{ fontSize: 11, fill: "#7A6A58" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E0D4BC", fontSize: 12 }} />
              <Area type="monotone" dataKey="leads" stroke="#4B6040" fill="url(#leads)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Spend chart */}
        <Card>
          <CardHeader>
            <CardTitle>Gasto diário (R$)</CardTitle>
            {isDemo && <span className="text-xs text-muted bg-cream px-2 py-0.5 rounded">demo</span>}
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D4BC" />
              <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#7A6A58" }} />
              <YAxis tick={{ fontSize: 11, fill: "#7A6A58" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E0D4BC", fontSize: 12 }} formatter={(v) => [brl(Number(v)), "Gasto"]} />
              <Bar dataKey="gasto" fill="#B87333" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <Card className="border-dashed border-2 border-cream-medium">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <span className="font-bold text-blue-600 text-sm">f</span>
            </div>
            <div>
              <p className="font-semibold text-charcoal">Meta Ads API</p>
              <p className="text-xs text-muted">Conectar conta de anúncios</p>
            </div>
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pendente</span>
          </div>
        </Card>
        <Card className="border-dashed border-2 border-cream-medium">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <span className="font-bold text-red-600 text-sm">G</span>
            </div>
            <div>
              <p className="font-semibold text-charcoal">Google Ads API</p>
              <p className="text-xs text-muted">Conectar conta de anúncios</p>
            </div>
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pendente</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
