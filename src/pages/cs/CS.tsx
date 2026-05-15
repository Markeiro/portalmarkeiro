import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { brl, dateBR } from "@/lib/format";
import { toast } from "sonner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  DollarSign,
  Heart,
  AlertTriangle,
  CalendarClock,
  Plus,
  AlertCircle,
  Calendar,
  Video,
  MessageCircle,
  Mail,
  Phone,
  Headphones,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Zap,
  UserCheck,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChurnRisk = "baixo" | "medio" | "alto" | "critico";
type InteractionType = "reuniao" | "whatsapp" | "email" | "ligacao" | "suporte" | "upsell";

interface HubClient {
  name: string;
  responsible: string | null;
  whatsapp: string | null;
  email: string | null;
}

interface HubProject {
  id: string;
  name: string;
  solution_type: string | null;
  status: string;
  progress_pct: number | null;
  mrr_brl: number | null;
  go_live_date: string | null;
  responsible_cs: string | null;
  client_id: string | null;
  hub_clients: HubClient | null;
}

interface CsHealth {
  id: string;
  created_at: string;
  updated_at: string;
  hub_project_id: string;
  health_score: number;
  churn_risk: ChurnRisk;
  last_contact_date: string | null;
  next_contact_date: string | null;
  nps_score: number | null;
  upsell_opportunity: string | null;
  notes: string | null;
  responsible_cs: string | null;
}

interface CsInteraction {
  id: string;
  created_at: string;
  hub_project_id: string;
  type: InteractionType;
  date: string;
  description: string | null;
  outcome: string | null;
  next_steps: string | null;
}

interface ClientRow {
  project: HubProject;
  health: CsHealth | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHURN_LABELS: Record<ChurnRisk, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

const CHURN_BADGE_CLASS: Record<ChurnRisk, string> = {
  baixo: "border-green-500/40 bg-green-500/10 text-green-600",
  medio: "border-yellow-500/40 bg-yellow-500/10 text-yellow-600",
  alto: "border-orange-500/40 bg-orange-500/10 text-orange-600",
  critico: "border-red-500/40 bg-red-500/10 text-red-600",
};

const INTERACTION_LABELS: Record<InteractionType, string> = {
  reuniao: "Reunião",
  whatsapp: "WhatsApp",
  email: "E-mail",
  ligacao: "Ligação",
  suporte: "Suporte",
  upsell: "Upsell",
};

const INTERACTION_BADGE_CLASS: Record<InteractionType, string> = {
  reuniao: "border-purple-500/40 bg-purple-500/10 text-purple-600",
  whatsapp: "border-green-500/40 bg-green-500/10 text-green-600",
  email: "border-blue-500/40 bg-blue-500/10 text-blue-600",
  ligacao: "border-sky-500/40 bg-sky-500/10 text-sky-600",
  suporte: "border-orange-500/40 bg-orange-500/10 text-orange-600",
  upsell: "border-cyan-500/40 bg-cyan-500/10 text-cyan-600",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split("T")[0];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr < today();
}

function isStale(dateStr: string | null): boolean {
  if (!dateStr) return true;
  return daysBetween(dateStr, today()) > 30;
}

function healthColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function healthRingClass(score: number): string {
  if (score >= 80) return "ring-green-500";
  if (score >= 60) return "ring-yellow-500";
  if (score >= 40) return "ring-orange-500";
  return "ring-red-500";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InteractionTypeIcon({ type }: { type: InteractionType }) {
  const cls = "h-4 w-4 shrink-0";
  switch (type) {
    case "reuniao":   return <Video className={cls} />;
    case "whatsapp":  return <MessageCircle className={cls} />;
    case "email":     return <Mail className={cls} />;
    case "ligacao":   return <Phone className={cls} />;
    case "suporte":   return <Headphones className={cls} />;
    case "upsell":    return <TrendingUp className={cls} />;
  }
}

function HealthCircle({ score }: { score: number }) {
  const color = healthColor(score);
  const ring = healthRingClass(score);
  return (
    <div
      className={`w-14 h-14 rounded-full ring-4 ${ring} flex items-center justify-center shrink-0`}
      style={{ background: `${color}18` }}
    >
      <span className="text-lg font-bold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// ─── Edit Health Dialog ───────────────────────────────────────────────────────

interface EditHealthDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: ClientRow | null;
  onSaved: () => void;
}

function EditHealthDialog({ open, onOpenChange, row, onSaved }: EditHealthDialogProps) {
  const existing = row?.health;
  const projectId = row?.project.id ?? "";

  const [healthScore, setHealthScore] = useState(existing?.health_score ?? 80);
  const [churnRisk, setChurnRisk] = useState<ChurnRisk>(existing?.churn_risk ?? "baixo");
  const [lastContact, setLastContact] = useState(existing?.last_contact_date ?? "");
  const [nextContact, setNextContact] = useState(existing?.next_contact_date ?? "");
  const [npsScore, setNpsScore] = useState<string>(existing?.nps_score != null ? String(existing.nps_score) : "");
  const [upsell, setUpsell] = useState(existing?.upsell_opportunity ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [responsibleCs, setResponsibleCs] = useState(
    existing?.responsible_cs ?? row?.project.responsible_cs ?? ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    const h = row.health;
    setHealthScore(h?.health_score ?? 80);
    setChurnRisk(h?.churn_risk ?? "baixo");
    setLastContact(h?.last_contact_date ?? "");
    setNextContact(h?.next_contact_date ?? "");
    setNpsScore(h?.nps_score != null ? String(h.nps_score) : "");
    setUpsell(h?.upsell_opportunity ?? "");
    setNotes(h?.notes ?? "");
    setResponsibleCs(h?.responsible_cs ?? row.project.responsible_cs ?? "");
  }, [open, row]);

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      hub_project_id: projectId,
      health_score: healthScore,
      churn_risk: churnRisk,
      last_contact_date: lastContact || null,
      next_contact_date: nextContact || null,
      nps_score: npsScore !== "" ? parseInt(npsScore, 10) : null,
      upsell_opportunity: upsell || null,
      notes: notes || null,
      responsible_cs: responsibleCs || null,
      updated_at: new Date().toISOString(),
    };

    let error: unknown;
    if (existing) {
      ({ error } = await (supabase as any).from("cs_health").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await (supabase as any).from("cs_health").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar saúde do cliente");
    } else {
      toast.success("Saúde do cliente atualizada!");
      onOpenChange(false);
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Saúde — {row?.project.hub_clients?.name ?? row?.project.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Health score */}
          <div className="space-y-2">
            <Label>Score de Saúde: <span className="font-bold tabular-nums">{healthScore}</span></Label>
            <input
              type="range"
              min={0}
              max={100}
              value={healthScore}
              onChange={(e) => setHealthScore(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span><span>50</span><span>100</span>
            </div>
          </div>

          {/* Churn risk */}
          <div className="space-y-1">
            <Label>Risco de Churn</Label>
            <Select value={churnRisk} onValueChange={(v) => setChurnRisk(v as ChurnRisk)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixo">Baixo</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Last contact */}
            <div className="space-y-1">
              <Label>Último Contato</Label>
              <Input type="date" value={lastContact} onChange={(e) => setLastContact(e.target.value)} />
            </div>
            {/* Next contact */}
            <div className="space-y-1">
              <Label>Próximo Contato</Label>
              <Input type="date" value={nextContact} onChange={(e) => setNextContact(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* NPS */}
            <div className="space-y-1">
              <Label>NPS (0–10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={npsScore}
                onChange={(e) => setNpsScore(e.target.value)}
                placeholder="—"
              />
            </div>
            {/* Responsible CS */}
            <div className="space-y-1">
              <Label>Responsável CS</Label>
              <Input
                value={responsibleCs}
                onChange={(e) => setResponsibleCs(e.target.value)}
                placeholder="Nome do CS"
              />
            </div>
          </div>

          {/* Upsell */}
          <div className="space-y-1">
            <Label>Oportunidade de Upsell</Label>
            <Input
              value={upsell}
              onChange={(e) => setUpsell(e.target.value)}
              placeholder="Descreva a oportunidade…"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações gerais…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Register Interaction Dialog ──────────────────────────────────────────────

interface InteractionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectLabel: string;
  healthId: string | null;
  onSaved: () => void;
}

function InteractionDialog({
  open,
  onOpenChange,
  projectId,
  projectLabel,
  healthId,
  onSaved,
}: InteractionDialogProps) {
  const [type, setType] = useState<InteractionType>("whatsapp");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType("whatsapp");
      setDate(today());
      setDescription("");
      setOutcome("");
      setNextSteps("");
    }
  }, [open]);

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);

    const payload = {
      hub_project_id: projectId,
      type,
      date,
      description: description || null,
      outcome: outcome || null,
      next_steps: nextSteps || null,
    };

    const { error } = await (supabase as any).from("cs_interactions").insert(payload);
    if (error) {
      toast.error("Erro ao registrar interação");
      setSaving(false);
      return;
    }

    // Update last_contact_date if type is reuniao or whatsapp
    if (type === "reuniao" || type === "whatsapp") {
      if (healthId) {
        await (supabase as any)
          .from("cs_health")
          .update({ last_contact_date: date, updated_at: new Date().toISOString() })
          .eq("id", healthId);
      }
    }

    toast.success("Interação registrada!");
    onOpenChange(false);
    onSaved();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Interação — {projectLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as InteractionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                  <SelectItem value="upsell">Upsell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que foi discutido / feito…"
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label>Resultado</Label>
            <Textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Resultado da interação…"
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label>Próximos Passos</Label>
            <Textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="O que deve ser feito em seguida…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add to CS Dialog ─────────────────────────────────────────────────────────

interface AddCsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unlinkedProjects: HubProject[];
  onSaved: () => void;
}

function AddCsDialog({ open, onOpenChange, unlinkedProjects, onSaved }: AddCsDialogProps) {
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelectedId("");
  }, [open]);

  const handleAdd = async () => {
    if (!selectedId) {
      toast.error("Selecione um projeto");
      return;
    }
    setSaving(true);
    const payload = {
      hub_project_id: selectedId,
      health_score: 80,
      churn_risk: "baixo",
      last_contact_date: null,
      next_contact_date: null,
      nps_score: null,
      upsell_opportunity: null,
      notes: null,
      responsible_cs: null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await (supabase as any).from("cs_health").insert(payload);
    if (error) {
      toast.error("Erro ao adicionar cliente ao CS");
    } else {
      toast.success("Cliente adicionado ao CS!");
      onOpenChange(false);
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Cliente ao CS</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Projeto</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto…" />
              </SelectTrigger>
              <SelectContent>
                {unlinkedProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.hub_clients?.name ?? p.name} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {unlinkedProjects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Todos os projetos ativos já estão no CS.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAdd} disabled={saving || !selectedId}>
            {saving ? "Adicionando…" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Client Card ──────────────────────────────────────────────────────────────

interface ClientCardProps {
  row: ClientRow;
  onEditHealth: (row: ClientRow) => void;
  onRegisterInteraction: (row: ClientRow) => void;
  onViewHub: (projectId: string) => void;
}

function ClientCard({ row, onEditHealth, onRegisterInteraction, onViewHub }: ClientCardProps) {
  const { project, health } = row;
  const score = health?.health_score ?? 80;
  const churnRisk: ChurnRisk = health?.churn_risk ?? "baixo";
  const lastContact = health?.last_contact_date ?? null;
  const nextContact = health?.next_contact_date ?? null;
  const nps = health?.nps_score ?? null;
  const upsell = health?.upsell_opportunity ?? null;
  const responsibleCs = health?.responsible_cs ?? project.responsible_cs ?? null;
  const clientName = project.hub_clients?.name ?? "—";

  const lastContactStale = isStale(lastContact);
  const nextContactOverdue = isOverdue(nextContact);

  // If health is null, render a minimal clickable card prompting configuration
  if (health === null) {
    return (
      <Card
        className="p-4 bg-gradient-surface border-border/50 shadow-card hover:shadow-elegant transition-shadow flex flex-col gap-3 cursor-pointer"
        onClick={() => onEditHealth(row)}
      >
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-full ring-4 ring-muted flex items-center justify-center shrink-0 bg-muted/30">
            <span className="text-lg font-bold tabular-nums text-muted-foreground">—</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{clientName}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{project.name}</p>
            <p className="text-xs text-muted-foreground/70 mt-2 italic">
              Sem dados de saúde — clique para configurar
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <span className="text-muted-foreground">MRR</span>
          <span className="font-medium tabular-nums">{project.mrr_brl != null ? brl(project.mrr_brl) : "—"}</span>
          <span className="text-muted-foreground">Resp. CS</span>
          <span className="truncate">{responsibleCs ?? "—"}</span>
        </div>
        <div className="flex gap-2 pt-1 border-t border-border/40">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-7"
            onClick={(e) => { e.stopPropagation(); onEditHealth(row); }}
          >
            Configurar saúde
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-7"
            onClick={(e) => { e.stopPropagation(); onRegisterInteraction(row); }}
          >
            Registrar interação
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 shrink-0"
            title="Ver projeto no Hub"
            onClick={(e) => { e.stopPropagation(); onViewHub(row.project.id); }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-surface border-border/50 shadow-card hover:shadow-elegant transition-shadow flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <HealthCircle score={score} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{clientName}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{project.name}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${CHURN_BADGE_CLASS[churnRisk]}`}>
              {CHURN_LABELS[churnRisk]}
            </Badge>
            {upsell && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-cyan-500/40 bg-cyan-500/10 text-cyan-600">
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                Upsell
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {nps != null && (
          <>
            <span className="text-muted-foreground">NPS</span>
            <span className="font-medium tabular-nums">{nps}/10</span>
          </>
        )}
        <span className="text-muted-foreground">MRR</span>
        <span className="font-medium tabular-nums">{project.mrr_brl != null ? brl(project.mrr_brl) : "—"}</span>

        <span className="text-muted-foreground">Resp. CS</span>
        <span className="truncate">{responsibleCs ?? "—"}</span>

        <span className="text-muted-foreground">Último contato</span>
        <span className={lastContactStale ? "text-red-500 font-medium" : ""}>
          {lastContact ? dateBR(lastContact) : <span className="text-red-500">Nunca</span>}
        </span>

        <span className="text-muted-foreground">Próx. contato</span>
        <span className={nextContactOverdue ? "text-red-500 font-medium" : ""}>
          {nextContact ? dateBR(nextContact) : "—"}
        </span>
      </div>

      {/* Upsell tag */}
      {upsell && (
        <div className="rounded-md bg-cyan-500/8 border border-cyan-500/20 px-2 py-1.5">
          <p className="text-[11px] text-cyan-700 dark:text-cyan-400 leading-snug">{upsell}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-border/40">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-7"
          onClick={() => onEditHealth(row)}
        >
          Editar saúde
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-7"
          onClick={() => onRegisterInteraction(row)}
        >
          Registrar interação
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 shrink-0"
          title="Ver projeto no Hub"
          onClick={() => onViewHub(row.project.id)}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CS() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<HubProject[]>([]);
  const [healthRecords, setHealthRecords] = useState<CsHealth[]>([]);
  const [interactions, setInteractions] = useState<CsInteraction[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [editHealthOpen, setEditHealthOpen] = useState(false);
  const [editHealthRow, setEditHealthRow] = useState<ClientRow | null>(null);

  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactionRow, setInteractionRow] = useState<{ projectId: string; projectLabel: string; healthId: string | null } | null>(null);

  const [addCsOpen, setAddCsOpen] = useState(false);

  // UI toggles
  const [showHistory, setShowHistory] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    const [projectsRes, healthRes, interactionsRes] = await Promise.all([
      (supabase as any)
        .from("hub_projects")
        .select("id, name, solution_type, status, progress_pct, mrr_brl, go_live_date, responsible_cs, client_id, hub_clients(name, responsible, whatsapp, email)")
        .neq("status", "encerrado"),
      (supabase as any).from("cs_health").select("*"),
      (supabase as any)
        .from("cs_interactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(50),
    ]);

    if (projectsRes.error) toast.error("Erro ao carregar projetos");
    if (healthRes.error) toast.error("Erro ao carregar saúde dos clientes");
    if (interactionsRes.error) toast.error("Erro ao carregar interações");

    setProjects((projectsRes.data ?? []) as HubProject[]);
    setHealthRecords((healthRes.data ?? []) as CsHealth[]);
    setInteractions((interactionsRes.data ?? []) as CsInteraction[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── Build unified client list ─────────────────────────────────────────────

  const CHURN_RISK_ORDER: Record<ChurnRisk, number> = { critico: 0, alto: 1, medio: 2, baixo: 3 };

  const clientRows: ClientRow[] = projects
    .map((p) => {
      const health = healthRecords.find((h) => h.hub_project_id === p.id) ?? null;
      return { project: p, health };
    })
    .sort((a, b) => {
      const riskA = a.health?.churn_risk ?? "baixo";
      const riskB = b.health?.churn_risk ?? "baixo";
      const riskDiff = CHURN_RISK_ORDER[riskA] - CHURN_RISK_ORDER[riskB];
      if (riskDiff !== 0) return riskDiff;
      // Null health (no score) goes last within same risk tier
      const scoreA = a.health?.health_score ?? 101;
      const scoreB = b.health?.health_score ?? 101;
      return scoreA - scoreB;
    });

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalClientes = projects.length;
  const mrrTotal = projects.reduce((sum, p) => sum + (p.mrr_brl ?? 0), 0);

  const avgHealth =
    healthRecords.length > 0
      ? Math.round(healthRecords.reduce((sum, h) => sum + h.health_score, 0) / healthRecords.length)
      : 80;

  const churnRiskCount = clientRows.filter(
    (r) => r.health?.churn_risk === "alto" || r.health?.churn_risk === "critico"
  ).length;

  const todayStr = today();
  const plus7 = addDays(todayStr, 7);
  const proximosContatos = clientRows.filter(
    (r) => r.health?.next_contact_date && r.health.next_contact_date <= plus7
  ).length;

  // ── Sections ──────────────────────────────────────────────────────────────

  const churnAlerts = clientRows.filter(
    (r) => r.health?.churn_risk === "critico" || r.health?.churn_risk === "alto"
  );

  const upcomingContacts = clientRows.filter(
    (r) => r.health?.next_contact_date && r.health.next_contact_date <= plus7
  );

  const upsellOpportunities = clientRows.filter(
    (r) => r.health?.upsell_opportunity && r.health.upsell_opportunity.trim() !== ""
  );

  // Projects without a cs_health record
  const linkedProjectIds = new Set(healthRecords.map((h) => h.hub_project_id));
  const unlinkedProjects = projects.filter((p) => !linkedProjectIds.has(p.id));

  // ── Interaction project label helper ──────────────────────────────────────
  const projectLabel = (projectId: string): string => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return projectId;
    return p.hub_clients?.name ? `${p.hub_clients.name} — ${p.name}` : p.name;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openEditHealth = (row: ClientRow) => {
    setEditHealthRow(row);
    setEditHealthOpen(true);
  };

  const openInteraction = (row: ClientRow) => {
    setInteractionRow({
      projectId: row.project.id,
      projectLabel: row.project.hub_clients?.name
        ? `${row.project.hub_clients.name} — ${row.project.name}`
        : row.project.name,
      healthId: row.health?.id ?? null,
    });
    setInteractionOpen(true);
  };

  const openInteractionById = (projectId: string) => {
    const row = clientRows.find((r) => r.project.id === projectId);
    if (row) openInteraction(row);
  };

  const goToHub = (projectId: string) => {
    navigate(`/hub/projetos/${projectId}`);
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-gradient-surface p-4 flex flex-col gap-3 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 rounded bg-muted w-3/4" />
                  <div className="h-3 rounded bg-muted w-1/2" />
                  <div className="h-4 rounded bg-muted w-16 mt-1" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 rounded bg-muted w-full" />
                <div className="h-3 rounded bg-muted w-5/6" />
                <div className="h-3 rounded bg-muted w-4/6" />
              </div>
              <div className="flex gap-2 pt-1 border-t border-border/40">
                <div className="h-7 flex-1 rounded bg-muted" />
                <div className="h-7 flex-1 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8">
      <PageHeader
        title="Customer Success"
        description="Saúde dos clientes, risco de churn e interações"
        actions={
          <Button size="sm" onClick={() => setAddCsOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar cliente ao CS
          </Button>
        }
      />

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <KpiCard
          label="Clientes ativos"
          value={String(totalClientes)}
          icon={Users}
          accent="primary"
        />
        <KpiCard
          label="MRR total"
          value={brl(mrrTotal)}
          icon={DollarSign}
          accent="success"
        />
        <KpiCard
          label="Saúde média"
          value={`${avgHealth}/100`}
          icon={Heart}
          accent={avgHealth >= 70 ? "success" : avgHealth >= 50 ? "warning" : "destructive"}
        />
        <KpiCard
          label="Risco de churn"
          value={String(churnRiskCount)}
          icon={AlertTriangle}
          accent={churnRiskCount > 0 ? "destructive" : "success"}
          tooltip="Clientes com risco alto ou crítico"
        />
        <KpiCard
          label="Próximos contatos"
          value={String(proximosContatos)}
          icon={CalendarClock}
          accent={proximosContatos > 0 ? "warning" : "primary"}
          tooltip="Contatos nos próximos 7 dias"
        />
      </div>

      {/* ── Churn Risk Alerts ──────────────────────────────────────────────── */}
      {churnAlerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            Alertas de Churn ({churnAlerts.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {churnAlerts.map(({ project, health }) => {
              const churnRisk: ChurnRisk = health?.churn_risk ?? "alto";
              const isCritico = churnRisk === "critico";
              return (
                <Card
                  key={project.id}
                  className={`p-4 border flex flex-col gap-2 ${
                    isCritico
                      ? "border-red-500/40 bg-red-500/5"
                      : "border-orange-500/40 bg-orange-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {project.hub_clients?.name ?? project.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{project.name}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${CHURN_BADGE_CLASS[churnRisk]}`}
                    >
                      {CHURN_LABELS[churnRisk]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 text-xs">
                    <span className="text-muted-foreground">MRR</span>
                    <span className="tabular-nums font-medium">{brl(project.mrr_brl ?? 0)}</span>
                    <span className="text-muted-foreground">CS</span>
                    <span className="truncate">{health?.responsible_cs ?? project.responsible_cs ?? "—"}</span>
                    <span className="text-muted-foreground">Último contato</span>
                    <span className={isStale(health?.last_contact_date ?? null) ? "text-red-500" : ""}>
                      {health?.last_contact_date ? dateBR(health.last_contact_date) : "Nunca"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs mt-1"
                    onClick={() => {
                      const row = clientRows.find((r) => r.project.id === project.id);
                      if (row) openEditHealth(row);
                    }}
                  >
                    Ver cliente
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Próximos Contatos ──────────────────────────────────────────────── */}
      {upcomingContacts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-amber-600">
            <Calendar className="h-4 w-4" />
            Próximos Contatos — 7 dias ({upcomingContacts.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingContacts.map(({ project, health }) => {
              const nextContact = health!.next_contact_date!;
              const overdue = nextContact < todayStr;
              return (
                <Card key={project.id} className="p-4 border-border/50 bg-gradient-surface flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {project.hub_clients?.name ?? project.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{project.name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 text-xs">
                    <span className="text-muted-foreground">Contato</span>
                    <span className={overdue ? "text-red-500 font-medium" : "text-amber-600 font-medium"}>
                      {dateBR(nextContact)}
                    </span>
                    <span className="text-muted-foreground">CS</span>
                    <span className="truncate">{health?.responsible_cs ?? project.responsible_cs ?? "—"}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs mt-1"
                    onClick={() => openInteractionById(project.id)}
                  >
                    Registrar contato
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Client Health Grid ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          Saúde dos Clientes ({clientRows.length})
        </h2>
        {clientRows.length === 0 ? (
          <Card className="p-12 border-border/50 bg-gradient-surface flex flex-col items-center gap-3 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">Nenhum projeto encontrado</p>
              <p className="text-muted-foreground/70 text-xs max-w-sm">
                A aba CS exibe projetos ativos (exceto encerrados). Crie ou ative projetos no Hub e depois adicione-os ao CS.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button size="sm" variant="outline" onClick={() => navigate("/hub")}>
                Ir para o Hub
              </Button>
              <Button size="sm" onClick={() => setAddCsOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Adicionar cliente ao CS
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientRows.map((row) => (
              <ClientCard
                key={row.project.id}
                row={row}
                onEditHealth={openEditHealth}
                onRegisterInteraction={openInteraction}
                onViewHub={goToHub}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Upsell Opportunities ───────────────────────────────────────────── */}
      {upsellOpportunities.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-cyan-600">
            <TrendingUp className="h-4 w-4" />
            Oportunidades de Upsell ({upsellOpportunities.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upsellOpportunities.map(({ project, health }) => (
              <Card key={project.id} className="p-4 border-cyan-500/30 bg-cyan-500/5 flex flex-col gap-2">
                <div>
                  <p className="font-semibold text-sm truncate">{project.hub_clients?.name ?? project.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{project.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-3 text-xs">
                  <span className="text-muted-foreground">MRR atual</span>
                  <span className="tabular-nums font-medium">{brl(project.mrr_brl ?? 0)}</span>
                </div>
                <div className="rounded-md bg-cyan-500/10 border border-cyan-500/20 px-2 py-1.5">
                  <p className="text-[11px] text-cyan-700 dark:text-cyan-400 leading-snug">
                    {health?.upsell_opportunity}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-cyan-500/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/10"
                  onClick={() => {
                    const params = new URLSearchParams({
                      company: project.hub_clients?.name ?? project.name,
                      mrr: String(project.mrr_brl ?? ""),
                      notes: health?.upsell_opportunity ?? "",
                      new: "1",
                    });
                    navigate("/comercial?" + params.toString());
                  }}
                >
                  Criar deal
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Interactions History ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-2"
        >
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Histórico de Interações ({interactions.length})
        </Button>

        {showHistory && (
          <Card className="bg-gradient-surface border-border/50 overflow-hidden">
            {interactions.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                Nenhuma interação registrada ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Próximos Passos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interactions.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="text-sm font-medium whitespace-nowrap">
                          {projectLabel(i.hub_project_id)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <InteractionTypeIcon type={i.type} />
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-4 px-1.5 ${INTERACTION_BADGE_CLASS[i.type]}`}
                            >
                              {INTERACTION_LABELS[i.type]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{dateBR(i.date)}</TableCell>
                        <TableCell className="text-sm max-w-[200px]">
                          <span className="line-clamp-2">{i.description ?? "—"}</span>
                        </TableCell>
                        <TableCell className="text-sm max-w-[180px]">
                          <span className="line-clamp-2">{i.outcome ?? "—"}</span>
                        </TableCell>
                        <TableCell className="text-sm max-w-[180px]">
                          <span className="line-clamp-2">{i.next_steps ?? "—"}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}
      </section>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}

      <EditHealthDialog
        open={editHealthOpen}
        onOpenChange={setEditHealthOpen}
        row={editHealthRow}
        onSaved={load}
      />

      {interactionRow && (
        <InteractionDialog
          open={interactionOpen}
          onOpenChange={setInteractionOpen}
          projectId={interactionRow.projectId}
          projectLabel={interactionRow.projectLabel}
          healthId={interactionRow.healthId}
          onSaved={load}
        />
      )}

      <AddCsDialog
        open={addCsOpen}
        onOpenChange={setAddCsOpen}
        unlinkedProjects={unlinkedProjects}
        onSaved={load}
      />
    </div>
  );
}
