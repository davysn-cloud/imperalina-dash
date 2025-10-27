# Configuração do GitHub Actions para Deploy na Vercel

## Secrets Necessários no GitHub

Para que o workflow funcione corretamente, você precisa configurar os seguintes secrets no seu repositório GitHub:

### 1. Acesse as Configurações do Repositório
- Vá para `Settings` > `Secrets and variables` > `Actions`
- Clique em `New repository secret`

### 2. Configure os Secrets da Vercel

#### VERCEL_TOKEN
- Acesse: https://vercel.com/account/tokens
- Clique em "Create Token"
- Dê um nome (ex: "GitHub Actions")
- Copie o token gerado
- Cole no GitHub como `VERCEL_TOKEN`

#### VERCEL_ORG_ID
- No terminal, dentro do projeto: `vercel link`
- Ou acesse: https://vercel.com/[seu-usuario]/settings
- Copie o "Team ID" ou "User ID"
- Cole no GitHub como `VERCEL_ORG_ID`

#### VERCEL_PROJECT_ID
- Após fazer `vercel link`, o ID aparece no arquivo `.vercel/project.json`
- Ou vá em: https://vercel.com/[seu-usuario]/[projeto]/settings
- Copie o "Project ID"
- Cole no GitHub como `VERCEL_PROJECT_ID`

### 3. Configure os Secrets do Supabase

#### NEXT_PUBLIC_SUPABASE_URL
- Acesse: https://supabase.com/dashboard/project/[seu-projeto]/settings/api
- Copie a "Project URL"
- Cole no GitHub como `NEXT_PUBLIC_SUPABASE_URL`

#### NEXT_PUBLIC_SUPABASE_ANON_KEY
- Na mesma página, copie a "anon public" key
- Cole no GitHub como `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### NEXT_PUBLIC_APP_URL
- URL do seu app na Vercel (ex: `https://imperalina-dash.vercel.app`)
- Cole no GitHub como `NEXT_PUBLIC_APP_URL`

## Como Funciona o Workflow

### Pull Requests
- Executa lint, TypeScript check e build
- Faz deploy de preview na Vercel
- Comenta na PR com o link do preview

### Push para Main
- Executa lint, TypeScript check e build
- Faz deploy de produção na Vercel

## Comandos Úteis

```bash
# Linkar projeto local com Vercel
vercel link

# Ver informações do projeto
vercel project ls

# Deploy manual
vercel --prod

# Ver logs de deploy
vercel logs [deployment-url]
```

## Troubleshooting

### Erro: "Project not found"
- Verifique se `VERCEL_PROJECT_ID` está correto
- Execute `vercel link` novamente

### Erro: "Insufficient permissions"
- Verifique se `VERCEL_TOKEN` tem permissões corretas
- Recrie o token se necessário

### Build falha
- Verifique se todas as variáveis de ambiente estão configuradas
- Teste o build localmente: `npm run build`