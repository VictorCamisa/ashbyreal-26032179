import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingState({
  message = "Carregando...",
  className,
  size = "md",
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center gap-4",
        className
      )}
    >
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
      <LoadingState message={message} />
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-muted/50 rounded-lg", className)} />
  );
}

interface LoadingCardProps {
  rows?: number;
}

export function LoadingCard({ rows = 3 }: LoadingCardProps) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
      <div className="flex items-center gap-4">
        <LoadingSkeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton className="h-4 w-1/3" />
          <LoadingSkeleton className="h-3 w-1/2" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
