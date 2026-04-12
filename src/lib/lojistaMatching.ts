type LojistaMatcher = {
  id: string;
  nome: string;
  nome_fantasia?: string | null;
  razao_social?: string | null;
  telefone?: string | null;
  cnpj?: string | null;
};

type ClienteMatcher = {
  id: string;
  nome: string;
  empresa?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
};

const MANUAL_ALIAS_RULES: Array<{
  lojistaIncludes: string[];
  clienteIncludes: string[];
}> = [
  {
    lojistaIncludes: ['SHAZZAN'],
    clienteIncludes: ['SPAZZOU', 'SPAZZON'],
  },
  {
    lojistaIncludes: ['QUIOSQUE ESQUINA'],
    clienteIncludes: ['BUASQUA ESQUINA', 'BULOSQUA', 'BUASQUA'],
  },
  {
    lojistaIncludes: ['QUIOSQUE PARQUE'],
    clienteIncludes: ['QUIOSQUE CLEBER'],
  },
];

const STOP_WORDS = new Set([
  'BAR',
  'BOTECO',
  'CHOPP',
  'CHOPERIA',
  'COMERCIO',
  'CONVENIENCIA',
  'DA',
  'DE',
  'DO',
  'DOS',
  'E',
  'LANCHES',
  'LANCHONETE',
  'LTDA',
  'ME',
  'MERCEARIA',
  'PONTO',
  'QUIOSQUE',
  'RESTAURANTE',
  'SERVICOS',
]);

function normalizeText(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDigits(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

function isUsablePhone(phone: string) {
  return phone.length >= 10 && !/^0+$/.test(phone);
}

function getAliases(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(normalizeText).filter(Boolean)));
}

function getTokens(aliases: string[]) {
  return new Set(
    aliases
      .flatMap((alias) => alias.split(' '))
      .map((token) => token.trim())
      .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
  );
}

function scoreAliasMatch(sourceAliases: string[], targetAliases: string[]) {
  let score = 0;

  for (const sourceAlias of sourceAliases) {
    for (const targetAlias of targetAliases) {
      if (sourceAlias === targetAlias) {
        score = Math.max(score, 90);
        continue;
      }

      if (sourceAlias.includes(targetAlias) || targetAlias.includes(sourceAlias)) {
        score = Math.max(score, 65);
      }
    }
  }

  return score;
}

function scoreTokenMatch(sourceTokens: Set<string>, targetTokens: Set<string>) {
  const sharedTokens = [...sourceTokens].filter((token) => targetTokens.has(token));

  if (sharedTokens.length === 0) return 0;

  let score = sharedTokens.reduce((acc, token) => acc + (token.length >= 7 ? 18 : 14), 0);

  if (Math.min(sourceTokens.size, targetTokens.size) === 1) {
    score += 18;
  }

  return score;
}

function scoreManualAliasMatch(sourceAliases: string[], targetAliases: string[]) {
  let score = 0;

  for (const rule of MANUAL_ALIAS_RULES) {
    const lojistaMatches = rule.lojistaIncludes.some((term) =>
      sourceAliases.some((alias) => alias.includes(term))
    );

    if (!lojistaMatches) continue;

    const clienteMatches = rule.clienteIncludes.some((term) =>
      targetAliases.some((alias) => alias.includes(term))
    );

    if (clienteMatches) {
      score = Math.max(score, 140);
    }
  }

  return score;
}

export function getLojistaClienteMatches(
  lojistas: LojistaMatcher[],
  clientes: ClienteMatcher[]
) {
  const matches = Object.fromEntries(lojistas.map((lojista) => [lojista.id, [] as string[]]));

  const lojistasPrepared = lojistas.map((lojista) => {
    const aliases = getAliases([lojista.nome, lojista.nome_fantasia, lojista.razao_social, lojista.cnpj]);

    return {
      lojista,
      aliases,
      tokens: getTokens(aliases),
      phone: normalizeDigits(lojista.telefone),
      document: normalizeDigits(lojista.cnpj),
    };
  });

  clientes.forEach((cliente) => {
    const aliases = getAliases([cliente.nome, cliente.empresa, cliente.cpf_cnpj]);
    const tokens = getTokens(aliases);
    const phone = normalizeDigits(cliente.telefone);
    const document = normalizeDigits(cliente.cpf_cnpj);

    let bestMatch: { lojistaId: string; score: number } | null = null;

    for (const candidate of lojistasPrepared) {
      let score = 0;

      if (candidate.document && document && candidate.document === document) {
        score += 120;
      }

      if (isUsablePhone(candidate.phone) && isUsablePhone(phone) && candidate.phone === phone) {
        score += 80;
      }

      score += scoreAliasMatch(candidate.aliases, aliases);
      score += scoreTokenMatch(candidate.tokens, tokens);
      score += scoreManualAliasMatch(candidate.aliases, aliases);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { lojistaId: candidate.lojista.id, score };
      }
    }

    if (bestMatch && bestMatch.score >= 32) {
      matches[bestMatch.lojistaId].push(cliente.id);
    }
  });

  return matches;
}