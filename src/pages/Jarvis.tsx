import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, Settings2, Sliders } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { JarvisComposer } from "@/components/jarvis/JarvisComposer";
import { JarvisContextPanel } from "@/components/jarvis/JarvisContextPanel";
import { JarvisMessageItem } from "@/components/jarvis/JarvisMessageItem";
import { JarvisOrb } from "@/components/jarvis/JarvisOrb";
import { JarvisThreadList } from "@/components/jarvis/JarvisThreadList";
import { JarvisWelcome } from "@/components/jarvis/JarvisWelcome";
import { JARVIS_THREADS, draftJarvisReply, jarvisId } from "@/components/jarvis/mock";
import { JARVIS_SKILLS, type JarvisSkill, type JarvisStatus, type JarvisThread } from "@/components/jarvis/types";

const STATUS_LABEL: Record<JarvisStatus, string> = {
  online: "Pronto",
  thinking: "Pensando…",
  acting: "Executando…",
  offline: "Offline",
};

/** Escreve a resposta aos poucos para dar ritmo à conversa. */
const STREAM_STEP_MS = 14;

/** Texto plano para a lista de conversas — sem markdown nem quebras. */
const toPreview = (text: string) =>
  text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim().slice(0, 80);

export default function Jarvis() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<JarvisThread[]>(JARVIS_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string>(JARVIS_THREADS[0].id);
  const [skills, setSkills] = useState<JarvisSkill[]>(JARVIS_SKILLS);
  const [status, setStatus] = useState<JarvisStatus>("online");
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [contextOpen, setContextOpen] = useState(false);

  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollAnchor = useRef<HTMLDivElement>(null);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? threads[0],
    [threads, activeThreadId],
  );
  const busy = status === "thinking" || status === "acting";

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeThread?.messages, status]);

  const stopStream = useCallback(() => {
    if (streamTimer.current) {
      clearInterval(streamTimer.current);
      streamTimer.current = null;
    }
    setStatus("online");
    setThreads((prev) =>
      prev.map((thread) => ({
        ...thread,
        messages: thread.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
      })),
    );
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const patchThread = useCallback(
    (threadId: string, patch: (thread: JarvisThread) => JarvisThread) => {
      setThreads((prev) => prev.map((t) => (t.id === threadId ? patch(t) : t)));
    },
    [],
  );

  const send = useCallback(
    (text: string) => {
      if (busy) return;
      const threadId = activeThread.id;
      const userMessage = {
        id: jarvisId("msg"),
        role: "user" as const,
        content: text,
        createdAt: new Date(),
      };

      patchThread(threadId, (thread) => ({
        ...thread,
        title: thread.messages.length === 0 ? text.slice(0, 42) : thread.title,
        preview: toPreview(text),
        updatedAt: new Date(),
        messages: [...thread.messages, userMessage],
      }));

      setStatus("thinking");

      const reply = draftJarvisReply(text);
      const replyId = jarvisId("msg");

      // Pequena pausa de "raciocínio" antes de começar a escrever.
      window.setTimeout(() => {
        patchThread(threadId, (thread) => ({
          ...thread,
          messages: [
            ...thread.messages,
            { ...reply, id: replyId, content: "", createdAt: new Date(), streaming: true },
          ],
        }));
        setStatus("acting");

        let cursor = 0;
        streamTimer.current = setInterval(() => {
          cursor += 3;
          const done = cursor >= reply.content.length;
          const slice = reply.content.slice(0, cursor);

          setThreads((prev) =>
            prev.map((thread) =>
              thread.id === threadId
                ? {
                    ...thread,
                    preview: done ? toPreview(slice) : thread.preview,
                    messages: thread.messages.map((m) =>
                      m.id === replyId ? { ...m, content: slice, streaming: !done } : m,
                    ),
                  }
                : thread,
            ),
          );

          if (done) stopStream();
        }, STREAM_STEP_MS);
      }, 550);
    },
    [activeThread, busy, patchThread, stopStream],
  );

  const createThread = useCallback(() => {
    stopStream();
    const thread: JarvisThread = {
      id: jarvisId("thread"),
      title: "Nova conversa",
      preview: "Ainda sem mensagens",
      updatedAt: new Date(),
      messages: [],
    };
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
  }, [stopStream]);

  const deleteThread = useCallback(
    (id: string) => {
      setThreads((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (next.length === 0) {
          const fresh: JarvisThread = {
            id: jarvisId("thread"),
            title: "Nova conversa",
            preview: "Ainda sem mensagens",
            updatedAt: new Date(),
            messages: [],
          };
          setActiveThreadId(fresh.id);
          return [fresh];
        }
        if (id === activeThreadId) setActiveThreadId(next[0].id);
        return next;
      });
    },
    [activeThreadId],
  );

  /** Refaz a resposta a partir da última pergunta do usuário. */
  const retry = useCallback(
    (messageId: string) => {
      const index = activeThread.messages.findIndex((m) => m.id === messageId);
      const previousUser = [...activeThread.messages.slice(0, index)]
        .reverse()
        .find((m) => m.role === "user");
      if (!previousUser) return;
      patchThread(activeThread.id, (thread) => ({
        ...thread,
        messages: thread.messages.filter((m) => m.id !== messageId),
      }));
      send(previousUser.content);
    },
    [activeThread, patchThread, send],
  );

  const pickSuggestion = useCallback((prompt: string) => {
    // A sugestão vira rascunho editável em vez de disparar direto.
    setDraft(prompt);
    setTimeout(() => setDraft(undefined), 50);
  }, []);

  const toggleSkill = useCallback((key: string, enabled: boolean) => {
    setSkills((prev) => prev.map((s) => (s.key === key ? { ...s, enabled } : s)));
  }, []);

  const enabledSkills = skills.filter((s) => s.enabled).length;

  return (
    <div className="animate-fade-in flex h-[calc(100vh-13rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/40 shadow-soft lg:h-[calc(100vh-11rem)]">
      {/* Cabeçalho do console */}
      <header className="flex items-center gap-3 border-b border-border/40 px-3 py-2.5 sm:px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl lg:hidden">
              <History className="h-4 w-4" />
              <span className="sr-only">Conversas</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 pt-6">
            <SheetTitle className="sr-only">Conversas do Jarvis</SheetTitle>
            <JarvisThreadList
              threads={threads}
              activeId={activeThread.id}
              onSelect={setActiveThreadId}
              onCreate={createThread}
              onDelete={deleteThread}
            />
          </SheetContent>
        </Sheet>

        <JarvisOrb size="sm" status={status} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold tracking-tight">Jarvis</h1>
            <Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[9px] font-normal uppercase tracking-wide">
              Beta
            </Badge>
          </div>
          <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === "offline" ? "bg-muted-foreground" : "bg-success",
                busy && "animate-pulse bg-primary",
              )}
            />
            <span className="truncate">
              {STATUS_LABEL[status]}
              <span className="hidden sm:inline"> · {enabledSkills} módulos conectados</span>
            </span>
          </p>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
              <Settings2 className="h-4 w-4" />
              <span className="sr-only">Configurar agente</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Configurar agente</TooltipContent>
        </Tooltip>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-xl xl:hidden"
          onClick={() => setContextOpen(true)}
        >
          <Sliders className="h-4 w-4" />
          <span className="sr-only">Habilidades e memória</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Conversas */}
        <aside className="hidden w-[232px] shrink-0 border-r border-border/40 lg:block">
          <JarvisThreadList
            threads={threads}
            activeId={activeThread.id}
            onSelect={setActiveThreadId}
            onCreate={createThread}
            onDelete={deleteThread}
          />
        </aside>

        {/* Conversa ativa */}
        <section className="group/thread flex min-w-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            {activeThread.messages.length === 0 ? (
              <JarvisWelcome onPick={pickSuggestion} userName={user?.email?.split("@")[0]} />
            ) : (
              <div className="mx-auto max-w-3xl space-y-5 px-3 py-5 sm:px-6">
                <AnimatePresence initial={false}>
                  {activeThread.messages.map((message) => (
                    <JarvisMessageItem
                      key={message.id}
                      message={message}
                      onRetry={message.role === "jarvis" ? () => retry(message.id) : undefined}
                    />
                  ))}
                </AnimatePresence>

                {status === "thinking" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 text-xs text-muted-foreground"
                  >
                    <JarvisOrb size="sm" status="thinking" />
                    <span className="animate-pulse">Consultando os módulos conectados…</span>
                  </motion.div>
                )}

                <div ref={scrollAnchor} />
              </div>
            )}
          </ScrollArea>

          <JarvisComposer onSend={send} onStop={stopStream} busy={busy} draft={draft} />
        </section>

        {/* Habilidades, memória e atividade */}
        <aside className="hidden w-[300px] shrink-0 border-l border-border/40 xl:block">
          <JarvisContextPanel skills={skills} onToggleSkill={toggleSkill} />
        </aside>
      </div>

      <Sheet open={contextOpen} onOpenChange={setContextOpen}>
        <SheetContent side="right" className="w-[320px] p-0 pt-6">
          <SheetTitle className="sr-only">Habilidades, memória e atividade</SheetTitle>
          <JarvisContextPanel skills={skills} onToggleSkill={toggleSkill} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
