import { useState, useCallback, memo } from 'react';
import { ShoppingCart, Plus, Minus, X, Check, Receipt, FileText } from 'lucide-react';
import { PaymentModal } from '@/components/sales/PaymentModal';
import { useDatabase } from '@/hooks/useDatabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { OrderItem, Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { cn, getErrorMessage, formatCurrency } from '@/lib/utils';
import { useBusiness } from '@/contexts/BusinessContext';
import { useI18n } from '@/contexts/I18nContext';
import { sanitizeSaleData, sanitizeSearchQuery } from '@/lib/sanitize';
import { useCashDrawer } from '@/hooks/useCashDrawer';
import { useCredits } from '@/hooks/useCredits';
import { useInvoices } from '@/hooks/useInvoices';
import { printReceipt } from '@/lib/receipt';

export default function Sales() {
  const { products, ingredients, addSale, loading } = useDatabase();
  const { business } = useBusiness();
  const { open: openCashDrawer } = useCashDrawer();
  const { registerCreditCharge } = useCredits();
  const { issueInvoice, invoiceSeries } = useInvoices();
  const { t } = useI18n();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<'FS' | 'FT' | 'FC'>('FS');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomPriceDialog, setShowCustomPriceDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customPrice, setCustomPrice] = useState('');

  const [showFractionDialog, setShowFractionDialog] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [fractionProduct, setFractionProduct] = useState<Product | null>(null);
  const [bottleQty, setBottleQty] = useState(0);
  const [shotQty, setShotQty] = useState(0);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'drink' | 'meal' | 'cigarette'>('all');

  const safeSearch = sanitizeSearchQuery(search);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(safeSearch.toLowerCase());
    const matchesFilter = filter === 'all' || p.type === filter;
    return matchesSearch && matchesFilter;
  });

  const addItemToOrder = (product: Product, useCustomPrice = false) => {
    if (product.stock <= 0) {
      toast({
        title: 'Produto fora de stock',
        description: `${product.name} não está disponível`,
        variant: 'destructive',
      });
      return;
    }

    // Se o produto é fracionável (doses/shots), mostrar diálogo de seleção
    if (product.fracionavel) {
      setFractionProduct(product);
      setBottleQty(0);
      setShotQty(0);
      setShowFractionDialog(true);
      return;
    }

    // Se o produto tem "KG" no nome, mostrar diálogo de preço personalizado
    if (!useCustomPrice && product.name.toUpperCase().includes('KG')) {
      setSelectedProduct(product);
      setCustomPrice('');
      setShowCustomPriceDialog(true);
      return;
    }
    
    const existingItem = orderItems.find(i => i.productId === product.id);
    const currentQty = existingItem ? existingItem.quantity : 0;
    
    if (currentQty >= product.stock) {
      toast({
        title: 'Stock insuficiente',
        description: `Apenas ${product.stock} unidades disponíveis`,
        variant: 'destructive',
      });
      return;
    }
    
    if (existingItem) {
      setOrderItems(orderItems.map(i =>
        i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * product.price }
          : i
      ));
    } else {
      setOrderItems([
        ...orderItems,
        { productId: product.id, product, quantity: 1, subtotal: product.price }
      ]);
    }
  };

  const addItemWithCustomPrice = useCallback(() => {
    if (!selectedProduct) return;
    
    const price = parseFloat(customPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Digite um valor válido',
        variant: 'destructive',
      });
      return;
    }

    const productWithCustomPrice = { ...selectedProduct, price };
    
    setOrderItems([
      ...orderItems,
      { 
        productId: selectedProduct.id, 
        product: productWithCustomPrice, 
        quantity: 1, 
        subtotal: price 
      }
    ]);

    setShowCustomPriceDialog(false);
    setSelectedProduct(null);
    setCustomPrice('');
    
    toast({
      title: 'Produto adicionado',
      description: `${selectedProduct.name} - ${price.toLocaleString('pt-MZ')} MT`,
    });
  }, [selectedProduct, customPrice, orderItems]);

  const addFractionItems = useCallback(() => {
    if (!fractionProduct) return;

    if (bottleQty <= 0 && shotQty <= 0) {
      toast({
        title: 'Selecione uma quantidade',
        description: 'Adicione pelo menos 1 garrafa ou dose',
        variant: 'destructive',
      });
      return;
    }

    // Stock validation
    const existingBottleItem = orderItems.find(
      i => i.productId === fractionProduct.id && i.product?.name?.includes('(Garrafa)')
    );
    const existingShotItem = orderItems.find(
      i => i.productId === fractionProduct.id && i.product?.name?.includes('(Dose)')
    );
    const existingBottles = existingBottleItem ? existingBottleItem.quantity : 0;
    const existingShots = existingShotItem ? existingShotItem.quantity : 0;
    const dosesPerBottle = fractionProduct.dosesPorGarrafa || 1;
    const totalBottlesNeeded = existingBottles + bottleQty + Math.ceil((existingShots + shotQty) / dosesPerBottle);
    if (totalBottlesNeeded > fractionProduct.stock) {
      toast({
        title: 'Stock insuficiente',
        description: `Apenas ${fractionProduct.stock} ${fractionProduct.stock === 1 ? 'garrafa disponível' : 'garrafas disponíveis'}`,
        variant: 'destructive',
      });
      return;
    }

    const newItems: OrderItem[] = [];

    // Adicionar garrafas
    if (bottleQty > 0) {
      const bottleProduct = { ...fractionProduct, name: `${fractionProduct.name} (Garrafa)` };
      const existingBottle = orderItems.find(
        i => i.productId === fractionProduct.id && i.product?.name?.includes('(Garrafa)')
      );
      if (existingBottle) {
        const newQty = existingBottle.quantity + bottleQty;
        setOrderItems(prev => prev.map(i =>
          i.productId === fractionProduct.id && i.product?.name?.includes('(Garrafa)')
            ? { ...i, quantity: newQty, subtotal: newQty * fractionProduct.price }
            : i
        ));
      } else {
        newItems.push({
          productId: fractionProduct.id,
          product: bottleProduct,
          quantity: bottleQty,
          subtotal: bottleQty * fractionProduct.price,
        });
      }
    }

    // Adicionar doses
    if (shotQty > 0 && fractionProduct.precoDose) {
      const shotProduct = { ...fractionProduct, name: `${fractionProduct.name} (Dose)`, price: fractionProduct.precoDose };
      const existingShot = orderItems.find(
        i => i.productId === fractionProduct.id && i.product?.name?.includes('(Dose)')
      );
      if (existingShot) {
        const newQty = existingShot.quantity + shotQty;
        setOrderItems(prev => prev.map(i =>
          i.productId === fractionProduct.id && i.product?.name?.includes('(Dose)')
            ? { ...i, quantity: newQty, subtotal: newQty * (fractionProduct.precoDose || 0) }
            : i
        ));
      } else {
        newItems.push({
          productId: fractionProduct.id,
          product: shotProduct,
          quantity: shotQty,
          subtotal: shotQty * (fractionProduct.precoDose || 0),
        });
      }
    }

    if (newItems.length > 0) {
      setOrderItems(prev => [...prev, ...newItems]);
    }

    setShowFractionDialog(false);
    setFractionProduct(null);
    setBottleQty(0);
    setShotQty(0);
  }, [fractionProduct, bottleQty, shotQty, orderItems]);

  const updateItemQuantity = (productId: string, delta: number) => {
    const item = orderItems.find(i => i.productId === productId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    
    if (newQuantity <= 0) {
      setOrderItems(orderItems.filter(i => i.productId !== productId));
      return;
    }
    
    if (newQuantity > (item.product?.stock ?? 0)) {
      toast({
        title: 'Stock insuficiente',
        description: `Apenas ${item.product?.stock ?? 0} unidades disponíveis`,
        variant: 'destructive',
      });
      return;
    }
    
    setOrderItems(orderItems.map(i =>
      i.productId === productId
        ? { ...i, quantity: newQuantity, subtotal: newQuantity * (i.product?.price ?? 0) }
        : i
    ));
  };

  const removeItem = (productId: string) => {
    setOrderItems(orderItems.filter(i => i.productId !== productId));
  };

  const total = orderItems.reduce((acc, item) => acc + item.subtotal, 0);
  const discountAmount = total * (discountPercent / 100);
  const finalTotal = total - discountAmount;

  const handlePaymentConfirm = useCallback(async (payment: { cash: number; mpesa: number; emola: number; card: number }) => {
    try {
      const totalReceived = payment.cash + payment.mpesa + payment.emola + payment.card;
      const effectiveTotal = discountPercent > 0 ? finalTotal : total;
      const change = totalReceived - effectiveTotal;

      const saleData = {
        items: orderItems,
        total: effectiveTotal,
        discount: discountPercent,
        paymentDetails: {
          cash: payment.cash,
          mpesa: payment.mpesa,
          emola: payment.emola,
          card: payment.card,
          total: totalReceived,
          change: Math.max(0, change),
        },
        customerId: payment.customerId,
        createdAt: new Date(),
      };

      const sanitizedSale = sanitizeSaleData(saleData);
      const { data: savedSale, error } = await addSale(sanitizedSale);
      
      if (error) {
        throw error;
      }

      setLastSaleId(savedSale.id);

      // Abrir gaveta se pagamento em dinheiro
      if (payment.cash > 0) {
        await openCashDrawer();
      }

      setShowPaymentModal(false);
      setOrderItems([]);
      
      // Preparar dados para impressão
      const saleForPrint = savedSale ? {
        ...savedSale,
        items: orderItems,
        total: total,
        paymentDetails: savedSale.paymentDetails || saleData.paymentDetails,
        createdAt: savedSale.createdAt || saleData.createdAt
      } : { ...saleData, id: `sale-${Date.now()}` };

      console.log('Preparando impressão...', saleForPrint);

    // Check for low stock
    const lowStockItems = orderItems.filter(item => {
      const product = products.find(p => p.id === item.productId);
      return product && (product.stock - item.quantity) <= 5;
    });

    // Check for low ingredients
    const lowIngredients: string[] = [];
    orderItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product?.recipe) {
        product.recipe.forEach(recipeItem => {
          const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
          if (ingredient) {
            const newStock = ingredient.stock - (recipeItem.quantity * item.quantity);
            if (newStock <= ingredient.minStock && !lowIngredients.includes(ingredient.name)) {
              lowIngredients.push(ingredient.name);
            }
          }
        });
      }
    });

    toast({
      title: 'Venda registrada com sucesso!',
      description: change > 0 ? `Troco: ${change.toFixed(2)} MT` : 'Pagamento completo',
    });

    // Imprimir recibos
    setTimeout(() => {
      printReceipt(saleForPrint, 'client', business);
      setTimeout(() => printReceipt(saleForPrint, 'merchant', business), 500);
    }, 300);

    if (lowStockItems.length > 0 || lowIngredients.length > 0) {
      setTimeout(() => {
        const messages = [];
        if (lowStockItems.length > 0) messages.push(`${lowStockItems.length} produto(s)`);
        if (lowIngredients.length > 0) messages.push(`${lowIngredients.length} ingrediente(s)`);
        toast({
          title: 'Alerta de Stock!',
          description: `${messages.join(' e ')} com stock crítico`,
          variant: 'destructive',
        });
      }, 1000);
    }

    } catch (error: unknown) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: 'Erro ao processar venda',
        description: getErrorMessage(error, 'Tente novamente'),
        variant: 'destructive',
      });
    }
  }, [total, finalTotal, discountPercent, orderItems, products, ingredients, addSale, business, openCashDrawer]);

  const handleCreditConfirm = useCallback(async (customerName: string) => {
    try {
      if (!customerName.trim()) {
        toast({
          title: 'Nome do cliente obrigatório',
          description: 'Por favor, insira o nome do cliente',
          variant: 'destructive',
        });
        return;
      }

      const result = await registerCreditCharge(
        customerName.trim(),
        orderItems,
        total
      );

      if (!result.success) {
        throw new Error(result.error || 'Erro ao registrar crédito');
      }

      setShowPaymentModal(false);
      setOrderItems([]);

      const creditForPrint = {
        id: `credit-${Date.now()}`,
        customerName,
        items: orderItems,
        total: total,
        createdAt: new Date(),
      };

      setTimeout(() => {
        printReceipt(creditForPrint, 'client', business);
        setTimeout(() => printReceipt(creditForPrint, 'merchant', business), 500);
      }, 300);

      toast({
        title: 'Crédito registrado com sucesso!',
        description: `${customerName} levará ${orderItems.length} produto(s)`,
      });
    } catch (error: unknown) {
      console.error('Erro ao registar crédito:', error);
      toast({
        title: 'Erro ao registar crédito',
        description: getErrorMessage(error, 'Tente novamente'),
      });
    }
  }, [orderItems, total, registerCreditCharge, business]);

  const printPreBill = useCallback(() => {
    if (orderItems.length === 0) {
      toast({
        title: 'Carrinho vazio',
        description: 'Adicione produtos antes de imprimir a conta',
        variant: 'destructive',
      });
      return;
    }

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (!doc) return;
      
      doc.open();
      doc.write(generatePreBillHTML());
      doc.close();
      
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 100);
    } catch (error) {
      console.error('Erro ao imprimir:', error);
    }
  }, [orderItems, generatePreBillHTML]);

  function generatePreBillHTML() {
    const formatCurrency = (value: number) => `${value.toFixed(2)} MT`;
    const centerText = (text: string, width = 48) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(padding) + text;
    };
    const line = (char: string, width = 48) => char.repeat(width);
    const formatLine = (left: string, right: string, width = 48) => {
      const spaces = width - left.length - right.length;
      return left + ' '.repeat(Math.max(1, spaces)) + right;
    };

    const bill = [];
    bill.push(centerText(business?.name || 'KYNITAS BAR'));
    bill.push(centerText('Bar & Restaurante'));
    if (business?.address) bill.push(centerText(business.address));
    if (business?.phone) bill.push(centerText('Tel: ' + business.phone));
    bill.push('');
    bill.push(line('='));
    bill.push('');
    bill.push(centerText('*** PRE-CONTA ***'));
    bill.push('');
    bill.push('Data: ' + new Date().toLocaleString('pt-MZ'));
    bill.push('');
    bill.push(line('-'));
    bill.push('');
    bill.push('ITENS:');
    bill.push('');
    
    orderItems.forEach((item) => {
      bill.push(item.product?.name ?? 'Produto');
      bill.push(formatLine(`  ${item.quantity}x ${formatCurrency(item.product?.price ?? 0)}`, formatCurrency(item.subtotal)));
    });
    
    bill.push('');
    bill.push(line('-'));
    bill.push('');
    bill.push(formatLine('TOTAL A PAGAR:', formatCurrency(total)));
    bill.push('');
    bill.push(line('='));
    bill.push('');
    bill.push(centerText('METODOS DE PAGAMENTO'));
    bill.push('');
    bill.push('M-Pesa (Levantamento):');
    bill.push(centerText('414162'));
    bill.push('');
    bill.push('E-Mola (Levantamento):');
    bill.push(centerText('98580'));
    bill.push('');
    bill.push('Cartao (P.O.S):');
    bill.push(centerText('Disponivel'));
    bill.push('');
    bill.push('Numerario (Dinheiro):');
    bill.push(centerText('Aceite'));
    bill.push('');
    bill.push(line('='));
    bill.push('');
    bill.push(centerText('Obrigado pela preferencia!'));
    bill.push(centerText('Aguardamos o seu pagamento'));
    bill.push('');

    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Pre-Conta</title>
          <style>
            @page { 
              size: 80mm auto; 
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body { 
              font-family: 'Courier New', Courier, monospace;
              font-size: 13px;
              line-height: 1.4;
              width: 80mm;
              margin: 0;
              padding: 5mm;
              background: #fff;
              color: #000;
              font-weight: bold;
            }
            pre, strong { 
              margin: 0;
              padding: 0;
              white-space: pre;
              font-family: inherit;
              font-size: inherit;
              color: #000;
              font-weight: bold;
            }
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body { 
                padding: 2mm;
                background: #fff !important;
                color: #000 !important;
                font-weight: bold !important;
              }
              pre, strong {
                color: #000 !important;
                font-weight: bold !important;
              }
            }
          </style>
        </head>
        <body><pre><strong>${bill.join('\n')}</strong></pre></body>
      </html>`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={<ShoppingCart className="h-6 w-6" />}
        title={t('nav.sales')}
        description="Realizar vendas directas"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Products */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Pesquisar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'drink', label: 'Bebidas' },
                { value: 'meal', label: 'Refeições' },
                { value: 'cigarette', label: 'Cigarros' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value as typeof filter)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    filter === option.value
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <ProductButton key={product.id} product={product} onAdd={addItemToOrder} />
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-card border rounded-xl p-6 h-fit sticky top-24">
          <h3 className="font-semibold text-lg mb-4">Resumo da Venda</h3>

          {orderItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Selecione produtos para adicionar
            </p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto mb-4">
              {orderItems.map((item) => (
                <OrderItemRow
                  key={item.productId}
                  item={item}
                  onUpdateQuantity={updateItemQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
          )}

          {/* Total */}
          <div className="border-t pt-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Desconto (%)</span>
              <Input
                type="number"
                min="0"
                max="100"
                value={discountPercent || ''}
                onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="w-24 h-8 text-sm text-right"
              />
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto ({discountPercent}%)</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          {orderItems.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={printPreBill}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Imprimir Conta
              </Button>
              <Button
                variant="gradient"
                className="w-full"
                onClick={() => setShowPaymentModal(true)}
              >
                <Check className="h-4 w-4 mr-2" />
                Finalizar Venda
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={finalTotal}
        onConfirm={handlePaymentConfirm}
        onCredit={handleCreditConfirm}
      />

      {/* Fraction Dialog (Garrafa/Dose) */}
      <Dialog open={showFractionDialog} onOpenChange={(open) => { if (!open) { setFractionProduct(null); setBottleQty(0); setShotQty(0); } setShowFractionDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fractionProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Selecione o tipo e quantidade pretendida
            </p>

            {/* Garrafa */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">🍾 Garrafa</p>
                <p className="text-sm text-muted-foreground">
                  {fractionProduct?.price.toLocaleString('pt-MZ')} MT /un
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-sm" onClick={() => setBottleQty(Math.max(0, bottleQty - 1))} aria-label="Diminuir quantidade">
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{bottleQty}</span>
                <Button variant="outline" size="icon-sm" onClick={() => setBottleQty(bottleQty + 1)} aria-label="Aumentar quantidade">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Dose */}
            {fractionProduct?.precoDose && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">🥃 Dose ({fractionProduct.dosesPorGarrafa ? `1/${fractionProduct.dosesPorGarrafa}` : ''})</p>
                  <p className="text-sm text-muted-foreground">
                    {fractionProduct.precoDose.toLocaleString('pt-MZ')} MT /dose
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" onClick={() => setShotQty(Math.max(0, shotQty - 1))} aria-label="Diminuir quantidade">
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">{shotQty}</span>
                  <Button variant="outline" size="icon-sm" onClick={() => setShotQty(shotQty + 1)} aria-label="Aumentar quantidade">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Garrafas</span>
                <span>{bottleQty} x {fractionProduct?.price.toLocaleString('pt-MZ')} MT</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span>Doses</span>
                <span>{shotQty} x {fractionProduct?.precoDose?.toLocaleString('pt-MZ')} MT</span>
              </div>
              <div className="flex justify-between font-bold text-lg mt-2">
                <span>Total</span>
                <span>
                  {((bottleQty * (fractionProduct?.price || 0)) + (shotQty * (fractionProduct?.precoDose || 0))).toLocaleString('pt-MZ')} MT
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowFractionDialog(false); setFractionProduct(null); setBottleQty(0); setShotQty(0); }}>
              Cancelar
            </Button>
            <Button onClick={addFractionItems} disabled={bottleQty <= 0 && shotQty <= 0}>
              Adicionar ao Carrinho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Price Dialog */}
      <Dialog open={showCustomPriceDialog} onOpenChange={setShowCustomPriceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Valor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Produto: <span className="font-semibold">{selectedProduct?.name}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Preço base: <span className="font-semibold">{selectedProduct?.price.toLocaleString('pt-MZ')} MT/KG</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Valor a cobrar (MT)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Ex: 200, 300, 450..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addItemWithCustomPrice();
                  }
                }}
              />
              {customPrice && selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  Aproximadamente {(parseFloat(customPrice) / selectedProduct.price).toFixed(2)} KG
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomPriceDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={addItemWithCustomPrice}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir Factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <div className="flex gap-2">
                {(['FS', 'FT', 'FC'] as const).map(type => (
                  <Button
                    key={type}
                    variant={selectedDocType === type ? 'default' : 'outline'}
                    onClick={() => setSelectedDocType(type)}
                    className="flex-1"
                  >
                    {type === 'FS' ? 'Simplificada' : type === 'FT' ? 'Factura' : 'Consumidor Final'}
                  </Button>
                ))}
              </div>
            </div>
            {selectedDocType === 'FT' && (
              <div className="space-y-2">
                <Label>Cliente (NUIT obrigatório)</Label>
                <Input placeholder="Nome do cliente" />
                <Input placeholder="NUIT" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!lastSaleId) return;
              await issueInvoice(lastSaleId, selectedDocType);
              setShowInvoiceDialog(false);
              setLastSaleId(null);
            }}>
              Emitir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Banner */}
      {lastSaleId && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            size="lg"
            className="shadow-lg"
            onClick={() => setShowInvoiceDialog(true)}
          >
            <FileText className="h-5 w-5 mr-2" /> Emitir Factura
          </Button>
        </div>
      )}

    </div>
  );
}

const ProductButton = memo(({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product) => void;
}) => (
  <button
    onClick={() => onAdd(product)}
    disabled={product.stock <= 0}
    className="p-4 rounded-xl border hover:border-primary hover:shadow-md transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border"
  >
    {product.image ? (
      <img
        src={product.image}
        alt={product.name}
        className="h-20 w-full object-cover rounded-lg mb-3"
      />
    ) : (
      <div className="h-20 w-full bg-muted rounded-lg mb-3 flex items-center justify-center">
        <ShoppingCart className="h-8 w-8 text-muted-foreground" />
      </div>
    )}
    <p className="font-medium text-sm truncate">{product.name}</p>
    <div className="flex items-center justify-between mt-1">
      <span className="text-sm text-primary font-semibold">
        {product.price.toLocaleString('pt-MZ')} MT
      </span>
      <Badge
        variant={product.stock <= 0 ? 'destructive' : product.stock <= 5 ? 'outline' : 'secondary'}
        className="text-[10px]"
      >
        {product.stock <= 0 ? 'Esgotado' : product.stock}
      </Badge>
    </div>
  </button>
));

const OrderItemRow = memo(({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: OrderItem;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
}) => (
  <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
    <div className="flex items-center gap-2">
      <button
        onClick={() => onRemove(item.productId)}
        className="text-destructive hover:bg-destructive/10 p-1 rounded"
        aria-label="Remover item"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{item.product?.name ?? 'Produto'}</p>
        <p className="text-xs text-muted-foreground">{item.product?.price ?? 0} MT</p>
      </div>
    </div>
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onUpdateQuantity(item.productId, -1)}
        className="h-6 w-6"
        aria-label="Diminuir quantidade"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onUpdateQuantity(item.productId, 1)}
        className="h-6 w-6"
        aria-label="Aumentar quantidade"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  </div>
));
