import * as React from "react";

import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  size?: "sm" | "md" | "lg";
  minHeight?: string;
}

function LoadingState({
  label = "Carregando...",
  size = "md",
  minHeight = "min-h-[240px]",
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-muted-foreground",
        minHeight,
        className,
      )}
      {...props}
    >
      <LoadingSpinner size={size} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export { LoadingState };