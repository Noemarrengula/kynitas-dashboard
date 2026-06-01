import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';

export type DateRange = {
  from: Date;
  to: Date;
  label: string;
};

interface DateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presetRanges: DateRange[] = [
  {
    from: new Date(),
    to: new Date(),
    label: 'Hoje'
  },
  {
    from: subDays(new Date(), 1),
    to: subDays(new Date(), 1),
    label: 'Ontem'
  },
  {
    from: subDays(new Date(), 6),
    to: new Date(),
    label: 'Últimos 7 dias'
  },
  {
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: new Date(),
    label: 'Esta semana'
  },
  {
    from: startOfMonth(new Date()),
    to: new Date(),
    label: 'Este mês'
  },
  {
    from: subDays(new Date(), 29),
    to: new Date(),
    label: 'Últimos 30 dias'
  }
];

export function DateFilter({ value, onChange }: DateFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {value.label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {presetRanges.map((range) => (
          <DropdownMenuItem
            key={range.label}
            onClick={() => onChange(range)}
            className={value.label === range.label ? 'bg-accent' : ''}
          >
            {range.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}