-- 19-estoque-servico-produto-vinculos.sql
-- Tabela de vínculos entre serviços e produtos, índices, trigger e RLS

create extension if not exists "pgcrypto";

-- Vínculos Serviço × Produto
create table if not exists servico_produto_vinculos (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  quantidade integer not null default 1 check (quantidade > 0),
  obrigatorio boolean not null default false,           -- se o produto é obrigatório para o serviço
  baixa_automatica boolean not null default false,      -- se deve baixar estoque automaticamente ao concluir atendimento
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, produto_id)
);

create index if not exists idx_spv_service on servico_produto_vinculos (service_id);
create index if not exists idx_spv_produto on servico_produto_vinculos (produto_id);

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_spv_updated on servico_produto_vinculos;
create trigger trg_spv_updated before update on servico_produto_vinculos
for each row execute function update_updated_at();

-- RLS
alter table servico_produto_vinculos enable row level security;

-- Seleção por usuários autenticados
drop policy if exists spv_select_auth on servico_produto_vinculos;
create policy spv_select_auth on servico_produto_vinculos
for select using (auth.role() = 'authenticated');

-- Inserção por usuários autenticados
drop policy if exists spv_insert_auth on servico_produto_vinculos;
create policy spv_insert_auth on servico_produto_vinculos
for insert with check (auth.role() = 'authenticated');

-- Atualização por usuários autenticados
drop policy if exists spv_update_auth on servico_produto_vinculos;
create policy spv_update_auth on servico_produto_vinculos
for update using (auth.role() = 'authenticated');

-- Remoção por usuários autenticados
drop policy if exists spv_delete_auth on servico_produto_vinculos;
create policy spv_delete_auth on servico_produto_vinculos
for delete using (auth.role() = 'authenticated');