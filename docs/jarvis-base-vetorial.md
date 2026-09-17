# Jarvis — base vetorial do sistema

Camada de recuperação que permite ao Jarvis responder sobre cliente, financeiro,
estoque, pedidos e fiscal cruzando os módulos.

## Como funciona

Cada entidade de negócio vira **um documento de texto denormalizado**, já com o
contexto que o agente teria de juntar na mão:

```
Cliente: Douglas Ashby — empresa: Bar do Douglas
Status: ativo · Origem: indicação · Cadastro: 12/03/2024
Contato: douglas@bar.com · 12999998888 · CPF/CNPJ: 12345678000199
Endereço: Rua das Flores, 120, Centro, Taubaté, SP
Histórico de compras: 1 pedidos · faturamento total R$ 1.270,00 · ticket médio R$ 1.270,00
Último pedido em 23/08/2026 (25 dias atrás) · 1 pedidos ainda pendentes
Produtos já comprados: Chopp Pilsen, Chopp Vinho Tinto
Observações: Prefere entrega na sexta.
```

O texto **não é armazenado à mão**: sai da view `jarvis_document_source`, que lê
os dados vivos. Isso significa que o card do cliente já embute o histórico de
pedidos, o card do pedido já embute os itens e o cliente, e o card do produto já
embute o giro dos últimos 90 dias. É esse cruzamento prévio que faz o agente
responder sem precisar de múltiplas consultas.

### Tipos de documento

| Tipo | Origem | O que traz de cruzamento |
|---|---|---|
| `cliente` | `clientes` | pedidos, faturamento, ticket, dias sem comprar, produtos comprados |
| `pedido` | `pedidos` | itens, litros, cliente, lojista, pagamento |
| `produto` | `produtos` | preço, margem, estoque, alerta de mínimo, vendas em 90 dias |
| `lojista` | `lojistas` | dados fiscais, pedidos vinculados |
| `transacao` | `transactions` | categoria, conta, entidade, atraso calculado |
| `boleto` | `boletos` | beneficiário, vencimento, dias para vencer |
| `documento_fiscal` | `documentos_fiscais` | impostos, pedido vinculado, destinatário |
| `barril` | `barris` | localização, com quem está |
| `lead` | `leads` | funil, valor estimado |
| `resumo_mensal` | agregação | faturamento, litros, ticket e financeiro do mês |

Os `resumo_mensal` existem por um motivo específico: **busca vetorial não soma**.
Perguntas de período ("faturamento de agosto") precisam de um documento com o
total já calculado.

## Componentes

| Objeto | Papel |
|---|---|
| `jarvis_documents` | tabela: texto + `vector(1536)` + `tsvector` em português |
| `jarvis_document_source` | view: gera o texto a partir dos dados vivos |
| `jarvis_refresh_documents(kinds)` | sincroniza a tabela com a view |
| `jarvis_match_documents(...)` | busca híbrida (semântica + full-text, fundidas por RRF) |
| `jarvis_store_embeddings(items)` | grava embeddings em lote |
| `jarvis_index_status` | view de monitoramento por tipo |
| `jarvis-embed` | edge function: refresh + embedding do que mudou |
| `jarvis-search` | edge function: embeda a pergunta e devolve os documentos |

### Atualização incremental

`jarvis_refresh_documents` compara o hash do conteúdo e **só invalida o embedding
do que realmente mudou**. Um pedido novo do Douglas invalida exatamente três
documentos: o pedido, o card do cliente e o resumo do mês. O resto fica intacto.

### Busca híbrida

Semântica sozinha erra nome próprio e código ("BR-014"); full-text sozinha erra
sinônimo. As duas rodam em paralelo e são combinadas por Reciprocal Rank Fusion.

O full-text usa OR sobre os lexemas, não AND: numa pergunta em linguagem natural
("tem alguma conta atrasada de malte para pagar?") exigir todos os termos zeraria
o resultado.

## Rodando

Pré-requisito: `OPENAI_API_KEY` nas secrets do projeto (usada para embeddings —
o modelo é `text-embedding-3-small`, 1536 dimensões).

```bash
# Backfill inicial (tudo)
curl -X POST "$SUPABASE_URL/functions/v1/jarvis-embed" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"mode":"full"}'

# Manutenção: só o que mudou
curl -X POST "$SUPABASE_URL/functions/v1/jarvis-embed" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d '{"mode":"incremental"}'

# Reindexar um tipo só
curl -X POST "$SUPABASE_URL/functions/v1/jarvis-embed" \
  -d '{"mode":"full","kinds":["cliente","pedido"]}'

# Consultar
curl -X POST "$SUPABASE_URL/functions/v1/jarvis-search" \
  -d '{"query":"quais clientes não compram há mais de 45 dias","limit":8}'
```

### Custo

Com o volume atual (~2.700 documentos), o backfill completo custa cerca de
**US$ 0,01** e leva menos de um minuto. A manutenção incremental é fração disso.

### Agendamento

Para manter a base fresca sem intervenção, agende o modo incremental (pg_cron +
pg_net, ambos disponíveis no projeto):

```sql
select cron.schedule(
  'jarvis-embed-incremental', '*/30 * * * *',
  $$ select net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/jarvis-embed',
       headers := jsonb_build_object('Content-Type','application/json',
                  'Authorization', 'Bearer ' || current_setting('app.service_role_key')),
       body := '{"mode":"incremental"}'::jsonb) $$
);
```

Guarde a chave no Vault em vez de literal no SQL.

## Limite importante

Vetorização resolve **encontrar**, não **calcular**. A busca traz os documentos
certos, mas somas, contagens e filtros exatos ("total do trimestre", "todos os
pedidos entre duas datas") precisam de SQL — não de similaridade. Os documentos
`resumo_mensal` cobrem os períodos mais pedidos; o resto deve ser resolvido com
tool calling sobre o banco, usando a busca vetorial para localizar as entidades
citadas na pergunta.
