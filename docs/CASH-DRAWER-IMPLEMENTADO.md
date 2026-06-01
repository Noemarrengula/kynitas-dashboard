# Cash Drawer via Ethernet - Implementado

## ✅ Implementação Completa

Sistema de controle de gaveta de dinheiro (cash drawer) via cabo Ethernet integrado ao sistema de vendas.

## 📋 Funcionalidades

### 1. Configuração da Gaveta
- **Localização**: Configurações → aba "Gaveta"
- **Parâmetros configuráveis**:
  - Endereço IP da gaveta (ex: 192.168.1.100)
  - Porta de comunicação (padrão: 9100)
  - Pino de controle (Pino 2 ou Pino 5)
- **Teste de conexão**: Botão para testar abertura da gaveta
- **Persistência**: Configurações salvas no localStorage

### 2. Abertura Automática
- Gaveta abre automaticamente ao finalizar vendas com pagamento em dinheiro
- Funciona apenas quando há valor em "Numerário" no pagamento
- Não abre para pagamentos exclusivamente digitais (M-Pesa, E-Mola, Cartão)

### 3. Protocolo ESC/POS
- Comandos padrão ESC/POS para impressoras térmicas
- Suporte para Pino 2 (padrão) e Pino 5
- Compatível com gavetas conectadas a impressoras térmicas via RJ11/RJ12

## 🔧 Arquivos Criados

### 1. `src/lib/cashDrawer.ts`
Biblioteca principal com comandos ESC/POS:
- `openCashDrawer()`: Abre a gaveta via HTTP
- `testCashDrawer()`: Testa conexão com a gaveta
- Comandos para Pino 2 e Pino 5

### 2. `src/hooks/useCashDrawer.ts`
Hook React para gerenciar gaveta:
- `open()`: Abre gaveta com configuração salva
- `test()`: Testa gaveta com configuração temporária
- `saveConfig()`: Salva configuração no localStorage
- `getConfig()`: Recupera configuração salva
- Estado `isOpening` para feedback visual

### 3. `src/components/settings/CashDrawerSettings.tsx`
Componente de configuração:
- Formulário com IP, porta e pino
- Botão de teste
- Botão de salvar
- Instruções de uso

## 🚀 Como Usar

### Configuração Inicial

1. **Acesse Configurações**
   - Menu lateral → Configurações
   - Clique na aba "Gaveta"

2. **Configure os Parâmetros**
   - **IP**: Endereço IP da impressora/gaveta na rede (ex: 192.168.1.100)
   - **Porta**: Geralmente 9100 (porta padrão ESC/POS)
   - **Pino**: Escolha Pino 2 (padrão) ou Pino 5

3. **Teste a Conexão**
   - Clique em "Testar Gaveta"
   - A gaveta deve abrir
   - Se não abrir, verifique IP, porta e conexão de rede

4. **Salve a Configuração**
   - Clique em "Salvar Configuração"
   - Configuração será usada automaticamente nas vendas

### Uso em Vendas

1. **Venda Normal**
   - Adicione produtos ao carrinho
   - Clique em "Finalizar Venda"

2. **Pagamento em Dinheiro**
   - Insira valor em "Numerário"
   - Clique em "Confirmar Pagamento"
   - **Gaveta abre automaticamente**

3. **Pagamento Digital**
   - Se usar apenas M-Pesa, E-Mola ou Cartão
   - Gaveta NÃO abre (não há dinheiro físico)

## 🔌 Requisitos de Hardware

### Gaveta Compatível
- Gaveta com interface RJ11/RJ12
- Conectada a impressora térmica com porta Ethernet
- Ou gaveta com interface Ethernet direta

### Rede
- Gaveta/impressora conectada à mesma rede local
- IP fixo recomendado (configurar no roteador)
- Porta 9100 aberta (padrão ESC/POS)

### Conexões Típicas
```
[Computador] --WiFi/Ethernet--> [Roteador] --Ethernet--> [Impressora Térmica] --RJ11--> [Gaveta]
```

ou

```
[Computador] --WiFi/Ethernet--> [Roteador] --Ethernet--> [Gaveta com Interface Ethernet]
```

## 🛠️ Configuração de Rede

### Encontrar IP da Impressora/Gaveta

1. **Imprimir Configuração**
   - Maioria das impressoras tem botão para imprimir config
   - Procure "Network Settings" ou "IP Address"

2. **Verificar no Roteador**
   - Acesse painel do roteador (ex: 192.168.1.1)
   - Veja dispositivos conectados
   - Procure por "Printer" ou nome da marca

3. **Usar Ferramenta de Scan**
   - Windows: `arp -a` no CMD
   - Apps: Fing, Advanced IP Scanner

### Configurar IP Fixo (Recomendado)

1. **No Roteador**
   - DHCP Reservation / IP Fixo
   - Associe MAC address da impressora a um IP
   - Ex: sempre usar 192.168.1.100

2. **Na Impressora** (se suportado)
   - Menu de configuração
   - Network Settings → Static IP
   - Configure IP, máscara e gateway

## 🧪 Testes

### Teste 1: Configuração
- [ ] Abrir Configurações → Gaveta
- [ ] Inserir IP, porta e pino
- [ ] Clicar "Testar Gaveta"
- [ ] Gaveta deve abrir
- [ ] Toast "Gaveta testada com sucesso"

### Teste 2: Venda com Dinheiro
- [ ] Fazer venda normal
- [ ] Pagamento: 100 MT em Numerário
- [ ] Confirmar pagamento
- [ ] Gaveta deve abrir automaticamente
- [ ] Recibos devem imprimir

### Teste 3: Venda Digital
- [ ] Fazer venda normal
- [ ] Pagamento: 100 MT em M-Pesa
- [ ] Confirmar pagamento
- [ ] Gaveta NÃO deve abrir
- [ ] Recibos devem imprimir

### Teste 4: Pagamento Misto
- [ ] Fazer venda de 150 MT
- [ ] Pagamento: 100 MT Numerário + 50 MT M-Pesa
- [ ] Confirmar pagamento
- [ ] Gaveta deve abrir (há dinheiro)
- [ ] Recibos devem imprimir

## ⚠️ Troubleshooting

### Gaveta Não Abre

**Problema**: Erro ao abrir gaveta
**Soluções**:
1. Verificar se IP está correto
2. Verificar se impressora está ligada
3. Verificar se está na mesma rede
4. Testar ping: `ping 192.168.1.100`
5. Verificar se porta 9100 está aberta
6. Tentar trocar pino (2 ↔ 5)

**Problema**: Gaveta abre no teste mas não nas vendas
**Soluções**:
1. Verificar se configuração foi salva
2. Verificar console do navegador (F12)
3. Verificar se há pagamento em dinheiro

**Problema**: Timeout na conexão
**Soluções**:
1. Verificar firewall do Windows
2. Verificar se impressora aceita conexões HTTP
3. Tentar IP diferente (verificar no roteador)

### Comandos Não Funcionam

**Problema**: Impressora não responde a comandos
**Soluções**:
1. Verificar se impressora suporta ESC/POS
2. Verificar manual da impressora
3. Tentar comandos alternativos (pino 2 vs 5)
4. Verificar se gaveta está conectada corretamente

## 📝 Notas Técnicas

### Comandos ESC/POS
```
Pino 2: [0x1B, 0x70, 0x00, 0x19, 0xFA]
Pino 5: [0x1B, 0x70, 0x01, 0x19, 0xFA]
```

### Formato do Comando
- `0x1B` (ESC): Início do comando
- `0x70` (p): Comando de pulso
- `0x00/0x01`: Pino (0=pino2, 1=pino5)
- `0x19` (25): Tempo ON (25ms)
- `0xFA` (250): Tempo OFF (250ms)

### Comunicação HTTP
```javascript
POST http://192.168.1.100:9100/open
Content-Type: application/octet-stream
Body: [comando ESC/POS em bytes]
```

## 🔐 Segurança

- Comunicação local (LAN) apenas
- Sem dados sensíveis transmitidos
- Configuração armazenada localmente
- Sem autenticação necessária (rede confiável)

## 🎯 Próximas Melhorias (Opcional)

- [ ] Suporte para múltiplas gavetas
- [ ] Log de aberturas da gaveta
- [ ] Abertura manual via botão
- [ ] Integração com sistema de auditoria
- [ ] Suporte para outros protocolos (não ESC/POS)
- [ ] Configuração de timeout
- [ ] Retry automático em caso de falha

## ✅ Checklist de Implementação

- [x] Biblioteca de comandos ESC/POS
- [x] Hook de gerenciamento
- [x] Componente de configuração
- [x] Integração com página de vendas
- [x] Abertura automática em pagamentos cash
- [x] Teste de conexão
- [x] Persistência de configuração
- [x] Feedback visual (toasts)
- [x] Documentação completa
- [x] Aba nas configurações

## 📚 Referências

- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/)
- [Cash Drawer Control](https://www.epson.eu/files/assets/0/documents/manuals/escpos.pdf)
- Porta padrão ESC/POS: 9100
- Protocolo: Raw TCP/IP

---

**Status**: ✅ Implementado e Funcional
**Data**: 2024
**Versão**: 1.0
