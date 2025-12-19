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

// Generic CSV parser that tries multiple formats
function parseGenericCSV(content: string): ParsedTransaction[] {
  const lines = content.split('\n').filter(line => line.trim());
  const transactions: ParsedTransaction[] = [];
  
  console.log(`Parsing ${lines.length} lines`);
  console.log(`First 5 lines:`, lines.slice(0, 5));
  
  // Try to detect delimiter
  const firstDataLine = lines.find(line => /\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/.test(line)) || lines[1];
  const semicolonCount = (firstDataLine.match(/;/g) || []).length;
  const commaCount = (firstDataLine.match(/,/g) || []).length;
  const tabCount = (firstDataLine.match(/\t/g) || []).length;
  
  let delimiter = ';';
  if (commaCount > semicolonCount && commaCount > tabCount) delimiter = ',';
  if (tabCount > semicolonCount && tabCount > commaCount) delimiter = '\t';
  
  console.log(`Detected delimiter: "${delimiter}" (semicolons: ${semicolonCount}, commas: ${commaCount}, tabs: ${tabCount})`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
    
    console.log(`Line ${i}: ${parts.length} parts: ${JSON.stringify(parts.slice(0, 5))}`);
    
    // Try to find date in any column
    let dateCol = -1;
    let dateStr = '';
    
    for (let j = 0; j < parts.length; j++) {
      const val = parts[j];
      // Match DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, YYYY-MM-DD
      if (/^\d{2}[\/\-]\d{2}[\/\-]\d{2,4}$/.test(val) || /^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(val)) {
        dateCol = j;
        dateStr = val;
        break;
      }
    }
    
    if (dateCol === -1) continue;
    
    // Parse date
    let date = '';
    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(dateStr)) {
      // DD/MM/YYYY or DD-MM-YYYY
      const sep = dateStr.includes('/') ? '/' : '-';
      const [day, month, year] = dateStr.split(sep);
      date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{2}$/.test(dateStr)) {
      // DD/MM/YY
      const sep = dateStr.includes('/') ? '/' : '-';
      const [day, month, year] = dateStr.split(sep);
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      date = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else if (/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(dateStr)) {
      // YYYY-MM-DD
      date = dateStr.replace(/\//g, '-');
    }
    
    if (!date) continue;
    
    // Description is usually the column after date or a specific column
    let description = '';
    let amount = 0;
    
    // Try to find description and amount
    for (let j = 0; j < parts.length; j++) {
      if (j === dateCol) continue;
      
      const val = parts[j];
      
      // Check if it's a monetary value
      const cleanedVal = val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
      const numVal = parseFloat(cleanedVal);
      
      if (!isNaN(numVal) && Math.abs(numVal) > 0.01 && Math.abs(numVal) < 1000000) {
        if (amount === 0) {
          amount = Math.abs(numVal);
        }
      } else if (val.length > 3 && !description) {
        // Probably description
        description = val;
      }
    }
    
    if (!description || amount === 0) continue;
    
    // Check for installments
    const installmentMatch = description.match(/(?:PARCELA|PARC\.?|P)\s*(\d+)\s*[\/DE]+\s*(\d+)/i);
    
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

// Parser for LATAM CSV format - Itaucard
function parseLatamCSV(content: string): ParsedTransaction[] {
  console.log('=== LATAM CSV Parser ===');
  console.log('Content length:', content.length);
  console.log('First 500 chars:', content.substring(0, 500));
  
  // Try generic parser first
  const transactions = parseGenericCSV(content);
  
  if (transactions.length > 0) {
    return transactions;
  }
  
  // Fallback to line-by-line parsing
  const lines = content.split('\n').filter(line => line.trim());
  const result: ParsedTransaction[] = [];
  
  for (const line of lines) {
    // Try semicolon first, then comma, then tab
    let parts = line.split(';').map(p => p.trim().replace(/"/g, ''));
    if (parts.length < 3) {
      parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
    }
    if (parts.length < 3) {
      parts = line.split('\t').map(p => p.trim().replace(/"/g, ''));
    }
    
    if (parts[0] && /^\d{2}\/\d{2}\/\d{4}$/.test(parts[0])) {
      const [day, month, year] = parts[0].split('/');
      const date = `${year}-${month}-${day}`;
      const description = parts[1] || '';
      const valueStr = parts[2] || parts[3] || '0';
      const amount = parseFloat(valueStr.replace(/\./g, '').replace(',', '.')) || 0;
      
      const installmentMatch = description.match(/(?:PARCELA|PARC\.?)\s*(\d+)\s*[\/DE]\s*(\d+)/i);
      
      result.push({
        date,
        description,
        amount: Math.abs(amount),
        installment_number: installmentMatch ? parseInt(installmentMatch[1]) : 1,
        total_installments: installmentMatch ? parseInt(installmentMatch[2]) : 1,
      });
    }
  }
  
  return result;
}

// Parser for AZUL CSV format - Itaucard
function parseAzulCSV(content: string): ParsedTransaction[] {
  console.log('=== AZUL CSV Parser ===');
  console.log('Content length:', content.length);
  console.log('First 500 chars:', content.substring(0, 500));
  
  // Try generic parser first
  const transactions = parseGenericCSV(content);
  
  if (transactions.length > 0) {
    return transactions;
  }
  
  // Specific AZUL format parsing
  const lines = content.split('\n').filter(line => line.trim());
  const result: ParsedTransaction[] = [];
  
  for (const line of lines) {
    let parts = line.split(';').map(p => p.trim().replace(/"/g, ''));
    if (parts.length < 3) {
      parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
    }
    
    if (parts[0] && /^\d{2}\/\d{2}\/\d{4}$/.test(parts[0])) {
      const [day, month, year] = parts[0].split('/');
      const date = `${year}-${month}-${day}`;
      const description = parts[1] || '';
      const valueStr = parts[2] || '0';
      const amount = parseFloat(valueStr.replace(/\./g, '').replace(',', '.')) || 0;
      
      const installmentMatch = description.match(/(?:PARCELA|PARC\.?)\s*(\d+)\s*[\/DE]\s*(\d+)/i);
      
      result.push({
        date,
        description,
        amount: Math.abs(amount),
        installment_number: installmentMatch ? parseInt(installmentMatch[1]) : 1,
        total_installments: installmentMatch ? parseInt(installmentMatch[2]) : 1,
      });
    }
  }
  
  return result;
}

// Parser for Itaú Empresas XLSX (expects JSON array from client-side parsing)
function parseItauEmpresasXLSX(data: any[]): ParsedTransaction[] {
  console.log('=== ITAU EMPRESAS XLSX Parser ===');
  console.log('Data rows:', data.length);
  console.log('First 3 rows:', JSON.stringify(data.slice(0, 3), null, 2));
  
  const transactions: ParsedTransaction[] = [];
  
  for (const row of data) {
    // Try different column names
    const dateVal = row['Data'] || row['DATA'] || row['data'] || row['Lançamento'] || row['LANCAMENTO'] || 
                    row['Data da compra'] || row['DATA DA COMPRA'] || Object.values(row)[0];
    const description = row['Descrição'] || row['DESCRICAO'] || row['Histórico'] || row['HISTORICO'] || 
                       row['Estabelecimento'] || row['ESTABELECIMENTO'] || Object.values(row)[1];
    const valueVal = row['Valor'] || row['VALOR'] || row['valor'] || row['Valor (R$)'] || 
                    row['VALOR (R$)'] || Object.values(row)[2];
    
    console.log(`Row: date=${dateVal}, desc=${description}, val=${valueVal}`);
    
    if (!dateVal || !description) continue;
    
    let date = '';
    if (typeof dateVal === 'string') {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
        const [day, month, year] = dateVal.split('/');
        date = `${year}-${month}-${day}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        date = dateVal;
      } else if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateVal)) {
        const [day, month, year] = dateVal.split('/');
        date = `20${year}-${month}-${day}`;
      }
    } else if (typeof dateVal === 'number') {
      // Excel date serial number
      const excelDate = new Date((dateVal - 25569) * 86400 * 1000);
      date = excelDate.toISOString().split('T')[0];
    }
    
    if (!date) continue;
    
    let amount = 0;
    if (typeof valueVal === 'number') {
      amount = Math.abs(valueVal);
    } else if (typeof valueVal === 'string') {
      amount = Math.abs(parseFloat(valueVal.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0);
    }
    
    if (amount === 0) continue;
    
    const installmentMatch = String(description).match(/(?:PARCELA|PARC\.?|P)\s*(\d+)\s*[\/DE]+\s*(\d+)/i);
    
    transactions.push({
      date,
      description: String(description),
      amount,
      installment_number: installmentMatch ? parseInt(installmentMatch[1]) : 1,
      total_installments: installmentMatch ? parseInt(installmentMatch[2]) : 1,
    });
  }
  
  return transactions;
}

// Parser for Mercado Livre
function parseMercadoLivrePDF(data: any[]): ParsedTransaction[] {
  console.log('=== MERCADO LIVRE Parser ===');
  console.log('Data:', JSON.stringify(data.slice(0, 5), null, 2));
  
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

    console.log('=== IMPORT REQUEST ===');
    console.log('creditCardId:', creditCardId);
    console.log('cardProvider:', cardProvider);
    console.log('fileType:', fileType);
    console.log('content length:', content?.length || 0);
    console.log('data rows:', data?.length || 0);

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

    let transactions: ParsedTransaction[] = [];

    const provider = cardProvider.toUpperCase();
    console.log(`Processing provider: ${provider}, fileType: ${fileType}`);

    switch (provider) {
      case 'LATAM':
      case 'LATAM_BLACK':
        transactions = parseLatamCSV(content || '');
        break;
      case 'AZUL':
        transactions = parseAzulCSV(content || '');
        break;
      case 'ITAU_EMPRESAS':
      case 'ITAU':
        if (data && data.length > 0) {
          transactions = parseItauEmpresasXLSX(data);
        } else if (content) {
          transactions = parseGenericCSV(content);
        }
        break;
      case 'MERCADO_LIVRE':
      case 'MERCADOLIVRE':
        transactions = parseMercadoLivrePDF(data || []);
        break;
      case 'SANTANDER_SMILES':
      case 'SANTANDER':
        if (content) {
          transactions = parseGenericCSV(content);
        } else if (data) {
          transactions = parseItauEmpresasXLSX(data);
        }
        break;
      default:
        // Generic parser
        if (content) {
          transactions = parseGenericCSV(content);
        } else if (data && data.length > 0) {
          transactions = parseItauEmpresasXLSX(data);
        }
    }

    console.log(`Parsed ${transactions.length} transactions`);
    if (transactions.length > 0) {
      console.log('First transaction:', JSON.stringify(transactions[0]));
    }

    // Get categories for AI categorization
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', 'DESPESA');

    // Categorize using AI if API key available
    if (openaiKey && categories && transactions.length > 0) {
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
