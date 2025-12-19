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
  // Excel serial date (days since 1899-12-30)
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}

function parseDateAny(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Typical invoice exports use excel serials (e.g., 45988)
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
    const hasDesc = normalized.some((c) => c.includes("descr"));
    const hasValor = normalized.some((c) => c.includes("valor"));

    if (hasData && hasDesc && hasValor) {
      headerRowIndex = i;
      dataCol = normalized.findIndex((c) => c === "data" || c.includes("data"));
      descCol = normalized.findIndex((c) => c.includes("descr"));
      valueCol = normalized.findIndex((c) => c.includes("valor"));
      break;
    }
  }

  console.log("Header row index:", headerRowIndex);
  console.log("Detected columns:", { dataCol, descCol, valueCol });

  const start = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawDate = row[dataCol];
    const rawDesc = row[descCol];
    const rawVal = row[valueCol];

    const date = parseDateAny(rawDate);
    if (!date) continue;

    // Description fallback: if chosen column is not text, pick first text cell with letters
    let description = String(rawDesc ?? "").trim();
    if (!description || !hasLetters(description)) {
      const candidate = row.find((c) => typeof c === "string" && c.trim().length > 2 && hasLetters(c.trim()));
      if (candidate) description = String(candidate).trim();
    }

    if (!description || !hasLetters(description)) continue;

    // Amount fallback: try the value column, else scan row for plausible monetary numbers
    let amount = Math.abs(parsePtBrNumber(rawVal));

    if (!amount || amount <= 0) {
      const nums = row
        .map((c) => (typeof c === "number" ? c : parsePtBrNumber(c)))
        .filter((n) => Number.isFinite(n) && Math.abs(n) > 0.001 && Math.abs(n) < 10000000)
        .map((n) => Math.abs(n));
      if (nums.length) amount = nums.sort((a, b) => b - a)[0];
    }

    // We only import purchase-like lines (positive amounts)
    if (!amount || amount <= 0) continue;

    // Try installments pattern
    const installmentMatch = description.match(/(?:PARCELA|PARC\.?|P)\s*(\d+)\s*[\/DE]+\s*(\d+)/i);

    txs.push({
      date,
      description,
      amount,
      installment_number: installmentMatch ? parseInt(installmentMatch[1], 10) : 1,
      total_installments: installmentMatch ? parseInt(installmentMatch[2], 10) : 1,
    });
  }

  return txs;
}

function parseGenericCSV(content: string): ParsedTransaction[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (!lines.length) return [];

  // detect delimiter using first non-empty line
  const sample = lines.find((l) => l.trim()) ?? "";
  const semi = (sample.match(/;/g) || []).length;
  const comma = (sample.match(/,/g) || []).length;
  const tab = (sample.match(/\t/g) || []).length;
  const delimiter = comma > semi && comma > tab ? "," : tab > semi && tab > comma ? "\t" : ";";

  const txs: ParsedTransaction[] = [];

  for (const line of lines) {
    const parts = line
      .split(delimiter)
      .map((p) => p.trim().replace(/^["']|["']$/g, ""));

    // find date column
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

    const installmentMatch = description.match(/(?:PARCELA|PARC\.?|P)\s*(\d+)\s*[\/DE]+\s*(\d+)/i);

    txs.push({
      date,
      description,
      amount,
      installment_number: installmentMatch ? parseInt(installmentMatch[1], 10) : 1,
      total_installments: installmentMatch ? parseInt(installmentMatch[2], 10) : 1,
    });
  }

  return txs;
}

// Use OpenAI to categorize transactions
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
      const jsonStr = content
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
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
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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

    switch (provider) {
      case "LATAM":
      case "LATAM_BLACK":
      case "AZUL":
      case "SANTANDER_SMILES":
      case "SANTANDER":
        transactions = parseGenericCSV(content || "");
        break;

      case "ITAU_EMPRESAS":
      case "ITAU": {
        if ((type === "XLSX" || type === "XLS") && fileBase64) {
          const bytes = decodeBase64ToUint8Array(fileBase64);
          const workbook = XLSX.read(bytes, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            raw: true,
            defval: null,
          }) as any[][];

          console.log("XLSX rows:", rows.length);
          console.log("First 5 rows (raw arrays):", JSON.stringify(rows.slice(0, 5)));

          transactions = parseItauEmpresasFromRows(rows);
        } else if (content) {
          transactions = parseGenericCSV(content);
        }
        break;
      }

      case "MERCADO_LIVRE":
      case "MERCADOLIVRE":
        // TODO: Implement PDF extraction when provided
        transactions = [];
        break;

      default:
        if (content) transactions = parseGenericCSV(content);
        break;
    }

    console.log(`Parsed ${transactions.length} transactions`);
    if (transactions.length) {
      console.log("First transaction:", JSON.stringify(transactions[0]));
    }

    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("type", "DESPESA");

    if (openaiKey && categories && transactions.length) {
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
