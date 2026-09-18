/**
 * Guarda de papel para as funções do Jarvis.
 *
 * verify_jwt no gateway só confere a assinatura do token — e a anon key é um
 * JWT válido assinado pelo projeto, pública no bundle do front. Sem esta
 * checagem, qualquer visitante do site leria a base inteira.
 *
 * A assinatura já foi validada pelo gateway (verify_jwt = true), então aqui
 * basta ler o papel declarado no payload.
 */

export class AuthError extends Error {
  constructor(message = "Requer usuário autenticado.", readonly status = 401) {
    super(message);
    this.name = "AuthError";
  }
}

const PAPEIS_PERMITIDOS = new Set(["authenticated", "service_role"]);

function decodePayload(token: string): Record<string, unknown> {
  const parte = token.split(".")[1];
  if (!parte) throw new AuthError("Token malformado.");
  const base64 = parte.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    parte.length + ((4 - (parte.length % 4)) % 4),
    "=",
  );
  try {
    return JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
    ));
  } catch {
    throw new AuthError("Token ilegível.");
  }
}

/** Rejeita a anon key. Devolve o papel autorizado. */
export function exigirUsuario(req: Request): string {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new AuthError("Envie o token do usuário em Authorization.");

  const papel = String(decodePayload(token).role ?? "");
  if (!PAPEIS_PERMITIDOS.has(papel)) {
    throw new AuthError(
      papel === "anon"
        ? "A chave anônima não tem acesso à base do Jarvis — faça login."
        : `Papel sem permissão: ${papel || "desconhecido"}.`,
      403,
    );
  }
  return papel;
}
