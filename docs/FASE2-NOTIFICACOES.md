# FASE 2: Notificações Push e Alertas

## Implementado

✅ Sistema completo de notificações
✅ Alertas automáticos de stock baixo
✅ Notificações de vendas grandes (>5000 MT)
✅ Centro de notificações no header
✅ Notificações do navegador (push)
✅ Contador de não lidas

## Como usar

### 1. Executar SQL no Supabase
Execute o arquivo `supabase-fase2.sql` no SQL Editor

### 2. Adicionar NotificationCenter ao Header
```tsx
// src/components/layout/Header.tsx
import { NotificationCenter } from '@/components/NotificationCenter';

// Adicionar no header:
<NotificationCenter />
```

### 3. Ativar Realtime para notificações
No Supabase: Database > Replication > Ativar para `notifications`

### 4. Solicitar permissão do navegador
```tsx
// No App.tsx ou Dashboard
const { requestPermission } = useNotifications();
useEffect(() => {
  requestPermission();
}, []);
```

## Tipos de Alertas

🔴 **Stock Crítico** - Quando ingrediente ≤ stock mínimo
🟢 **Venda Grande** - Quando venda ≥ 5000 MT
📊 **Resumo Diário** - Às 18:00 (configurável)
⚠️ **Sem Vendas** - Após 2h sem vendas (configurável)

## Configurações

Editar na tabela `alert_settings`:
- Ativar/desativar alertas
- Ajustar thresholds
- Configurar horários

## Próxima Fase

FASE 3: Multi-tenant (Múltiplos Estabelecimentos)
