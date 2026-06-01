import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface QuickStatProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  format?: 'currency' | 'number' | 'percentage';
}

export function QuickStat({ title, value, change, format = 'number' }: QuickStatProps) {
  const formatValue = (val: string | number) => {
    if (format === 'currency') {
      return formatCurrency(Number(val));
    }
    if (format === 'percentage') {
      return `${val}%`;
    }
    return val.toString();
  };

  const getChangeIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case 'increase':
        return <TrendingUp className="h-3 w-3" />;
      case 'decrease':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getChangeColor = () => {
    if (!change) return '';
    
    switch (change.type) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{formatValue(value)}</p>
          {change && (
            <div className={`flex items-center gap-1 text-xs ${getChangeColor()}`}>
              {getChangeIcon()}
              <span>{Math.abs(change.value)}% {change.period}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}