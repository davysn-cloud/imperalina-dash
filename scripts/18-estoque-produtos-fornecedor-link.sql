-- Vincular produtos a fornecedores principais
-- Adiciona coluna fornecedor_principal_id com FK para fornecedores(id)

alter table public.produtos
  add column if not exists fornecedor_principal_id uuid
  references public.fornecedores(id)
  on delete set null;

-- Índice para otimizar buscas por fornecedor
create index if not exists idx_produtos_fornecedor_principal
  on public.produtos (fornecedor_principal_id);