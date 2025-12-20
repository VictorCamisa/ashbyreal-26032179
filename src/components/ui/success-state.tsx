import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface SuccessStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function SuccessState({
  title,
  description,
  action,
  className,
}: SuccessStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div className="h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm" variant="default">
          {action.label}
        </Button>
      )}
    </div>
  );
}
