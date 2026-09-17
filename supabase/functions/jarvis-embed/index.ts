// jarvis-embed — mantém a base vetorial do Jarvis em dia.
//
// Fluxo: regenera os documentos a partir dos dados vivos (jarvis_refresh_documents)
// e gera embedding apenas para o que ficou pendente. Como o refresh só invalida
// documentos cujo conteúdo mudou, rodar isso de hora em hora custa quase nada.
//
// POST { mode?: "incremental" | "full", kinds?: string[], limit?: number }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  EMBEDDING_MODEL,
  EmbeddingError,
  embedTexts,
  toVectorLiteral,
} from "../_shared/jarvis-embeddings.ts";

// Lotes grandes o suficiente para ser rápido, pequenos o suficiente para caber
// no limite de tokens por requisição do provedor.
const BATCH_SIZE = 64;
// Teto por invocação: evita estourar o tempo máximo da edge function.
const DEFAULT_LIMIT = 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const started = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const mode: "incremental" | "full" = body.mode === "full" ? "full" : "incremental";
    const kinds: string[] | null = Array.isArray(body.kinds) && body.kinds.length > 0 ? body.kinds : null;
    const limit: number = Math.min(Number(body.limit) || DEFAULT_LIMIT, 5000);

    // 1. Sincroniza os documentos com os dados atuais.
    const { data: refresh, error: refreshError } = await supabase
      .rpc("jarvis_refresh_documents", { p_kinds: kinds });

    if (refreshError) {
      throw new Error(`Falha ao regerar documentos: ${refreshError.message}`);
    }

    const stats = Array.isArray(refresh) ? refresh[0] : refresh;
    console.log(`[jarvis-embed] refresh: ${JSON.stringify(stats)} (modo ${mode})`);

    // 2. "full" força o recálculo de tudo; "incremental" pega só o pendente.
    if (mode === "full") {
      let reset = supabase.from("jarvis_documents").update({ embedding: null, embedded_at: null });
      reset = kinds ? reset.in("kind", kinds) : reset.not("id", "is", null);
      const { error: resetError } = await reset;
      if (resetError) {
        throw new Error(`Falha ao invalidar embeddings: ${resetError.message}`);
      }
    }

    // 3. Embeda os pendentes, em lotes.
    let processed = 0;
    let failed = 0;

    while (processed < limit) {
      let pending = supabase
        .from("jarvis_documents")
        .select("id, title, content")
        .is("embedding", null)
        .limit(Math.min(BATCH_SIZE, limit - processed));
      if (kinds) pending = pending.in("kind", kinds);

      const { data: docs, error: pendingError } = await pending;
      if (pendingError) {
        throw new Error(`Falha ao listar pendentes: ${pendingError.message}`);
      }
      if (!docs || docs.length === 0) break;

      // O título entra no texto embedado: é onde estão nome, número e código.
      const inputs = docs.map((doc) => `${doc.title}\n\n${doc.content}`);

      let vectors: number[][];
      try {
        vectors = await embedTexts(inputs);
      } catch (error) {
        if (error instanceof EmbeddingError && error.status === 429) {
          // Rate limit: devolve o que já foi feito em vez de perder o lote inteiro.
          console.warn("[jarvis-embed] rate limit, encerrando a rodada mais cedo");
          break;
        }
        throw error;
      }

      const embeddedAt = new Date().toISOString();
      const results = await Promise.all(
        docs.map((doc, index) =>
          supabase
            .from("jarvis_documents")
            .update({ embedding: toVectorLiteral(vectors[index]), embedded_at: embeddedAt })
            .eq("id", doc.id),
        ),
      );

      for (const result of results) {
        if (result.error) {
          failed += 1;
          console.error(`[jarvis-embed] falha ao gravar embedding: ${result.error.message}`);
        }
      }

      processed += docs.length;
      console.log(`[jarvis-embed] ${processed} documentos processados`);
    }

    const { data: status } = await supabase.from("jarvis_index_status").select("*");

    return new Response(
      JSON.stringify({
        ok: true,
        modo: mode,
        modelo: EMBEDDING_MODEL,
        refresh: stats,
        embedados: processed - failed,
        falhas: failed,
        duracao_ms: Date.now() - started,
        base: status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const status = error instanceof EmbeddingError ? error.status : 500;
    console.error("[jarvis-embed] erro:", error);
    return new Response(
      JSON.stringify({ ok: false, erro: error instanceof Error ? error.message : String(error) }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
