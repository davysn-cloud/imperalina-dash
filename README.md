# Imperalina - Sistema de Agendamentos para Salão de Beleza

Sistema completo de agendamentos desenvolvido com Next.js 15, TypeScript, Supabase e shadcn/ui.

## Funcionalidades Implementadas

### ✅ Autenticação e Autorização
- Login e registro de usuários
- Três níveis de acesso: Admin, Profissional e Cliente
- Proteção de rotas com middleware
- Row Level Security (RLS) no Supabase

### ✅ Gestão de Profissionais
- Cadastro de profissionais com especialidades
- Cores de identificação personalizadas
- Biografia e informações de contato
- Listagem e edição de profissionais

### ✅ Gestão de Serviços
- Cadastro de serviços com duração e preço
- Vinculação de serviços a profissionais
- Ativação/desativação de serviços
- Listagem e edição de serviços

### ✅ Configuração de Horários
- Definição de horários de trabalho por dia da semana
- Múltiplos períodos por dia
- Ativação/desativação de horários
- Interface intuitiva para cada dia

### ✅ Sistema de Agendamentos
- Algoritmo de disponibilidade inteligente
- Seleção visual de horários disponíveis
- Validação de conflitos
- Status de agendamento (Pendente, Confirmado, Cancelado, Concluído)
- Observações personalizadas

### ✅ Calendário e Dashboard
- Visualização em calendário
- Estatísticas do sistema
- Próximos agendamentos
- Indicadores visuais por profissional

### ✅ Gestão de Clientes
- Cadastro de clientes
- Histórico de agendamentos
- Busca por nome, email ou telefone
- Informações de contato

### ✅ Sistema de Follow In/Up com IA
- **Follow In (Pré-atendimento)**: Registro de preferências e estado do cliente 30 minutos antes
- **Follow Up (Pós-atendimento)**: Registro de insights, conversas e observações técnicas
- **Perfil Comportamental**: Preferências de bebidas, música, ambiente e cuidados especiais
- **Dossiês com IA**: Geração automática de briefings personalizados usando Google Gemini
- **WhatsApp Integration**: Envio automático de dossiês via WhatsApp 30 minutos antes
- **Histórico Inteligente**: Sistema aprende com cada atendimento para melhorar o próximo

## Tecnologias Utilizadas

- **Next.js 15** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Supabase** - Backend as a Service (PostgreSQL + Auth)
- **shadcn/ui** - Componentes UI com Radix UI
- **Tailwind CSS v4** - Estilização
- **date-fns** - Manipulação de datas
- **Sonner** - Notificações toast
- **Google Gemini** - IA para geração de briefings
- **Twilio/Evolution API** - Integração WhatsApp

## Estrutura do Banco de Dados

### Tabelas
- `users` - Usuários do sistema (admin, professional, client)
- `professionals` - Dados dos profissionais
- `services` - Serviços oferecidos
- `schedules` - Horários de trabalho
- `appointments` - Agendamentos
- `client_profiles` - Perfis comportamentais dos clientes
- `appointment_follow_ins` - Informações pré-atendimento
- `appointment_follow_ups` - Informações pós-atendimento
- `ai_briefings` - Dossiês gerados por IA

### Relacionamentos
- Profissionais vinculados a usuários
- Serviços vinculados a profissionais
- Horários vinculados a profissionais
- Agendamentos vinculam clientes, profissionais e serviços
- Follow Ins/Ups vinculados a agendamentos
- Briefings vinculados a agendamentos, profissionais e clientes

## Como Usar

### 1. Configurar Variáveis de Ambiente

As variáveis do Supabase já estão configuradas no projeto v0.

**Variáveis adicionais necessárias:**

\`\`\`env
# Google Gemini AI (obrigatório para briefings)
# Obtenha sua chave em: https://makersuite.google.com/app/apikey
GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# WhatsApp via Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=+14155238886

# Cron Job Security
CRON_SECRET=your-random-secret-here

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
\`\`\`

**Como obter as credenciais:**

1. **Google Gemini API Key**:
   - Acesse: https://makersuite.google.com/app/apikey
   - Faça login com sua conta Google
   - Clique em "Create API Key"
   - Copie a chave gerada

2. **Twilio WhatsApp**:
   - Acesse: https://www.twilio.com/console
   - Crie uma conta (trial gratuito disponível)
   - Vá em Messaging > Try it out > Send a WhatsApp message
   - Obtenha suas credenciais:
     - `TWILIO_ACCOUNT_SID`: Account SID do dashboard
     - `TWILIO_AUTH_TOKEN`: Auth Token do dashboard
     - `TWILIO_WHATSAPP_NUMBER`: Número do Twilio Sandbox (+14155238886 para trial)
   - **Importante**: No trial, você precisa adicionar números de teste no Sandbox
   - Para produção, solicite aprovação do seu número WhatsApp Business

3. **CRON_SECRET**:
   - Gere uma string aleatória segura
   - Exemplo no terminal: `openssl rand -base64 32`
   - Ou use: https://www.random.org/strings/

4. **NEXT_PUBLIC_APP_URL**:
   - Desenvolvimento: `http://localhost:3000`
   - Produção: URL do seu app no Vercel (ex: `https://seu-app.vercel.app`)

### 2. Executar Scripts SQL

Os scripts SQL em `/scripts` criam as tabelas e configuram RLS:
- `01-create-tables.sql` - Cria tabelas principais
- `02-seed-data.sql` - Dados iniciais (opcional)
- `03-enable-rls.sql` - Configura Row Level Security
- `04-add-professional-permissions.sql` - Permissões de profissionais
- `05-make-user-admin.sql` - Torna usuário admin
- `06-add-client-profile.sql` - Tabela de perfis de clientes
- `07-add-follow-in.sql` - Tabela de Follow In
- `08-add-follow-up.sql` - Tabela de Follow Up
- `09-add-ai-briefings.sql` - Tabela de briefings IA

### 3. Configurar Cron Job no Vercel

O arquivo `vercel.json` já está configurado para executar o cron job a cada 5 minutos.

1. Faça deploy no Vercel
2. Vá em Settings > Environment Variables
3. Adicione todas as variáveis de ambiente necessárias
4. O cron job será ativado automaticamente

### 4. Deploy no Firebase Hosting (Next.js SSR)

Este projeto está preparado para deploy no Firebase Hosting usando o suporte nativo a Web Frameworks (Next.js SSR).

Pré-requisitos:
- Firebase CLI atualizada: `npm i -g firebase-tools`
- Login no Firebase: `firebase login`
- Projeto padrão definido em `.firebaserc` (já configurado como `imperalina-15469`)

Passos:
1) Definir variáveis de ambiente públicas (carregadas no build):

```
firebase env:set \
  NEXT_PUBLIC_SUPABASE_URL="https://<seu-projeto>.supabase.co" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="<sua-anon-key>" \
  NEXT_PUBLIC_APP_URL="https://imperalina-15469.web.app"
```

2) Definir segredos de servidor (usados em rotas API/SSR):

```
firebase functions:secrets:set SUPABASE_SERVICE_ROLE_KEY
firebase functions:secrets:set GOOGLE_GENERATIVE_AI_API_KEY
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_WHATSAPP_NUMBER
firebase functions:secrets:set CRON_SECRET
```

3) Build e deploy:

```
npm run build
firebase deploy
```

Observações importantes:
- O arquivo `firebase.json` já está configurado para Web Frameworks com região `us-central1`.
- As rotas de API do Next em `app/api/**` serão publicadas automaticamente.
- Mantenha o `SUPABASE_SERVICE_ROLE_KEY` somente como secret (NUNCA público).
- Se quiser agendar o endpoint `/api/cron/generate-briefings`, crie um Cloud Scheduler chamando a URL com header `Authorization: Bearer ${CRON_SECRET}`.

### 5. Primeiro Acesso

1. Registre-se como usuário
2. No Supabase, altere o role do primeiro usuário para "admin"
3. Faça login novamente para acessar todas as funcionalidades

### 5. Fluxo de Uso Completo

#### Configuração Inicial
1. **Admin cadastra profissionais** em `/professionals`
2. **Admin/Profissional cadastra serviços** em `/services`
3. **Profissional configura horários** em `/schedules`

#### Fluxo de Atendimento
1. **Cliente faz agendamento** em `/appointments`
2. **30 minutos antes**: Sistema gera briefing com IA e envia via WhatsApp
3. **Profissional preenche Follow In**: Registra estado e preferências do cliente
4. **Durante atendimento**: Profissional usa informações do briefing
5. **Após atendimento**: Profissional preenche Follow Up obrigatório
6. **Próximo agendamento**: IA usa histórico para gerar briefing ainda melhor

## Estrutura de Pastas

\`\`\`
app/
├── (auth)/              # Páginas de autenticação
│   ├── login/
│   └── register/
├── (dashboard)/         # Páginas protegidas
│   ├── dashboard/       # Dashboard principal
│   ├── professionals/   # Gestão de profissionais
│   ├── services/        # Gestão de serviços
│   ├── schedules/       # Configuração de horários
│   ├── appointments/    # Gestão de agendamentos
│   └── clients/         # Gestão de clientes
└── api/
    ├── availability/    # API de disponibilidade
    ├── appointments/    # APIs de agendamentos
    │   └── [id]/
    │       ├── follow-in/
    │       └── follow-up/
    ├── briefings/       # APIs de briefings
    │   ├── generate/
    │   └── [id]/
    └── cron/
        └── generate-briefings/  # Cron job

components/
├── appointments/        # Componentes de agendamentos
│   ├── follow-in-modal.tsx
│   ├── follow-in-button.tsx
│   ├── follow-up-modal.tsx
│   └── follow-up-button.tsx
└── briefings/          # Componentes de briefings
    └── briefing-viewer.tsx

lib/
├── ai/                 # Serviços de IA
│   ├── gemini-client.ts
│   ├── briefing-generator.ts
│   ├── prompts.ts
│   └── client-history.ts
├── whatsapp/           # Integração WhatsApp
│   ├── whatsapp-service.ts
│   └── message-formatter.ts
└── cron/               # Cron jobs
    └── briefing-scheduler.ts

scripts/                # Scripts SQL
\`\`\`

## Sistema de Follow In/Up e IA

### Como Funciona

1. **Perfil do Cliente**: Sistema armazena preferências de bebidas, música, temperatura, alergias, etc.

2. **Follow In (30min antes)**: Profissional registra:
   - Estado emocional do cliente
   - Preferências específicas do dia
   - Solicitações especiais
   - Restrições de tempo

3. **Follow Up (após atendimento)**: Profissional registra:
   - Contexto do serviço (casamento, formatura, etc.)
   - Assuntos conversados
   - Tópicos para retomar na próxima visita
   - Avaliação do atendimento
   - Observações técnicas

4. **Geração de Briefing**: IA analisa:
   - Perfil comportamental
   - Histórico de atendimentos
   - Follow Ups anteriores
   - Próximo serviço agendado

5. **Envio Automático**: 30 minutos antes do próximo agendamento:
   - Sistema gera briefing personalizado
   - Envia via WhatsApp para o profissional
   - Profissional chega preparado

### Benefícios

- **Atendimento Memorável**: Cliente se sente especial e lembrado
- **Eficiência**: Profissional já sabe preferências e histórico
- **Fidelização**: Experiência personalizada aumenta retenção
- **Aprendizado Contínuo**: Sistema melhora a cada atendimento
- **Oportunidades**: Identifica momentos para upsell e agendamentos

## Algoritmo de Disponibilidade

O sistema calcula horários disponíveis considerando:
1. Horários de trabalho do profissional no dia
2. Duração do serviço selecionado
3. Agendamentos já confirmados
4. Intervalos de 15 minutos entre slots

## Segurança

- Row Level Security (RLS) em todas as tabelas
- Middleware para proteção de rotas
- Validação de permissões por role
- Tokens JWT gerenciados pelo Supabase
- Cron job protegido com secret token
- Dados sensíveis criptografados

## Custos Estimados

### Google Gemini
- Modelo: gemini-1.5-pro
- ~2000 tokens por briefing
- **Grátis até 15 requisições/minuto** (tier gratuito)
- Tier pago: ~$0.00125 por briefing
- 100 briefings/mês = **GRÁTIS** ou ~$0.13 (tier pago)

### WhatsApp (Twilio)
- **Trial**: Grátis para números de teste cadastrados no Sandbox
- **Produção**: ~$0.005 por mensagem enviada
- 100 mensagens/mês = ~$0.50

### Total: 
- **Trial/Desenvolvimento**: GRÁTIS (usando tier gratuito do Gemini + Twilio Sandbox)
- **Produção**: ~$0.50/mês para 100 atendimentos

## Próximas Melhorias Sugeridas

- [x] Sistema de Follow In/Up
- [x] Geração de briefings com IA
- [x] Integração WhatsApp
- [x] Cron job automático
- [ ] Notificações por email
- [ ] Integração com calendário (Google Calendar)
- [ ] Relatórios e analytics de satisfação
- [ ] Sistema de avaliações públicas
- [ ] Pagamentos online
- [ ] App mobile
- [ ] Lembretes automáticos para clientes
- [ ] Lista de espera
- [ ] Programa de fidelidade

## Troubleshooting

### Briefings não estão sendo gerados

1. Verifique se `GOOGLE_GENERATIVE_AI_API_KEY` está configurada
2. Verifique se o cron job está ativo no Vercel
3. Verifique logs em `/api/cron/generate-briefings`
4. Teste a API Key em: https://makersuite.google.com/

### WhatsApp não está enviando

1. **Verifique credenciais do Twilio**:
   - `TWILIO_ACCOUNT_SID` está correto?
   - `TWILIO_AUTH_TOKEN` está correto?
   - `TWILIO_WHATSAPP_NUMBER` está no formato correto (+14155238886)?

2. **Trial/Sandbox**:
   - Número do profissional está cadastrado no Twilio Sandbox?
   - Profissional enviou mensagem de ativação para o Sandbox?
   - Acesse: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

3. **Produção**:
   - Seu número WhatsApp Business foi aprovado pelo Twilio?
   - Template de mensagem foi aprovado?

4. **Geral**:
   - Profissional tem telefone cadastrado no formato internacional (+5521999999999)?
   - Teste manualmente via `/api/whatsapp/send-briefing`
   - Verifique logs do Twilio em: https://console.twilio.com/us1/monitor/logs/sms

## Suporte

Para dúvidas ou problemas:
- Documentação Supabase: https://supabase.com/docs
- Documentação Next.js: https://nextjs.org/docs
- Documentação Google AI: https://ai.google.dev/docs
- Documentação Twilio: https://www.twilio.com/docs/whatsapp
