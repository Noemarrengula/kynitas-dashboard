# 📸 SISTEMA DE CRÉDITOS - COMO FUNCIONA (VISUAL)

## TELA PRINCIPAL

```
╔═══════════════════════════════════════════════════════════════════╗
║                    CRÉDITOS / DÍVIDAS                            ║
╚═══════════════════════════════════════════════════════════════════╝

┌─────────────────────┬──────────────────┬──────────────────┐
│ Total Pendente      │ Créditos Ativos  │ Créditos Pagos   │
│                     │                  │                  │
│  15,000 AKZ         │  Abertos: 5      │  Quitados: 12    │
│  4 registros        │  Aguardando $    │  100% recebido   │
└─────────────────────┴──────────────────┴──────────────────┘

⚠️  Você tem 15,000 AKZ em créditos pendentes de pagamento

┌──────────────────────────────────────────────────────────┐
│ 🔍 [Buscar cliente...]   [Filtro: Todos ▼]              │
│                                         [+ Novo Crédito] │
└──────────────────────────────────────────────────────────┘

┌────────────┬──────────┬────────┬────────┬─────────┬────────┬──────────┐
│ Cliente    │ Telefone │ Total  │ Pago   │Pendente │ Status │ Ações    │
├────────────┼──────────┼────────┼────────┼─────────┼────────┼──────────┤
│João Silva  │923456... │5000    │2000    │3000     │Parcial │ ✓   ✕   │
│Maria Neto  │912345... │3000    │0       │3000     │Pendente│ ✓   ✕   │
│Pedro Costa │933456... │2000    │2000    │0        │Pago    │     ✕   │
│Ana Santos  │944567... │5000    │0       │5000     │Pendente│ ✓   ✕   │
└────────────┴──────────┴────────┴────────┴─────────┴────────┴──────────┘
```

---

## DIALOG: NOVO CRÉDITO

```
╔═════════════════════════════════════════╗
║      REGISTRAR NOVO CRÉDITO             ║
╠═════════════════════════════════════════╣
║                                         ║
║  Nome do Cliente *                      ║
║  [João Silva_____________________]      ║
║                                         ║
║  Telefone (opcional)                    ║
║  [+244 923 456 789________________]     ║
║                                         ║
║  Valor Total *                          ║
║  [5000___________________________]      ║
║                                         ║
║  Notas (opcional)                       ║
║  [Bebidas para festa______________]    ║
║                                         ║
║        [Cancelar]  [Registrar Crédito] ║
║                                         ║
╚═════════════════════════════════════════╝
```

---

## DIALOG: REGISTRAR PAGAMENTO

```
╔════════════════════════════════════════════╗
║       REGISTRAR PAGAMENTO                  ║
║  Cliente: João Silva                       ║
╠════════════════════════════════════════════╣
║                                            ║
║  ┌──────────────────────────────────────┐ ║
║  │ Total do crédito: 5,000 AKZ          │ ║
║  │ Já pago:         2,000 AKZ           │ ║
║  │ ────────────────────────────────     │ ║
║  │ Pendente:        3,000 AKZ           │ ║
║  └──────────────────────────────────────┘ ║
║                                            ║
║  Valor do Pagamento *                      ║
║  [3000_________________________]           ║
║                                            ║
║  Método de Pagamento *                     ║
║  [Dinheiro ▼]                              ║
║   • Dinheiro                               ║
║   • M-Pesa                                 ║
║   • Emola                                  ║
║   • Cartão                                 ║
║                                            ║
║      [Cancelar]  [Registrar Pagamento]    ║
║                                            ║
╚════════════════════════════════════════════╝
```

---

## TIMELINE DE UM CRÉDITO

### **DIA 1: Cliente leva a crédito**
```
30/12/2025 14:30
┌─────────────────────────────┐
│ NOVO CRÉDITO REGISTRADO     │
│                             │
│ Cliente: João Silva         │
│ Valor: 5,000 AKZ           │
│ Status: 🔴 PENDENTE        │
│ Pago: 0 / Falta: 5,000     │
└─────────────────────────────┘
```

### **DIA 3: Primeira parcela**
```
31/12/2025 10:15
┌─────────────────────────────┐
│ PAGAMENTO RECEBIDO          │
│                             │
│ Cliente: João Silva         │
│ Pagamento: 2,000 AKZ        │
│ Método: M-Pesa              │
│ Status: 🟡 PARCIAL         │
│ Pago: 2,000 / Falta: 3,000  │
└─────────────────────────────┘
```

### **DIA 5: Segunda parcela**
```
02/01/2026 16:45
┌─────────────────────────────┐
│ PAGAMENTO RECEBIDO          │
│                             │
│ Cliente: João Silva         │
│ Pagamento: 3,000 AKZ        │
│ Método: Dinheiro            │
│ Status: 🟢 PAGO            │
│ Pago: 5,000 / Falta: 0      │
│                             │
│ ✅ CRÉDITO QUITADO!         │
└─────────────────────────────┘
```

---

## RELATÓRIO DIÁRIO

### **Antes de fechar o caixa**
```
┌──────────────────────────────┐
│   RESUMO DE CRÉDITOS         │
│                              │
│ Total de créditos abertos: 5 │
│ Total de divida: 15,000 AKZ │
│                              │
│ Pendente: 4 clientes         │
│ Parcial:  1 cliente          │
│                              │
│ Ação: Cobrar João Silva      │
│       Cobrar Maria Neto      │
│       Cobrar Pedro Costa     │
│       Cobrar Ana Santos      │
│                              │
│ ✓ Imprimir relatório         │
│ ✓ Enviar SMS cobrança        │
└──────────────────────────────┘
```

---

## EXEMPLO: JOÃO SILVA

### **Crédito Criado**
```
Data: 30/12/2025
Cliente: João Silva
Telefone: +244 923 456 789
Valor Total: 5,000 AKZ
Status: PENDENTE
```

### **Histórico de Pagamentos**
```
┌─────────────┬─────────┬──────────┬──────────────┐
│ Data        │ Valor   │ Método   │ Saldo        │
├─────────────┼─────────┼──────────┼──────────────┤
│ 30/12 14:30 │ -       │ -        │ 5,000 (novo) │
│ 31/12 10:15 │ 2,000   │ M-Pesa   │ 3,000        │
│ 02/01 16:45 │ 3,000   │ Dinheiro │ 0 (PAGO)     │
└─────────────┴─────────┴──────────┴──────────────┘
```

---

## FILTROS EM AÇÃO

### **Filtro: Pendente**
```
Mostra só clientes que nunca pagaram:
├─ João Silva (antes do 31/12)
├─ Maria Neto
├─ Ana Santos
└─ ... (3 clientes)

Esconde:
├─ Pedro Costa (já pagou 100%)
└─ João Silva (depois que pagar)
```

### **Filtro: Parcial**
```
Mostra só clientes que pagaram parcial:
├─ João Silva (depois do 31/12, antes de 02/01)
└─ ... (1 cliente)

Esconde:
├─ Maria Neto (nunca pagou)
├─ Pedro Costa (pagou 100%)
└─ João Silva (antes de começar a pagar)
```

### **Busca: "923456"**
```
Resultado:
├─ João Silva | 923456... | Status: Parcial

Esconde todos os outros
```

---

## COMO O STATUS MUDA

```
┌─────────┐     primeiro        ┌─────────┐    ultimo
│PENDENTE │────────────→───────→│ PARCIAL │──────────→──┐
│         │   pagamento 1       │         │ pagamento 2  │
└─────────┘                     └─────────┘              │
                                                         ↓
                                                    ┌─────────┐
                                                    │  PAGO   │
                                                    │ ✅ 100% │
                                                    └─────────┘

Exemplo João Silva:
30/12 Pendente 5,000
  ↓ (recebe 2,000)
31/12 Parcial 3,000
  ↓ (recebe 3,000)
02/01 Pago ✅ 0
```

---

## INTEGRAÇÃO COM OUTRAS PÁGINAS

### **Sales.tsx (Futuro)**
```
[Finalizar Venda]
    ↓
[Como deseja pagar?]
    ├─ Dinheiro
    ├─ M-Pesa
    ├─ Emola
    ├─ Cartão
    └─ 💳 Deixar a Crédito

Se escolher "A Crédito":
    ↓
[Qual o nome do cliente?] João
    ↓
[Registra automaticamente em Credits]
```

### **Reports.tsx (Futuro)**
```
┌───────────────────────────┐
│   RELATÓRIO FINANCEIRO    │
│                           │
│ Vendas a vista: 50,000    │
│ Vendas a crédito: 15,000  │
│ Créditos quitados: 10,000 │
│ Créditos pendentes: 5,000 │
│                           │
│ Clientes inadimplentes: 2 │
│ (João Silva, Maria Neto)  │
└───────────────────────────┘
```

### **Dashboard.tsx (Futuro)**
```
Card: Créditos
├─ Total pendente: 15,000
├─ Clientes: 5
└─ [Ver detalhes]
```

---

## RESPONSIVIDADE

### **Desktop (completo)**
```
┌─────────────────────────────────────────────┐
│ [Buscar] [Filtro] [Novo Crédito]            │
├─────────────────────────────────────────────┤
│ Cliente │ Telefone │ Total │ Status │ Ações │
├─────────────────────────────────────────────┤
│ ...     │ ...      │ ...   │ ...    │ ...   │
└─────────────────────────────────────────────┘
```

### **Tablet (adaptado)**
```
┌───────────────────────┐
│ [Buscar]              │
│ [Filtro] [Novo]       │
├───────────────────────┤
│ Cliente   | Status    │
│ Total     | Ações     │
├───────────────────────┤
│ ...       | ...       │
└───────────────────────┘
```

### **Mobile (empilhado)**
```
┌──────────┐
│[Buscar]  │
├──────────┤
│[Filtro]  │
├──────────┤
│[Novo]    │
├──────────┤
│ Cliente  │
│ Total    │
│ Status   │
│ Ações    │
├──────────┤
│ ...      │
└──────────┘
```

---

## CORES E ÍCONES

```
🔴 Pendente   = Badge vermelho (destructive)
🟡 Parcial    = Badge cinzento (secondary)
🟢 Pago       = Badge verde (default)

✓ = Pagar     = Botão verde (outline)
✕ = Deletar   = Botão vermelho (ghost)
+ = Novo      = Botão principal (gradient)

💾 = Salvar
🔄 = Atualizar
📊 = Relatório
```

---

## FEEDBACK AO USUÁRIO

### **Criar Crédito**
```
✅ Toast: "Crédito registrado"
   "Venda a crédito para João Silva foi salva com sucesso"
```

### **Registrar Pagamento**
```
✅ Toast: "Pagamento registrado"
   "Pagamento de 2,000 AKZ foi registrado"
   
Dialog fecha
Tabela atualiza
Status muda: Pendente → Parcial
```

### **Deletar Crédito**
```
✅ Toast: "Crédito removido"
   "O crédito foi removido com sucesso"
   
Linha desaparece da tabela
Total pendente atualiza
```

---

**Versão Visual**: 1.0.0
**Data**: 30/12/2025
**Status**: ✅ Completo
