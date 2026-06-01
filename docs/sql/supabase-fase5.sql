-- FASE 5: API REST e Integrações Externas

-- Tabela: API Keys para integrações
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  permissions JSONB DEFAULT '{"read": true, "write": false}',
  active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_keys_business ON api_keys(business_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their business API keys" ON api_keys
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tabela: Webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- ['sale.created', 'stock.low', 'ingredient.updated']
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 3,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhooks_business ON webhooks(business_id);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their business webhooks" ON webhooks
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tabela: Webhook logs
CREATE TABLE webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- Tabela: Integrações externas
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'accounting', 'delivery', 'payment', 'pos'
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  credentials JSONB, -- Encrypted
  active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_integrations_business ON integrations(business_id);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their business integrations" ON integrations
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Função: Gerar API Key
CREATE OR REPLACE FUNCTION generate_api_key(
  business_uuid UUID,
  key_name TEXT,
  key_permissions JSONB DEFAULT '{"read": true, "write": false}',
  expires_days INTEGER DEFAULT 365
)
RETURNS TEXT AS $$
DECLARE
  new_key TEXT;
  key_hash TEXT;
BEGIN
  -- Gerar chave aleatória
  new_key := 'kyn_' || encode(gen_random_bytes(32), 'hex');
  
  -- Hash da chave para armazenar
  key_hash := encode(digest(new_key, 'sha256'), 'hex');
  
  -- Inserir na tabela
  INSERT INTO api_keys (business_id, name, key_hash, permissions, expires_at)
  VALUES (
    business_uuid,
    key_name,
    key_hash,
    key_permissions,
    CURRENT_TIMESTAMP + (expires_days || ' days')::INTERVAL
  );
  
  -- Retornar chave (única vez que será visível)
  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Validar API Key
CREATE OR REPLACE FUNCTION validate_api_key(api_key TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  business_id UUID,
  permissions JSONB
) AS $$
DECLARE
  key_hash TEXT;
  key_record RECORD;
BEGIN
  -- Hash da chave fornecida
  key_hash := encode(digest(api_key, 'sha256'), 'hex');
  
  -- Buscar chave
  SELECT * INTO key_record
  FROM api_keys
  WHERE api_keys.key_hash = key_hash
    AND active = true
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
  
  IF FOUND THEN
    -- Atualizar último uso
    UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP
    WHERE api_keys.key_hash = key_hash;
    
    RETURN QUERY SELECT true, key_record.business_id, key_record.permissions;
  ELSE
    RETURN QUERY SELECT false, NULL::UUID, NULL::JSONB;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Trigger webhook
CREATE OR REPLACE FUNCTION trigger_webhook(
  webhook_uuid UUID,
  event_name TEXT,
  event_payload JSONB
)
RETURNS void AS $$
DECLARE
  webhook_record RECORD;
BEGIN
  SELECT * INTO webhook_record FROM webhooks WHERE id = webhook_uuid AND active = true;
  
  IF FOUND AND event_name = ANY(webhook_record.events) THEN
    -- Registrar log
    INSERT INTO webhook_logs (webhook_id, event, payload)
    VALUES (webhook_uuid, event_name, event_payload);
    
    -- Atualizar último trigger
    UPDATE webhooks SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = webhook_uuid;
    
    -- Nota: A chamada HTTP real seria feita por um worker externo
    -- que monitora a tabela webhook_logs
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Notificar webhook em nova venda
CREATE OR REPLACE FUNCTION notify_sale_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook RECORD;
BEGIN
  FOR webhook IN 
    SELECT id FROM webhooks 
    WHERE business_id = NEW.business_id 
      AND 'sale.created' = ANY(events)
      AND active = true
  LOOP
    PERFORM trigger_webhook(
      webhook.id,
      'sale.created',
      jsonb_build_object(
        'sale_id', NEW.id,
        'total', NEW.total,
        'items_count', jsonb_array_length(NEW.items),
        'created_at', NEW.created_at
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sale_webhook
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION notify_sale_webhook();

-- Trigger: Notificar webhook em stock baixo
CREATE OR REPLACE FUNCTION notify_low_stock_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook RECORD;
BEGIN
  IF NEW.stock <= NEW.min_stock AND (OLD.stock IS NULL OR OLD.stock > OLD.min_stock) THEN
    FOR webhook IN 
      SELECT id FROM webhooks 
      WHERE business_id = NEW.business_id 
        AND 'stock.low' = ANY(events)
        AND active = true
    LOOP
      PERFORM trigger_webhook(
        webhook.id,
        'stock.low',
        jsonb_build_object(
          'ingredient_id', NEW.id,
          'ingredient_name', NEW.name,
          'current_stock', NEW.stock,
          'min_stock', NEW.min_stock
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_low_stock_webhook
AFTER INSERT OR UPDATE ON ingredients
FOR EACH ROW
EXECUTE FUNCTION notify_low_stock_webhook();

-- View: API usage statistics
CREATE VIEW api_usage_stats AS
SELECT 
  ak.business_id,
  ak.name as api_key_name,
  COUNT(*) as total_requests,
  MAX(ak.last_used_at) as last_used,
  ak.active,
  ak.expires_at
FROM api_keys ak
GROUP BY ak.business_id, ak.name, ak.active, ak.expires_at;

-- Função: Exportar dados para integração
CREATE OR REPLACE FUNCTION export_business_data(
  business_uuid UUID,
  data_type TEXT, -- 'sales', 'inventory', 'customers'
  start_date TIMESTAMP DEFAULT NULL,
  end_date TIMESTAMP DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF data_type = 'sales' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'total', total,
        'items', items,
        'payment_details', payment_details,
        'created_at', created_at
      )
    ) INTO result
    FROM sales
    WHERE business_id = business_uuid
      AND (start_date IS NULL OR created_at >= start_date)
      AND (end_date IS NULL OR created_at <= end_date);
      
  ELSIF data_type = 'inventory' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'stock', stock,
        'min_stock', min_stock,
        'cost_per_unit', cost_per_unit
      )
    ) INTO result
    FROM ingredients
    WHERE business_id = business_uuid;
    
  END IF;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Importar dados de integração
CREATE OR REPLACE FUNCTION import_external_data(
  business_uuid UUID,
  data_type TEXT,
  data JSONB
)
RETURNS JSON AS $$
DECLARE
  imported_count INTEGER := 0;
  failed_count INTEGER := 0;
BEGIN
  -- Implementar lógica de importação baseada no tipo
  -- Exemplo simplificado
  
  RETURN json_build_object(
    'success', true,
    'imported', imported_count,
    'failed', failed_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
