-- 20-estoque-consumo-servicos.sql
-- Registro de consumo de produtos por atendimento/serviço

create extension if not exists "pgcrypto";

create table if not exists consumos_servicos_produtos (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  quantidade integer not null check (quantidade > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_csp_appointment on consumos_servicos_produtos (appointment_id);
create index if not exists idx_csp_service on consumos_servicos_produtos (service_id);
create index if not exists idx_csp_produto on consumos_servicos_produtos (produto_id);

-- RLS
alter table consumos_servicos_produtos enable row level security;

drop policy if exists csp_select_auth on consumos_servicos_produtos;
create policy csp_select_auth on consumos_servicos_produtos
for select using (auth.role() = 'authenticated');

drop policy if exists csp_insert_auth on consumos_servicos_produtos;
create policy csp_insert_auth on consumos_servicos_produtos
for insert with check (auth.role() = 'authenticated');

drop policy if exists csp_delete_auth on consumos_servicos_produtos;
create policy csp_delete_auth on consumos_servicos_produtos
for delete using (auth.role() = 'authenticated');