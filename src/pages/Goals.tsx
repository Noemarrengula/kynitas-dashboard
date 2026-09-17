import { useState } from 'react';
import { Target, Plus, Trash2, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useBusinessGoals, BusinessGoal } from '@/hooks/useBusinessGoals';
import { useI18n } from '@/contexts/I18nContext';
import { formatCurrency } from '@/lib/receipt';

const typeLabels: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

const categoryLabels: Record<string, string> = {
  revenue: 'Receita',
  sales_count: 'Nº de Vendas',
  avg_ticket: 'Ticket Médio',
};

const statusConfig: Record<string, { label: string; color: string; bar: string }> = {
  not_started: { label: 'Não iniciada', color: 'text-muted-foreground', bar: 'bg-muted' },
  in_progress: { label: 'Em progresso', color: 'text-blue-600', bar: 'bg-blue-500' },
  achieved: { label: 'Alcançada', color: 'text-green-600', bar: 'bg-green-500' },
  overachieved: { label: 'Superada', color: 'text-emerald-600', bar: 'bg-emerald-500' },
};

export default function Goals() {
  const { goals, loading, createGoal, updateGoal, deleteGoal } = useBusinessGoals();
  const { t } = useI18n();
  const [showDialog, setShowDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<BusinessGoal | null>(null);
  const [form, setForm] = useState({
    type: 'monthly',
    category: 'revenue',
    target: '',
    targetLabel: '',
  });

  const openCreate = () => {
    setEditingGoal(null);
    setForm({ type: 'monthly', category: 'revenue', target: '', targetLabel: '' });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const target = parseFloat(form.target);
    if (isNaN(target) || target <= 0) return;

    const goalData = {
      type: form.type as BusinessGoal['type'],
      category: form.category as BusinessGoal['category'],
      target,
      targetLabel: form.targetLabel || undefined,
      period: new Date().toISOString().slice(0, 10),
    };

    if (editingGoal) {
      await updateGoal(editingGoal.id, goalData);
    } else {
      await createGoal(goalData);
    }
    setShowDialog(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const activeGoals = goals.filter(g => g.status !== 'not_started' || g.target > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.goals')}</h1>
          <p className="text-muted-foreground">Acompanhe o progresso dos seus objectivos</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova Meta
        </Button>
      </div>

      {activeGoals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma meta definida</p>
            <p className="text-sm text-muted-foreground mb-4">Crie metas diárias, semanais ou mensais</p>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Criar Meta</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeGoals.map(goal => {
            const cfg = statusConfig[goal.status];
            const icon = goal.category === 'revenue' ? DollarSign :
                         goal.category === 'sales_count' ? ShoppingCart : TrendingUp;

            return (
              <Card key={goal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {icon({ className: 'h-4 w-4 text-primary' })}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{categoryLabels[goal.category]}</CardTitle>
                        <p className="text-xs text-muted-foreground">{typeLabels[goal.type]}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color} bg-muted`}>
                      {cfg.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{goal.progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${cfg.bar}`}
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{goal.current.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })}</span>
                      <span className="font-medium">
                        {goal.target.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive w-full" onClick={() => deleteGoal(goal.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Editar' : 'Nova'} Meta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor da Meta</Label>
              <Input
                type="number"
                value={form.target}
                onChange={e => setForm({ ...form, target: e.target.value })}
                placeholder="Ex: 50000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
