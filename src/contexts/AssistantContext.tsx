import { createContext, useContext, ReactNode } from "react";

interface ModuleInfo {
  name: string;
  context: string;
}

const moduleContexts: Record<string, ModuleInfo> = {
  "/": {
    name: "Dashboard",
    context: `
# Módulo: Dashboard Principal

## O que é este módulo
O Dashboard é a página inicial do sistema, oferecendo uma visão geral de todas as operações da empresa.

## Principais funcionalidades
- **KPIs em tempo real**: Receita do mês, pedidos, ticket médio, clientes ativos
- **Gráficos de evolução**: Comparativo de vendas por período
- **Alertas do sistema**: Estoque baixo, pedidos pendentes, pagamentos
- **Acesso rápido**: Links para as principais ações do sistema

## Como usar
1. Visualize os principais indicadores no topo da página
2. Use os filtros de período para comparar diferentes intervalos
3. Clique nos cards para acessar detalhes de cada área
4. Acompanhe os alertas na lateral direita

## Perguntas frequentes
- "Como vejo as vendas do mês?": Os KPIs no topo mostram a receita atual
- "Como acesso um pedido específico?": Use o menu Pedidos ou a busca rápida
- "O que significam os alertas?": São notificações de ações que precisam de atenção
`
  },
  "/pedidos": {
    name: "Pedidos",
    context: `
# Módulo: Gestão de Pedidos

## O que é este módulo
Controle completo de todos os pedidos da empresa, desde a criação até a entrega.

## Principais funcionalidades
- **Lista de pedidos**: Visualização com filtros por status, data, cliente
- **Criar pedido**: Novo pedido com seleção de cliente, produtos e itens
- **Workflow de status**: Pendente → Em separação → Em rota → Entregue
- **Comprovante de entrega**: Assinatura digital do cliente
- **Devoluções**: Registro e controle de produtos devolvidos

## Como criar um pedido
1. Clique em "Novo Pedido" no canto superior direito
2. Selecione o cliente (ou crie um novo)
3. Adicione os produtos desejados
4. Defina data de entrega e forma de pagamento
5. Confirme o pedido

## Status dos pedidos
- **Pendente**: Aguardando processamento
- **Em separação**: Produtos sendo preparados
- **Em rota**: Saiu para entrega
- **Entregue**: Concluído com sucesso
- **Cancelado**: Pedido cancelado

## Perguntas frequentes
- "Como alterar um pedido?": Clique no pedido e use o botão Editar
- "Como registrar devolução?": No detalhe do pedido, use "Registrar Devolução"
- "Como enviar comprovante?": No pedido entregue, clique em "Enviar Comprovante"
`
  },
  "/clientes": {
    name: "Clientes",
    context: `
# Módulo: Gestão de Clientes

## O que é este módulo
Cadastro e gerenciamento completo da base de clientes.

## Principais funcionalidades
- **Lista de clientes**: Busca e filtros por status, origem, data
- **Cadastro completo**: Nome, contato, endereço, CPF/CNPJ
- **Histórico**: Pedidos, interações e timeline do cliente
- **Importação em massa**: Upload de planilha Excel/CSV
- **Extração de leads**: Busca automática de contatos do Google Maps

## Como cadastrar um cliente
1. Clique em "Novo Cliente"
2. Preencha os dados básicos (nome, telefone, email)
3. Adicione o endereço completo
4. Defina a origem (indicação, WhatsApp, etc)
5. Salve o cadastro

## Status dos clientes
- **Lead**: Primeiro contato, ainda não comprou
- **Ativo**: Cliente que já fez compras
- **Inativo**: Sem compras há mais de 90 dias

## Perguntas frequentes
- "Como importar clientes?": Use o botão "Importar" e envie uma planilha
- "Como ver histórico?": Clique no cliente para abrir os detalhes
- "Como extrair leads?": Use "Extrair Leads" e busque por região
`
  },
  "/financeiro": {
    name: "Financeiro",
    context: `
# Módulo: Gestão Financeira

## O que é este módulo
Controle completo de receitas, despesas, cartões de crédito e fluxo de caixa.

## Principais funcionalidades
- **Transações**: Lançamento de receitas e despesas
- **Cartões de crédito**: Gestão de faturas e gastos
- **Boletos**: Upload e processamento com OCR
- **DRE**: Demonstrativo de Resultados
- **Despesas fixas**: Controle de recorrências
- **Horas extras**: Gestão de funcionários

## Como lançar uma transação
1. Clique em "Nova Transação"
2. Selecione o tipo (Receita ou Despesa)
3. Preencha descrição e valor
4. Escolha a categoria
5. Defina a data de vencimento
6. Salve

## Como processar um boleto
1. Clique em "Novo Boleto"
2. Faça upload da imagem do boleto
3. O sistema extrai automaticamente os dados (OCR)
4. Confira e ajuste se necessário
5. Aprove o boleto para criar a transação

## Categorias de despesas
- **Fixas**: Aluguel, salários, internet, etc
- **Variáveis**: Compras, serviços, manutenção
- **Investimentos**: Equipamentos, reformas

## Perguntas frequentes
- "Como importar fatura?": Em Cartões, selecione o cartão e use "Importar Fatura"
- "Como ver o DRE?": Na aba "DRE" você encontra o demonstrativo
- "Como criar despesa fixa?": Em Despesas Fixas, clique em "Nova Despesa"
`
  },
  "/crm": {
    name: "CRM",
    context: `
# Módulo: CRM - Gestão de Leads

## O que é este módulo
Pipeline de vendas com gestão visual de leads e oportunidades.

## Principais funcionalidades
- **Kanban de leads**: Visualização por etapas do funil
- **Qualificação**: Score e status de cada lead
- **Conversões**: Tracking de leads que viraram clientes
- **Gestão de lojistas**: Parceiros e revendedores
- **Oportunidades**: Negociações em andamento

## Etapas do funil
1. **Novo Lead**: Primeiro contato recebido
2. **Em Contato**: Respondeu ou demonstrou interesse
3. **Qualificado**: Tem potencial de compra
4. **Proposta**: Recebeu orçamento
5. **Negociação**: Em fase final
6. **Convertido**: Virou cliente

## Como qualificar um lead
1. Arraste o card para a próxima etapa
2. Adicione notas sobre a interação
3. Atualize o valor estimado
4. Registre a próxima ação

## Perguntas frequentes
- "Como criar um lead?": Clique em "Nova Oportunidade" ou leads são criados automaticamente via WhatsApp
- "Como mover um lead?": Arraste o card para a coluna desejada
- "Como ver detalhes?": Clique no card do lead
`
  },
  "/estoque": {
    name: "Estoque",
    context: `
# Módulo: Gestão de Estoque

## O que é este módulo
Controle de produtos, movimentações e níveis de estoque.

## Principais funcionalidades
- **Catálogo de produtos**: Lista com preços e quantidades
- **Movimentações**: Entradas e saídas automáticas
- **Alertas de estoque baixo**: Notificação quando atingir mínimo
- **Entrada de chopp**: Registro de recebimento de barris
- **Importação**: Upload de planilha de produtos

## Como cadastrar um produto
1. Clique em "Novo Produto"
2. Preencha nome, SKU e categoria
3. Defina preço de venda e custo
4. Configure estoque mínimo
5. Para chopp: defina capacidade do barril
6. Salve

## Tipos de produto
- **Padrão**: Produtos físicos com controle de unidades
- **Chopp**: Controle em litros, vinculado a barris
- **Serviço**: Sem controle de estoque

## Perguntas frequentes
- "Como dar entrada?": Use "Entrada de Chopp" ou ajuste manual no produto
- "Como ver movimentações?": Clique no produto para ver histórico
- "Como importar produtos?": Use o botão "Importar" com planilha Excel
`
  },
  "/barris": {
    name: "Barris",
    context: `
# Módulo: Controle de Barris

## O que é este módulo
Rastreamento e gestão de barris de chopp.

## Principais funcionalidades
- **Inventário**: Lista de todos os barris cadastrados
- **Rastreamento**: Localização atual de cada barril
- **Movimentações**: Histórico de entradas e saídas
- **Status**: Cheio, vazio, em manutenção
- **Vínculo com pedidos**: Barris associados a entregas

## Localizações possíveis
- **Loja**: No estoque da empresa
- **Cliente**: Emprestado/alugado para cliente
- **Lojista**: Com parceiro revendedor
- **Fábrica**: Enviado para reabastecimento
- **Manutenção**: Em reparo/limpeza

## Como registrar movimentação
1. Selecione o barril na lista
2. Clique em "Registrar Movimentação"
3. Escolha o tipo (entrada/saída)
4. Defina nova localização
5. Adicione observações se necessário
6. Confirme

## Status do conteúdo
- **Cheio**: Barril com chopp
- **Vazio**: Barril sem conteúdo
- **Parcial**: Barril com sobra

## Perguntas frequentes
- "Como saber onde está um barril?": Busque pelo código na lista
- "Como vincular barril a pedido?": No pedido, selecione os barris na aba específica
- "Como registrar retorno?": Use "Registrar Devolução" no barril
`
  },
  "/whatsapp": {
    name: "WhatsApp",
    context: `
# Módulo: WhatsApp Business

## O que é este módulo
Integração completa com WhatsApp para atendimento e campanhas.

## Principais funcionalidades
- **Instâncias**: Conexão com números de WhatsApp
- **Chat**: Conversas em tempo real com clientes
- **Campanhas**: Disparo em massa de mensagens
- **Agente IA**: Atendimento automático com Lara
- **Templates**: Modelos de mensagens prontas

## Como conectar WhatsApp
1. Acesse "Instâncias"
2. Clique em "Nova Instância"
3. Escaneie o QR Code com seu celular
4. Aguarde a conexão ser estabelecida

## Como enviar campanha
1. Acesse "Disparos"
2. Clique em "Nova Campanha"
3. Selecione os destinatários (filtros)
4. Escreva a mensagem ou use template
5. Agende ou envie imediatamente

## Agente IA (Lara)
A Lara é a assistente virtual que:
- Responde automaticamente mensagens
- Qualifica leads perguntando sobre eventos
- Calcula quantidade de chopp necessária
- Transfere para atendimento humano quando necessário

## Perguntas frequentes
- "Como ativar a Lara?": Em Agente IA, ative o agente e vincule a uma instância
- "Como ver conversas?": Na aba Chat você vê todas as conversas
- "Como filtrar destinatários?": Na campanha, use filtros por região, data, etc
`
  },
  "/contabilidade": {
    name: "Contabilidade",
    context: `
# Módulo: Contabilidade Fiscal

## O que é este módulo
Gestão de documentos fiscais e obrigações contábeis.

## Principais funcionalidades
- **Notas fiscais**: Emissão e controle de NF-e, NFC-e, NFS-e
- **Documentos**: Upload e armazenamento de XMLs
- **Reconciliação**: Cruzamento de notas x transações
- **Alertas**: Pendências e divergências
- **DRE Fiscal**: Demonstrativo com base em notas

## Como emitir nota fiscal
1. Acesse "Documentos Fiscais"
2. Clique em "Nova Nota"
3. Selecione o tipo (NF-e, NFC-e, NFS-e)
4. Preencha os dados do cliente
5. Adicione os itens/produtos
6. Revise e emita

## Tipos de documentos
- **NF-e**: Nota Fiscal Eletrônica (vendas B2B)
- **NFC-e**: Nota Fiscal ao Consumidor
- **NFS-e**: Nota Fiscal de Serviços

## Status das notas
- **Rascunho**: Em edição
- **Emitida**: Enviada à SEFAZ
- **Autorizada**: Validada pelo governo
- **Cancelada**: Nota cancelada

## Perguntas frequentes
- "Como importar nota de entrada?": Use "Nova Nota" com direção "Entrada"
- "Como ver pendências?": Os alertas mostram notas sem transação vinculada
- "Como configurar?": Em "Configurações" defina CNPJ, IE e séries
`
  },
  "/agente-ia": {
    name: "Agente IA",
    context: `
# Módulo: Configuração do Agente IA

## O que é este módulo
Criação e gestão de agentes de inteligência artificial para atendimento.

## Principais funcionalidades
- **Criar agentes**: Defina personalidade e conhecimentos
- **Prompt de sistema**: Configure comportamento do agente
- **Base de conhecimento**: Selecione tabelas que o agente pode acessar
- **Testar**: Simule conversas antes de ativar
- **Voz**: Configure voz para áudios (ElevenLabs)

## Como criar um agente
1. Clique em "Criar Agente"
2. Escolha um modelo (GPT-4o mini recomendado)
3. Escreva o prompt de sistema (personalidade)
4. Selecione as tabelas de conhecimento
5. Defina temperatura (criatividade)
6. Teste antes de ativar

## Parâmetros importantes
- **Modelo**: GPT-4o (mais inteligente) ou GPT-4o mini (mais rápido)
- **Temperatura**: 0.0 = preciso, 1.0 = criativo
- **Max Tokens**: Limite de resposta

## Base de conhecimento
O agente pode acessar:
- Produtos e preços
- Pedidos do cliente
- Barris emprestados
- Histórico de interações

## Perguntas frequentes
- "Como ativar o agente?": Use o toggle "Ativo" no card do agente
- "Como testar?": Clique em "Testar" para simular conversas
- "Como mudar a voz?": Em configurações, selecione uma voz do ElevenLabs
`
  },
  "/configuracoes": {
    name: "Configurações",
    context: `
# Módulo: Configurações do Sistema

## O que é este módulo
Configurações gerais, usuários e permissões.

## Principais funcionalidades
- **Gestão de usuários**: Criar e gerenciar acessos
- **Permissões**: Definir módulos por usuário
- **Perfil**: Editar dados pessoais
- **Entidades**: Empresas e filiais
- **Categorias**: Gerenciar categorias financeiras

## Como criar um usuário
1. Acesse "Gestão de Usuários"
2. Clique em "Novo Usuário"
3. Preencha email e senha inicial
4. Defina se é Admin (acesso total)
5. Ou selecione módulos específicos
6. Salve

## Níveis de acesso
- **Admin**: Acesso total ao sistema
- **Usuário**: Acesso aos módulos selecionados

## Módulos disponíveis
- Vendas (Pedidos, Clientes)
- Financeiro (Transações, Cartões)
- Estoque (Produtos, Barris)
- WhatsApp (Chat, Campanhas)
- Contabilidade (Notas Fiscais)

## Perguntas frequentes
- "Como alterar minha senha?": Em Perfil, use "Alterar Senha"
- "Como dar acesso a alguém?": Crie um usuário e defina permissões
- "Como remover acesso?": Desative o usuário na lista
`
  },
  "/suporte": {
    name: "Suporte",
    context: `
# Módulo: Suporte e Tickets

## O que é este módulo
Gestão de tickets e atendimento ao cliente.

## Principais funcionalidades
- **Lista de tickets**: Todos os chamados abertos
- **Criar ticket**: Registrar nova solicitação
- **Prioridades**: Baixa, média, alta, urgente
- **Histórico**: Timeline de interações

## Como criar um ticket
1. Clique em "Novo Ticket"
2. Defina o assunto
3. Descreva o problema
4. Selecione a prioridade
5. Anexe arquivos se necessário
6. Envie

## Status dos tickets
- **Aberto**: Aguardando atendimento
- **Em andamento**: Sendo tratado
- **Pendente**: Aguardando cliente
- **Resolvido**: Concluído

## Perguntas frequentes
- "Como acompanhar meu ticket?": Acesse a lista e clique no ticket
- "Como adicionar informações?": Comente no ticket aberto
- "Como fechar ticket?": Marque como "Resolvido"
`
  }
};

interface AssistantContextValue {
  getModuleInfo: (pathname: string) => ModuleInfo;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const getModuleInfo = (pathname: string): ModuleInfo => {
    // Exact match first
    if (moduleContexts[pathname]) {
      return moduleContexts[pathname];
    }
    
    // Partial match for dynamic routes
    const basePath = "/" + pathname.split("/")[1];
    if (moduleContexts[basePath]) {
      return moduleContexts[basePath];
    }
    
    // Default
    return {
      name: "Sistema",
      context: `
# Sistema de Gestão Taubaté Chopp

Este é o sistema integrado de gestão da empresa. 
Você pode perguntar sobre qualquer funcionalidade ou módulo.

## Módulos disponíveis
- Dashboard: Visão geral e KPIs
- Pedidos: Gestão de vendas
- Clientes: Cadastro de clientes
- Financeiro: Receitas e despesas
- CRM: Pipeline de vendas
- Estoque: Produtos e inventário
- Barris: Controle de barris
- WhatsApp: Comunicação
- Contabilidade: Notas fiscais
- Configurações: Sistema
`
    };
  };

  return (
    <AssistantContext.Provider value={{ getModuleInfo }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within AssistantProvider");
  }
  return context;
}
