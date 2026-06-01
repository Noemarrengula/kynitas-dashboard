import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDatabase } from '@/hooks/useDatabase';
import { format, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

export function SalesChart() {
  const { sales } = useDatabase();

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayName = format(date, 'EEE', { locale: pt });
    const daySales = sales
      .filter(s => format(new Date(s.createdAt), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
      .reduce((acc, s) => acc + s.total, 0);
    
    return {
      day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      vendas: daySales,
    };
  });

  return (
    <div className="bg-card border rounded-xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <h3 className="text-lg font-semibold mb-6">Vendas dos Últimos 7 Dias</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={last7Days}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(330, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(330, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(330, 10%, 90%)" />
            <XAxis 
              dataKey="day" 
              stroke="hsl(330, 15%, 45%)"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(330, 15%, 45%)"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(330, 10%, 90%)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Vendas']}
            />
            <Area
              type="monotone"
              dataKey="vendas"
              stroke="hsl(330, 100%, 50%)"
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
