import { Building2, Check } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useBusiness } from '@/contexts/BusinessContext';
import { cn } from '@/lib/utils';

export function BusinessSwitcher() {
  const { business, businesses, switchBusiness } = useBusiness();

  if (businesses.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">{business?.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="p-2">
          <p className="text-xs text-muted-foreground mb-2">Estabelecimentos</p>
          {businesses.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onClick={() => switchBusiness(b.id)}
              className={cn(
                "flex items-center justify-between cursor-pointer",
                business?.id === b.id && "bg-primary/5"
              )}
            >
              <div className="flex flex-col">
                <span className="font-medium">{b.name}</span>
                {b.address && (
                  <span className="text-xs text-muted-foreground">{b.address}</span>
                )}
              </div>
              {business?.id === b.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
