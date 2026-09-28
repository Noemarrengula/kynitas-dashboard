import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useBusiness } from '@/contexts/BusinessContext';
import { useDatabase } from '@/hooks/useDatabase';
import { useCashDrawer } from '@/hooks/useCashDrawer';
import { useCredits } from '@/hooks/useCredits';
import { useInvoices } from '@/hooks/useInvoices';
import { usePermissions } from '@/hooks/usePermissions';
import { useTablesPersistence } from '@/hooks/useTablesPersistence';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage, formatCurrency } from '@/lib/utils';
import { sanitizeSaleData, sanitizeSearchQuery } from '@/lib/sanitize';
import { printReceipt, printPreBill } from '@/lib/receipt';
import { getOnline } from '@/lib/offline';
import { generateUUID } from '@/lib/uuid';
import { getSuspendedSales, addSuspendedSale, removeSuspendedSale } from '@/lib/suspendedSales';
import { PosToolbar } from '@/components/pos/PosToolbar';
import { CategoryRail, ALL_CATEGORY } from '@/components/pos/CategoryRail';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { OrderPanel } from '@/components/pos/OrderPanel';
import { PaymentDialog } from '@/components/pos/PaymentDialog';
import type { PaymentConfirm } from '@/components/pos/PaymentDialog';
import { SaleSuccessPanel } from '@/components/pos/SaleSuccessPanel';
import type { CompletedSaleInfo } from '@/components/pos/SaleSuccessPanel';
import { SuspendedListSheet } from '@/components/pos/SuspendedListSheet';
import type { Product } from '@/types';
import type { Order } from '@/types';
import type {
  CartItem,
  PosCustomer,
  PosTableRef,
  SaleDiscount,
  SuspendedSale,
} from '@/types/domains/pos';

type SaleForPrint = Parameters<typeof printReceipt>[0];

export default function Sales() {
  const { products, ingredients, addSale, loading } = useDatabase();
  const { business } = useBusiness();
  const { open: openCashDrawer } = useCashDrawer();
  const { registerCreditCharge } = useCredits();
  const { issueInvoice } = useInvoices();
  const { can } = usePermissions();
  const { updateOrder, updateTable, addOrder } = useTablesPersistence();
  const { online, pendingCount } = useOfflineSync();
  const { log: auditLog } = useAuditLog();
  const tables = useStore(s => s.tables);
  const orders = useStore(s => s.orders);

  const businessId = business?.id;

  // Mesa pré-seleccionada via ?mesa=<id> (vinda do mapa de Mesas)
  const [searchParams, setSearchParams] = useSearchParams();
  const [sendingKitchen, setSendingKitchen] = useState(false);
  const [kitchenSentRef, setKitchenSentRef] = useState<string | null>(null);

  // Carrinho
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<SaleDiscount>({ type: 'percent', value: 0 });
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [table, setTable] = useState<PosTableRef | null>(null);
  const [lastRemoved, setLastRemoved] = useState<CartItem[] | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedSaleInfo | null>(null);

  // Pesquisa e categoria
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(ALL_CATEGORY);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Diálogos de produto (fracionável e preço por peso)
  const [showFractionDialog, setShowFractionDialog] = useState(false);
  const [fractionProduct, setFractionProduct] = useState<Product | null>(null);
  const [bottleQty, setBottleQty] = useState(0);
  const [shotQty, setShotQty] = useState(0);
  const [showCustomPriceDialog, setShowCustomPriceDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customPrice, setCustomPrice] = useState('');

  // Pagamento / factura
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const printCopiesRef = useRef<SaleForPrint | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [emittingInvoice, setEmittingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<'FS' | 'FT' | 'FC'>('FS');
  const [clientName, setClientName] = useState('');
  const [clientNuit, setClientNuit] = useState('');

  // Vendas suspensas
  const [suspendedSheetOpen, setSuspendedSheetOpen] = useState(false);
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);

  useEffect(() => {
    setSuspendedSales(getSuspendedSales(businessId));
  }, [businessId]);

  const safeSearch = sanitizeSearchQuery(search);

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b, 'pt'));

  const counts: Record<string, number> = { [ALL_CATEGORY]: products.length };
  for (const c of categories) {
    counts[c] = products.filter(p => p.category === c).length;
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = !safeSearch || p.name.toLowerCase().includes(safeSearch.toLowerCase());
    const matchesCategory = category === ALL_CATEGORY || p.category === category;
    return matchesSearch && matchesCategory;
  });

  const searchResults = (() => {
    if (!safeSearch) return [];
    return products
      .filter(p => p.name.toLowerCase().includes(safeSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
      .slice(0, 6);
  })();

  const subtotal = orderItems.reduce((acc, item) => acc + item.subtotal, 0);
  const discountAmount =
    discount.type === 'percent'
      ? (subtotal * discount.value) / 100
      : Math.min(discount.value, subtotal);
  const total = Math.max(0, subtotal - discountAmount);

  const uidForProduct = (product: Product) => product.id;
  const uidForFraction = (product: Product, kind: 'bottle' | 'shot') => `${product.id}#${kind}`;

  const addItemToOrder = (product: Product, useCustomPrice = false) => {
    if (product.stock <= 0) {
      toast({
        title: 'Produto fora de stock',
        description: `${product.name} não está disponível`,
        variant: 'destructive',
      });
      return;
    }

    if (product.fracionavel) {
      setFractionProduct(product);
      setBottleQty(0);
      setShotQty(0);
      setShowFractionDialog(true);
      return;
    }

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
        { productId: product.id, uid: uidForProduct(product), product, quantity: 1, subtotal: product.price },
      ]);
    }
  };

  const addItemWithCustomPrice = () => {
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
        uid: uidForProduct(selectedProduct),
        product: productWithCustomPrice,
        quantity: 1,
        subtotal: price,
      },
    ]);

    setShowCustomPriceDialog(false);
    setSelectedProduct(null);
    setCustomPrice('');

    toast({
      title: 'Produto adicionado',
      description: `${selectedProduct.name} - ${price.toLocaleString('pt-MZ')} MT`,
    });
  };

  const addFractionItems = () => {
    if (!fractionProduct) return;

    if (bottleQty <= 0 && shotQty <= 0) {
      toast({
        title: 'Selecione uma quantidade',
        description: 'Adicione pelo menos 1 garrafa ou dose',
        variant: 'destructive',
      });
      return;
    }

    const existingBottleItem = orderItems.find(
      i => i.productId === fractionProduct.id && i.product?.name?.includes('(Garrafa)')
    );
    const existingShotItem = orderItems.find(
      i => i.productId === fractionProduct.id && i.product?.name?.includes('(Dose)')
    );
    const existingBottles = existingBottleItem ? existingBottleItem.quantity : 0;
    const existingShots = existingShotItem ? existingShotItem.quantity : 0;
    const dosesPerBottle = fractionProduct.dosesPorGarrafa || 1;
    const totalBottlesNeeded =
      existingBottles + bottleQty + Math.ceil((existingShots + shotQty) / dosesPerBottle);

    if (totalBottlesNeeded > fractionProduct.stock) {
      toast({
        title: 'Stock insuficiente',
        description: `Apenas ${fractionProduct.stock} ${fractionProduct.stock === 1 ? 'garrafa disponível' : 'garrafas disponíveis'}`,
        variant: 'destructive',
      });
      return;
    }

    const newItems: CartItem[] = [];

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
          uid: uidForFraction(fractionProduct, 'bottle'),
          product: bottleProduct,
          quantity: bottleQty,
          subtotal: bottleQty * fractionProduct.price,
        });
      }
    }

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
          uid: uidForFraction(fractionProduct, 'shot'),
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
  };

  // Cota máxima por produto é validada dentro de updateItemQuantity como antes
  const updateItemQuantity = (productId: string, delta: number) => {
    const item = orderItems.find(i => i.productId === productId);
    if (!item) return;

    const newQuantity = item.quantity + delta;

    if (newQuantity <= 0) {
      setLastRemoved(orderItems.filter(i => i.productId === productId));
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
    const removed = orderItems.filter(i => i.productId === productId);
    if (removed.length === 0) return;
    setLastRemoved(removed);
    setOrderItems(orderItems.filter(i => i.productId !== productId));
  };

  const undoRemove = () => {
    if (!lastRemoved) return;
    setOrderItems(prev => [...prev, ...lastRemoved]);
    setLastRemoved(null);
  };

  const setItemNote = (uid: string, note: string) => {
    setOrderItems(prev =>
      prev.map(i => (i.uid === uid ? { ...i, note } : i))
    );
  };

  const handleNewSale = useCallback(() => {
    setOrderItems([]);
    setDiscount({ type: 'percent', value: 0 });
    setCustomer(null);
    setTable(null);
    setLastRemoved(null);
    setCompletedSale(null);
    setLastSaleId(null);
    setSearch('');
    setCategory(ALL_CATEGORY);
    setOrderSheetOpen(false);
    setPaymentOpen(false);
    setSuspendedSheetOpen(false);
  }, []);

  // --- Pagamento ---
  const handlePaymentConfirm = async (payment: PaymentConfirm) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    try {
      const totalReceived = payment.cash + payment.mpesa + payment.emola + payment.card;
      const effectiveTotal = discountAmount > 0 ? total : subtotal;
      const change = totalReceived - effectiveTotal;

      const saleData = {
        items: orderItems,
        total: effectiveTotal,
        discount: discount.type === 'percent' ? discount.value : 0,
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

      if (table) {
        Object.assign(saleData, {
          tableId: table.id,
          table_number: table.number,
          table_name: table.name,
          table_customer_name: table.customerName,
        });
      }

      const sanitizedSale = sanitizeSaleData(saleData);
      const { data: savedSale, error } = await addSale(sanitizedSale);

      if (error) {
        throw error;
      }

      setLastSaleId(savedSale.id);

      if (payment.cash > 0) {
        await openCashDrawer();
      }

      if (table?.linkedOrderId) {
        try {
          const paymentMethod = payment.mpesa > 0 ? 'mpesa' : payment.cash > 0 ? 'cash' : 'card';
          await updateOrder(table.linkedOrderId, { status: 'paid', paymentMethod });
          await updateTable(table.id, { status: 'free', closed_at: new Date() });
        } catch {
          // Falha ao sincronizar a mesa não deve bloquear a venda
        }
      }

      // Preparar dados para impressão
      const saleForPrint: SaleForPrint = {
        id: savedSale.id,
        createdAt: (savedSale.createdAt as Date)?.toString() ?? new Date().toString(),
        sale_number: savedSale.saleNumber ? String(savedSale.saleNumber) : undefined,
        tableId: table?.id,
        customer_name: customer?.name,
        items: orderItems,
        total,
        paymentDetails: savedSale.paymentDetails || saleData.paymentDetails,
      };
      printCopiesRef.current = saleForPrint;

      setPaymentOpen(false);
      setOrderItems([]);
      setDiscount({ type: 'percent', value: 0 });
      setCustomer(null);
      setTable(null);
      setLastRemoved(null);
      setSearch('');
      setCategory(ALL_CATEGORY);

      const methodLabel = buildMethodLabel(payment);
      setCompletedSale({
        id: savedSale.id,
        saleNumber: savedSale.saleNumber,
        total: effectiveTotal,
        itemsCount: orderItems.length,
        methodLabel,
        isOffline: !getOnline(),
      });

      // Verificar stock baixo de produtos
      const lowStockItems = orderItems.filter(item => {
        const product = products.find(p => p.id === item.productId);
        return product && (product.stock - item.quantity) <= 5;
      });

      // Verificar ingredientes em falta
      const lowIngredients: string[] = [];
      orderItems.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product?.recipe) {
          product.recipe.forEach(recipeItem => {
            const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
            if (ingredient) {
              const newStock = ingredient.stock - recipeItem.quantity * item.quantity;
              if (newStock <= ingredient.minStock && !lowIngredients.includes(ingredient.name)) {
                lowIngredients.push(ingredient.name);
              }
            }
          });
        }
      });

      toast({
        title: 'Venda registada com sucesso!',
        description: change > 0 ? `Troco: ${change.toFixed(2)} MT` : 'Pagamento completo',
      });

      // Impressão automática (comportamento preservado)
      setTimeout(() => {
        printReceipt(saleForPrint, 'client', business);
        setTimeout(() => printReceipt(saleForPrint, 'merchant', business), 500);
      }, 300);

      if (lowStockItems.length > 0 || lowIngredients.length > 0) {
        setTimeout(() => {
          const messages: string[] = [];
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
      console.error('Erro ao processar venda:', error);
      toast({
        title: 'Não foi possível concluir a venda',
        description: getErrorMessage(error, 'Tente novamente'),
        variant: 'destructive',
      });
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  };

  const handleCreditConfirm = async (customerName: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    try {
      if (!customerName.trim()) {
        toast({
          title: 'Nome do cliente obrigatório',
          description: 'Por favor, insira o nome do cliente',
          variant: 'destructive',
        });
        return;
      }

      const result = await registerCreditCharge(customerName.trim(), orderItems, total);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao registar crédito');
      }

      setPaymentOpen(false);
      setOrderItems([]);
      setDiscount({ type: 'percent', value: 0 });
      setCustomer(null);
      setTable(null);
      setLastRemoved(null);
      setSearch('');
      setCategory(ALL_CATEGORY);

      const creditForPrint: SaleForPrint = {
        id: result.saleId ?? `credit-${Date.now()}`,
        createdAt: new Date().toString(),
        customer_name: customerName,
        items: orderItems,
        total,
        paymentDetails: { cash: 0, mpesa: 0, emola: 0, card: 0, total: 0, change: 0 },
      };
      printCopiesRef.current = creditForPrint;

      setCompletedSale({
        id: result.saleId ?? `credit-${Date.now()}`,
        total,
        itemsCount: orderItems.length,
        methodLabel: 'Crédito',
      });

      setTimeout(() => {
        printReceipt(creditForPrint, 'client', business);
        setTimeout(() => printReceipt(creditForPrint, 'merchant', business), 500);
      }, 300);

      toast({
        title: 'Crédito registado com sucesso!',
        description: `${customerName} levará ${orderItems.length} produto(s)`,
      });
    } catch (error: unknown) {
      console.error('Erro ao registar crédito:', error);
      toast({
        title: 'Erro ao registar crédito',
        description: getErrorMessage(error, 'Tente novamente'),
      });
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  };

  const handleReprint = (copy: 'client' | 'merchant') => {
    if (!printCopiesRef.current) return;
    printReceipt(printCopiesRef.current, copy, business);
  };

  // --- Pré-conta ---
  const handlePrintPrebill = useCallback(() => {
    if (orderItems.length === 0) {
      toast({
        title: 'Carrinho vazio',
        description: 'Adicione produtos antes de imprimir a conta',
        variant: 'destructive',
      });
      return;
    }
    try {
      printPreBill(orderItems, table?.name, business);
    } catch (error) {
      console.error('Erro ao imprimir pré-conta:', error);
      toast({
        title: 'Erro ao imprimir',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  }, [orderItems, table, business]);

  // --- Vendas suspensas ---
  const handleSuspend = () => {
    if (orderItems.length === 0) {
      toast({
        title: 'Pedido vazio',
        description: 'Adicione produtos antes de suspender a venda',
        variant: 'destructive',
      });
      return;
    }
    const suspended: SuspendedSale = {
      id: generateUUID(),
      ref: `Suspensa #${Date.now().toString().slice(-4)}`,
      items: orderItems,
      discount,
      customer,
      table,
      total,
      createdAt: new Date().toISOString(),
    };
    if (businessId) {
      addSuspendedSale(businessId, suspended);
      setSuspendedSales(getSuspendedSales(businessId));
    }
    setOrderItems([]);
    setDiscount({ type: 'percent', value: 0 });
    setLastRemoved(null);
    toast({
      title: 'Venda suspensa',
      description: `${suspended.ref} guardada. Pode retomar quando quiser.`,
    });
  };

  const handleResumeSuspended = (sale: SuspendedSale) => {
    setOrderItems(sale.items);
    setDiscount(sale.discount);
    setCustomer(sale.customer);
    setTable(sale.table);
    if (businessId) {
      setSuspendedSales(removeSuspendedSale(businessId, sale.id));
    }
    setSuspendedSheetOpen(false);
    toast({
      title: 'Venda retomada',
      description: `${sale.ref} carregada no pedido.`,
    });
  };

  const handleRemoveSuspended = (id: string) => {
    if (!businessId) return;
    setSuspendedSales(removeSuspendedSale(businessId, id));
  };

  // --- Mesas ---
  const handleSelectTable = (ref: PosTableRef) => {
    setTable(ref);
    if (orderItems.length === 0 && ref.linkedOrderId) {
      const order = orders.find(o => o.id === ref.linkedOrderId && o.status !== 'paid');
      if (order && order.items.length > 0) {
        setOrderItems(order.items.map(o => ({
          ...o,
          uid: o.product?.name?.includes('(Garrafa)')
            ? `${o.productId}#bottle`
            : o.product?.name?.includes('(Dose)')
              ? `${o.productId}#shot`
              : o.productId,
        })));
        toast({
          title: 'Pedido da mesa carregado',
          description: `Mesa ${ref.number} — ${order.items.length} ${order.items.length === 1 ? 'item' : 'itens'}`,
        });
      }
    }
  };

  // Vindo do mapa de Mesas: pré-selecciona a mesa e carrega o pedido existente
  useEffect(() => {
    const mesaId = searchParams.get('mesa');
    if (!mesaId) return;
    const tableRef = tables.find(t => t.id === mesaId);
    if (tableRef) {
      setTable({
        id: tableRef.id,
        number: tableRef.number,
        name: tableRef.name,
        customerName: tableRef.customer_name,
        linkedOrderId: tableRef.currentOrderId,
      });
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, tables, setSearchParams]);

  // Carrega o pedido da mesa assim que os dados estiverem disponíveis
  useEffect(() => {
    if (!table?.linkedOrderId || orderItems.length > 0) return;
    const order = orders.find(o => o.id === table.linkedOrderId && o.status !== 'paid');
    if (order && order.items.length > 0) {
      setOrderItems(order.items.map(o => ({
        ...o,
        uid: o.product?.name?.includes('(Garrafa)')
          ? `${o.productId}#bottle`
          : o.product?.name?.includes('(Dose)')
            ? `${o.productId}#shot`
            : o.productId,
      })));
      toast({
        title: 'Pedido da mesa carregado',
        description: `Mesa ${table.number} — ${order.items.length} ${order.items.length === 1 ? 'item' : 'itens'}`,
      });
    }
  }, [table, orderItems.length, orders]);

  const handleSendToKitchen = async () => {
    if (orderItems.length === 0) {
      toast({
        title: 'Pedido vazio',
        description: 'Adicione produtos antes de enviar à cozinha',
        variant: 'destructive',
      });
      return;
    }
    if (!table) {
      toast({
        title: 'Selecione uma mesa',
        description: 'O pedido enviado à cozinha deve estar associado a uma mesa.',
        variant: 'destructive',
      });
      return;
    }
    if (sendingKitchen) return;
    setSendingKitchen(true);
    try {
      const orderId = table.linkedOrderId ?? `order-${generateUUID()}`;
      const orderPayload: Order = {
        id: orderId,
        tableId: table.id,
        tableName: table.name,
        table_number: table.number,
        items: orderItems.map(i => ({
          productId: i.productId,
          product: i.product ? { name: i.product.name, price: i.product.price } : undefined,
          quantity: i.quantity,
          subtotal: i.subtotal,
          ...(i.note ? { note: i.note } : {}),
        })),
        status: 'pending',
        total: orderItems.reduce((s, i) => s + i.subtotal, 0),
        createdAt: new Date(),
      };
      await addOrder(orderPayload);

      const existingOrder = orders.find(o => o.id === orderId);
      await updateTable(table.id, {
        status: 'occupied',
        currentOrderId: orderId,
        opened_at: existingOrder?.createdAt ?? new Date(),
        ...(customer?.name ? { customer_name: customer.name } : {}),
      });

      setTable({ ...table, linkedOrderId: orderId });
      setKitchenSentRef(
        orderId.startsWith('order-') ? orderId.slice(6).slice(-4).toUpperCase() : orderId.slice(0, 4).toUpperCase()
      );
      auditLog('order_sent', 'orders', orderId, { tableId: table.id, items: orderItems.length });
      toast({
        title: 'Pedido enviado à cozinha',
        description: `Mesa ${table.number} — ${orderItems.length} ${orderItems.length === 1 ? 'item' : 'itens'}`,
      });
    } catch (error: unknown) {
      console.error('Erro ao enviar pedido:', error);
      toast({
        title: 'Erro ao enviar pedido',
        description: getErrorMessage(error, 'Tente novamente'),
        variant: 'destructive',
      });
    } finally {
      setSendingKitchen(false);
    }
  };

  // --- Atalhos de teclado ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F1') {
        e.preventDefault();
        handleNewSale();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (orderItems.length > 0 && !completedSale && !processingRef.current) {
          setPaymentOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [orderItems.length, completedSale, handleNewSale]);

  const canAmountDiscount = can('precos_margens');

  const renderOrderPanel = (fillHeight = false) => (
    <OrderPanel
      items={orderItems}
      customer={customer}
      table={table}
      discount={discount}
      discountAmount={discountAmount}
      subtotal={subtotal}
      total={total}
      canAmountDiscount={canAmountDiscount}
      onIncrement={updateItemQuantity}
      onRemove={removeItem}
      onSetNote={setItemNote}
      onDiscountChange={setDiscount}
      onOpenPayment={() => setPaymentOpen(true)}
      onPrintPrebill={handlePrintPrebill}
      onSuspend={handleSuspend}
      onSendToKitchen={handleSendToKitchen}
      canSendToKitchen={Boolean(table)}
      sendingKitchen={sendingKitchen}
      sentOrderRef={kitchenSentRef}
      lastRemoved={lastRemoved?.[0] ?? null}
      onUndoRemove={undoRemove}
      disabled={Boolean(completedSale)}
      className={fillHeight ? 'h-full' : ''}
    />
  );

  const renderSuccessPanel = () => (
    <SaleSuccessPanel
      sale={completedSale as CompletedSaleInfo}
      showInvoice={Boolean(lastSaleId)}
      onPrint={handleReprint}
      onNewSale={handleNewSale}
      onEmitInvoice={() => {
        setClientName(customer?.name ?? '');
        setShowInvoiceDialog(true);
      }}
    />
  );

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-8.5rem)] min-h-[540px]">
      <PosToolbar
        search={search}
        onSearchChange={setSearch}
        searchResults={searchResults}
        onAddResult={addItemToOrder}
        onNewSale={handleNewSale}
        searchInputRef={searchInputRef}
        online={online}
        pendingCount={pendingCount}
        suspendedCount={suspendedSales.length}
        onOpenSuspended={() => setSuspendedSheetOpen(true)}
        customer={customer}
        onSelectCustomer={setCustomer}
        canCredit={can('creditos')}
        table={table}
        onSelectTable={handleSelectTable}
        onClearTable={() => setTable(null)}
        tables={tables}
        orders={orders}
      />

      <div className="flex flex-1 flex-col gap-3 lg:min-h-0 lg:grid lg:grid-cols-[200px_minmax(0,1fr)_380px]">
        {/* Categorias (desktop) */}
        <aside className="hidden lg:block min-h-0">
          <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card p-2">
            <div className="flex-1 overflow-y-auto">
              <CategoryRail
                categories={categories}
                selected={category}
                counts={counts}
                onSelect={setCategory}
              />
            </div>
          </div>
        </aside>

        {/* Produtos */}
        <section className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="lg:hidden">
            <CategoryRail
              categories={categories}
              selected={category}
              counts={counts}
              onSelect={setCategory}
              orientation="horizontal"
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pb-2 pr-0.5">
            <ProductGrid
              products={filteredProducts}
              loading={loading}
              searchActive={Boolean(safeSearch)}
              onAdd={addItemToOrder}
            />
          </div>
        </section>

        {/* Pedido (desktop) */}
        <aside className="hidden lg:block min-h-0">
          {completedSale ? renderSuccessPanel() : renderOrderPanel(true)}
        </aside>
      </div>

      {/* Barra móvel */}
      {!completedSale && orderItems.length > 0 && (
        <div className="lg:hidden">
          <Button
            variant="gradient"
            size="lg"
            className="w-full"
            onClick={() => setOrderSheetOpen(true)}
          >
            Ver pedido ({orderItems.length}) · {formatCurrency(total)}
          </Button>
        </div>
      )}

      {/* Pedido em Sheet (mobile/tablet) */}
      <Sheet open={orderSheetOpen} onOpenChange={setOrderSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-4">
          <div className="h-full min-h-0">
            {completedSale ? renderSuccessPanel() : renderOrderPanel(true)}
          </div>
        </SheetContent>
      </Sheet>

      {/* Vendas suspensas */}
      <SuspendedListSheet
        open={suspendedSheetOpen}
        onOpenChange={setSuspendedSheetOpen}
        sales={suspendedSales}
        onResume={handleResumeSuspended}
        onRemove={handleRemoveSuspended}
        onNewSale={handleNewSale}
      />

      {/* Pagamento */}
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={total}
        customer={customer}
        canCredit={can('creditos')}
        processing={processing}
        onConfirm={handlePaymentConfirm}
        onCredit={handleCreditConfirm}
      />

      {/* Diálogo Garrafa/Dose */}
      <Dialog open={showFractionDialog} onOpenChange={(open) => { if (!open) { setFractionProduct(null); setBottleQty(0); setShotQty(0); } setShowFractionDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fractionProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Selecione o tipo e quantidade pretendida
            </p>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">🍾 Garrafa</p>
                <p className="text-sm text-muted-foreground">
                  {fractionProduct?.price.toLocaleString('pt-MZ')} MT /un
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-sm" onClick={() => setBottleQty(Math.max(0, bottleQty - 1))} aria-label="Diminuir garrafas">
                  −
                </Button>
                <span className="w-8 text-center font-medium">{bottleQty}</span>
                <Button variant="outline" size="icon-sm" onClick={() => setBottleQty(bottleQty + 1)} aria-label="Aumentar garrafas">
                  +
                </Button>
              </div>
            </div>
            {fractionProduct?.precoDose && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">🥃 Dose ({fractionProduct.dosesPorGarrafa ? `1/${fractionProduct.dosesPorGarrafa}` : ''})</p>
                  <p className="text-sm text-muted-foreground">
                    {fractionProduct.precoDose.toLocaleString('pt-MZ')} MT /dose
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" onClick={() => setShotQty(Math.max(0, shotQty - 1))} aria-label="Diminuir doses">
                    −
                  </Button>
                  <span className="w-8 text-center font-medium">{shotQty}</span>
                  <Button variant="outline" size="icon-sm" onClick={() => setShotQty(shotQty + 1)} aria-label="Aumentar doses">
                    +
                  </Button>
                </div>
              </div>
            )}
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
              Adicionar ao Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de preço personalizado (peso) */}
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
                  if (e.key === 'Enter') addItemWithCustomPrice();
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

      {/* Diálogo de factura */}
      <Dialog open={showInvoiceDialog} onOpenChange={(v) => { setShowInvoiceDialog(v); if (!v) setInvoiceError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir Factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {invoiceError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{invoiceError}</p>
            )}
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <div className="flex gap-2">
                {(['FS', 'FT', 'FC'] as const).map(type => (
                  <Button
                    key={type}
                    variant={selectedDocType === type ? 'default' : 'outline'}
                    onClick={() => setSelectedDocType(type)}
                    className="flex-1"
                    disabled={emittingInvoice}
                  >
                    {type === 'FS' ? 'Simplificada' : type === 'FT' ? 'Factura' : 'Consumidor Final'}
                  </Button>
                ))}
              </div>
            </div>
            {selectedDocType === 'FT' && (
              <div className="space-y-2">
                <Label>Cliente (NUIT obrigatório)</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  disabled={emittingInvoice}
                />
                <Input
                  placeholder="NUIT"
                  value={clientNuit}
                  onChange={e => setClientNuit(e.target.value)}
                  disabled={emittingInvoice}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)} disabled={emittingInvoice}>Cancelar</Button>
            <Button disabled={emittingInvoice} onClick={async () => {
              if (!lastSaleId || emittingInvoice) return;
              setEmittingInvoice(true);
              setInvoiceError(null);
              try {
                const result = await issueInvoice(
                  lastSaleId,
                  selectedDocType,
                  selectedDocType === 'FT'
                    ? { name: clientName || undefined, nuit: clientNuit || undefined }
                    : undefined
                );
                if (result.error) {
                  setInvoiceError(result.error);
                  return;
                }
                setShowInvoiceDialog(false);
                setLastSaleId(null);
              } finally {
                setEmittingInvoice(false);
              }
            }}>
              {emittingInvoice ? 'A emitir...' : 'Emitir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildMethodLabel(payment: PaymentConfirm): string {
  const parts: string[] = [];
  if (payment.cash > 0) parts.push('Dinheiro');
  if (payment.mpesa > 0) parts.push('M-Pesa');
  if (payment.emola > 0) parts.push('E-Mola');
  if (payment.card > 0) parts.push('Cartão');
  return parts.length > 0 ? parts.join(' + ') : 'Pagamento';
}