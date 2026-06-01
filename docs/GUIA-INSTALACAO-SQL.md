# 🛠️ GUIA DE INSTALAÇÃO SQL - PASSO A PASSO

## ⚠️ IMPORTANTE: Execute os scripts na ordem correta!

### 📋 PASSO 1: EXECUTAR SCHEMA BÁSICO
```sql
-- Execute: docs/sql/multitenant-schema-simples.sql
-- Este script cria todas as tabelas e índices básicos
```

**O que este script faz:**
- ✅ Cria tabelas `businesses` e `business_users`
- ✅ Adiciona `business_id` às tabelas existentes
- ✅ Cria novas tabelas ERP (customers, tables, orders, etc.)
- ✅ Cria índices para performance
- ✅ Insere business inicial "Kynitas Bar"
- ✅ Confirma emails existentes

### 📋 PASSO 2: EXECUTAR FUNÇÕES E RLS
```sql
-- Execute: docs/sql/multitenant-rls-policies.sql
-- Este script configura segurança e isolamento de dados
```

**O que este script faz:**
- ✅ Cria funções auxiliares para RLS
- ✅ Ativa Row Level Security em todas as tabelas
- ✅ Cria políticas de isolamento por business
- ✅ Migra dados existentes para o business principal

### 📋 PASSO 3: CONFIGURAR SUPER ADMIN
```sql
-- OPÇÃO A (Recomendada): Execute: docs/sql/super-admin-simples.sql
-- OPÇÃO B (Alternativa): Execute: docs/sql/configurar-super-admin.sql
-- Já configurado com email: noemarrengula1@gmail.com
```

**O que este script faz:**
- ✅ Verifica se seu usuário existe
- ✅ Confirma seu email se necessário
- ✅ Cria associação como super_admin
- ✅ Cria segundo business para testar multi-tenant
- ✅ Mostra verificação final

## 🚨 RESOLUÇÃO DE PROBLEMAS

### Erro: "relation does not exist"
**Solução:** Execute primeiro o `multitenant-schema-simples.sql`

### Erro: "function does not exist"
**Solução:** Execute o `multitenant-rls-policies.sql` após o schema

### Erro: "user not found"
**Solução:** Registre-se primeiro no sistema, depois execute o configurar-super-admin

### Erro: "syntax error at RAISE"
**Solução:** Use os novos scripts separados em vez do schema completo

## ✅ VERIFICAÇÃO FINAL

Após executar todos os scripts, execute esta query para verificar:

```sql
-- Verificar se tudo está funcionando
SELECT 
  'Businesses' as tabela,
  COUNT(*) as registros
FROM businesses
UNION ALL
SELECT 
  'Business Users' as tabela,
  COUNT(*) as registros
FROM business_users
UNION ALL
SELECT 
  'Super Admins' as tabela,
  COUNT(*) as registros
FROM business_users 
WHERE role = 'super_admin';
```

**Resultado esperado:**
- Businesses: 1 ou 2 registros
- Business Users: 1 ou 2 registros  
- Super Admins: 1 registro

## 🎯 PRÓXIMOS PASSOS

1. **Faça login no sistema** com seu email
2. **Verifique o Health Check** - deve mostrar tudo OK
3. **Teste o Business Switcher** se tiver mais de um bar
4. **Acesse Admin Central** em `/admin/central`
5. **Gere o instalador** com `npm run dist`

## 📞 SUPORTE

Se ainda houver erros:
1. Verifique se executou os scripts na ordem correta
2. Confirme que substituiu o email no script do super admin
3. Verifique se o Supabase está configurado corretamente
4. Entre em contato: marrengula1@gmail.com

---

**✨ Após seguir este guia, seu Kynitas ERP estará 100% multi-tenant!**