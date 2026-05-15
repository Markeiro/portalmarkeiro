import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import {
  Users,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageCircle,
  Mail,
  Linkedin,
  Instagram,
  Globe,
  Calendar,
  Share2,
  Megaphone,
  GripVertical,
  Webhook,
  Copy,
  CheckCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DealChannel =
  | "indicacao"
  | "whatsapp"
  | "instagram"
  | "linkedin"
  | "google"
  | "email"
  | "evento"
  | "outro";

type DealStage =
  | "lead"
  | "qualificado"
  | "reuniao_marcada"
  | "proposta_enviada"
  | "negociacao"
  | "fechado_ganho"
  | "fechado_perdido";

interface Deal {
  id: string;
  created_at: string;
  title: string;
  company: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  channel: DealChannel | null;
  stage: DealStage;
  value_setup: number | null;
  value_mrr: number | null;
  responsible: string | null;
  source_notes: string | null;
  lost_reason: string | null;
  closed_at: string | null;
  proposal_id: string | null;
  hub_project_id: string | null;
  notes: string | null;
  sort_order: number | null;
}

interface NewDealForm {
  title: string;
  company: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  channel: DealChannel | "";
  responsible: string;
  value_setup: string;
  value_mrr: string;
  source_notes: string;
  notes: string;
}

// ─── Stage metadata ───────────────────────────────────────────────────────────

const STAGES: DealStage[] = [
  "lead",
  "qualificado",
  "reuniao_marcada",
  "proposta_enviada",
  "negociacao",
  "fechado_ganho",
  "fechado_perdido",
];

const STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  qualificado: "Qualificado",
  reuniao_marcada: "Reunião",
  proposta_enviada: "Proposta",
  negociacao: "Negociação",
  fechado_ganho: "Fechado ✓",
  fechado_perdido: "Perdido",
};

const STAGE_COLORS: Record<DealStage, string> = {
  lead: "border-border bg-muted/30 text-muted-foreground",
  qualificado: "border-blue-500/40 bg-blue-500/10 text-blue-600",
  reuniao_marcada: "border-purple-500/40 bg-purple-500/10 text-purple-600",
  proposta_enviada: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700",
  negociacao: "border-orange-500/40 bg-orange-500/10 text-orange-600",
  fechado_ganho: "border-green-500/40 bg-green-500/10 text-green-700",
  fechado_perdido: "border-rose-500/40 bg-rose-500/10 text-rose-600",
};

const STAGE_HEADER_COLORS: Record<DealStage, string> = {
  lead: "bg-muted/50 border-border",
  qualificado: "bg-blue-500/10 border-blue-500/30",
  reuniao_marcada: "bg-purple-500/10 border-purple-500/30",
  proposta_enviada: "bg-yellow-500/10 border-yellow-500/30",
  negociacao: "bg-orange-500/10 border-orange-500/30",
  fechado_ganho: "bg-green-500/10 border-green-500/30",
  fechado_perdido: "bg-rose-500/10 border-rose-500/30",
};

const CHANNEL_LABELS: Record<DealChannel, string> = {
  indicacao: "Indicação",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  google: "Google",
  email: "E-mail",
  evento: "Evento",
  outro: "Outro",
};

const CLOSED_STAGES: DealStage[] = ["fechado_ganho", "fechado_perdido"];

// ─── Automações data ──────────────────────────────────────────────────────────

interface AutomacaoChannel {
  key: string;
  name: string;
  description: string;
  status: string;
  statusColor: string;
  icon: React.ReactNode;
}

const AUTOMACAO_CHANNELS: AutomacaoChannel[] = [
  {
    key: "instagram",
    name: "Instagram",
    description: "Capture leads de anúncios Lead Ads e DMs via integração.",
    status: "Via Zapier",
    statusColor: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    icon: <Instagram className="h-5 w-5 text-pink-500" />,
  },
  {
    key: "facebook",
    name: "Facebook / Meta Ads",
    description: "Sincronize formulários de Lead Ads do Meta Business Suite.",
    status: "Via Zapier",
    statusColor: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    icon: <Megaphone className="h-5 w-5 text-blue-600" />,
  },
  {
    key: "google",
    name: "Google Ads",
    description: "Integre formulários de geração de leads do Google Ads.",
    status: "Via Make",
    statusColor: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    icon: <Globe className="h-5 w-5 text-red-500" />,
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    description: "Capture leads de Lead Gen Forms de campanhas no LinkedIn.",
    status: "Via Make",
    statusColor: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    icon: <Linkedin className="h-5 w-5 text-blue-600" />,
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business",
    description: "Crie deals automaticamente a partir de mensagens recebidas.",
    status: "Via n8n",
    statusColor: "bg-green-500/15 text-green-700 border-green-500/30",
    icon: <MessageCircle className="h-5 w-5 text-green-500" />,
  },
  {
    key: "indicacao",
    name: "Indicação",
    description: "Registre indicações via formulário interno ou link público.",
    status: "Manual",
    statusColor: "bg-muted/60 text-muted-foreground border-border",
    icon: <Share2 className="h-5 w-5 text-muted-foreground" />,
  },
  {
    key: "email",
    name: "E-mail",
    description: "Converta e-mails de contato em leads via parser de e-mail.",
    status: "Manual",
    statusColor: "bg-muted/60 text-muted-foreground border-border",
    icon: <Mail className="h-5 w-5 text-muted-foreground" />,
  },
];

const WEBHOOK_URL =
  "https://[seu-projeto].supabase.co/functions/v1/crm-webhook";

// ─── Channel icon ─────────────────────────────────────────────────────────────

function ChannelIcon({ channel }: { channel: DealChannel | null }) {
  if (!channel) return null;
  const props = { className: "h-3.5 w-3.5 shrink-0" };
  switch (channel) {
    case "whatsapp":
      return <MessageCircle {...props} className="h-3.5 w-3.5 shrink-0 text-green-500" />;
    case "email":
      return <Mail {...props} />;
    case "linkedin":
      return <Linkedin {...props} className="h-3.5 w-3.5 shrink-0 text-blue-600" />;
    case "instagram":
      return <Instagram {...props} className="h-3.5 w-3.5 shrink-0 text-pink-500" />;
    case "google":
      return <Globe {...props} />;
    case "evento":
      return <Calendar {...props} />;
    case "indicacao":
      return <Share2 {...props} />;
    default:
      return <Megaphone {...props} />;
  }
}

// ─── Avatar initials ──────────────────────────────────────────────────────────

function InitialsAvatar({ name }: { name: string | null }) {
  if (!name) return null;
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-semibold shrink-0">
      {initials}
    </span>
  );
}

// ─── Automações Panel ─────────────────────────────────────────────────────────

function AutomacoesPanel() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(WEBHOOK_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Automações de Captura</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1">
            {AUTOMACAO_CHANNELS.length} canais
          </Badge>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">
          {/* Webhook URL */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Webhook className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-semibold">Webhook URL (Zapier / Make / n8n)</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] bg-background/70 border border-border/40 rounded px-2 py-1.5 truncate font-mono text-muted-foreground">
                {WEBHOOK_URL}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleCopy}
                title="Copiar URL"
              >
                {copied ? (
                  <CheckCheck className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Configure este webhook no Zapier, Make ou n8n conectando ao formulário de leads da sua plataforma de anúncios.
            </p>
          </div>

          {/* Channel cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {AUTOMACAO_CHANNELS.map((ch) => (
              <div
                key={ch.key}
                className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {ch.icon}
                    <span className="text-xs font-semibold">{ch.name}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] h-4 px-1.5 shrink-0 border ${ch.statusColor}`}
                  >
                    {ch.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {ch.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Comercial() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Drag & drop state ──────────────────────────────────────────────────────
  const draggingDealId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<DealStage | null>(null);

  const emptyForm: NewDealForm = {
    title: "",
    company: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    channel: "",
    responsible: "",
    value_setup: "",
    value_mrr: "",
    source_notes: "",
    notes: "",
  };
  const [form, setForm] = useState<NewDealForm>(emptyForm);

  // Pre-fill from URL params (e.g. upsell from CS module)
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const company = searchParams.get("company") ?? "";
      const mrr = searchParams.get("mrr") ?? "";
      const notes = searchParams.get("notes") ?? "";
      setForm((prev) => ({
        ...prev,
        company,
        title: company ? `Upsell — ${company}` : "",
        value_mrr: mrr,
        notes,
        source_notes: "Gerado via oportunidade de upsell no CS",
      }));
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("crm_deals")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar deals");
    } else {
      setDeals((data ?? []) as Deal[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const totalLeads = deals.length;
  const activeDeals = deals.filter((d) => !CLOSED_STAGES.includes(d.stage));
  const activePipeline = activeDeals.length;
  const mrrNegociacao = activeDeals.reduce((sum, d) => sum + (d.value_mrr ?? 0), 0);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const closedThisMonth = deals.filter(
    (d) =>
      d.stage === "fechado_ganho" &&
      d.closed_at &&
      d.closed_at.startsWith(currentMonth)
  ).length;

  // ── Kanban groups ──────────────────────────────────────────────────────────

  const dealsByStage = (stage: DealStage) =>
    deals.filter((d) => d.stage === stage);

  // ── Move to stage (shared by drag-drop and chevron buttons) ────────────────

  const moveToStage = async (deal: Deal, targetStage: DealStage) => {
    if (deal.stage === targetStage) return;

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) =>
        d.id === deal.id ? { ...d, stage: targetStage } : d
      )
    );

    const updatePayload: Record<string, unknown> = { stage: targetStage };
    if (targetStage === "fechado_ganho" || targetStage === "fechado_perdido") {
      updatePayload.closed_at = new Date().toISOString().split("T")[0];
    }

    // Background patch
    (supabase as any)
      .from("crm_deals")
      .update(updatePayload)
      .eq("id", deal.id)
      .then(({ error }: { error: unknown }) => {
        if (error) {
          toast.error("Erro ao mover deal — revertendo");
          // Revert on failure
          setDeals((prev) =>
            prev.map((d) =>
              d.id === deal.id ? { ...d, stage: deal.stage } : d
            )
          );
        } else {
          toast.success("Etapa atualizada");
        }
      });
  };

  // ── Chevron helper ─────────────────────────────────────────────────────────

  const moveStage = (deal: Deal, direction: "prev" | "next") => {
    const idx = STAGES.indexOf(deal.stage);
    const newIdx = direction === "prev" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= STAGES.length) return;
    moveToStage(deal, STAGES[newIdx]);
  };

  // ── Drag & drop handlers ───────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    draggingDealId.current = deal.id;
    setDraggingId(deal.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", deal.id);
  };

  const handleDragEnd = () => {
    draggingDealId.current = null;
    setDraggingId(null);
    setDropTargetStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetStage(stage);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column container, not a child
    const target = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as Node | null;
    if (!related || !target.contains(related)) {
      setDropTargetStage(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    setDropTargetStage(null);
    const dealId = draggingDealId.current ?? e.dataTransfer.getData("text/plain");
    if (!dealId) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    moveToStage(deal, targetStage);
    setDraggingId(null);
    draggingDealId.current = null;
  };

  // ── Create deal ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      company: form.company || null,
      contact_name: form.contact_name || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      channel: form.channel || null,
      responsible: form.responsible || null,
      value_setup: form.value_setup ? parseFloat(form.value_setup) : null,
      value_mrr: form.value_mrr ? parseFloat(form.value_mrr) : null,
      source_notes: form.source_notes || null,
      notes: form.notes || null,
      stage: "lead",
    };
    const { error } = await (supabase as any).from("crm_deals").insert(payload);
    if (error) {
      toast.error("Erro ao criar lead");
    } else {
      toast.success("Lead criado!");
      setForm(emptyForm);
      setDialogOpen(false);
      load();
    }
    setSubmitting(false);
  };

  const setField = (key: keyof NewDealForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="CRM Comercial"
        description="Pipeline de vendas e gestão de leads"
        actions={
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Lead
          </Button>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Total de leads"
          value={String(totalLeads)}
          icon={Users}
          accent="primary"
        />
        <KpiCard
          label="Pipeline ativo"
          value={String(activePipeline)}
          icon={TrendingUp}
          accent="warning"
        />
        <KpiCard
          label="MRR em negociação"
          value={brl(mrrNegociacao)}
          icon={DollarSign}
          accent="primary"
        />
        <KpiCard
          label="Fechados este mês"
          value={String(closedThisMonth)}
          icon={CheckCircle2}
          accent="success"
        />
      </div>

      {/* Automações Panel */}
      <AutomacoesPanel />

      {/* Kanban Board */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Carregando pipeline…
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
          {STAGES.map((stage) => {
            const stageDeals = dealsByStage(stage);
            const stageIdx = STAGES.indexOf(stage);
            const isDropTarget = dropTargetStage === stage;

            return (
              <div
                key={stage}
                className="flex-none w-64 flex flex-col gap-2"
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Column header */}
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${STAGE_HEADER_COLORS[stage]} ${
                    isDropTarget
                      ? "ring-2 ring-primary/60 ring-offset-1 scale-[1.02]"
                      : ""
                  }`}
                >
                  <span className="text-xs font-semibold truncate">
                    {STAGE_LABELS[stage]}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {stageDeals.length}
                  </Badge>
                </div>

                {/* Cards drop zone */}
                <div
                  className={`flex flex-col gap-2 min-h-[120px] rounded-lg transition-all ${
                    isDropTarget
                      ? "ring-2 ring-primary/40 ring-offset-1 bg-primary/5"
                      : ""
                  }`}
                >
                  {stageDeals.map((deal) => {
                    const isDragging = draggingId === deal.id;
                    return (
                      <Card
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 space-y-2 bg-gradient-surface border-border/50 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none ${
                          isDragging ? "opacity-40 scale-95" : ""
                        }`}
                      >
                        {/* Drag handle + company/title */}
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-tight truncate">
                              {deal.company ?? deal.title}
                            </p>
                            {deal.company && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {deal.title}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Contact + channel */}
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <ChannelIcon channel={deal.channel} />
                          <span className="truncate">{deal.contact_name ?? "—"}</span>
                        </div>

                        {/* MRR badge + responsible */}
                        <div className="flex items-center justify-between gap-1">
                          {deal.value_mrr ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 border-primary/30 bg-primary/5 text-primary"
                            >
                              {brl(deal.value_mrr)}/mês
                            </Badge>
                          ) : (
                            <span />
                          )}
                          <InitialsAvatar name={deal.responsible} />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={stageIdx === 0}
                              onClick={() => moveStage(deal, "prev")}
                              title="Mover para etapa anterior"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={stageIdx === STAGES.length - 1}
                              onClick={() => moveStage(deal, "next")}
                              title="Mover para próxima etapa"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] px-2 text-primary"
                            onClick={() => navigate(`/comercial/${deal.id}`)}
                          >
                            Abrir
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}

                  {stageDeals.length === 0 && (
                    <div
                      className={`flex-1 flex items-center justify-center border border-dashed rounded-lg py-6 transition-colors ${
                        isDropTarget
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/40"
                      }`}
                    >
                      <span className="text-[11px] text-muted-foreground/60">
                        {isDropTarget ? "Soltar aqui" : "Vazio"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Lead Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Título */}
            <div className="space-y-1">
              <Label htmlFor="nl-title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nl-title"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Ex: Implantação SolicitAí"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Empresa */}
              <div className="space-y-1">
                <Label htmlFor="nl-company">Empresa</Label>
                <Input
                  id="nl-company"
                  value={form.company}
                  onChange={(e) => setField("company", e.target.value)}
                  placeholder="Razão social"
                />
              </div>

              {/* Responsável */}
              <div className="space-y-1">
                <Label htmlFor="nl-resp">Responsável</Label>
                <Input
                  id="nl-resp"
                  value={form.responsible}
                  onChange={(e) => setField("responsible", e.target.value)}
                  placeholder="Nome do SDR/BDR"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Contato */}
              <div className="space-y-1">
                <Label htmlFor="nl-contact">Contato</Label>
                <Input
                  id="nl-contact"
                  value={form.contact_name}
                  onChange={(e) => setField("contact_name", e.target.value)}
                  placeholder="Nome"
                />
              </div>

              {/* Canal */}
              <div className="space-y-1">
                <Label>Canal</Label>
                <Select
                  value={form.channel}
                  onValueChange={(v) => setField("channel", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CHANNEL_LABELS) as DealChannel[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {CHANNEL_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Telefone */}
              <div className="space-y-1">
                <Label htmlFor="nl-phone">Telefone</Label>
                <Input
                  id="nl-phone"
                  value={form.contact_phone}
                  onChange={(e) => setField("contact_phone", e.target.value)}
                  placeholder="(11) 9 9999-9999"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-1">
                <Label htmlFor="nl-email">E-mail</Label>
                <Input
                  id="nl-email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setField("contact_email", e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>
            </div>

            {/* Origem / Contexto */}
            <div className="space-y-1">
              <Label htmlFor="nl-source-notes">Origem / Contexto</Label>
              <Input
                id="nl-source-notes"
                value={form.source_notes}
                onChange={(e) => setField("source_notes", e.target.value)}
                placeholder="Ex: anúncio Instagram Stories, indicado por João Silva…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Valor setup */}
              <div className="space-y-1">
                <Label htmlFor="nl-setup">Valor Setup (R$)</Label>
                <Input
                  id="nl-setup"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value_setup}
                  onChange={(e) => setField("value_setup", e.target.value)}
                  placeholder="0,00"
                />
              </div>

              {/* Valor MRR */}
              <div className="space-y-1">
                <Label htmlFor="nl-mrr">MRR (R$/mês)</Label>
                <Input
                  id="nl-mrr"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value_mrr}
                  onChange={(e) => setField("value_mrr", e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <Label htmlFor="nl-notes">Observações</Label>
              <Textarea
                id="nl-notes"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Contexto, origem, etc."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Criando…" : "Criar Lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
