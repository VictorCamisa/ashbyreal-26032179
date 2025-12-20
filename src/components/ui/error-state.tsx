import * as React from "react";
import { AlertTriangle, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  variant?: "default" | "destructive";
  className?: string;
}

export function ErrorState({
  title = "Algo deu errado",
  description = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
  variant = "default",
  className,
}: ErrorStateProps) {
  const Icon = variant === "destructive" ? XCircle : AlertTriangle;
  
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div 
        className={cn(
          "h-16 w-16 rounded-2xl flex items-center justify-center mb-4",
          variant === "destructive" 
            ? "bg-destructive/10" 
            : "bg-amber-500/10"
        )}
      >
        <Icon 
          className={cn(
            "h-8 w-8",
            variant === "destructive" 
              ? "text-destructive" 
              : "text-amber-500"
          )} 
        />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
