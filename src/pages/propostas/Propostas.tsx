import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { brl, dateBR } from "@/lib/format";
import {
  FileText,
  MessageSquare,
  CheckCircle2,
  PercentIcon,
  ExternalLink,
  FolderPlus,
  Plus,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProposalStatus =
  | "rascunho"
  | "enviada"
  | "em_negociacao"
  | "aprovada"
  | "recusada";

interface Proposal {
  id: string;
  created_at: string;
  client_name: string | null;
  client_company: string;
  client_email: string | null;
  client_phone: string | null;
  project_name: string;
  solution_type: string | null;
  problem_description: string | null;
  solution_description: string | null;
  scope: string | null;
  integrations: string | null;
  deliverables: string | null;
  timeline_weeks: number | null;
  setup_value_brl: number | null;
  mrr_brl: number | null;
  contract_months: number | null;
  responsible: string | null;
  status: ProposalStatus;
  sent_at: string | null;
  responded_at: string | null;
  deal_id: string | null;
  hub_project_id: string | null;
  html_content: string | null;
  notes: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS: { value: ProposalStatus | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "aprovada", label: "Aprovada" },
  { value: "recusada", label: "Recusada" },
];

const STATUS_COLORS: Record<ProposalStatus, string> = {
  rascunho: "bg-muted text-muted-foreground border-muted-foreground/30",
  enviada: "bg-blue-500/10 text-blue-400 border-blue-400/30",
  em_negociacao: "bg-yellow-500/10 text-yellow-400 border-yellow-400/30",
  aprovada: "bg-emerald-500/10 text-emerald-400 border-emerald-400/30",
  recusada: "bg-red-500/10 text-red-400 border-red-400/30",
};

const STATUS_LABELS: Record<ProposalStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  em_negociacao: "Em negociação",
  aprovada: "Aprovada",
  recusada: "Recusada",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Propostas() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProposalStatus | "todas">("todas");

  useEffect(() => {
    loadProposals();
  }, []);

  async function loadProposals() {
    setLoading(true);
    const { data, error } = await supabase
      .from("proposals" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar propostas: " + error.message);
    } else {
      setProposals((data ?? []) as Proposal[]);
    }
    setLoading(false);
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const total = proposals.length;
  const emNegociacao = proposals.filter((p) => p.status === "em_negociacao").length;
  const aprovadas = proposals.filter((p) => p.status === "aprovada").length;
  const taxaAprovacao = total > 0 ? ((aprovadas / total) * 100) : 0;

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered =
    activeTab === "todas"
      ? proposals
      : proposals.filter((p) => p.status === activeTab);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Propostas"
        description="Gerencie propostas comerciais para seus clientes"
        actions={
          <Button
            onClick={() => navigate("/propostas/nova")}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Nova Proposta
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total de propostas"
          value={String(total)}
          icon={FileText}
          accent="primary"
        />
        <KpiCard
          label="Em negociação"
          value={String(emNegociacao)}
          icon={MessageSquare}
          accent="warning"
        />
        <KpiCard
          label="Aprovadas"
          value={String(aprovadas)}
          icon={CheckCircle2}
          accent="success"
        />
        <KpiCard
          label="Taxa de aprovação"
          value={`${taxaAprovacao.toFixed(1)}%`}
          icon={PercentIcon}
          accent="primary"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              activeTab === tab.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.value !== "todas" && (
              <span className="ml-1.5 text-xs opacity-70">
                {proposals.filter((p) => p.status === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="bg-gradient-surface border-border/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma proposta encontrada.</p>
            {activeTab === "todas" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => navigate("/propostas/nova")}
              >
                <Plus className="h-4 w-4" />
                Criar primeira proposta
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    Empresa
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    Projeto
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium hidden md:table-cell">
                    Solução
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium hidden lg:table-cell">
                    Responsável
                  </th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium hidden lg:table-cell">
                    Setup
                  </th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium hidden lg:table-cell">
                    MRR
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium hidden md:table-cell">
                    Data
                  </th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-b border-border/30 hover:bg-muted/30 transition-colors ${
                      idx % 2 === 0 ? "" : "bg-muted/10"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium truncate max-w-[140px]">
                      {p.client_company}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px]">
                      {p.project_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {p.solution_type ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {p.solution_type}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {p.responsible ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell tabular-nums">
                      {p.setup_value_brl ? brl(p.setup_value_brl) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell tabular-nums">
                      {p.mrr_brl ? brl(p.mrr_brl) + "/mês" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          STATUS_COLORS[p.status]
                        }`}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell whitespace-nowrap">
                      {dateBR(p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs gap-1"
                          onClick={() => navigate(`/propostas/${p.id}`)}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir
                        </Button>
                        {p.status === "aprovada" && !p.hub_project_id && (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() =>
                              navigate(
                                `/hub/projetos/novo?proposal_id=${p.id}`
                              )
                            }
                          >
                            <FolderPlus className="h-3 w-3" />
                            Criar Projeto
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
