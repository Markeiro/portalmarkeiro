import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { brl, dateBR } from "@/lib/format";
import {
  ArrowLeft,
  Copy,
  Trash2,
  ExternalLink,
  Plus,
  Save,
  X,
  Upload,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubClient {
  id: string;
  name: string;
  responsible: string | null;
  whatsapp: string | null;
  email: string | null;
  segment: string | null;
  city: string | null;
  notes: string | null;
  active: boolean;
}

interface HubProject {
  id: string;
  client_id: string;
  name: string;
  solution_type: string | null;
  status: string;
  progress_pct: number | null;
  responsible_commercial: string | null;
  responsible_technical: string | null;
  responsible_cs: string | null;
  start_date: string | null;
  go_live_date: string | null;
  contract_period_months: number | null;
  setup_value_brl: number | null;
  mrr_brl: number | null;
  notes: string | null;
  html_url: string | null;
  extracted_data: Record<string, unknown> | null;
  extraction_reviewed: boolean | null;
  slug: string | null;
  portal_link_sent: boolean | null;
  portal_link_sent_at: string | null;
  project_id: string | null;
  hub_clients: HubClient | null;
}

interface HubCheckpoint {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  responsible: string | null;
  due_date: string | null;
  completed_at: string | null;
  status: string;
  sort_order: number | null;
  notes: string | null;
}

interface HubTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  responsible: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  sort_order: number | null;
}

interface HubPending {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  owner: string;
  due_date: string | null;
  status: string;
  resolved_at: string | null;
  created_at?: string;
}

interface HubFile {
  id: string;
  project_id: string;
  name: string;
  url: string;
  file_type: string | null;
  category: string | null;
  uploaded_by: string | null;
}

interface HubPortal {
  id: string;
  project_id: string;
  email: string | null;
  pin: string | null;
  first_access_at: string | null;
  onboarding_done: boolean | null;
  onboarding_done_at: string | null;
  last_access_at: string | null;
}

interface HubTokenUsage {
  id: string;
  project_id: string;
  period: string | null;
  agent_name: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
}

interface HubResult {
  id: string;
  project_id: string;
  period: string | null;
  metric_name: string;
  metric_value: number | null;
  metric_unit: string | null;
  notes: string | null;
}

interface HubSupport {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  source: string | null;
  resolved_at: string | null;
  created_at?: string;
}

interface HubUpdate {
  id: string;
  project_id: string;
  message: string;
  source: string | null;
  visible_to_client: boolean | null;
  created_at: string;
}

// ─── Status constants ─────────────────────────────────────────────────────────

const PROJECT_STATUS_VALUES = [
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

const PROJECT_STATUS_LABELS: Record<string, string> = {
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

const CHECKPOINT_STATUS_VALUES = [
  "pendente",
  "em_andamento",
  "aguardando_cliente",
  "concluido",
  "atrasado",
] as const;

const CHECKPOINT_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguard. cliente",
  concluido: "Concluído",
  atrasado: "Atrasado",
};

const TASK_STATUS_VALUES = [
  "a_fazer",
  "em_andamento",
  "aguardando_cliente",
  "concluido",
] as const;

const TASK_STATUS_LABELS: Record<string, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguard. cliente",
  concluido: "Concluído",
};

const TASK_PRIORITY_VALUES = ["baixa", "media", "alta", "critica"] as const;
const TASK_PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

const PENDING_OWNER_VALUES = [
  "cliente",
  "solicitai",
  "tecnico",
  "financeiro",
] as const;
const PENDING_OWNER_LABELS: Record<string, string> = {
  cliente: "Cliente",
  solicitai: "SolicitAí",
  tecnico: "Técnico",
  financeiro: "Financeiro",
};

const PENDING_STATUS_VALUES = [
  "pendente",
  "enviado",
  "em_analise",
  "aprovado",
  "reprovado",
] as const;
const PENDING_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const SUPPORT_STATUS_VALUES = [
  "aberto",
  "em_andamento",
  "resolvido",
  "fechado",
] as const;
const SUPPORT_STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

// ─── Badge helpers ────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  switch (status) {
    case "novo":
      return "border-border bg-muted/40 text-muted-foreground";
    case "em_implantacao":
      return "border-blue-500/40 bg-blue-500/10 text-blue-500";
    case "em_validacao":
      return "border-blue-400/40 bg-blue-400/10 text-blue-400";
    case "go_live":
      return "border-green-500/40 bg-green-500/10 text-green-600";
    case "ativo":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600";
    case "aguardando_acesso":
      return "border-yellow-500/40 bg-yellow-500/10 text-yellow-600";
    case "aguardando_revisao_html":
    case "aguardando_validacao":
    case "aguardando_aprovacao":
      return "border-yellow-400/40 bg-yellow-400/10 text-yellow-500";
    case "onboarding_iniciado":
      return "border-purple-500/40 bg-purple-500/10 text-purple-500";
    case "onboarding_concluido":
      return "border-purple-400/40 bg-purple-400/10 text-purple-400";
    case "coleta_informacoes":
      return "border-orange-400/40 bg-orange-400/10 text-orange-500";
    case "portal_criado":
    case "link_enviado":
    case "dados_extraidos":
      return "border-sky-400/40 bg-sky-400/10 text-sky-500";
    case "encerrado":
      return "border-border bg-muted/20 text-muted-foreground";
    case "pausado":
      return "border-border bg-muted/30 text-muted-foreground";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

function checkpointBadgeClass(status: string): string {
  switch (status) {
    case "pendente":
      return "border-border bg-muted/40 text-muted-foreground";
    case "em_andamento":
      return "border-blue-500/40 bg-blue-500/10 text-blue-500";
    case "aguardando_cliente":
      return "border-yellow-500/40 bg-yellow-500/10 text-yellow-600";
    case "concluido":
      return "border-green-500/40 bg-green-500/10 text-green-600";
    case "atrasado":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

function taskPriorityClass(priority: string): string {
  switch (priority) {
    case "baixa":
      return "border-border bg-muted/40 text-muted-foreground";
    case "media":
      return "border-blue-400/40 bg-blue-400/10 text-blue-500";
    case "alta":
      return "border-orange-400/40 bg-orange-400/10 text-orange-500";
    case "critica":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

function pendingOwnerClass(owner: string): string {
  switch (owner) {
    case "cliente":
      return "border-blue-400/40 bg-blue-400/10 text-blue-500";
    case "solicitai":
      return "border-purple-400/40 bg-purple-400/10 text-purple-500";
    case "tecnico":
      return "border-orange-400/40 bg-orange-400/10 text-orange-500";
    case "financeiro":
      return "border-green-400/40 bg-green-400/10 text-green-600";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

function supportBadgeClass(status: string): string {
  switch (status) {
    case "aberto":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "em_andamento":
      return "border-blue-400/40 bg-blue-400/10 text-blue-500";
    case "resolvido":
      return "border-green-400/40 bg-green-400/10 text-green-600";
    case "fechado":
      return "border-border bg-muted/30 text-muted-foreground";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

// ─── Tab pill helper ───────────────────────────────────────────────────────────

type TabName =
  | "Resumo"
  | "Checkpoints"
  | "Tarefas"
  | "Pendências"
  | "Arquivos"
  | "Tokens"
  | "Resultados"
  | "Suporte";

const ALL_TABS: TabName[] = [
  "Resumo",
  "Checkpoints",
  "Tarefas",
  "Pendências",
  "Arquivos",
  "Tokens",
  "Resultados",
  "Suporte",
];

function isoToday(): string {
  return new Date().toISOString().substring(0, 10);
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function HubProjetoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Data states
  const [project, setProject] = useState<HubProject | null>(null);
  const [checkpoints, setCheckpoints] = useState<HubCheckpoint[]>([]);
  const [tasks, setTasks] = useState<HubTask[]>([]);
  const [pending, setPending] = useState<HubPending[]>([]);
  const [files, setFiles] = useState<HubFile[]>([]);
  const [portal, setPortal] = useState<HubPortal | null>(null);
  const [tokenUsage, setTokenUsage] = useState<HubTokenUsage[]>([]);
  const [results, setResults] = useState<HubResult[]>([]);
  const [support, setSupport] = useState<HubSupport[]>([]);
  const [updates, setUpdates] = useState<HubUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  // ── UI states
  const [activeTab, setActiveTab] = useState<TabName>("Resumo");

  // ── Progress edit
  const [progressEdit, setProgressEdit] = useState(false);
  const [progressVal, setProgressVal] = useState(0);

  // ── Resumo edit
  const [editingResumo, setEditingResumo] = useState(false);
  const [resumoForm, setResumoForm] = useState({
    name: "",
    solution_type: "",
    setup_value_brl: "",
    mrr_brl: "",
    go_live_date: "",
    notes: "",
  });

  // ── Checkpoint add form
  const [showCpForm, setShowCpForm] = useState(false);
  const [cpForm, setCpForm] = useState({
    name: "",
    description: "",
    responsible: "",
    due_date: "",
    status: "pendente",
  });

  // ── Task add form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    responsible: "",
    due_date: "",
    priority: "media",
    status: "a_fazer",
  });

  // ── Pending add form
  const [showPendingForm, setShowPendingForm] = useState(false);
  const [pendingForm, setPendingForm] = useState({
    title: "",
    description: "",
    owner: "cliente",
    due_date: "",
    status: "pendente",
  });

  // ── Token add form
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [tokenForm, setTokenForm] = useState({
    period: "",
    agent_name: "",
    input_tokens: "",
    output_tokens: "",
    cost_usd: "",
  });

  // ── Result add form
  const [showResultForm, setShowResultForm] = useState(false);
  const [resultForm, setResultForm] = useState({
    metric_name: "",
    metric_value: "",
    metric_unit: "",
    period: "",
    notes: "",
  });

  // ── Support add form
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportForm, setSupportForm] = useState({
    title: "",
    description: "",
  });

  // ── Activity update form
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateVisible, setUpdateVisible] = useState(false);

  // ── File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // ─── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    if (!id) return;
    const [
      { data: proj },
      { data: cps },
      { data: tks },
      { data: pnd },
      { data: fls },
      { data: prt },
      { data: tkn },
      { data: res },
      { data: sup },
      { data: upd },
    ] = await Promise.all([
      supabase
        .from("hub_projects")
        .select("*, hub_clients(*)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("hub_checkpoints")
        .select("*")
        .eq("project_id", id)
        .order("sort_order"),
      supabase
        .from("hub_tasks")
        .select("*")
        .eq("project_id", id)
        .order("sort_order"),
      supabase
        .from("hub_pending")
        .select("*")
        .eq("project_id", id)
        .order("created_at"),
      supabase.from("hub_files").select("*").eq("project_id", id),
      supabase
        .from("hub_portals")
        .select("*")
        .eq("project_id", id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("hub_token_usage")
        .select("*")
        .eq("project_id", id)
        .order("period", { ascending: false }),
      supabase.from("hub_results").select("*").eq("project_id", id),
      supabase
        .from("hub_support")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("hub_updates")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const p = proj as HubProject | null;
    setProject(p);
    setCheckpoints((cps as HubCheckpoint[]) || []);
    setTasks((tks as HubTask[]) || []);
    setPending((pnd as HubPending[]) || []);
    setFiles((fls as HubFile[]) || []);
    setPortal(prt as HubPortal | null);
    setTokenUsage((tkn as HubTokenUsage[]) || []);
    setResults((res as HubResult[]) || []);
    setSupport((sup as HubSupport[]) || []);
    setUpdates((upd as HubUpdate[]) || []);

    if (p) {
      setProgressVal(p.progress_pct ?? 0);
      setResumoForm({
        name: p.name ?? "",
        solution_type: p.solution_type ?? "",
        setup_value_brl: String(p.setup_value_brl ?? ""),
        mrr_brl: String(p.mrr_brl ?? ""),
        go_live_date: p.go_live_date ?? "",
        notes: p.notes ?? "",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <div className="text-muted-foreground p-6">Carregando...</div>;
  if (!project) return <div className="text-muted-foreground p-6">Projeto não encontrado.</div>;

  const client = project.hub_clients;
  const portalUrl = project.slug
    ? `${window.location.origin}/portal/${project.slug}`
    : null;

  // ─── Status update ─────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase
      .from("hub_projects")
      .update({ status: newStatus })
      .eq("id", project.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status atualizado");
      load();
    }
  };

  // ─── Progress update ───────────────────────────────────────────────────────

  const handleProgressSave = async () => {
    const { error } = await supabase
      .from("hub_projects")
      .update({ progress_pct: progressVal })
      .eq("id", project.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Progresso atualizado");
      setProgressEdit(false);
      load();
    }
  };

  // ─── Resumo edit ──────────────────────────────────────────────────────────

  const handleResumoSave = async () => {
    const { error } = await supabase
      .from("hub_projects")
      .update({
        name: resumoForm.name,
        solution_type: resumoForm.solution_type || null,
        setup_value_brl: resumoForm.setup_value_brl
          ? parseFloat(resumoForm.setup_value_brl)
          : null,
        mrr_brl: resumoForm.mrr_brl ? parseFloat(resumoForm.mrr_brl) : null,
        go_live_date: resumoForm.go_live_date || null,
        notes: resumoForm.notes || null,
      })
      .eq("id", project.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Projeto atualizado");
      setEditingResumo(false);
      load();
    }
  };

  // ─── Checkpoints ──────────────────────────────────────────────────────────

  const handleCpStatusChange = async (cpId: string, status: string) => {
    const { error } = await supabase
      .from("hub_checkpoints")
      .update({ status })
      .eq("id", cpId);
    if (error) toast.error(error.message);
    else load();
  };

  const handleCpNotesChange = async (cpId: string, notes: string) => {
    const { error } = await supabase
      .from("hub_checkpoints")
      .update({ notes })
      .eq("id", cpId);
    if (error) toast.error(error.message);
    else load();
  };

  const handleCpAdd = async () => {
    if (!cpForm.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const { error } = await supabase.from("hub_checkpoints").insert({
      project_id: id!,
      name: cpForm.name,
      description: cpForm.description || null,
      responsible: cpForm.responsible || null,
      due_date: cpForm.due_date || null,
      status: cpForm.status,
      sort_order: checkpoints.length + 1,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Checkpoint adicionado");
      setCpForm({ name: "", description: "", responsible: "", due_date: "", status: "pendente" });
      setShowCpForm(false);
      load();
    }
  };

  const handleCpDelete = async (cpId: string) => {
    if (!confirm("Remover este checkpoint?")) return;
    const { error } = await supabase
      .from("hub_checkpoints")
      .delete()
      .eq("id", cpId);
    if (error) toast.error(error.message);
    else {
      toast.success("Checkpoint removido");
      load();
    }
  };

  // ─── Tasks ────────────────────────────────────────────────────────────────

  const TASK_STATUS_CYCLE: string[] = [
    "a_fazer",
    "em_andamento",
    "aguardando_cliente",
    "concluido",
  ];

  const cycleTaskStatus = async (task: HubTask) => {
    const idx = TASK_STATUS_CYCLE.indexOf(task.status);
    const next = TASK_STATUS_CYCLE[(idx + 1) % TASK_STATUS_CYCLE.length];
    const { error } = await supabase
      .from("hub_tasks")
      .update({ status: next })
      .eq("id", task.id);
    if (error) toast.error(error.message);
    else load();
  };

  const handleTaskAdd = async () => {
    if (!taskForm.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    const { error } = await supabase.from("hub_tasks").insert({
      project_id: id!,
      title: taskForm.title,
      description: taskForm.description || null,
      responsible: taskForm.responsible || null,
      due_date: taskForm.due_date || null,
      priority: taskForm.priority,
      status: taskForm.status,
      sort_order: tasks.length + 1,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Tarefa adicionada");
      setTaskForm({ title: "", description: "", responsible: "", due_date: "", priority: "media", status: "a_fazer" });
      setShowTaskForm(false);
      load();
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!confirm("Remover esta tarefa?")) return;
    const { error } = await supabase
      .from("hub_tasks")
      .delete()
      .eq("id", taskId);
    if (error) toast.error(error.message);
    else {
      toast.success("Tarefa removida");
      load();
    }
  };

  // ─── Pending ──────────────────────────────────────────────────────────────

  const handlePendingStatusChange = async (pendingId: string, status: string) => {
    const { error } = await supabase
      .from("hub_pending")
      .update({ status })
      .eq("id", pendingId);
    if (error) toast.error(error.message);
    else load();
  };

  const handlePendingResolve = async (pendingId: string) => {
    const { error } = await supabase
      .from("hub_pending")
      .update({ status: "aprovado", resolved_at: new Date().toISOString() })
      .eq("id", pendingId);
    if (error) toast.error(error.message);
    else {
      toast.success("Pendência resolvida");
      load();
    }
  };

  const handlePendingAdd = async () => {
    if (!pendingForm.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    const { error } = await supabase.from("hub_pending").insert({
      project_id: id!,
      title: pendingForm.title,
      description: pendingForm.description || null,
      owner: pendingForm.owner,
      due_date: pendingForm.due_date || null,
      status: pendingForm.status,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Pendência adicionada");
      setPendingForm({ title: "", description: "", owner: "cliente", due_date: "", status: "pendente" });
      setShowPendingForm(false);
      load();
    }
  };

  // ─── Files ────────────────────────────────────────────────────────────────

  const handleFileUpload = async (file: File) => {
    if (!project.slug) {
      toast.error("Projeto sem slug. Não é possível fazer upload.");
      return;
    }
    setUploading(true);
    const path = `projects/${project.slug}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage
      .from("hub-files")
      .upload(path, file);
    if (upErr) {
      toast.error("Erro no upload: " + upErr.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("hub-files").getPublicUrl(path);
    const { error } = await supabase.from("hub_files").insert({
      project_id: id!,
      name: file.name,
      url: urlData.publicUrl,
      file_type: file.type || null,
      uploaded_by: "admin",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Arquivo enviado");
      load();
    }
    setUploading(false);
  };

  // ─── Token usage ──────────────────────────────────────────────────────────

  const handleTokenAdd = async () => {
    const { error } = await supabase.from("hub_token_usage").insert({
      project_id: id!,
      period: tokenForm.period || null,
      agent_name: tokenForm.agent_name || null,
      input_tokens: tokenForm.input_tokens ? parseInt(tokenForm.input_tokens) : null,
      output_tokens: tokenForm.output_tokens ? parseInt(tokenForm.output_tokens) : null,
      cost_usd: tokenForm.cost_usd ? parseFloat(tokenForm.cost_usd) : null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Uso registrado");
      setTokenForm({ period: "", agent_name: "", input_tokens: "", output_tokens: "", cost_usd: "" });
      setShowTokenForm(false);
      load();
    }
  };

  // ─── Results ──────────────────────────────────────────────────────────────

  const handleResultAdd = async () => {
    if (!resultForm.metric_name.trim()) {
      toast.error("Nome da métrica é obrigatório");
      return;
    }
    const { error } = await supabase.from("hub_results").insert({
      project_id: id!,
      metric_name: resultForm.metric_name,
      metric_value: resultForm.metric_value ? parseFloat(resultForm.metric_value) : null,
      metric_unit: resultForm.metric_unit || null,
      period: resultForm.period || null,
      notes: resultForm.notes || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Métrica adicionada");
      setResultForm({ metric_name: "", metric_value: "", metric_unit: "", period: "", notes: "" });
      setShowResultForm(false);
      load();
    }
  };

  // ─── Support ──────────────────────────────────────────────────────────────

  const handleSupportAdd = async () => {
    if (!supportForm.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    const { error } = await supabase.from("hub_support").insert({
      project_id: id!,
      title: supportForm.title,
      description: supportForm.description || null,
      status: "aberto",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Chamado aberto");
      setSupportForm({ title: "", description: "" });
      setShowSupportForm(false);
      load();
    }
  };

  const handleSupportStatusChange = async (supId: string, status: string) => {
    const { error } = await supabase
      .from("hub_support")
      .update({ status })
      .eq("id", supId);
    if (error) toast.error(error.message);
    else load();
  };

  // ─── Updates ──────────────────────────────────────────────────────────────

  const handleUpdateSubmit = async () => {
    if (!updateMessage.trim()) return;
    const { error } = await supabase.from("hub_updates").insert({
      project_id: id!,
      message: updateMessage,
      source: "solicitai",
      visible_to_client: updateVisible,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Atualização registrada");
      setUpdateMessage("");
      setUpdateVisible(false);
      load();
    }
  };

  // ─── Extracted data helpers ────────────────────────────────────────────────

  const ext = (project.extracted_data ?? {}) as Record<string, unknown>;
  function extStr(key: string): string {
    const v = ext[key];
    if (!v) return "—";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/hub/projetos")}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Projetos
      </button>

      {/* Page header */}
      <PageHeader
        title={`${client?.name ?? "—"} — ${project.name}`}
        description={project.solution_type ?? undefined}
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <Badge
              variant="outline"
              className={`text-xs ${statusBadgeClass(project.status)}`}
            >
              {PROJECT_STATUS_LABELS[project.status] ?? project.status}
            </Badge>
            {project.project_id && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/projetos/${project.project_id}`)}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Ver Financeiro
              </Button>
            )}
          </div>
        }
      />

      {/* Status + progress quick controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={project.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-56 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">
            Progresso — {project.progress_pct ?? 0}%
          </Label>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, project.progress_pct ?? 0))}%` }}
            />
          </div>
          {progressEdit ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min={0}
                max={100}
                className="h-7 w-20 text-sm"
                value={progressVal}
                onChange={(e) => setProgressVal(Number(e.target.value))}
              />
              <Button size="sm" className="h-7 text-xs" onClick={handleProgressSave}>
                <Save className="h-3 w-3 mr-1" /> Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setProgressEdit(false); setProgressVal(project.progress_pct ?? 0); }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setProgressEdit(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Editar progresso
            </button>
          )}
        </div>
      </div>

      {/* Portal info card — show whenever slug exists */}
      {portalUrl && (
        <Card className="p-4 bg-gradient-surface border-border/50 space-y-3">
          <h3 className="font-semibold text-sm">Portal do Cliente</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0">URL:</span>
              <span className="font-mono text-xs truncate max-w-xs">{portalUrl}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success("Link copiado"); }}
                className="shrink-0"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            {portal ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">PIN:</span>
                  <span className="font-mono font-semibold">{portal.pin ?? "—"}</span>
                  {portal.pin && (
                    <button onClick={() => { navigator.clipboard.writeText(portal.pin!); toast.success("PIN copiado"); }}>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Onboarding:</span>
                  {portal.onboarding_done ? (
                    <Badge variant="outline" className="text-xs border-green-400/40 bg-green-400/10 text-green-600">
                      Concluído
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-border bg-muted/40 text-muted-foreground">
                      Pendente
                    </Badge>
                  )}
                </div>
                {portal.last_access_at && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Último acesso:</span>
                    <span>{new Date(portal.last_access_at).toLocaleString("pt-BR")}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-amber-500 text-xs">
                <span>PIN não gerado.</span>
                <button
                  className="underline hover:no-underline"
                  onClick={async () => {
                    const pin = Math.random().toString().slice(2, 8);
                    const { error } = await (supabase as any).from("hub_portals").insert({
                      project_id: project.id,
                      email: client?.email ?? null,
                      pin,
                    });
                    if (error) { toast.error("Erro ao criar portal: " + error.message); return; }
                    toast.success(`Portal criado! PIN: ${pin}`);
                    load();
                  }}
                >
                  Gerar agora
                </button>
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info("Copie o link acima e envie no WhatsApp")}
          >
            Enviar link ao cliente
          </Button>
        </Card>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 border-b border-border/50 pb-1">
        {ALL_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab: Resumo ──────────────────────────────────────────────────────── */}
      {activeTab === "Resumo" && (
        <div className="space-y-4">
          {/* Extracted data */}
          {project.extracted_data && (
            <Card className="p-4 bg-gradient-surface border-border/50">
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                Briefing extraído
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  ["Objetivo", "objetivo"],
                  ["Problema", "problema"],
                  ["Solução", "solucao"],
                  ["Escopo", "escopo"],
                  ["Integrações", "integracoes"],
                  ["Entregáveis", "entregaveis"],
                ].map(([label, key]) => (
                  <div key={key} className="space-y-0.5">
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <p>{extStr(key)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Commercial data */}
          <Card className="p-4 bg-gradient-surface border-border/50">
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
              Dados comerciais
            </h3>
            {!editingResumo ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Setup</p>
                  <p className="font-semibold">{brl(project.setup_value_brl)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MRR</p>
                  <p className="font-semibold">{brl(project.mrr_brl)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prazo contrato</p>
                  <p className="font-semibold">
                    {project.contract_period_months
                      ? `${project.contract_period_months} meses`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Início</p>
                  <p className="font-semibold">
                    {project.start_date ? dateBR(project.start_date) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Go-live previsto</p>
                  <p className="font-semibold">
                    {project.go_live_date ? dateBR(project.go_live_date) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Solução</p>
                  <p className="font-semibold">{project.solution_type ?? "—"}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do projeto</Label>
                  <Input
                    value={resumoForm.name}
                    onChange={(e) => setResumoForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de solução</Label>
                  <Input
                    value={resumoForm.solution_type}
                    onChange={(e) => setResumoForm((f) => ({ ...f, solution_type: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Setup (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={resumoForm.setup_value_brl}
                    onChange={(e) => setResumoForm((f) => ({ ...f, setup_value_brl: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">MRR (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={resumoForm.mrr_brl}
                    onChange={(e) => setResumoForm((f) => ({ ...f, mrr_brl: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Go-live previsto</Label>
                  <Input
                    type="date"
                    value={resumoForm.go_live_date}
                    onChange={(e) => setResumoForm((f) => ({ ...f, go_live_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    rows={2}
                    value={resumoForm.notes}
                    onChange={(e) => setResumoForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <Button size="sm" onClick={handleResumoSave}>
                    <Save className="h-4 w-4 mr-1" /> Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingResumo(false)}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                </div>
              </div>
            )}
            {!editingResumo && (
              <button
                onClick={() => setEditingResumo(true)}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                Editar
              </button>
            )}
          </Card>

          {/* Team */}
          <Card className="p-4 bg-gradient-surface border-border/50">
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
              Equipe
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Comercial</p>
                <p className="font-semibold">{project.responsible_commercial ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Técnico</p>
                <p className="font-semibold">{project.responsible_technical ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CS</p>
                <p className="font-semibold">{project.responsible_cs ?? "—"}</p>
              </div>
            </div>
          </Card>

          {/* Client */}
          {client && (
            <Card className="p-4 bg-gradient-surface border-border/50">
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                Cliente
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-semibold">{client.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="font-semibold">{client.responsible ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="font-semibold">{client.whatsapp ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-semibold">{client.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Segmento</p>
                  <p className="font-semibold">{client.segment ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cidade</p>
                  <p className="font-semibold">{client.city ?? "—"}</p>
                </div>
                {client.notes && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-xs text-muted-foreground">Obs. do cliente</p>
                    <p>{client.notes}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Notes */}
          {project.notes && (
            <Card className="p-4 bg-gradient-surface border-border/50">
              <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wide">
                Observações
              </h3>
              <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Checkpoints ─────────────────────────────────────────────────── */}
      {activeTab === "Checkpoints" && (
        <div className="space-y-3">
          {checkpoints.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum checkpoint ainda.</p>
          )}
          {checkpoints.map((cp, idx) => (
            <Card key={cp.id} className="p-4 bg-gradient-surface border-border/50">
              <div className="flex items-start gap-3">
                {/* Step circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border ${checkpointBadgeClass(cp.status)}`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{cp.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={cp.status}
                        onValueChange={(v) => handleCpStatusChange(cp.id, v)}
                      >
                        <SelectTrigger className="h-7 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHECKPOINT_STATUS_VALUES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {CHECKPOINT_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => handleCpDelete(cp.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {cp.description && (
                    <p className="text-xs text-muted-foreground">{cp.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {cp.responsible && <span>Resp: {cp.responsible}</span>}
                    {cp.due_date && <span>Prazo: {dateBR(cp.due_date)}</span>}
                    {cp.completed_at && (
                      <span className="text-green-600">
                        Concluído em: {dateBR(cp.completed_at)}
                      </span>
                    )}
                  </div>
                  <CheckpointNotesEditor
                    notes={cp.notes ?? ""}
                    onSave={(notes) => handleCpNotesChange(cp.id, notes)}
                  />
                </div>
              </div>
            </Card>
          ))}

          {/* Add checkpoint form */}
          {showCpForm ? (
            <Card className="p-4 bg-gradient-surface border-border/50 space-y-3">
              <p className="font-semibold text-sm">Novo Checkpoint</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={cpForm.name}
                    onChange={(e) => setCpForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Responsável</Label>
                  <Input
                    value={cpForm.responsible}
                    onChange={(e) => setCpForm((f) => ({ ...f, responsible: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    value={cpForm.description}
                    onChange={(e) => setCpForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prazo</Label>
                  <Input
                    type="date"
                    value={cpForm.due_date}
                    onChange={(e) => setCpForm((f) => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={cpForm.status}
                    onValueChange={(v) => setCpForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHECKPOINT_STATUS_VALUES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {CHECKPOINT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCpAdd}>
                  <Save className="h-4 w-4 mr-1" /> Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCpForm(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCpForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar checkpoint
            </Button>
          )}
        </div>
      )}

      {/* ── Tab: Tarefas (Kanban) ─────────────────────────────────────────────── */}
      {activeTab === "Tarefas" && (
        <div className="space-y-4">
          {/* New task form */}
          {showTaskForm ? (
            <Card className="p-4 bg-gradient-surface border-border/50 space-y-3">
              <p className="font-semibold text-sm">Nova Tarefa</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Título *</Label>
                  <Input
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Responsável</Label>
                  <Input
                    value={taskForm.responsible}
                    onChange={(e) => setTaskForm((f) => ({ ...f, responsible: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    value={taskForm.description}
                    onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prazo</Label>
                  <Input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prioridade</Label>
                  <Select
                    value={taskForm.priority}
                    onValueChange={(v) => setTaskForm((f) => ({ ...f, priority: v }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITY_VALUES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {TASK_PRIORITY_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status inicial</Label>
                  <Select
                    value={taskForm.status}
                    onValueChange={(v) => setTaskForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUS_VALUES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {TASK_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleTaskAdd}>
                  <Save className="h-4 w-4 mr-1" /> Criar tarefa
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowTaskForm(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            </Card>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowTaskForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova tarefa
            </Button>
          )}

          {/* Kanban columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TASK_STATUS_VALUES.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col);
              return (
                <div key={col} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {TASK_STATUS_LABELS[col]}
                    </p>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    {colTasks.map((task) => (
                      <Card
                        key={task.id}
                        className="p-3 bg-gradient-surface border-border/50 cursor-pointer hover:border-primary/30 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className="text-sm font-medium leading-snug"
                            onClick={() => cycleTaskStatus(task)}
                          >
                            {task.title}
                          </p>
                          <button
                            onClick={() => handleTaskDelete(task.id)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${taskPriorityClass(task.priority)}`}
                          >
                            {TASK_PRIORITY_LABELS[task.priority]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                          {task.responsible && <span>{task.responsible}</span>}
                          {task.due_date && (
                            <span
                              className={
                                task.due_date < isoToday() ? "text-destructive" : ""
                              }
                            >
                              {dateBR(task.due_date)}
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs text-primary/70 mt-1 hover:text-primary"
                          onClick={() => cycleTaskStatus(task)}
                        >
                          → próximo status
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab: Pendências ────────────────────────────────────────────────────── */}
      {activeTab === "Pendências" && (
        <div className="space-y-4">
          {/* Add form */}
          {showPendingForm ? (
            <Card className="p-4 bg-gradient-surface border-border/50 space-y-3">
              <p className="font-semibold text-sm">Nova Pendência</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Título *</Label>
                  <Input
                    value={pendingForm.title}
                    onChange={(e) => setPendingForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Responsável</Label>
                  <Select
                    value={pendingForm.owner}
                    onValueChange={(v) => setPendingForm((f) => ({ ...f, owner: v }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PENDING_OWNER_VALUES.map((o) => (
                        <SelectItem key={o} value={o}>
                          {PENDING_OWNER_LABELS[o]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    value={pendingForm.description}
                    onChange={(e) => setPendingForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prazo</Label>
                  <Input
                    type="date"
                    value={pendingForm.due_date}
                    onChange={(e) => setPendingForm((f) => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={pendingForm.status}
                    onValueChange={(v) => setPendingForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PENDING_STATUS_VALUES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {PENDING_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handlePendingAdd}>
                  <Save className="h-4 w-4 mr-1" /> Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowPendingForm(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            </Card>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowPendingForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova pendência
            </Button>
          )}

          {/* Grouped by owner */}
          {PENDING_OWNER_VALUES.map((owner) => {
            const group = pending.filter((p) => p.owner === owner);
            if (group.length === 0) return null;
            return (
              <div key={owner} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${pendingOwnerClass(owner)}`}
                  >
                    {PENDING_OWNER_LABELS[owner]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {group.length} item(ns)
                  </span>
                </div>
                {group.map((pnd) => {
                  const isOverdue =
                    pnd.due_date && pnd.due_date < isoToday() && pnd.status !== "aprovado";
                  return (
                    <Card
                      key={pnd.id}
                      className="p-3 bg-gradient-surface border-border/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium">{pnd.title}</p>
                          {pnd.description && (
                            <p className="text-xs text-muted-foreground">{pnd.description}</p>
                          )}
                          {pnd.due_date && (
                            <p
                              className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
                            >
                              Prazo: {dateBR(pnd.due_date)}
                              {isOverdue ? " — VENCIDO" : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={pnd.status}
                            onValueChange={(v) => handlePendingStatusChange(pnd.id, v)}
                          >
                            <SelectTrigger className="h-7 w-36 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PENDING_STATUS_VALUES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {PENDING_STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {pnd.status !== "aprovado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handlePendingResolve(pnd.id)}
                            >
                              Resolver
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            );
          })}

          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma pendência.</p>
          )}
        </div>
      )}

      {/* ── Tab: Arquivos ────────────────────────────────────────────────────── */}
      {activeTab === "Arquivos" && (
        <div className="space-y-4">
          {/* Upload zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileUpload(file);
            }}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Arraste um arquivo ou clique para selecionar
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Enviando..." : "Selecionar arquivo"}
            </Button>
          </div>

          {/* File grid */}
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum arquivo ainda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map((f) => (
                <Card
                  key={f.id}
                  className="p-3 bg-gradient-surface border-border/50 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {f.category && (
                        <Badge
                          variant="outline"
                          className="text-xs border-sky-400/40 bg-sky-400/10 text-sky-500"
                        >
                          {f.category}
                        </Badge>
                      )}
                    </div>
                    {f.uploaded_by && (
                      <p className="text-xs text-muted-foreground">
                        Por: {f.uploaded_by}
                      </p>
                    )}
                  </div>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Tokens ──────────────────────────────────────────────────────── */}
      {activeTab === "Tokens" && (
        <div className="space-y-4">
          {showTokenForm ? (
            <Card className="p-4 bg-gradient-surface border-border/50 space-y-3">
              <p className="font-semibold text-sm">Registrar uso de tokens</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Período (YYYY-MM)</Label>
                  <Input
                    placeholder="2025-01"
                    value={tokenForm.period}
                    onChange={(e) => setTokenForm((f) => ({ ...f, period: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Agente</Label>
                  <Input
                    value={tokenForm.agent_name}
                    onChange={(e) => setTokenForm((f) => ({ ...f, agent_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Input tokens</Label>
                  <Input
                    type="number"
                    value={tokenForm.input_tokens}
                    onChange={(e) => setTokenForm((f) => ({ ...f, input_tokens: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Output tokens</Label>
                  <Input
                    type="number"
                    value={tokenForm.output_tokens}
                    onChange={(e) => setTokenForm((f) => ({ ...f, output_tokens: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Custo (USD)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={tokenForm.cost_usd}
                    onChange={(e) => setTokenForm((f) => ({ ...f, cost_usd: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleTokenAdd}>
                  <Save className="h-4 w-4 mr-1" /> Registrar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowTokenForm(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            </Card>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowTokenForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Registrar uso
            </Button>
          )}

          <Card className="bg-gradient-surface border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Custo USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokenUsage.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhum registro.
                    </TableCell>
                  </TableRow>
                )}
                {tokenUsage.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.period ?? "—"}</TableCell>
                    <TableCell>{t.agent_name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(t.input_tokens ?? 0).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(t.output_tokens ?? 0).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {((t.input_tokens ?? 0) + (t.output_tokens ?? 0)).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(t.cost_usd ?? 0).toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
                {tokenUsage.length > 0 && (
                  <TableRow className="font-semibold border-t-2 border-border">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tokenUsage
                        .reduce((s, t) => s + (t.input_tokens ?? 0), 0)
                        .toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tokenUsage
                        .reduce((s, t) => s + (t.output_tokens ?? 0), 0)
                        .toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tokenUsage
                        .reduce(
                          (s, t) => s + (t.input_tokens ?? 0) + (t.output_tokens ?? 0),
                          0
                        )
                        .toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tokenUsage.reduce((s, t) => s + (t.cost_usd ?? 0), 0).toFixed(4)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ── Tab: Resultados ──────────────────────────────────────────────────── */}
      {activeTab === "Resultados" && (
        <div className="space-y-4">
          {showResultForm ? (
            <Card className="p-4 bg-gradient-surface border-border/50 space-y-3">
              <p className="font-semibold text-sm">Adicionar Métrica</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome da métrica *</Label>
                  <Input
                    value={resultForm.metric_name}
                    onChange={(e) =>
                      setResultForm((f) => ({ ...f, metric_name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    type="number"
                    step="any"
                    value={resultForm.metric_value}
                    onChange={(e) =>
                      setResultForm((f) => ({ ...f, metric_value: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unidade</Label>
                  <Input
                    placeholder="%, R$, horas..."
                    value={resultForm.metric_unit}
                    onChange={(e) =>
                      setResultForm((f) => ({ ...f, metric_unit: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Período</Label>
                  <Input
                    placeholder="2025-01"
                    value={resultForm.period}
                    onChange={(e) =>
                      setResultForm((f) => ({ ...f, period: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Notas</Label>
                  <Input
                    value={resultForm.notes}
                    onChange={(e) =>
                      setResultForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleResultAdd}>
                  <Save className="h-4 w-4 mr-1" /> Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowResultForm(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            </Card>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowResultForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar métrica
            </Button>
          )}

          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma métrica registrada.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((r) => (
                <Card
                  key={r.id}
                  className="p-4 bg-gradient-surface border-border/50 space-y-1"
                >
                  <p className="text-xs text-muted-foreground font-medium">
                    {r.metric_name}
                    {r.period ? ` · ${r.period}` : ""}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {r.metric_value !== null
                      ? r.metric_value.toLocaleString("pt-BR")
                      : "—"}
                    {r.metric_unit && (
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {r.metric_unit}
                      </span>
                    )}
                  </p>
                  {r.notes && (
                    <p className="text-xs text-muted-foreground">{r.notes}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Suporte ─────────────────────────────────────────────────────── */}
      {activeTab === "Suporte" && (
        <div className="space-y-4">
          {showSupportForm ? (
            <Card className="p-4 bg-gradient-surface border-border/50 space-y-3">
              <p className="font-semibold text-sm">Novo Chamado</p>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Título *</Label>
                  <Input
                    value={supportForm.title}
                    onChange={(e) =>
                      setSupportForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    rows={3}
                    value={supportForm.description}
                    onChange={(e) =>
                      setSupportForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSupportAdd}>
                  <Save className="h-4 w-4 mr-1" /> Abrir chamado
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSupportForm(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            </Card>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowSupportForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo chamado
            </Button>
          )}

          {support.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum chamado de suporte.</p>
          )}
          <div className="space-y-3">
            {support.map((s) => (
              <Card
                key={s.id}
                className="p-4 bg-gradient-surface border-border/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold">{s.title}</p>
                    {s.description && (
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    )}
                    {s.created_at && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <Select
                    value={s.status}
                    onValueChange={(v) => handleSupportStatusChange(s.id, v)}
                  >
                    <SelectTrigger className="h-7 w-36 text-xs shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_STATUS_VALUES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {SUPPORT_STATUS_LABELS[st]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${supportBadgeClass(s.status)}`}
                  >
                    {SUPPORT_STATUS_LABELS[s.status] ?? s.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Activity feed (always visible) ───────────────────────────────────── */}
      <div className="border-t border-border/50 pt-6 space-y-4">
        <h3 className="font-semibold text-sm">Feed de Atualizações</h3>

        {/* New update form */}
        <Card className="p-4 bg-gradient-surface border-border/50 space-y-3">
          <Textarea
            rows={2}
            placeholder="Registrar atualização..."
            value={updateMessage}
            onChange={(e) => setUpdateMessage(e.target.value)}
          />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Switch
                id="visible-toggle"
                checked={updateVisible}
                onCheckedChange={setUpdateVisible}
              />
              <Label htmlFor="visible-toggle" className="text-xs cursor-pointer">
                Visível ao cliente
              </Label>
            </div>
            <Button
              size="sm"
              onClick={handleUpdateSubmit}
              disabled={!updateMessage.trim()}
            >
              <Save className="h-4 w-4 mr-1" /> Registrar
            </Button>
          </div>
        </Card>

        {/* Updates list */}
        <div className="space-y-2">
          {updates.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma atualização registrada.</p>
          )}
          {updates.map((u) => (
            <div
              key={u.id}
              className="flex gap-3 py-2 border-b border-border/30 last:border-0"
            >
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleString("pt-BR")}
                  </span>
                  {u.source && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        u.source === "solicitai"
                          ? "border-purple-400/40 bg-purple-400/10 text-purple-500"
                          : "border-blue-400/40 bg-blue-400/10 text-blue-500"
                      }`}
                    >
                      {u.source}
                    </Badge>
                  )}
                  {u.visible_to_client && (
                    <Badge
                      variant="outline"
                      className="text-xs border-green-400/40 bg-green-400/10 text-green-600"
                    >
                      visível ao cliente
                    </Badge>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{u.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Checkpoint notes inline editor ──────────────────────────────────────────

function CheckpointNotesEditor({
  notes,
  onSave,
}: {
  notes: string;
  onSave: (notes: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(notes);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline text-left"
      >
        {notes ? notes : "Adicionar nota..."}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        className="h-7 text-xs"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        autoFocus
      />
      <button
        onClick={() => { onSave(val); setEditing(false); }}
        className="text-xs text-primary hover:text-primary/80"
      >
        <Save className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => { setVal(notes); setEditing(false); }}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
