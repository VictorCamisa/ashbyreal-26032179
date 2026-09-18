// Camada de embeddings do Jarvis.
// Um único ponto para trocar de provedor sem mexer nas funções.
//
// Provedor padrão: o mesmo gateway que o resto do sistema já usa para LLM
// (LOVABLE_API_KEY), que também expõe /v1/embeddings. Não exige secret nova.
// Se houver uma OPENAI_API_KEY válida, dá para forçar o caminho direto com
// JARVIS_EMBEDDING_PROVIDER=openai.

export const EMBEDDING_MODEL = Deno.env.get("JARVIS_EMBEDDING_MODEL") ?? "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536; // precisa bater com vector(1536) na migração

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const OPENAI_URL = "https://api.openai.com/v1/embeddings";

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

  const forcarOpenAI = Deno.env.get("JARVIS_EMBEDDING_PROVIDER") === "openai";
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  const usarGateway = !forcarOpenAI && !!lovableKey;
  const apiKey = usarGateway ? lovableKey : openaiKey;
  const url = usarGateway ? GATEWAY_URL : OPENAI_URL;
  // Fora do gateway o nome do modelo não leva o prefixo do provedor.
  const model = usarGateway ? EMBEDDING_MODEL : EMBEDDING_MODEL.replace(/^openai\//, "");

  if (!apiKey) {
    throw new EmbeddingError(
      "Nenhuma chave de embeddings configurada: defina LOVABLE_API_KEY (gateway) ou OPENAI_API_KEY.",
      500,
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
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

  const wrongSize = vectors.findIndex((v) => v.length !== EMBEDDING_DIMENSIONS);
  if (wrongSize !== -1) {
    throw new EmbeddingError(
      `Provedor devolveu ${vectors[wrongSize].length} dimensões, esperado ${EMBEDDING_DIMENSIONS}.`,
      502,
    );
  }

  return vectors;
}

/** Formato aceito pelo pgvector via PostgREST: "[0.1,0.2,...]". */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
