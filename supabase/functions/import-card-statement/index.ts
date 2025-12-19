import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  installment_number?: number;
  total_installments?: number;
  category_suggestion?: string;
}

// ============= UTILITY FUNCTIONS =============

const hasLetters = (s: string) => /[A-Za-zÀ-ÿ]/.test(s);

function parsePtBrNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const cleaned = value
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function excelSerialToISO(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}

function parseDateAny(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 20000 && value < 90000) return excelSerialToISO(value);
  }

  if (typeof value !== "string") return "";
  const v = value.trim();

  // "PAGAMENTO EFETUADO 2025-12-08" → extract ISO date
  const isoInText = v.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoInText) return isoInText[1];

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  // DD/MM/YY
  const dmy2 = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (dmy2) {
    const yy = parseInt(dmy2[3], 10);
    const yyyy = yy > 50 ? `19${dmy2[3]}` : `20${dmy2[3]}`;
    return `${yyyy}-${dmy2[2]}-${dmy2[1]}`;
  }

  // YYYY/MM/DD or YYYY-MM-DD
  const ymd = v.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

  return "";
}

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function extractInstallments(description: string): { num: number; total: number } {
  const match = description.match(/(?:PARCELA|PARC\.?|P)\s*(\d+)\s*[\/DE]+\s*(\d+)/i);
  if (match) {
    return { num: parseInt(match[1], 10), total: parseInt(match[2], 10) };
  }
  return { num: 1, total: 1 };
}

// ============= XLSX PARSER (ITAU EMPRESAS) =============

function parseItauEmpresasFromRows(rows: any[][]): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];

  // Find header row containing "data", "descr" and "valor"
  let headerRowIndex = -1;
  let dataCol = 0;
  let descCol = 1;
  let valueCol = 2;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const normalized = row.map((c) => String(c ?? "").toLowerCase().trim());
    const hasData = normalized.some((c) => c === "data" || c.includes("data"));
    const hasDesc = normalized.some((c) => c.includes("descr") || c.includes("histórico"));
    const hasValor = normalized.some((c) => c.includes("valor"));

    if (hasData && hasDesc && hasValor) {
      headerRowIndex = i;
      dataCol = normalized.findIndex((c) => c === "data" || c.includes("data"));
      descCol = normalized.findIndex((c) => c.includes("descr") || c.includes("histórico"));
      valueCol = normalized.findIndex((c) => c.includes("valor"));
      break;
    }
  }

  console.log("Header row index:", headerRowIndex, "cols:", { dataCol, descCol, valueCol });

  const start = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawDate = row[dataCol];
    const rawDesc = row[descCol];
    const rawVal = row[valueCol];

    const date = parseDateAny(rawDate);
    if (!date) continue;

    // Description: use column or find first text with letters
    let description = String(rawDesc ?? "").trim();
    if (!description || !hasLetters(description)) {
      const candidate = row.find((c) => typeof c === "string" && c.trim().length > 2 && hasLetters(c.trim()));
      if (candidate) description = String(candidate).trim();
    }
    if (!description || !hasLetters(description)) continue;

    // Skip summary/payment lines
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes("pagamento efetuado") || 
        lowerDesc.includes("total da fatura") ||
        lowerDesc.includes("saldo da fatura") ||
        lowerDesc.includes("total de lançamentos") ||
        lowerDesc.includes("total de produtos")) {
      continue;
    }

    // Amount
    let amount = Math.abs(parsePtBrNumber(rawVal));
    if (!amount || amount <= 0) {
      const nums = row
        .map((c) => (typeof c === "number" ? c : parsePtBrNumber(c)))
        .filter((n) => Number.isFinite(n) && Math.abs(n) > 0.001 && Math.abs(n) < 10000000)
        .map((n) => Math.abs(n));
      if (nums.length) amount = nums.sort((a, b) => b - a)[0];
    }
    if (!amount || amount <= 0) continue;

    const { num, total } = extractInstallments(description);

    txs.push({
      date,
      description,
      amount,
      installment_number: num,
      total_installments: total,
    });
  }

  return txs;
}

// ============= CSV PARSER (LATAM, AZUL, GENERIC) =============

function parseGenericCSV(content: string): ParsedTransaction[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (!lines.length) return [];

  // Detect delimiter
  const sample = lines.find((l) => l.trim()) ?? "";
  const semi = (sample.match(/;/g) || []).length;
  const comma = (sample.match(/,/g) || []).length;
  const tab = (sample.match(/\t/g) || []).length;
  const delimiter = semi >= comma && semi >= tab ? ";" : comma > tab ? "," : "\t";

  console.log("CSV delimiter:", delimiter, "lines:", lines.length);

  const txs: ParsedTransaction[] = [];

  for (const line of lines) {
    const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ""));

    // Find date column
    const dateIndex = parts.findIndex((p) => !!parseDateAny(p));
    if (dateIndex === -1) continue;

    const date = parseDateAny(parts[dateIndex]);
    if (!date) continue;

    let description = "";
    let amount = 0;

    for (let i = 0; i < parts.length; i++) {
      if (i === dateIndex) continue;
      const v = parts[i];
      const n = parsePtBrNumber(v);
      if (!amount && n && Math.abs(n) > 0.001) amount = Math.abs(n);
      if (!description && v.length > 2 && hasLetters(v)) description = v;
    }

    if (!description || !amount) continue;

    // Skip summary lines
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes("pagamento") || 
        lowerDesc.includes("total") ||
        lowerDesc.includes("saldo")) {
      continue;
    }

    const { num, total } = extractInstallments(description);

    txs.push({
      date,
      description,
      amount,
      installment_number: num,
      total_installments: total,
    });
  }

  return txs;
}

// ============= PDF PARSER (via Lovable AI / OpenAI Vision) =============

async function parsePDFWithAI(fileBase64: string, openaiKey: string): Promise<ParsedTransaction[]> {
  if (!openaiKey) {
    console.log("No OpenAI key available for PDF parsing");
    return [];
  }

  console.log("Parsing PDF with AI Vision...");

  const prompt = `Analise esta fatura de cartão de crédito em PDF e extraia TODAS as transações de compra.

Para cada transação, extraia:
- data: no formato YYYY-MM-DD
- description: descrição do estabelecimento/compra
- amount: valor em número decimal (ex: 123.45)
- installment_number: número da parcela se houver (ex: 2)
- total_installments: total de parcelas se houver (ex: 10)

IGNORE linhas de:
- Pagamento efetuado
- Total da fatura
- Saldo anterior
- Resumo

Responda APENAS com JSON válido no formato:
{"transactions": [{"date": "2025-01-15", "description": "LOJA ABC", "amount": 150.00, "installment_number": 1, "total_installments": 1}]}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${fileBase64}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI Vision error:", response.status, errorText);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log("AI response:", content.substring(0, 500));

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*"transactions"[\s\S]*\}/);
    if (!jsonMatch) {
      console.log("No JSON found in AI response");
      return [];
    }

    const result = JSON.parse(jsonMatch[0]);
    if (result.transactions && Array.isArray(result.transactions)) {
      return result.transactions.map((t: any) => ({
        date: t.date || "",
        description: t.description || "",
        amount: Math.abs(parseFloat(t.amount) || 0),
        installment_number: parseInt(t.installment_number) || 1,
        total_installments: parseInt(t.total_installments) || 1,
      })).filter((t: ParsedTransaction) => t.date && t.description && t.amount > 0);
    }

    return [];
  } catch (e) {
    console.error("Error parsing PDF with AI:", e);
    return [];
  }
}

// ============= CATEGORIZATION WITH AI =============

async function categorizeTransactions(
  transactions: ParsedTransaction[],
  categories: any[],
  openaiKey: string,
): Promise<ParsedTransaction[]> {
  if (!openaiKey || transactions.length === 0) return transactions;

  const categoryNames = categories.map((c) => c.name).join(", ");

  const prompt = `Categorize as seguintes transações de cartão de crédito.
Categorias disponíveis: ${categoryNames}

Transações:
${transactions.slice(0, 50).map((t, i) => `${i + 1}. ${t.description}`).join("\n")}

Responda em JSON com array de categorias na mesma ordem:
{"categories": ["categoria1", "categoria2", ...]}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(jsonStr);

      if (result.categories && Array.isArray(result.categories)) {
        transactions.forEach((t, i) => {
          if (result.categories[i]) t.category_suggestion = result.categories[i];
        });
      }
    }
  } catch (e) {
    console.error("Error categorizing:", e);
  }

  return transactions;
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      creditCardId,
      cardProvider,
      fileType,
      content,
      fileBase64,
      fileName,
      competencia,
    } = await req.json();

    console.log("=== IMPORT REQUEST ===");
    console.log("creditCardId:", creditCardId);
    console.log("cardProvider:", cardProvider);
    console.log("fileType:", fileType);
    console.log("fileName:", fileName);
    console.log("content length:", content?.length || 0);
    console.log("fileBase64 length:", fileBase64?.length || 0);

    if (!creditCardId || !cardProvider) {
      return new Response(
        JSON.stringify({ error: "creditCardId e cardProvider são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    let transactions: ParsedTransaction[] = [];

    const provider = String(cardProvider).toUpperCase();
    const type = String(fileType || "").toUpperCase();

    console.log(`Processing provider: ${provider}, fileType: ${type}`);

    // PDF Processing (any provider)
    if (type === "PDF" && fileBase64) {
      console.log("Processing PDF file...");
      transactions = await parsePDFWithAI(fileBase64, openaiKey || "");
    }
    // XLSX Processing
    else if ((type === "XLSX" || type === "XLS") && fileBase64) {
      console.log("Processing XLSX file...");
      const bytes = decodeBase64ToUint8Array(fileBase64);
      const workbook = XLSX.read(bytes, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: null,
      }) as any[][];

      console.log("XLSX rows:", rows.length);
      transactions = parseItauEmpresasFromRows(rows);
    }
    // CSV Processing
    else if (content) {
      console.log("Processing CSV file...");
      transactions = parseGenericCSV(content);
    }

    console.log(`Parsed ${transactions.length} transactions`);
    if (transactions.length > 0) {
      console.log("First transaction:", JSON.stringify(transactions[0]));
      console.log("Last transaction:", JSON.stringify(transactions[transactions.length - 1]));
    }

    // Get categories for AI categorization
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("type", "DESPESA");

    // Categorize using AI if available
    if (openaiKey && categories && transactions.length > 0) {
      transactions = await categorizeTransactions(transactions, categories, openaiKey);
    }

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    return new Response(
      JSON.stringify({
        success: true,
        transactions,
        summary: {
          total_records: transactions.length,
          total_amount: totalAmount,
          card_provider: cardProvider,
          competencia,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Erro no processamento:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
