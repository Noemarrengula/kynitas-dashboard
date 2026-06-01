# ✅ Checklist de Deploy - Kynitas Dashboard

## 📋 Pré-Deploy

### Código
- [ ] Todos arquivos commitados
- [ ] Sem erros no console
- [ ] Build local funciona: `npm run build`
- [ ] Preview funciona: `npm run preview`
- [ ] Todas funcionalidades testadas

### Supabase
- [ ] Todas tabelas criadas (executar `supabase-completo.sql`)
- [ ] Negócio criado e associado ao usuário
- [ ] RLS policies ativas
- [ ] Dados de teste criados

### Variáveis de Ambiente
- [ ] `.env` local configurado
- [ ] Supabase URL copiado
- [ ] Supabase Anon Key copiado

## 🚀 Deploy Vercel

### Configuração Inicial
- [ ] Conta Vercel criada
- [ ] Repositório Git criado (GitHub/GitLab)
- [ ] Código pushed para repositório

### Import Projeto
- [ ] Projeto importado no Vercel
- [ ] Framework detectado (Vite)
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`

### Variáveis de Ambiente
- [ ] `VITE_SUPABASE_URL` configurado
- [ ] `VITE_SUPABASE_ANON_KEY` configurado
- [ ] Aplicado para Production
- [ ] Aplicado para Preview
- [ ] Aplicado para Development

### Deploy
- [ ] Primeiro deploy executado
- [ ] Build completou sem erros
- [ ] URL gerado: `https://_____.vercel.app`

## 🧪 Testes Pós-Deploy

### Autenticação
- [ ] Página de login carrega
- [ ] Registro de novo usuário funciona
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Redirect para login quando não autenticado

### Dados
- [ ] Dashboard carrega dados
- [ ] Produtos listam corretamente
- [ ] Ingredientes listam corretamente
- [ ] Vendas listam corretamente

### Funcionalidades
- [ ] Criar produto funciona
- [ ] Editar produto funciona
- [ ] Deletar produto funciona (com confirmação)
- [ ] Criar venda funciona
- [ ] Histórico de vendas carrega
- [ ] Filtros funcionam
- [ ] Busca funciona
- [ ] Paginação funciona
- [ ] Export Excel funciona
- [ ] Export CSV funciona

### Performance
- [ ] Página carrega em < 3 segundos
- [ ] Sem erros no console
- [ ] Sem warnings críticos
- [ ] Imagens carregam corretamente

### Mobile
- [ ] Layout responsivo funciona
- [ ] Menu mobile funciona
- [ ] Formulários funcionam no mobile
- [ ] Tabelas scrollam horizontalmente

## 🔧 Configurações Opcionais

### Domínio Personalizado
- [ ] Domínio adicionado no Vercel
- [ ] DNS configurado
- [ ] SSL ativo
- [ ] Redirect www → non-www (ou vice-versa)

### Supabase CORS
- [ ] Domínio Vercel adicionado em CORS
- [ ] Domínio personalizado adicionado (se aplicável)

### Analytics
- [ ] Vercel Analytics ativado
- [ ] Monitoramento de erros configurado

## 📱 Comunicação

### Equipe
- [ ] Equipe notificada do deploy
- [ ] URL compartilhado
- [ ] Credenciais de teste fornecidas
- [ ] Documentação compartilhada

### Usuários
- [ ] Usuários notificados
- [ ] Treinamento agendado
- [ ] Suporte disponível

## 🐛 Troubleshooting

### Se Build Falhar
1. Verificar logs no Vercel
2. Testar build local: `npm run build`
3. Verificar dependências
4. Verificar variáveis de ambiente

### Se Login Não Funcionar
1. Verificar Supabase URL
2. Verificar Supabase Key
3. Verificar CORS no Supabase
4. Verificar console do navegador

### Se Dados Não Carregarem
1. Verificar RLS policies
2. Verificar business_id
3. Verificar associação usuário-negócio
4. Verificar console do navegador

## 📊 Monitoramento

### Primeira Semana
- [ ] Verificar erros diariamente
- [ ] Monitorar performance
- [ ] Coletar feedback dos usuários
- [ ] Corrigir bugs críticos

### Primeira Mês
- [ ] Analisar analytics
- [ ] Identificar melhorias
- [ ] Planejar próximas features
- [ ] Otimizar performance

## ✨ Sucesso!

Quando todos os itens estiverem marcados:

🎉 **SISTEMA EM PRODUÇÃO!** 🎉

URL: `https://_____.vercel.app`

---

**Data do Deploy**: ___/___/______
**Responsável**: ________________
**Versão**: 1.0.0
