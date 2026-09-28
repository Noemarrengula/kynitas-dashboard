import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { computeSalesForecast } from '@/lib/forecast';
import { RevenueTrendChart, ForecastBarChart } from '@/components/bi/ForecastCharts';
import { useI18n } from '@/contexts/I18nContext';

export default function Executive() {
  const { sales } = useStore();
  const { t } = useI18n();

  const analysis = useMemo(() => computeSalesForecast(sales), [sales]);

  const chartData = useMemo(() => {
    return analysis.last30Days.map((day, i) => ({
      day: format(day, 'dd/MM', { locale: pt }),
      receita: analysis.dailyRevenue[i],
      media: analysis.ma7[i] || null,
    }));
  }, [analysis]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.executive')}</h1>
        <p className="text-muted-foreground">Previsões, tendências e indicadores</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Previsão Próximos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">
                {formatCurrency(analysis.totalForecast7)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média 30 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{formatCurrency(analysis.avg30)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tendência (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {analysis.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-2xl font-bold ${analysis.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.trendPct.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoje vs Ontem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">
                {analysis.yesterdayRevenue > 0
                  ? (((analysis.todayRevenue - analysis.yesterdayRevenue) / analysis.yesterdayRevenue) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <RevenueTrendChart data={chartData} />

      <ForecastBarChart data={analysis.forecastNext7} />
    </div>
  );
}