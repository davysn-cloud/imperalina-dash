-- ============================================
-- ORÇAMENTOS - Sistema de orçamentos/cotações
-- ============================================

-- Create enums for orcamentos
CREATE TYPE orcamento_status AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'EXPIRADO');

-- Orçamentos table
CREATE TABLE orcamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_orcamento TEXT UNIQUE NOT NULL, -- Número sequencial do orçamento (ex: ORC-2024-001)
  
  -- Cliente (referência para users.id - UUID)
  client_id UUID REFERENCES users(id),
  client_name TEXT NOT NULL, -- Nome do cliente (pode ser diferente do cadastrado)
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  
  -- Dados da empresa/profissional
  dados_empresa TEXT NOT NULL, -- Dados do remetente (nome, endereço, contato)
  
  -- Valores
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  desconto DECIMAL(10, 2) DEFAULT 0.00,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  
  -- Datas
  data_orcamento DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE NOT NULL, -- Data de validade do orçamento
  
  -- Status e controle
  status orcamento_status DEFAULT 'RASCUNHO' NOT NULL,
  observacoes TEXT,
  termos_condicoes TEXT,
  
  -- Envio por email
  enviado_em TIMESTAMPTZ,
  enviado_para TEXT, -- Email para onde foi enviado
  
  -- Aprovação/Rejeição
  respondido_em TIMESTAMPTZ,
  resposta_cliente TEXT,
  
  -- Auditoria (referência para users.id - UUID)
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Itens do Orçamento table
CREATE TABLE orcamento_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  
  -- Item
  service_id UUID REFERENCES services(id), -- Referência ao serviço (opcional)
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor_unitario DECIMAL(10, 2) NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL,
  
  -- Ordem dos itens
  ordem INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_orcamentos_client ON orcamentos(client_id);
CREATE INDEX idx_orcamentos_status ON orcamentos(status);
CREATE INDEX idx_orcamentos_data_orcamento ON orcamentos(data_orcamento);
CREATE INDEX idx_orcamentos_data_validade ON orcamentos(data_validade);
CREATE INDEX idx_orcamentos_numero ON orcamentos(numero_orcamento);
CREATE INDEX idx_orcamentos_created_by ON orcamentos(created_by);

CREATE INDEX idx_orcamento_itens_orcamento ON orcamento_itens(orcamento_id);
CREATE INDEX idx_orcamento_itens_service ON orcamento_itens(service_id);
CREATE INDEX idx_orcamento_itens_ordem ON orcamento_itens(orcamento_id, ordem);

-- Add trigger for updated_at
CREATE TRIGGER update_orcamentos_updated_at BEFORE UPDATE ON orcamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate sequential orcamento number
CREATE OR REPLACE FUNCTION generate_orcamento_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  orcamento_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get the next number for this year
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(numero_orcamento FROM 'ORC-' || current_year || '-(\d+)')
      AS INTEGER
    )
  ), 0) + 1
  INTO next_number
  FROM orcamentos
  WHERE numero_orcamento LIKE 'ORC-' || current_year || '-%';
  
  -- Format as ORC-YYYY-NNN
  orcamento_number := 'ORC-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN orcamento_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate orcamento number
CREATE OR REPLACE FUNCTION set_orcamento_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_orcamento IS NULL OR NEW.numero_orcamento = '' THEN
    NEW.numero_orcamento := generate_orcamento_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_orcamento_number_trigger
  BEFORE INSERT ON orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION set_orcamento_number();

-- Function to update orcamento totals
CREATE OR REPLACE FUNCTION update_orcamento_totals()
RETURNS TRIGGER AS $$
DECLARE
  orcamento_subtotal DECIMAL(10, 2);
  orcamento_total DECIMAL(10, 2);
  orcamento_desconto DECIMAL(10, 2);
BEGIN
  -- Calculate subtotal from items
  SELECT COALESCE(SUM(valor_total), 0.00)
  INTO orcamento_subtotal
  FROM orcamento_itens
  WHERE orcamento_id = COALESCE(NEW.orcamento_id, OLD.orcamento_id);
  
  -- Get current discount
  SELECT COALESCE(desconto, 0.00)
  INTO orcamento_desconto
  FROM orcamentos
  WHERE id = COALESCE(NEW.orcamento_id, OLD.orcamento_id);
  
  -- Calculate total
  orcamento_total := orcamento_subtotal - orcamento_desconto;
  
  -- Update orcamento totals
  UPDATE orcamentos
  SET 
    subtotal = orcamento_subtotal,
    total = orcamento_total,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.orcamento_id, OLD.orcamento_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update totals when items change
CREATE TRIGGER update_orcamento_totals_on_insert
  AFTER INSERT ON orcamento_itens
  FOR EACH ROW
  EXECUTE FUNCTION update_orcamento_totals();

CREATE TRIGGER update_orcamento_totals_on_update
  AFTER UPDATE ON orcamento_itens
  FOR EACH ROW
  EXECUTE FUNCTION update_orcamento_totals();

CREATE TRIGGER update_orcamento_totals_on_delete
  AFTER DELETE ON orcamento_itens
  FOR EACH ROW
  EXECUTE FUNCTION update_orcamento_totals();

-- Enable RLS
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_itens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orcamentos
CREATE POLICY "Users can view their own orcamentos" ON orcamentos
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Authenticated users can create orcamentos" ON orcamentos
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own orcamentos" ON orcamentos
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users can delete their own orcamentos" ON orcamentos
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policies for orcamento_itens
CREATE POLICY "Users can view items of their orcamentos" ON orcamento_itens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = orcamento_id 
      AND (
        o.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
      )
    )
  );

CREATE POLICY "Users can manage items of their orcamentos" ON orcamento_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = orcamento_id 
      AND (
        o.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
      )
    )
  );

-- Comments for documentation
COMMENT ON TABLE orcamentos IS 'Tabela de orçamentos/cotações do sistema';
COMMENT ON TABLE orcamento_itens IS 'Itens dos orçamentos com serviços e valores';
COMMENT ON COLUMN orcamentos.numero_orcamento IS 'Número sequencial único do orçamento (ex: ORC-2024-001)';
COMMENT ON COLUMN orcamentos.dados_empresa IS 'Dados do remetente (nome, endereço, telefone, etc.)';
COMMENT ON COLUMN orcamentos.data_validade IS 'Data de validade/expiração do orçamento';
COMMENT ON COLUMN orcamento_itens.ordem IS 'Ordem de exibição dos itens no orçamento';