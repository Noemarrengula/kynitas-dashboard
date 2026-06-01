# 🚀 Guia de Deploy no Vercel

## Pré-requisitos

- ✅ Conta no Vercel (https://vercel.com)
- ✅ Repositório Git (GitHub, GitLab ou Bitbucket)
- ✅ Supabase configurado e funcionando
- ✅ Build local testado (`npm run build`)

## Passo 1: Preparar o Repositório

### 1.1 Commit e Push do Código

```bash
git add .
git commit -m "feat: sistema completo pronto para deploy"
git push origin main
```

### 1.2 Verificar Arquivos Importantes

Certifique-se que estes arquivos existem:
- ✅ `vercel.json` - Configuração do Vercel
- ✅ `.env.production` - Template de variáveis
- ✅ `package.json` - Dependências
- ✅ `vite.config.ts` - Configuração Vite

## Passo 2: Criar Projeto no Vercel

### 2.1 Importar Repositório

1. Acesse https://vercel.com/new
2. Clique em "Import Git Repository"
3. Selecione seu repositório
4. Clique em "Import"

### 2.2 Configurar Build

O Vercel detectará automaticamente as configurações do `vercel.json`:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Passo 3: Configurar Variáveis de Ambiente

### 3.1 No Dashboard do Vercel

1. Vá para **Settings** > **Environment Variables**
2. Adicione as seguintes variáveis:

```
VITE_SUPABASE_URL=https://fqnelrzqvtovwegvimgj.supabase.co
VITE_SUPABASE_ANON_KEY=seu_anon_key_aqui
```

### 3.2 Obter Supabase Keys

1. Acesse seu projeto no Supabase Dashboard
2. Vá para **Settings** > **API**
3. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

### 3.3 Aplicar para Todos Ambientes

Marque as opções:
- ✅ Production
- ✅ Preview
- ✅ Development

## Passo 4: Deploy

### 4.1 Primeiro Deploy

1. Clique em **Deploy**
2. Aguarde o build (2-5 minutos)
3. Vercel fornecerá uma URL: `https://seu-projeto.vercel.app`

### 4.2 Verificar Deploy

Acesse a URL e teste:
- ✅ Login funciona
- ✅ Dados carregam do Supabase
- ✅ Criar produto funciona
- ✅ Vendas são salvas

## Passo 5: Configurar Domínio Personalizado (Opcional)

### 5.1 Adicionar Domínio

1. Vá para **Settings** > **Domains**
2. Clique em **Add**
3. Digite seu domínio: `dashboard.kynitas.com`
4. Siga instruções para configurar DNS

### 5.2 Configurar DNS

No seu provedor de domínio, adicione:

```
Type: CNAME
Name: dashboard (ou @)
Value: cname.vercel-dns.com
```

## Passo 6: Configurações Avançadas

### 6.1 Configurar Redirects

Já configurado no `vercel.json`:
- Todas rotas redirecionam para `index.html` (SPA)

### 6.2 Configurar Cache

Headers de cache já configurados para assets estáticos.

### 6.3 Configurar CORS no Supabase

1. Acesse Supabase Dashboard
2. Vá para **Settings** > **API**
3. Em **CORS**, adicione seu domínio Vercel:
   ```
   https://seu-projeto.vercel.app
   ```

## Passo 7: Deploys Automáticos

### 7.1 Configurar Auto-Deploy

Vercel já configura automaticamente:
- ✅ Push para `main` → Deploy em Production
- ✅ Pull Request → Deploy Preview
- ✅ Push para outras branches → Deploy Preview

### 7.2 Proteger Branch Main

No GitHub:
1. Settings > Branches
2. Add rule para `main`
3. Require pull request reviews

## Comandos Úteis

### Build Local (Testar antes de deploy)

```bash
npm run build
npm run preview
```

### Verificar Erros TypeScript

```bash
npm run type-check
```

### Limpar Cache e Reinstalar

```bash
rm -rf node_modules dist
npm install
npm run build
```

## Troubleshooting

### Erro: "Build failed"

1. Verifique logs no Vercel Dashboard
2. Teste build local: `npm run build`
3. Verifique erros TypeScript
4. Verifique dependências no `package.json`

### Erro: "Environment variables not found"

1. Verifique se variáveis estão configuradas no Vercel
2. Nomes devem começar com `VITE_`
3. Redeploy após adicionar variáveis

### Erro: "Cannot connect to Supabase"

1. Verifique URL e Key no Vercel
2. Verifique CORS no Supabase
3. Verifique RLS policies no Supabase

### Erro: "404 on page refresh"

1. Verifique `vercel.json` existe
2. Verifique rewrites estão configurados
3. Redeploy

## Monitoramento

### Analytics

Vercel fornece analytics automático:
- Pageviews
- Performance
- Errors

Acesse em: **Analytics** no dashboard

### Logs

Ver logs em tempo real:
- **Deployments** > Selecione deploy > **Logs**

## Custos

### Plano Hobby (Grátis)

- ✅ 100GB bandwidth/mês
- ✅ Deploys ilimitados
- ✅ Preview deployments
- ✅ SSL automático
- ✅ Domínio personalizado

Suficiente para maioria dos casos!

## Próximos Passos

1. ✅ Configurar domínio personalizado
2. ✅ Configurar analytics
3. ✅ Configurar alertas de erro
4. ✅ Documentar para equipe
5. ✅ Treinar usuários

## Suporte

- Documentação Vercel: https://vercel.com/docs
- Documentação Supabase: https://supabase.com/docs
- Comunidade: https://github.com/vercel/vercel/discussions

---

**Deploy realizado com sucesso! 🎉**

Seu sistema está online em: `https://seu-projeto.vercel.app`
