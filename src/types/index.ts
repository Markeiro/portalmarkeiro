export type Role = "admin" | "gestor" | "colaborador" | "cliente";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: Role;
  modules: Record<string, boolean>;
  active: boolean;
  created_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  segmento: string;
  contato_nome: string;
  contato_email: string;
  contato_whatsapp?: string;
  status: "ativo" | "inativo" | "onboarding" | "pausado";
  plano: string;
  mrr: number;
  inicio_contrato?: string;
  logo_url?: string;
  portal_slug?: string;
  notas?: string;
  created_at: string;
}

export interface Contato {
  id: string;
  nome: string;
  email?: string;
  whatsapp?: string;
  empresa?: string;
  cargo?: string;
  etapa: "prospecto" | "qualificado" | "proposta" | "negociacao" | "fechado" | "perdido";
  origem?: string;
  valor_estimado?: number;
  responsavel_id?: string;
  notas?: string;
  created_at: string;
}

export interface Campanha {
  id: string;
  cliente_id: string;
  nome: string;
  plataforma: "meta" | "google" | "tiktok" | "linkedin" | "organico";
  objetivo: string;
  status: "ativa" | "pausada" | "encerrada" | "rascunho";
  orcamento_mensal: number;
  inicio?: string;
  fim?: string;
  ad_account_id?: string;
  campaign_id_plataforma?: string;
  created_at: string;
}

export interface MetricaSnapshot {
  id: string;
  campanha_id: string;
  data: string;
  impressoes: number;
  cliques: number;
  gasto: number;
  conversoes: number;
  leads: number;
  cpm?: number;
  cpc?: number;
  ctr?: number;
  cpl?: number;
  roas?: number;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  cliente_id?: string;
  campanha_id?: string;
  tipo: "post" | "story" | "reels" | "ads" | "email" | "lp" | "outro";
  status: "backlog" | "producao" | "revisao" | "aprovacao" | "publicado";
  responsavel_id?: string;
  data_entrega?: string;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  created_at: string;
}

export interface OnboardingEtapa {
  id: string;
  cliente_id: string;
  etapa: number;
  nome: string;
  descricao?: string;
  concluida: boolean;
  data_conclusao?: string;
}
