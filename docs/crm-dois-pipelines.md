# CRM em dois pipelines

O CRM deixou de ser um quadro só e passou a separar **prospecção** de
**operação** — duas rotinas diferentes, com donos diferentes.

## Os dois quadros

**Comercial** — o funil de quem ainda não é cliente:

| Lead | Contato feito | Em atendimento |
|---|---|---|
| Chegou e ainda não foi respondido | Já respondemos | Negociação em andamento |

**Operação** — a base que já compra:

| B2C | B2B | Pedido aberto | Follow up geral |
|---|---|---|---|
| Cliente final na base | Lojista na base | Pedido em andamento | Precisa de retomada |

Além dos dois quadros há a visão **Todos**: uma tabela com tudo, filtrável por
nome, telefone ou conteúdo da última mensagem.

## O que se move sozinho

O quadro é consequência do que acontece na operação, não uma planilha para
alguém manter:

- **Mensagem de WhatsApp de número desconhecido** → card novo em `Lead`
- **Respondemos esse número** → o card anda para `Contato feito`
- **Mensagem de um lojista cadastrado** → card em `B2B`
- **Mensagem de um cliente cadastrado** → card em `B2C`
- **Pedido criado (pendente ou parcial)** → card vai para `Pedido aberto`
- **Pedido pago/entregue** → volta para `B2B` ou `B2C`, conforme o tipo
- **Vários pedidos abertos** → só sai de `Pedido aberto` quando o último fecha
- **Mensagens de grupo** não viram card

Mover um card na mão marca `movido_por = 'manual'`, e a partir daí o WhatsApp
não muda mais a etapa dele — só atualiza a última mensagem.

## Como o número é identificado

Não é adivinhação: o telefone é comparado pelos **8 dígitos finais** (a base
mistura DDI, DDD e o 9 extra) primeiro contra `lojistas`, depois contra
`clientes`. Quem não casa com ninguém é `desconhecido` e cai na prospecção.

## Componentes

| Objeto | Papel |
|---|---|
| `crm_cards` | um card por contato, com vínculos para cliente, lojista e pedido |
| `crm_quadro` | view de leitura com histórico de pedidos e faturamento juntos |
| `crm_upsert_contato()` | cria/atualiza card a partir de um telefone |
| `crm_ao_receber_mensagem()` | gatilho em `whatsapp_messages` |
| `crm_ao_mudar_pedido()` | gatilho em `pedidos` |

## Segurança e robustez

Os dois gatilhos capturam exceções e apenas registram um `warning`: **uma falha
no CRM nunca impede o registro de uma mensagem ou de uma venda**. Testado com
a função de apoio quebrada de propósito — o pedido foi salvo mesmo assim.

A view é `security_invoker` e fechada para a anon key.

## O que ainda não é automático

A classificação hoje é determinística (casamento de telefone). A leitura da
**conversa** pela IA — intenção, volume, urgência, qualificação — ainda não
alimenta o card; a tabela `ai_conversations` já tem os campos
(`qualification_status`, `qualification_score`) e é o próximo gancho natural.
