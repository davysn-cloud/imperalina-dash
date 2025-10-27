-- Vincular contas a pagar a pedidos de compra e fornecedores
-- Execute no Supabase SQL Editor após as migrações anteriores

-- Adiciona coluna opcional para fornecedor
alter table if exists public.contas_pagar
  add column if not exists fornecedor_id uuid references public.fornecedores(id) on delete set null;

-- Adiciona coluna opcional para vincular um pedido de compra
alter table if exists public.contas_pagar
  add column if not exists pedido_compra_id uuid references public.pedidos_compra(id) on delete set null;

-- Índices para otimizar buscas
create index if not exists idx_contas_pagar_fornecedor on public.contas_pagar (fornecedor_id);
create index if not exists idx_contas_pagar_pedido_compra on public.contas_pagar (pedido_compra_id);

-- Comentários para documentação
comment on column public.contas_pagar.fornecedor_id is 'Fornecedor relacionado à obrigação (quando aplicável)';
comment on column public.contas_pagar.pedido_compra_id is 'Pedido de compra que originou a obrigação (quando aplicável)';