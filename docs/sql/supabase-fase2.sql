-- FASE 2: Sistema de Notificações e Alertas

-- Tabela de notificações
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL, -- 'low_stock', 'sale', 'alert', 'info'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
  read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Função para criar notificação de stock baixo
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock <= NEW.min_stock AND (OLD.stock IS NULL OR OLD.stock > OLD.min_stock) THEN
    INSERT INTO notifications (type, title, message, severity, data)
    VALUES (
      'low_stock',
      'Stock Crítico',
      'O ingrediente ' || NEW.name || ' está com stock baixo (' || NEW.stock || ' ' || NEW.unit || ')',
      'warning',
      jsonb_build_object(
        'ingredient_id', NEW.id,
        'ingredient_name', NEW.name,
        'current_stock', NEW.stock,
        'min_stock', NEW.min_stock
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para alertas de stock baixo
CREATE TRIGGER trigger_low_stock_alert
AFTER INSERT OR UPDATE ON ingredients
FOR EACH ROW
EXECUTE FUNCTION check_low_stock();

-- Função para notificar vendas grandes
CREATE OR REPLACE FUNCTION notify_large_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total >= 5000 THEN
    INSERT INTO notifications (type, title, message, severity, data)
    VALUES (
      'sale',
      'Venda Grande!',
      'Venda de ' || NEW.total || ' MT registrada',
      'success',
      jsonb_build_object(
        'sale_id', NEW.id,
        'total', NEW.total,
        'payment_details', NEW.payment_details
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificar vendas grandes
CREATE TRIGGER trigger_large_sale_notification
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION notify_large_sale();

-- Tabela de configurações de alertas
CREATE TABLE alert_settings (
  id SERIAL PRIMARY KEY,
  alert_type TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  threshold NUMERIC,
  config JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Configurações padrão
INSERT INTO alert_settings (alert_type, enabled, threshold, config) VALUES
  ('low_stock', true, NULL, '{"check_frequency": "realtime"}'),
  ('large_sale', true, 5000, '{"notify_above": 5000}'),
  ('daily_summary', true, NULL, '{"time": "18:00"}'),
  ('no_sales', true, NULL, '{"hours_threshold": 2}');

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON notifications FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON alert_settings FOR ALL USING (true);

-- View para notificações não lidas
CREATE VIEW unread_notifications AS
SELECT * FROM notifications
WHERE read = false
ORDER BY created_at DESC;

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE notifications SET read = true WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar notificações antigas
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND read = true;
END;
$$ LANGUAGE plpgsql;
