# FASE 5: API REST para Integrações Externas

## Implementado

✅ Sistema de API Keys
✅ Webhooks para eventos
✅ Logs de webhooks
✅ Integrações externas
✅ Validação de API Keys
✅ Exportação de dados
✅ Importação de dados
✅ Estatísticas de uso da API

## Como usar

### 1. Executar SQL no Supabase
Execute o arquivo `supabase-fase5.sql` no SQL Editor

### 2. Gerar API Key
```sql
-- No SQL Editor
SELECT generate_api_key(
  'business-uuid-aqui',
  'Nome da Integração',
  '{"read": true, "write": true}',
  365 -- dias até expirar
);
```

### 3. Usar API Key
```bash
# Exemplo de requisição
curl -X GET \
  'https://seu-projeto.supabase.co/rest/v1/sales' \
  -H 'apikey: kyn_sua_chave_aqui' \
  -H 'Authorization: Bearer kyn_sua_chave_aqui'
```

### 4. Configurar Webhook
```sql
INSERT INTO webhooks (business_id, name, url, events, secret)
VALUES (
  'business-uuid',
  'Notificação de Vendas',
  'https://seu-sistema.com/webhook',
  ARRAY['sale.created', 'stock.low'],
  'seu-secret-aqui'
);
```

## Eventos de Webhook

🔔 **sale.created** - Nova venda registrada
📦 **stock.low** - Stock abaixo do mínimo
📝 **ingredient.updated** - Ingrediente atualizado
👤 **user.created** - Novo usuário adicionado

## Endpoints Disponíveis

### Vendas
- `GET /sales` - Listar vendas
- `POST /sales` - Criar venda
- `GET /sales/{id}` - Detalhes da venda

### Inventário
- `GET /ingredients` - Listar ingredientes
- `PUT /ingredients/{id}` - Atualizar ingrediente
- `POST /ingredients` - Criar ingrediente

### Relatórios
- `GET /daily_performance` - Performance diária
- `GET /top_selling_products` - Produtos mais vendidos
- `POST /rpc/profit_report` - Relatório de lucro

### Exportação
```sql
SELECT export_business_data(
  'business-uuid',
  'sales',
  '2024-01-01',
  '2024-12-31'
);
```

## Integrações Suportadas

💼 **Contabilidade** - Exportar vendas para software contábil
🚚 **Delivery** - Integração com apps de entrega
💳 **Pagamento** - Gateways de pagamento
🖥️ **POS** - Sistemas de ponto de venda

## Segurança

🔐 API Keys com hash SHA-256
⏰ Expiração configurável
🔒 Permissões granulares (read/write)
📊 Logs de uso
🚫 Revogação instantânea

## Webhook Payload Example

```json
{
  "event": "sale.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "business_id": "uuid",
  "data": {
    "sale_id": "sale-123",
    "total": 1500,
    "items_count": 5,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## Benefícios

🔗 Integração com sistemas externos
🤖 Automação de processos
📊 Sincronização de dados
🔔 Notificações em tempo real
📈 Escalabilidade
🛡️ Segurança robusta

## Resumo das 5 Fases

✅ **FASE 1**: Sincronização em Tempo Real
✅ **FASE 2**: Notificações Push e Alertas
✅ **FASE 3**: Multi-tenant
✅ **FASE 4**: Relatórios Avançados
✅ **FASE 5**: API REST e Integrações

## Sistema Completo! 🎉

O backend Supabase está totalmente configurado com:
- 15+ tabelas
- 20+ views otimizadas
- 30+ funções SQL
- Sistema de permissões RLS
- API REST completa
- Webhooks automáticos
- Relatórios em tempo real
- Multi-tenant
- Notificações push
