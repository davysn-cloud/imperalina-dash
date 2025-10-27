# Estrutura Relacional Financeira

Este documento descreve como as áreas Financeiro, Comissões e Estoque se relacionam, utilizando as tabelas já existentes e apenas adicionando novos vínculos quando estritamente necessário.

## Tabelas Principais

- `appointments` (atendimentos)
  - Campos relevantes: `date`, `payment_status`, `payment_amount`, `service_id`, `professional_id`, `client_id`.
  - Origina as entradas de caixa (receitas) e as contas a receber.

- `contas_receber`
  - Derivado de `appointments`. Cada atendimento pago/pendente mapeia para um lançamento de recebível.
  - Status: `PENDING`, `PAID`, `OVERDUE`.

- `contas_pagar`
  - Saídas do caixa. Categorias abrangem comissões, aluguel, utilidades, compras de produtos etc.
  - Campos adicionados pelo script `19-link-payables-purchase-supplier.sql`:
    - `fornecedor_id` → FK para `fornecedores`.
    - `pedido_compra_id` → FK para `pedidos_compra`.

- `comissoes` e `comissao_config`
  - Comissões de profissionais derivadas de `appointments` pagos.
  - Quando há lançamento/pagamento de comissão, ele pode ser representado em `contas_pagar` (categoria `COMISSAO`).

- Estoque
  - `produtos`, `movimentacoes_estoque`, `pedidos_compra`, `lotes_produto`.
  - Compras geram `pedidos_compra` e podem originar lançamentos em `contas_pagar` (categoria `PRODUTOS`).

## Fluxos

1) Receitas (Entradas)
   - `appointments` com `payment_status = PAID` somam na receita do período.
   - `appointments` com `PENDING/OVERDUE` alimentam a visão de Contas a Receber.

2) Despesas (Saídas)
   - `contas_pagar` agrega todas as obrigações (comissões, aluguel, utilidades, compras de produtos etc.).
   - Pagas no mês alimentam o fluxo de caixa (saídas) e o saldo do mês.

3) Estoque → Pagar
   - `pedidos_compra` podem gerar lançamentos em `contas_pagar` via `pedido_compra_id` e `fornecedor_id`.

4) Comissões → Pagar
   - Cálculo a partir de `appointments` pagos. Lançamento em `contas_pagar` com categoria `COMISSAO`.

## Dashboard Financeiro

Endpoint: `/api/financeiro/dashboard`
- Resumo do mês:
  - `receita_mes`, `variacao_receita`, `contas_pendentes`, `contas_atrasadas` (receber), `a_pagar_mes`, `pagar_atrasadas_mes`, `saidas_pagas_mes`, `saldo_mes`.
- `fluxo_caixa`: últimos 6 meses com `entradas`, `saidas`, `saldo` acumulado.
- `alertas`: atendimentos em atraso (base para “Vencidas”).

Realtime: a página do dashboard assina `appointments`, `contas_pagar` e `contas_receber` para atualizar as visualizações dinamicamente.

## RLS e Segurança

As políticas em `scripts/14-financial-rls-policies.sql` restringem acesso:
- `contas_pagar`: gestão por administradores.
- `contas_receber` e comissões: usuários autenticados podem visualizar conforme políticas definidas.

## Boas Práticas

- Calcular valores derivados (ex.: total do pedido de compra) no backend, garantindo consistência.
- Paginação e filtros nos endpoints de listagem para manter performance com grandes volumes.
- Evitar mocks no frontend; em caso de erro, exibir mensagens e estados vazios.