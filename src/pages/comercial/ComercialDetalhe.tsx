import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { brl, dateBR } from "@/lib/format";
import {
  ArrowLeft,
  Phone,
  Video,
  MessageCircle,
  Mail,
  MapPin,
  FileText,
  Trash2,
  Plus,
  Save,
  ExternalLink,
  FolderKanban,
  User,
  DollarSign,
  CalendarDays,
  Share2,
  Instagram,
  Linkedin,
  Globe,
  Calendar,
  Megaphone,
  AlertCircle,
  Edit2,
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

type ActivityType =
  | "ligacao"
  | "reuniao"
  | "whatsapp"
  | "email"
  | "visita"
  | "outro";

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

interface Activity {
  id: string;
  created_at: string;
  deal_id: string;
  type: ActivityType;
  date: string;
  description: string | null;
  outcome: string | null;
  next_action: string | null;
  next_action_date: string | null;
}

interface ActivityForm {
  type: ActivityType | "";
  date: string;
  description: string;
  outcome: string;
  next_action: string;
  next_action_date: string;
}

interface EditDealForm {
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
  reuniao_marcada: "Reunião Marcada",
  proposta_enviada: "Proposta Enviada",
  negociacao: "Negociação",
  fechado_ganho: "Fechado ✓",
  fechado_perdido: "Perdido",
};

const STAGE_BADGE_COLORS: Record<DealStage, string> = {
  lead: "border-border bg-muted/30 text-muted-foreground",
  qualificado: "border-blue-500/40 bg-blue-500/10 text-blue-600",
  reuniao_marcada: "border-purple-500/40 bg-purple-500/10 text-purple-600",
  proposta_enviada: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700",
  negociacao: "border-orange-500/40 bg-orange-500/10 text-orange-600",
  fechado_ganho: "border-green-500/40 bg-green-500/10 text-green-700",
  fechado_perdido: "border-rose-500/40 bg-rose-500/10 text-rose-600",
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

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  ligacao: "Ligação",
  reuniao: "Reunião",
  whatsapp: "WhatsApp",
  email: "E-mail",
  visita: "Visita",
  outro: "Outro",
};

const TODAY = new Date().toISOString().split("T")[0];

// ─── Small helpers ────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: DealChannel | null }) {
  if (!channel) return null;
  const iconProps = { className: "h-3 w-3" };
  let icon;
  switch (channel) {
    case "whatsapp":
      icon = <MessageCircle {...iconProps} className="h-3 w-3 text-green-500" />;
      break;
    case "email":
      icon = <Mail {...iconProps} />;
      break;
    case "linkedin":
      icon = <Linkedin {...iconProps} className="h-3 w-3 text-blue-600" />;
      break;
    case "instagram":
      icon = <Instagram {...iconProps} className="h-3 w-3 text-pink-500" />;
      break;
    case "google":
      icon = <Globe {...iconProps} />;
      break;
    case "evento":
      icon = <Calendar {...iconProps} />;
      break;
    case "indicacao":
      icon = <Share2 {...iconProps} />;
      break;
    default:
      icon = <Megaphone {...iconProps} />;
  }
  return (
    <Badge variant="outline" className="gap-1 text-xs">
      {icon}
      {CHANNEL_LABELS[channel]}
    </Badge>
  );
}

function ActivityTypeIcon({ type }: { type: ActivityType }) {
  const cls = "h-4 w-4 shrink-0 mt-0.5";
  switch (type) {
    case "ligacao":
      return <Phone className={cls} />;
    case "reuniao":
      return <Video className={cls} />;
    case "whatsapp":
      return <MessageCircle className={`${cls} text-green-500`} />;
    case "email":
      return <Mail className={cls} />;
    case "visita":
      return <MapPin className={cls} />;
    default:
      return <FileText className={cls} />;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ComercialDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditDealForm>({
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
  });
  const [editSaving, setEditSaving] = useState(false);

  // Notes
  const [notesEdit, setNotesEdit] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Lost reason
  const [lostReasonEdit, setLostReasonEdit] = useState("");
  const [lostReasonSaving, setLostReasonSaving] = useState(false);

  // Activity form
  const emptyActivity: ActivityForm = {
    type: "",
    date: TODAY,
    description: "",
    outcome: "",
    next_action: "",
    next_action_date: "",
  };
  const [activityForm, setActivityForm] = useState<ActivityForm>(emptyActivity);
  const [activitySubmitting, setActivitySubmitting] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);
    const [dealRes, activitiesRes] = await Promise.all([
      (supabase as any).from("crm_deals").select("*").eq("id", id).single(),
      (supabase as any)
        .from("crm_activities")
        .select("*")
        .eq("deal_id", id)
        .order("date", { ascending: false }),
    ]);

    if (dealRes.error) {
      toast.error("Deal não encontrado");
      navigate("/comercial");
      return;
    }

    const dealData = dealRes.data as Deal;
    setDeal(dealData);
    setNotesEdit(dealData.notes ?? "");
    setLostReasonEdit(dealData.lost_reason ?? "");
    setEditForm({
      title: dealData.title ?? "",
      company: dealData.company ?? "",
      contact_name: dealData.contact_name ?? "",
      contact_phone: dealData.contact_phone ?? "",
      contact_email: dealData.contact_email ?? "",
      channel: dealData.channel ?? "",
      responsible: dealData.responsible ?? "",
      value_setup: dealData.value_setup != null ? String(dealData.value_setup) : "",
      value_mrr: dealData.value_mrr != null ? String(dealData.value_mrr) : "",
      source_notes: dealData.source_notes ?? "",
    });

    if (!activitiesRes.error) {
      setActivities((activitiesRes.data ?? []) as Activity[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Update stage ───────────────────────────────────────────────────────────

  const handleStageChange = async (newStage: DealStage) => {
    if (!deal) return;
    const payload: Record<string, unknown> = { stage: newStage };
    if (newStage === "fechado_ganho" || newStage === "fechado_perdido") {
      payload.closed_at = TODAY;
    }
    const { error } = await (supabase as any)
      .from("crm_deals")
      .update(payload)
      .eq("id", deal.id);
    if (error) {
      toast.error("Erro ao atualizar etapa");
    } else {
      toast.success("Etapa atualizada");
      loadAll();
    }
  };

  // ── Save edit ──────────────────────────────────────────────────────────────

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;
    if (!editForm.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setEditSaving(true);
    const payload: Record<string, unknown> = {
      title: editForm.title.trim(),
      company: editForm.company || null,
      contact_name: editForm.contact_name || null,
      contact_phone: editForm.contact_phone || null,
      contact_email: editForm.contact_email || null,
      channel: editForm.channel || null,
      responsible: editForm.responsible || null,
      value_setup: editForm.value_setup ? parseFloat(editForm.value_setup) : null,
      value_mrr: editForm.value_mrr ? parseFloat(editForm.value_mrr) : null,
      source_notes: editForm.source_notes || null,
    };
    const { error } = await (supabase as any)
      .from("crm_deals")
      .update(payload)
      .eq("id", deal.id);
    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Deal atualizado");
      setEditOpen(false);
      loadAll();
    }
    setEditSaving(false);
  };

  const setEditField = (key: keyof EditDealForm, value: string) =>
    setEditForm((prev) => ({ ...prev, [key]: value }));

  // ── Save notes ─────────────────────────────────────────────────────────────

  const saveNotes = async () => {
    if (!deal) return;
    setNotesSaving(true);
    const { error } = await (supabase as any)
      .from("crm_deals")
      .update({ notes: notesEdit || null })
      .eq("id", deal.id);
    if (error) {
      toast.error("Erro ao salvar notas");
    } else {
      toast.success("Notas salvas");
      setDeal((prev) => prev ? { ...prev, notes: notesEdit || null } : prev);
    }
    setNotesSaving(false);
  };

  // ── Save lost reason ───────────────────────────────────────────────────────

  const saveLostReason = async () => {
    if (!deal) return;
    setLostReasonSaving(true);
    const { error } = await (supabase as any)
      .from("crm_deals")
      .update({ lost_reason: lostReasonEdit || null })
      .eq("id", deal.id);
    if (error) {
      toast.error("Erro ao salvar motivo");
    } else {
      toast.success("Motivo salvo");
      setDeal((prev) => prev ? { ...prev, lost_reason: lostReasonEdit || null } : prev);
    }
    setLostReasonSaving(false);
  };

  // ── Delete activity ────────────────────────────────────────────────────────

  const deleteActivity = async (actId: string) => {
    const { error } = await (supabase as any)
      .from("crm_activities")
      .delete()
      .eq("id", actId);
    if (error) {
      toast.error("Erro ao excluir atividade");
    } else {
      toast.success("Atividade removida");
      setActivities((prev) => prev.filter((a) => a.id !== actId));
    }
  };

  // ── Submit activity ────────────────────────────────────────────────────────

  const submitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;
    if (!activityForm.type) {
      toast.error("Tipo de atividade é obrigatório");
      return;
    }
    if (!activityForm.date) {
      toast.error("Data é obrigatória");
      return;
    }
    setActivitySubmitting(true);
    const payload: Record<string, unknown> = {
      deal_id: deal.id,
      type: activityForm.type,
      date: activityForm.date,
      description: activityForm.description || null,
      outcome: activityForm.outcome || null,
      next_action: activityForm.next_action || null,
      next_action_date: activityForm.next_action_date || null,
    };
    const { error } = await (supabase as any).from("crm_activities").insert(payload);
    if (error) {
      toast.error("Erro ao registrar atividade");
    } else {
      toast.success("Atividade registrada");
      setActivityForm(emptyActivity);
      // reload activities only
      const { data } = await (supabase as any)
        .from("crm_activities")
        .select("*")
        .eq("deal_id", deal.id)
        .order("date", { ascending: false });
      if (data) setActivities(data as Activity[]);
    }
    setActivitySubmitting(false);
  };

  const setActField = (key: keyof ActivityForm, value: string) =>
    setActivityForm((prev) => ({ ...prev, [key]: value }));

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        Carregando…
      </div>
    );
  }

  if (!deal) return null;

  const mrr12 = (deal.value_mrr ?? 0) * 12;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/comercial")}
          className="-ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Voltar ao Pipeline
        </Button>

        <PageHeader
          title={deal.company ?? deal.title}
          description={deal.company ? deal.title : undefined}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Stage badge */}
              <Badge
                variant="outline"
                className={STAGE_BADGE_COLORS[deal.stage]}
              >
                {STAGE_LABELS[deal.stage]}
              </Badge>

              {/* Inline stage selector */}
              <Select
                value={deal.stage}
                onValueChange={(v) => handleStageChange(v as DealStage)}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Edit button */}
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
            </div>
          }
        />
      </div>

      {/* Info cards — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contato */}
        <Card className="bg-gradient-surface border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Nome</span>
              <p className="font-medium">{deal.contact_name ?? "—"}</p>
            </div>
            {deal.contact_phone && (
              <div>
                <span className="text-xs text-muted-foreground">Telefone</span>
                <p>{deal.contact_phone}</p>
              </div>
            )}
            {deal.contact_email && (
              <div>
                <span className="text-xs text-muted-foreground">E-mail</span>
                <p className="break-all">{deal.contact_email}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Canal</span>
              <ChannelBadge channel={deal.channel} />
            </div>
          </CardContent>
        </Card>

        {/* Financeiro */}
        <Card className="bg-gradient-surface border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Setup</span>
              <p className="font-semibold tabular-nums">{brl(deal.value_setup)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">MRR</span>
              <p className="font-semibold tabular-nums">{brl(deal.value_mrr)}<span className="text-xs text-muted-foreground font-normal">/mês</span></p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total 12 meses</span>
              <p className="font-semibold tabular-nums text-primary">{brl(mrr12)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Datas */}
        <Card className="bg-gradient-surface border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Datas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Criado em</span>
              <p>{dateBR(deal.created_at)}</p>
            </div>
            {deal.closed_at && (
              <div>
                <span className="text-xs text-muted-foreground">Fechado em</span>
                <p>{dateBR(deal.closed_at)}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground">Responsável</span>
              <p className="font-medium">{deal.responsible ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Links: Proposta + Hub */}
      <div className="flex flex-wrap gap-3">
        {/* Proposta */}
        {deal.proposal_id ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/propostas/${deal.proposal_id}`)}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Ver Proposta
            <ExternalLink className="h-3 w-3 ml-1.5 opacity-60" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/propostas/nova?deal_id=${deal.id}`)}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Vincular Proposta
            <Plus className="h-3 w-3 ml-1.5 opacity-60" />
          </Button>
        )}

        {/* Hub */}
        {deal.hub_project_id ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/hub/projetos/${deal.hub_project_id}`)}
          >
            <FolderKanban className="h-4 w-4 mr-1.5" />
            Ver Projeto Hub
            <ExternalLink className="h-3 w-3 ml-1.5 opacity-60" />
          </Button>
        ) : deal.stage === "fechado_ganho" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/hub/projetos/novo")}
          >
            <FolderKanban className="h-4 w-4 mr-1.5" />
            Criar Projeto no Hub
            <Plus className="h-3 w-3 ml-1.5 opacity-60" />
          </Button>
        ) : null}
      </div>

      {/* Lost reason (only if perdido) */}
      {deal.stage === "fechado_perdido" && (
        <Card className="bg-rose-500/5 border-rose-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-4 w-4" />
              Motivo da Perda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={lostReasonEdit}
              onChange={(e) => setLostReasonEdit(e.target.value)}
              placeholder="Descreva o motivo pelo qual o deal foi perdido…"
              rows={3}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={saveLostReason}
              disabled={lostReasonSaving}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {lostReasonSaving ? "Salvando…" : "Salvar Motivo"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="bg-gradient-surface border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Anotações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notesEdit}
            onChange={(e) => setNotesEdit(e.target.value)}
            placeholder="Escreva suas anotações sobre este deal…"
            rows={4}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={saveNotes}
            disabled={notesSaving}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {notesSaving ? "Salvando…" : "Salvar Anotações"}
          </Button>
        </CardContent>
      </Card>

      {/* Register activity form */}
      <Card className="bg-gradient-surface border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Registrar Atividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitActivity} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Type */}
              <div className="space-y-1">
                <Label>
                  Tipo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={activityForm.type}
                  onValueChange={(v) => setActField("type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {ACTIVITY_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <Label htmlFor="act-date">
                  Data <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="act-date"
                  type="date"
                  value={activityForm.date}
                  onChange={(e) => setActField("date", e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="act-desc">Descrição</Label>
              <Textarea
                id="act-desc"
                value={activityForm.description}
                onChange={(e) => setActField("description", e.target.value)}
                placeholder="O que aconteceu nesta atividade?"
                rows={2}
              />
            </div>

            {/* Outcome */}
            <div className="space-y-1">
              <Label htmlFor="act-outcome">Resultado / Outcome</Label>
              <Textarea
                id="act-outcome"
                value={activityForm.outcome}
                onChange={(e) => setActField("outcome", e.target.value)}
                placeholder="Qual foi o resultado? Próximos passos combinados?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Next action */}
              <div className="space-y-1">
                <Label htmlFor="act-next">Próxima Ação</Label>
                <Input
                  id="act-next"
                  value={activityForm.next_action}
                  onChange={(e) => setActField("next_action", e.target.value)}
                  placeholder="Ex: Enviar proposta"
                />
              </div>

              {/* Next action date */}
              <div className="space-y-1">
                <Label htmlFor="act-next-date">Data da Próxima Ação</Label>
                <Input
                  id="act-next-date"
                  type="date"
                  value={activityForm.next_action_date}
                  onChange={(e) => setActField("next_action_date", e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" size="sm" disabled={activitySubmitting}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {activitySubmitting ? "Registrando…" : "Registrar Atividade"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Activities timeline */}
      <Card className="bg-gradient-surface border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Histórico de Atividades ({activities.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma atividade registrada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="flex gap-3 p-3 rounded-lg border border-border/40 bg-background/50"
                >
                  {/* Icon */}
                  <div className="text-muted-foreground pt-0.5">
                    <ActivityTypeIcon type={act.type} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {ACTIVITY_LABELS[act.type]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {dateBR(act.date)}
                      </span>
                    </div>

                    {act.description && (
                      <p className="text-sm">{act.description}</p>
                    )}

                    {act.outcome && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">Resultado:</span>{" "}
                        {act.outcome}
                      </p>
                    )}

                    {(act.next_action || act.next_action_date) && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 w-fit">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <span className="font-medium">Próx.:</span>
                        {act.next_action && <span>{act.next_action}</span>}
                        {act.next_action_date && (
                          <span className="opacity-80">— {dateBR(act.next_action_date)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteActivity(act.id)}
                    title="Excluir atividade"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Deal Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Deal</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Título */}
            <div className="space-y-1">
              <Label htmlFor="ed-title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ed-title"
                value={editForm.title}
                onChange={(e) => setEditField("title", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ed-company">Empresa</Label>
                <Input
                  id="ed-company"
                  value={editForm.company}
                  onChange={(e) => setEditField("company", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ed-resp">Responsável</Label>
                <Input
                  id="ed-resp"
                  value={editForm.responsible}
                  onChange={(e) => setEditField("responsible", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ed-contact">Contato</Label>
                <Input
                  id="ed-contact"
                  value={editForm.contact_name}
                  onChange={(e) => setEditField("contact_name", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Canal</Label>
                <Select
                  value={editForm.channel}
                  onValueChange={(v) => setEditField("channel", v)}
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
              <div className="space-y-1">
                <Label htmlFor="ed-phone">Telefone</Label>
                <Input
                  id="ed-phone"
                  value={editForm.contact_phone}
                  onChange={(e) => setEditField("contact_phone", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ed-email">E-mail</Label>
                <Input
                  id="ed-email"
                  type="email"
                  value={editForm.contact_email}
                  onChange={(e) => setEditField("contact_email", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ed-setup">Valor Setup (R$)</Label>
                <Input
                  id="ed-setup"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.value_setup}
                  onChange={(e) => setEditField("value_setup", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ed-mrr">MRR (R$/mês)</Label>
                <Input
                  id="ed-mrr"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.value_mrr}
                  onChange={(e) => setEditField("value_mrr", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ed-source">Origem / Observações da fonte</Label>
              <Textarea
                id="ed-source"
                value={editForm.source_notes}
                onChange={(e) => setEditField("source_notes", e.target.value)}
                rows={2}
                placeholder="Como chegou até nós, referência, etc."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
