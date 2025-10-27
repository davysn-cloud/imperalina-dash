-- Enable RLS for financial tables
ALTER TABLE contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissao_atendimentos ENABLE ROW LEVEL SECURITY;

-- Contas a Receber policies
CREATE POLICY "Users can view their own receivables" ON contas_receber
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM professionals WHERE id = professional_id
      UNION
      SELECT id FROM users WHERE id = client_id AND role = 'CLIENT'
    )
    OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Professionals and admins can manage receivables" ON contas_receber
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM professionals WHERE id = professional_id
    )
    OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Contas a Pagar policies (only admins)
CREATE POLICY "Only admins can manage payables" ON contas_pagar
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Comissão Config policies
CREATE POLICY "Professionals can view their commission config" ON comissao_config
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM professionals WHERE id = professional_id
    )
    OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Only admins can manage commission config" ON comissao_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Only admins can update commission config" ON comissao_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Only admins can delete commission config" ON comissao_config
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Comissões policies
CREATE POLICY "Professionals can view their commissions" ON comissoes
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM professionals WHERE id = professional_id
    )
    OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Only admins can manage commissions" ON comissoes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Only admins can update commissions" ON comissoes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Comissão Atendimentos policies
CREATE POLICY "Users can view commission details" ON comissao_atendimentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM comissoes c 
      JOIN professionals p ON c.professional_id = p.id 
      WHERE c.id = comissao_id 
      AND (p.user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'))
    )
  );

CREATE POLICY "Only admins can manage commission details" ON comissao_atendimentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );