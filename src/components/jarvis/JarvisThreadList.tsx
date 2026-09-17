import { MessageSquarePlus, Pin, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { JarvisThread } from "./types";

interface JarvisThreadListProps {
  threads: JarvisThread[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function relativeTime(date: Date) {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function JarvisThreadList({
  threads,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: JarvisThreadListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? threads.filter(
          (t) => t.title.toLowerCase().includes(q) || t.preview.toLowerCase().includes(q),
        )
      : threads;
    return [...matches].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [threads, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 p-3">
        <Button onClick={onCreate} className="w-full justify-start gap-2 rounded-xl" size="sm">
          <MessageSquarePlus className="h-4 w-4" />
          Nova conversa
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversas"
            className="h-8 rounded-xl pl-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 pb-3 [&>[data-radix-scroll-area-viewport]>div]:!block">
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Nenhuma conversa encontrada.
          </p>
        ) : (
          <div className="space-y-1">
            {filtered.map((thread) => (
              <div
                key={thread.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(thread.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(thread.id);
                  }
                }}
                className={cn(
                  "group/item w-full cursor-pointer rounded-xl px-2.5 py-2 text-left transition-colors duration-200",
                  thread.id === activeId
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60",
                )}
              >
                <div className="flex items-center gap-1.5">
                  {thread.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                    {thread.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground group-hover/item:hidden">
                    {relativeTime(thread.updatedAt)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(thread.id);
                    }}
                    className="hidden shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive group-hover/item:block"
                    aria-label={`Excluir conversa ${thread.title}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{thread.preview}</p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
