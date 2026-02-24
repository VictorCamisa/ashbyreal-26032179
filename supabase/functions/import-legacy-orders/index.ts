import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product mapping based on spreadsheet descriptions to DB product IDs
const PRODUCT_MAP: Record<string, string> = {
  // Pilsen / Claro
  "chopp claro 30": "0c2c307a-bf24-4584-a29b-801daca7fb52",   // Pilsen 30L
  "chopp claro 50": "865362f3-e442-4de6-8405-4a35d104ccc7",   // Pilsen 50L
  "chopp 30": "0c2c307a-bf24-4584-a29b-801daca7fb52",
  "chopp 50": "865362f3-e442-4de6-8405-4a35d104ccc7",
  // Vinho Tinto
  "chopp vinho 30": "375a0843-4da0-4f26-8208-0b76c7ff8ab9",
  "chopp vinho 50": "804c6941-f251-4a3e-9f02-02a314450ea7",
  "chopp vinho tinto 30": "375a0843-4da0-4f26-8208-0b76c7ff8ab9",
  "chopp vinho tinto 50": "804c6941-f251-4a3e-9f02-02a314450ea7",
  // Vinho Branco
  "chopp vinho branco 30": "efe41e35-964a-4601-b9b0-e06a922eae18",
  "chopp vinho branco 50": "e79b329c-f5f1-47a8-ac7f-375d62e57e48",
  // Escuro
  "chopp escuro 30": "f328c040-6beb-4dc3-8e55-2d8ad2fc9c64",
  "chopp escuro 50": "3588176d-29ae-4f70-aafa-a37f5da76c26",
  "chopp escuro 20": "f328c040-6beb-4dc3-8e55-2d8ad2fc9c64", // fallback 30L
  // IPA
  "chopp ipa 30": "e6af16ec-fafc-46ff-b6aa-e837b4db0269",
  "chopp ipa 50": "4e84cb47-edb2-49c6-a4a3-04837d2e7534",
  // Ale
  "chopp ale 30": "54efa4b8-ed63-473b-af13-877dc967bf45",
  "chopp ale 50": "64bffe41-7607-4cc8-b201-1ddfaa4e3b21",
  // Weiss
  "chopp weiss 30": "9680bdcd-e617-4674-ae0c-4458f088c58c",
  "chopp weiss 50": "6f3edc87-38c8-48b9-94f4-8ffe9040ae0b",
  // Puro Malte
  "chopp puro malte 30": "ae4a0c3b-4b11-43d5-ab35-08e1d1995411",
  "chopp puro malte 50": "158ad059-ef57-4e4b-8f6b-58f8676eb476",
};

interface OrderRow {
  numeroPedido: string;
  data: string;
  vendedor: string;
  cliente: string;
  endereco: string;
  bairro: string;
  fone: string;
  localEntrega: string;
  cidade: string;
  uf: string;
  prod1Qty: string;
  prod1Desc: string;
  prod1PU: string;
  prod1PT: string;
  prod2Qty: string;
  prod2Desc: string;
  prod2PU: string;
  prod2PT: string;
  prod3Qty: string;
  prod3Desc: string;
  prod3PU: string;
  prod3PT: string;
  prod4Qty: string;
  prod4Desc: string;
  prod4PU: string;
  prod4PT: string;
  totalRS: string;
  entregaData: string;
  entregaPeriodo: string;
  pagamento: string;
  observacao: string;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  // Try DD/MM/YYYY
  const m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  // Try DD/MM (assume 2026)
  const m2 = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (m2) return `2026-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`;
  return null;
}

function parseMoneyBR(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function guessProductId(desc: string, qty: number): string | null {
  if (!desc) return null;
  const d = desc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Skip non-chopp items
  if (d.includes('chopperia') || d.includes('eletrica') || d.includes('elastica') || 
      d.includes('copos') || d.includes('descartav') || d.includes('minguetorio') ||
      d.includes('opcional') || d.includes('cerveja')) {
    return null;
  }
  
  // Determine size from description or qty
  let size = "50";
  if (d.includes('1x30') || d.includes('2x30') || d.includes('3x30') || d.includes('4x30')) size = "30";
  else if (d.includes('1x50') || d.includes('2x50') || d.includes('3x50') || d.includes('4x50') || d.includes('5x50') || d.includes('8x50')) size = "50";
  else if (d.includes('1x40') || d.includes('1x20') || d.includes('1x10')) size = "30"; // fallback to 30
  else if (qty <= 40) size = "30";
  else size = "50";

  // Determine type
  if (d.includes('vinho branco')) return PRODUCT_MAP[`chopp vinho branco ${size}`] || null;
  if (d.includes('vinho tinto')) return PRODUCT_MAP[`chopp vinho tinto ${size}`] || null;
  if (d.includes('vinho') || d.includes('linho') || d.includes('tinho') || d.includes('tino') || d.includes('inho')) {
    // Generic vinho -> tinto
    return PRODUCT_MAP[`chopp vinho ${size}`] || null;
  }
  if (d.includes('escuro')) return PRODUCT_MAP[`chopp escuro ${size}`] || null;
  if (d.includes('ipa')) return PRODUCT_MAP[`chopp ipa ${size}`] || null;
  if (d.includes('ale')) return PRODUCT_MAP[`chopp ale ${size}`] || null;
  if (d.includes('weiss')) return PRODUCT_MAP[`chopp weiss ${size}`] || null;
  if (d.includes('puro malte')) return PRODUCT_MAP[`chopp puro malte ${size}`] || null;
  if (d.includes('claro') || d.includes('chopp')) return PRODUCT_MAP[`chopp claro ${size}`] || null;
  
  return PRODUCT_MAP[`chopp claro ${size}`] || null;
}

function parsePaymentMethod(pag: string): string | null {
  if (!pag) return null;
  const p = pag.toLowerCase();
  if (p.includes('pix')) return 'pix';
  if (p.includes('cartao') || p.includes('cartão')) return 'cartao';
  if (p.includes('boleto')) return 'boleto';
  if (p.includes('dinheiro')) return 'dinheiro';
  return null;
}

// All rows from the spreadsheet
const ORDERS: OrderRow[] = [
  {numeroPedido:"30065",data:"02/02/2026",vendedor:"",cliente:"Wander Santos de Oliveira",endereco:"",bairro:"Centro",fone:"12 99250-6559",localEntrega:"O Mimi Reim",cidade:"Taubaté",uf:"SP",prod1Qty:"30",prod1Desc:"Chopp Claro",prod1PU:"",prod1PT:"R$ 440,00",prod2Qty:"1",prod2Desc:"Chopperia Elétrica",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 440,00",entregaData:"05/02",entregaPeriodo:"",pagamento:"Cartão",observacao:""},
  {numeroPedido:"30061",data:"06/02/2026",vendedor:"Alexandre",cliente:"CON JUN - LUCAS",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"100",prod1Desc:"Chopp Claro 2x50",prod1PU:"R$ 590,00",prod1PT:"R$ 1.180,00",prod2Qty:"50",prod2Desc:"Chopp Vinho 1x50",prod2PU:"R$ 800,00",prod2PT:"R$ 800,00",prod3Qty:"40",prod3Desc:"Chopp 1x40",prod3PU:"R$ 140,00",prod3PT:"R$ 140,00",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 2.120,00",entregaData:"13/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30067",data:"12/02/2026",vendedor:"Alexandre",cliente:"João Lucas de Carvalho Santos",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"",uf:"SP",prod1Qty:"",prod1Desc:"Chopperia Elástica + Chopp Claro",prod1PU:"",prod1PT:"",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 3.540,00",entregaData:"",entregaPeriodo:"",pagamento:"Cartão",observacao:""},
  {numeroPedido:"30081",data:"19/02/2026",vendedor:"Alexandre",cliente:"Paloma Brandos Gomes",endereco:"",bairro:"",fone:"12 99250-2963",localEntrega:"O Mimi Reim",cidade:"Taubaté",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 2x30",prod1PU:"",prod1PT:"",prod2Qty:"1",prod2Desc:"Chopperia Elétrica",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 440,00",entregaData:"24/02",entregaPeriodo:"Manhã",pagamento:"Cartão / PIX",observacao:"# Moto no Local"},
  {numeroPedido:"30062",data:"06/02/2026",vendedor:"Marnil",cliente:"Chopp IN Kambi - Cabral",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Pindamonhangaba",uf:"SP",prod1Qty:"120",prod1Desc:"Chopp Claro 4x70",prod1PU:"",prod1PT:"",prod2Qty:"30",prod2Desc:"Outra linha 1x30",prod2PU:"",prod2PT:"",prod3Qty:"1",prod3Desc:"Chopperia Elétrica",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 2.280,00",entregaData:"12/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30008",data:"04/02/2026",vendedor:"Alexandre",cliente:"Alexandra SLP",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"SLP",uf:"SP",prod1Qty:"400",prod1Desc:"Chopp Claro 8x50",prod1PU:"",prod1PT:"",prod2Qty:"1",prod2Desc:"Chopperia Elétrica",prod2PU:"",prod2PT:"",prod3Qty:"10",prod3Desc:"Copos Descartáveis 400ml",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 5.600,00",entregaData:"13/02",entregaPeriodo:"",pagamento:"PIX",observacao:"NF: 1.084"},
  {numeroPedido:"30071",data:"15/02/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"",uf:"SP",prod1Qty:"700",prod1Desc:"Chopp Claro 2x50",prod1PU:"",prod1PT:"R$ 1.220,00",prod2Qty:"",prod2Desc:"Copos Descartáveis",prod2PU:"",prod2PT:"R$ 56,00",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.276,00",entregaData:"15/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30073",data:"16/02/2026",vendedor:"Marnil",cliente:"Cobrol Chopp IN Kombi",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"60",prod1Desc:"Chopp Claro 2x30",prod1PU:"",prod1PT:"R$ 720,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 720,00",entregaData:"16/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"018517",data:"23/01/2026",vendedor:"",cliente:"Cabral",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Pindamonhangaba",uf:"SP",prod1Qty:"30",prod1Desc:"Chopp Claro 1x30",prod1PU:"R$ 330,00",prod1PT:"R$ 330,00",prod2Qty:"40",prod2Desc:"Chopp Escuro 1x40",prod2PU:"R$ 140,00",prod2PT:"R$ 140,00",prod3Qty:"1",prod3Desc:"Chopperia Elétrica",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 470,00",entregaData:"",entregaPeriodo:"",pagamento:"",observacao:"R$470,00 / Falta R$500,00"},
  {numeroPedido:"30007",data:"04/02/2026",vendedor:"Marnil",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"12 99222-7392",localEntrega:"",cidade:"",uf:"SP",prod1Qty:"60",prod1Desc:"Chopp Claro 4x30",prod1PU:"",prod1PT:"",prod2Qty:"36",prod2Desc:"Chopp 1x30",prod2PU:"",prod2PT:"",prod3Qty:"1",prod3Desc:"Chopperia Elétrica",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 2.606,00",entregaData:"",entregaPeriodo:"",pagamento:"",observacao:""},
  {numeroPedido:"30011",data:"04/02/2026",vendedor:"Alexandre",cliente:"Valentina Gusa - Fernanda",endereco:"Av. de Feira - Ao Lado Dicosteu",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"",prod1Desc:"Chopp Claro",prod1PU:"",prod1PT:"",prod2Qty:"",prod2Desc:"Chopp Vinho",prod2PU:"",prod2PT:"",prod3Qty:"1",prod3Desc:"Chopperia Elétrica",prod3PU:"",prod3PT:"",prod4Qty:"3",prod4Desc:"Copos Descartáveis 700ml",prod4PU:"",prod4PT:"",totalRS:"R$ 3.090,00",entregaData:"07/02",entregaPeriodo:"Manhã",pagamento:"Cartão / PIX",observacao:"Horário 15h às 19h / Bourdon/Maquina Controle"},
  {numeroPedido:"30066",data:"06/02/2026",vendedor:"Alexandre",cliente:"Conntag TCC",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"",prod1Qty:"50",prod1Desc:"Chopp Claro 2x50",prod1PU:"",prod1PT:"",prod2Qty:"1",prod2Desc:"Chopperia Elétrica 220",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.000,00",entregaData:"06/02",entregaPeriodo:"",pagamento:"Dinheiro / PIX",observacao:""},
  {numeroPedido:"30017",data:"05/02/2026",vendedor:"Marnil",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"",uf:"",prod1Qty:"30",prod1Desc:"Chopp Claro 1x30",prod1PU:"",prod1PT:"",prod2Qty:"30",prod2Desc:"Chopp Vinho Branco 1x30",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 992,00",entregaData:"06/02",entregaPeriodo:"",pagamento:"",observacao:""},
  {numeroPedido:"21612",data:"23/12/2025",vendedor:"Alexandre",cliente:"Alfredo de Lopes - Serenata",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"",prod1PT:"",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 675,00",entregaData:"24/12/2025",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30015",data:"04/02/2026",vendedor:"",cliente:"Devonir Lopez da Silva",endereco:"Sítio Vila Limia",bairro:"Estevão Itapecerica",fone:"12 99256-7194",localEntrega:"O Mimi Reim",cidade:"Taubaté",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 2x50",prod1PU:"",prod1PT:"",prod2Qty:"50",prod2Desc:"Chopp Vinho 1x50",prod2PU:"",prod2PT:"",prod3Qty:"1",prod3Desc:"Chopperia Elétrica",prod3PU:"",prod3PT:"",prod4Qty:"1",prod4Desc:"Copos Descartáveis 300ml",prod4PU:"",prod4PT:"",totalRS:"R$ 1.600,00",entregaData:"29/02",entregaPeriodo:"",pagamento:"PIX",observacao:"# Casamento + PIX R$12"},
  {numeroPedido:"018528",data:"29/01/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 2x50",prod1PU:"",prod1PT:"R$ 500,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 500,00",entregaData:"30/01",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"21639",data:"06/01/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"",prod1PT:"",prod2Qty:"50",prod2Desc:"Chopp Vinho Branco 1x50",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.300,00",entregaData:"05/01",entregaPeriodo:"",pagamento:"",observacao:""},
  {numeroPedido:"30012",data:"04/02/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"Estância Mineiro Olivares",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro",prod1PU:"",prod1PT:"R$ 620,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 620,00",entregaData:"07/02",entregaPeriodo:"Manhã",pagamento:"Cartão",observacao:""},
  {numeroPedido:"30068",data:"13/02/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp 1x50",prod1PU:"",prod1PT:"R$ 700,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 700,00",entregaData:"",entregaPeriodo:"",pagamento:"",observacao:""},
  {numeroPedido:"30010",data:"04/02/2026",vendedor:"Marnil",cliente:"Carnaval - Goncalves",endereco:"",bairro:"Olimpia",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"100",prod1Desc:"Chopp Claro 4x30",prod1PU:"R$ 490,00",prod1PT:"",prod2Qty:"50",prod2Desc:"Chopp Vinho 2x30",prod2PU:"R$ 800,00",prod2PT:"R$ 800,00",prod3Qty:"1",prod3Desc:"Chopperia Elétrica 220",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 2.720,00",entregaData:"13/02",entregaPeriodo:"",pagamento:"PIX",observacao:"Tailon"},
  {numeroPedido:"30069a",data:"04/02/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"Olimpia",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"100",prod1Desc:"Chopp Claro 2x50",prod1PU:"",prod1PT:"",prod2Qty:"50",prod2Desc:"Chopp Vinho 1x50",prod2PU:"",prod2PT:"",prod3Qty:"1",prod3Desc:"Chopperia Elétrica",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 2.080,00",entregaData:"13/02",entregaPeriodo:"",pagamento:"PIX",observacao:"2 Maquinha / Lancha Chumaes"},
  {numeroPedido:"30009",data:"04/02/2026",vendedor:"Alexandre",cliente:"Bloco da Villa - DJ Giovani",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"250",prod1Desc:"Chopp Claro 2x50",prod1PU:"",prod1PT:"",prod2Qty:"30",prod2Desc:"Chopp 2x30",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 3.200,00",entregaData:"15/02",entregaPeriodo:"Manhã",pagamento:"",observacao:"14h ~ 20h"},
  {numeroPedido:"30072",data:"15/02/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"",uf:"SP",prod1Qty:"30",prod1Desc:"Chopp Claro 1x30",prod1PU:"",prod1PT:"",prod2Qty:"30",prod2Desc:"Chopp Tio 1x30",prod2PU:"",prod2PT:"",prod3Qty:"50",prod3Desc:"1x50",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.820,00",entregaData:"15/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30011b",data:"03/02/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"30",prod1Desc:"Chopp Claro 2x30",prod1PU:"",prod1PT:"R$ 450,00",prod2Qty:"1",prod2Desc:"Copos Descartáveis 200ml",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 450,00",entregaData:"07/02",entregaPeriodo:"Manhã",pagamento:"PIX",observacao:""},
  {numeroPedido:"21647",data:"08/01/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"12 99154-2111",localEntrega:"",cidade:"",uf:"SP",prod1Qty:"30",prod1Desc:"Chopp Claro 1x30",prod1PU:"",prod1PT:"",prod2Qty:"10",prod2Desc:"Chopp Vinho 1x30",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 420,00",entregaData:"10/01",entregaPeriodo:"Integral",pagamento:"PIX",observacao:""},
  {numeroPedido:"018516",data:"20/01/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Tinho 1x50",prod1PU:"R$ 700,00",prod1PT:"R$ 700,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 700,00",entregaData:"",entregaPeriodo:"",pagamento:"PIX",observacao:"NF: 1077"},
  {numeroPedido:"30004",data:"31/01/2026",vendedor:"Alexandre",cliente:"Tonjo Cordeiro",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Tremembé",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"",prod1PT:"",prod2Qty:"1",prod2Desc:"Chopperia Elétrica 220",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 690,00",entregaData:"31/01",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"21636",data:"05/01/2026",vendedor:"Marnil",cliente:"José Carlos dos Santos",endereco:"Est. Mun.",bairro:"Barbosa",fone:"12 98109-3051",localEntrega:"O Mimi Reim",cidade:"Taubaté",uf:"SP",prod1Qty:"80",prod1Desc:"Chopp Claro 1x30",prod1PU:"R$ 1.090,00",prod1PT:"",prod2Qty:"1",prod2Desc:"Chopperia Elétrica",prod2PU:"",prod2PT:"",prod3Qty:"2",prod3Desc:"Copos Descartáveis 300ml",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.680,00",entregaData:"10/01",entregaPeriodo:"Manhã (até 12h)",pagamento:"Cartão 2x",observacao:"Só Levou Copas"},
  {numeroPedido:"30052",data:"06/02/2026",vendedor:"",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"12 41841-4914",localEntrega:"O Mimi Reim",cidade:"Taubaté",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x30",prod1PU:"",prod1PT:"R$ 670,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 700,00",entregaData:"07/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30079",data:"14/02/2026",vendedor:"Alexandre",cliente:"Cabrol - Chopp IN Kombi",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Pindamonhangaba",uf:"SP",prod1Qty:"30",prod1Desc:"Chopp Claro 1x30",prod1PU:"R$ 380,00",prod1PT:"R$ 380,00",prod2Qty:"20",prod2Desc:"Chopp Escuro 1x20",prod2PU:"R$ 2.440,00",prod2PT:"R$ 1.380,00",prod3Qty:"10",prod3Desc:"Chopp Vinho 1x10",prod3PU:"R$ 360,00",prod3PT:"R$ 360,00",prod4Qty:"10",prod4Desc:"Opcional 1x10",prod4PU:"R$ 160,00",prod4PT:"R$ 160,00",totalRS:"R$ 1.020,00",entregaData:"20/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"018535",data:"20/02/2026",vendedor:"",cliente:"Quiosque Cleber Daniel",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"R$ 610,00",prod1PT:"R$ 610,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 610,00",entregaData:"",entregaPeriodo:"",pagamento:"",observacao:""},
  {numeroPedido:"30077",data:"19/02/2026",vendedor:"Alexandre",cliente:"Buasqua Esquina - Janai",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 2x50",prod1PU:"R$ 500,00",prod1PT:"R$ 500,00",prod2Qty:"2",prod2Desc:"Copos Descartáveis 500",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 500,00",entregaData:"20/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30074",data:"19/02/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"",uf:"SP",prod1Qty:"",prod1Desc:"Chopp Claro + Chopp Tino",prod1PU:"",prod1PT:"",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.720,00",entregaData:"20/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30076",data:"19/02/2026",vendedor:"Alexandre",cliente:"Lhasa - DON JUAN",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"120",prod1Desc:"Chopp Claro 2x50",prod1PU:"R$ 1.532,00",prod1PT:"",prod2Qty:"50",prod2Desc:"Chopp Vinho 1x50",prod2PU:"",prod2PT:"",prod3Qty:"20",prod3Desc:"Chopp Escuro 1x20",prod3PU:"",prod3PT:"",prod4Qty:"10",prod4Desc:"Outro 1x10",prod4PU:"",prod4PT:"",totalRS:"R$ 2.124,00",entregaData:"20/02",entregaPeriodo:"Integral",pagamento:"PIX",observacao:""},
  {numeroPedido:"21650",data:"14/01/2026",vendedor:"Alexandre",cliente:"DON JUAN - LUCAS",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"100",prod1Desc:"Chopp Claro 2x50",prod1PU:"R$ 3.590,00",prod1PT:"R$ 2.290,00",prod2Qty:"50",prod2Desc:"Chopp Inho 1x50",prod2PU:"R$ 1.800,00",prod2PT:"R$ 1.800,00",prod3Qty:"30",prod3Desc:"Chopp Grana 1x30",prod3PU:"",prod3PT:"",prod4Qty:"4",prod4Desc:"Copos Descartáveis 500/300",prod4PU:"",prod4PT:"",totalRS:"R$ 2.260,00",entregaData:"16/01",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30057",data:"06/02/2026",vendedor:"Alexandre",cliente:"Bulosqua Thiago Giovana",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"R$ 500,00",prod1PT:"",prod2Qty:"50",prod2Desc:"Chopp Vinho 1x50",prod2PU:"R$ 725,00",prod2PT:"",prod3Qty:"1",prod3Desc:"Chopperia Elétrica (3kl)",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.420,00",entregaData:"13/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"018531",data:"29/01/2026",vendedor:"Alexandre",cliente:"Buasqua Thinga Glenna",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Vinho 1x50",prod1PU:"R$ 500,00",prod1PT:"R$ 500,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 500,00",entregaData:"30/01",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"018511",data:"20/01/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Tino 1x50",prod1PU:"R$ 850,00",prod1PT:"R$ 850,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 859,00",entregaData:"20/01",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30020",data:"05/02/2026",vendedor:"Marnil",cliente:"Filé Mon",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Taubaté",uf:"SP",prod1Qty:"120",prod1Desc:"Cerveja Vinho Tinto",prod1PU:"R$ 147,00",prod1PT:"R$ 144,00",prod2Qty:"4",prod2Desc:"Cerveja Vinho Branco",prod2PU:"R$ 74,00",prod2PT:"R$ 74,00",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 226,00",entregaData:"06/02",entregaPeriodo:"Integral",pagamento:"PIX",observacao:""},
  {numeroPedido:"30003",data:"03/02/2026",vendedor:"Alexandre",cliente:"100's SAL Felice",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Taubaté",uf:"SP",prod1Qty:"210",prod1Desc:"Chopp Claro 2x30+1x30",prod1PU:"R$ 540,00",prod1PT:"R$ 1.296,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.298,00",entregaData:"03/02",entregaPeriodo:"",pagamento:"PIX / Boleto",observacao:"NF 2.002"},
  {numeroPedido:"21620",data:"26/12/2025",vendedor:"Marnil",cliente:"Santos Pastos - Daniro",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 3x50",prod1PU:"R$ 60,00",prod1PT:"",prod2Qty:"50",prod2Desc:"Chopp Vinho 1x50",prod2PU:"R$ 90,00",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 2.630,00",entregaData:"29/12",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"018508",data:"12/01/2026",vendedor:"Marnil",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"R$ 610,00",prod1PT:"R$ 610,00",prod2Qty:"1",prod2Desc:"Copos Descartáveis 500",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 620,00",entregaData:"12/01",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"018532",data:"29/01/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Tino 1x50",prod1PU:"R$ 610,00",prod1PT:"R$ 610,00",prod2Qty:"50",prod2Desc:"Chopp Tino 1x50",prod2PU:"R$ 800,00",prod2PT:"R$ 800,00",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.410,00",entregaData:"30/01",entregaPeriodo:"Manhã",pagamento:"PIX",observacao:""},
  {numeroPedido:"21645a",data:"08/01/2026",vendedor:"Alexandre",cliente:"Daniel PDV",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"R$ 850,00",prod1PT:"R$ 850,00",prod2Qty:"1",prod2Desc:"Copos Descartáveis 400ml",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 850,00",entregaData:"09/01",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"018512",data:"20/01/2026",vendedor:"Marnil",cliente:"Daniel PDV",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Vinho Branco 1x50",prod1PU:"R$ 800,00",prod1PT:"R$ 800,00",prod2Qty:"50",prod2Desc:"Chopp Claro 2x50",prod2PU:"R$ 590,00",prod2PT:"R$ 590,00",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.390,00",entregaData:"20/01",entregaPeriodo:"Integral",pagamento:"PIX",observacao:"# Alyssom já Levou 2x50 Vinho Branco / 1x50 Claro"},
  {numeroPedido:"ILG001",data:"05/02/2026",vendedor:"Marnil",cliente:"Daniel PDV",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 4x30",prod1PU:"R$ 540,00",prod1PT:"R$ 540,00",prod2Qty:"50",prod2Desc:"Chopp Vinho Branco 1x30",prod2PU:"R$ 800,00",prod2PT:"R$ 800,00",prod3Qty:"50",prod3Desc:"Chopp Tipo IPA 1x30",prod3PU:"R$ 859,00",prod3PT:"R$ 860,00",prod4Qty:"1",prod4Desc:"Copos Descartáveis",prod4PU:"",prod4PT:"",totalRS:"R$ 2.440,00",entregaData:"06/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30019",data:"05/02/2026",vendedor:"Alexandre",cliente:"Polícias PDV",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"20",prod1Desc:"Chopp 220 1x10",prod1PU:"R$ 306,00",prod1PT:"R$ 306,80",prod2Qty:"40",prod2Desc:"Chopp Claro 2x20",prod2PU:"R$ 555,00",prod2PT:"R$ 1.109,80",prod3Qty:"10",prod3Desc:"ILEGÍVEL",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.408,00",entregaData:"06/02",entregaPeriodo:"Manhã",pagamento:"PIX",observacao:""},
  {numeroPedido:"30016",data:"05/02/2026",vendedor:"Alexandre",cliente:"Cabrol - Chopp IN Kombi",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"60",prod1Desc:"Chopp Claro 1x30",prod1PU:"",prod1PT:"",prod2Qty:"10",prod2Desc:"Chopp Vinho 1x70",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 859,00",entregaData:"06/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30006",data:"04/02/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL (Carnaval 2026 - Ref. Na Loja)",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"100",prod1Desc:"Chopp Claro 2x50",prod1PU:"R$ 625,00",prod1PT:"R$ 1.250,00",prod2Qty:"1",prod2Desc:"Chopperia Elétrica",prod2PU:"",prod2PT:"",prod3Qty:"50",prod3Desc:"Chopp 1x50",prod3PU:"R$ 625,00",prod3PT:"R$ 625,00",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 2.075,00",entregaData:"15/02",entregaPeriodo:"",pagamento:"PIX",observacao:"# Fnch Bml 2x50 / 1.875-1.200 = R$675,00"},
  {numeroPedido:"30069b",data:"08/02/2026",vendedor:"Marnil",cliente:"ILEGÍVEL",endereco:"Rua Plano",bairro:"",fone:"12 99614-0119",localEntrega:"O MSM ACIM",cidade:"Taubaté",uf:"SP",prod1Qty:"100",prod1Desc:"Chopp Claro 2x50",prod1PU:"R$ 610,00",prod1PT:"R$ 2.340,00",prod2Qty:"1",prod2Desc:"Chopperia Elétrica",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 2.340,00",entregaData:"23/02",entregaPeriodo:"",pagamento:"PIX",observacao:"# Já Levou Choppeira / # Moto No Local"},
  {numeroPedido:"30075",data:"19/02/2026",vendedor:"Marnil",cliente:"Daniel PDV",endereco:"",bairro:"",fone:"",localEntrega:"O MSM DOM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"150",prod1Desc:"Chopp Claro 3x50",prod1PU:"R$ 592,20",prod1PT:"",prod2Qty:"1",prod2Desc:"Minguetório",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.970,00",entregaData:"20/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"018529",data:"29/01/2026",vendedor:"Alexandre",cliente:"DON JUAN - LVOD",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Vinho 1x50",prod1PU:"R$ 800,00",prod1PT:"R$ 800,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 800,00",entregaData:"30/01",entregaPeriodo:"Integral",pagamento:"PIX",observacao:""},
  {numeroPedido:"ILG002",data:"06/02/2026",vendedor:"",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"150",prod1Desc:"Chopp Claro 3x50",prod1PU:"R$ 500,00",prod1PT:"",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.500,00",entregaData:"06/02",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"30014",data:"04/02/2026",vendedor:"",cliente:"Felipe - Espelho Cana",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Pindamonhangaba",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"R$ 850,00",prod1PT:"R$ 850,00",prod2Qty:"1",prod2Desc:"Chopp Vinho",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 850,00",entregaData:"04/02",entregaPeriodo:"Manhã",pagamento:"PIX",observacao:""},
  {numeroPedido:"018504",data:"16/01/2026",vendedor:"Marnil",cliente:"Alvarenga - Trabelho",endereco:"Rua Chaves Isabel - Borali 226",bairro:"",fone:"12 98141-9494",localEntrega:"O MSM ACIM",cidade:"",uf:"SP",prod1Qty:"30",prod1Desc:"Chopp Claro 1x30",prod1PU:"R$ 420,00",prod1PT:"R$ 420,00",prod2Qty:"1",prod2Desc:"Chopperia Elétrica",prod2PU:"",prod2PT:"",prod3Qty:"30",prod3Desc:"Chopp Linho 1x30 (Consignado)",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 922,00",entregaData:"",entregaPeriodo:"",pagamento:"PIX",observacao:"IGOR R$50/SABRINA R$50/ROSARIO R$50/Fernando R$50/Alexandre R$50"},
  {numeroPedido:"018518",data:"23/01/2026",vendedor:"",cliente:"File Klab",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"",prod1PT:"",prod2Qty:"1",prod2Desc:"Chopperia Elétrica (3kl)",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 800,00",entregaData:"",entregaPeriodo:"",pagamento:"",observacao:""},
  {numeroPedido:"30063",data:"06/02/2026",vendedor:"Marnil",cliente:"WRA Comércio de Bebidas",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Americana",uf:"SP",prod1Qty:"100",prod1Desc:"Chopp Claro 2x50",prod1PU:"R$ 594,00",prod1PT:"R$ 1.180,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.189,00",entregaData:"12/02",entregaPeriodo:"",pagamento:"PIX",observacao:"CNPJ: 29.623.470/0001-07"},
  {numeroPedido:"21645b",data:"07/01/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"200",prod1Desc:"Chopp Claro 2x50",prod1PU:"R$ 610,00",prod1PT:"",prod2Qty:"50",prod2Desc:"Chopp Vinho 2x50",prod2PU:"R$ 800,00",prod2PT:"",prod3Qty:"50",prod3Desc:"Outro 1x50",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 2.020,00",entregaData:"08/01",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"018507",data:"16/01/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"R$ 610,00",prod1PT:"R$ 610,00",prod2Qty:"1",prod2Desc:"Copos Descartáveis 500ml",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 610,00",entregaData:"17/01",entregaPeriodo:"",pagamento:"PIX",observacao:""},
  {numeroPedido:"21627",data:"22/01/2026",vendedor:"",cliente:"Daniel",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"250",prod1Desc:"Chopp Claro 5x50",prod1PU:"R$ 580,00",prod1PT:"",prod2Qty:"100",prod2Desc:"Vinho IPA 1x50",prod2PU:"R$ 850,00",prod2PT:"",prod3Qty:"50",prod3Desc:"Chopperia Elétrica 1x50",prod3PU:"R$ 950,00",prod3PT:"",prod4Qty:"50",prod4Desc:"Outro",prod4PU:"R$ 75,00",prod4PT:"",totalRS:"R$ 6.150,00",entregaData:"",entregaPeriodo:"",pagamento:"",observacao:""},
  {numeroPedido:"018502",data:"14/01/2026",vendedor:"Marnil",cliente:"Daniel PDV",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"200",prod1Desc:"Chopp Claro 4x50",prod1PU:"R$ 580,00",prod1PT:"R$ 2.360,00",prod2Qty:"50",prod2Desc:"Chopp Vinho 2x50",prod2PU:"R$ 800,00",prod2PT:"R$ 800,00",prod3Qty:"50",prod3Desc:"Chopp IPA 1x50",prod3PU:"R$ 850,00",prod3PT:"R$ 850,00",prod4Qty:"1",prod4Desc:"Chopperia Elétrica",prod4PU:"",prod4PT:"",totalRS:"R$ 4.010,00",entregaData:"16/01",entregaPeriodo:"Integral",pagamento:"PIX",observacao:"OBS: Já Entrou 2x50 Claro"},
  {numeroPedido:"018530",data:"29/01/2026",vendedor:"Alexandre",cliente:"Daniel PDV",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"100",prod1Desc:"Chopp Vinho 2x50",prod1PU:"R$ 590,00",prod1PT:"R$ 1.180,00",prod2Qty:"50",prod2Desc:"Chopp Claro 2x50",prod2PU:"",prod2PT:"",prod3Qty:"10",prod3Desc:"Copos Descartáveis 400ml",prod3PU:"R$ 100,00",prod3PT:"R$ 100,00",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.280,00",entregaData:"30/01",entregaPeriodo:"Manhã",pagamento:"PIX",observacao:""},
  {numeroPedido:"30058",data:"06/02/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Campos do Jordão",uf:"SP",prod1Qty:"200",prod1Desc:"Chopp Claro 4x50",prod1PU:"",prod1PT:"",prod2Qty:"50",prod2Desc:"Chopp Vinho Branco 1x50",prod2PU:"",prod2PT:"",prod3Qty:"50",prod3Desc:"Chopp IPA 1x50",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 5.010,00",entregaData:"13/02",entregaPeriodo:"",pagamento:"",observacao:""},
  {numeroPedido:"30078",data:"19/02/2026",vendedor:"Marnil",cliente:"Spazzou - Jessica",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"R$ 650,00",prod1PT:"R$ 650,00",prod2Qty:"50",prod2Desc:"Chopp Vinho 1x50",prod2PU:"R$ 800,00",prod2PT:"R$ 800,00",prod3Qty:"4",prod3Desc:"Copos Descartáveis 200ml",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 1.450,00",entregaData:"19/02",entregaPeriodo:"",pagamento:"Boleto",observacao:"NF 2.007 / Boleto Venc"},
  {numeroPedido:"30064",data:"06/02/2026",vendedor:"Alexandre",cliente:"Spazzon - Céssica (Carnaval 2026)",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Taubaté",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"",prod1PT:"",prod2Qty:"10",prod2Desc:"Chopp Vinho 1x20",prod2PU:"R$ 800,00",prod2PT:"",prod3Qty:"2",prod3Desc:"Copos Descartáveis 500ml",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 820,00",entregaData:"",entregaPeriodo:"",pagamento:"Boleto",observacao:"NF: 1085 / Boleto: Venc"},
  {numeroPedido:"018534",data:"29/01/2026",vendedor:"Marnil",cliente:"Bruna Maracibo - Spilingo",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Aparecida",uf:"SP",prod1Qty:"60",prod1Desc:"Chopp Vinho 2x30",prod1PU:"R$ 429,00",prod1PT:"R$ 840,00",prod2Qty:"",prod2Desc:"",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 862,00",entregaData:"03/02",entregaPeriodo:"",pagamento:"PIX",observacao:"NF 2.081 / Boleto: Venc 30/fev"},
  {numeroPedido:"018533",data:"29/01/2026",vendedor:"Alexandre",cliente:"Spazzon - Campa",endereco:"",bairro:"",fone:"",localEntrega:"O MSM ACIM",cidade:"Taubaté",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 2x50",prod1PU:"R$ 800,00",prod1PT:"R$ 800,00",prod2Qty:"2",prod2Desc:"Copos Descartáveis 500ml",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 820,00",entregaData:"",entregaPeriodo:"Integral",pagamento:"",observacao:"NF / Boleto"},
  {numeroPedido:"30051",data:"06/02/2026",vendedor:"Alexandre",cliente:"ILEGÍVEL",endereco:"",bairro:"",fone:"",localEntrega:"",cidade:"Taubaté",uf:"SP",prod1Qty:"50",prod1Desc:"Chopp Claro 1x50",prod1PU:"R$ 650,00",prod1PT:"R$ 650,00",prod2Qty:"62",prod2Desc:"Copos Descartáveis 500ml",prod2PU:"",prod2PT:"",prod3Qty:"",prod3Desc:"",prod3PU:"",prod3PT:"",prod4Qty:"",prod4Desc:"",prod4PU:"",prod4PT:"",totalRS:"R$ 650,00",entregaData:"07/02",entregaPeriodo:"",pagamento:"Boleto",observacao:"NF: 1.083 / Boleto: Venc 13/fev"},
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const logs: string[] = [];
    let processed = 0;
    let ilegCounter = 0;

    // Cache clients by name to avoid duplicates
    const clientCache: Record<string, string> = {};

    for (const order of ORDERS) {
      try {
        const nomeCliente = order.cliente || "Cliente não identificado";
        const cacheKey = nomeCliente.toLowerCase().trim();
        let clienteId: string;

        if (clientCache[cacheKey]) {
          clienteId = clientCache[cacheKey];
        } else {
          // Check if client exists
          const { data: existing } = await supabaseClient
            .from("clientes")
            .select("id")
            .ilike("nome", cacheKey)
            .limit(1);

          if (existing && existing.length > 0) {
            clienteId = existing[0].id;
          } else {
            // Create client
            const sanitized = nomeCliente.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().substring(0, 20);
            ilegCounter++;
            const email = `import_${sanitized}_${ilegCounter}@legacy.sistema`;
            const telefone = order.fone || "(00) 00000-0000";

            const endereco: Record<string, string> = {};
            if (order.endereco) endereco.rua = order.endereco;
            if (order.bairro) endereco.bairro = order.bairro;
            if (order.cidade) endereco.cidade = order.cidade;
            if (order.uf) endereco.estado = order.uf;

            const { data: newClient, error: clientError } = await supabaseClient
              .from("clientes")
              .insert({
                nome: nomeCliente,
                email,
                telefone,
                origem: "planilha_importacao",
                endereco: Object.keys(endereco).length > 0 ? endereco : null,
              })
              .select("id")
              .single();

            if (clientError) {
              logs.push(`Erro cliente ${nomeCliente}: ${clientError.message}`);
              continue;
            }
            clienteId = newClient.id;
          }
          clientCache[cacheKey] = clienteId;
        }

        // Parse order data
        const dataPedido = parseDate(order.data);
        const dataEntrega = parseDate(order.entregaData);
        const totalValue = parseMoneyBR(order.totalRS);
        const pagamento = parsePaymentMethod(order.pagamento);

        const obsArr: string[] = [];
        if (order.observacao) obsArr.push(order.observacao);
        if (order.vendedor) obsArr.push(`Vendedor: ${order.vendedor}`);
        if (order.entregaPeriodo) obsArr.push(`Período: ${order.entregaPeriodo}`);
        obsArr.push(`[Importado planilha - Pedido #${order.numeroPedido}]`);

        const { data: pedido, error: pedidoError } = await supabaseClient
          .from("pedidos")
          .insert({
            cliente_id: clienteId,
            status: "entregue",
            valor_total: totalValue,
            data_pedido: dataPedido ? `${dataPedido}T12:00:00` : new Date().toISOString(),
            data_entrega: dataEntrega ? `${dataEntrega}T12:00:00` : null,
            metodo_pagamento: pagamento,
            observacoes: obsArr.join(" | "),
          })
          .select("id")
          .single();

        if (pedidoError) {
          logs.push(`Erro pedido ${order.numeroPedido}: ${pedidoError.message}`);
          continue;
        }

        // Process items (up to 4 products per order)
        const products = [
          { qty: order.prod1Qty, desc: order.prod1Desc, pu: order.prod1PU, pt: order.prod1PT },
          { qty: order.prod2Qty, desc: order.prod2Desc, pu: order.prod2PU, pt: order.prod2PT },
          { qty: order.prod3Qty, desc: order.prod3Desc, pu: order.prod3PU, pt: order.prod3PT },
          { qty: order.prod4Qty, desc: order.prod4Desc, pu: order.prod4PU, pt: order.prod4PT },
        ];

        for (const prod of products) {
          if (!prod.desc) continue;
          const qty = parseInt(prod.qty) || 1;
          const productId = guessProductId(prod.desc, qty);
          if (!productId) continue; // Skip non-chopp items

          let precoUnit = parseMoneyBR(prod.pu);
          let subtotal = parseMoneyBR(prod.pt);
          if (!precoUnit && subtotal && qty > 0) precoUnit = subtotal / qty;
          if (!subtotal && precoUnit) subtotal = precoUnit * qty;
          if (!precoUnit && !subtotal) {
            // Use total divided by items as rough estimate
            precoUnit = totalValue > 0 ? totalValue : 0;
            subtotal = precoUnit;
          }

          await supabaseClient.from("pedido_itens").insert({
            pedido_id: pedido.id,
            produto_id: productId,
            quantidade: qty,
            preco_unitario: precoUnit,
            subtotal: subtotal,
            observacoes: prod.desc,
          });
        }

        processed++;
      } catch (e) {
        logs.push(`Erro inesperado pedido ${order.numeroPedido}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, total: ORDERS.length, logs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
