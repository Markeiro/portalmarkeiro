import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Upload,
  CheckCircle2,
  Copy,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientForm {
  name: string;
  responsible: string;
  whatsapp: string;
  email: string;
  segment: string;
  city: string;
}

interface ProjectForm {
  name: string;
  solution_type: string;
  responsible_commercial: string;
  responsible_technical: string;
  responsible_cs: string;
  start_date: string;
  go_live_date: string;
  contract_period: string;
  setup_value_brl: string;
  mrr_brl: string;
  notes: string;
}

interface CheckpointItem {
  name: string;
  description: string;
  days_from_start: number;
  due_date: string;
}

interface ExtractedData {
  cliente: string;
  projeto: string;
  objetivo: string;
  problema: string;
  solucao: string;
  escopo: string;
  integracoes: string;
  entregaveis: string;
  setup_value: number;
  mrr: number;
  contract_months: number;
  checkpoints: CheckpointItem[];
  responsavel_comercial: string;
  responsavel_tecnico: string;
  observacoes: string;
}

interface ReviewedData {
  objetivo: string;
  problema: string;
  solucao: string;
  escopo: string;
  integracoes: string;
  entregaveis: string;
  setup_value: number;
  mrr: number;
  checkpoints: CheckpointItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOLUTION_TYPES = [
  "Automação + IA",
  "Dashboard BI",
  "CRM + Funil",
  "Agente WhatsApp",
  "Atendimento IA",
  "Outro",
];

const CONTRACT_PERIODS = ["6 meses", "12 meses", "24 meses", "Projeto pontual"];

const GEMINI_KEY = "AIzaSyA2RYCAxLZXHMOuxP3a2VW1B14Mt9WKF4w";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = [
  "Dados",
  "Upload HTML",
  "Revisão",
  "Concluído",
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const active = stepNum === current;
        const done = stepNum < current;
        return (
          <div key={stepNum} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                  done
                    ? "bg-primary border-primary text-primary-foreground"
                    : active
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  active ? "text-primary" : done ? "text-primary/70" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-12 sm:w-20 mx-1 mb-5 transition-all ${
                  done ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function HubNovoProjeto() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [importedProposalId, setImportedProposalId] = useState<string | null>(null);
  const [importedDealId, setImportedDealId] = useState<string | null>(null);

  // Step 1 form data
  const [clientData, setClientData] = useState<ClientForm>({
    name: "",
    responsible: "",
    whatsapp: "",
    email: "",
    segment: "",
    city: "",
  });
  const [projectData, setProjectData] = useState<ProjectForm>({
    name: "",
    solution_type: "",
    responsible_commercial: "Daniel",
    responsible_technical: "",
    responsible_cs: "",
    start_date: "",
    go_live_date: "",
    contract_period: "",
    setup_value_brl: "",
    mrr_brl: "",
    notes: "",
  });

  // Step 2 upload
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 review
  const [reviewed, setReviewed] = useState<ReviewedData>({
    objetivo: "",
    problema: "",
    solucao: "",
    escopo: "",
    integracoes: "",
    entregaveis: "",
    setup_value: 0,
    mrr: 0,
    checkpoints: [],
  });

  // Step 4 result
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    projectId: string;
    slug: string;
    pin: string;
    portalUrl: string;
    clientName: string;
    projectName: string;
  } | null>(null);

  // -------------------------------------------------------------------------
  // Import from proposal (proposal_id query param)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const pid = searchParams.get("proposal_id");
    if (!pid) return;
    (async () => {
      const { data: p } = await (supabase as any)
        .from("proposals")
        .select("*")
        .eq("id", pid)
        .maybeSingle();
      if (!p) return;
      setImportedProposalId(pid);
      if (p.deal_id) setImportedDealId(p.deal_id);
      setClientData({
        name: p.client_company ?? "",
        responsible: p.client_name ?? "",
        whatsapp: p.client_phone ?? "",
        email: p.client_email ?? "",
        segment: "",
        city: "",
      });
      setProjectData((prev) => ({
        ...prev,
        name: p.project_name ?? "",
        solution_type: p.solution_type ?? "",
        setup_value_brl: p.setup_value != null ? String(p.setup_value) : "",
        mrr_brl: p.mrr_value != null ? String(p.mrr_value) : "",
        contract_period: p.contract_months != null ? String(p.contract_months) : "",
        notes: [p.why_us, p.roi_description].filter(Boolean).join("\n\n") ?? "",
      }));
      setReviewed((prev) => ({
        ...prev,
        problema: p.problem_description ?? "",
        solucao: p.solution_description ?? "",
        escopo: p.scope ?? "",
        entregaveis: p.deliverables ?? "",
        integracoes: p.integrations ?? "",
        setup_value: p.setup_value ?? 0,
        mrr: p.mrr_value ?? 0,
      }));
      toast.success("Dados importados da proposta aprovada");
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Step 1 — Validation & Next
  // -------------------------------------------------------------------------

  const handleStep1Next = () => {
    if (!clientData.name.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }
    if (!clientData.responsible.trim()) {
      toast.error("Responsável pelo cliente é obrigatório");
      return;
    }
    if (!projectData.name.trim()) {
      toast.error("Nome do projeto é obrigatório");
      return;
    }
    setStep(2);
  };

  // -------------------------------------------------------------------------
  // Step 2 — File handling & Gemini extraction
  // -------------------------------------------------------------------------

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".html") && file.type !== "text/html") {
      toast.error("Apenas arquivos .html são aceitos");
      return;
    }
    setHtmlFile(file);
    setExtracted(null);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    []
  );

  const handleExtract = async () => {
    if (!htmlFile) return;
    setExtracting(true);
    try {
      const rawHtml = await htmlFile.text();

      // Strip HTML tags → plain text to avoid issues with scripts/special chars
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, "text/html");
      // Remove script and style elements
      doc.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
      const plainText = (doc.body?.innerText ?? doc.body?.textContent ?? rawHtml)
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);

      const prompt = `Você é um assistente de extração de dados. Leia o texto de apresentação de projeto abaixo e retorne APENAS um JSON válido (sem markdown, sem texto extra) com exatamente estes campos:

{
  "cliente": "nome da empresa",
  "projeto": "nome do projeto/solução",
  "objetivo": "objetivo principal em 2-3 frases",
  "problema": "problema identificado em 2-3 frases",
  "solucao": "solução proposta em 2-3 frases",
  "escopo": "lista de funcionalidades principais separadas por newline",
  "integracoes": "ferramentas/integrações separadas por vírgula",
  "entregaveis": "entregáveis separados por newline",
  "setup_value": 0,
  "mrr": 0,
  "contract_months": 12,
  "checkpoints": [
    {"name": "Kickoff", "description": "Reunião inicial", "days_from_start": 0}
  ],
  "responsavel_comercial": "",
  "responsavel_tecnico": "",
  "observacoes": ""
}

Texto do projeto:
${plainText}`;

      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GEMINI_KEY}` },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        let detail = "";
        try { detail = await response.text(); } catch { /* ignore */ }
        throw new Error(`Gemini API error: ${response.status}${detail ? " — " + detail.slice(0, 200) : ""}`);
      }

      const json = await response.json();
      const content: string =
        json?.choices?.[0]?.message?.content ?? "";

      // Strip potential markdown fences
      const cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();

      const data: ExtractedData = JSON.parse(cleaned);

      // Ensure checkpoints have days_from_start
      const checkpoints: CheckpointItem[] = (data.checkpoints || []).map(
        (cp: any) => ({
          name: cp.name ?? "",
          description: cp.description ?? "",
          days_from_start: cp.days_from_start ?? 0,
          due_date: addDays(projectData.start_date, cp.days_from_start ?? 0),
        })
      );

      setExtracted({ ...data, checkpoints });
      setReviewed({
        objetivo: data.objetivo ?? "",
        problema: data.problema ?? "",
        solucao: data.solucao ?? "",
        escopo: data.escopo ?? "",
        integracoes: data.integracoes ?? "",
        entregaveis: data.entregaveis ?? "",
        setup_value: data.setup_value ?? 0,
        mrr: data.mrr ?? 0,
        checkpoints,
      });

      toast.success("Dados extraídos com sucesso!");
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      toast.error("Erro ao analisar: " + msg, { duration: 8000 });
      console.error("Gemini extraction error:", err);
    } finally {
      setExtracting(false);
    }
  };

  const handleStep2Next = () => {
    if (!htmlFile) {
      toast.error("Selecione um arquivo HTML antes de continuar");
      return;
    }
    if (!extracted) {
      toast.error("Execute a leitura inteligente antes de continuar");
      return;
    }
    setStep(3);
  };

  // -------------------------------------------------------------------------
  // Step 3 — Checkpoint helpers
  // -------------------------------------------------------------------------

  const updateCheckpoint = (idx: number, field: keyof CheckpointItem, value: string | number) => {
    setReviewed((prev) => {
      const cps = [...prev.checkpoints];
      cps[idx] = { ...cps[idx], [field]: value };
      return { ...prev, checkpoints: cps };
    });
  };

  const addCheckpoint = () => {
    setReviewed((prev) => ({
      ...prev,
      checkpoints: [
        ...prev.checkpoints,
        { name: "", description: "", days_from_start: 0, due_date: "" },
      ],
    }));
  };

  const removeCheckpoint = (idx: number) => {
    setReviewed((prev) => ({
      ...prev,
      checkpoints: prev.checkpoints.filter((_, i) => i !== idx),
    }));
  };

  // -------------------------------------------------------------------------
  // Step 4 — Save to Supabase
  // -------------------------------------------------------------------------

  const handleApproveAndCreate = async () => {
    setSaving(true);
    try {
      // 1. Insert or find client
      let clientId: string;
      if (clientData.email) {
        const { data: existing } = await supabase
          .from("hub_clients" as any)
          .select("id")
          .eq("email", clientData.email)
          .maybeSingle();
        if (existing && (existing as any).id) {
          clientId = (existing as any).id;
        } else {
          const { data: newClient, error: clientErr } = await supabase
            .from("hub_clients" as any)
            .insert({
              name: clientData.name,
              responsible: clientData.responsible,
              whatsapp: clientData.whatsapp || null,
              email: clientData.email || null,
              segment: clientData.segment || null,
              city: clientData.city || null,
              active: true,
            })
            .select("id")
            .single();
          if (clientErr) throw clientErr;
          clientId = (newClient as any).id;
        }
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from("hub_clients" as any)
          .insert({
            name: clientData.name,
            responsible: clientData.responsible,
            whatsapp: clientData.whatsapp || null,
            email: null,
            segment: clientData.segment || null,
            city: clientData.city || null,
            active: true,
          })
          .select("id")
          .single();
        if (clientErr) throw clientErr;
        clientId = (newClient as any).id;
      }

      // 2. Generate slug
      const slug = slugify(clientData.name + "-" + Date.now());

      // 3. Upload HTML to Supabase Storage
      let htmlUrl: string | null = null;
      if (htmlFile) {
        const storagePath = `projects/${slug}/proposta.html`;
        const { error: uploadErr } = await supabase.storage
          .from("hub-files")
          .upload(storagePath, htmlFile, { upsert: true });
        if (uploadErr) {
          toast.warning("Erro no upload do HTML: " + uploadErr.message + " — continuando sem salvar arquivo.");
        } else {
          htmlUrl = supabase.storage
            .from("hub-files")
            .getPublicUrl(storagePath).data.publicUrl;
        }
      }

      // 4. Build contract_period_months from selection
      const contractMap: Record<string, number | null> = {
        "6 meses": 6,
        "12 meses": 12,
        "24 meses": 24,
        "Projeto pontual": null,
      };

      // 5. Insert hub_project
      const { data: newProject, error: projErr } = await supabase
        .from("hub_projects" as any)
        .insert({
          client_id: clientId,
          name: projectData.name,
          solution_type: projectData.solution_type || null,
          status: "portal_criado",
          progress_pct: 0,
          responsible_commercial: projectData.responsible_commercial || null,
          responsible_technical: projectData.responsible_technical || null,
          responsible_cs: projectData.responsible_cs || null,
          start_date: projectData.start_date || null,
          go_live_date: projectData.go_live_date || null,
          contract_period_months:
            contractMap[projectData.contract_period] ?? null,
          setup_value_brl: projectData.setup_value_brl
            ? parseFloat(projectData.setup_value_brl)
            : reviewed.setup_value || null,
          mrr_brl: projectData.mrr_brl
            ? parseFloat(projectData.mrr_brl)
            : reviewed.mrr || null,
          notes: projectData.notes || null,
          html_url: htmlUrl,
          extracted_data: extracted as any,
          extraction_reviewed: true,
          slug,
          portal_link_sent: false,
        })
        .select("id")
        .single();
      if (projErr) throw projErr;
      const projectId = (newProject as any).id as string;

      // 6. Insert checkpoints
      if (reviewed.checkpoints.length > 0) {
        const cpRows = reviewed.checkpoints.map((cp, idx) => ({
          project_id: projectId,
          name: cp.name,
          description: cp.description || null,
          responsible: null,
          due_date: cp.due_date || null,
          status: "pendente",
          sort_order: idx,
        }));
        const { error: cpErr } = await supabase
          .from("hub_checkpoints" as any)
          .insert(cpRows);
        if (cpErr) toast.warning("Erro ao salvar checkpoints: " + cpErr.message);
      }

      // 7. Generate PIN and insert portal
      const pin = randomPin();
      const { error: portalErr } = await supabase
        .from("hub_portals" as any)
        .insert({
          project_id: projectId,
          email: clientData.email || null,
          pin,
        });
      if (portalErr) toast.warning("Erro ao criar portal: " + portalErr.message);

      // 8. Insert default pending tasks
      const pendingTitles = [
        "Envio de acessos e credenciais",
        "Validação do fluxo inicial",
        "Aprovação do contrato",
      ];
      const pendingRows = pendingTitles.map((title) => ({
        project_id: projectId,
        title,
        description: null,
        owner: "cliente",
        due_date: null,
        status: "pendente",
      }));
      const { error: pendingErr } = await supabase
        .from("hub_pending" as any)
        .insert(pendingRows);
      if (pendingErr) toast.warning("Erro ao criar pendências: " + pendingErr.message);

      const portalUrl = `${window.location.origin}/portal/${slug}`;

      // Link proposal → hub project
      if (importedProposalId) {
        await (supabase as any)
          .from("proposals")
          .update({ hub_project_id: projectId })
          .eq("id", importedProposalId);
      }

      // Link deal → hub project
      if (importedDealId) {
        await (supabase as any)
          .from("crm_deals")
          .update({ hub_project_id: projectId })
          .eq("id", importedDealId);
      }

      // Auto-create financial projects record and link bidirectionally
      try {
        const mrrValue = projectData.mrr_brl
          ? parseFloat(projectData.mrr_brl)
          : reviewed.mrr || null;
        const setupValue = projectData.setup_value_brl
          ? parseFloat(projectData.setup_value_brl)
          : reviewed.setup_value || null;
        const { data: finProj } = await (supabase as any)
          .from("projects")
          .insert({
            name: projectData.name,
            client: clientData.name,
            status: "ativo",
            monthly_revenue_brl: mrrValue,
            total_contract_value_brl: setupValue,
            start_date: projectData.start_date || null,
            notes: projectData.notes || null,
            hub_project_id: projectId,
          })
          .select("id")
          .single();
        if (finProj?.id) {
          await (supabase as any)
            .from("hub_projects")
            .update({ project_id: finProj.id })
            .eq("id", projectId);
        }
      } catch {
        // Non-critical: financial project link failure doesn't block hub project creation
      }

      setResult({
        projectId,
        slug,
        pin,
        portalUrl,
        clientName: clientData.name,
        projectName: projectData.name,
      });

      setStep(4);
      toast.success("Projeto criado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao criar projeto: " + (err?.message ?? String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setClientData({
      name: "",
      responsible: "",
      whatsapp: "",
      email: "",
      segment: "",
      city: "",
    });
    setProjectData({
      name: "",
      solution_type: "",
      responsible_commercial: "Daniel",
      responsible_technical: "",
      responsible_cs: "",
      start_date: "",
      go_live_date: "",
      contract_period: "",
      setup_value_brl: "",
      mrr_brl: "",
      notes: "",
    });
    setHtmlFile(null);
    setExtracted(null);
    setReviewed({
      objetivo: "",
      problema: "",
      solucao: "",
      escopo: "",
      integracoes: "",
      entregaveis: "",
      setup_value: 0,
      mrr: 0,
      checkpoints: [],
    });
    setResult(null);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Novo Projeto"
        description="Cadastre cliente, faça upload da proposta e gere o portal do cliente"
      />

      <StepIndicator current={step} />

      {/* ================================================================
          STEP 1 — Dados do cliente & projeto
          ================================================================ */}
      {step === 1 && (
        <div className="space-y-6">
          {importedProposalId && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm text-blue-300">
              <CheckCircle2 size={16} className="flex-shrink-0 text-blue-400" />
              Dados pré-preenchidos a partir da proposta aprovada — revise e continue.
            </div>
          )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card esquerdo — Dados do cliente */}
          <Card className="bg-gradient-surface border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Nome da empresa <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={clientData.name}
                  onChange={(e) =>
                    setClientData((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ex: ACME Ltda"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Responsável <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={clientData.responsible}
                  onChange={(e) =>
                    setClientData((p) => ({
                      ...p,
                      responsible: e.target.value,
                    }))
                  }
                  placeholder="Nome do contato principal"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={clientData.whatsapp}
                  onChange={(e) =>
                    setClientData((p) => ({ ...p, whatsapp: e.target.value }))
                  }
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={clientData.email}
                  onChange={(e) =>
                    setClientData((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="contato@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Segmento</Label>
                <Input
                  value={clientData.segment}
                  onChange={(e) =>
                    setClientData((p) => ({ ...p, segment: e.target.value }))
                  }
                  placeholder="Ex: Varejo, Saúde, Indústria"
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={clientData.city}
                  onChange={(e) =>
                    setClientData((p) => ({ ...p, city: e.target.value }))
                  }
                  placeholder="Ex: Campinas - SP"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card direito — Dados do projeto */}
          <Card className="bg-gradient-surface border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Dados do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Nome do projeto <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={projectData.name}
                  onChange={(e) =>
                    setProjectData((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ex: Automação de Atendimento"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de solução</Label>
                <Select
                  value={projectData.solution_type}
                  onValueChange={(v) =>
                    setProjectData((p) => ({ ...p, solution_type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SOLUTION_TYPES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Resp. Comercial</Label>
                  <Input
                    value={projectData.responsible_commercial}
                    onChange={(e) =>
                      setProjectData((p) => ({
                        ...p,
                        responsible_commercial: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resp. Técnico</Label>
                  <Input
                    value={projectData.responsible_technical}
                    onChange={(e) =>
                      setProjectData((p) => ({
                        ...p,
                        responsible_technical: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resp. CS</Label>
                  <Input
                    value={projectData.responsible_cs}
                    onChange={(e) =>
                      setProjectData((p) => ({
                        ...p,
                        responsible_cs: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Início previsto</Label>
                  <Input
                    type="date"
                    value={projectData.start_date}
                    onChange={(e) =>
                      setProjectData((p) => ({
                        ...p,
                        start_date: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Go-live previsto</Label>
                  <Input
                    type="date"
                    value={projectData.go_live_date}
                    onChange={(e) =>
                      setProjectData((p) => ({
                        ...p,
                        go_live_date: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Período de contrato</Label>
                <Select
                  value={projectData.contract_period}
                  onValueChange={(v) =>
                    setProjectData((p) => ({ ...p, contract_period: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_PERIODS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor de implantação (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={projectData.setup_value_brl}
                    onChange={(e) =>
                      setProjectData((p) => ({
                        ...p,
                        setup_value_brl: e.target.value,
                      }))
                    }
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>MRR mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={projectData.mrr_brl}
                    onChange={(e) =>
                      setProjectData((p) => ({
                        ...p,
                        mrr_brl: e.target.value,
                      }))
                    }
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={projectData.notes}
                  onChange={(e) =>
                    setProjectData((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Notas internas sobre o projeto..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="lg:col-span-2 flex justify-end">
            <Button
              onClick={handleStep1Next}
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2"
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </div>
      )}

      {/* ================================================================
          STEP 2 — Upload da apresentação HTML
          ================================================================ */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Banner: proposal imported — allow skipping upload */}
          {importedProposalId && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
              <div className="flex items-center gap-3 text-sm text-emerald-400">
                <CheckCircle2 size={18} className="flex-shrink-0" />
                <span>
                  Dados importados da proposta aprovada. O upload de HTML é opcional — você pode ir direto para a revisão.
                </span>
              </div>
              <Button
                size="sm"
                className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={() => setStep(3)}
              >
                Pular para revisão <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <Card className="bg-gradient-surface border-border/50">
            <CardHeader>
              <CardTitle className="text-base">
                Upload da Apresentação HTML
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-sm">
                  Arraste o arquivo HTML aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas arquivos .html
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,text/html"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              {/* File preview */}
              {htmlFile && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {htmlFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(htmlFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={handleExtract}
                    disabled={extracting}
                  >
                    {extracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extraindo...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Executar leitura inteligente
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Extraction result summary */}
              {extracted && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="font-medium text-sm">
                      Dados extraídos com sucesso
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {extracted.checkpoints.length > 0 && (
                      <Badge variant="outline">
                        {extracted.checkpoints.length} checkpoints
                      </Badge>
                    )}
                    {extracted.setup_value > 0 && (
                      <Badge variant="outline">
                        Setup:{" "}
                        {extracted.setup_value.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </Badge>
                    )}
                    {extracted.mrr > 0 && (
                      <Badge variant="outline">
                        MRR:{" "}
                        {extracted.mrr.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button
              onClick={handleStep2Next}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================
          STEP 3 — Revisão dos dados extraídos
          ================================================================ */}
      {step === 3 && (
        <div className="space-y-6">
          <Card className="bg-gradient-surface border-border/50">
            <CardHeader>
              <CardTitle className="text-base">
                Revisão dos Dados Extraídos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <Textarea
                    value={reviewed.objetivo}
                    onChange={(e) =>
                      setReviewed((p) => ({ ...p, objetivo: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Problema identificado</Label>
                  <Textarea
                    value={reviewed.problema}
                    onChange={(e) =>
                      setReviewed((p) => ({ ...p, problema: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Solução proposta</Label>
                  <Textarea
                    value={reviewed.solucao}
                    onChange={(e) =>
                      setReviewed((p) => ({ ...p, solucao: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Escopo (uma funcionalidade por linha)</Label>
                  <Textarea
                    value={reviewed.escopo}
                    onChange={(e) =>
                      setReviewed((p) => ({ ...p, escopo: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Integrações (separadas por vírgula)</Label>
                  <Input
                    value={reviewed.integracoes}
                    onChange={(e) =>
                      setReviewed((p) => ({
                        ...p,
                        integracoes: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Entregáveis (um por linha)</Label>
                  <Textarea
                    value={reviewed.entregaveis}
                    onChange={(e) =>
                      setReviewed((p) => ({
                        ...p,
                        entregaveis: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor de setup (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={reviewed.setup_value}
                    onChange={(e) =>
                      setReviewed((p) => ({
                        ...p,
                        setup_value: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>MRR mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={reviewed.mrr}
                    onChange={(e) =>
                      setReviewed((p) => ({
                        ...p,
                        mrr: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Checkpoints */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Checkpoints</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCheckpoint}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar
                  </Button>
                </div>
                {reviewed.checkpoints.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum checkpoint. Clique em "Adicionar" para criar.
                  </p>
                )}
                <div className="space-y-3">
                  {reviewed.checkpoints.map((cp, idx) => (
                    <div
                      key={idx}
                      className="border border-border/50 rounded-lg p-4 space-y-3 bg-muted/20"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">
                          #{idx + 1}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                          onClick={() => removeCheckpoint(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={cp.name}
                            onChange={(e) =>
                              updateCheckpoint(idx, "name", e.target.value)
                            }
                            placeholder="Ex: Kickoff"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Data prevista</Label>
                          <Input
                            type="date"
                            value={cp.due_date}
                            onChange={(e) =>
                              updateCheckpoint(idx, "due_date", e.target.value)
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descrição</Label>
                        <Textarea
                          value={cp.description}
                          onChange={(e) =>
                            updateCheckpoint(idx, "description", e.target.value)
                          }
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button
              onClick={handleApproveAndCreate}
              disabled={saving}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando projeto...
                </>
              ) : (
                <>
                  Aprovar e criar projeto <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================
          STEP 4 — Sucesso
          ================================================================ */}
      {step === 4 && result && (
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Projeto criado com sucesso!
            </h2>
            <p className="text-muted-foreground text-center">
              <span className="font-medium text-foreground">
                {result.clientName}
              </span>{" "}
              —{" "}
              <span className="font-medium text-foreground">
                {result.projectName}
              </span>
            </p>
          </div>

          <Card className="w-full max-w-lg bg-gradient-surface border-border/50">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Link do Portal do Cliente
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={result.portalUrl}
                    className="font-mono text-sm bg-muted/40"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(result.portalUrl);
                      toast.success("Link copiado!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  PIN de acesso do cliente
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-md bg-muted/40 border border-border font-mono text-xl tracking-[0.4em] text-center font-bold">
                    {result.pin}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(result.pin);
                      toast.success("PIN copiado!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Envie este PIN manualmente para o cliente via WhatsApp ou
                  e-mail.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate(`/hub/projetos/${result.projectId}`)}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
            >
              <ArrowRight className="h-4 w-4" /> Abrir projeto
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <Plus className="h-4 w-4" /> Criar outro projeto
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
