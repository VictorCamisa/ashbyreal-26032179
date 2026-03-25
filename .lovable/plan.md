

# Plano: Adaptacao do Sistema ao Fluxo Real de Trabalho

## Contexto (da mensagem do usuario)

O fluxo real do negocio e:

1. **Pedidos:** Durante a semana, coleta pedidos de restaurantes (90% WhatsApp, 5% telefone, 5% presencial). Ate quarta-feira, finaliza todos os pedidos e consolida as vendas da semana. Envia para a logistica da Ashby, que entrega nas sextas.

2. **Financeiro:** Pagamentos sao feitos pelo app "Meu Dinheiro / Sistema Victor" no Banco Inter. Tambem controla gastos manualmente no Excel "Zero Paper Financeiro" na aba "Contas Resumo".

## O que precisa ser adaptado

### 1. Pedidos: Adicionar visao "Pedidos da Semana"
O sistema atual tem PDV (venda unitaria no balcao) e lista generica. Falta o fluxo principal: **consolidar pedidos da semana para enviar a Ashby**.

**Alteracoes:**
- Criar nova aba **"Semana"** na pagina de Pedidos com:
  - Filtro automatico: pedidos da semana atual (segunda a domingo)
  - Resumo consolidado: total de litros, valor total, qtd pedidos
  - Botao "Fechar Semana" que agrupa todos os pedidos pendentes e gera um resumo para envio
  - Status visual: semana aberta (coletando pedidos) vs semana fechada (enviada para Ashby)
  - Lista dos pedidos da semana com cliente, itens e status

**Arquivo novo:** `src/components/pedidos/SemanaPanel.tsx`
**Arquivo editado:** `src/pages/Pedidos.tsx` (adicionar aba)

### 2. Pedidos: Indicar origem do pedido
Hoje o pedido nao registra canal de origem. Adicionar campo `origem` ao criar pedido.

**Alteracoes:**
- Adicionar campo `origem` (WhatsApp / Telefone / Presencial) no `NovoPedidoCompletoDialog`
- Exibir badge de origem na lista de pedidos e no detalhe

**Arquivos editados:** `src/components/pedidos/NovoPedidoCompletoDialog.tsx`, `src/pages/Pedidos.tsx`

### 3. Financeiro: Simplificar para o fluxo real
O financeiro atual e complexo (cartoes, boletos, DRE). O usuario controla gastos no Excel e paga pelo app do banco. O sistema precisa ser mais pratico:

- Renomear aba "Visao Geral" para **"Contas"** -- foco em contas a pagar e receber da semana/mes
- Adicionar destaque visual para **contas vencendo esta semana** (alerta no topo)
- Na aba Transacoes, adicionar filtro rapido "Esta Semana" pre-selecionado

**Arquivo editado:** `src/pages/Financeiro.tsx`, `src/components/financeiro/DashboardFinanceiro.tsx`

### 4. CRM: Alinhar pipeline ao ciclo semanal
O CRM trata leads genericos. No fluxo real, o ciclo e: contatar restaurante -> coletar pedido semanal -> fechar venda.

- Renomear colunas do pipeline para refletir o ciclo: **"Contato" > "Pedido Coletado" > "Semana Fechada" > "Entregue"**
- Adicionar coluna "Perdido" mantida

**Arquivo editado:** `src/pages/CRM.tsx`

## Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `src/components/pedidos/SemanaPanel.tsx` | Novo -- painel de pedidos da semana |
| `src/pages/Pedidos.tsx` | Editar -- adicionar aba Semana como default |
| `src/components/pedidos/NovoPedidoCompletoDialog.tsx` | Editar -- campo origem |
| `src/pages/Financeiro.tsx` | Editar -- renomear aba, destaque semanal |
| `src/components/financeiro/DashboardFinanceiro.tsx` | Editar -- alertas semanais |
| `src/pages/CRM.tsx` | Editar -- renomear pipeline |

