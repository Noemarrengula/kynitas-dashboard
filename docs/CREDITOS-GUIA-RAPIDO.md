# 💳 SISTEMA DE CRÉDITOS/DÍVIDAS - GUIA RÁPIDO

## O QUE FOI IMPLEMENTADO

**Agora você pode registrar quando um cliente leva produto a CRÉDITO (fiado)!**

```
Cliente chega              Leva produto                 Paga depois
    ↓                          ↓                             ↓
"Pode fiado?"    →    "Claro, registra"    →    "Vem o pagamento"
                    (Salva no sistema)        (Atualiza saldo)
```

---

## 🎯 COMO USAR EM 3 PASSOS

### **PASSO 1: EXECUTAR SQL (UMA VEZ)**
```
1. Abra: https://supabase.com → seu projeto
2. SQL Editor → New Query
3. Copie arquivo: supabase-creditos-dividas.sql
4. Execute (Ctrl + Enter)
5. ✅ Pronto!
```

### **PASSO 2: ACESSAR PÁGINA**
```
URL: /credits-vendas
ou procure "Créditos/Dívidas" no menu
```

### **PASSO 3: USAR**
```
1. Clique "Novo Crédito"
2. Nome do cliente: João
3. Valor: 5000
4. Registre

Depois quando ele pagar:
1. Clique no botão ✓
2. Valor do pagamento: 2000
3. Método: Dinheiro/M-Pesa/Emola/Cartão
4. Registre
```

---

## 📊 O QUE VOCÊ VÊ NA PÁGINA

### **Estatísticas no Topo (3 caixas)**
```
┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
│ Total Pendente  │  │ Créditos     │  │ Créditos     │
│ 15,000 AKZ      │  │ Ativos: 5    │  │ Pagos: 12    │
└─────────────────┘  └──────────────┘  └──────────────┘
```

### **Alerta (se tem divida)**
```
⚠️ Você tem 15,000 AKZ em créditos pendentes
```

### **Filtros**
```
[Buscar cliente...] [Filtro: Todos ▼]
```

### **Tabela**
```
Cliente    │ Telefone │ Total  │ Pago │ Pendente │ Status  │ Data      │ Ações
───────────┼──────────┼────────┼──────┼──────────┼─────────┼───────────┼──────
João Silva │ 923456.. │ 5000   │ 0    │ 5000     │ Pendente│ 30/12/25  │ ✓ ✕
Maria Neto │ 912345.. │ 3000   │ 2000 │ 1000     │ Parcial │ 29/12/25  │ ✓ ✕
```

---

## 🔄 FLUXO COMPLETO

```
1. REGISTRAR CRÉDITO
   ├─ Nome: João Silva
   ├─ Telefone: 923456789
   ├─ Valor: 5000
   └─ Notas: Bebidas para festa
   
2. SALVA NO BANCO
   ├─ ID único: abc123...
   ├─ Status: pending
   ├─ Pago: 0
   └─ Pendente: 5000

3. LISTAR CRÉDITOS
   ├─ Mostra na tabela
   ├─ Buscar por cliente
   └─ Filtrar por status

4. REGISTRAR PAGAMENTO
   ├─ Cliente paga 2000
   ├─ Status muda: partial
   └─ Pendente: 3000

5. PAGAR RESTO
   ├─ Cliente paga 3000
   ├─ Status muda: paid
   └─ Pendente: 0
```

---

## 💾 O QUE FICA SALVO

```json
Crédito:
{
  "id": "uuid",
  "cliente": "João Silva",
  "telefone": "+244 923456789",
  "total": 5000,
  "pago": 0,
  "pendente": 5000,
  "status": "pending",
  "data": "2025-12-30"
}

Pagamento:
{
  "id": "uuid",
  "credito": "abc123...",
  "valor": 2000,
  "metodo": "dinheiro",
  "data": "2025-12-31"
}
```

---

## 🎨 STATUS COM CORES

```
🔴 Pendente   = Nunca pagou
🟡 Parcial    = Pagou mas falta mais
🟢 Pago       = Tudo quitado
```

---

## ✨ FUNCIONALIDADES

| Feature | Sim? |
|---------|------|
| Registrar crédito | ✅ |
| Registrar pagamento | ✅ |
| Pagamentos parciais | ✅ |
| Ver status | ✅ |
| Buscar cliente | ✅ |
| Filtrar por status | ✅ |
| Método pagamento (4 tipos) | ✅ |
| Histórico de pagamentos | ✅ |
| Deletar crédito | ✅ |
| Total pendente calculado | ✅ |
| RLS/Segurança | ✅ |
| Multi-tenant | ✅ |

---

## 🔒 SEGURANÇA

✅ Cada negócio vê só seus créditos
✅ Não pode ver de outro dono
✅ Não pode modificar de outro dono
✅ RLS automático

---

## 📂 ARQUIVOS

Criados:
```
✅ src/pages/CreditsVendas.tsx
✅ supabase-creditos-dividas.sql
✅ SISTEMA-CREDITOS-DIVIDAS.md
✅ IMPLEMENTACAO-CREDITOS-DIVIDAS.md
```

Modificados:
```
✅ src/types/index.ts (adicionada interface Credit)
✅ src/hooks/useDatabase.ts (adicionados métodos)
✅ src/App.tsx (adicionada rota)
```

---

## ⚡ MÉTODOS DISPONÍVEIS

```typescript
import { useDatabase } from '@/hooks/useDatabase';

// Na sua página ou componente:
const { 
  credits,        // Lista de todos os créditos
  addCredit,      // Registrar novo crédito
  payCredit,      // Registrar pagamento
  deleteCredit    // Deletar crédito
} = useDatabase();
```

---

## 🚀 PRÓXIMAS MELHORIAS

```
Futuro:
[ ] Adicionar crédito direto de Sales.tsx
[ ] Relatórios em Reports.tsx
[ ] SMS de cobrança
[ ] Impressão de recibo
[ ] Gráficos de tendências
[ ] Integração WhatsApp
```

---

## ❓ PERGUNTAS COMUNS

**P: Onde fica salvo?**
R: Supabase → tabela `credits`

**P: Pode pagar parcial?**
R: Sim! Multiple vezes, qualquer valor

**P: Vê créditos de outro dono?**
R: Não! RLS impede (segurança)

**P: Como imprimir?**
R: Clique na venda em Sales History

**P: Posso deletar?**
R: Sim, clique no ✕

---

## ✅ CHECKLIST

- [x] Código implementado
- [x] Frontend pronto
- [x] Backend pronto
- [x] Rota adicionada
- [ ] **SQL EXECUTADO** ← **VOCÊ PRECISA FAZER ISSO**
- [ ] Testar criar crédito
- [ ] Testar registrar pagamento

---

## 🎯 PRÓXIMO PASSO

```
1. Abra Supabase (seu projeto)
2. SQL Editor
3. New Query
4. Copie: supabase-creditos-dividas.sql
5. Execute
6. ✅ Pronto! Pode usar
```

---

**Versão**: 1.0.0
**Status**: ✅ Pronto para usar
**Data**: 30/12/2025
