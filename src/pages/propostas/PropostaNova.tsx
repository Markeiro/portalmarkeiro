import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { ArrowLeft, Download, Loader2, Save, Send, Sparkles } from "lucide-react";

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

const GEMINI_KEY = "AIzaSyA2RYCAxLZXHMOuxP3a2VW1B14Mt9WKF4w";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
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
  why_us: string;
  roi_description: string;
  scope: string;
  integrations: string;
  deliverables: string;
  payment_terms: string;
  valid_until: string;
  notes: string;
}

// ─── HTML Generator ───────────────────────────────────────────────────────────

function generateProposalHTML(data: FormData): string {
  const mrr = parseFloat(data.mrr_brl) || 0;
  const months = parseInt(data.contract_months) || 12;
  const setup = parseFloat(data.setup_value_brl) || 0;
  const weeks = parseInt(data.timeline_weeks) || 0;
  const totalContract = mrr * months;
  const scopeLines = (data.scope || "").split("\n").filter(Boolean);
  const deliverableLines = (data.deliverables || "").split("\n").filter(Boolean);
  const integrationList = (data.integrations || "").split(",").map(s => s.trim()).filter(Boolean);
  const whyUsList = (data.why_us || "").split("\n").filter(Boolean);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Proposta — ${data.project_name || "SolicitAí"}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  :root {
    --bg: #060f0a;
    --surface: rgba(24,170,97,0.05);
    --border: rgba(24,170,97,0.12);
    --accent: #18aa61;
    --accent2: #1ed278;
    --text: #f0faf4;
    --muted: #5a9e79;
    --green: #1ed278;
    --radius: 20px;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{
    font-family:'Inter',ui-sans-serif,system-ui,sans-serif;
    background:var(--bg);color:var(--text);line-height:1.65;
    overflow-x:hidden;
  }

  /* ── Animations ─────────────────────── */
  @keyframes fadeInUp {
    from{opacity:0;transform:translateY(32px)}
    to{opacity:1;transform:translateY(0)}
  }
  @keyframes fadeIn {
    from{opacity:0}to{opacity:1}
  }
  @keyframes shimmer {
    0%{background-position:200% center}
    100%{background-position:-200% center}
  }
  @keyframes gradientBg {
    0%,100%{background-position:0% 50%}
    50%{background-position:100% 50%}
  }
  @keyframes pulse {
    0%,100%{box-shadow:0 0 0 0 rgba(24,170,97,0.4)}
    50%{box-shadow:0 0 0 16px rgba(24,170,97,0)}
  }
  @keyframes slideRight {
    from{width:0}to{width:100%}
  }
  @keyframes float {
    0%,100%{transform:translateY(0)}
    50%{transform:translateY(-8px)}
  }
  @keyframes rotateSlow {
    from{transform:rotate(0deg)}to{transform:rotate(360deg)}
  }
  @keyframes glow {
    0%,100%{opacity:0.5}50%{opacity:1}
  }

  .animate-fade-up{animation:fadeInUp 0.7s ease both}
  .animate-fade{animation:fadeIn 1s ease both}
  .delay-1{animation-delay:0.1s}
  .delay-2{animation-delay:0.2s}
  .delay-3{animation-delay:0.3s}
  .delay-4{animation-delay:0.4s}
  .delay-5{animation-delay:0.5s}

  /* ── Hero ───────────────────────────── */
  .hero {
    position:relative;
    min-height:520px;
    display:flex;flex-direction:column;justify-content:flex-end;
    padding:56px 56px 60px;
    overflow:hidden;
  }
  .hero-bg {
    position:absolute;inset:0;
    background:linear-gradient(135deg,#060f0a 0%,#071a0e 40%,#060e07 100%);
    background-size:200% 200%;
    animation:gradientBg 10s ease infinite;
  }
  .hero-orb-1 {
    position:absolute;top:-80px;right:-80px;
    width:480px;height:480px;border-radius:50%;
    background:radial-gradient(circle,rgba(24,170,97,0.18) 0%,transparent 70%);
    animation:float 8s ease-in-out infinite;
  }
  .hero-orb-2 {
    position:absolute;bottom:-120px;left:-60px;
    width:360px;height:360px;border-radius:50%;
    background:radial-gradient(circle,rgba(30,210,120,0.10) 0%,transparent 70%);
    animation:float 12s ease-in-out infinite reverse;
  }
  .hero-grid {
    position:absolute;inset:0;
    background-image:linear-gradient(rgba(24,170,97,0.06) 1px,transparent 1px),
                     linear-gradient(90deg,rgba(24,170,97,0.06) 1px,transparent 1px);
    background-size:48px 48px;
    mask-image:linear-gradient(180deg,transparent 0%,rgba(0,0,0,0.6) 40%,transparent 100%);
  }
  .hero-content{position:relative;z-index:1;max-width:860px}
  .logo-tag {
    display:inline-flex;align-items:center;gap:8px;
    padding:6px 14px;border-radius:999px;
    border:1px solid rgba(24,170,97,0.3);
    background:rgba(24,170,97,0.08);
    font-size:0.78rem;font-weight:700;letter-spacing:0.08em;
    color:var(--accent2);margin-bottom:28px;
    backdrop-filter:blur(8px);
  }
  .logo-dot{width:6px;height:6px;border-radius:50%;background:var(--accent2);animation:glow 2s ease infinite}
  h1 {
    font-size:clamp(2.4rem,5vw,4rem);
    font-weight:900;letter-spacing:-0.05em;
    line-height:1.05;margin-bottom:18px;
  }
  h1 .gradient {
    background:linear-gradient(120deg,#ffffff 30%,var(--accent) 60%,var(--accent2) 100%);
    background-size:200% auto;
    -webkit-background-clip:text;background-clip:text;color:transparent;
    animation:shimmer 4s linear infinite;
  }
  .hero-sub {
    font-size:1.1rem;color:var(--muted);max-width:600px;margin-bottom:28px;line-height:1.6;
  }
  .hero-badges{display:flex;flex-wrap:wrap;gap:10px}
  .hero-badge {
    padding:7px 16px;border-radius:999px;
    font-size:0.8rem;font-weight:600;
    border:1px solid rgba(255,255,255,0.15);
    background:rgba(255,255,255,0.07);
    backdrop-filter:blur(8px);
  }
  .hero-badge.accent{
    border-color:rgba(24,170,97,0.4);
    background:rgba(24,170,97,0.12);color:var(--accent2);
  }
  .hero-date{
    position:absolute;top:32px;right:56px;
    font-size:0.78rem;color:var(--muted);z-index:1;
    border:1px solid var(--border);background:var(--surface);
    padding:4px 12px;border-radius:999px;backdrop-filter:blur(8px);
  }

  /* ── Layout ─────────────────────────── */
  .container{max-width:940px;margin:0 auto;padding:0 40px}
  section{padding:64px 0;border-top:1px solid var(--border)}
  .section-label {
    font-size:0.7rem;text-transform:uppercase;letter-spacing:0.14em;
    color:var(--accent);font-weight:800;margin-bottom:12px;
    display:flex;align-items:center;gap:8px;
  }
  .section-label::after{
    content:'';flex:1;height:1px;
    background:linear-gradient(90deg,rgba(24,170,97,0.4),transparent);
  }
  h2{font-size:clamp(1.6rem,3vw,2.2rem);font-weight:800;letter-spacing:-0.04em;margin-bottom:14px}
  p.lead{color:var(--muted);font-size:1rem;max-width:720px;line-height:1.7}

  /* ── Glass card ─────────────────────── */
  .glass {
    border:1px solid var(--border);border-radius:var(--radius);
    background:var(--surface);
    backdrop-filter:blur(12px);
  }

  /* ── Problem/Solution ───────────────── */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  @media(max-width:680px){.two-col{grid-template-columns:1fr}}
  .col-card{
    border-radius:var(--radius);padding:28px;
    border:1px solid var(--border);background:var(--surface);
  }
  .col-card-title{
    font-size:0.72rem;text-transform:uppercase;letter-spacing:0.12em;
    font-weight:700;margin-bottom:14px;
  }
  .col-card-title.problem{color:#f87171}
  .col-card-title.solution{color:var(--green)}
  .col-card h3{font-size:1.2rem;font-weight:700;letter-spacing:-0.03em;margin-bottom:10px}
  .col-card p{color:var(--muted);font-size:0.9rem;line-height:1.7}

  /* ── Timeline ───────────────────────── */
  .timeline{display:flex;flex-direction:column;gap:0;position:relative;margin-top:24px}
  .tl-item{
    display:grid;grid-template-columns:44px 1fr;gap:16px;
    align-items:stretch;
  }
  .tl-left{display:flex;flex-direction:column;align-items:center}
  .tl-num{
    width:44px;height:44px;border-radius:14px;
    display:grid;place-items:center;
    background:rgba(24,170,97,0.15);border:1px solid rgba(24,170,97,0.3);
    font-weight:900;font-size:0.85rem;color:var(--accent2);
    flex-shrink:0;
    transition:transform 0.2s;
  }
  .tl-item:hover .tl-num{transform:scale(1.1)}
  .tl-line{flex:1;width:2px;background:linear-gradient(180deg,rgba(24,170,97,0.25),transparent);margin:6px auto 0}
  .tl-body{
    padding:16px 20px 28px;border-radius:16px;
    border:1px solid var(--border);background:var(--surface);
    margin-bottom:12px;
    transition:border-color 0.2s,background 0.2s;
  }
  .tl-body:hover{border-color:rgba(24,170,97,0.3);background:rgba(24,170,97,0.04)}
  .tl-body h4{font-size:0.95rem;font-weight:700;margin-bottom:4px;color:var(--text)}
  .tl-body p{font-size:0.85rem;color:var(--muted)}

  /* ── Deliverables ───────────────────── */
  .check-list{display:flex;flex-direction:column;gap:10px;margin-top:20px}
  .check-item{
    display:flex;align-items:flex-start;gap:12px;
    padding:12px 16px;border-radius:14px;
    border:1px solid var(--border);background:var(--surface);
    transition:border-color 0.2s;
  }
  .check-item:hover{border-color:rgba(24,170,97,0.3)}
  .check-icon{
    width:24px;height:24px;border-radius:8px;
    background:rgba(24,170,97,0.15);border:1px solid rgba(24,170,97,0.3);
    display:grid;place-items:center;flex-shrink:0;margin-top:1px;
    font-size:0.75rem;color:var(--green);
  }
  .check-item span{font-size:0.92rem;color:var(--text);line-height:1.5}

  /* ── Integrations ───────────────────── */
  .tag-cloud{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
  .tag{
    padding:8px 16px;border-radius:999px;
    border:1px solid var(--border);background:var(--surface);
    font-size:0.82rem;color:var(--text);font-weight:500;
    transition:all 0.2s;cursor:default;
  }
  .tag:hover{border-color:rgba(24,170,97,0.4);background:rgba(24,170,97,0.08);color:var(--accent2)}

  /* ── Why Us ─────────────────────────── */
  .why-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-top:20px}
  .why-card{
    padding:20px;border-radius:var(--radius);
    border:1px solid var(--border);background:var(--surface);
    transition:all 0.25s;
  }
  .why-card:hover{border-color:rgba(24,170,97,0.3);transform:translateY(-2px)}
  .why-card-icon{font-size:1.5rem;margin-bottom:10px}
  .why-card p{font-size:0.88rem;color:var(--muted);line-height:1.6}

  /* ── Pricing ────────────────────────── */
  .pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-top:24px}
  .price-card{
    border-radius:var(--radius);padding:24px 20px;
    position:relative;overflow:hidden;
    border:1px solid var(--border);background:var(--surface);
    transition:transform 0.25s,border-color 0.25s;text-align:center;
  }
  .price-card:hover{transform:translateY(-4px)}
  .price-card.highlight{
    border-color:rgba(24,170,97,0.4);
    background:linear-gradient(135deg,rgba(24,170,97,0.10),rgba(30,210,120,0.05));
    animation:pulse 3s ease infinite;
  }
  .price-card::before{
    content:'';position:absolute;inset:0;
    background:linear-gradient(135deg,rgba(255,255,255,0.04),transparent);
    pointer-events:none;
  }
  .price-label{font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--muted);font-weight:600;margin-bottom:10px}
  .price-value{font-size:2rem;font-weight:900;letter-spacing:-0.05em;color:var(--text);line-height:1}
  .price-value.accent{
    background:linear-gradient(120deg,var(--accent),var(--accent2));
    -webkit-background-clip:text;background-clip:text;color:transparent;
  }
  .price-sub{font-size:0.78rem;color:var(--muted);margin-top:6px}
  .price-total{
    margin-top:24px;padding:16px 20px;border-radius:14px;
    background:rgba(24,170,97,0.06);border:1px solid rgba(24,170,97,0.2);
    display:flex;justify-content:space-between;align-items:center;
  }
  .price-total span{font-size:0.85rem;color:var(--muted)}
  .price-total strong{font-size:1.1rem;font-weight:800;color:var(--accent2)}

  /* ── ROI ────────────────────────────── */
  .roi-box{
    border-radius:var(--radius);padding:32px;
    background:linear-gradient(135deg,rgba(24,170,97,0.08),rgba(24,170,97,0.06));
    border:1px solid rgba(24,170,97,0.2);margin-top:20px;
  }
  .roi-box p{color:var(--muted);font-size:0.95rem;line-height:1.7}

  /* ── CTA ────────────────────────────── */
  .cta-section{
    padding:72px 56px;
    background:linear-gradient(135deg,rgba(24,170,97,0.12),rgba(30,210,120,0.06));
    border-top:1px solid rgba(24,170,97,0.2);
    text-align:center;
  }
  .cta-section h2{font-size:clamp(1.8rem,4vw,3rem);font-weight:900;letter-spacing:-0.05em;margin-bottom:14px}
  .cta-section p{color:var(--muted);font-size:1rem;margin-bottom:28px}
  .cta-btn{
    display:inline-flex;align-items:center;gap:10px;
    padding:16px 36px;border-radius:999px;font-weight:700;font-size:1rem;
    background:linear-gradient(120deg,var(--accent),var(--accent2));
    color:#060f0a;text-decoration:none;
    transition:all 0.25s;border:none;cursor:pointer;
  }
  .cta-btn:hover{transform:scale(1.04);box-shadow:0 8px 32px rgba(24,170,97,0.35)}
  .cta-contacts{display:flex;justify-content:center;gap:32px;margin-top:28px;flex-wrap:wrap}
  .cta-contact{display:flex;flex-direction:column;align-items:center;gap:4px}
  .cta-contact span{font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted)}
  .cta-contact strong{font-size:0.95rem;color:var(--text)}

  /* ── Footer ─────────────────────────── */
  footer{
    text-align:center;padding:32px 40px;
    color:var(--muted);font-size:0.8rem;
    border-top:1px solid var(--border);
  }
  footer strong{color:var(--text)}

  /* ── Conditions ─────────────────────── */
  .conditions{
    margin-top:24px;padding:20px;border-radius:14px;
    border:1px solid var(--border);background:var(--surface);
    font-size:0.82rem;color:var(--muted);line-height:1.7;
  }

  /* ── Print ──────────────────────────── */
  @media print{
    body{background:#fff;color:#111}
    .hero{background:#071a0e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    section{page-break-inside:avoid}
    .animate-fade-up,.animate-fade{animation:none!important;opacity:1!important;transform:none!important}
  }
</style>
</head>
<body>

<!-- ═══ HERO ═════════════════════════════════════════════════════════════ -->
<div class="hero">
  <div class="hero-bg"></div>
  <div class="hero-grid"></div>
  <div class="hero-orb-1"></div>
  <div class="hero-orb-2"></div>
  <div class="hero-date">${today}</div>
  <div class="hero-content">
    <div class="logo-tag animate-fade">
      <div class="logo-dot"></div>
      SolicitAí · Automação e IA
    </div>
    <h1 class="animate-fade-up delay-1">
      <span class="gradient">${data.project_name || "Proposta de Projeto"}</span>
    </h1>
    <p class="hero-sub animate-fade-up delay-2">${
      data.client_company
        ? `Proposta exclusiva para <strong>${data.client_company}</strong> — desenvolvida com profundidade para transformar seu negócio com inteligência artificial.`
        : "Proposta exclusiva desenvolvida com profundidade para transformar seu negócio com inteligência artificial."
    }</p>
    <div class="hero-badges animate-fade-up delay-3">
      ${data.solution_type ? `<span class="hero-badge accent">${data.solution_type}</span>` : ""}
      ${weeks ? `<span class="hero-badge">${weeks} semanas de implantação</span>` : ""}
      ${months ? `<span class="hero-badge">${months} meses de contrato</span>` : ""}
      ${data.responsible ? `<span class="hero-badge">Responsável: ${data.responsible}</span>` : ""}
    </div>
  </div>
</div>

<div class="container">

${data.problem_description || data.solution_description ? `
<!-- ═══ PROBLEMA + SOLUÇÃO ═══════════════════════════════════════════════ -->
<section>
  <div class="section-label animate-fade-up">Diagnóstico</div>
  <h2 class="animate-fade-up delay-1">Desafio &amp; Solução</h2>
  <div class="two-col">
    ${data.problem_description ? `
    <div class="col-card animate-fade-up delay-2">
      <div class="col-card-title problem">⚡ O Problema</div>
      <h3>Situação atual</h3>
      <p>${data.problem_description}</p>
    </div>` : ""}
    ${data.solution_description ? `
    <div class="col-card animate-fade-up delay-3">
      <div class="col-card-title solution">✦ A Solução</div>
      <h3>Como vamos resolver</h3>
      <p>${data.solution_description}</p>
    </div>` : ""}
  </div>
</section>` : ""}

${scopeLines.length > 0 ? `
<!-- ═══ ESCOPO ══════════════════════════════════════════════════════════ -->
<section>
  <div class="section-label animate-fade-up">Escopo</div>
  <h2 class="animate-fade-up delay-1">O que será desenvolvido</h2>
  <p class="lead animate-fade-up delay-2">Cada funcionalidade foi mapeada para impactar diretamente os resultados do seu negócio.</p>
  <div class="timeline">
    ${scopeLines.map((line, i) => `
    <div class="tl-item animate-fade-up delay-${Math.min(i + 2, 5)}">
      <div class="tl-left">
        <div class="tl-num">${String(i + 1).padStart(2, "0")}</div>
        ${i < scopeLines.length - 1 ? `<div class="tl-line"></div>` : ""}
      </div>
      <div class="tl-body">
        <h4>${line}</h4>
      </div>
    </div>`).join("")}
  </div>
</section>` : ""}

${integrationList.length > 0 ? `
<!-- ═══ INTEGRAÇÕES ══════════════════════════════════════════════════════ -->
<section>
  <div class="section-label animate-fade-up">Ecossistema</div>
  <h2 class="animate-fade-up delay-1">Ferramentas conectadas</h2>
  <p class="lead animate-fade-up delay-2">Integramos com as plataformas que você já usa, sem migração ou treinamento desnecessário.</p>
  <div class="tag-cloud animate-fade-up delay-3">
    ${integrationList.map(t => `<span class="tag">${t}</span>`).join("")}
  </div>
</section>` : ""}

${deliverableLines.length > 0 ? `
<!-- ═══ ENTREGÁVEIS ══════════════════════════════════════════════════════ -->
<section>
  <div class="section-label animate-fade-up">Entregáveis</div>
  <h2 class="animate-fade-up delay-1">O que você recebe</h2>
  <div class="check-list">
    ${deliverableLines.map((line, i) => `
    <div class="check-item animate-fade-up delay-${Math.min(i + 2, 5)}">
      <div class="check-icon">✓</div>
      <span>${line}</span>
    </div>`).join("")}
  </div>
</section>` : ""}

${whyUsList.length > 0 ? `
<!-- ═══ POR QUE SOLICITAÍ ════════════════════════════════════════════════ -->
<section>
  <div class="section-label animate-fade-up">Diferencial</div>
  <h2 class="animate-fade-up delay-1">Por que a SolicitAí?</h2>
  <div class="why-grid">
    ${whyUsList.map((item, i) => `
    <div class="why-card animate-fade-up delay-${Math.min(i + 2, 5)}">
      <div class="why-card-icon">${["🚀","🧠","⚡","🎯","💡","🔗"][i % 6]}</div>
      <p>${item}</p>
    </div>`).join("")}
  </div>
</section>` : ""}

<!-- ═══ INVESTIMENTO ══════════════════════════════════════════════════════ -->
<section>
  <div class="section-label animate-fade-up">Investimento</div>
  <h2 class="animate-fade-up delay-1">Valores do projeto</h2>
  <div class="pricing-grid">
    ${setup ? `
    <div class="price-card animate-fade-up delay-2">
      <div class="price-label">Implantação</div>
      <div class="price-value accent">${fmt(setup)}</div>
      <div class="price-sub">Único · Pago na assinatura</div>
    </div>` : ""}
    ${mrr ? `
    <div class="price-card highlight animate-fade-up delay-3">
      <div class="price-label">Mensalidade</div>
      <div class="price-value accent">${fmt(mrr)}</div>
      <div class="price-sub">/mês · Faturamento mensal</div>
    </div>` : ""}
    ${months ? `
    <div class="price-card animate-fade-up delay-4">
      <div class="price-label">Período</div>
      <div class="price-value">${months}</div>
      <div class="price-sub">meses de contrato</div>
    </div>` : ""}
    ${weeks ? `
    <div class="price-card animate-fade-up delay-5">
      <div class="price-label">Implantação</div>
      <div class="price-value">${weeks}</div>
      <div class="price-sub">semanas até o go-live</div>
    </div>` : ""}
  </div>
  ${totalContract > 0 ? `
  <div class="price-total animate-fade-up delay-3">
    <span>Total do contrato (${months} meses)</span>
    <strong>${fmt(setup + totalContract)}</strong>
  </div>` : ""}
  ${data.payment_terms ? `
  <div class="conditions animate-fade-up delay-4">
    <strong style="color:var(--text);display:block;margin-bottom:6px">Condições de pagamento</strong>
    ${data.payment_terms}
  </div>` : ""}
</section>

${data.roi_description ? `
<!-- ═══ ROI ═══════════════════════════════════════════════════════════════ -->
<section>
  <div class="section-label animate-fade-up">Retorno</div>
  <h2 class="animate-fade-up delay-1">ROI &amp; Benefícios esperados</h2>
  <div class="roi-box animate-fade-up delay-2">
    <p>${data.roi_description}</p>
  </div>
</section>` : ""}

${data.notes ? `
<!-- ═══ OBSERVAÇÕES ══════════════════════════════════════════════════════ -->
<section>
  <div class="section-label animate-fade-up">Condições gerais</div>
  <div class="conditions animate-fade-up delay-1">${data.notes}</div>
</section>` : ""}

</div><!-- /container -->

<!-- ═══ CTA ════════════════════════════════════════════════════════════════ -->
<div class="cta-section">
  <h2 class="animate-fade-up">Pronto para transformar<br/>seu negócio?</h2>
  <p class="animate-fade-up delay-1">Entre em contato e vamos dar o próximo passo juntos.</p>
  <div class="cta-contacts animate-fade-up delay-2">
    ${data.client_name ? `
    <div class="cta-contact">
      <span>Para</span>
      <strong>${data.client_name}</strong>
    </div>` : ""}
    ${data.client_email ? `
    <div class="cta-contact">
      <span>E-mail</span>
      <strong>${data.client_email}</strong>
    </div>` : ""}
    ${data.client_phone ? `
    <div class="cta-contact">
      <span>WhatsApp</span>
      <strong>${data.client_phone}</strong>
    </div>` : ""}
    ${data.valid_until ? `
    <div class="cta-contact">
      <span>Proposta válida até</span>
      <strong>${new Date(data.valid_until + "T00:00:00").toLocaleDateString("pt-BR")}</strong>
    </div>` : ""}
  </div>
</div>

<footer>
  <strong>SolicitAí</strong> · Automação e IA para negócios · solicitai.com.br<br/>
  <span style="font-size:0.72rem;opacity:0.6">Proposta gerada em ${today} · Documento confidencial</span>
</footer>

</body>
</html>`;
}

// ─── Slugify ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Component ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  client_company: "",
  client_name: "",
  client_email: "",
  client_phone: "",
  project_name: "",
  solution_type: "",
  responsible: "Daniel",
  timeline_weeks: "",
  contract_months: "12",
  setup_value_brl: "",
  mrr_brl: "",
  problem_description: "",
  solution_description: "",
  why_us: "",
  roi_description: "",
  scope: "",
  integrations: "",
  deliverables: "",
  payment_terms: "",
  valid_until: "",
  notes: "",
};

export default function PropostaNova() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get("deal_id");

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [generatedHTML, setGeneratedHTML] = useState<string>(
    generateProposalHTML(EMPTY_FORM)
  );
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill from deal if deal_id present
  useEffect(() => {
    if (!dealId) return;
    (async () => {
      const { data, error } = await supabase
        .from("crm_deals" as any)
        .select("*")
        .eq("id", dealId)
        .maybeSingle();
      if (error || !data) return;
      const d = data as any;
      setForm((prev) => ({
        ...prev,
        client_company: d.company ?? d.client_company ?? "",
        client_name: d.contact_name ?? "",
        client_email: d.contact_email ?? "",
        client_phone: d.contact_phone ?? "",
        project_name: d.title ?? "",
        setup_value_brl: d.value_setup ? String(d.value_setup) : "",
        mrr_brl: d.value_mrr ? String(d.value_mrr) : "",
      }));
    })();
  }, [dealId]);

  // Debounced HTML regeneration
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setGeneratedHTML(generateProposalHTML(form));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form]);

  function setField(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── AI Enrich ───────────────────────────────────────────────────────────────

  async function handleEnrich() {
    if (!form.project_name && !form.client_company && !form.solution_type) {
      toast.error("Preencha ao menos o nome do projeto, empresa ou tipo de solução antes de enriquecer");
      return;
    }
    setEnriching(true);
    try {
      const contextData = {
        empresa: form.client_company,
        projeto: form.project_name,
        solucao: form.solution_type,
        problema_atual: form.problem_description,
        solucao_atual: form.solution_description,
        escopo_atual: form.scope,
        entregaveis_atuais: form.deliverables,
      };

      const prompt = `Você é um especialista em propostas comerciais de automação e IA da empresa SolicitAí. Com base nos dados do projeto abaixo, melhore e enriqueça os textos. Retorne APENAS um JSON válido sem markdown com exatamente estes campos:
{
  "problema": "texto detalhado do problema/dor do cliente em 3-4 frases",
  "solucao": "texto detalhado da solução proposta em 3-4 frases",
  "escopo": "funcionalidade 1\\nfuncionalidade 2\\nfuncionalidade 3\\nfuncionalidade 4\\nfuncionalidade 5",
  "entregaveis": "entregável 1\\nentregável 2\\nentregável 3",
  "por_que_nos": "diferencial 1\\ndiferencial 2\\ndiferencial 3",
  "roi": "descrição do ROI esperado e benefícios mensuráveis em 2-3 frases"
}

Dados: ${JSON.stringify(contextData)}`;

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

      setForm((prev) => ({
        ...prev,
        problem_description: result.problema ?? prev.problem_description,
        solution_description: result.solucao ?? prev.solution_description,
        scope: result.escopo ?? prev.scope,
        deliverables: result.entregaveis ?? prev.deliverables,
        why_us: result.por_que_nos ?? prev.why_us,
        roi_description: result.roi ?? prev.roi_description,
      }));

      toast.success("Proposta enriquecida com IA!");
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      toast.error("Erro ao enriquecer: " + msg, { duration: 8000 });
      console.error("Gemini enrich error:", err);
    } finally {
      setEnriching(false);
    }
  }

  // ── Save helpers ─────────────────────────────────────────────────────────────

  function buildInsertPayload(
    status: "rascunho" | "enviada",
    html: string
  ): Record<string, any> {
    return {
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
      status,
      deal_id: dealId ?? null,
      ...(status === "enviada" ? { sent_at: new Date().toISOString() } : {}),
    };
  }

  async function handleSave(status: "rascunho" | "enviada") {
    if (!form.client_company.trim()) {
      toast.error("Empresa é obrigatória");
      return;
    }
    if (!form.project_name.trim()) {
      toast.error("Nome do projeto é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const html = generateProposalHTML(form);
      const { data, error } = await supabase
        .from("proposals" as any)
        .insert(buildInsertPayload(status, html))
        .select("id")
        .single();

      if (error) throw error;
      const newId = (data as any).id as string;

      if (dealId) {
        await (supabase as any)
          .from("crm_deals")
          .update({ proposal_id: newId, stage: "proposta_enviada" })
          .eq("id", dealId);
      }

      toast.success(
        status === "rascunho" ? "Rascunho salvo!" : "Proposta salva e marcada como enviada!"
      );
      navigate(`/propostas/${newId}`);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message ?? String(err)));
    } finally {
      setSaving(false);
    }
  }

  function handleDownload() {
    const html = generateProposalHTML(form);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposta-${slugify(form.client_company || "cliente")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Proposta"
        description="Crie uma proposta comercial com pré-visualização em tempo real"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/propostas")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* ── Form (left) ─────────────────────────────────────────────────── */}
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
                <Label>Empresa <span className="text-destructive">*</span></Label>
                <Input
                  value={form.client_company}
                  onChange={(e) => setField("client_company", e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nome do responsável</Label>
                <Input
                  value={form.client_name}
                  onChange={(e) => setField("client_name", e.target.value)}
                  placeholder="Nome do contato"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.client_email}
                    onChange={(e) => setField("client_email", e.target.value)}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone / WhatsApp</Label>
                  <Input
                    value={form.client_phone}
                    onChange={(e) => setField("client_phone", e.target.value)}
                    placeholder="(11) 99999-9999"
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
                <Label>Nome do projeto <span className="text-destructive">*</span></Label>
                <Input
                  value={form.project_name}
                  onChange={(e) => setField("project_name", e.target.value)}
                  placeholder="Ex: Automação de Atendimento"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de solução</Label>
                <Select
                  value={form.solution_type}
                  onValueChange={(v) => setField("solution_type", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {SOLUTION_TYPES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
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
                    type="number" min="1"
                    value={form.timeline_weeks}
                    onChange={(e) => setField("timeline_weeks", e.target.value)}
                    placeholder="Ex: 8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Contrato (meses)</Label>
                  <Select
                    value={form.contract_months}
                    onValueChange={(v) => setField("contract_months", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    type="number" step="0.01" min="0"
                    value={form.setup_value_brl}
                    onChange={(e) => setField("setup_value_brl", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>MRR mensal (R$)</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={form.mrr_brl}
                    onChange={(e) => setField("mrr_brl", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Condições de pagamento</Label>
                  <Input
                    value={form.payment_terms}
                    onChange={(e) => setField("payment_terms", e.target.value)}
                    placeholder="Ex: 50% entrada + 50% no go-live"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Proposta válida até</Label>
                  <Input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setField("valid_until", e.target.value)}
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
                  onChange={(e) => setField("problem_description", e.target.value)}
                  placeholder="Descreva o problema ou necessidade do cliente..."
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Solução proposta</Label>
                <Textarea
                  value={form.solution_description}
                  onChange={(e) => setField("solution_description", e.target.value)}
                  placeholder="Descreva a solução que será entregue..."
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Escopo / funcionalidades</Label>
                <p className="text-xs text-muted-foreground">Uma funcionalidade por linha</p>
                <Textarea
                  value={form.scope}
                  onChange={(e) => setField("scope", e.target.value)}
                  placeholder={"Chatbot de atendimento\nDashboard de métricas\nIntegração com CRM"}
                  rows={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Integrações</Label>
                <p className="text-xs text-muted-foreground">Separadas por vírgula</p>
                <Input
                  value={form.integrations}
                  onChange={(e) => setField("integrations", e.target.value)}
                  placeholder="WhatsApp, Google Sheets, HubSpot"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Entregáveis</Label>
                <p className="text-xs text-muted-foreground">Um por linha</p>
                <Textarea
                  value={form.deliverables}
                  onChange={(e) => setField("deliverables", e.target.value)}
                  placeholder={"Fluxo configurado e testado\nTreinamento da equipe\nDocumentação técnica"}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Por que a SolicitAí?</Label>
                <p className="text-xs text-muted-foreground">Um diferencial por linha (aparece como cards na proposta)</p>
                <Textarea
                  value={form.why_us}
                  onChange={(e) => setField("why_us", e.target.value)}
                  placeholder={"Especialistas em automação com IA\nEntrega em 8 semanas com go-live garantido\nSuporte dedicado pós-implantação"}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>ROI / Benefícios esperados</Label>
                <Textarea
                  value={form.roi_description}
                  onChange={(e) => setField("roi_description", e.target.value)}
                  placeholder="Descreva o retorno esperado: redução de custos, aumento de receita, tempo economizado..."
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Observações / condições gerais</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Ex: Proposta válida por 15 dias. Faturamento mensal."
                  rows={2}
                />
              </div>

              {/* AI Enrich button */}
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
                    Enriquecer com IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pb-4">
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download HTML
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave("rascunho")}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar rascunho
            </Button>
            <Button
              onClick={() => handleSave("enviada")}
              disabled={saving}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Salvar e marcar como enviada
            </Button>
          </div>
        </div>

        {/* ── Preview (right) ──────────────────────────────────────────────── */}
        <div className="w-full xl:flex-1 xl:sticky xl:top-6">
          <div className="rounded-xl border border-border/50 overflow-hidden shadow-card">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/50">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pré-visualização
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
              srcDoc={generatedHTML}
              style={{
                width: "100%",
                height: "700px",
                border: "none",
                borderRadius: "0 0 12px 12px",
              }}
              title="Pré-visualização da proposta"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
