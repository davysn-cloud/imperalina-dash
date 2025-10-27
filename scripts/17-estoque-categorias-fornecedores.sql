-- 17-estoque-categorias-fornecedores.sql
-- Criação de tabelas de categorias e fornecedores com RLS

create extension if not exists "pgcrypto";

-- Categorias
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text,           -- hex opcional
  icone text,         -- nome do ícone opcional
  descricao text,
  parent_id uuid references categorias(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_categorias_nome on categorias (nome);
create index if not exists idx_categorias_parent on categorias (parent_id);

-- Fornecedores
create table if not exists fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome_fantasia text not null,
  razao_social text,
  cnpj text,
  telefone text,
  whatsapp text,
  email text,
  responsavel text,
  endereco text,
  prazo_entrega text,
  pagamento_preferido text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fornecedores_nome on fornecedores (nome_fantasia);
create index if not exists idx_fornecedores_ativo on fornecedores (ativo);

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_categorias_updated on categorias;
create trigger trg_categorias_updated before update on categorias
for each row execute function update_updated_at();

drop trigger if exists trg_fornecedores_updated on fornecedores;
create trigger trg_fornecedores_updated before update on fornecedores
for each row execute function update_updated_at();

-- RLS
alter table categorias enable row level security;
alter table fornecedores enable row level security;

drop policy if exists categorias_select_auth on categorias;
create policy categorias_select_auth on categorias
for select using (auth.role() = 'authenticated');

drop policy if exists categorias_insert_auth on categorias;
create policy categorias_insert_auth on categorias
for insert with check (auth.role() = 'authenticated');

drop policy if exists categorias_update_auth on categorias;
create policy categorias_update_auth on categorias
for update using (auth.role() = 'authenticated');

-- Optionally allow delete
drop policy if exists categorias_delete_auth on categorias;
create policy categorias_delete_auth on categorias
for delete using (auth.role() = 'authenticated');

-- Fornecedores policies
drop policy if exists fornecedores_select_auth on fornecedores;
create policy fornecedores_select_auth on fornecedores
for select using (auth.role() = 'authenticated');

drop policy if exists fornecedores_insert_auth on fornecedores;
create policy fornecedores_insert_auth on fornecedores
for insert with check (auth.role() = 'authenticated');

drop policy if exists fornecedores_update_auth on fornecedores;
create policy fornecedores_update_auth on fornecedores
for update using (auth.role() = 'authenticated');

drop policy if exists fornecedores_delete_auth on fornecedores;
create policy fornecedores_delete_auth on fornecedores
for delete using (auth.role() = 'authenticated');