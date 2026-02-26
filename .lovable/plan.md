
# Plano: Corrigir Cupom Fiscal (NFC-e) e Criar PDV

## Problema Atual

O botao "Emitir Cupom Fiscal (NFC-e)" na tela de detalhes do pedido esta configurado incorretamente como NF-e (Modelo 55), que exige CPF/CNPJ. Cupom fiscal (NFC-e, Modelo 65) nao exige CPF do cliente -- e para consumidor final.

Especificamente em `DetalhesPedidoDrawer.tsx`:
- Linha 748: `tipo="NFE"` deveria ser `tipo="NFCE"`
- Linha 276: o documento e inserido como `tipo: 'NFE'` deveria ser `tipo: 'NFCE'`
- Linha 312: a action chamada e `emitir_nfe`, deveria ser `emitir_nfce` para cupom fiscal

## Alteracoes Planejadas

### 1. Corrigir emissao de cupom no Drawer do pedido
**Arquivo:** `src/components/pedidos/DetalhesPedidoDrawer.tsx`

- Mudar `ValidarDadosEmissaoDialog` de `tipo="NFE"` para `tipo="NFCE"`
- Mudar o insert em `documentos_fiscais` de `tipo: 'NFE'` para `tipo: 'NFCE'`
- Mudar a action do edge function de `emitir_nfe` para `emitir_nfce`
- Com isso, a validacao vai pular a exigencia de CPF/CNPJ automaticamente (o dialog ja trata isso)

### 2. Criar PDV (Ponto de Venda) na aba Pedidos
**Novo arquivo:** `src/components/pedidos/PDVPanel.tsx`

Componente de venda rapida com:
- Busca de produtos por nome/SKU com grid visual
- Carrinho lateral com quantidade editavel
- Selecao opcional de cliente (nao obrigatorio para NFC-e)
- Selecao de metodo de pagamento (Pix, Cartao, Dinheiro)
- Botao "Finalizar e Emitir Cupom" que:
  1. Cria o pedido no banco
  2. Cria o documento fiscal (NFC-e)
  3. Insere os itens do documento
  4. Chama o edge function `focus-nfe` com action `emitir_nfce`
  5. Exibe o cupom/DANFE no visualizador in-app

### 3. Adicionar aba PDV na pagina de Pedidos
**Arquivo:** `src/pages/Pedidos.tsx`

- Adicionar nova aba "PDV" com icone de caixa registradora
- Renderizar o componente `PDVPanel` quando a aba PDV estiver ativa

## Detalhes Tecnicos

### Fluxo NFC-e vs NF-e
- **NFC-e (Cupom Fiscal):** Consumidor final, CPF opcional, usa action `emitir_nfce` no edge function, sem endereco obrigatorio
- **NF-e (Nota Fiscal):** Exige CPF/CNPJ, endereco recomendado, usa action `emitir_nfe`

### PDV - Estrutura do componente
```text
+------------------------------------------+
|  [Busca de Produtos]                     |
|  +--------+ +--------+ +--------+       |
|  | Prod 1 | | Prod 2 | | Prod 3 |       |
|  | R$10   | | R$15   | | R$20   |       |
|  +--------+ +--------+ +--------+       |
|                                          |
|  --- Carrinho ---                        |
|  Chopp Pilsen    2x  R$30,00    [x]     |
|  Chopp IPA       1x  R$20,00    [x]     |
|                                          |
|  Cliente: (opcional) [Buscar...]         |
|  Pagamento: [Pix] [Cartao] [Dinheiro]   |
|                                          |
|  Total: R$ 50,00                         |
|  [Finalizar e Emitir Cupom Fiscal]       |
+------------------------------------------+
```

### Arquivos modificados
1. `src/components/pedidos/DetalhesPedidoDrawer.tsx` -- corrigir NFE -> NFCE
2. `src/components/pedidos/PDVPanel.tsx` -- novo componente PDV
3. `src/pages/Pedidos.tsx` -- adicionar aba PDV
