import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { JarvisStatus } from "./types";

interface JarvisOrbProps {
  status?: JarvisStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-20 w-20",
} as const;

const RING_COLOR: Record<JarvisStatus, string> = {
  online: "from-primary/70 to-chart-3/70",
  thinking: "from-primary to-chart-3",
  acting: "from-warning to-primary",
  offline: "from-muted-foreground/40 to-muted-foreground/20",
};

/**
 * Identidade visual do Jarvis: um núcleo que respira quando ocioso
 * e acelera enquanto o agente pensa ou executa.
 */
export function JarvisOrb({ status = "online", size = "md", className }: JarvisOrbProps) {
  const reduceMotion = useReducedMotion();
  const active = status === "thinking" || status === "acting";

  return (
    <div className={cn("relative shrink-0", SIZES[size], className)} aria-hidden>
      <motion.span
        className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-br blur-md",
          RING_COLOR[status],
          status === "offline" ? "opacity-30" : "opacity-50",
        )}
        animate={
          reduceMotion
            ? undefined
            : { scale: active ? [1, 1.25, 1] : [1, 1.08, 1], opacity: active ? [0.45, 0.8, 0.45] : [0.35, 0.5, 0.35] }
        }
        transition={{ duration: active ? 1.4 : 3.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className={cn(
          "relative grid h-full w-full place-items-center rounded-full bg-gradient-to-br",
          RING_COLOR[status],
        )}
      >
        <div className="grid h-[82%] w-[82%] place-items-center rounded-full bg-background/85 backdrop-blur-sm">
          <motion.span
            className={cn("rounded-full bg-gradient-to-br", RING_COLOR[status])}
            style={{ width: "42%", height: "42%" }}
            animate={reduceMotion ? undefined : { scale: active ? [1, 0.7, 1] : [1, 0.88, 1] }}
            transition={{ duration: active ? 0.9 : 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}
