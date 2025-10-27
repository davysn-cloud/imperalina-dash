-- 15-rls-commissions-policies.sql
-- Policies focadas em permitir leitura necessária para a tela de comissões,
-- sem abrir acesso desnecessário. Considera papéis ADMIN e PROFESSIONAL.

-- Helpers de papel do usuário
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'ADMIN'
  );
$$;

create or replace function public.is_professional()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'PROFESSIONAL'
  );
$$;

-- USERS: permitir leitura de nomes por ADMIN/PROFESSIONAL, e do próprio usuário
alter table public.users enable row level security;

create policy "users_select_dashboard"
  on public.users for select
  to authenticated
  using (
    public.is_admin() or public.is_professional() or id = auth.uid()
  );

-- PROFESSIONALS: permitir leitura de profissionais para dashboard
alter table public.professionals enable row level security;

create policy "professionals_select_dashboard"
  on public.professionals for select
  to authenticated
  using (
    public.is_admin() or public.is_professional()
  );

-- SERVICES: permitir leitura para cálculo de comissão
alter table public.services enable row level security;

create policy "services_select_dashboard"
  on public.services for select
  to authenticated
  using (
    public.is_admin() or public.is_professional()
  );

-- APPOINTMENTS: permitir leitura de agendamentos para comissões
alter table public.appointments enable row level security;

create policy "appointments_select_commissions"
  on public.appointments for select
  to authenticated
  using (
    public.is_admin() or public.is_professional()
  );

-- Observações:
-- - As políticas acima suportam os embeds utilizados pelo PostgREST (Supabase) na página de comissões,
--   permitindo que ADMIN/PROFESSIONAL leiam nomes de usuários, profissionais, serviços e agendamentos.
-- - Clientes autenticados só conseguem ler seus próprios dados em `users` (id = auth.uid()).
-- - Filtragem por status (COMPLETED/PAID) permanece na query da aplicação.
-- - Caso existam políticas prévias conflitando, revise a ordem e nomes ou ajuste conforme necessário.