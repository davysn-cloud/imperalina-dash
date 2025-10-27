-- Create financial system tables

-- Create enums for financial system
CREATE TYPE conta_receber_status AS ENUM ('PENDENTE', 'RECEBIDO', 'ATRASADO', 'CANCELADO');
CREATE TYPE conta_pagar_status AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO');
CREATE TYPE conta_pagar_categoria AS ENUM ('ALUGUEL', 'ENERGIA', 'AGUA', 'INTERNET', 'MARKETING', 'COMISSAO', 'OUTROS');
CREATE TYPE comissao_status AS ENUM ('CALCULADO', 'APROVADO', 'PAGO');
CREATE TYPE comissao_tipo AS ENUM ('PERCENTUAL', 'FIXO', 'HIBRIDO');

-- Contas a Receber table
CREATE TABLE contas_receber (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  descricao TEXT NOT NULL,
  valor_original DECIMAL(10, 2) NOT NULL,
  valor_pago DECIMAL(10, 2) DEFAULT 0.00,
  desconto DECIMAL(10, 2) DEFAULT 0.00,
  acrescimo DECIMAL(10, 2) DEFAULT 0.00,
  data_vencimento DATE NOT NULL,
  data_pagamento TIMESTAMPTZ,
  status conta_receber_status DEFAULT 'PENDENTE' NOT NULL,
  metodo_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Contas a Pagar table
CREATE TABLE contas_pagar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao TEXT NOT NULL,
  categoria conta_pagar_categoria NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento TIMESTAMPTZ,
  status conta_pagar_status DEFAULT 'PENDENTE' NOT NULL,
  metodo_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Configuração de Comissões table
CREATE TABLE comissao_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID UNIQUE NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  tipo comissao_tipo NOT NULL,
  percentual_base DECIMAL(5, 2) DEFAULT 0.00,
  valor_fixo DECIMAL(10, 2) DEFAULT 0.00,
  meta_minima DECIMAL(10, 2) DEFAULT 0.00,
  bonus_percentual DECIMAL(5, 2) DEFAULT 0.00,
  dia_pagamento INTEGER DEFAULT 5 CHECK (dia_pagamento >= 1 AND dia_pagamento <= 31),
  ativo BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comissões table
CREATE TABLE comissoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  total_atendimentos INTEGER DEFAULT 0,
  total_faturamento DECIMAL(10, 2) DEFAULT 0.00,
  total_comissao DECIMAL(10, 2) DEFAULT 0.00,
  bonificacoes DECIMAL(10, 2) DEFAULT 0.00,
  valor_final DECIMAL(10, 2) DEFAULT 0.00,
  status comissao_status DEFAULT 'CALCULADO' NOT NULL,
  conta_pagar_id UUID REFERENCES contas_pagar(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(professional_id, periodo_inicio, periodo_fim)
);

-- Detalhes dos Atendimentos para Comissão table
CREATE TABLE comissao_atendimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comissao_id UUID NOT NULL REFERENCES comissoes(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  valor_servico DECIMAL(10, 2) NOT NULL,
  percentual_comissao DECIMAL(5, 2) NOT NULL,
  valor_comissao DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_contas_receber_client ON contas_receber(client_id);
CREATE INDEX idx_contas_receber_professional ON contas_receber(professional_id);
CREATE INDEX idx_contas_receber_status ON contas_receber(status);
CREATE INDEX idx_contas_receber_vencimento ON contas_receber(data_vencimento);
CREATE INDEX idx_contas_receber_appointment ON contas_receber(appointment_id);

CREATE INDEX idx_contas_pagar_categoria ON contas_pagar(categoria);
CREATE INDEX idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);

CREATE INDEX idx_comissao_config_professional ON comissao_config(professional_id);
CREATE INDEX idx_comissoes_professional ON comissoes(professional_id);
CREATE INDEX idx_comissoes_periodo ON comissoes(periodo_inicio, periodo_fim);
CREATE INDEX idx_comissoes_status ON comissoes(status);

CREATE INDEX idx_comissao_atendimentos_comissao ON comissao_atendimentos(comissao_id);
CREATE INDEX idx_comissao_atendimentos_appointment ON comissao_atendimentos(appointment_id);

-- Add triggers for updated_at
CREATE TRIGGER update_contas_receber_updated_at BEFORE UPDATE ON contas_receber
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contas_pagar_updated_at BEFORE UPDATE ON contas_pagar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comissao_config_updated_at BEFORE UPDATE ON comissao_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comissoes_updated_at BEFORE UPDATE ON comissoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();