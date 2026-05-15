import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/markeiro-logo.svg";
import {
  AlertCircle, Zap, CheckCircle2, ChevronRight, ChevronLeft,
  Play, Pause, SkipBack, SkipForward, Square, Music2, Home, BookOpen,
  Layers, CheckSquare, ClipboardList, Key, FolderOpen, FileText,
  DollarSign, Brain, BarChart2, MessageSquare, ExternalLink, AlertTriangle,
  RefreshCw, Star, Send, Clock, Sparkles, ChevronDown, ChevronUp,
  Circle, Sun, Moon, Menu, X, TrendingUp,
} from "lucide-react";

// ─── Brand colours (Markeiro) ──────────────────────────────────────────────────
const G = {
  primary:    "#4B6040",  // Verde Musgo
  glow:       "#B87333",  // Cobre
  dark: {
    bg:       "#1a2418",
    bgGrad:   "radial-gradient(circle at 12% 0%,rgba(75,96,64,.18),transparent 30%),radial-gradient(circle at 88% 5%,rgba(184,115,51,.10),transparent 28%),#1a2418",
    card:     "rgba(255,255,255,.04)",
    border:   "rgba(255,255,255,.09)",
    text:     "#ffffff",
    muted:    "#9a8a78",
    header:   "rgba(26,36,24,.92)",
    sidebar:  "rgba(16,24,14,.98)",
    input:    "rgba(255,255,255,.05)",
    inputB:   "rgba(255,255,255,.14)",
  },
  light: {
    bg:       "#F8F2E6",
    bgGrad:   "radial-gradient(circle at 12% 0%,rgba(75,96,64,.08),transparent 30%),#F8F2E6",
    card:     "#fdf8f0",
    border:   "rgba(0,0,0,.08)",
    text:     "#1a1a1a",
    muted:    "#7A6A58",
    header:   "rgba(248,242,230,.95)",
    sidebar:  "rgba(47,61,40,.97)",
    input:    "rgba(0,0,0,.04)",
    inputB:   "rgba(0,0,0,.12)",
  },
};

// ─── Tracks ───────────────────────────────────────────────────────────────────
const TRACKS = [
  { id: "v2AC41dglnM", mood: "Enérgico(a) e Poderoso(a)",       song: "AC/DC — Thunderstruck",         emoji: "⚡", color: "#f59e0b" },
  { id: "8sgycukafqQ", mood: "Transformador(a) e Decidido(a)",   song: "Linkin Park — What I've Done",  emoji: "🔥", color: "#ef4444" },
  { id: "5s7_WbiR79E", mood: "Intenso(a) e Imponente",           song: "Black Sabbath — Iron Man",      emoji: "🤘", color: "#8b5cf6" },
  { id: "CD-E-LDc384", mood: "Focado(a) e Implacável",           song: "Metallica — Enter Sandman",     emoji: "🌑", color: "#6b7280" },
  { id: "btPJPFnesV4", mood: "Clássico(a) e Vitorioso(a)",       song: "Survivor — Eye of the Tiger",   emoji: "🏆", color: "#10b981" },
];

// ─── Nav tabs ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: "inicio",      label: "Início",        icon: Home,          group: "Visão Geral" },
  { key: "onboarding",  label: "Onboarding",    icon: BookOpen,      group: "Visão Geral" },
  { key: "solucao",     label: "Minha Solução", icon: Layers,        group: "Projeto" },
  { key: "checkpoints", label: "Checkpoints",   icon: CheckSquare,   group: "Projeto" },
  { key: "pendencias",  label: "Pendências",    icon: ClipboardList, group: "Projeto" },
  { key: "acessos",     label: "Acessos",       icon: Key,           group: "Projeto" },
  { key: "arquivos",    label: "Arquivos",      icon: FolderOpen,    group: "Projeto" },
  { key: "contrato",    label: "Contrato",      icon: FileText,      group: "Financeiro" },
  { key: "financeiro",  label: "Financeiro",    icon: DollarSign,    group: "Financeiro" },
  { key: "uso_ia",      label: "Uso de IA",     icon: Brain,         group: "Financeiro" },
  { key: "resultados",  label: "Resultados",    icon: BarChart2,     group: "Performance" },
  { key: "suporte",     label: "Suporte",       icon: MessageSquare, group: "Suporte" },
];
const TAB_GROUPS = ["Visão Geral","Projeto","Financeiro","Performance","Suporte"];

// ─── Status ───────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string,string> = {
  novo:"Novo", portal_criado:"Portal criado", link_enviado:"Aguardando acesso",
  onboarding_iniciado:"Onboarding", onboarding_concluido:"Onboarding concluído",
  em_implantacao:"Em implantação", go_live:"Go-live", ativo:"Ativo",
  pausado:"Pausado", encerrado:"Encerrado", em_validacao:"Em validação",
  aguardando_aprovacao:"Aguardando aprovação", coleta_informacoes:"Coletando informações",
};
const statusColor: Record<string,string> = {
  ativo:"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  go_live:"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  em_implantacao:"bg-blue-500/20 text-blue-400 border border-blue-500/30",
  onboarding_iniciado:"bg-blue-500/20 text-blue-400 border border-blue-500/30",
  pausado:"bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  encerrado:"bg-red-500/20 text-red-400 border border-red-500/30",
  pendente:"bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  enviado:"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  aberto:"bg-orange-500/20 text-orange-400 border border-orange-500/30",
  resolvido:"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  concluido:"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const brl = (v:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtDate = (d?:string|null) => { if (!d) return "—"; try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; } };

// ═══════════════════════════════════════════════════════════════════════════════
// MUSIC PLAYER
// ═══════════════════════════════════════════════════════════════════════════════
interface PlayerProps {
  playerRef: React.MutableRefObject<any>;
  ytReady: boolean; isPlaying: boolean; setIsPlaying:(v:boolean)=>void;
  selectedTrack: number; setSelectedTrack:(v:number)=>void;
  progress: number; compact?: boolean; C: typeof G.dark;
}

const MusicPlayer = ({ playerRef, ytReady, isPlaying, setIsPlaying, selectedTrack, setSelectedTrack, progress, compact=false, C }: PlayerProps) => {
  const t = TRACKS[selectedTrack];

  const play = (idx:number) => {
    setSelectedTrack(idx);
    if (playerRef.current && ytReady) {
      playerRef.current.loadVideoById(TRACKS[idx].id);
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };
  const togglePlay = () => {
    if (!playerRef.current || !ytReady) return;
    if (isPlaying) { playerRef.current.pauseVideo(); setIsPlaying(false); }
    else { playerRef.current.playVideo(); setIsPlaying(true); }
  };
  const stop = () => { try { playerRef.current?.stopVideo?.(); } catch {} setIsPlaying(false); };
  const prev = () => play((selectedTrack - 1 + TRACKS.length) % TRACKS.length);
  const next = () => play((selectedTrack + 1) % TRACKS.length);

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !ytReady) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dur = playerRef.current.getDuration?.() ?? 0;
    if (dur > 0) { playerRef.current.seekTo(pct * dur, true); }
  };

  const btnCls = `w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95`;

  if (compact) return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex items-center gap-1">
        <button onClick={prev} className={btnCls} style={{background:C.card,border:`1px solid ${C.border}`}}><SkipBack size={11} color={C.text}/></button>
        <button onClick={togglePlay} className={`${btnCls} w-9 h-9`} style={{background:`linear-gradient(135deg,${t.color},${G.primary})`}}>
          {isPlaying ? <Pause size={13} color="#fff"/> : <Play size={13} color="#fff"/>}
        </button>
        <button onClick={next} className={btnCls} style={{background:C.card,border:`1px solid ${C.border}`}}><SkipForward size={11} color={C.text}/></button>
        <button onClick={stop} className={btnCls} style={{background:C.card,border:`1px solid ${C.border}`}}><Square size={9} color={C.text}/></button>
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-xs font-semibold whitespace-nowrap hidden sm:block" style={{color:t.color}}>{t.emoji} {t.mood}</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden cursor-pointer" style={{background:C.border}} onClick={seekTo}>
          <div className="h-full rounded-full transition-all" style={{width:`${progress}%`,background:`linear-gradient(90deg,${t.color},${G.primary})`}}/>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{background:C.card,border:`1px solid ${C.border}`}}>
      <div className="flex items-center gap-2">
        <Music2 size={15} color={G.primary}/>
        <span className="text-sm font-bold" style={{color:C.text}}>Escolha sua trilha sonora</span>
      </div>
      <p className="text-xs" style={{color:C.muted}}>Selecione o mood que combina com você agora:</p>
      <div className="space-y-2">
        {TRACKS.map((tr,i) => (
          <button key={tr.id} onClick={() => play(i)}
            className="w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all"
            style={i===selectedTrack
              ? {background:`${tr.color}22`,border:`1.5px solid ${tr.color}`,boxShadow:`0 0 16px ${tr.color}33`}
              : {background:C.input,border:`1px solid ${C.border}`}}>
            <span className="text-xl flex-shrink-0 mt-0.5">{tr.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight" style={{color: i===selectedTrack ? tr.color : C.text}}>{tr.mood}</p>
              <p className="text-xs mt-0.5 truncate" style={{color:C.muted}}>{tr.song}</p>
            </div>
            {i===selectedTrack && isPlaying && (
              <span className="flex gap-0.5 items-end h-5 flex-shrink-0">
                {[3,5,4,6,3].map((h,j)=>(
                  <span key={j} className="w-0.5 rounded-full animate-bounce" style={{height:h*2.5,background:tr.color,animationDelay:`${j*.1}s`}}/>
                ))}
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Seekable progress bar */}
      <div className="h-2 rounded-full overflow-hidden cursor-pointer" style={{background:C.border}} onClick={seekTo} title="Clique para avançar">
        <div className="h-full rounded-full transition-all" style={{width:`${progress}%`,background:`linear-gradient(90deg,${t.color},${G.primary})`}}/>
      </div>
      <div className="flex items-center justify-center gap-3">
        <button onClick={prev} className={`${btnCls} w-9 h-9`} style={{background:C.input,border:`1px solid ${C.border}`}}><SkipBack size={16} color={C.text}/></button>
        <button onClick={togglePlay} className={`${btnCls} w-12 h-12 shadow-lg`} style={{background:`linear-gradient(135deg,${t.color},${G.primary})`}}>
          {isPlaying ? <Pause size={20} color="#fff"/> : <Play size={20} color="#fff"/>}
        </button>
        <button onClick={next} className={`${btnCls} w-9 h-9`} style={{background:C.input,border:`1px solid ${C.border}`}}><SkipForward size={16} color={C.text}/></button>
        <button onClick={stop} className={`${btnCls} w-9 h-9`} style={{background:C.input,border:`1px solid ${C.border}`}}><Square size={13} color={C.text}/></button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
type Screen = "loading"|"not_found"|"pin"|"onboarding"|"dashboard";

export default function ClientPortal() {
  const { slug } = useParams<{slug:string}>();

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("portal_theme") !== "light"; } catch { return true; }
  });
  const C = isDark ? G.dark : G.light;
  const toggleTheme = () => setIsDark((d) => { const n=!d; try{localStorage.setItem("portal_theme",n?"dark":"light");}catch{} return n; });

  // ── Core state ────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("loading");
  const [project, setProject] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [portal, setPortal] = useState<any>(null);
  const [isFirstAccess, setIsFirstAccess] = useState(false);

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [tokenUsage, setTokenUsage] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [support, setSupport] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);

  const [clientTab, setClientTab] = useState("inicio");
  const [sidebarOpen, setSidebarOpen] = useState(false); // collapsed on mobile by default
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [supportTitle, setSupportTitle] = useState("");
  const [supportDesc, setSupportDesc] = useState("");
  const [supportSending, setSupportSending] = useState(false);

  const [pendingSubmitId, setPendingSubmitId] = useState<string|null>(null);
  const [pendingNote, setPendingNote] = useState("");
  const [pendingSending, setPendingSending] = useState(false);

  const [expandedCheckpoint, setExpandedCheckpoint] = useState<string|null>(null);

  const [onboardingStep, setOnboardingStep] = useState(1);
  const TOTAL_STEPS = 7;

  const [npsScores, setNpsScores] = useState({onboarding:0,projeto:0,solicitai:0});
  const [npsFeedback, setNpsFeedback] = useState("");
  const [npsSubmitted, setNpsSubmitted] = useState(false);
  const [npsSending, setNpsSending] = useState(false);

  const playerRef = useRef<any>(null);
  const progressRef = useRef<number|null>(null);
  const [ytReady, setYtReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [progress, setProgress] = useState(0);

  // open sidebar on desktop automatically
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setSidebarOpen(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Load portal ────────────────────────────────────────────────────────────
  useEffect(() => { if (!slug){setScreen("not_found");return;} loadPortal(); }, [slug]); // eslint-disable-line

  const loadPortal = async () => {
    setScreen("loading");
    const {data:proj,error} = await (supabase as any).from("hub_projects").select("*,hub_clients(*)").eq("slug",slug).maybeSingle();
    if (error||!proj){setScreen("not_found");return;}
    setProject(proj); setClient(proj.hub_clients??null);
    const {data:por} = await (supabase as any).from("hub_portals").select("*").eq("project_id",proj.id).maybeSingle();
    setPortal(por??null);
    const saved = localStorage.getItem(`portal_session_${slug}`);
    if (saved && por && saved===por.pin) {
      await loadDashboardData(proj.id);
      await (supabase as any).from("hub_portals").update({last_access_at:new Date().toISOString()}).eq("id",por.id);
      setScreen(por.onboarding_done?"dashboard":"onboarding"); return;
    }
    setIsFirstAccess(!por?.first_access_at);
    setScreen("pin");
  };

  const loadDashboardData = async (pid:string) => {
    const db = supabase as any;
    const [{data:chk},{data:pnd},{data:fls},{data:tok},{data:res},{data:sup},{data:upd}] = await Promise.all([
      db.from("hub_checkpoints").select("*").eq("project_id",pid).order("sort_order"),
      db.from("hub_pending").select("*").eq("project_id",pid),
      db.from("hub_files").select("*").eq("project_id",pid),
      db.from("hub_token_usage").select("*").eq("project_id",pid),
      db.from("hub_results").select("*").eq("project_id",pid),
      db.from("hub_support").select("*").eq("project_id",pid).order("created_at",{ascending:false}),
      db.from("hub_updates").select("*").eq("project_id",pid).eq("visible_to_client",true).order("created_at",{ascending:false}).limit(10),
    ]);
    setCheckpoints(chk??[]); setPending(pnd??[]); setFiles(fls??[]);
    setTokenUsage(tok??[]); setResults(res??[]); setSupport(sup??[]); setUpdates(upd??[]);
  };

  // ── YouTube ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen!=="onboarding"&&screen!=="dashboard") return;
    if (!document.getElementById("yt-api-script")) {
      const s = document.createElement("script"); s.id="yt-api-script"; s.src="https://www.youtube.com/iframe_api"; document.head.appendChild(s);
    }
    (window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player("yt-player-hidden",{
        height:"1",width:"1",videoId:TRACKS[0].id,
        playerVars:{autoplay:0,controls:0,playsinline:1},
        events:{onReady:()=>setYtReady(true)},
      });
    };
    if ((window as any).YT?.Player && !playerRef.current) (window as any).onYouTubeIframeAPIReady();
  }, [screen]);

  useEffect(() => {
    if (isPlaying&&ytReady&&playerRef.current) {
      progressRef.current = window.setInterval(()=>{
        try { const c=playerRef.current.getCurrentTime()??0,d=playerRef.current.getDuration()??1; setProgress(d>0?(c/d)*100:0); } catch {}
      },500);
    } else {
      if (progressRef.current){clearInterval(progressRef.current);progressRef.current=null;}
      if (!isPlaying) setProgress(0);
    }
    return ()=>{if(progressRef.current)clearInterval(progressRef.current);};
  }, [isPlaying,ytReady]);

  // ── PIN ────────────────────────────────────────────────────────────────────
  const handlePin = async (e:React.FormEvent) => {
    e.preventDefault(); setPinError("");
    if (!portal){setPinError("Portal não encontrado.");return;}
    if (pinInput!==portal.pin){setPinError("PIN incorreto. Verifique com a equipe SolicitAí.");return;}
    const payload:Record<string,string>={last_access_at:new Date().toISOString()};
    if (isFirstAccess) payload.first_access_at=new Date().toISOString();
    await (supabase as any).from("hub_portals").update(payload).eq("id",portal.id);
    localStorage.setItem(`portal_session_${slug}`,pinInput);
    await loadDashboardData(project.id);
    setScreen(portal.onboarding_done?"dashboard":"onboarding");
  };

  // ── Onboarding ─────────────────────────────────────────────────────────────
  const advanceOnboarding = async (next:number) => {
    if (next>onboardingStep&&onboardingStep===1&&project) {
      await (supabase as any).from("hub_projects").update({status:"onboarding_iniciado"}).eq("id",project.id);
      setProject((p:any)=>({...p,status:"onboarding_iniciado"}));
    }
    setOnboardingStep(next);
  };

  const completeOnboarding = async () => {
    if (portal) {
      await (supabase as any).from("hub_portals").update({onboarding_done:true,onboarding_done_at:new Date().toISOString()}).eq("id",portal.id);
      setPortal((p:any)=>({...p,onboarding_done:true}));
    }
    if (project) await (supabase as any).from("hub_projects").update({status:"onboarding_concluido"}).eq("id",project.id);
    try{playerRef.current?.stopVideo?.();}catch{}
    setIsPlaying(false);
    setScreen("dashboard");
  };

  // ── NPS ────────────────────────────────────────────────────────────────────
  const submitNPS = async () => {
    if (npsSubmitted||npsSending) return;
    setNpsSending(true);
    const avg=Math.round((npsScores.onboarding+npsScores.projeto+npsScores.solicitai)/3);
    await (supabase as any).from("hub_portals").update({nps_onboarding:npsScores.onboarding,nps_projeto:npsScores.projeto,nps_solicitai:npsScores.solicitai,nps_feedback:npsFeedback,nps_submitted_at:new Date().toISOString()}).eq("id",portal?.id);
    if (project?.id) await (supabase as any).from("hub_projects").update({nps_score:avg}).eq("id",project.id);
    setNpsSubmitted(true); setNpsSending(false);
  };

  // ── Support ────────────────────────────────────────────────────────────────
  const submitSupport = async (e:React.FormEvent) => {
    e.preventDefault(); if (!project||!supportTitle.trim()) return;
    setSupportSending(true);
    const {data} = await (supabase as any).from("hub_support").insert({project_id:project.id,title:supportTitle,description:supportDesc,status:"aberto",source:"cliente"}).select().single();
    if (data) setSupport(p=>[data,...p]);
    setSupportTitle(""); setSupportDesc(""); setSupportSending(false);
  };

  // ── Pending send ───────────────────────────────────────────────────────────
  const sendPending = async (item:any) => {
    if (!item||pendingSending) return;
    setPendingSending(true);
    const now=new Date().toISOString();
    await (supabase as any).from("hub_pending").update({status:"enviado",resolved_at:now,client_note:pendingNote||null}).eq("id",item.id);
    setPending(p=>p.map(x=>x.id===item.id?{...x,status:"enviado",resolved_at:now,client_note:pendingNote}:x));
    try { await fetch(`${(supabase as any).supabaseUrl}/functions/v1/notify-pending`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${(supabase as any).supabaseKey}`},body:JSON.stringify({project_name:project?.name,client_name:client?.name,pending_title:item.title,note:pendingNote,to:"contato@solicitai.com.br"})}); } catch {}
    setPendingSubmitId(null); setPendingNote(""); setPendingSending(false);
  };

  const ed=(k:string)=>{const d=project?.extracted_data;if(!d||typeof d!=="object")return"";return(d as Record<string,unknown>)[k] as string??"";};

  // ── Shared UI helpers ──────────────────────────────────────────────────────
  const card = (extra="") => ({ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, ...((extra)?{}:{}) });
  const Chip = ({s}:{s?:string|null}) => { if(!s)return null; const cls=statusColor[s.toLowerCase()]??"bg-white/10 text-gray-400"; return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{STATUS_LABELS[s]??s}</span>; };
  const ThemeBtn = () => (
    <button onClick={toggleTheme} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{background:C.card,border:`1px solid ${C.border}`}}>
      {isDark ? <Sun size={14} color={G.primary}/> : <Moon size={14} color={G.primary}/>}
    </button>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen==="loading") return (
    <div className="min-h-screen flex items-center justify-center" style={{background:C.bgGrad}}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:G.primary,borderTopColor:"transparent"}}/>
        <p className="text-sm" style={{color:C.muted}}>Carregando portal…</p>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // NOT FOUND
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen==="not_found") return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:C.bgGrad}}>
      <div className="text-center max-w-sm">
        <img src={logo} alt="SolicitAí" className="h-8 w-auto mx-auto mb-8"/>
        <div className="rounded-2xl p-8" style={card()}>
          <AlertCircle className="mx-auto text-red-400 mb-4" size={40}/>
          <h1 className="text-xl font-bold mb-2" style={{color:C.text}}>Portal não encontrado</h1>
          <p className="text-sm" style={{color:C.muted}}>O link não corresponde a nenhum projeto ativo. Verifique com sua equipe SolicitAí.</p>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PIN
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen==="pin") return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{background:C.bgGrad}}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-10">
          <img src={logo} alt="SolicitAí" className="h-7 w-auto"/>
          <ThemeBtn/>
        </div>
        <div className="rounded-2xl p-8" style={card()}>
          <h1 className="text-2xl font-black mb-1" style={{color:C.text}}>
            {isFirstAccess?"Bem-vindo ao seu portal":"Bem-vindo de volta"}
          </h1>
          <p className="text-sm mb-6" style={{color:C.muted}}>
            {isFirstAccess
              ? <>Insira o PIN recebido da equipe <strong style={{color:C.text}}>SolicitAí</strong> para acessar <strong style={{color:C.text}}>{project?.name}</strong>.</>
              : <>Projeto <strong style={{color:C.text}}>{project?.name}</strong></>}
          </p>
          <form onSubmit={handlePin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-2" style={{color:C.muted}}>
                {isFirstAccess?"PIN recebido (6 dígitos)":"Seu PIN (6 dígitos)"}
              </label>
              <input
                className="w-full rounded-xl px-4 py-3.5 text-center text-2xl tracking-[.5em] font-bold focus:outline-none transition-all"
                style={{background:C.input,border:`1.5px solid ${C.inputB}`,color:C.text}}
                type="password" placeholder="••••••" maxLength={6}
                value={pinInput} onChange={e=>setPinInput(e.target.value.replace(/\D/g,""))} autoFocus required/>
            </div>
            {pinError && <p className="text-red-400 text-xs flex items-center gap-1.5"><AlertCircle size={13}/>{pinError}</p>}
            <button type="submit" className="w-full py-3.5 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-98" style={{background:`linear-gradient(135deg,${G.primary},${G.glow})`,color:"#fff",boxShadow:`0 8px 24px ${G.primary}40`}}>
              Entrar no portal
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ONBOARDING
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen==="onboarding") {
    const clientPending = pending.filter(p=>p.owner==="cliente");

    const renderStep = () => {
      switch (onboardingStep) {
        case 1: return (
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:G.primary}}>Bem-vindo(a) à sua jornada</p>
                <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3" style={{color:C.text}}>
                  Seja bem-vindo(a) à sua{" "}
                  <span style={{background:`linear-gradient(135deg,${G.primary},${G.glow})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                    jornada imersiva
                  </span>{" "}de onboarding,
                </h1>
                <h2 className="text-2xl sm:text-3xl font-black" style={{color:G.glow}}>
                  {client?.responsible??client?.name??project?.name??"cliente"}.
                </h2>
              </div>
              <div className="rounded-2xl p-5" style={{...card(),borderLeft:`4px solid ${G.primary}`}}>
                <p className="text-sm leading-relaxed" style={{color:C.muted}}>
                  Este processo de onboarding é <strong style={{color:C.text}}>imersivo e personalizado</strong>. Por gentileza, para aumentar sua experiência, escolha uma <strong style={{color:C.text}}>trilha sonora</strong> para acompanhá-lo(a) durante este processo.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["Projeto",project?.name],["Status",<Chip key="s" s={project?.status}/>],["Go-live",fmtDate(project?.go_live_date)],["Progresso",`${project?.progress_pct??0}%`]].map(([l,v],i)=>(
                  <div key={i} className="rounded-xl p-4" style={card()}>
                    <p className="text-xs mb-1" style={{color:C.muted}}>{l}</p>
                    <div className="font-bold text-sm" style={{color:C.text}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <MusicPlayer playerRef={playerRef} ytReady={ytReady} isPlaying={isPlaying} setIsPlaying={setIsPlaying} selectedTrack={selectedTrack} setSelectedTrack={setSelectedTrack} progress={progress} C={C}/>
          </div>
        );

        case 2: return (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold" style={{background:`${G.primary}22`,border:`1px solid ${G.primary}44`,color:G.primary}}>
                <Sparkles size={14}/> Chegou a hora!
              </div>
              <h2 className="text-3xl sm:text-4xl font-black" style={{color:C.text}}>Agora sim! Vamos começar!</h2>
              <p className="text-sm max-w-lg mx-auto" style={{color:C.muted}}>Entendemos seu negócio e mapeamos o problema com precisão. Veja o diagnóstico:</p>
            </div>
            {ed("problema")?(
              <div className="rounded-2xl p-6" style={{...card(),borderLeft:"4px solid #f59e0b"}}>
                <div className="flex items-center gap-2 mb-3"><AlertCircle className="text-amber-400" size={16}/><span className="text-xs font-bold uppercase tracking-wider text-amber-400">Problema identificado</span></div>
                <p className="text-sm leading-relaxed" style={{color:C.text}}>{ed("problema")}</p>
              </div>
            ):<div className="rounded-2xl p-6 text-sm" style={{...card(),color:C.muted}}>Diagnóstico disponível no dashboard.</div>}
            {ed("objetivo")&&(
              <div className="rounded-2xl p-6" style={{...card(),borderLeft:`4px solid ${G.primary}`}}>
                <div className="flex items-center gap-2 mb-3"><TrendingUp size={16} color={G.primary}/><span className="text-xs font-bold uppercase tracking-wider" style={{color:G.primary}}>Objetivo</span></div>
                <p className="text-sm leading-relaxed" style={{color:C.text}}>{ed("objetivo")}</p>
              </div>
            )}
          </div>
        );

        case 3: return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${G.primary}22`}}><Zap size={20} color={G.primary}/></div>
              <div>
                <h2 className="text-3xl font-black" style={{color:C.text}}>A solução contratada</h2>
                <p className="text-sm" style={{color:C.muted}}>O que desenvolvemos especialmente para você</p>
              </div>
            </div>
            {ed("solucao")&&<div className="rounded-2xl p-6" style={card()}><p className="text-xs uppercase tracking-wider mb-3" style={{color:C.muted}}>Solução</p><p className="text-sm leading-relaxed" style={{color:C.text}}>{ed("solucao")}</p></div>}
            {ed("escopo")&&(
              <div className="rounded-2xl p-6" style={card()}>
                <p className="text-xs uppercase tracking-wider mb-3" style={{color:C.muted}}>Escopo</p>
                <ul className="space-y-2">
                  {ed("escopo").split("\n").filter(Boolean).map((line,i)=>(
                    <li key={i} className="flex items-start gap-3 text-sm" style={{color:C.text}}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{background:`${G.primary}22`}}><ChevronRight size={11} color={G.primary}/></div>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ed("integracoes")&&(
              <div className="rounded-2xl p-6" style={card()}>
                <p className="text-xs uppercase tracking-wider mb-3" style={{color:C.muted}}>Integrações</p>
                <div className="flex flex-wrap gap-2">
                  {ed("integracoes").split(/[,\n]/).filter(Boolean).map((item,i)=>(
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold" style={{background:`${G.primary}18`,border:`1px solid ${G.primary}33`,color:G.glow}}>{item.trim()}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

        case 4: {
          const items=checkpoints.length>0?checkpoints:[{name:"Kick-off",description:"Reunião de abertura"},{name:"Levantamento",description:"Coleta de informações e acessos"},{name:"Configuração",description:"Implementação da solução"},{name:"Validação",description:"Testes e aprovação"},{name:"Go-live",description:"Lançamento em produção"}];
          return (
            <div className="space-y-6">
              <div><h2 className="text-3xl font-black" style={{color:C.text}}>Jornada de implantação</h2><p className="text-sm" style={{color:C.muted}}>Cada etapa do seu projeto</p></div>
              <div className="relative">
                <div className="absolute left-5 top-5 bottom-5 w-px" style={{background:`linear-gradient(to bottom,${G.primary},${G.primary}22)`}}/>
                <div className="space-y-4">
                  {items.map((cp:any,i:number)=>{
                    const done=cp.status==="concluido"||cp.completed_at;
                    return (
                      <div key={cp.id??i} className="flex gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-sm font-bold`} style={{background:done?G.primary:C.input,border:`1px solid ${done?G.primary:C.border}`,color:done?"#fff":C.muted,boxShadow:done?`0 0 12px ${G.primary}40`:"none"}}>
                          {done?<CheckCircle2 size={16}/>:i+1}
                        </div>
                        <div className="flex-1 rounded-xl p-4" style={card()}>
                          <div className="flex items-start justify-between gap-2">
                            <div><p className="font-bold text-sm" style={{color:C.text}}>{cp.name}</p>{cp.description&&<p className="text-xs mt-0.5" style={{color:C.muted}}>{cp.description}</p>}</div>
                            <div className="flex items-center gap-2 flex-shrink-0">{cp.due_date&&<span className="text-xs" style={{color:C.muted}}>{fmtDate(cp.due_date)}</span>}{cp.status&&<Chip s={cp.status}/>}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        case 5: return (
          <div className="space-y-6">
            <div><h2 className="text-3xl font-black" style={{color:C.text}}>O que precisamos de você</h2><p className="text-sm" style={{color:C.muted}}>Quanto mais rápido, mais fluida será a implantação</p></div>
            <div className="space-y-3">
              {clientPending.length>0?clientPending.map((p:any)=>(
                <div key={p.id} className="rounded-xl p-4 flex items-center justify-between gap-3" style={card()}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:p.status==="enviado"?G.primary:"#f59e0b"}}/>
                    <div><p className="font-semibold text-sm" style={{color:C.text}}>{p.title}</p>{p.description&&<p className="text-xs" style={{color:C.muted}}>{p.description}</p>}</div>
                  </div>
                  <Chip s={p.status}/>
                </div>
              )):[["Envio de acessos e credenciais"],["Validação do fluxo inicial"],["Aprovação do contrato"]].map(([item],i)=>(
                <div key={i} className="rounded-xl p-4 flex items-center gap-3" style={card()}>
                  <div className="w-5 h-5 rounded border flex-shrink-0" style={{borderColor:C.border}}/>
                  <p className="text-sm" style={{color:C.muted}}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        );

        case 6: return (
          <div className="space-y-6">
            <div><h2 className="text-3xl font-black" style={{color:C.text}}>Seu dashboard personalizado</h2><p className="text-sm" style={{color:C.muted}}>Tudo que você precisa, organizado e acessível</p></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TABS.map(tab=>{const Icon=tab.icon;return(
                <div key={tab.key} className="rounded-xl p-4 flex items-start gap-3 transition-all" style={card()}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:`${G.primary}18`}}><Icon size={15} color={G.primary}/></div>
                  <div><p className="text-sm font-bold" style={{color:C.text}}>{tab.label}</p><p className="text-xs" style={{color:C.muted}}>{tab.group}</p></div>
                </div>
              );})}
            </div>
          </div>
        );

        case 7: return (
          <div className="space-y-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:`${G.primary}22`,border:`1px solid ${G.primary}44`,animation:"pulse 2s infinite"}}>
                <Star size={36} color={G.primary}/>
              </div>
              <h2 className="text-3xl font-black mb-2" style={{color:C.text}}>Quase lá! Uma última coisa…</h2>
              <p className="text-sm" style={{color:C.muted}}>Como foi sua experiência? Sua opinião é muito importante.</p>
            </div>
            {!npsSubmitted?(
              <div className="space-y-4">
                {[{key:"onboarding",label:"Onboarding",desc:"Experiência de boas-vindas"},{key:"projeto",label:"Projeto",desc:"Solução e escopo entregues"},{key:"solicitai",label:"SolicitAí",desc:"Atendimento e equipe"}].map(item=>(
                  <div key={item.key} className="rounded-2xl p-5" style={card()}>
                    <div className="flex items-center justify-between mb-3">
                      <div><p className="font-bold" style={{color:C.text}}>{item.label}</p><p className="text-xs" style={{color:C.muted}}>{item.desc}</p></div>
                      <span className="text-2xl font-black" style={{color:G.primary}}>{npsScores[item.key as keyof typeof npsScores]}</span>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({length:11},(_,i)=>{const score=npsScores[item.key as keyof typeof npsScores];return(
                        <button key={i} onClick={()=>setNpsScores(s=>({...s,[item.key]:i}))}
                          className="flex-1 h-8 rounded-lg text-xs font-bold transition-all"
                          style={score===i?{background:i>=9?G.primary:i>=7?"#f59e0b":"#ef4444",color:"#fff",boxShadow:`0 0 8px ${i>=9?G.primary:i>=7?"#f59e0b":"#ef4444"}40`}:{background:C.input,border:`1px solid ${C.border}`,color:C.muted}}>
                          {i}
                        </button>
                      );})}
                    </div>
                    <div className="flex justify-between text-[10px] mt-1 px-1" style={{color:C.muted}}><span>Ruim</span><span>Excelente</span></div>
                  </div>
                ))}
                <div className="rounded-2xl p-5" style={card()}>
                  <p className="font-bold mb-2" style={{color:C.text}}>Comentário livre</p>
                  <textarea className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-all" rows={3} placeholder="Algum comentário, sugestão ou elogio?"
                    style={{background:C.input,border:`1.5px solid ${C.inputB}`,color:C.text}} value={npsFeedback} onChange={e=>setNpsFeedback(e.target.value)}/>
                </div>
                <button onClick={submitNPS} disabled={npsSending} className="w-full py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 disabled:opacity-60" style={{background:`linear-gradient(135deg,${G.primary},${G.glow})`,color:"#fff"}}>
                  {npsSending?"Enviando…":"Enviar avaliação"}
                </button>
              </div>
            ):(
              <div className="rounded-2xl p-8 text-center" style={card()}>
                <CheckCircle2 className="mx-auto mb-3" size={40} color={G.primary}/><p className="font-bold text-lg" style={{color:C.text}}>Obrigado pelo feedback!</p><p className="text-sm mt-1" style={{color:C.muted}}>Sua avaliação foi registrada.</p>
              </div>
            )}
            <div className="text-center">
              <button onClick={completeOnboarding} className="inline-flex items-center gap-2 font-black px-10 py-4 rounded-xl text-base transition-all hover:scale-105 hover:opacity-90" style={{background:`linear-gradient(135deg,${G.primary},${G.glow})`,color:"#fff",boxShadow:`0 12px 32px ${G.primary}40`}}>
                Acessar meu dashboard <ChevronRight size={20}/>
              </button>
            </div>
          </div>
        );

        default: return null;
      }
    };

    return (
      <div className="min-h-screen pb-24" style={{background:C.bgGrad}}>
        <div id="yt-player-hidden" style={{position:"absolute",left:"-9999px",top:0,width:1,height:1}}/>
        {/* Header */}
        <div className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{background:C.header,borderColor:C.border}}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <img src={logo} alt="SolicitAí" className="h-7 w-auto"/>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{color:C.muted}}>Etapa {onboardingStep} de {TOTAL_STEPS}</span>
                <ThemeBtn/>
              </div>
            </div>
            <div className="flex gap-1">
              {Array.from({length:TOTAL_STEPS},(_,i)=>(
                <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500" style={{background:i<onboardingStep?`linear-gradient(90deg,${G.primary},${G.glow})`:C.border}}/>
              ))}
            </div>
          </div>
        </div>
        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {renderStep()}
          {onboardingStep<TOTAL_STEPS&&(
            <div className="flex justify-between mt-10">
              {onboardingStep>1?(
                <button onClick={()=>advanceOnboarding(onboardingStep-1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80" style={{background:C.card,border:`1px solid ${C.border}`,color:C.text}}>
                  <ChevronLeft size={16}/> Anterior
                </button>
              ):<div/>}
              <button onClick={()=>advanceOnboarding(onboardingStep+1)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90" style={{background:`linear-gradient(135deg,${G.primary},${G.glow})`,color:"#fff"}}>
                Próximo <ChevronRight size={16}/>
              </button>
            </div>
          )}
          {onboardingStep===TOTAL_STEPS&&onboardingStep>1&&(
            <div className="flex justify-start mt-6">
              <button onClick={()=>advanceOnboarding(onboardingStep-1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80" style={{background:C.card,border:`1px solid ${C.border}`,color:C.text}}>
                <ChevronLeft size={16}/> Anterior
              </button>
            </div>
          )}
        </div>
        {/* Footer mini-player (steps 2+) */}
        {onboardingStep>1&&(
          <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t px-4 py-3" style={{background:C.header,borderColor:C.border}}>
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <Music2 size={12} color={C.muted} className="flex-shrink-0"/>
              <MusicPlayer playerRef={playerRef} ytReady={ytReady} isPlaying={isPlaying} setIsPlaying={setIsPlaying} selectedTrack={selectedTrack} setSelectedTrack={setSelectedTrack} progress={progress} compact C={C}/>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  const clientPendingCount = pending.filter(p=>p.owner==="cliente"&&p.status==="pendente").length;
  const nextCp = checkpoints.filter(c=>c.status!=="concluido"&&c.due_date).sort((a,b)=>new Date(a.due_date).getTime()-new Date(b.due_date).getTime())[0];
  const tokenTotals = tokenUsage.reduce((acc,t)=>({input:acc.input+(t.input_tokens??0),output:acc.output+(t.output_tokens??0),cost:acc.cost+(t.cost_usd??0)}),{input:0,output:0,cost:0});

  const renderTab = () => {
    switch (clientTab) {
      case "inicio": return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[{l:"Progresso",v:`${project?.progress_pct??0}%`,s:"do projeto",c:G.glow},{l:"Próximo marco",v:nextCp?fmtDate(nextCp.due_date):"—",s:nextCp?.name??"sem data",c:C.text},{l:"Pendências",v:String(clientPendingCount),s:"aguardando você",c:clientPendingCount>0?"#f59e0b":G.primary},{l:"Go-live",v:fmtDate(project?.go_live_date),s:"previsão",c:C.text}].map(kpi=>(
              <div key={kpi.l} className="rounded-2xl p-5" style={card()}>
                <p className="text-xs mb-1" style={{color:C.muted}}>{kpi.l}</p>
                <p className="text-2xl font-black" style={{color:kpi.c}}>{kpi.v}</p>
                <p className="text-xs mt-0.5" style={{color:C.muted}}>{kpi.s}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-5" style={card()}>
            <div className="flex justify-between text-sm mb-3"><span style={{color:C.muted}}>Progresso geral</span><span className="font-black" style={{color:G.glow}}>{project?.progress_pct??0}%</span></div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{background:C.border}}>
              <div className="h-full rounded-full transition-all duration-700" style={{width:`${project?.progress_pct??0}%`,background:`linear-gradient(90deg,${G.primary},${G.glow})`}}/>
            </div>
          </div>
          <div className="rounded-2xl p-5" style={card()}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{color:C.muted}}>Atualizações recentes</h3>
            {updates.length===0?<p className="text-sm" style={{color:C.muted}}>Nenhuma atualização ainda.</p>:(
              <div className="space-y-3">
                {updates.map((u:any)=>(
                  <div key={u.id} className="flex gap-3 text-sm pb-3 border-b last:border-0 last:pb-0" style={{borderColor:C.border}}>
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{background:G.primary}}/>
                    <div><p style={{color:C.text}}>{u.message}</p><p className="text-xs mt-0.5" style={{color:C.muted}}>{fmtDate(u.created_at)}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );

      case "onboarding": return (
        <div className="rounded-2xl p-6" style={card()}>
          <h3 className="font-bold text-lg mb-2" style={{color:C.text}}>Rever experiência de onboarding</h3>
          <p className="text-sm mb-4" style={{color:C.muted}}>Reviva os {TOTAL_STEPS} passos da experiência imersiva de boas-vindas.</p>
          {portal?.onboarding_done_at&&<p className="text-xs mb-4" style={{color:C.muted}}>Concluído em: <strong style={{color:C.text}}>{fmtDate(portal.onboarding_done_at)}</strong></p>}
          <button onClick={()=>{setOnboardingStep(1);setScreen("onboarding");}} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90" style={{background:`linear-gradient(135deg,${G.primary},${G.glow})`,color:"#fff"}}>
            <RefreshCw size={14}/> Rever onboarding
          </button>
        </div>
      );

      case "solucao": return (
        <div className="space-y-4">
          {[{k:"solucao",l:"Solução"},{k:"escopo",l:"Escopo"},{k:"integracoes",l:"Integrações"},{k:"entregaveis",l:"Entregáveis"}].map(({k,l})=>ed(k)?(
            <div key={k} className="rounded-2xl p-5" style={card()}>
              <p className="text-xs uppercase tracking-wider mb-3" style={{color:C.muted}}>{l}</p>
              <p className="text-sm leading-relaxed" style={{color:C.text}}>{ed(k)}</p>
            </div>
          ):null)}
          <div className="rounded-2xl p-5" style={card()}>
            <p className="text-xs uppercase tracking-wider mb-3" style={{color:C.muted}}>Dados contratuais</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Período",`${project?.contract_period_months??"—"} meses`],["Início",fmtDate(project?.start_date)],["Go-live",fmtDate(project?.go_live_date)],["Status",<Chip key="s" s={project?.status}/>]].map(([l,v],i)=>(
                <div key={i}><p className="text-xs mb-0.5" style={{color:C.muted}}>{l}</p><div className="font-bold" style={{color:C.text}}>{v}</div></div>
              ))}
            </div>
          </div>
        </div>
      );

      case "checkpoints": return (
        <div className="space-y-3">
          {checkpoints.length===0?<div className="rounded-2xl p-6 text-sm" style={{...card(),color:C.muted}}>Nenhum checkpoint cadastrado.</div>:checkpoints.map((cp:any)=>{
            const done=cp.status==="concluido"||cp.completed_at;
            const overdue=cp.due_date&&new Date(cp.due_date)<new Date()&&!done;
            const open=expandedCheckpoint===cp.id;
            return (
              <div key={cp.id} className="rounded-2xl overflow-hidden" style={{...card(),border:`1px solid ${done?G.primary+"44":overdue?"#f59e0b44":C.border}`}}>
                <button className="w-full flex items-center gap-4 p-4 text-left transition-all" style={{background:"transparent"}} onClick={()=>setExpandedCheckpoint(open?null:cp.id)}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{background:done?G.primary:overdue?"#f59e0b22":C.input,border:`1px solid ${done?G.primary:overdue?"#f59e0b":C.border}`,color:done?"#fff":overdue?"#f59e0b":C.muted,boxShadow:done?`0 0 10px ${G.primary}40`:"none"}}>
                    {done?<CheckCircle2 size={14}/>:overdue?<AlertTriangle size={12}/>:<Circle size={14}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{color:C.text}}>{cp.name}</p>
                    <p className="text-xs" style={{color:C.muted}}>{done?`Concluído em ${fmtDate(cp.completed_at)}`:cp.due_date?`Prazo: ${fmtDate(cp.due_date)}`:"Sem data"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0"><Chip s={cp.status}/>{open?<ChevronUp size={15} color={C.muted}/>:<ChevronDown size={15} color={C.muted}/>}</div>
                </button>
                {open&&(
                  <div className="px-4 pb-4 space-y-3" style={{borderTop:`1px solid ${C.border}`}}>
                    {cp.description&&<p className="text-sm pt-3 leading-relaxed" style={{color:C.muted}}>{cp.description}</p>}
                    <div className="grid grid-cols-3 gap-3">
                      {[["Responsável",cp.responsible??"—"],["Prazo",fmtDate(cp.due_date)],["Conclusão",fmtDate(cp.completed_at)]].map(([l,v])=>(
                        <div key={String(l)} className="rounded-xl p-3" style={{background:C.input}}>
                          <p className="text-xs mb-0.5" style={{color:C.muted}}>{l}</p>
                          <p className="text-sm font-bold" style={{color:C.text}}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );

      case "pendencias": {
        const cli=pending.filter(p=>p.owner==="cliente");
        const team=pending.filter(p=>p.owner!=="cliente");
        const submItem=cli.find(p=>p.id===pendingSubmitId);
        return (
          <div className="space-y-6">
            {pendingSubmitId&&submItem&&(
              <div className="rounded-2xl p-6" style={{...card(),border:`1px solid ${G.primary}44`}}>
                <h3 className="font-bold mb-1" style={{color:C.text}}>Enviar pendência</h3>
                <p className="text-sm mb-4" style={{color:C.muted}}>Pendência: <strong style={{color:C.text}}>{submItem.title}</strong></p>
                <textarea className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none mb-3" rows={3} placeholder="Nota ou observação (opcional)…"
                  style={{background:C.input,border:`1.5px solid ${C.inputB}`,color:C.text}} value={pendingNote} onChange={e=>setPendingNote(e.target.value)}/>
                <div className="flex gap-2">
                  <button onClick={()=>sendPending(submItem)} disabled={pendingSending} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 transition-all hover:opacity-90" style={{background:`linear-gradient(135deg,${G.primary},${G.glow})`,color:"#fff"}}>
                    <Send size={14}/>{pendingSending?"Enviando…":"Confirmar envio"}
                  </button>
                  <button onClick={()=>{setPendingSubmitId(null);setPendingNote("");}} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80" style={{background:C.card,border:`1px solid ${C.border}`,color:C.text}}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:C.muted}}>Suas pendências</h3>
              {cli.length===0?<div className="rounded-2xl p-5 text-sm" style={{...card(),color:C.muted}}>Nenhuma pendência para você.</div>:(
                <div className="space-y-3">
                  {cli.map((p:any)=>(
                    <div key={p.id} className="rounded-2xl p-5" style={card()}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold" style={{color:C.text}}>{p.title}</p>
                          {p.description&&<p className="text-sm mt-1" style={{color:C.muted}}>{p.description}</p>}
                          {p.client_note&&<p className="text-xs mt-1.5 italic" style={{color:G.glow}}>"{p.client_note}"</p>}
                          {p.due_date&&<p className="text-xs mt-1.5 flex items-center gap-1" style={{color:new Date(p.due_date)<new Date()&&p.status==="pendente"?"#ef4444":C.muted}}><Clock size={10}/> Prazo: {fmtDate(p.due_date)}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Chip s={p.status}/>
                          {p.status==="pendente"&&<button onClick={()=>setPendingSubmitId(p.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold transition-all hover:opacity-80" style={{background:`${G.primary}22`,color:G.primary}}><Send size={11}/> Enviar</button>}
                        </div>
                      </div>
                      {p.resolved_at&&<p className="text-xs mt-2 pt-2" style={{borderTop:`1px solid ${C.border}`,color:C.muted}}>Enviado em: {fmtDate(p.resolved_at)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:C.muted}}>Pendências da SolicitAí</h3>
              {team.length===0?<div className="rounded-2xl p-5 text-sm" style={{...card(),color:C.muted}}>Nenhuma pendência interna.</div>:(
                <div className="space-y-3">
                  {team.map((p:any)=>(
                    <div key={p.id} className="rounded-2xl p-5 flex items-start justify-between gap-3" style={card()}>
                      <div><p className="font-bold" style={{color:C.text}}>{p.title}</p>{p.description&&<p className="text-sm mt-1" style={{color:C.muted}}>{p.description}</p>}</div>
                      <Chip s={p.status}/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      case "acessos": {const af=files.filter(f=>f.category==="acesso");return(<div className="space-y-3">{af.length===0?<div className="rounded-2xl p-6 text-sm" style={{...card(),color:C.muted}}>Nenhum acesso entregue ainda.</div>:af.map((f:any)=>(
        <div key={f.id} className="rounded-2xl p-4 flex items-center justify-between" style={card()}>
          <div className="flex items-center gap-3"><Key size={16} color={G.primary}/><p className="text-sm font-bold" style={{color:C.text}}>{f.name}</p></div>
          <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold hover:underline" style={{color:G.primary}}>Acessar <ExternalLink size={11}/></a>
        </div>
      ))}</div>);}

      case "arquivos": return (<div className="grid sm:grid-cols-2 gap-3">{files.length===0?<div className="rounded-2xl p-6 text-sm sm:col-span-2" style={{...card(),color:C.muted}}>Nenhum arquivo disponível.</div>:files.map((f:any)=>(<div key={f.id} className="rounded-2xl p-4" style={card()}><div className="flex items-start justify-between gap-2 mb-2"><p className="text-sm font-bold" style={{color:C.text}}>{f.name}</p>{f.category&&<span className="text-xs px-2 py-0.5 rounded-full" style={{background:C.input,color:C.muted}}>{f.category}</span>}</div><a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold hover:underline" style={{color:G.primary}}><ExternalLink size={11}/> Abrir / baixar</a></div>))}</div>);

      case "contrato": return (<div className="space-y-4"><div className="grid sm:grid-cols-2 gap-4">{[["Implantação",project?.setup_value_brl!=null?brl(project.setup_value_brl):"—"],["Mensalidade (MRR)",project?.mrr_brl!=null?brl(project.mrr_brl):"—"],["Período",project?.contract_period_months?`${project.contract_period_months} meses`:"—"],["Início",fmtDate(project?.start_date)],["Go-live",fmtDate(project?.go_live_date)]].map(([l,v])=>(<div key={String(l)} className="rounded-2xl p-5" style={card()}><p className="text-xs mb-1" style={{color:C.muted}}>{l}</p><p className="font-bold" style={{color:C.text}}>{v}</p></div>))}</div>{ed("observacoes")&&<div className="rounded-2xl p-5" style={card()}><p className="text-xs uppercase tracking-wider mb-2" style={{color:C.muted}}>Observações</p><p className="text-sm leading-relaxed" style={{color:C.text}}>{ed("observacoes")}</p></div>}</div>);

      case "financeiro": return (<div className="space-y-4"><div className="grid sm:grid-cols-2 gap-4">{[{l:"Implantação",v:project?.setup_value_brl!=null?brl(project.setup_value_brl):"—"},{l:"Mensalidade",v:project?.mrr_brl!=null?brl(project.mrr_brl):"—"},{l:"Período",v:project?.contract_period_months?`${project.contract_period_months} meses`:"—"},{l:"Vencimento",v:"Dia 10 de cada mês"}].map(({l,v})=>(<div key={l} className="rounded-2xl p-5" style={card()}><p className="text-xs mb-1" style={{color:C.muted}}>{l}</p><p className="text-xl font-black" style={{color:G.glow}}>{v}</p></div>))}</div><div className="rounded-2xl p-4 text-sm" style={card()}><span style={{color:C.muted}}>Para boletos e NF: </span><a href="mailto:financeiro@solicitai.com.br" className="font-semibold hover:underline" style={{color:G.primary}}>financeiro@solicitai.com.br</a></div></div>);

      case "uso_ia": return (<div className="rounded-2xl overflow-hidden" style={card()}>{tokenUsage.length===0?<div className="p-6 text-sm" style={{color:C.muted}}>Dados disponíveis após o go-live.</div>:<table className="w-full text-sm"><thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{["Agente","Entrada","Saída","Total","Custo USD"].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold" style={{color:C.muted}}>{h}</th>)}</tr></thead><tbody>{tokenUsage.map((t:any)=><tr key={t.id} style={{borderBottom:`1px solid ${C.border}`}}><td className="px-4 py-3 font-bold" style={{color:C.text}}>{t.agent_name??"—"}</td><td className="px-4 py-3" style={{color:C.muted}}>{(t.input_tokens??0).toLocaleString("pt-BR")}</td><td className="px-4 py-3" style={{color:C.muted}}>{(t.output_tokens??0).toLocaleString("pt-BR")}</td><td className="px-4 py-3" style={{color:C.text}}>{((t.input_tokens??0)+(t.output_tokens??0)).toLocaleString("pt-BR")}</td><td className="px-4 py-3 font-bold" style={{color:G.glow}}>${(t.cost_usd??0).toFixed(4)}</td></tr>)}<tr style={{background:C.input}}><td className="px-4 py-3 font-black" style={{color:C.text}} colSpan={1}>Total</td><td className="px-4 py-3 font-bold" style={{color:C.text}}>{tokenTotals.input.toLocaleString("pt-BR")}</td><td className="px-4 py-3 font-bold" style={{color:C.text}}>{tokenTotals.output.toLocaleString("pt-BR")}</td><td className="px-4 py-3 font-bold" style={{color:C.text}}>{(tokenTotals.input+tokenTotals.output).toLocaleString("pt-BR")}</td><td className="px-4 py-3 font-black" style={{color:G.glow}}>${tokenTotals.cost.toFixed(4)}</td></tr></tbody></table>}</div>);

      case "resultados": return (<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{results.length===0?<div className="rounded-2xl p-6 text-sm sm:col-span-2 lg:col-span-3" style={{...card(),color:C.muted}}>Resultados disponíveis após o go-live.</div>:results.map((r:any)=><div key={r.id} className="rounded-2xl p-5" style={card()}><p className="text-xs mb-1" style={{color:C.muted}}>{r.metric_name}</p><p className="text-2xl font-black" style={{color:G.glow}}>{r.metric_value}{r.metric_unit&&<span className="text-sm ml-1" style={{color:C.muted}}>{r.metric_unit}</span>}</p>{r.period&&<p className="text-xs mt-1" style={{color:C.muted}}>{r.period}</p>}</div>)}</div>);

      case "suporte": return (
        <div className="space-y-6">
          <div className="rounded-2xl p-6" style={card()}>
            <h3 className="font-bold mb-4" style={{color:C.text}}>Abrir novo chamado</h3>
            <form onSubmit={submitSupport} className="space-y-3">
              <input className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all" type="text" placeholder="Título do chamado" style={{background:C.input,border:`1.5px solid ${C.inputB}`,color:C.text}} value={supportTitle} onChange={e=>setSupportTitle(e.target.value)} required/>
              <textarea className="w-full rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none transition-all" rows={4} placeholder="Descreva o problema…" style={{background:C.input,border:`1.5px solid ${C.inputB}`,color:C.text}} value={supportDesc} onChange={e=>setSupportDesc(e.target.value)}/>
              <button type="submit" disabled={supportSending} className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 transition-all hover:opacity-90" style={{background:`linear-gradient(135deg,${G.primary},${G.glow})`,color:"#fff"}}>
                {supportSending?"Enviando…":"Enviar chamado"}
              </button>
            </form>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{color:C.muted}}>Seus chamados</h3>
            {support.length===0?<div className="rounded-2xl p-5 text-sm" style={{...card(),color:C.muted}}>Nenhum chamado ainda.</div>:support.map((s:any)=>(
              <div key={s.id} className="rounded-2xl p-4" style={card()}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold text-sm" style={{color:C.text}}>{s.title}</p>{s.description&&<p className="text-xs mt-1" style={{color:C.muted}}>{s.description}</p>}</div>
                  <Chip s={s.status}/>
                </div>
                {s.resolved_at&&<p className="text-xs mt-2" style={{color:C.muted}}>Resolvido em: {fmtDate(s.resolved_at)}</p>}
              </div>
            ))}
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex" style={{background:C.bgGrad}}>
      <div id="yt-player-hidden" style={{position:"absolute",left:"-9999px",top:0,width:1,height:1}}/>

      {/* Mobile overlay */}
      {mobileMenuOpen&&<div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={()=>setMobileMenuOpen(false)}/>}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 h-screen z-50 lg:z-auto flex flex-col transition-all duration-300 w-64 ${mobileMenuOpen?"translate-x-0":"-translate-x-full lg:translate-x-0"} ${!sidebarOpen?"lg:w-0 lg:overflow-hidden":""}`}
        style={{background:G.dark.sidebar,borderRight:`1px solid rgba(255,255,255,.08)`}}>
        <div className="p-5 border-b border-white/10 flex-shrink-0">
          <img src={logo} alt="SolicitAí" className="h-7 w-auto"/>
          <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-widest">Portal do Cliente</p>
        </div>
        <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
          <p className="text-xs font-bold text-white truncate">{project?.name}</p>
          <p className="text-xs text-white/50 truncate">{client?.name}</p>
          <div className="mt-2"><Chip s={project?.status}/></div>
          <div className="mt-2 h-1 rounded-full overflow-hidden bg-white/10">
            <div className="h-full rounded-full" style={{width:`${project?.progress_pct??0}%`,background:`linear-gradient(90deg,${G.primary},${G.glow})`}}/>
          </div>
          <p className="text-[10px] text-white/40 mt-1">{project?.progress_pct??0}% concluído</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {TAB_GROUPS.map(group=>(
            <div key={group}>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-3 pt-3 pb-1.5">{group}</p>
              {TABS.filter(t=>t.group===group).map(tab=>{const Icon=tab.icon;const active=clientTab===tab.key;return(
                <button key={tab.key} onClick={()=>{setClientTab(tab.key);setMobileMenuOpen(false);}}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
                  style={active?{background:`${G.primary}20`,border:`1px solid ${G.primary}30`,color:G.primary}:{background:"transparent",border:"1px solid transparent",color:"rgba(255,255,255,.55)"}}>
                  <Icon size={15} color={active?G.primary:"rgba(255,255,255,.55)"}/>
                  {tab.label}
                  {tab.key==="pendencias"&&clientPendingCount>0&&<span className="ml-auto text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center" style={{background:"#f59e0b",color:"#060f1d"}}>{clientPendingCount}</span>}
                </button>
              );})}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <button onClick={()=>{setOnboardingStep(1);setScreen("onboarding");setMobileMenuOpen(false);}} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-white/5" style={{color:"rgba(255,255,255,.5)"}}>
            <RefreshCw size={14}/> Rever onboarding
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 backdrop-blur-xl border-b flex-shrink-0" style={{background:C.header,borderColor:C.border}}>
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setMobileMenuOpen(v=>!v);setSidebarOpen(v=>!v);}} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{background:C.card,border:`1px solid ${C.border}`}}>
                {mobileMenuOpen?<X size={15} color={C.text}/>:<Menu size={15} color={C.text}/>}
              </button>
              <h1 className="text-sm font-bold" style={{color:C.text}}>{TABS.find(t=>t.key===clientTab)?.label}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{background:C.card,border:`1px solid ${C.border}`}}>
                <Music2 size={11} color={C.muted}/>
                <MusicPlayer playerRef={playerRef} ytReady={ytReady} isPlaying={isPlaying} setIsPlaying={setIsPlaying} selectedTrack={selectedTrack} setSelectedTrack={setSelectedTrack} progress={progress} compact C={C}/>
              </div>
              <ThemeBtn/>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto px-4 sm:px-6 py-6 sm:py-8">{renderTab()}</main>
      </div>
    </div>
  );
}
