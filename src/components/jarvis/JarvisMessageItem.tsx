import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Copy, Loader2, RotateCcw, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { JarvisOrb } from "./JarvisOrb";
import type { JarvisMessage } from "./types";

interface JarvisMessageItemProps {
  message: JarvisMessage;
  onRetry?: (message: JarvisMessage) => void;
}

/** Renderiza **negrito** e quebras de linha sem trazer uma lib de markdown só para isso. */
function RichText({ text }: { text: string }) {
  const bold = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((chunk, cIndex) =>
      chunk.startsWith("**") && chunk.endsWith("**") ? (
        <strong key={cIndex} className="font-semibold text-foreground">
          {chunk.slice(2, -2)}
        </strong>
      ) : (
        <span key={cIndex}>{chunk}</span>
      ),
    );

  return (
    <>
      {text.split("\n\n").map((paragraph, pIndex) => (
        <p key={pIndex} className={cn(pIndex > 0 && "mt-3")}>
          {paragraph.split("\n").map((line, lIndex) => (
            <span key={lIndex} className={cn(lIndex > 0 && "mt-1 block")}>
              {bold(line)}
            </span>
          ))}
        </p>
      ))}
    </>
  );
}

const TOOL_ICON = {
  running: <Loader2 className="h-3 w-3 animate-spin text-primary" />,
  done: <Check className="h-3 w-3 text-success" />,
  failed: <X className="h-3 w-3 text-destructive" />,
} as const;

export function JarvisMessageItem({ message, onRetry }: JarvisMessageItemProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const isUser = message.role === "user";

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    toast.success("Resposta copiada");
  };

  const time = message.createdAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] sm:max-w-[70%]">
          <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-soft">
            <RichText text={message.content} />
          </div>
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{time}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-3"
    >
      <JarvisOrb size="sm" status={message.streaming ? "thinking" : "online"} className="mt-0.5" />

      <div className="min-w-0 flex-1 space-y-2">
        {message.tools && message.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.tools.map((tool) => (
              <span
                key={tool.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/50 px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                {TOOL_ICON[tool.state]}
                <span className="text-foreground/80">{tool.label}</span>
                {tool.detail && <span className="hidden sm:inline">· {tool.detail}</span>}
              </span>
            ))}
          </div>
        )}

        <div className="rounded-2xl rounded-tl-md border border-border/50 bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground shadow-soft">
          <RichText text={message.content} />
          {message.streaming && (
            <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-primary" />
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Fontes</span>
            {message.sources.map((source) =>
              source.href ? (
                <Link
                  key={source.id}
                  to={source.href}
                  className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {source.label}
                </Link>
              ) : (
                <span
                  key={source.id}
                  className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {source.label}
                </span>
              ),
            )}
          </div>
        )}

        {!message.streaming && (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/thread:opacity-100 sm:opacity-60 hover:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copiar</TooltipContent>
            </Tooltip>

            {onRetry && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRetry(message)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refazer</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-7 w-7", feedback === "up" && "text-success")}
                  onClick={() => setFeedback(feedback === "up" ? null : "up")}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Resposta útil</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-7 w-7", feedback === "down" && "text-destructive")}
                  onClick={() => setFeedback(feedback === "down" ? null : "down")}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Resposta ruim</TooltipContent>
            </Tooltip>

            <span className="ml-1 text-[10px] text-muted-foreground">{time}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
