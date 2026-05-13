-- ============================================================
-- Markeiro Platform - Initial Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── User Access ──────────────────────────────────────────────
create table if not exists public.user_access (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  role       text not null default 'colaborador',
  modules    jsonb not null default '{}'::jsonb,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_access_email on public.user_access(email);

alter table public.user_access enable row level security;
create policy "admins manage user_access" on public.user_access
  using (exists (
    select 1 from public.user_access ua2
    where ua2.email = auth.jwt() ->> 'email' and ua2.role = 'admin'
  ));

-- ── Clientes ─────────────────────────────────────────────────
create table if not exists public.clientes (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  segmento            text,
  plano               text default 'Essencial',
  contato_nome        text,
  contato_email       text,
  contato_whatsapp    text,
  status              text not null default 'onboarding'
                        check (status in ('ativo','inativo','onboarding','pausado')),
  mrr                 numeric(12,2) not null default 0,
  inicio_contrato     date,
  logo_url            text,
  portal_slug         text unique,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_clientes_status on public.clientes(status);

alter table public.clientes enable row level security;
create policy "authenticated users read clientes" on public.clientes
  for select using (auth.role() = 'authenticated');
create policy "authenticated users write clientes" on public.clientes
  for all using (auth.role() = 'authenticated');

-- ── Contatos / CRM ───────────────────────────────────────────
create table if not exists public.contatos (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  email            text,
  whatsapp         text,
  empresa          text,
  cargo            text,
  etapa            text not null default 'prospecto'
                     check (etapa in ('prospecto','qualificado','proposta','negociacao','fechado','perdido')),
  origem           text,
  valor_estimado   numeric(12,2),
  responsavel_id   uuid references auth.users(id) on delete set null,
  notas            text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_contatos_etapa on public.contatos(etapa);

alter table public.contatos enable row level security;
create policy "authenticated users manage contatos" on public.contatos
  for all using (auth.role() = 'authenticated');

-- ── Campanhas ────────────────────────────────────────────────
create table if not exists public.campanhas (
  id                      uuid primary key default gen_random_uuid(),
  cliente_id              uuid not null references public.clientes(id) on delete cascade,
  nome                    text not null,
  plataforma              text not null default 'meta'
                            check (plataforma in ('meta','google','tiktok','linkedin','organico')),
  objetivo                text default 'Leads',
  status                  text not null default 'rascunho'
                            check (status in ('ativa','pausada','encerrada','rascunho')),
  orcamento_mensal        numeric(12,2) not null default 0,
  inicio                  date,
  fim                     date,
  ad_account_id           text,
  campaign_id_plataforma  text,
  created_at              timestamptz not null default now()
);

create index if not exists idx_campanhas_cliente on public.campanhas(cliente_id);
create index if not exists idx_campanhas_status on public.campanhas(status);

alter table public.campanhas enable row level security;
create policy "authenticated users manage campanhas" on public.campanhas
  for all using (auth.role() = 'authenticated');

-- ── Métricas Snapshots ───────────────────────────────────────
create table if not exists public.metricas_snapshots (
  id            uuid primary key default gen_random_uuid(),
  campanha_id   uuid not null references public.campanhas(id) on delete cascade,
  data          date not null,
  impressoes    bigint not null default 0,
  cliques       bigint not null default 0,
  gasto         numeric(12,2) not null default 0,
  conversoes    bigint not null default 0,
  leads         bigint not null default 0,
  cpm           numeric(10,4),
  cpc           numeric(10,4),
  ctr           numeric(10,6),
  cpl           numeric(10,4),
  roas          numeric(10,4),
  created_at    timestamptz not null default now(),
  unique(campanha_id, data)
);

create index if not exists idx_metricas_campanha_data on public.metricas_snapshots(campanha_id, data desc);

alter table public.metricas_snapshots enable row level security;
create policy "authenticated users manage metricas" on public.metricas_snapshots
  for all using (auth.role() = 'authenticated');

-- ── Tarefas de Conteúdo ──────────────────────────────────────
create table if not exists public.tarefas (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  descricao       text,
  cliente_id      uuid references public.clientes(id) on delete set null,
  campanha_id     uuid references public.campanhas(id) on delete set null,
  tipo            text not null default 'post'
                    check (tipo in ('post','story','reels','ads','email','lp','outro')),
  status          text not null default 'backlog'
                    check (status in ('backlog','producao','revisao','aprovacao','publicado')),
  responsavel_id  uuid references auth.users(id) on delete set null,
  data_entrega    date,
  prioridade      text not null default 'media'
                    check (prioridade in ('baixa','media','alta','urgente')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_tarefas_status on public.tarefas(status);
create index if not exists idx_tarefas_cliente on public.tarefas(cliente_id);

alter table public.tarefas enable row level security;
create policy "authenticated users manage tarefas" on public.tarefas
  for all using (auth.role() = 'authenticated');

-- ── Onboarding Flows ─────────────────────────────────────────
create table if not exists public.onboarding_flows (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.clientes(id) on delete cascade,
  etapa            int not null,
  nome             text not null,
  descricao        text,
  concluida        boolean not null default false,
  data_conclusao   date,
  created_at       timestamptz not null default now(),
  unique(cliente_id, etapa)
);

create index if not exists idx_onboarding_cliente on public.onboarding_flows(cliente_id);

alter table public.onboarding_flows enable row level security;
create policy "authenticated users manage onboarding" on public.onboarding_flows
  for all using (auth.role() = 'authenticated');

-- ── Updated_at trigger ───────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger clientes_updated_at
  before update on public.clientes
  for each row execute function public.handle_updated_at();
