# 💰 Configurar Gaveta de Dinheiro

## 📋 Informações Necessárias

Antes de configurar, você precisa saber:

### 1. Tipo de Impressora
- ✅ Impressora térmica com gaveta
- ✅ Modelo: (ex: Epson TM-T20, Bematech MP-4200)

### 2. Conexão
**Opção A: Rede (Ethernet/WiFi)**
- IP da impressora (ex: 192.168.1.100)
- Porta: geralmente 9100

**Opção B: USB**
- Conectada via USB ao computador
- Requer driver instalado

---

## 🔧 CONFIGURAÇÃO PASSO A PASSO

### Opção 1: Impressora em Rede (Recomendado)

#### Passo 1: Descobrir IP da Impressora
```
Método 1 - Imprimir teste na impressora:
1. Desligue a impressora
2. Segure o botão FEED
3. Ligue a impressora (ainda segurando)
4. Solte quando começar a imprimir
5. Veja o IP no papel impresso

Método 2 - Verificar no roteador:
1. Acesse o roteador (192.168.1.1)
2. Veja dispositivos conectados
3. Procure pela impressora
```

#### Passo 2: Testar Conexão
```bash
# No CMD/Terminal, teste o ping:
ping 192.168.1.100

# Deve responder:
# Reply from 192.168.1.100: bytes=32 time<1ms TTL=64
```

#### Passo 3: Configurar no Sistema
```
1. Vá em: Settings (Configurações)
2. Seção: Impressora e Gaveta
3. Preencha:
   - IP: 192.168.1.100 (o IP da sua impressora)
   - Porta: 9100
   - Pino: 2 (ou 5, depende da impressora)
4. Clique em "Testar Gaveta"
5. A gaveta deve abrir!
```

---

### Opção 2: Impressora USB

#### Passo 1: Instalar Driver
```
1. Baixe o driver do fabricante
2. Instale o driver
3. Conecte a impressora via USB
4. Windows deve reconhecer automaticamente
```

#### Passo 2: Configurar Porta Virtual
```
Para USB funcionar com o sistema, você precisa:

1. Instalar software do fabricante que cria porta de rede virtual
   OU
2. Usar software como "Virtual Serial Port Driver"
   OU
3. Usar impressão direta do navegador (limitado)
```

---

## 🎯 CONFIGURAÇÕES COMUNS

### Epson TM-T20 / TM-T88
```
IP: (veja na impressora)
Porta: 9100
Pino: 2
Comando: ESC p 0 25 250
```

### Bematech MP-4200
```
IP: (veja na impressora)
Porta: 9100
Pino: 2
Comando: ESC p 0 25 250
```

### Daruma DR-800
```
IP: (veja na impressora)
Porta: 9100
Pino: 2
Comando: ESC p 0 25 250
```

---

## 🧪 TESTAR GAVETA

### Teste 1: Via Sistema
```
1. Settings > Impressora e Gaveta
2. Preencha IP e Porta
3. Clique em "Testar Gaveta"
4. Gaveta deve abrir
```

### Teste 2: Via Venda
```
1. Faça uma venda
2. Use pagamento em DINHEIRO
3. Finalize a venda
4. Gaveta deve abrir automaticamente
```

### Teste 3: Manual (CMD)
```bash
# Windows - testar conexão com impressora
telnet 192.168.1.100 9100

# Se conectar, a impressora está acessível
```

---

## ❌ PROBLEMAS COMUNS

### Problema 1: "Gaveta não abre"
**Causas:**
- IP incorreto
- Porta incorreta
- Pino incorreto (tente 2 ou 5)
- Gaveta não conectada à impressora

**Solução:**
1. Verifique IP com ping
2. Tente porta 9100, 9101, 9102
3. Tente pino 2 e depois pino 5
4. Verifique cabo RJ11/RJ12 da gaveta

---

### Problema 2: "Erro de conexão"
**Causas:**
- Impressora desligada
- Rede diferente
- Firewall bloqueando

**Solução:**
1. Ligue a impressora
2. Conecte no mesmo WiFi/rede
3. Desative firewall temporariamente

---

### Problema 3: "Funciona no teste, mas não na venda"
**Causa:**
- Configuração não salva

**Solução:**
1. Salve as configurações
2. Recarregue a página
3. Teste novamente

---

## 📊 CONFIGURAÇÃO ATUAL

Preencha aqui suas informações:

```
Modelo da Impressora: _________________
Tipo de Conexão: [ ] Rede  [ ] USB
IP (se rede): _________________
Porta: _________________
Pino: [ ] 2  [ ] 5
Status: [ ] Funcionando  [ ] Não funciona
```

---

## 🆘 PRECISA DE AJUDA?

Me diga:
1. Modelo da sua impressora
2. Como está conectada (Rede ou USB)
3. Se sabe o IP (se for rede)
4. Qual erro aparece ao testar

---

## ✅ CHECKLIST

```
□ Impressora ligada
□ Gaveta conectada à impressora (cabo RJ11/RJ12)
□ IP descoberto (se rede)
□ Ping funciona (se rede)
□ Configuração salva no sistema
□ Teste manual funcionou
□ Teste em venda funcionou
```

---

**Qual é o seu caso? Me diga o modelo da impressora e como está conectada!**
