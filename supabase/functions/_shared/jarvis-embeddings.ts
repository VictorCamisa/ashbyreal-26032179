// Camada de embeddings do Jarvis.
// Um único ponto para trocar de provedor sem mexer nas funções.

export const EMBEDDING_MODEL = Deno.env.get("JARVIS_EMBEDDING_MODEL") ?? "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536; // precisa bater com vector(1536) na migração

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export class EmbeddingError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
    this.name = "EmbeddingError";
  }
}

/**
 * Gera embeddings para um lote de textos.
 * A API aceita várias entradas por chamada — é o que segura o custo e o tempo
 * do backfill inteiro.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new EmbeddingError(
      "OPENAI_API_KEY não configurada nas secrets do projeto — necessária para gerar embeddings.",
      500,
    );
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 429) {
      throw new EmbeddingError(`Rate limit do provedor de embeddings: ${detail}`, 429);
    }
    throw new EmbeddingError(`Falha ao gerar embeddings (${response.status}): ${detail}`, 502);
  }

  const payload = await response.json();
  // A API não garante a ordem — o índice devolvido é a fonte da verdade.
  const vectors: number[][] = new Array(texts.length);
  for (const item of payload.data) {
    vectors[item.index] = item.embedding;
  }

  const missing = vectors.findIndex((v) => !v);
  if (missing !== -1) {
    throw new EmbeddingError(`Provedor devolveu embedding vazio para o item ${missing}.`, 502);
  }

  return vectors;
}

/** Formato aceito pelo pgvector via PostgREST: "[0.1,0.2,...]". */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
