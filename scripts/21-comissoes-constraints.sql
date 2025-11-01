-- Evitar duplicidade de lançamentos de comissão por atendimento
-- Adiciona índice único em comissao_atendimentos.appointment_id

create unique index if not exists uniq_comissao_atend_apt
  on public.comissao_atendimentos (appointment_id);

comment on index uniq_comissao_atend_apt is 'Evita inserir o mesmo atendimento mais de uma vez em comissao_atendimentos';