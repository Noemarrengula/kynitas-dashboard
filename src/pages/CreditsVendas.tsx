import { useEffect, useState } from 'react';
import { useDatabase } from '@/hooks/useDatabase';
import { Credit } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Trash2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';

export default function CreditsVendas() {
  const { credits, addCredit, payCredit, deleteCredit, loading } = useDatabase();
  const [showDialog, setShowDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'emola' | 'card'>('cash');

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    items: [] as any[],
    total: 0,
    notes: '',
  });

  const filteredCredits = credits.filter(credit => {
    const matchesSearch = credit.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (credit.customerPhone && credit.customerPhone.includes(searchTerm));
    const matchesStatus = filterStatus === 'all' || credit.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPending = credits
    .filter(c => c.status === 'pending' || c.status === 'partial')
    .reduce((sum, c) => sum + c.remainingBalance, 0);

  const handleAddCredit = async () => {
    if (!formData.customerName || formData.total <= 0) {
      alert('Preencha o nome do cliente e o valor');
      return;
    }

    await addCredit({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      items: formData.items,
      total: formData.total,
      notes: formData.notes,
    });

    setFormData({
      customerName: '',
      customerPhone: '',
      items: [],
      total: 0,
      notes: '',
    });
    setShowDialog(false);
  };

  const handlePayment = async () => {
    if (!selectedCredit || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedCredit.remainingBalance) {
      alert('Valor de pagamento inválido');
      return;
    }

    await payCredit(selectedCredit.id, amount, paymentMethod);
    setPaymentAmount('');
    setShowPaymentDialog(false);
    setSelectedCredit(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">Pendente</Badge>;
      case 'partial':
        return <Badge variant="secondary">Parcial</Badge>;
      case 'paid':
        return <Badge variant="default">Pago</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-MZ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando créditos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="text-sm font-medium text-red-700 dark:text-red-400">Total Pendente</div>
          <div className="text-2xl font-bold text-red-900 dark:text-red-300 mt-2">
            {formatCurrency(totalPending)}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
            {credits.filter(c => c.status === 'pending' || c.status === 'partial').length} registros
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-400">Créditos Ativos</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-2">
            {credits.filter(c => c.status !== 'paid').length}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Ainda não quitados
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="text-sm font-medium text-green-700 dark:text-green-400">Créditos Pagos</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-300 mt-2">
            {credits.filter(c => c.status === 'paid').length}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            Quitados
          </div>
        </div>
      </div>

      {/* Alerta de créditos pendentes */}
      {totalPending > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você tem <strong>{formatCurrency(totalPending)}</strong> em créditos pendentes de pagamento
          </AlertDescription>
        </Alert>
      )}

      {/* Filtros e Botão */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowDialog(true)} className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Crédito
        </Button>
      </div>

      {/* Tabela de Créditos */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Pendente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCredits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                  Nenhum crédito encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredCredits.map((credit) => (
                <TableRow key={credit.id}>
                  <TableCell className="font-medium">{credit.customerName}</TableCell>
                  <TableCell>{credit.customerPhone || '-'}</TableCell>
                  <TableCell>{formatCurrency(credit.total)}</TableCell>
                  <TableCell>{formatCurrency(credit.amountPaid)}</TableCell>
                  <TableCell className="font-medium">
                    <span className={credit.remainingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                      {formatCurrency(credit.remainingBalance)}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(credit.status)}</TableCell>
                  <TableCell>{formatDate(credit.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {credit.status !== 'paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCredit(credit);
                            setShowPaymentDialog(true);
                          }}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCredit(credit.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Novo Crédito */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Novo Crédito</DialogTitle>
            <DialogDescription>
              Registre uma venda a crédito para um cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="customer-name">Nome do Cliente *</Label>
              <Input
                id="customer-name"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="João Silva"
              />
            </div>

            <div>
              <Label htmlFor="customer-phone">Telefone (opcional)</Label>
              <Input
                id="customer-phone"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="+244 923 456 789"
              />
            </div>

            <div>
              <Label htmlFor="total">Valor Total *</Label>
              <Input
                id="total"
                type="number"
                value={formData.total}
                onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Descrição dos produtos..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCredit}>
              Registrar Crédito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar Pagamento */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Cliente: <strong>{selectedCredit?.customerName}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedCredit && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm">
                <div className="flex justify-between mb-2">
                  <span>Total do crédito:</span>
                  <span className="font-medium">{formatCurrency(selectedCredit.total)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Já pago:</span>
                  <span className="font-medium">{formatCurrency(selectedCredit.amountPaid)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Pendente:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(selectedCredit.remainingBalance)}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="payment-amount">Valor do Pagamento *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  max={selectedCredit.remainingBalance}
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="payment-method">Método de Pagamento *</Label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="emola">Emola</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePayment}>
              Registrar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
