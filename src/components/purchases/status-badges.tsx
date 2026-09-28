import {
  FileText,
  Send,
  CheckCircle2,
  PackageOpen,
  PackageCheck,
  XCircle,
  Clock,
  Loader2,
  PackageX,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PurchaseOrderStatus, LossStatus } from '@/types';

const PO_STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; className: string; icon: LucideIcon }> = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground', icon: FileText },
  sent: { label: 'Enviado', className: 'bg-primary/10 text-primary', icon: Send },
  confirmed: { label: 'Confirmado', className: 'bg-primary/10 text-primary', icon: CheckCircle2 },
  partial: { label: 'Parcial', className: 'bg-warning/10 text-warning', icon: PackageOpen },
  received: { label: 'Recebido', className: 'bg-success/10 text-success', icon: PackageCheck },
  cancelled: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive', icon: XCircle },
};

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const cfg = PO_STATUS_CONFIG[status] || PO_STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <Badge className={cn('gap-1 border-0', cfg.className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

const LOSS_STATUS_CONFIG: Record<LossStatus, { label: string; className: string; icon: LucideIcon }> = {
  pending: { label: 'Pendente', className: 'bg-warning/10 text-warning', icon: Clock },
  confirmed: { label: 'Confirmada', className: 'bg-destructive/10 text-destructive', icon: PackageX },
  cancelled: { label: 'Cancelada', className: 'bg-muted text-muted-foreground', icon: XCircle },
};

export function LossStatusBadge({ status }: { status: LossStatus }) {
  const cfg = LOSS_STATUS_CONFIG[status] || LOSS_STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <Badge className={cn('gap-1 border-0', cfg.className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

export function LoadingRow() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
      <Loader2 className="h-4 w-4 animate-spin" />
      A carregar...
    </div>
  );
}