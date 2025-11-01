export type UserRole = "CLIENT" | "PROFESSIONAL" | "ADMIN"
export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE"

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  avatar: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Professional {
  id: string
  user_id: string
  specialties: string[]
  bio: string | null
  color: string
  is_active: boolean
  can_manage_schedule: boolean
  can_view_all_appointments: boolean
  allowed_tabs?: string[]
  created_at: string
  updated_at: string
  user?: User
  services?: Service[]
  schedules?: Schedule[]
}

export interface Service {
  id: string
  name: string
  description: string | null
  duration: number
  price: number
  professional_id: string
  commission_percentage: number
  is_active: boolean
  created_at: string
  updated_at: string
  professional?: Professional
}

export interface Schedule {
  id: string
  professional_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
  updated_at: string
  professional?: Professional
}

export interface Appointment {
  id: string
  client_id: string
  professional_id: string
  service_id: string
  date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  payment_status: PaymentStatus
  payment_date: string | null
  payment_amount: number | null
  payment_method: string | null
  payment_notes: string | null
  notes: string | null
  created_at: string
  updated_at: string
  client?: User
  professional?: Professional
  service?: Service
}

export interface TimeSlot {
  time: string
  available: boolean
}

export type ClientMood = "VERY_HAPPY" | "HAPPY" | "NEUTRAL" | "TIRED" | "STRESSED" | "UPSET"
export type CoffeeStrength = "WEAK" | "MEDIUM" | "STRONG" | "VERY_STRONG"
export type EventImportance = "ROUTINE" | "IMPORTANT" | "VERY_IMPORTANT" | "CRITICAL"
export type ServiceQuality = "POOR" | "FAIR" | "GOOD" | "VERY_GOOD" | "EXCELLENT"

export interface FollowIn {
  id: string
  appointment_id: string
  client_mood?: ClientMood
  arrived_on_time?: boolean
  arrival_notes?: string
  coffee_today?: boolean
  coffee_strength_today?: CoffeeStrength
  music_today?: string
  temperature_today?: string
  special_requests?: string
  time_constraints?: string
  professional_notes?: string
  completed_at?: string
  completed_by?: string
  created_at: string
  updated_at: string
}

export interface FollowUp {
  id: string
  appointment_id: string
  service_reason?: string
  event_date?: string
  event_importance?: EventImportance
  conversation_topics?: string[]
  personal_milestones?: string[]
  follow_up_topics?: string[]
  reminders?: string[]
  client_satisfaction?: number
  service_quality?: ServiceQuality
  client_feedback?: string
  products_used?: string[]
  products_recommended?: string[]
  technical_notes?: string
  next_service_suggestion?: string
  profile_updates?: Record<string, any>
  completed_at?: string
  completed_by?: string
  created_at: string
  updated_at: string
}

// Orçamentos
export type OrcamentoStatus = "PENDENTE" | "APROVADO" | "REJEITADO" | "EXPIRADO"
export type TemplateLayout = "MODERNO" | "MINIMALISTA" | "ELEGANTE"
export type TemplateFonte = "SANS_SERIF" | "SERIF" | "MONOSPACE"
export type TemplateEspacamento = "COMPACTO" | "NORMAL" | "AMPLO"

export interface OrcamentoItem {
  id: string
  servico_id: string
  servico_nome: string
  quantidade: number
  valor_unitario: number
  desconto: number
  subtotal: number
}

export interface OrcamentoCliente {
  id: string
  nome: string
  email: string
  telefone?: string
}

export interface Orcamento {
  id: string
  numero: string // ORC-2025-001
  template_id: string
  cliente: OrcamentoCliente
  itens: OrcamentoItem[]
  data_emissao: Date
  data_validade: Date
  subtotal: number
  desconto: number
  valor_total: number
  status: OrcamentoStatus
  observacoes?: string
  forma_pagamento?: string
  created_at: string
  updated_at: string
  template?: OrcamentoTemplate
}

export interface OrcamentoTemplate {
  id: string
  nome: string
  descricao?: string
  layout: TemplateLayout
  cor_primaria: string
  cor_secundaria: string
  fonte: TemplateFonte
  espacamento: TemplateEspacamento
  exibir_logo: boolean
  dados_empresa: string
  conteudo_padrao?: string
  secoes_ativas: {
    cabecalho: boolean
    dados_cliente: boolean
    itens: boolean
    totais: boolean
    observacoes: boolean
    rodape: boolean
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

// Tipos Financeiros
export type ContaReceberStatus = "pendente" | "pago" | "atrasado"
export type ContaPagarStatus = "pendente" | "pago"
export type ContaPagarCategoria = "comissao" | "aluguel" | "produto" | "salario" | "outros"
export type ComissaoStatus = "calculado" | "aprovado" | "pago"
export type ComissaoTipo = "percentual" | "fixo" | "hibrido"

export interface ContaReceber {
  id: string
  numero: string // CR-2025-001
  cliente_id: string
  agendamento_id?: string
  orcamento_id?: string
  valor_original: number
  data_vencimento: Date
  data_pagamento?: Date
  status: ContaReceberStatus
  forma_pagamento: string
  desconto?: number
  acrescimo?: number
  valor_final?: number
  observacoes?: string
  created_at: string
  updated_at: string
  cliente?: User
  agendamento?: Appointment
  orcamento?: Orcamento
}

export interface ContaPagar {
  id: string
  numero: string // CP-2025-001
  categoria: ContaPagarCategoria
  profissional_id?: string
  descricao: string
  valor_original: number
  data_vencimento: Date
  data_pagamento?: Date
  status: ContaPagarStatus
  recorrente: boolean
  observacoes?: string
  created_at: string
  updated_at: string
  profissional?: Professional
}

export interface ComissaoConfig {
  id: string
  profissional_id: string
  tipo: ComissaoTipo
  percentual_base?: number
  valor_fixo?: number
  meta_minima?: number
  bonus_percentual?: number
  dia_pagamento: number
  is_active: boolean
  created_at: string
  updated_at: string
  profissional?: Professional
}

export interface ComissaoAtendimento {
  agendamento_id: string
  valor_servico: number
  valor_comissao: number
}

export interface Comissao {
  id: string
  profissional_id: string
  periodo: {
    inicio: Date
    fim: Date
  }
  atendimentos: ComissaoAtendimento[]
  total_comissao: number
  bonificacoes: number
  valor_final: number
  status: ComissaoStatus
  observacoes?: string
  created_at: string
  updated_at: string
  profissional?: Professional
}

export interface FluxoCaixa {
  id: string
  data: Date
  tipo: "entrada" | "saida"
  categoria: string
  descricao: string
  valor: number
  conta_receber_id?: string
  conta_pagar_id?: string
  created_at: string
  updated_at: string
}

export interface DREItem {
  categoria: string
  valor: number
  percentual?: number
}

export interface DRE {
  periodo: {
    inicio: Date
    fim: Date
  }
  receita_bruta: number
  deducoes: number
  receita_liquida: number
  custos_servicos: number
  lucro_bruto: number
  margem_bruta: number
  despesas_operacionais: number
  resultado_final: number
  margem_liquida: number
  detalhes: {
    receitas: DREItem[]
    custos: DREItem[]
    despesas: DREItem[]
  }
}

export type ProdutoTipo = "revenda" | "uso_interno" | "ambos"
export type UnidadeMedida = "unidade" | "ml" | "g" | "kg" | "litro"

export interface CategoriaProduto {
  id: string
  nome: string
  cor?: string // hex
  icone?: string
  categoria_pai_id?: string | null
  descricao?: string | null
  created_at?: string
  updated_at?: string
}

export interface Fornecedor {
  id: string
  nome_fantasia: string
  razao_social?: string | null
  cnpj?: string | null
  telefone?: string | null
  whatsapp?: string | null
  email?: string | null
  responsavel?: string | null
  endereco?: {
    rua?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
  }
  prazo_entrega_dias?: number | null
  condicao_pagamento_preferida?: string | null
  observacoes?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Produto {
  id: string
  sku?: string | null
  codigo_barras?: string | null
  nome: string
  descricao?: string | null
  categoria_id?: string | null
  foto_url?: string | null
  tipo: ProdutoTipo
  unidade_medida: UnidadeMedida
  quantidade_atual: number
  quantidade_minima: number
  quantidade_maxima?: number | null
  localizacao?: string | null
  preco_custo: number
  preco_venda?: number | null
  margem_lucro?: number | null
  fornecedor_principal_id?: string | null
  fornecedores_alternativos_ids?: string[]
  rastreabilidade?: {
    numero_lote?: string | null
    data_fabricacao?: string | null
    data_validade?: string | null
    controlar_lote?: boolean
    controlar_validade?: boolean
  }
  status: "ativo" | "inativo"
  created_at: string
  updated_at: string
  observacoes?: string | null
}

export type TipoMovimentacao = "entrada" | "saida" | "ajuste" | "transferencia"
export type OrigemMovimentacao = "compra" | "servico" | "venda" | "ajuste" | "transferencia"

export interface MovimentacaoEstoque {
  id: string
  produto_id: string
  tipo: TipoMovimentacao
  quantidade: number
  quantidade_anterior?: number | null
  quantidade_nova?: number | null
  valor_unitario?: number | null
  valor_total?: number | null
  origem?: OrigemMovimentacao | null
  referencia_id?: string | null // agendamento, compra, etc
  data_hora: string
  numero_lote?: string | null
  validade?: string | null
  local_origem?: string | null
  local_destino?: string | null
  usuario_id?: string | null
  justificativa?: string | null
  observacoes?: string | null
  created_at: string
}

export interface VinculoServicoProduto {
  id: string
  servico_id: string
  produto_id: string
  quantidade_por_atendimento: number
  obrigatorio: boolean
  baixa_automatica: boolean
  created_at: string
}
