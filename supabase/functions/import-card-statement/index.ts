import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  installment_number?: number;
  total_installments?: number;
  category_suggestion?: string;
}

// Parser for LATAM CSV format
function parseLatamCSV(content: string): ParsedTransaction[] {
  const lines = content.split('\n').filter(line => line.trim());
  const transactions: ParsedTransaction[] = [];
  
  // Skip header lines until we find data
  let dataStarted = false;
  
  for (const line of lines) {
    const parts = line.split(';').map(p => p.trim().replace(/"/g, ''));
    
    // Check if this looks like a data row (starts with date format DD/MM/YYYY)
    if (parts[0] && /^\d{2}\/\d{2}\/\d{4}$/.test(parts[0])) {
      dataStarted = true;
      
      const dateStr = parts[0]; // DD/MM/YYYY
      const description = parts[1] || '';
      const valueStr = parts[2] || parts[3] || '0';
      
      // Parse date
      const [day, month, year] = dateStr.split('/');
      const date = `${year}-${month}-${day}`;
      
      // Parse value (Brazilian format: 1.234,56)
      const amount = parseFloat(valueStr.replace(/\./g, '').replace(',', '.')) || 0;
      
      // Check for installments in description (ex: "PARCELA 2/10")
      const installmentMatch = description.match(/(?:PARCELA|PARC\.?)\s*(\d+)\s*[\/DE]\s*(\d+)/i);
      
      transactions.push({
        date,
        description,
        amount: Math.abs(amount),
        installment_number: installmentMatch ? parseInt(installmentMatch[1]) : 1,
        total_installments: installmentMatch ? parseInt(installmentMatch[2]) : 1,
      });
    }
  }
  
  return transactions;
}

// Parser for AZUL CSV format
function parseAzulCSV(content: string): ParsedTransaction[] {
  const lines = content.split('\n').filter(line => line.trim());
  const transactions: ParsedTransaction[] = [];
  
  for (const line of lines) {
    const parts = line.split(';').map(p => p.trim().replace(/"/g, ''));
    
    if (parts[0] && /^\d{2}\/\d{2}\/\d{4}$/.test(parts[0])) {
      const dateStr = parts[0];
      const description = parts[1] || '';
      const valueStr = parts[2] || '0';
      
      const [day, month, year] = dateStr.split('/');
      const date = `${year}-${month}-${day}`;
      
      const amount = parseFloat(valueStr.replace(/\./g, '').replace(',', '.')) || 0;
      
      const installmentMatch = description.match(/(?:PARCELA|PARC\.?)\s*(\d+)\s*[\/DE]\s*(\d+)/i);
      
      transactions.push({
        date,
        description,
        amount: Math.abs(amount),
        installment_number: installmentMatch ? parseInt(installmentMatch[1]) : 1,
        total_installments: installmentMatch ? parseInt(installmentMatch[2]) : 1,
      });
    }
  }
  
  return transactions;
}

// Parser for Itaú Empresas XLSX (expects JSON array from client-side parsing)
function parseItauEmpresasXLSX(data: any[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const row of data) {
    // Try different column names
    const dateVal = row['Data'] || row['DATA'] || row['data'] || row['Lançamento'] || '';
    const description = row['Descrição'] || row['DESCRICAO'] || row['Histórico'] || row['HISTORICO'] || '';
    const valueVal = row['Valor'] || row['VALOR'] || row['valor'] || 0;
    
    if (!dateVal || !description) continue;
    
    let date = '';
    if (typeof dateVal === 'string') {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
        const [day, month, year] = dateVal.split('/');
        date = `${year}-${month}-${day}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        date = dateVal;
      }
    } else if (dateVal instanceof Date || typeof dateVal === 'number') {
      // Excel date serial number
      const excelDate = new Date((dateVal as number - 25569) * 86400 * 1000);
      date = excelDate.toISOString().split('T')[0];
    }
    
    if (!date) continue;
    
    let amount = 0;
    if (typeof valueVal === 'number') {
      amount = Math.abs(valueVal);
    } else if (typeof valueVal === 'string') {
      amount = Math.abs(parseFloat(valueVal.replace(/\./g, '').replace(',', '.')) || 0);
    }
    
    const installmentMatch = description.match(/(?:PARCELA|PARC\.?)\s*(\d+)\s*[\/DE]\s*(\d+)/i);
    
    transactions.push({
      date,
      description,
      amount,
      installment_number: installmentMatch ? parseInt(installmentMatch[1]) : 1,
      total_installments: installmentMatch ? parseInt(installmentMatch[2]) : 1,
    });
  }
  
  return transactions;
}

// Parser for Mercado Livre (expects extracted text from PDF)
function parseMercadoLivrePDF(data: any[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const item of data) {
    const date = item.date || '';
    const description = item.description || item.movimento || '';
    const amount = parseFloat(item.amount || item.valor || '0') || 0;
    
    if (!date || !description) continue;
    
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      installment_number: 1,
      total_installments: 1,
    });
  }
  
  return transactions;
}

// Use OpenAI to categorize transactions
async function categorizeTransactions(
  transactions: ParsedTransaction[],
  categories: any[],
  openaiKey: string
): Promise<ParsedTransaction[]> {
  if (!openaiKey || transactions.length === 0) return transactions;
  
  const categoryNames = categories.map(c => c.name).join(', ');
  
  const prompt = `Categorize as seguintes transações de cartão de crédito.
Categorias disponíveis: ${categoryNames}

Transações:
${transactions.slice(0, 50).map((t, i) => `${i + 1}. ${t.description}`).join('\n')}

Responda em JSON com array de categorias na mesma ordem:
{"categories": ["categoria1", "categoria2", ...]}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(jsonStr);
      
      if (result.categories && Array.isArray(result.categories)) {
        transactions.forEach((t, i) => {
          if (result.categories[i]) {
            t.category_suggestion = result.categories[i];
          }
        });
      }
    }
  } catch (e) {
    console.error('Error categorizing:', e);
  }
  
  return transactions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      creditCardId, 
      cardProvider, 
      fileType, 
      content, 
      data, 
      competencia 
    } = await req.json();

    if (!creditCardId || !cardProvider) {
      return new Response(
        JSON.stringify({ error: 'creditCardId e cardProvider são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processando fatura ${cardProvider}, tipo: ${fileType}`);

    let transactions: ParsedTransaction[] = [];

    switch (cardProvider.toUpperCase()) {
      case 'LATAM':
      case 'LATAM_BLACK':
        transactions = parseLatamCSV(content);
        break;
      case 'AZUL':
        transactions = parseAzulCSV(content);
        break;
      case 'ITAU_EMPRESAS':
      case 'ITAU':
        transactions = parseItauEmpresasXLSX(data || []);
        break;
      case 'MERCADO_LIVRE':
      case 'MERCADOLIVRE':
        transactions = parseMercadoLivrePDF(data || []);
        break;
      case 'SANTANDER_SMILES':
      case 'SANTANDER':
        // TODO: Implement when format is provided
        transactions = data || [];
        break;
      default:
        // Generic CSV parser
        transactions = parseLatamCSV(content);
    }

    console.log(`Parsed ${transactions.length} transactions`);

    // Get categories for AI categorization
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', 'DESPESA');

    // Categorize using AI if API key available
    if (openaiKey && categories) {
      transactions = await categorizeTransactions(transactions, categories, openaiKey);
    }

    // Calculate totals
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    return new Response(
      JSON.stringify({
        success: true,
        transactions,
        summary: {
          total_records: transactions.length,
          total_amount: totalAmount,
          card_provider: cardProvider,
          competencia: competencia,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
