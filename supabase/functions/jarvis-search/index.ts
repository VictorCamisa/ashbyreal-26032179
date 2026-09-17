// jarvis-search — recuperação híbrida sobre a base vetorial.
//
// Embeda a pergunta e devolve os documentos mais relevantes combinando
// similaridade semântica e full-text em português.
//
// POST { query: string, kinds?: string[], limit?: number }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, EmbeddingError, embedTexts, toVectorLiteral } from "../_shared/jarvis-embeddings.ts";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 25;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, kinds = null, limit = DEFAULT_LIMIT } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ ok: false, erro: "Informe uma pergunta em 'query'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [embedding] = await embedTexts([query]);

    const { data, error } = await supabase.rpc("jarvis_match_documents", {
      query_embedding: toVectorLiteral(embedding),
      query_text: query,
      match_count: Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT),
      filter_kinds: Array.isArray(kinds) && kinds.length > 0 ? kinds : null,
    });

    if (error) {
      throw new Error(`Falha na busca: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ ok: true, query, resultados: data ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const status = error instanceof EmbeddingError ? error.status : 500;
    console.error("[jarvis-search] erro:", error);
    return new Response(
      JSON.stringify({ ok: false, erro: error instanceof Error ? error.message : String(error) }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
