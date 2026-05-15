import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toast } from "sonner";
import { dateBR } from "@/lib/format";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderPlus,
  Loader2,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  XCircle,
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

interface EditForm {
  client_company: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  project_name: string;
  solution_type: string;
  responsible: string;
  timeline_weeks: string;
  contract_months: string;
  setup_value_brl: string;
  mrr_brl: string;
  problem_description: string;
  solution_description: string;
  scope: string;
  integrations: string;
  deliverables: string;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOLUTION_TYPES = [
  "Automação + IA",
  "Dashboard BI",
  "CRM + Funil",
  "Agente WhatsApp",
  "Atendimento IA",
  "Cliente Oculto IA",
  "Outro",
];

const STATUS_LABELS: Record<ProposalStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  em_negociacao: "Em negociação",
  aprovada: "Aprovada",
  recusada: "Recusada",
};

const STATUS_COLORS: Record<ProposalStatus, string> = {
  rascunho: "bg-muted text-muted-foreground border-muted-foreground/30",
  enviada: "bg-blue-500/10 text-blue-400 border-blue-400/30",
  em_negociacao: "bg-yellow-500/10 text-yellow-400 border-yellow-400/30",
  aprovada: "bg-emerald-500/10 text-emerald-400 border-emerald-400/30",
  recusada: "bg-red-500/10 text-red-400 border-red-400/30",
};

const GEMINI_KEY = "AIzaSyA2RYCAxLZXHMOuxP3a2VW1B14Mt9WKF4w";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// ─── HTML Generator ───────────────────────────────────────────────────────────

function generateProposalHTML(data: EditForm): string {
  const mrr = parseFloat(data.mrr_brl) || 0;
  const months = parseInt(data.contract_months) || 12;
  const setup = parseFloat(data.setup_value_brl) || 0;
  const weeks = parseInt(data.timeline_weeks) || 0;
  const scopeLines = (data.scope || "").split("\n").filter(Boolean);
  const deliverableLines = (data.deliverables || "").split("\n").filter(Boolean);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Proposta — ${data.project_name || "SolicitAí"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#060f0f;color:#f0faf4;line-height:1.6}
  .header{background:linear-gradient(135deg,rgba(24,170,97,0.18),rgba(30,210,120,0.07)),#07120d;padding:56px 40px 48px;border-bottom:1px solid rgba(24,170,97,0.18);position:relative;overflow:hidden}
  .header::before{content:'';position:absolute;top:-80px;right:-80px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(24,170,97,0.12),transparent 70%);pointer-events:none}
  .logo{font-size:1.1rem;font-weight:900;letter-spacing:-0.02em;color:#1ed278;margin-bottom:12px;display:flex;align-items:center;gap:6px}
  .logo::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:#1ed278;box-shadow:0 0 8px #1ed278}
  .eyebrow{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.12em;color:#5a9e79;margin-bottom:20px}
  h1{font-size:clamp(2rem,4vw,3.2rem);line-height:1.05;letter-spacing:-0.05em;margin-bottom:16px;font-weight:900}
  h1 span{background:linear-gradient(120deg,#f0faf4 30%,#1ed278 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sub{color:#7abf9a;font-size:1rem;max-width:680px}
  .badge{display:inline-flex;padding:6px 14px;border-radius:999px;font-size:0.78rem;font-weight:700;border:1px solid rgba(30,210,120,0.35);background:rgba(24,170,97,0.12);color:#a8f0cc;margin-top:20px;letter-spacing:0.02em}
  .container{max-width:900px;margin:0 auto;padding:48px 40px}
  .section{margin-bottom:52px}
  .section-title{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.14em;color:#18aa61;font-weight:800;margin-bottom:18px;display:flex;align-items:center;gap:8px}
  .section-title::after{content:'';flex:1;height:1px;background:linear-gradient(to right,rgba(24,170,97,0.3),transparent)}
  h2{font-size:1.7rem;letter-spacing:-0.04em;margin-bottom:12px;font-weight:800;color:#f0faf4}
  p{color:#7abf9a;font-size:0.97rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-top:16px}
  .card{border:1px solid rgba(24,170,97,0.18);border-radius:18px;padding:22px 20px;background:rgba(24,170,97,0.06);transition:border-color .2s}
  .card strong{display:block;font-size:1.6rem;letter-spacing:-0.04em;margin-bottom:4px;color:#f0faf4;font-weight:800}
  .card span{color:#5a9e79;font-size:0.83rem;font-weight:500}
  .steps{display:grid;gap:10px;margin-top:16px}
  .step{display:grid;grid-template-columns:38px 1fr;gap:14px;align-items:start;background:rgba(24,170,97,0.05);border:1px solid rgba(24,170,97,0.12);border-radius:14px;padding:16px}
  .step-num{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:rgba(24,170,97,0.15);color:#1ed278;font-weight:900;font-size:0.88rem;border:1px solid rgba(24,170,97,0.2)}
  .step h4{font-size:0.93rem;margin-bottom:3px;color:#f0faf4;font-weight:600}
  .step p{font-size:0.84rem;color:#7abf9a}
  .tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
  .tag{padding:5px 12px;border-radius:999px;border:1px solid rgba(24,170,97,0.2);background:rgba(24,170,97,0.08);font-size:0.77rem;color:#a8f0cc;font-weight:500}
  .highlight{background:linear-gradient(135deg,rgba(24,170,97,0.1),rgba(30,210,120,0.05));border:1px solid rgba(24,170,97,0.22);border-radius:20px;padding:28px;margin-top:16px}
  .highlight p{color:#a8f0cc}
  .footer{text-align:center;padding:40px;color:#3d7554;font-size:0.83rem;border-top:1px solid rgba(24,170,97,0.12);margin-top:40px}
  .footer strong{color:#5a9e79}
</style>
</head>
<body>
<div class="header">
  <div class="logo">SolicitAí</div>
  <div class="eyebrow">Proposta Comercial · ${new Date().toLocaleDateString("pt-BR")}</div>
  <h1><span>${data.project_name || "Proposta de Projeto"}</span></h1>
  <p class="sub">${data.client_company || "Cliente"} — apresentação exclusiva da solução proposta pela SolicitAí.</p>
  ${data.solution_type ? `<div class="badge">${data.solution_type}</div>` : ""}
</div>
<div class="container">
  ${
    data.problem_description
      ? `
  <div class="section">
    <div class="section-title">O problema identificado</div>
    <h2>O desafio atual</h2>
    <p>${data.problem_description}</p>
  </div>`
      : ""
  }
  ${
    data.solution_description
      ? `
  <div class="section">
    <div class="section-title">A solução proposta</div>
    <h2>Como vamos resolver</h2>
    <p>${data.solution_description}</p>
  </div>`
      : ""
  }
  ${
    scopeLines.length > 0
      ? `
  <div class="section">
    <div class="section-title">Escopo e funcionalidades</div>
    <h2>O que será desenvolvido</h2>
    <div class="steps">
      ${scopeLines.map((line, i) => `<div class="step"><div class="step-num">${i + 1}</div><div><h4>${line}</h4></div></div>`).join("")}
    </div>
  </div>`
      : ""
  }
  ${
    data.integrations
      ? `
  <div class="section">
    <div class="section-title">Integrações</div>
    <h2>Ferramentas conectadas</h2>
    <div class="tags">
      ${data.integrations.split(",").map((t) => `<span class="tag">${t.trim()}</span>`).join("")}
    </div>
  </div>`
      : ""
  }
  ${
    deliverableLines.length > 0
      ? `
  <div class="section">
    <div class="section-title">Entregáveis</div>
    <h2>O que você recebe</h2>
    <div class="steps">
      ${deliverableLines.map((line) => `<div class="step"><div class="step-num">✓</div><div><h4>${line}</h4></div></div>`).join("")}
    </div>
  </div>`
      : ""
  }
  <div class="section">
    <div class="section-title">Investimento</div>
    <h2>Valores do projeto</h2>
    <div class="grid">
      ${setup ? `<div class="card"><strong>${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(setup)}</strong><span>Implantação (único)</span></div>` : ""}
      ${mrr ? `<div class="card"><strong>${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(mrr)}/mês</strong><span>Mensalidade</span></div>` : ""}
      ${months ? `<div class="card"><strong>${months} meses</strong><span>Período contratado</span></div>` : ""}
      ${weeks ? `<div class="card"><strong>${weeks} semanas</strong><span>Prazo de implantação</span></div>` : ""}
    </div>
    ${data.notes ? `<div class="highlight"><p>${data.notes}</p></div>` : ""}
  </div>
</div>
<div class="footer"><strong>SolicitAí</strong> · Automação e IA para negócios · solicitai.com.br</div>
</body>
</html>`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function proposalToEditForm(p: Proposal): EditForm {
  return {
    client_company: p.client_company,
    client_name: p.client_name ?? "",
    client_email: p.client_email ?? "",
    client_phone: p.client_phone ?? "",
    project_name: p.project_name,
    solution_type: p.solution_type ?? "",
    responsible: p.responsible ?? "Daniel",
    timeline_weeks: p.timeline_weeks ? String(p.timeline_weeks) : "",
    contract_months: p.contract_months ? String(p.contract_months) : "12",
    setup_value_brl: p.setup_value_brl ? String(p.setup_value_brl) : "",
    mrr_brl: p.mrr_brl ? String(p.mrr_brl) : "",
    problem_description: p.problem_description ?? "",
    solution_description: p.solution_description ?? "",
    scope: p.scope ?? "",
    integrations: p.integrations ?? "",
    deliverables: p.deliverables ?? "",
    notes: p.notes ?? "",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropostaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"proposta" | "editar">("proposta");

  // Edit form state
  const [form, setForm] = useState<EditForm | null>(null);
  const [editHTML, setEditHTML] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadProposal();
  }, [id]);

  async function loadProposal() {
    setLoading(true);
    const { data, error } = await supabase
      .from("proposals" as any)
      .select("*")
      .eq("id", id!)
      .single();

    if (error || !data) {
      toast.error("Proposta não encontrada");
      navigate("/propostas");
      return;
    }
    const p = data as Proposal;
    setProposal(p);
    const ef = proposalToEditForm(p);
    setForm(ef);
    setEditHTML(p.html_content ?? generateProposalHTML(ef));
    setLoading(false);
  }

  // Debounced HTML regeneration in edit mode
  useEffect(() => {
    if (!form) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setEditHTML(generateProposalHTML(form));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form]);

  function setField(key: keyof EditForm, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  // ── Status update ────────────────────────────────────────────────────────

  async function updateStatus(
    status: ProposalStatus,
    extra?: Record<string, string>
  ) {
    if (!proposal) return;
    setUpdatingStatus(true);
    const payload: Record<string, any> = { status, ...extra };
    const { error } = await supabase
      .from("proposals" as any)
      .update(payload)
      .eq("id", proposal.id);

    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
    } else {
      toast.success("Status atualizado!");
      setProposal((prev) => (prev ? { ...prev, status, ...extra } : prev));

      if (proposal.deal_id) {
        if (status === "recusada") {
          await (supabase as any)
            .from("crm_deals")
            .update({ stage: "fechado_perdido" })
            .eq("id", proposal.deal_id);
        } else if (status === "aprovada") {
          await (supabase as any)
            .from("crm_deals")
            .update({ stage: "fechado_ganho", closed_at: new Date().toISOString() })
            .eq("id", proposal.deal_id);
        }
      }
    }
    setUpdatingStatus(false);
  }

  async function handleStatusSelectChange(value: string) {
    await updateStatus(value as ProposalStatus);
  }

  // ── AI Enrich ────────────────────────────────────────────────────────────

  async function handleEnrich() {
    if (!form) return;
    setEnriching(true);
    try {
      const prompt =
        "Você é um especialista em propostas comerciais de automação e IA. Com base nos dados do projeto abaixo, melhore e enriqueça os textos de problema, solução, escopo e entregáveis. Retorne APENAS um JSON válido com os campos: problema, solucao, escopo, entregaveis. Dados: " +
        JSON.stringify(form);

      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GEMINI_KEY}` },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        let detail = "";
        try { detail = await response.text(); } catch { /* ignore */ }
        throw new Error(`Gemini API error: ${response.status}${detail ? " — " + detail.slice(0, 200) : ""}`);
      }
      const json = await response.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      const cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();
      const result = JSON.parse(cleaned);

      setForm((prev) =>
        prev
          ? {
              ...prev,
              problem_description: result.problema ?? prev.problem_description,
              solution_description: result.solucao ?? prev.solution_description,
              scope: result.escopo ?? prev.scope,
              deliverables: result.entregaveis ?? prev.deliverables,
            }
          : prev
      );
      toast.success("Conteúdo enriquecido com IA!");
    } catch (err: any) {
      toast.error("Erro ao enriquecer: " + (err?.message ?? String(err)));
    } finally {
      setEnriching(false);
    }
  }

  // ── Regenerate HTML ──────────────────────────────────────────────────────

  async function handleRegenerateHTML() {
    if (!form || !proposal) return;
    const html = generateProposalHTML(form);
    setEditHTML(html);
    const { error } = await supabase
      .from("proposals" as any)
      .update({ html_content: html })
      .eq("id", proposal.id);

    if (error) {
      toast.error("Erro ao salvar HTML: " + error.message);
    } else {
      setProposal((prev) => (prev ? { ...prev, html_content: html } : prev));
      toast.success("HTML regenerado e salvo!");
    }
  }

  // ── Save edit ────────────────────────────────────────────────────────────

  async function handleSaveEdit() {
    if (!form || !proposal) return;
    setSaving(true);
    const html = generateProposalHTML(form);
    const payload: Record<string, any> = {
      client_company: form.client_company,
      client_name: form.client_name || null,
      client_email: form.client_email || null,
      client_phone: form.client_phone || null,
      project_name: form.project_name,
      solution_type: form.solution_type || null,
      responsible: form.responsible || null,
      timeline_weeks: form.timeline_weeks ? parseInt(form.timeline_weeks) : null,
      contract_months: form.contract_months ? parseInt(form.contract_months) : 12,
      setup_value_brl: form.setup_value_brl ? parseFloat(form.setup_value_brl) : null,
      mrr_brl: form.mrr_brl ? parseFloat(form.mrr_brl) : null,
      problem_description: form.problem_description || null,
      solution_description: form.solution_description || null,
      scope: form.scope || null,
      integrations: form.integrations || null,
      deliverables: form.deliverables || null,
      notes: form.notes || null,
      html_content: html,
    };

    const { error } = await supabase
      .from("proposals" as any)
      .update(payload)
      .eq("id", proposal.id);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Proposta atualizada!");
      setProposal((prev) =>
        prev ? { ...prev, ...payload, html_content: html } : prev
      );
      setEditHTML(html);
      setActiveTab("proposta");
    }
    setSaving(false);
  }

  // ── Download ─────────────────────────────────────────────────────────────

  function handleDownload() {
    const html =
      activeTab === "editar" && form
        ? generateProposalHTML(form)
        : proposal?.html_content ?? "";
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposta-${slugify(proposal?.client_company ?? "cliente")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando proposta...
      </div>
    );
  }

  if (!proposal) return null;

  const currentHTML =
    activeTab === "editar" && form
      ? editHTML
      : proposal.html_content ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${proposal.client_company} — ${proposal.project_name}`}
        description={`Criada em ${dateBR(proposal.created_at)}${proposal.sent_at ? ` · Enviada em ${dateBR(proposal.sent_at)}` : ""}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/propostas")}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            {/* Inline status select */}
            <Select
              value={proposal.status}
              onValueChange={handleStatusSelectChange}
              disabled={updatingStatus}
            >
              <SelectTrigger
                className={`h-8 w-auto px-3 text-xs font-medium border rounded-full ${STATUS_COLORS[proposal.status]}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as ProposalStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50">
        {(["proposta", "editar"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "proposta" ? "Proposta" : "Editar"}
          </button>
        ))}
      </div>

      {/* ── Tab: Proposta ──────────────────────────────────────────────────── */}
      {activeTab === "proposta" && (
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download HTML
            </Button>

            {proposal.status === "rascunho" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-blue-400/40 text-blue-400 hover:bg-blue-400/10"
                disabled={updatingStatus}
                onClick={() =>
                  updateStatus("enviada", { sent_at: new Date().toISOString() })
                }
              >
                {updatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Marcar como enviada
              </Button>
            )}

            {(proposal.status === "enviada" || proposal.status === "em_negociacao") && (
              <Button
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={updatingStatus}
                onClick={() =>
                  updateStatus("aprovada", {
                    responded_at: new Date().toISOString(),
                  })
                }
              >
                {updatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Marcar como aprovada
              </Button>
            )}

            {proposal.status !== "recusada" &&
              proposal.status !== "rascunho" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-red-400/40 text-red-400 hover:bg-red-400/10"
                  disabled={updatingStatus}
                  onClick={() =>
                    updateStatus("recusada", {
                      responded_at: new Date().toISOString(),
                    })
                  }
                >
                  {updatingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Marcar como recusada
                </Button>
              )}

            {proposal.status === "aprovada" && !proposal.hub_project_id && (
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                onClick={() =>
                  navigate(`/hub/projetos/novo?proposal_id=${proposal.id}`)
                }
              >
                <FolderPlus className="h-4 w-4" />
                Criar projeto no Hub
              </Button>
            )}

            {proposal.hub_project_id && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() =>
                  navigate(`/hub/projetos/${proposal.hub_project_id}`)
                }
              >
                <ExternalLink className="h-4 w-4" />
                Ver projeto
              </Button>
            )}
          </div>

          {/* HTML Preview */}
          {currentHTML ? (
            <div className="rounded-xl border border-border/50 overflow-hidden shadow-card">
              <iframe
                srcDoc={currentHTML}
                style={{
                  width: "100%",
                  height: "700px",
                  border: "none",
                  borderRadius: "0 0 12px 12px",
                }}
                title="Proposta"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <Card className="bg-gradient-surface border-border/50">
              <CardContent className="py-16 text-center text-muted-foreground">
                <p className="text-sm">
                  Nenhum HTML gerado. Acesse a aba "Editar" para gerar.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Editar ────────────────────────────────────────────────────── */}
      {activeTab === "editar" && form && (
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          {/* Form */}
          <div className="w-full xl:w-[45%] space-y-5 shrink-0">
            {/* Section 1 — Cliente */}
            <Card className="bg-gradient-surface border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground font-medium">
                  1. Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>
                    Empresa <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.client_company}
                    onChange={(e) => setField("client_company", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome do responsável</Label>
                  <Input
                    value={form.client_name}
                    onChange={(e) => setField("client_name", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={form.client_email}
                      onChange={(e) =>
                        setField("client_email", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input
                      value={form.client_phone}
                      onChange={(e) =>
                        setField("client_phone", e.target.value)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2 — Projeto */}
            <Card className="bg-gradient-surface border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground font-medium">
                  2. Projeto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>
                    Nome do projeto <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.project_name}
                    onChange={(e) => setField("project_name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de solução</Label>
                  <Select
                    value={form.solution_type}
                    onValueChange={(v) => setField("solution_type", v)}
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
                <div className="space-y-1.5">
                  <Label>Responsável SolicitAí</Label>
                  <Input
                    value={form.responsible}
                    onChange={(e) => setField("responsible", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Timeline (semanas)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.timeline_weeks}
                      onChange={(e) =>
                        setField("timeline_weeks", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contrato (meses)</Label>
                    <Select
                      value={form.contract_months}
                      onValueChange={(v) => setField("contract_months", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 meses</SelectItem>
                        <SelectItem value="12">12 meses</SelectItem>
                        <SelectItem value="24">24 meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Valor de implantação (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.setup_value_brl}
                      onChange={(e) =>
                        setField("setup_value_brl", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>MRR mensal (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.mrr_brl}
                      onChange={(e) => setField("mrr_brl", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3 — Conteúdo */}
            <Card className="bg-gradient-surface border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground font-medium">
                  3. Conteúdo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Problema identificado</Label>
                  <Textarea
                    value={form.problem_description}
                    onChange={(e) =>
                      setField("problem_description", e.target.value)
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Solução proposta</Label>
                  <Textarea
                    value={form.solution_description}
                    onChange={(e) =>
                      setField("solution_description", e.target.value)
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Escopo / funcionalidades</Label>
                  <p className="text-xs text-muted-foreground">Uma funcionalidade por linha</p>
                  <Textarea
                    value={form.scope}
                    onChange={(e) => setField("scope", e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Integrações</Label>
                  <p className="text-xs text-muted-foreground">Separadas por vírgula</p>
                  <Input
                    value={form.integrations}
                    onChange={(e) => setField("integrations", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Entregáveis</Label>
                  <p className="text-xs text-muted-foreground">Um por linha</p>
                  <Textarea
                    value={form.deliverables}
                    onChange={(e) => setField("deliverables", e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Observações / condições comerciais</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    rows={2}
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10"
                  onClick={handleEnrich}
                  disabled={enriching}
                >
                  {enriching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enriquecendo com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      ✨ Enriquecer com IA
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Save actions */}
            <div className="flex flex-wrap gap-3 pb-4">
              <Button
                variant="outline"
                onClick={handleRegenerateHTML}
                className="gap-2"
                disabled={saving}
              >
                <RefreshCw className="h-4 w-4" />
                Regenerar HTML
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar alterações
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="w-full xl:flex-1 xl:sticky xl:top-6">
            <div className="rounded-xl border border-border/50 overflow-hidden shadow-card">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/50">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pré-visualização (ao vivo)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={handleDownload}
                >
                  <Download className="h-3 w-3" />
                  HTML
                </Button>
              </div>
              <iframe
                srcDoc={editHTML}
                style={{
                  width: "100%",
                  height: "600px",
                  border: "none",
                  borderRadius: "0 0 12px 12px",
                }}
                title="Pré-visualização editável"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
