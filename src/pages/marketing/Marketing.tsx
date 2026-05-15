import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone,
  Users,
  Briefcase,
  TrendingUp,
  DollarSign,
  Plus,
  Pencil,
  Eye,
  ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel =
  | "whatsapp"
  | "instagram"
  | "linkedin"
  | "google"
  | "email"
  | "indicacao"
  | "conteudo"
  | "outro";

type CampaignStatus = "planejada" | "ativa" | "pausada" | "encerrada";
type LeadStatus = "novo" | "contatado" | "qualificado" | "convertido" | "perdido";

interface Campaign {
  id: string;
  created_at: string;
  name: string;
  channel: Channel;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  budget_brl: number | null;
  leads_count: number | null;
  deals_count: number | null;
  closed_count: number | null;
  revenue_brl: number | null;
  notes: string | null;
}

interface Lead {
  id: string;
  created_at: string;
  campaign_id: string | null;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  status: LeadStatus;
  source_notes: string | null;
  deal_id: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  google: "Google",
  email: "E-mail",
  indicacao: "Indicação",
  conteudo: "Conteúdo",
  outro: "Outro",
};

const CHANNEL_ICONS: Record<Channel, string> = {
  whatsapp: "📱",
  instagram: "📸",
  linkedin: "💼",
  google: "🔍",
  email: "📧",
  indicacao: "🤝",
  conteudo: "📝",
  outro: "🎯",
};

const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  planejada: "Planejada",
  ativa: "Ativa",
  pausada: "Pausada",
  encerrada: "Encerrada",
};

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  qualificado: "Qualificado",
  convertido: "Convertido",
  perdido: "Perdido",
};

const ALL_CHANNELS: Channel[] = [
  "whatsapp",
  "instagram",
  "linkedin",
  "google",
  "email",
  "indicacao",
  "conteudo",
  "outro",
];
const ALL_CAMPAIGN_STATUSES: CampaignStatus[] = [
  "planejada",
  "ativa",
  "pausada",
  "encerrada",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function campaignStatusClass(s: CampaignStatus): string {
  return {
    planejada: "bg-muted text-muted-foreground border-border",
    ativa: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
    pausada: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    encerrada: "bg-muted/50 text-muted-foreground border-border",
  }[s];
}

function leadStatusClass(s: LeadStatus): string {
  return {
    novo: "bg-muted text-muted-foreground border-border",
    contatado: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    qualificado: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
    convertido: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    perdido: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  }[s];
}

function roiColor(roi: number): string {
  if (roi > 0) return "text-green-600 dark:text-green-400";
  if (roi === 0) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function channelBorderColor(roi: number): string {
  if (roi > 0) return "border-l-4 border-l-green-500";
  if (roi === 0) return "border-l-4 border-l-yellow-500";
  return "border-l-4 border-l-red-500";
}

function calcRoi(revenue: number, budget: number): number {
  if (budget <= 0) return 0;
  return ((revenue - budget) / budget) * 100;
}

// ─── Empty form state helpers ─────────────────────────────────────────────────

function emptyCampaignForm() {
  return {
    name: "",
    channel: "outro" as Channel,
    status: "planejada" as CampaignStatus,
    start_date: "",
    end_date: "",
    budget_brl: "",
    leads_count: "",
    deals_count: "",
    closed_count: "",
    revenue_brl: "",
    notes: "",
  };
}

function emptyLeadForm() {
  return {
    name: "",
    company: "",
    phone: "",
    email: "",
    campaign_id: "",
    source_notes: "",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FunnelBar({
  label,
  count,
  maxCount,
  pct,
  color,
}: {
  label: string;
  count: number;
  maxCount: number;
  pct: string;
  color: string;
}) {
  const barPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="font-medium">{label}</span>
        <span>
          {count.toLocaleString("pt-BR")} ({pct})
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Marketing() {
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [viewLeadsCampaign, setViewLeadsCampaign] = useState<Campaign | null>(null);
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  // Form state
  const [campaignForm, setCampaignForm] = useState(emptyCampaignForm());
  const [leadForm, setLeadForm] = useState(emptyLeadForm());
  const [saving, setSaving] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    const [{ data: cData }, { data: lData }] = await Promise.all([
      (supabase.from("mkt_campaigns" as any).select("*").order("created_at", { ascending: false }) as any),
      (supabase.from("mkt_leads" as any).select("*").order("created_at", { ascending: false }) as any),
    ]);
    setCampaigns((cData as Campaign[]) || []);
    setLeads((lData as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const ativas = campaigns.filter((c) => c.status === "ativa").length;
    const totalLeads = campaigns.reduce((s, c) => s + (c.leads_count ?? 0), 0);
    const totalDeals = campaigns.reduce((s, c) => s + (c.deals_count ?? 0), 0);
    const totalClosed = campaigns.reduce((s, c) => s + (c.closed_count ?? 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue_brl ?? 0), 0);
    return { ativas, totalLeads, totalDeals, totalClosed, totalRevenue };
  }, [campaigns]);

  // ── Funnel ────────────────────────────────────────────────────────────────

  const funnel = useMemo(() => {
    const { totalLeads, totalDeals, totalClosed } = kpis;
    const leadsToDeals =
      totalLeads > 0 ? ((totalDeals / totalLeads) * 100).toFixed(1) : "0.0";
    const dealsToClosed =
      totalDeals > 0 ? ((totalClosed / totalDeals) * 100).toFixed(1) : "0.0";
    return { totalLeads, totalDeals, totalClosed, leadsToDeals, dealsToClosed };
  }, [kpis]);

  // ── Channel groups ────────────────────────────────────────────────────────

  const channelGroups = useMemo(() => {
    const map: Record<
      string,
      {
        channel: Channel;
        leads: number;
        deals: number;
        closed: number;
        revenue: number;
        budget: number;
      }
    > = {};
    campaigns.forEach((c) => {
      if (!map[c.channel]) {
        map[c.channel] = {
          channel: c.channel,
          leads: 0,
          deals: 0,
          closed: 0,
          revenue: 0,
          budget: 0,
        };
      }
      map[c.channel].leads += c.leads_count ?? 0;
      map[c.channel].deals += c.deals_count ?? 0;
      map[c.channel].closed += c.closed_count ?? 0;
      map[c.channel].revenue += c.revenue_brl ?? 0;
      map[c.channel].budget += c.budget_brl ?? 0;
    });
    return Object.values(map).filter(
      (g) => g.leads > 0 || g.deals > 0 || g.closed > 0 || g.budget > 0
    );
  }, [campaigns]);

  // ── Campaign lookup for leads ─────────────────────────────────────────────

  const campaignById = useMemo(() => {
    const m: Record<string, Campaign> = {};
    campaigns.forEach((c) => (m[c.id] = c));
    return m;
  }, [campaigns]);

  // ── Campaign leads (for view dialog) ─────────────────────────────────────

  const campaignLeads = useMemo(() => {
    if (!viewLeadsCampaign) return [];
    return leads.filter((l) => l.campaign_id === viewLeadsCampaign.id);
  }, [leads, viewLeadsCampaign]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("mkt_campaigns" as any).insert({
      name: campaignForm.name.trim(),
      channel: campaignForm.channel,
      status: campaignForm.status,
      start_date: campaignForm.start_date || null,
      end_date: campaignForm.end_date || null,
      budget_brl: campaignForm.budget_brl ? parseFloat(campaignForm.budget_brl) : null,
      leads_count: campaignForm.leads_count ? parseInt(campaignForm.leads_count) : 0,
      deals_count: campaignForm.deals_count ? parseInt(campaignForm.deals_count) : 0,
      closed_count: campaignForm.closed_count ? parseInt(campaignForm.closed_count) : 0,
      revenue_brl: campaignForm.revenue_brl ? parseFloat(campaignForm.revenue_brl) : 0,
      notes: campaignForm.notes || null,
    }) as any);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Campanha criada!");
      setNewCampaignOpen(false);
      setCampaignForm(emptyCampaignForm());
      load();
    }
  };

  const handleEditCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCampaign) return;
    if (!campaignForm.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    const { error } = await (supabase
      .from("mkt_campaigns" as any)
      .update({
        name: campaignForm.name.trim(),
        channel: campaignForm.channel,
        status: campaignForm.status,
        start_date: campaignForm.start_date || null,
        end_date: campaignForm.end_date || null,
        budget_brl: campaignForm.budget_brl ? parseFloat(campaignForm.budget_brl) : null,
        leads_count: campaignForm.leads_count ? parseInt(campaignForm.leads_count) : 0,
        deals_count: campaignForm.deals_count ? parseInt(campaignForm.deals_count) : 0,
        closed_count: campaignForm.closed_count ? parseInt(campaignForm.closed_count) : 0,
        revenue_brl: campaignForm.revenue_brl ? parseFloat(campaignForm.revenue_brl) : 0,
        notes: campaignForm.notes || null,
      })
      .eq("id", editCampaign.id) as any);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Campanha atualizada!");
      setEditCampaign(null);
      setCampaignForm(emptyCampaignForm());
      load();
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("mkt_leads" as any).insert({
      name: leadForm.name.trim(),
      company: leadForm.company || null,
      phone: leadForm.phone || null,
      email: leadForm.email || null,
      campaign_id: leadForm.campaign_id || null,
      source_notes: leadForm.source_notes || null,
      status: "novo",
    }) as any);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Lead criado!");
      setNewLeadOpen(false);
      setLeadForm(emptyLeadForm());
      load();
    }
  };

  const openEditDialog = (c: Campaign) => {
    setEditCampaign(c);
    setCampaignForm({
      name: c.name,
      channel: c.channel,
      status: c.status,
      start_date: c.start_date ?? "",
      end_date: c.end_date ?? "",
      budget_brl: c.budget_brl != null ? String(c.budget_brl) : "",
      leads_count: c.leads_count != null ? String(c.leads_count) : "",
      deals_count: c.deals_count != null ? String(c.deals_count) : "",
      closed_count: c.closed_count != null ? String(c.closed_count) : "",
      revenue_brl: c.revenue_brl != null ? String(c.revenue_brl) : "",
      notes: c.notes ?? "",
    });
  };

  const openNewCampaignDialog = () => {
    setCampaignForm(emptyCampaignForm());
    setNewCampaignOpen(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="text-muted-foreground p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Marketing"
        description="Campanhas, leads e performance por canal"
        actions={
          <Button onClick={openNewCampaignDialog} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nova Campanha
          </Button>
        }
      />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Campanhas Ativas"
          value={String(kpis.ativas)}
          icon={Megaphone}
          accent="primary"
        />
        <KpiCard
          label="Leads Gerados"
          value={kpis.totalLeads.toLocaleString("pt-BR")}
          icon={Users}
          accent="success"
        />
        <KpiCard
          label="Deals Abertos"
          value={kpis.totalDeals.toLocaleString("pt-BR")}
          icon={Briefcase}
          accent="warning"
        />
        <KpiCard
          label="Fechamentos"
          value={kpis.totalClosed.toLocaleString("pt-BR")}
          icon={TrendingUp}
          accent="success"
        />
        <KpiCard
          label="Receita Gerada"
          value={brl(kpis.totalRevenue)}
          icon={DollarSign}
          accent={kpis.totalRevenue > 0 ? "success" : "destructive"}
        />
      </div>

      {/* ── Conversion Funnel ── */}
      <Card className="p-5 bg-gradient-surface border-border/50">
        <h3 className="font-display text-lg font-semibold mb-4">Funil de Conversão</h3>
        <div className="space-y-3 max-w-2xl">
          <FunnelBar
            label="Leads Totais"
            count={funnel.totalLeads}
            maxCount={funnel.totalLeads}
            pct="100%"
            color="bg-blue-500"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
            <ArrowRight className="h-3 w-3" />
            <span>Taxa Leads → Deals: {funnel.leadsToDeals}%</span>
          </div>
          <FunnelBar
            label="Deals"
            count={funnel.totalDeals}
            maxCount={funnel.totalLeads}
            pct={`${funnel.leadsToDeals}%`}
            color="bg-yellow-500"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
            <ArrowRight className="h-3 w-3" />
            <span>Taxa Deals → Fechamentos: {funnel.dealsToClosed}%</span>
          </div>
          <FunnelBar
            label="Fechamentos"
            count={funnel.totalClosed}
            maxCount={funnel.totalLeads}
            pct={`${(funnel.totalLeads > 0 ? (funnel.totalClosed / funnel.totalLeads) * 100 : 0).toFixed(1)}%`}
            color="bg-green-500"
          />
        </div>
      </Card>

      {/* ── Channel Performance ── */}
      {channelGroups.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold mb-3">Performance por Canal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {channelGroups.map((g) => {
              const roi = calcRoi(g.revenue, g.budget);
              return (
                <Card
                  key={g.channel}
                  className={`p-4 bg-gradient-surface border-border/50 ${channelBorderColor(roi)}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{CHANNEL_ICONS[g.channel]}</span>
                    <span className="font-display font-semibold text-sm">
                      {CHANNEL_LABELS[g.channel]}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Leads</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {g.leads.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Deals</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {g.deals.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fechamentos</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {g.closed.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="border-t border-border/50 pt-1 mt-1 flex justify-between">
                      <span>ROI</span>
                      <span className={`font-semibold tabular-nums ${roiColor(roi)}`}>
                        {roi > 0 ? "+" : ""}
                        {roi.toFixed(1)}%
                      </span>
                    </div>
                    {g.budget > 0 && (
                      <div className="flex justify-between">
                        <span>Orçamento</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {brl(g.budget)}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Campaigns Table ── */}
      <Card className="p-0 bg-gradient-surface border-border/50 overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <h3 className="font-display text-lg font-semibold">Campanhas</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Orçamento</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Deals</TableHead>
                <TableHead className="text-right">Fechamentos</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">ROI%</TableHead>
                <TableHead className="text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-muted-foreground py-10"
                  >
                    Nenhuma campanha cadastrada. Crie a primeira!
                  </TableCell>
                </TableRow>
              )}
              {campaigns.map((c) => {
                const roi = calcRoi(c.revenue_brl ?? 0, c.budget_brl ?? 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {c.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 text-xs whitespace-nowrap">
                        {CHANNEL_ICONS[c.channel]} {CHANNEL_LABELS[c.channel]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${campaignStatusClass(c.status)}`}
                      >
                        {CAMPAIGN_STATUS_LABELS[c.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {c.budget_brl != null ? brl(c.budget_brl) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {(c.leads_count ?? 0).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {(c.deals_count ?? 0).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {(c.closed_count ?? 0).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {brl(c.revenue_brl ?? 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      <span className={roiColor(roi)}>
                        {c.budget_brl
                          ? `${roi > 0 ? "+" : ""}${roi.toFixed(1)}%`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEditDialog(c)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setViewLeadsCampaign(c)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Leads
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Leads Table ── */}
      <Card className="p-0 bg-gradient-surface border-border/50 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Leads</h3>
          <Button
            onClick={() => {
              setLeadForm(emptyLeadForm());
              setNewLeadOpen(true);
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo Lead
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-10"
                  >
                    Nenhum lead cadastrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {leads.map((l) => {
                const campaign = l.campaign_id ? campaignById[l.campaign_id] : null;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {l.company || "—"}
                    </TableCell>
                    <TableCell>
                      {campaign ? (
                        <Badge variant="outline" className="gap-1 text-xs">
                          {CHANNEL_ICONS[campaign.channel]}{" "}
                          {CHANNEL_LABELS[campaign.channel]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${leadStatusClass(l.status)}`}
                      >
                        {LEAD_STATUS_LABELS[l.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {dateBR(l.created_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      {l.status === "qualificado" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-green-600 border-green-500/30 hover:bg-green-500/10"
                          onClick={() =>
                            navigate("/comercial", {
                              state: {
                                prefillLead: {
                                  name: l.name,
                                  company: l.company,
                                  phone: l.phone,
                                  email: l.email,
                                },
                              },
                            })
                          }
                        >
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Converter em Deal
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── New Campaign Dialog ── */}
      <Dialog open={newCampaignOpen} onOpenChange={setNewCampaignOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign} className="space-y-4 pt-2">
            <CampaignFormFields
              form={campaignForm}
              onChange={setCampaignForm}
              showMetrics={false}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewCampaignOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Criar Campanha"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Campaign Dialog ── */}
      <Dialog
        open={editCampaign !== null}
        onOpenChange={(v) => {
          if (!v) {
            setEditCampaign(null);
            setCampaignForm(emptyCampaignForm());
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Campanha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCampaign} className="space-y-4 pt-2">
            <CampaignFormFields
              form={campaignForm}
              onChange={setCampaignForm}
              showMetrics={true}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditCampaign(null);
                  setCampaignForm(emptyCampaignForm());
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── View Leads Dialog ── */}
      <Dialog
        open={viewLeadsCampaign !== null}
        onOpenChange={(v) => {
          if (!v) setViewLeadsCampaign(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Leads — {viewLeadsCampaign?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignLeads.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhum lead nesta campanha ainda.
                    </TableCell>
                  </TableRow>
                )}
                {campaignLeads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {l.company || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {l.phone || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${leadStatusClass(l.status)}`}
                      >
                        {LEAD_STATUS_LABELS[l.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {dateBR(l.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── New Lead Dialog ── */}
      <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="lead-name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lead-name"
                placeholder="Nome do lead"
                value={leadForm.name}
                onChange={(e) =>
                  setLeadForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-company">Empresa</Label>
              <Input
                id="lead-company"
                placeholder="Empresa"
                value={leadForm.company}
                onChange={(e) =>
                  setLeadForm((f) => ({ ...f, company: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lead-phone">Telefone</Label>
                <Input
                  id="lead-phone"
                  placeholder="(11) 99999-9999"
                  value={leadForm.phone}
                  onChange={(e) =>
                    setLeadForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-email">E-mail</Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="email@empresa.com"
                  value={leadForm.email}
                  onChange={(e) =>
                    setLeadForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-campaign">Campanha</Label>
              <Select
                value={leadForm.campaign_id}
                onValueChange={(v) =>
                  setLeadForm((f) => ({ ...f, campaign_id: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger id="lead-campaign">
                  <SelectValue placeholder="Selecionar campanha..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem campanha</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {CHANNEL_ICONS[c.channel]} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-notes">Observações</Label>
              <Textarea
                id="lead-notes"
                placeholder="Notas sobre a origem do lead..."
                rows={3}
                value={leadForm.source_notes}
                onChange={(e) =>
                  setLeadForm((f) => ({ ...f, source_notes: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewLeadOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Criar Lead"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Campaign Form Fields (shared between Create and Edit) ────────────────────

interface CampaignFormState {
  name: string;
  channel: Channel;
  status: CampaignStatus;
  start_date: string;
  end_date: string;
  budget_brl: string;
  leads_count: string;
  deals_count: string;
  closed_count: string;
  revenue_brl: string;
  notes: string;
}

function CampaignFormFields({
  form,
  onChange,
  showMetrics,
}: {
  form: CampaignFormState;
  onChange: React.Dispatch<React.SetStateAction<CampaignFormState>>;
  showMetrics: boolean;
}) {
  const set = (key: keyof CampaignFormState) => (val: string) =>
    onChange((f) => ({ ...f, [key]: val }));

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="cf-name">
          Nome <span className="text-destructive">*</span>
        </Label>
        <Input
          id="cf-name"
          placeholder="Nome da campanha"
          value={form.name}
          onChange={(e) => set("name")(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cf-channel">Canal</Label>
          <Select value={form.channel} onValueChange={(v) => set("channel")(v)}>
            <SelectTrigger id="cf-channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_CHANNELS.map((ch) => (
                <SelectItem key={ch} value={ch}>
                  {CHANNEL_ICONS[ch]} {CHANNEL_LABELS[ch]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-status">Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status")(v)}>
            <SelectTrigger id="cf-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_CAMPAIGN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {CAMPAIGN_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cf-start">Data Início</Label>
          <Input
            id="cf-start"
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date")(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-end">Data Fim</Label>
          <Input
            id="cf-end"
            type="date"
            value={form.end_date}
            onChange={(e) => set("end_date")(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-budget">Orçamento (R$)</Label>
        <Input
          id="cf-budget"
          type="number"
          min="0"
          step="0.01"
          placeholder="0,00"
          value={form.budget_brl}
          onChange={(e) => set("budget_brl")(e.target.value)}
        />
      </div>

      {showMetrics && (
        <>
          <div className="border-t border-border/50 pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Métricas
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cf-leads">Leads gerados</Label>
                <Input
                  id="cf-leads"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.leads_count}
                  onChange={(e) => set("leads_count")(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-deals">Deals abertos</Label>
                <Input
                  id="cf-deals"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.deals_count}
                  onChange={(e) => set("deals_count")(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-closed">Fechamentos</Label>
                <Input
                  id="cf-closed"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.closed_count}
                  onChange={(e) => set("closed_count")(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-revenue">Receita (R$)</Label>
                <Input
                  id="cf-revenue"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.revenue_brl}
                  onChange={(e) => set("revenue_brl")(e.target.value)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="cf-notes">Observações</Label>
        <Textarea
          id="cf-notes"
          placeholder="Notas sobre a campanha..."
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes")(e.target.value)}
        />
      </div>
    </>
  );
}
