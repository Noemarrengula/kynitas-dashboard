import { useState } from 'react';
import { Users, Plus, Minus, X, Check, Settings2, PlusCircle, Receipt } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { PaymentModal } from '@/components/sales/PaymentModal';
import { useDatabase } from '@/hooks/useDatabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/store/useStore';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, Order, OrderItem, Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { TableManagementModal } from '@/components/tables/TableManagementModal';
import { NewTableModal } from '@/components/tables/NewTableModal';

const statusLabels = {
  free: 'Livre',
  occupied: 'Ocupada',
  awaiting_payment: 'Aguardando Pagamento',
};

const statusColors = {
  free: 'bg-success/10 text-success border-success/20',
  occupied: 'bg-primary/10 text-primary border-primary/20',
  awaiting_payment: 'bg-warning/10 text-warning border-warning/20',
};

export default function Tables() {
  const { tables, orders, updateTable, addOrder, updateOrder, addTable, setTables } = useStore();
  const { products, ingredients, addSale, addCredit } = useDatabase();
  const { business } = useBusiness();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [managingTable, setManagingTable] = useState<Table | null>(null);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [creditCustomerName, setCreditCustomerName] = useState('');


  const handleTableClick = (table: Table, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.manage-btn')) return;
    setSelectedTable(table);
    
    if (table.currentOrderId) {
      const order = orders.find(o => o.id === table.currentOrderId);
      if (order) {
        setOrderItems([...order.items]);
      }
    } else {
      setOrderItems([]);
    }
  };

  const handleManageTable = (table: Table) => {
    setManagingTable(table);
    setShowManagementModal(true);
  };

  const handleSaveTableManagement = (data: { customer_name?: string; status: 'free' | 'occupied' | 'awaiting_payment' }) => {
    if (!managingTable) return;
    updateTable(managingTable.id, {
      ...data,
      opened_at: data.status !== 'free' && !managingTable.opened_at ? new Date() : managingTable.opened_at,
      closed_at: data.status === 'free' ? new Date() : undefined,
    });
    toast({ title: 'Mesa atualizada!' });
  };

  const handleCreateTable = (data: { number: number; name?: string; customer_name?: string }) => {
    const newTable: Table = {
      id: `table-${Date.now()}`,
      number: data.number,
      name: data.name,
      customer_name: data.customer_name,
      status: data.customer_name ? 'occupied' : 'free',
      opened_at: data.customer_name ? new Date() : undefined,
    };
    addTable(newTable);
    toast({ title: 'Mesa criada!' });
  };

  const addItemToOrder = (product: Product) => {
    const existingItem = orderItems.find(i => i.productId === product.id);
    
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

  const updateItemQuantity = (productId: string, delta: number) => {
    const item = orderItems.find(i => i.productId === productId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      setOrderItems(orderItems.filter(i => i.productId !== productId));
    } else {
      setOrderItems(orderItems.map(i =>
        i.productId === productId
          ? { ...i, quantity: newQuantity, subtotal: newQuantity * i.product.price }
          : i
      ));
    }
  };

  const removeItem = (productId: string) => {
    setOrderItems(orderItems.filter(i => i.productId !== productId));
  };

  const total = orderItems.reduce((acc, item) => acc + item.subtotal, 0);

  const handleSaveOrder = () => {
    if (!selectedTable || orderItems.length === 0) return;

    const orderId = selectedTable.currentOrderId || `order-${Date.now()}`;
    
    if (selectedTable.currentOrderId) {
      updateOrder(orderId, { items: orderItems, total });
    } else {
      const newOrder: Order = {
        id: orderId,
        tableId: selectedTable.id,
        items: orderItems,
        status: 'preparing',
        total,
        createdAt: new Date(),
      };
      addOrder(newOrder);
      updateTable(selectedTable.id, { status: 'occupied', currentOrderId: orderId });
    }

    toast({ title: 'Pedido guardado!' });
    setSelectedTable(null);
  };

  const handlePaymentConfirm = (payment: { cash: number; mpesa: number; emola: number; card: number }) => {
    if (!selectedTable) return;

    try {
      const totalReceived = payment.cash + payment.mpesa + payment.emola + payment.card;
      const change = totalReceived - total;

      const newSale = {
        id: `sale-${Date.now()}`,
        items: orderItems,
        total,
        paymentDetails: {
          cash: payment.cash,
          mpesa: payment.mpesa,
          emola: payment.emola,
          card: payment.card,
          total: totalReceived,
          change: Math.max(0, change),
        },
        createdAt: new Date(),
        tableId: selectedTable.id,
        table_number: selectedTable.number,
        table_name: selectedTable.name,
        table_customer_name: selectedTable.customer_name,
      };

      addSale(newSale);

      if (selectedTable.currentOrderId) {
        updateOrder(selectedTable.currentOrderId, { status: 'paid' });
      }

      // Arquivar mesa no histórico antes de remover
      // TODO: Salvar no Supabase tables_history quando integrado
      
      // Remover mesa da visualização após pagamento
      const updatedTables = tables.filter(t => t.id !== selectedTable.id);
      setTables(updatedTables);
      setShowPaymentModal(false);
      setSelectedTable(null);
      setOrderItems([]);

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
        title: 'Pagamento realizado com sucesso!',
        description: change > 0 ? `Troco: ${change.toFixed(2)} MT` : 'Pagamento completo',
      });

      // Imprimir recibo diretamente
      printReceiptDirect(newSale);

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
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const printReceiptDirect = (sale: any) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: 'Bloqueio de popup',
          description: 'Permita popups para imprimir',
          variant: 'destructive'
        });
        return;
      }

      const receiptHTML = generateReceiptHTML(sale);
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (error) {
      console.error('Erro ao imprimir:', error);
    }
  };

  const generateReceiptHTML = (sale: any) => {
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

    const receipt = [];
    receipt.push(centerText('KYNITAS BAR'));
    receipt.push(centerText('Bar & Restaurante'));
    receipt.push('');
    receipt.push(line('='));
    receipt.push('');
    receipt.push('Data: ' + new Date(sale.createdAt).toLocaleString('pt-MZ'));
    receipt.push('Recibo: #' + sale.id.slice(0, 8).toUpperCase());
    if (sale.tableId) receipt.push('Mesa: ' + sale.tableId);
    receipt.push('');
    receipt.push(line('-'));
    receipt.push('');
    receipt.push('ITENS:');
    receipt.push('');
    
    sale.items.forEach((item: any) => {
      receipt.push(item.product.name);
      receipt.push(formatLine(`  ${item.quantity}x ${formatCurrency(item.product.price)}`, formatCurrency(item.subtotal)));
    });
    
    receipt.push('');
    receipt.push(line('-'));
    receipt.push('');
    receipt.push(formatLine('TOTAL:', formatCurrency(sale.total)));
    receipt.push('');
    receipt.push(line('-'));
    receipt.push('');
    receipt.push('PAGAMENTO:');
    receipt.push('');
    
    if (sale.paymentDetails.cash > 0) {
      receipt.push(formatLine('  Numerario:', formatCurrency(sale.paymentDetails.cash)));
    }
    if (sale.paymentDetails.mpesa > 0) {
      receipt.push(formatLine('  M-Pesa:', formatCurrency(sale.paymentDetails.mpesa)));
    }
    if (sale.paymentDetails.emola > 0) {
      receipt.push(formatLine('  E-Mola:', formatCurrency(sale.paymentDetails.emola)));
    }
    if (sale.paymentDetails.card > 0) {
      receipt.push(formatLine('  Cartao:', formatCurrency(sale.paymentDetails.card)));
    }
    
    receipt.push('');
    receipt.push(formatLine('Total Recebido:', formatCurrency(sale.paymentDetails.total)));
    
    if (sale.paymentDetails.change > 0) {
      receipt.push(formatLine('Troco:', formatCurrency(sale.paymentDetails.change)));
    }
    
    receipt.push('');
    receipt.push(line('='));
    receipt.push('');
    receipt.push(centerText('Obrigado pela preferencia!'));
    receipt.push(centerText('Volte sempre!'));
    receipt.push('');
    receipt.push(centerText('Documento nao serve como fatura'));

    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Recibo</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.3;
              width: 80mm;
              padding: 5mm;
              background: white;
              color: #000;
            }
            pre { 
              margin: 0;
              white-space: pre;
              font-family: inherit;
              color: #000;
              font-weight: bold;
            }
            @media print {
              body { padding: 2mm; color: #000 !important; }
              pre { color: #000 !important; font-weight: bold !important; }
            }
          </style>
        </head>
        <body><pre>${receipt.join('\n')}</pre></body>
      </html>`;
  };

  const printPreBill = () => {
    if (orderItems.length === 0) {
      toast({
        title: 'Pedido vazio',
        description: 'Adicione itens antes de imprimir a conta',
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
  };

  const generatePreBillHTML = () => {
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
    if (selectedTable) {
      bill.push('Mesa: ' + (selectedTable.name || `Mesa ${selectedTable.number}`));
      if (selectedTable.customer_name) {
        bill.push('Cliente: ' + selectedTable.customer_name);
      }
    }
    bill.push('Data: ' + new Date().toLocaleString('pt-MZ'));
    bill.push('');
    bill.push(line('-'));
    bill.push('');
    bill.push('ITENS:');
    bill.push('');
    
    orderItems.forEach((item) => {
      bill.push(item.product.name);
      bill.push(formatLine(`  ${item.quantity}x ${formatCurrency(item.product.price)}`, formatCurrency(item.subtotal)));
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
            @page { size: 80mm auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace;
              font-size: 13px;
              line-height: 1.4;
              width: 80mm;
              padding: 5mm;
              background: #fff;
              color: #000;
              font-weight: bold;
            }
            pre { margin: 0; white-space: pre; font-family: inherit; color: #000; font-weight: bold; }
            @media print {
              body { padding: 2mm; color: #000 !important; }
              pre { color: #000 !important; font-weight: bold !important; }
            }
          </style>
        </head>
        <body><pre>${bill.join('\n')}</pre></body>
      </html>`;
  };

  const handleRequestPayment = () => {
    if (!selectedTable || orderItems.length === 0) return;
    setShowCreditDialog(true);
  };

  const handleCreditConfirm = async () => {
    if (!selectedTable || !creditCustomerName.trim()) {
      toast({
        title: 'Nome do cliente obrigatório',
        description: 'Por favor, insira o nome do cliente',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Registar crédito
      const creditData = {
        customerName: creditCustomerName.trim(),
        items: orderItems,
        total: total,
        status: 'pending' as const,
      };

      const { error } = await addCredit(creditData);

      if (error) {
        throw error;
      }

      // Marcar mesa como awaiting_payment
      updateTable(selectedTable.id, { status: 'awaiting_payment' });

      // Limpar
      setShowCreditDialog(false);
      setCreditCustomerName('');
      setSelectedTable(null);
      setOrderItems([]);

      toast({
        title: 'Crédito registado com sucesso!',
        description: `${creditCustomerName} levará ${orderItems.length} produto(s)`,
      });
    } catch (error: any) {
      console.error('Erro ao registar crédito:', error);
      toast({
        title: 'Erro ao registar crédito',
        description: error?.message || 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Gestão de Mesas
          </h1>
          <p className="text-muted-foreground">Gerir pedidos por mesa</p>
        </div>
        <Button onClick={() => setShowNewTableModal(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Mesa
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full", 
              status === 'free' ? 'bg-success' : 
              status === 'occupied' ? 'bg-primary' : 'bg-warning'
            )} />
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {tables.map((table) => {
          const order = orders.find(o => o.id === table.currentOrderId);
          return (
            <div key={table.id} className="relative">
              <button
                onClick={(e) => handleTableClick(table, e)}
                className={cn(
                  "w-full p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg text-left",
                  statusColors[table.status]
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold">{table.name || `Mesa ${table.number}`}</span>
                  <div className={cn(
                    "h-3 w-3 rounded-full",
                    table.status === 'free' ? 'bg-success' :
                    table.status === 'occupied' ? 'bg-primary' : 'bg-warning'
                  )} />
                </div>
                <Badge variant="outline" className={statusColors[table.status]}>
                  {statusLabels[table.status]}
                </Badge>
                {table.customer_name && (
                  <p className="text-sm mt-2 font-medium truncate">
                    {table.customer_name}
                  </p>
                )}
                {order && (
                  <>
                    <div className="mt-3 space-y-1 border-t pt-2">
                      <p className="text-xs font-semibold text-muted-foreground">Itens:</p>
                      {order.items.slice(0, 3).map((item, idx) => (
                        <p key={idx} className="text-xs truncate">
                          {item.quantity}x {item.product.name}
                        </p>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{order.items.length - 3} mais...</p>
                      )}
                    </div>
                    <p className="text-sm mt-2 font-bold">
                      {order.total.toLocaleString('pt-MZ')} MT
                    </p>
                  </>
                )}
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="manage-btn absolute top-2 right-2"
                onClick={() => handleManageTable(table)}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Table Dialog */}
      <Dialog open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTable?.name || `Mesa ${selectedTable?.number}`}</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Products */}
            <div className="space-y-4">
              <h3 className="font-semibold">Adicionar Itens</h3>
              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addItemToOrder(product)}
                    className="p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.price} MT</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Order */}
            <div className="space-y-4">
              <h3 className="font-semibold">Pedido Atual</h3>
              
              {orderItems.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum item adicionado
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {orderItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-destructive hover:bg-destructive/10 p-1 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div>
                          <p className="font-medium text-sm">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">{item.product.price} MT cada</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => updateItemQuantity(item.productId, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => updateItemQuantity(item.productId, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="w-20 text-right font-medium">
                          {item.subtotal.toLocaleString('pt-MZ')} MT
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{total.toLocaleString('pt-MZ')} MT</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4">
                {selectedTable?.status !== 'awaiting_payment' ? (
                  <>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleSaveOrder}
                        disabled={orderItems.length === 0}
                      >
                        Guardar Pedido
                      </Button>
                      <Button
                        variant="gradient"
                        className="flex-1"
                        onClick={handleRequestPayment}
                        disabled={orderItems.length === 0}
                      >
                        Pedir Conta
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={printPreBill}
                      disabled={orderItems.length === 0}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Imprimir Conta
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={printPreBill}
                      disabled={orderItems.length === 0}
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
                      Finalizar Pagamento
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={total}
        onConfirm={handlePaymentConfirm}
      />

      {/* Credit Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registar Crédito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">📝 Registar mesa como crédito</p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">O cliente levará os produtos agora e pagará depois</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-customer-name">Nome do Cliente *</Label>
              <Input
                id="table-customer-name"
                type="text"
                placeholder="Ex: João Silva"
                value={creditCustomerName}
                onChange={(e) => setCreditCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreditConfirm();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreditConfirm} className="bg-blue-600 hover:bg-blue-700">
              Registar Crédito
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Management Modal */}
      <TableManagementModal
        open={showManagementModal}
        onClose={() => setShowManagementModal(false)}
        table={managingTable}
        onSave={handleSaveTableManagement}
      />

      {/* New Table Modal */}
      <NewTableModal
        open={showNewTableModal}
        onClose={() => setShowNewTableModal(false)}
        onSave={handleCreateTable}
        existingNumbers={tables.map(t => t.number)}
      />
    </div>
  );
}
