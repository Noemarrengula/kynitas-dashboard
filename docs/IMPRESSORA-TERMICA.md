# Guia de Configuração - Impressora Térmica XPprinter

## 🖨️ Problema Resolvido

Os recibos não estavam aderindo ao formato correto da impressora térmica XPprinter. As correções implementadas incluem:

### Correções Técnicas Aplicadas:

1. **Largura Correta**: Ajustada de 42 para 48 caracteres (padrão XPprinter Font A)
2. **Comandos ESC/POS Corretos**: Implementados comandos específicos para XPprinter
3. **Charset Portugal**: Configurado para suportar caracteres especiais (ç, MT, acentos)
4. **Densidade e Velocidade**: Configurações otimizadas para impressão térmica
5. **Corte de Papel**: Implementado corte parcial automático
6. **Conexão Serial**: Melhorado suporte para Web Serial API com fallback
7. **Base de Dados**: Criada tabela para armazenar configurações da impressora

---

## 📋 Configurações da XPprinter

### Especificações Padrão:
- **Largura do Papel**: 80mm
- **Caracteres por Linha**: 48 (Font A) ou 64 (Font B)
- **Velocidade**: 9600 baud
- **USB Vendor ID**: 0x0416
- **Conexão**: USB, Serial, Bluetooth ou Rede

### Configurações Aplicadas:
```typescript
{
  width: 48,              // Caracteres por linha
  paperWidth: 80,         // mm
  baudRate: 9600,
  charset: 'portugal',    // Suporte a caracteres PT
  autoCut: true,
  cutType: 'partial'
}
```

---

## 🔧 Instalação e Configuração

### 1. Driver da Impressora

**Windows:**
```bash
# Baixar driver oficial XPprinter
# https://www.xprinter.net/download

# Instalar driver e reiniciar
```

**Linux:**
```bash
# Instalar CUPS
sudo apt-get install cups

# Adicionar impressora
sudo lpadmin -p XPrinter -E -v usb://XPrinter/XP-80C
```

### 2. Configuração no Sistema

1. Acesse **Configurações** no dashboard
2. Vá para **Impressoras**
3. Clique em **Adicionar Impressora**
4. Configure:
   - Nome: XPrinter
   - Tipo: Térmica
   - Largura: 80mm
   - Conexão: USB
   - Porta: (detectada automaticamente)

### 3. Teste de Impressão

```typescript
// No código ou via interface
import { useThermalPrinter } from '@/hooks/useThermalPrinter';

const { testPrinter } = useThermalPrinter();
await testPrinter(); // Imprime recibo de teste
```

---

## 🐛 Troubleshooting

### Problema: Recibo sai com caracteres estranhos

**Causa**: Charset incorreto
**Solução**:
```sql
-- Atualizar charset na base de dados
UPDATE printer_settings 
SET charset = 'portugal' 
WHERE business_id = 'seu-business-id';
```

### Problema: Linhas cortadas ou desalinhadas

**Causa**: Largura incorreta
**Solução**:
```sql
-- Ajustar largura para 48 caracteres
UPDATE printer_settings 
SET char_width = 48 
WHERE business_id = 'seu-business-id';
```

### Problema: Impressora não detectada

**Causa**: Permissões ou driver
**Solução**:
1. Verificar se o driver está instalado
2. No Chrome/Edge: Habilitar Web Serial API
   - `chrome://flags/#enable-experimental-web-platform-features`
3. Dar permissão quando solicitado
4. Verificar cabo USB

### Problema: Impressão muito clara ou escura

**Causa**: Densidade incorreta
**Solução**:
```sql
-- Ajustar densidade (0-100)
UPDATE printer_settings 
SET density = 70  -- Aumentar para mais escuro
WHERE business_id = 'seu-business-id';
```

### Problema: Papel não corta automaticamente

**Causa**: Configuração de corte
**Solução**:
```sql
-- Habilitar corte automático
UPDATE printer_settings 
SET auto_cut = true, cut_type = 'partial'
WHERE business_id = 'seu-business-id';
```

---

## 📊 Monitoramento de Impressões

### Ver Histórico de Impressões:
```sql
SELECT 
  job_type,
  status,
  error_message,
  created_at,
  printed_at
FROM print_jobs
WHERE business_id = 'seu-business-id'
ORDER BY created_at DESC
LIMIT 50;
```

### Estatísticas:
```sql
SELECT * FROM print_statistics
WHERE business_id = 'seu-business-id';
```

### Reprocessar Impressões Falhas:
```sql
-- Ver impressões que falharam
SELECT * FROM print_jobs
WHERE status = 'failed' 
  AND retry_count < max_retries
  AND business_id = 'seu-business-id';

-- Resetar para tentar novamente
UPDATE print_jobs
SET status = 'pending', retry_count = 0
WHERE id = 'job-id';
```

---

## 🔐 Comandos ESC/POS Implementados

```typescript
// Inicialização
ESC @ - Inicializar impressora

// Alinhamento
ESC a 0 - Esquerda
ESC a 1 - Centro
ESC a 2 - Direita

// Formatação
ESC E 1 - Negrito ON
ESC E 0 - Negrito OFF
ESC ! 0x10 - Altura dupla
ESC ! 0x20 - Largura dupla
ESC ! 0x30 - Tamanho duplo

// Charset
ESC R 0x0D - Portugal

// Corte
GS V 0 - Corte total
GS V 1 - Corte parcial

// Alimentação
LF - Nova linha
ESC d n - Alimentar n linhas
```

---

## 📱 Uso no Código

### Imprimir Recibo após Venda:

```typescript
import { useThermalPrinter } from '@/hooks/useThermalPrinter';

function SalesPage() {
  const { printReceipt, isPrinting } = useThermalPrinter();

  const handleSaleComplete = async (sale: Sale) => {
    // Processar venda...
    
    // Imprimir recibo
    const success = await printReceipt(sale);
    
    if (success) {
      console.log('Recibo impresso com sucesso');
    }
  };

  return (
    <Button 
      onClick={() => handleSaleComplete(sale)}
      disabled={isPrinting}
    >
      {isPrinting ? 'Imprimindo...' : 'Finalizar Venda'}
    </Button>
  );
}
```

### Configuração Personalizada:

```typescript
import { generateReceipt, printToThermal } from '@/lib/thermalPrinter';

const customConfig = {
  width: 48,
  businessName: 'MEU NEGÓCIO',
  businessAddress: 'Rua Principal, 123',
  businessPhone: '+258 84 123 4567',
  nuit: '123456789'
};

const receipt = generateReceipt(sale, customConfig);
await printToThermal(receipt);
```

---

## 🔄 Migração da Base de Dados

Execute o script SQL para adicionar suporte a impressoras:

```bash
# No Supabase Dashboard ou via CLI
psql -h seu-host -U seu-user -d seu-db -f supabase-printer-config.sql
```

Ou via Supabase Dashboard:
1. Acesse SQL Editor
2. Cole o conteúdo de `supabase-printer-config.sql`
3. Execute

---

## ✅ Checklist de Verificação

- [ ] Driver da XPprinter instalado
- [ ] Impressora conectada via USB
- [ ] Web Serial API habilitada no navegador
- [ ] Permissões concedidas para acessar porta serial
- [ ] Script SQL executado na base de dados
- [ ] Configuração padrão criada para o negócio
- [ ] Teste de impressão realizado com sucesso
- [ ] Largura configurada para 48 caracteres
- [ ] Charset configurado para 'portugal'
- [ ] Corte automático habilitado

---

## 📞 Suporte

Se os problemas persistirem:

1. Verificar logs no console do navegador (F12)
2. Verificar tabela `print_jobs` para erros
3. Testar impressão diretamente do Windows (Notepad → Imprimir)
4. Verificar se o papel está corretamente instalado
5. Limpar cabeça de impressão se necessário

---

## 🎯 Melhorias Futuras

- [ ] Suporte a impressão de código de barras
- [ ] Suporte a QR Code nos recibos
- [ ] Impressão de logotipo (bitmap)
- [ ] Configuração de múltiplas impressoras
- [ ] Impressão automática ao finalizar venda
- [ ] Reimpressão de recibos antigos
- [ ] Suporte a impressoras de rede (IP)
- [ ] App mobile para impressão via Bluetooth

---

**Última atualização**: 2024
**Versão**: 1.0
**Status**: ✅ Implementado e Testado
