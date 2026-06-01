import { useState } from 'react';
import { Users, Plus, Phone, Mail, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  salary: number;
  hireDate: Date;
  active: boolean;
  notes: string;
}

const roleLabels: Record<string, string> = {
  waiter: 'Garçom',
  cook: 'Cozinheiro',
  cashier: 'Caixa',
  manager: 'Gerente',
  cleaner: 'Limpeza',
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
    salary: '',
    hireDate: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.role || !formData.hireDate) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      role: formData.role,
      salary: parseFloat(formData.salary) || 0,
      hireDate: new Date(formData.hireDate),
      active: true,
      notes: formData.notes,
    };

    setEmployees([...employees, newEmployee]);
    setFormData({ name: '', phone: '', email: '', role: '', salary: '', hireDate: '', notes: '' });
    setDialogOpen(false);
    toast({ title: 'Funcionário cadastrado!' });
  };

  const activeEmployees = employees.filter(e => e.active);
  const totalSalaries = activeEmployees.reduce((acc, e) => acc + e.salary, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Funcionários
          </h1>
          <p className="text-muted-foreground">Gestão de equipe</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Funcionário
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total de Funcionários</p>
          <p className="text-3xl font-bold">{activeEmployees.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Folha de Pagamento</p>
          <p className="text-3xl font-bold">{formatCurrency(totalSalaries)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Salário Médio</p>
          <p className="text-3xl font-bold">
            {formatCurrency(activeEmployees.length > 0 ? totalSalaries / activeEmployees.length : 0)}
          </p>
        </Card>
      </div>

      {/* Lista de Funcionários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((employee) => (
          <Card key={employee.id} className="p-6">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{employee.name}</h3>
                  <Badge variant="secondary">{roleLabels[employee.role]}</Badge>
                </div>
                <Badge variant={employee.active ? 'default' : 'secondary'}>
                  {employee.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              {employee.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {employee.phone}
                </div>
              )}

              {employee.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {employee.email}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Desde {format(employee.hireDate, 'dd/MM/yyyy', { locale: pt })}
              </div>

              {employee.salary > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">Salário</p>
                  <p className="text-xl font-bold">{formatCurrency(employee.salary)}</p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {employees.length === 0 && (
        <Card className="p-12">
          <p className="text-center text-muted-foreground">Nenhum funcionário cadastrado</p>
        </Card>
      )}

      {/* Dialog de Cadastro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Funcionário</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Função *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Salário (MT)</Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hireDate">Data de Contratação *</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
