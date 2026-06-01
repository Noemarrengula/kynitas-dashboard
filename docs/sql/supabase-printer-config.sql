-- Configurações de Impressora Térmica
-- Este script adiciona suporte para configuração de impressoras térmicas

-- Tabela: Configurações de Impressora
CREATE TABLE IF NOT EXISTS printer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  printer_name TEXT NOT NULL DEFAULT 'XPrinter',
  printer_type TEXT NOT NULL DEFAULT 'thermal', -- 'thermal', 'a4', 'pos'
  
  -- Configurações de formato
  paper_width INTEGER NOT NULL DEFAULT 80, -- mm (58, 80)
  char_width INTEGER NOT NULL DEFAULT 48, -- caracteres por linha (32, 48, 64)
  font_type TEXT NOT NULL DEFAULT 'A', -- 'A' ou 'B'
  
  -- Configurações de conexão
  connection_type TEXT NOT NULL DEFAULT 'usb', -- 'usb', 'serial', 'network', 'bluetooth'
  usb_vendor_id TEXT, -- Ex: '0x0416' para XPrinter
  usb_product_id TEXT,
  serial_port TEXT, -- Ex: 'COM3' ou '/dev/ttyUSB0'
  network_ip TEXT,
  network_port INTEGER,
  baud_rate INTEGER DEFAULT 9600,
  
  -- Configurações de impressão
  auto_cut BOOLEAN DEFAULT true,
  cut_type TEXT DEFAULT 'partial', -- 'full', 'partial'
  charset TEXT DEFAULT 'portugal', -- 'portugal', 'utf8', 'cp850'
  density INTEGER DEFAULT 50, -- 0-100 (densidade de impressão)
  
  -- Configurações de recibo
  print_logo BOOLEAN DEFAULT false,
  logo_url TEXT,
  header_text TEXT,
  footer_text TEXT DEFAULT 'Obrigado pela preferencia!\nVolte sempre!',
  show_nuit BOOLEAN DEFAULT true,
  show_address BOOLEAN DEFAULT true,
  show_phone BOOLEAN DEFAULT true,
  
  -- Status
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  last_test_at TIMESTAMP,
  last_error TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_printer_settings_business ON printer_settings(business_id);
CREATE INDEX idx_printer_settings_default ON printer_settings(business_id, is_default) WHERE is_default = true;

-- RLS
ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their business printer settings" ON printer_settings
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid()
    )
  );

-- Tabela: Histórico de Impressões
CREATE TABLE IF NOT EXISTS print_jobs (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  printer_id UUID REFERENCES printer_settings(id) ON DELETE SET NULL,
  
  job_type TEXT NOT NULL, -- 'receipt', 'report', 'label'
  reference_id TEXT, -- ID da venda, relatório, etc
  
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'printing', 'completed', 'failed'
  error_message TEXT,
  
  content TEXT, -- Conteúdo ESC/POS
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  printed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_print_jobs_business ON print_jobs(business_id);
CREATE INDEX idx_print_jobs_status ON print_jobs(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_print_jobs_created ON print_jobs(created_at DESC);

-- RLS
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business print jobs" ON print_jobs
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their business print jobs" ON print_jobs
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid()
    )
  );

-- Função: Obter configuração padrão da impressora
CREATE OR REPLACE FUNCTION get_default_printer_config(business_uuid UUID)
RETURNS TABLE(
  id UUID,
  printer_name TEXT,
  char_width INTEGER,
  paper_width INTEGER,
  connection_type TEXT,
  auto_cut BOOLEAN,
  charset TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.printer_name,
    ps.char_width,
    ps.paper_width,
    ps.connection_type,
    ps.auto_cut,
    ps.charset
  FROM printer_settings ps
  WHERE ps.business_id = business_uuid
    AND ps.active = true
    AND ps.is_default = true
  LIMIT 1;
  
  -- Se não houver configuração padrão, retornar valores padrão
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::UUID,
      'XPrinter'::TEXT,
      48::INTEGER,
      80::INTEGER,
      'usb'::TEXT,
      true::BOOLEAN,
      'portugal'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Registrar trabalho de impressão
CREATE OR REPLACE FUNCTION queue_print_job(
  business_uuid UUID,
  job_type_param TEXT,
  reference_id_param TEXT,
  content_param TEXT
)
RETURNS UUID AS $$
DECLARE
  job_id BIGINT;
  printer_uuid UUID;
BEGIN
  -- Obter impressora padrão
  SELECT id INTO printer_uuid
  FROM printer_settings
  WHERE business_id = business_uuid
    AND active = true
    AND is_default = true
  LIMIT 1;
  
  -- Inserir trabalho de impressão
  INSERT INTO print_jobs (
    business_id,
    printer_id,
    job_type,
    reference_id,
    content,
    status
  ) VALUES (
    business_uuid,
    printer_uuid,
    job_type_param,
    reference_id_param,
    content_param,
    'pending'
  )
  RETURNING id INTO job_id;
  
  RETURN job_id::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Atualizar status do trabalho de impressão
CREATE OR REPLACE FUNCTION update_print_job_status(
  job_id_param BIGINT,
  new_status TEXT,
  error_msg TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE print_jobs
  SET 
    status = new_status,
    error_message = error_msg,
    printed_at = CASE WHEN new_status = 'completed' THEN NOW() ELSE printed_at END,
    retry_count = CASE WHEN new_status = 'failed' THEN retry_count + 1 ELSE retry_count END
  WHERE id = job_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Atualizar updated_at
CREATE OR REPLACE FUNCTION update_printer_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_printer_settings_timestamp
BEFORE UPDATE ON printer_settings
FOR EACH ROW
EXECUTE FUNCTION update_printer_settings_timestamp();

-- View: Estatísticas de impressão
CREATE VIEW print_statistics AS
SELECT 
  pj.business_id,
  pj.job_type,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
  AVG(retry_count) as avg_retries,
  MAX(printed_at) as last_print_at
FROM print_jobs pj
GROUP BY pj.business_id, pj.job_type;

-- Inserir configuração padrão para negócios existentes
INSERT INTO printer_settings (
  business_id,
  printer_name,
  printer_type,
  paper_width,
  char_width,
  font_type,
  connection_type,
  usb_vendor_id,
  baud_rate,
  auto_cut,
  cut_type,
  charset,
  is_default,
  active
)
SELECT 
  id as business_id,
  'XPrinter' as printer_name,
  'thermal' as printer_type,
  80 as paper_width,
  48 as char_width,
  'A' as font_type,
  'usb' as connection_type,
  '0x0416' as usb_vendor_id,
  9600 as baud_rate,
  true as auto_cut,
  'partial' as cut_type,
  'portugal' as charset,
  true as is_default,
  true as active
FROM businesses
WHERE NOT EXISTS (
  SELECT 1 FROM printer_settings ps WHERE ps.business_id = businesses.id
);

-- Comentários
COMMENT ON TABLE printer_settings IS 'Configurações de impressoras térmicas por negócio';
COMMENT ON TABLE print_jobs IS 'Fila e histórico de trabalhos de impressão';
COMMENT ON COLUMN printer_settings.char_width IS 'Número de caracteres por linha (32, 48, 64)';
COMMENT ON COLUMN printer_settings.paper_width IS 'Largura do papel em mm (58, 80)';
COMMENT ON COLUMN printer_settings.density IS 'Densidade de impressão 0-100%';
