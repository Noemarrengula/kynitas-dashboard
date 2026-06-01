# 💳 Sistema de Vales (Crédito/Fiado)

## 📋 Visão Geral

O sistema de vales permite que clientes regulares comprem a crédito (fiado) e paguem posteriormente. É essencial para fidelização e gestão de clientes frequentes.

## ✨ Funcionalidades

### 1. Cadastro de Clientes
- Nome completo
- Telefone (identificação principal)
- Email (opcional)
- Endereço
- Limite de crédito personalizado
- Status (ativo, bloqueado, inativo)
- Notas/observações

### 2. Controle de Crédito
- **Limite de Crédito**: Valor máximo que cliente pode dever
- **Saldo Atual**: Dívida atual do cliente
- **Crédito Disponível**: Quanto ainda pode comprar
- **Bloqueio Automático**: Quando excede limite

### 3. Vendas a Crédito
- Registrar venda normalmente
- Selecionar cliente
- Verificar limite disponível
- Atualizar saldo automaticamente
- Gerar comprovante

### 4. Recebimento de Pagamentos
- Pagamento total ou parcial
- Múltiplos métodos (dinheiro, M-Pesa, etc)
- Histórico de pagamentos
- Recibo de pagamento

### 5. Relatórios
- Clientes com dívida
- Total de crédito concedido
- Histórico por cliente
- Análise de inadimplência

## 🗄️ Estrutura do Banco de Dados

### Tabela: customers
```sql
- id: UUID
- business_id: UUID
- name: TEXT
- phone: TEXT
- email: TEXT
- address: TEXT
- credit_limit: DECIMAL (limite de crédito)
- current_balance: DECIMAL (dívida atual)
- status: TEXT (active, blocked, inactive)
- notes: TEXT
```

### Tabela: credit_transactions
```sql
- id: UUID
- business_id: UUID
- customer_id: UUID
- type: TEXT (charge, payment, adjustment)
- amount: DECIMAL
- balance_before: DECIMAL
- balance_after: DECIMAL
- sale_id: UUID (referência à venda)
- payment_method: TEXT
- description: TEXT
- created_by: UUID (usuário que registrou)
```

## 🔄 Fluxo de Uso

### Cadastrar Cliente

1. Ir para **Vales** > **Novo Cliente**
2. Preencher dados do cliente
3. Definir limite de crédito (ex: 5.000 MT)
4. Salvar

### Vender a Crédito

1. No PDV, adicionar produtos ao carrinho
2. Clicar em **Venda a Crédito**
3. Selecionar cliente
4. Sistema verifica:
   - Cliente está ativo?
   - Tem limite disponível?
5. Se OK, registra venda e atualiza saldo
6. Imprimir comprovante

### Receber Pagamento

1. Ir para **Vales**
2. Selecionar cliente
3. Clicar em **Receber Pagamento**
4. Informar valor e método
5. Sistema atualiza saldo
6. Imprimir recibo

## 📊 Exemplo Prático

### Cenário: João Silva

**Cadastro Inicial:**
- Limite de Crédito: 5.000 MT
- Saldo Atual: 0 MT
- Crédito Disponível: 5.000 MT

**Dia 1 - Venda a Crédito:**
- Compra: 3 cervejas = 150 MT
- Novo Saldo: 150 MT
- Disponível: 4.850 MT

**Dia 3 - Nova Venda:**
- Compra: Refeição = 300 MT
- Novo Saldo: 450 MT
- Disponível: 4.550 MT

**Dia 5 - Pagamento:**
- Paga: 200 MT (dinheiro)
- Novo Saldo: 250 MT
- Disponível: 4.750 MT

**Dia 10 - Pagamento Final:**
- Paga: 250 MT (M-Pesa)
- Novo Saldo: 0 MT
- Disponível: 5.000 MT

## ⚠️ Regras de Negócio

### Limites
- Cada cliente tem limite personalizado
- Sistema bloqueia venda se exceder limite
- Gerente pode ajustar limite a qualquer momento

### Bloqueios
- Cliente bloqueado não pode comprar a crédito
- Bloqueio manual (inadimplência, problemas)
- Desbloqueio após regularização

### Segurança
- Apenas gerentes podem:
  - Criar/editar clientes
  - Ajustar limites
  - Fazer ajustes manuais
- Staff pode:
  - Vender a crédito
  - Receber pagamentos
  - Ver histórico

## 📈 Relatórios Disponíveis

### 1. Clientes com Dívida
- Lista todos com saldo > 0
- Ordenado por valor (maior primeiro)
- Filtros por status

### 2. Histórico por Cliente
- Todas transações
- Vendas e pagamentos
- Saldo ao longo do tempo

### 3. Análise de Crédito
- Total concedido
- Total recebido
- Taxa de inadimplência
- Clientes mais endividados

### 4. Alertas
- Clientes próximos do limite (>80%)
- Clientes sem movimento há X dias
- Dívidas antigas (>30 dias)

## 🎯 Melhores Práticas

### Definir Limites
- Começar conservador (ex: 2.000 MT)
- Aumentar conforme histórico
- Considerar frequência de visitas
- Avaliar capacidade de pagamento

### Gestão de Risco
- Revisar dívidas semanalmente
- Cobrar clientes com saldo alto
- Bloquear inadimplentes
- Oferecer descontos para pagamento à vista

### Comunicação
- Avisar cliente quando próximo do limite
- Lembrar de dívidas pendentes
- Agradecer pagamentos
- Manter relacionamento

### Controle
- Auditar transações regularmente
- Verificar ajustes manuais
- Monitorar taxa de inadimplência
- Treinar equipe

## 🔧 Configurações

### Limite Padrão
Definir limite padrão para novos clientes (ex: 2.000 MT)

### Alertas
- Alerta quando cliente atinge 80% do limite
- Notificação de dívidas antigas
- Resumo diário de crédito concedido

### Permissões
- Quem pode criar clientes
- Quem pode ajustar limites
- Quem pode fazer ajustes manuais

## 💡 Dicas

### Para Aumentar Vendas
- Oferecer crédito para clientes regulares
- Facilitar pagamento (M-Pesa, cartão)
- Programa de fidelidade

### Para Reduzir Inadimplência
- Limite inicial baixo
- Aumentar gradualmente
- Cobrar regularmente
- Bloquear rapidamente se necessário

### Para Melhorar Relacionamento
- Lembrar nome dos clientes
- Conhecer preferências
- Oferecer benefícios
- Manter comunicação

## 📱 Interface do Sistema

### Dashboard de Vales
- Total de dívida
- Clientes ativos
- Clientes bloqueados
- Ticket médio

### Lista de Clientes
- Cards com informações principais
- Barra de progresso do crédito
- Status visual (cores)
- Ações rápidas

### Histórico do Cliente
- Timeline de transações
- Vendas e pagamentos
- Saldo ao longo do tempo
- Gráfico de evolução

## 🚀 Implementação

### 1. Executar SQL
```bash
# No Supabase SQL Editor
# Executar: supabase-vales.sql
```

### 2. Adicionar Rota
```typescript
// Em App.tsx
<Route path="/credits" element={<Credits />} />
```

### 3. Adicionar ao Menu
```typescript
// Em Sidebar.tsx
{
  title: 'Vales',
  icon: CreditCard,
  href: '/credits'
}
```

### 4. Testar
1. Criar cliente de teste
2. Fazer venda a crédito
3. Receber pagamento
4. Verificar histórico

## 📞 Suporte

Para dúvidas sobre o sistema de vales:
- Consultar esta documentação
- Ver exemplos práticos
- Testar com dados fictícios primeiro

---

**Sistema de Vales implementado com sucesso!** 💳✨
