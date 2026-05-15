import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, FolderKanban, Heart } from "lucide-react";
import { brl, dateBR } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubClient {
  name: string;
  responsible: string | null;
  email: string | null;
  whatsapp: string | null;
}

interface HubProject {
  id: string;
  name: string;
  solution_type: string | null;
  status: string;
  progress_pct: number | null;
  mrr_brl: number | null;
  responsible_commercial: string | null;
  responsible_technical: string | null;
  responsible_cs: string | null;
  go_live_date: string | null;
  portal_link_sent: boolean | null;
  created_at: string;
  hub_clients: HubClient | null;
}

// ─── Status metadata ─────────────────────────────────────────────────────────

const ALL_STATUSES = [
  "novo",
  "aguardando_revisao_html",
  "dados_extraidos",
  "aguardando_validacao",
  "portal_criado",
  "link_enviado",
  "aguardando_acesso",
  "onboarding_iniciado",
  "onboarding_concluido",
  "coleta_informacoes",
  "em_implantacao",
  "em_validacao",
  "aguardando_aprovacao",
  "go_live",
  "ativo",
  "pausado",
  "encerrado",
] as const;

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

interface CsHealth {
  hub_project_id: string;
  health_score: number;
  churn_risk: string;
}

function healthColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HubProjetos() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<HubProject[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, CsHealth>>({});
  const [loading, setLoading]   = useState(true);

  // Filter state
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("todos");
  const [respFilter, setRespFilter]       = useState("todos");

  useEffect(() => {
    (async () => {
      const [{ data }, { data: hd }] = await Promise.all([
        supabase
          .from("hub_projects")
          .select("id, name, solution_type, status, progress_pct, mrr_brl, responsible_commercial, responsible_technical, responsible_cs, go_live_date, portal_link_sent, created_at, hub_clients(name, responsible, email, whatsapp)")
          .order("created_at", { ascending: false }),
        (supabase as any).from("cs_health").select("hub_project_id, health_score, churn_risk"),
      ]);

      setProjects((data as any) || []);
      const map: Record<string, CsHealth> = {};
      ((hd as any) || []).forEach((h: CsHealth) => { map[h.hub_project_id] = h; });
      setHealthMap(map);
      setLoading(false);
    })();
  }, []);

  // ── Summary metrics (across ALL loaded projects)
  const totalProjetos = projects.length;
  const mrrTotal      = projects.reduce((s, p) => s + Number(p.mrr_brl ?? 0), 0);
  const avgProgress   = projects.length
    ? projects.reduce((s, p) => s + Number(p.progress_pct ?? 0), 0) / projects.length
    : 0;

  // ── Dynamic responsible options
  const responsibleOptions = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => {
      if (p.responsible_commercial) set.add(p.responsible_commercial);
      if (p.responsible_technical)  set.add(p.responsible_technical);
      if (p.responsible_cs)         set.add(p.responsible_cs);
    });
    return Array.from(set).sort();
  }, [projects]);

  // ── Client-side filtering
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projects.filter(p => {
      const matchSearch = !q ||
        p.hub_clients?.name.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q);

      const matchStatus = statusFilter === "todos" || p.status === statusFilter;

      const matchResp = respFilter === "todos" ||
        p.responsible_commercial === respFilter ||
        p.responsible_technical  === respFilter ||
        p.responsible_cs         === respFilter;

      return matchSearch && matchStatus && matchResp;
    });
  }, [projects, search, statusFilter, respFilter]);

  if (loading) return <div className="text-muted-foreground p-6">Carregando projetos...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projetos & Clientes"
        description="Lista completa de projetos em andamento e concluídos"
        actions={
          <Button
            className="bg-gradient-brand text-primary-foreground"
            onClick={() => navigate("/hub/projetos/novo")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo Projeto
          </Button>
        }
      />

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-surface border-border/50">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">Total de projetos</p>
          <p className="text-2xl font-display font-semibold">{totalProjetos}</p>
        </Card>
        <Card className="p-4 bg-gradient-surface border-border/50">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">MRR total</p>
          <p className="text-2xl font-display font-semibold tabular-nums">{brl(mrrTotal)}</p>
        </Card>
        <Card className="p-4 bg-gradient-surface border-border/50">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">Média de progresso</p>
          <p className="text-2xl font-display font-semibold tabular-nums">{avgProgress.toFixed(1)}%</p>
        </Card>
      </div>

      {/* ── Filters ── */}
      <Card className="p-4 bg-gradient-surface border-border/50">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou projeto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {ALL_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Responsible filter */}
          <Select value={respFilter} onValueChange={setRespFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {responsibleOptions.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* ── Table or empty state ── */}
      {filtered.length === 0 ? (
        <Card className="p-12 bg-gradient-surface border-border/50 flex flex-col items-center gap-4">
          <FolderKanban className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm text-center">
            {projects.length === 0
              ? "Nenhum projeto encontrado. Crie o primeiro."
              : "Nenhum projeto corresponde aos filtros."}
          </p>
          {projects.length === 0 && (
            <Button
              className="bg-gradient-brand text-primary-foreground"
              onClick={() => navigate("/hub/projetos/novo")}
            >
              <Plus className="h-4 w-4 mr-1" />
              Novo Projeto
            </Button>
          )}
        </Card>
      ) : (
        <Card className="bg-gradient-surface border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Tipo de Solução</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Go-live</TableHead>
                <TableHead>Portal</TableHead>
                <TableHead className="w-16">Saúde</TableHead>
                <TableHead className="w-20">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  {/* Cliente */}
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm leading-tight">
                        {p.hub_clients?.name ?? "—"}
                      </p>
                      {p.hub_clients?.responsible && (
                        <p className="text-xs text-muted-foreground">{p.hub_clients.responsible}</p>
                      )}
                    </div>
                  </TableCell>

                  {/* Projeto */}
                  <TableCell className="max-w-[180px]">
                    <p className="truncate text-sm">{p.name}</p>
                  </TableCell>

                  {/* Tipo de Solução */}
                  <TableCell className="text-sm text-muted-foreground">
                    {p.solution_type ?? "—"}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge variant="outline" className={`text-xs whitespace-nowrap ${statusBadgeClass(p.status)}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </TableCell>

                  {/* MRR */}
                  <TableCell className="tabular-nums text-sm">
                    {p.mrr_brl != null ? brl(p.mrr_brl) : "—"}
                  </TableCell>

                  {/* Progresso */}
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[90px]">
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

                  {/* Go-live */}
                  <TableCell className="text-sm">
                    {p.go_live_date ? dateBR(p.go_live_date) : "—"}
                  </TableCell>

                  {/* Portal */}
                  <TableCell>
                    {p.portal_link_sent ? (
                      <span className="text-emerald-600 text-xs font-medium">Enviado</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>

                  {/* Saúde CS */}
                  <TableCell>
                    {healthMap[p.id] ? (
                      <div
                        className="flex items-center gap-1.5 cursor-pointer"
                        title={`Saúde: ${healthMap[p.id].health_score} | Churn: ${healthMap[p.id].churn_risk}`}
                        onClick={() => navigate("/cs")}
                      >
                        <Heart
                          className="h-3.5 w-3.5 fill-current"
                          style={{ color: healthColor(healthMap[p.id].health_score) }}
                        />
                        <span
                          className="text-xs tabular-nums font-semibold"
                          style={{ color: healthColor(healthMap[p.id].health_score) }}
                        >
                          {healthMap[p.id].health_score}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </TableCell>

                  {/* Ação */}
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
        </Card>
      )}
    </div>
  );
}
