import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface MobileCardListProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileCardList({ children, className }: MobileCardListProps) {
  return (
    <div className={cn("space-y-2 sm:hidden", className)}>
      {children}
    </div>
  );
}

interface MobileCardItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileCardItem({ children, onClick, className }: MobileCardItemProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card border border-border/60 rounded-xl p-3 transition-all",
        onClick && "cursor-pointer active:scale-[0.98] hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

interface MobileCardHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  showChevron?: boolean;
}

export function MobileCardHeader({ title, subtitle, badge, showChevron = true }: MobileCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{title}</span>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {showChevron && (
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      )}
    </div>
  );
}

interface MobileCardRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function MobileCardRow({ label, value, className }: MobileCardRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2 text-xs", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate text-right">{value}</span>
    </div>
  );
}

interface MobileCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileCardFooter({ children, className }: MobileCardFooterProps) {
  return (
    <div className={cn("flex items-center gap-2 pt-2 mt-2 border-t border-border/50", className)}>
      {children}
    </div>
  );
}
