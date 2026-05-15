import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle, LayoutDashboard, TrendingUp, Clock, Users,
  CalendarCheck, CheckCircle2,
} from "lucide-react";
import { brl, dateBR } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubProject {
  id: string;
  name: string;
  status: string;
  progress_pct: number | null;
  mrr_brl: number | null;
  responsible_commercial: string | null;
  go_live_date: string | null;
  created_at: string;
  portal_link_sent: boolean | null;
  portal_link_sent_at: string | null;
  hub_clients: { name: string } | null;
}

interface HubCheckpoint {
  id: string;
  name: string;
  due_date: string | null;
  status: string;
  hub_projects: { name: string } | null;
}

interface HubPending {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  owner: string;
  hub_projects: { name: string } | null;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  aguardando_revisao_html: "Aguard. revisão HTML",
  dados_extraidos: "Dados extraídos",
  aguardando_validacao: "Aguard. validação",
  portal_criado: "Portal criado",
  link_enviado: "Link enviado",
  aguardando_acesso: "Aguard. acesso",
  onboarding_iniciado: "Onboarding iniciado",
  onboarding_concluido: "Onboarding concluído",
  coleta_informacoes: "Coleta informações",
  em_implantacao: "Em implantação",
  em_validacao: "Em validação",
  aguardando_aprovacao: "Aguard. aprovação",
  go_live: "Go-live",
  ativo: "Ativo",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case "novo":                   return "border-border bg-muted/40 text-muted-foreground";
    case "em_implantacao":         return "border-blue-500/40 bg-blue-500/10 text-blue-500";
    case "em_validacao":           return "border-blue-400/40 bg-blue-400/10 text-blue-400";
    case "go_live":                return "border-green-500/40 bg-green-500/10 text-green-600";
    case "ativo":                  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600";
    case "aguardando_acesso":      return "border-yellow-500/40 bg-yellow-500/10 text-yellow-600";
    case "aguardando_revisao_html":
    case "aguardando_validacao":
    case "aguardando_aprovacao":   return "border-yellow-400/40 bg-yellow-400/10 text-yellow-500";
    case "onboarding_iniciado":    return "border-purple-500/40 bg-purple-500/10 text-purple-500";
    case "onboarding_concluido":   return "border-purple-400/40 bg-purple-400/10 text-purple-400";
    case "coleta_informacoes":     return "border-orange-400/40 bg-orange-400/10 text-orange-500";
    case "portal_criado":
    case "link_enviado":
    case "dados_extraidos":        return "border-sky-400/40 bg-sky-400/10 text-sky-500";
    case "encerrado":              return "border-border bg-muted/20 text-muted-foreground";
    case "pausado":                return "border-border bg-muted/30 text-muted-foreground";
    default:                       return "border-border bg-muted/40 text-muted-foreground";
  }
}

function checkpointBadgeClass(status: string): string {
  switch (status) {
    case "pendente":          return "border-border bg-muted/40 text-muted-foreground";
    case "em_andamento":      return "border-blue-500/40 bg-blue-500/10 text-blue-500";
    case "aguardando_cliente":return "border-yellow-500/40 bg-yellow-500/10 text-yellow-600";
    case "concluido":         return "border-green-500/40 bg-green-500/10 text-green-600";
    case "atrasado":          return "border-destructive/40 bg-destructive/10 text-destructive";
    default:                  return "border-border bg-muted/40 text-muted-foreground";
  }
}

const CHECKPOINT_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguard. cliente",
  concluido: "Concluído",
  atrasado: "Atrasado",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().substring(0, 10);
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().substring(0, 10);
}

function daysSince(dateStr: string): number {
  const then = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HubDashboard() {
  const navigate = useNavigate();

  const [projects, setProjects]       = useState<HubProject[]>([]);
  const [checkpoints, setCheckpoints] = useState<HubCheckpoint[]>([]);
  const [pending, setPending]         = useState<HubPending[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    (async () => {
      const today = isoToday();
      const in7   = addDays(7);

      const [
        { data: projData },
        { data: cpData },
        { data: pendingData },
      ] = await Promise.all([
        supabase
          .from("hub_projects")
          .select("id, name, status, progress_pct, mrr_brl, responsible_commercial, go_live_date, created_at, portal_link_sent, portal_link_sent_at, hub_clients(name)")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("hub_checkpoints")
          .select("id, name, due_date, status, hub_projects(name)")
          .gte("due_date", today)
          .lte("due_date", in7)
          .order("due_date"),
        supabase
          .from("hub_pending")
          .select("id, title, due_date, status, owner, hub_projects(name)")
          .eq("status", "pendente")
          .lt("due_date", today),
      ]);

      setProjects((projData as any) || []);
      setCheckpoints((cpData as any) || []);
      setPending((pendingData as any) || []);
      setLoading(false);
    })();
  }, []);

  // ── KPIs
  const activeStatuses = ["novo","aguardando_revisao_html","dados_extraidos","aguardando_validacao","portal_criado","link_enviado","aguardando_acesso","onboarding_iniciado","onboarding_concluido","coleta_informacoes","em_implantacao","em_validacao","aguardando_aprovacao","go_live","ativo"];
  const projetosAtivos  = projects.filter(p => activeStatuses.includes(p.status)).length;
  const mrrTotal        = projects.filter(p => activeStatuses.includes(p.status)).reduce((s, p) => s + Number(p.mrr_brl ?? 0), 0);
  const emImplantacao   = projects.filter(p => p.status === "em_implantacao").length;
  const aguardandoCliente = projects.filter(p => ["aguardando_acesso","coleta_informacoes","aguardando_aprovacao"].includes(p.status)).length;

  // ── Alerts
  const today = isoToday();
  const in7   = addDays(7);

  const goLiveAlert = projects.filter(p =>
    p.go_live_date && p.go_live_date >= today && p.go_live_date <= in7
  );
  const portalPendingAlert = projects.filter(p =>
    p.status === "aguardando_acesso" &&
    p.portal_link_sent_at &&
    daysSince(p.portal_link_sent_at) > 3
  );

  const hasAlerts = goLiveAlert.length > 0 || portalPendingAlert.length > 0 || pending.length > 0;

  if (loading) return <div className="text-muted-foreground p-6">Carregando Hub...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hub Admin"
        description="Central de implantações e gestão de clientes SolicitAí"
        actions={
          <Button variant="outline" onClick={() => navigate("/hub/projetos")}>
            Ver todos os projetos
          </Button>
        }
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Projetos ativos"
          value={String(projetosAtivos)}
          icon={LayoutDashboard}
          accent="primary"
          tooltip="Todos os projetos exceto encerrados e pausados."
        />
        <KpiCard
          label="MRR total"
          value={brl(mrrTotal)}
          icon={TrendingUp}
          accent="success"
          tooltip="Soma do MRR de todos os projetos ativos."
        />
        <KpiCard
          label="Em implantação"
          value={String(emImplantacao)}
          icon={Clock}
          accent="warning"
          tooltip="Projetos com status 'Em implantação'."
        />
        <KpiCard
          label="Aguardando cliente"
          value={String(aguardandoCliente)}
          icon={Users}
          accent={aguardandoCliente > 0 ? "warning" : "primary"}
          tooltip="Projetos em aguardando_acesso, coleta_informacoes ou aguardando_aprovacao."
        />
      </div>

      {/* ── Alerts ── */}
      {hasAlerts && (
        <Card className="p-4 bg-gradient-surface border-border/50 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="font-semibold text-sm">Alertas</h3>
          </div>

          {goLiveAlert.map(p => (
            <div
              key={p.id}
              className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm bg-yellow-500/10 border border-yellow-500/30 text-yellow-600"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Go-live próximo: <strong>{p.hub_clients?.name ?? "—"} / {p.name}</strong> em {dateBR(p.go_live_date!)}
              </span>
            </div>
          ))}

          {portalPendingAlert.map(p => (
            <div
              key={p.id}
              className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm bg-yellow-500/10 border border-yellow-500/30 text-yellow-600"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Aguardando acesso há mais de 3 dias: <strong>{p.hub_clients?.name ?? "—"} / {p.name}</strong>
              </span>
            </div>
          ))}

          {pending.map(pd => (
            <div
              key={pd.id}
              className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm bg-destructive/10 border border-destructive/30 text-destructive"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Pendência vencida ({pd.owner}){pd.hub_projects ? ` — ${pd.hub_projects.name}` : ""}: {pd.title}
                {pd.due_date ? ` (venceu ${dateBR(pd.due_date)})` : ""}
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* ── Checkpoints da semana ── */}
      {checkpoints.length > 0 && (
        <Card className="p-5 bg-gradient-surface border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Checkpoints da semana</h3>
          </div>
          <div className="space-y-2">
            {checkpoints.map(cp => (
              <div
                key={cp.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-border/40 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{cp.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {cp.hub_projects?.name ?? "—"}
                    {cp.due_date ? ` · ${dateBR(cp.due_date)}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className={`shrink-0 text-xs ${checkpointBadgeClass(cp.status)}`}>
                  {CHECKPOINT_STATUS_LABELS[cp.status] ?? cp.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Projects table ── */}
      <Card className="p-5 bg-gradient-surface border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Projetos recentes</h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/hub/projetos")}>
            Ver todos
          </Button>
        </div>

        {projects.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Nenhum projeto encontrado. Crie o primeiro.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Go-live previsto</TableHead>
                <TableHead className="w-20">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.hub_clients?.name ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusBadgeClass(p.status)}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, p.progress_pct ?? 0))}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground w-8 shrink-0">
                        {p.progress_pct ?? 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.responsible_commercial ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.go_live_date ? dateBR(p.go_live_date) : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/hub/projetos/${p.id}`)}
                    >
                      Abrir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
