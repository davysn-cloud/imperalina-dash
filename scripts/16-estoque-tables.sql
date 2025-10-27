-- Estoque: criação de tabelas, índices, triggers e RLS
-- Execute este script no SQL Editor do seu projeto Supabase

-- Extension necessária para gen_random_uuid
create extension if not exists "pgcrypto";

-- Tabela de produtos
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  preco_custo numeric(12,2) not null default 0,
  preco_venda numeric(12,2) not null default 0,
  quantidade_atual integer not null default 0,
  quantidade_minima integer not null default 0,
  validade date,
  updated_at timestamptz not null default now()
);
create index if not exists idx_produtos_nome on produtos (nome);

-- Movimentações de estoque (entradas/saídas)
create table if not exists movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida')),
  quantidade integer not null check (quantidade >= 0),
  origem text not null,
  data_hora timestamptz not null default now(),
  validade date
);
create index if not exists idx_mov_produto on movimentacoes_estoque (produto_id);
create index if not exists idx_mov_data on movimentacoes_estoque (data_hora);

-- Pedidos de compra (gerados pela ação em massa)
create table if not exists pedidos_compra (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  quantidade integer not null check (quantidade > 0),
  status text not null default 'pendente' check (status in ('pendente','aprovado','recebido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pc_produto on pedidos_compra (produto_id);
create index if not exists idx_pc_status on pedidos_compra (status);

-- (Opcional) Lotes por produto, se quiser granularidade por lote
create table if not exists lotes_produto (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  lote text,
  validade date not null,
  quantidade integer not null default 0
);
create index if not exists idx_lotes_produto on lotes_produto (produto_id);
create index if not exists idx_lotes_validade on lotes_produto (validade);

-- Trigger para updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_produtos_updated on produtos;
create trigger trg_produtos_updated before update on produtos
for each row execute function set_updated_at();

drop trigger if exists trg_pedidos_compra_updated on pedidos_compra;
create trigger trg_pedidos_compra_updated before update on pedidos_compra
for each row execute function set_updated_at();

-- Habilitar RLS
alter table produtos enable row level security;
alter table movimentacoes_estoque enable row level security;
alter table pedidos_compra enable row level security;
alter table lotes_produto enable row level security;

-- Políticas mínimas para usuários autenticados
-- Ajuste para multi-tenant (ex: org_id) se necessário
drop policy if exists produtos_select_auth on produtos;
create policy produtos_select_auth on produtos
for select using (auth.role() = 'authenticated');
drop policy if exists produtos_update_auth on produtos;
create policy produtos_update_auth on produtos
for update using (auth.role() = 'authenticated');

drop policy if exists produtos_insert_auth on produtos;
create policy produtos_insert_auth on produtos
for insert with check (auth.role() = 'authenticated');

drop policy if exists movs_select_auth on movimentacoes_estoque;
create policy movs_select_auth on movimentacoes_estoque
for select using (auth.role() = 'authenticated');
drop policy if exists movs_insert_auth on movimentacoes_estoque;
create policy movs_insert_auth on movimentacoes_estoque
for insert with check (auth.role() = 'authenticated');

drop policy if exists pedidos_select_auth on pedidos_compra;
create policy pedidos_select_auth on pedidos_compra
for select using (auth.role() = 'authenticated');
drop policy if exists pedidos_insert_auth on pedidos_compra;
create policy pedidos_insert_auth on pedidos_compra
for insert with check (auth.role() = 'authenticated');
drop policy if exists pedidos_update_auth on pedidos_compra;
create policy pedidos_update_auth on pedidos_compra
for update using (auth.role() = 'authenticated');

drop policy if exists lotes_select_auth on lotes_produto;
create policy lotes_select_auth on lotes_produto
for select using (auth.role() = 'authenticated');
drop policy if exists lotes_modify_auth on lotes_produto;
create policy lotes_modify_auth on lotes_produto
for insert with check (auth.role() = 'authenticated');

-- RPC: Ajustar estoque ao mínimo (atomic)
create or replace function adjust_stock_to_minimo(product_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  adjusted integer := 0;
  curr integer;
  minv integer;
  delta integer;
  mov_tipo text;
begin
  if product_ids is null or array_length(product_ids, 1) is null then
    return 0;
  end if;

  -- Processa cada produto em uma única transação
  for pid in select unnest(product_ids) loop
    select quantidade_atual, quantidade_minima into curr, minv from produtos where id = pid;
    if not found then continue; end if;

    if curr = minv then
      continue;
    end if;

    delta := abs(minv - curr);
    mov_tipo := case when (minv - curr) > 0 then 'entrada' else 'saida' end;

    update produtos set quantidade_atual = minv where id = pid;

    insert into movimentacoes_estoque (produto_id, tipo, quantidade, origem, data_hora)
    values (pid, mov_tipo, delta, 'Ajuste mínimo', now());

    adjusted := adjusted + 1;
  end loop;

  return adjusted;
end;
$$;

grant execute on function adjust_stock_to_minimo(uuid[]) to authenticated;

-- RPC: Descartar vencidos (atomic)
create or replace function discard_expired(product_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  discarded integer := 0;
  curr integer;
  vdate date;
begin
  if product_ids is null or array_length(product_ids, 1) is null then
    return 0;
  end if;

  for pid in select unnest(product_ids) loop
    select quantidade_atual, validade into curr, vdate from produtos where id = pid;
    if not found then continue; end if;

    -- Só descarta se houver quantidade e estiver vencido
    if curr <= 0 then continue; end if;
    if vdate is null or vdate >= now()::date then continue; end if;

    insert into movimentacoes_estoque (produto_id, tipo, quantidade, origem, data_hora, validade)
    values (pid, 'saida', curr, 'Descarte por vencimento', now(), vdate);

    update produtos set quantidade_atual = 0 where id = pid;

    discarded := discarded + 1;
  end loop;

  return discarded;
end;
$$;

grant execute on function discard_expired(uuid[]) to authenticated;