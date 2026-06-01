# Sistema de Inventário - Kynitas Dashboard
**Data:** 2025-01-24

## 📦 Funcionalidades Implementadas

### 1. Gestão de Ingredientes
- **10 ingredientes** pré-cadastrados
- Cada ingrediente tem:
  - Nome
  - Stock atual
  - Unidade de medida (g, ml, un)
  - Stock mínimo
  - Custo por unidade

### 2. Receitas de Produtos
- Produtos tipo "meal" têm receitas
- Cada receita especifica:
  - Ingrediente necessário
  - Quantidade por porção
  - Unidade de medida

### 3. Dedução Automática
- **Ao vender um produto com receita:**
  - Stock do produto é reduzido
  - Ingredientes da receita são deduzidos automaticamente
  - Movimentações registradas no histórico

### 4. Alertas Inteligentes
- **Dashboard:** Mostra ingredientes críticos
- **Após venda:** Notifica se ingredientes ficaram abaixo do mínimo
- **Página de inventário:** Alerta visual para ingredientes críticos

### 5. Página de Inventário
- Grid visual com todos os ingredientes
- Barra de progresso de stock
- Valor total em stock
- Botão para adicionar stock
- Filtro de pesquisa

## 📊 Ingredientes Mock

| Ingrediente | Stock | Unidade | Mínimo | Custo/Un |
|-------------|-------|---------|--------|----------|
| Camarão | 5000g | g | 1000g | 0.5 MT |
| Alho | 500g | g | 100g | 0.02 MT |
| Manteiga | 2000g | g | 500g | 0.03 MT |
| Limão | 20 | un | 5 | 5 MT |
| Picanha | 8000g | g | 2000g | 0.8 MT |
| Sal Grosso | 1000g | g | 200g | 0.01 MT |
| Alface | 10 | un | 3 | 15 MT |
| Queijo | 1500g | g | 300g | 0.04 MT |
| Frango | 6000g | g | 1500g | 0.3 MT |
| Coco | 800ml | ml | 200ml | 0.05 MT |

## 🍽️ Receitas Configuradas

### Camarão Grelhado
- Camarão: 200g
- Alho: 10g
- Manteiga: 20g
- Limão: 1 un

### Picanha na Brasa
- Picanha: 300g
- Sal Grosso: 5g

### Salada Caesar
- Alface: 1 un
- Queijo: 30g

### Frango à Zambeziana
- Frango: 250g
- Coco: 100ml

## 🔄 Fluxo de Venda

1. Cliente pede "Camarão Grelhado" (1 porção)
2. Sistema deduz:
   - 1 unidade do produto "Camarão Grelhado"
   - 200g de Camarão
   - 10g de Alho
   - 20g de Manteiga
   - 1 un de Limão
3. Registra movimentações no histórico
4. Verifica se algum ingrediente ficou crítico
5. Alerta o usuário se necessário

## 🎯 Benefícios

✅ **Controle preciso** de ingredientes
✅ **Alertas automáticos** de reposição
✅ **Histórico completo** de movimentações
✅ **Cálculo de custos** por ingrediente
✅ **Previsão de compras** baseada em vendas

---

**Sistema completo e funcional!** 🎉
