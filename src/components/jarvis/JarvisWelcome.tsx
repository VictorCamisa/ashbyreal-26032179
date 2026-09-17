import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { JarvisOrb } from "./JarvisOrb";
import { JARVIS_SUGGESTIONS } from "./types";

interface JarvisWelcomeProps {
  onPick: (prompt: string) => void;
  userName?: string;
}

export function JarvisWelcome({ onPick, userName }: JarvisWelcomeProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <JarvisOrb size="lg" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="mt-5 text-xl font-semibold tracking-tight sm:text-2xl"
      >
        {greeting}
        {userName ? `, ${userName}` : ""}. Sou o Jarvis.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground"
      >
        Leio pedidos, caixa, estoque e clientes para responder em linguagem natural — e explico
        de onde tirei cada número.
      </motion.p>

      <div className="mt-7 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {JARVIS_SUGGESTIONS.map((suggestion, index) => (
          <motion.button
            key={suggestion.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onPick(suggestion.prompt)}
            className="group flex items-start gap-2 rounded-2xl border border-border/50 bg-card p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-medium"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">{suggestion.label}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {suggestion.prompt}
              </p>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
