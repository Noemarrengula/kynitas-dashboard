import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

export interface RevenueTrendDatum {
  day: string;
  receita: number;
  media?: number | null;
}

export function RevenueTrendChart({ data }: { data: RevenueTrendDatum[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita Diária (30 dias) + Média Móvel 7 dias</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCurrency(v)} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" fill="url(#colorRev)" strokeWidth={2} name="Receita" />
            <Line type="monotone" dataKey="media" stroke="#f59e0b" strokeWidth={2} dot={false} name="Média 7 dias" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export interface ForecastBarDatum {
  day: string;
  forecast: number;
}

export function ForecastBarChart({ data }: { data: ForecastBarDatum[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Previsão Próximos 7 Dias</CardTitle>
      </CardHeader>
      <CardContent className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" />
            <YAxis tickFormatter={(v: number) => formatCurrency(v)} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="forecast" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Previsão" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}