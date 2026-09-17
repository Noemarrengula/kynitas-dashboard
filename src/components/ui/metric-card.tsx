import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type TrendType = "increase" | "decrease" | "neutral";

export interface MetricTrend {
  value: number;
  type: TrendType;
  period?: string;
}

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  trend?: MetricTrend;
  loading?: boolean;
  titleClassName?: string;
}

const trendStyles: Record<TrendType, { color: string; Icon: LucideIcon }> = {
  increase: { color: "text-success", Icon: TrendingUp },
  decrease: { color: "text-destructive", Icon: TrendingDown },
  neutral: { color: "text-muted-foreground", Icon: Minus },
};

function MetricCard({
  title,
  value,
  icon: Icon,
  hint,
  trend,
  loading = false,
  className,
  titleClassName,
  ...props
}: MetricCardProps) {
  const Trend = trend ? trendStyles[trend.type] : undefined;

  return (
    <Card
      className={cn("transition-shadow hover:shadow-md hover:shadow-primary/5", className)}
      {...props}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium text-muted-foreground truncate", titleClassName)}>
            {title}
          </p>
          {Icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center py-2">
            <LoadingSpinner size="sm" text="" />
          </div>
        ) : (
          <p className="kpi-value mt-2">{value}</p>
        )}

        <div className="mt-1.5 flex items-center gap-2 min-h-4">
          {Trend && (
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium", Trend.color)}>
              <Trend.Icon className="h-3 w-3" />
              {Math.abs(trend!.value)}%
              {trend!.period ? ` ${trend!.period}` : ""}
            </span>
          )}
          {hint && !Trend && (
            <span className="text-xs text-muted-foreground truncate">{hint}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { MetricCard };