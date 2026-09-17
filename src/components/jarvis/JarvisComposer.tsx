import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, Square, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface JarvisComposerProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy?: boolean;
  /** Preenche o campo a partir de um atalho e mantém o foco. */
  draft?: string;
  placeholder?: string;
}

const MAX_HEIGHT = 180;

export function JarvisComposer({
  onSend,
  onStop,
  busy = false,
  draft,
  placeholder,
}: JarvisComposerProps) {
  const isMobile = useIsMobile();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    // Vazio: deixa o rows=1 mandar — o placeholder longo inflaria o scrollHeight.
    if (!el.value) {
      el.style.height = "";
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  };

  useEffect(autoResize, [value]);

  useEffect(() => {
    if (draft === undefined) return;
    setValue(draft);
    textareaRef.current?.focus();
  }, [draft]);

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="border-t border-border/40 bg-background/80 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
      <div
        className={cn(
          "mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-soft transition-all duration-200",
          "focus-within:border-primary/40 focus-within:shadow-medium",
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground">
              <Paperclip className="h-4 w-4" />
              <span className="sr-only">Anexar arquivo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Anexar contexto (em breve)</TooltipContent>
        </Tooltip>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={
            placeholder ??
            (isMobile ? "Pergunte ao Jarvis…" : "Pergunte ao Jarvis sobre pedidos, estoque, caixa ou clientes…")
          }
          aria-label="Mensagem para o Jarvis"
          className="max-h-[180px] flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
        />

        {busy && onStop ? (
          <Button size="icon" variant="secondary" className="h-9 w-9 shrink-0 rounded-xl" onClick={onStop}>
            <Square className="h-3.5 w-3.5 fill-current" />
            <span className="sr-only">Parar resposta</span>
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl transition-transform duration-200 disabled:opacity-40"
            disabled={!value.trim()}
            onClick={submit}
          >
            <ArrowUp className="h-4 w-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        )}
      </div>

      <p className="mx-auto mt-2 flex max-w-3xl items-center gap-1.5 px-1 text-[11px] text-muted-foreground/70">
        <Wand2 className="h-3 w-3" />
        Jarvis lê os módulos habilitados. Confira números críticos antes de agir.
        <kbd className="ml-auto hidden rounded border border-border/60 px-1.5 py-0.5 font-sans text-[10px] sm:inline">
          Enter envia · Shift+Enter quebra linha
        </kbd>
      </p>
    </div>
  );
}
