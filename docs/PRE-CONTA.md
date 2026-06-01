# 🧾 Pré-Conta - Imprimir Conta da Mesa

## ✅ Nova Funcionalidade Adicionada!

Agora você pode imprimir a conta da mesa ANTES do pagamento, mostrando:
- ✅ Itens consumidos
- ✅ Total a pagar
- ✅ Métodos de pagamento disponíveis com números

---

## 🎯 Como Usar:

### 1. Adicionar Produtos
```
1. Vá em "Vendas"
2. Adicione produtos ao carrinho
3. Veja o total no resumo
```

### 2. Imprimir Pré-Conta
```
1. Clique em "Imprimir Conta" (botão com ícone de recibo)
2. Janela de impressão abre automaticamente
3. Imprima ou cancele
```

### 3. Cliente Paga
```
Cliente vê a conta com:
- Total a pagar
- M-Pesa: 414162
- E-Mola: 98580
- Cartão: Disponível
- Dinheiro: Aceite
```

### 4. Finalizar Venda
```
Depois do pagamento:
1. Clique em "Finalizar Venda"
2. Registre o método de pagamento
3. Recibo final é impresso
```

---

## 📄 Exemplo de Pré-Conta:

```
================================================
              KYNITAS BAR
          Bar & Restaurante
        Av. Julius Nyerere, Maputo
          Tel: +258 84 000 0000
================================================

            *** PRE-CONTA ***

Data: 19/12/2024 16:30

------------------------------------------------

ITENS:

Cerveja 2M
  2x 80.00 MT                          160.00 MT
Matapa
  1x 250.00 MT                         250.00 MT

------------------------------------------------

TOTAL A PAGAR:                         410.00 MT

================================================

         METODOS DE PAGAMENTO

Paga Facil (M-Pesa):
              414162

E-Mola (Levantamento):
              98580

Cartao (P.O.S):
            Disponivel

Numerario (Dinheiro):
             Aceite

================================================

       Obrigado pela preferencia!
      Aguardamos o seu pagamento
```

---

## 🎯 Vantagens:

### Para o Cliente:
- ✅ Vê o total antes de pagar
- ✅ Tem os números para transferência
- ✅ Escolhe o método de pagamento
- ✅ Transparência total

### Para o Estabelecimento:
- ✅ Cliente já sabe o valor
- ✅ Menos confusão no pagamento
- ✅ Números de pagamento sempre visíveis
- ✅ Processo mais profissional

---

## 🔧 Configurar Números de Pagamento:

Se quiser alterar os números, edite o arquivo:
`src/pages/Sales.tsx`

Procure por:
```typescript
bill.push('Paga Facil (M-Pesa):');
bill.push(centerText('414162'));  // ← Altere aqui

bill.push('E-Mola (Levantamento):');
bill.push(centerText('98580'));   // ← Altere aqui
```

---

## 📊 Fluxo Completo:

```
1. Cliente pede conta
   ↓
2. Garçom imprime pré-conta
   ↓
3. Cliente vê total e métodos
   ↓
4. Cliente escolhe método e paga
   ↓
5. Garçom finaliza venda no sistema
   ↓
6. Recibo final é impresso
   ↓
7. Cliente recebe recibo
```

---

## 💡 Dicas:

### Quando Usar:
- ✅ Cliente pede a conta
- ✅ Mesa com vários itens
- ✅ Cliente quer ver total antes
- ✅ Pagamento por transferência

### Quando NÃO Usar:
- ❌ Venda rápida no balcão
- ❌ Cliente já sabe o valor
- ❌ Pagamento imediato

---

## 🎉 Pronto!

Agora você tem uma forma profissional de apresentar a conta aos clientes!

**Recarregue a página (F5) e teste!** 🚀
