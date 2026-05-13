import { useQuery } from "@tanstack/react-query";
import { Users, Megaphone, TrendingUp, DollarSign, Activity, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import Stat from "@/components/ui/Stat";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { brl } from "@/lib/utils";
import { PageSpinner } from "@/components/ui/Spinner";
import type { Cliente, Campanha } from "@/types";

function useStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [{ count: totalClientes }, { count: campanhasAtivas }, { data: clientes }] = await Promise.all([
        supabase.from("clientes" as never).select("*", { count: "exact", head: true }),
        supabase.from("campanhas" as never).select("*", { count: "exact", head: true }).eq("status", "ativa"),
        supabase.from("clientes" as never).select("mrr, status").eq("status", "ativo"),
      ]);
      const mrr = (clientes as { mrr: number }[] | null)?.reduce((acc, c) => acc + (c.mrr || 0), 0) ?? 0;
      return { totalClientes: totalClientes ?? 0, campanhasAtivas: campanhasAtivas ?? 0, mrr };
    },
  });
}

function useRecentClientes() {
  return useQuery({
    queryKey: ["dashboard-clientes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes" as never)
        .select("id, nome, segmento, status, plano, mrr")
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as Cliente[];
    },
  });
}

function useRecentCampanhas() {
  return useQuery({
    queryKey: ["dashboard-campanhas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("campanhas" as never)
        .select("id, nome, plataforma, status, orcamento_mensal")
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as Campanha[];
    },
  });
}

const statusBadge: Record<string, "success" | "warning" | "muted" | "info"> = {
  ativo: "success", onboarding: "info", pausado: "warning", inativo: "muted",
  ativa: "success", rascunho: "muted", encerrada: "muted",
};

const platformLabel: Record<string, string> = {
  meta: "Meta Ads", google: "Google Ads", tiktok: "TikTok", linkedin: "LinkedIn", organico: "Orgânico",
};

export default function Dashboard() {
  const { user } = useAuth();
  const stats = useStats();
  const clientesQ = useRecentClientes();
  const campanhasQ = useRecentCampanhas();

  const name = user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "equipe";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  if (stats.isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${name} 👋`}
        subtitle="Aqui está um resumo da operação hoje"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <Stat label="Clientes ativos" value={stats.data?.totalClientes ?? 0} icon={Users} trend={5} sub="vs. mês anterior" />
        <Stat label="Campanhas ativas" value={stats.data?.campanhasAtivas ?? 0} icon={Megaphone} iconColor="text-copper" trend={2} />
        <Stat label="MRR total" value={brl(stats.data?.mrr ?? 0)} icon={DollarSign} iconColor="text-success" trend={8} />
        <Stat label="Leads este mês" value="—" icon={TrendingUp} iconColor="text-info" sub="Integração em breve" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes recentes</CardTitle>
            <Link to="/clientes" className="text-xs text-brand hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          {clientesQ.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-cream rounded-lg animate-pulse" />
              ))}
            </div>
          ) : clientesQ.data?.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">Nenhum cliente cadastrado ainda</p>
          ) : (
            <div className="space-y-2">
              {clientesQ.data?.map((c) => (
                <Link key={c.id} to={`/clientes/${c.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-cream transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                      <span className="text-brand text-xs font-bold">{c.nome[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">{c.nome}</p>
                      <p className="text-xs text-muted truncate">{c.segmento}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-medium text-charcoal">{brl(c.mrr)}</span>
                    <Badge variant={statusBadge[c.status] ?? "default"}>{c.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Campanhas recentes</CardTitle>
            <Link to="/campanhas" className="text-xs text-brand hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          {campanhasQ.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-cream rounded-lg animate-pulse" />
              ))}
            </div>
          ) : campanhasQ.data?.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">Nenhuma campanha cadastrada ainda</p>
          ) : (
            <div className="space-y-2">
              {campanhasQ.data?.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-cream transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-copper/10 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-copper" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">{c.nome}</p>
                      <p className="text-xs text-muted">{platformLabel[c.plataforma] ?? c.plataforma}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-medium text-charcoal">{brl(c.orcamento_mensal)}/mês</span>
                    <Badge variant={statusBadge[c.status] ?? "default"}>{c.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
