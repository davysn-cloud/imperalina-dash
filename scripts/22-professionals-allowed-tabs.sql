-- 22-professionals-allowed-tabs.sql
-- Adiciona coluna para gerenciar quais abas cada profissional pode acessar

alter table if exists public.professionals
  add column if not exists allowed_tabs text[] default '{}'::text[];

-- Comentário para documentação
comment on column public.professionals.allowed_tabs is 'Rotas permitidas para o profissional visualizar no menu';