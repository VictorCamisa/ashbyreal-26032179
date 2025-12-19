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
  
  let cleaned = value.trim();
  
  // Remove R$ e espaços
  cleaned = cleaned.replace(/[R$\s]/g, "");
  
  // Se não tem nem ponto nem vírgula, é um inteiro
  if (!cleaned.includes('.') && !cleaned.includes(',')) {
    return parseFloat(cleaned) || 0;
  }
  
  // Detectar formato brasileiro (1.234,56 ou 123,45) - vírgula como decimal
  const hasBrazilianDecimal = /,\d{1,2}$/.test(cleaned);
  
  // Detectar formato americano com milhares (1,234.56)
  const hasAmericanWithThousands = /,\d{3}/.test(cleaned) && /\.\d{1,2}$/.test(cleaned);
  
  // Formato americano simples (123.45 ou 1234.5) - ponto como decimal, sem vírgula
  const hasSimpleAmericanDecimal = /\.\d{1,2}$/.test(cleaned) && !cleaned.includes(',');
  
  if (hasBrazilianDecimal) {
    // Brasileiro: remove pontos de milhares, troca vírgula por ponto
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasAmericanWithThousands) {
    // Americano com milhares: remove vírgulas
    cleaned = cleaned.replace(/,/g, "");
  } else if (hasSimpleAmericanDecimal) {
    // Americano simples: já está ok, não faz nada
  } else {
    // Fallback: assume brasileiro
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function excelSerialToISO(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}

// Mapeamento de meses em português
const monthMap: Record<string, string> = {
  'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
  'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
  'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
  'january': '01', 'february': '02', 'march': '03', 'april': '04',
  'may': '05', 'june': '06', 'july': '07', 'august': '08',
  'september': '09', 'october': '10', 'november': '11', 'december': '12',
  'dec': '12'
};

function parseDateAny(value: unknown, referenceYear?: number): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 20000 && value < 90000) return excelSerialToISO(value);
  }

  if (typeof value !== "string") return "";
  const v = value.trim();

  // ISO date in text: "PAGAMENTO EFETUADO 2025-12-08"
  const isoInText = v.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoInText) return isoInText[1];

  // YYYY-MM-DD or YYYY/MM/DD (ISO format)
  const ymd = v.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

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

  // DD/Mon format (Itaú Empresas): "27/Nov", "01/Dec"
  const ddMon = v.match(/^(\d{1,2})[\/\-]([A-Za-z]{3,})$/i);
  if (ddMon) {
    const day = ddMon[1].padStart(2, '0');
    const monthStr = ddMon[2].toLowerCase().slice(0, 3);
    const month = monthMap[monthStr];
    if (month) {
      const year = referenceYear || new Date().getFullYear();
      return `${year}-${month}-${day}`;
    }
  }

  return "";
}

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Extract installments from description
// Patterns: "02/05", "PARC 3/12", "Parcela 2 de 10", "3x12"
function extractInstallments(description: string): { num: number; total: number } {
  const normalized = String(description ?? "").replace(/\s+/g, " ").trim();

  const patterns = [
    // "PARCELA 3/12", "PARC 3 DE 12", "Parcela 2 de 10"
    /(?:PARCELA|PARC\.?|P)\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})/i,
    // "01/12" or "1/12" at end of string (after space)
    /\s(\d{1,2})\/(\d{1,2})$/,
    // "3x12" or "3/12" at end
    /(\d{1,2})\s*[xX\/]\s*(\d{1,2})(?=\s*$)/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      // Validate: installment number should be <= total, total between 2 and 48
      if (num > 0 && total >= 2 && num <= total && total <= 48) {
        return { num, total };
      }
    }
  }
  return { num: 1, total: 1 };
}

// Clean description by removing installment patterns
function cleanDescription(description: string): string {
  let cleaned = String(description ?? "").trim();
  
  // Remove patterns like "02/06", "3/12" at end of string
  cleaned = cleaned.replace(/\s+\d{1,2}\/\d{1,2}$/, "");
  // Remove patterns like "PARCELA 3/12", "PARC 3 DE 12"
  cleaned = cleaned.replace(/\s*(?:PARCELA|PARC\.?|P)\s*\d{1,2}\s*(?:\/|DE)\s*\d{1,2}/gi, "");
  
  // Remove patterns like "3x12" at end
  cleaned = cleaned.replace(/\s+\d{1,2}\s*[xX]\s*\d{1,2}$/, "");
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  return cleaned;
}

function isValidAmount(amount: number): boolean {
  // Aceitar valores negativos (estornos, pagamentos) e positivos
  return Math.abs(amount) >= 0.01 && Math.abs(amount) <= 100000;
}

function normalizeAmountByDescription(description: string, amount: number): number {
  const desc = String(description ?? "").toLowerCase();

  // “Créditos/estornos” devem reduzir a fatura (valor negativo)
  const isCreditLike =
    desc.includes("estorno") ||
    desc.includes("devol") ||
    desc.includes("reembolso") ||
    desc.includes("cancel") ||
    desc.includes("chargeback") ||
    desc.includes("credito") ||
    desc.includes("crédito") ||
    desc.includes("ajuste") ||
    desc.includes("cashback") ||
    desc.includes("bonus") ||
    desc.includes("bônus");

  if (isCreditLike) return amount > 0 ? -amount : amount;
  return amount < 0 ? Math.abs(amount) : amount;
}

// Linhas de “pagamento” do cartão não são compra/estorno (não entram na fatura)
function isPaymentLine(description: string): boolean {
  const d = String(description ?? "").toLowerCase().trim();
  return (
    /^pagamento\b/.test(d) ||
    d.includes("pagto") ||
    d.includes("pgto") ||
    d.includes("pagamento efetuado") ||
    d.includes("pagamento fatura") ||
    d.includes("pagamento da fatura")
  );
}

// Check if line is a summary line to skip
function isSummaryLine(description: string): boolean {
  const lower = description.toLowerCase();
  const skipPatterns = [
    'total da fatura',
    'saldo da fatura',
    'total de lançamentos',
    'total de produtos',
    'limite total',
    'limite disponível',
    'resumo da fatura',
    'fatura anterior'
  ];
  return skipPatterns.some(p => lower.includes(p));
}

// ============= XLSX PARSER (ITAU EMPRESAS) =============

function parseItauEmpresasFromRows(rows: any[][], fileName?: string): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];

  // Try to extract year from filename: ITAUEMPRESAS_JANEIRO26 -> 2026
  let referenceYear = new Date().getFullYear();
  if (fileName) {
    const yearMatch = fileName.match(/(\d{2})(?:-\d+)?\.xlsx?$/i);
    if (yearMatch) {
      const yy = parseInt(yearMatch[1], 10);
      referenceYear = yy > 50 ? 1900 + yy : 2000 + yy;
    }
  }

  console.log("Reference year for Itaú:", referenceYear);

  // Find header row containing "data" and "descrição" or "valor"
  let headerRowIndex = -1;
  let dataCol = -1;
  let descCol = -1;
  let valueCol = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const normalized = row.map((c) => String(c ?? "").toLowerCase().trim());
    
    const dataIdx = normalized.findIndex((c) => c === "data");
    const descIdx = normalized.findIndex((c) => c.includes("descr") || c.includes("histórico") || c === "lançamento");
    const valorIdx = normalized.findIndex((c) => c === "valor" || c.includes("valor"));

    if (dataIdx >= 0 && (descIdx >= 0 || valorIdx >= 0)) {
      headerRowIndex = i;
      dataCol = dataIdx;
      descCol = descIdx >= 0 ? descIdx : dataIdx + 1;
      valueCol = valorIdx >= 0 ? valorIdx : row.length - 1;
      console.log(`Found header at row ${i}: data=${dataCol}, desc=${descCol}, value=${valueCol}`);
      break;
    }
  }

  const start = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawDate = row[dataCol];
    const rawDesc = descCol >= 0 ? row[descCol] : null;
    const rawVal = row[valueCol];

    const date = parseDateAny(rawDate, referenceYear);
    if (!date) continue;

    // Description
    let description = String(rawDesc ?? "").trim();
    if (!description || !hasLetters(description)) {
      const candidate = row.find((c) => typeof c === "string" && c.trim().length > 2 && hasLetters(c.trim()));
      if (candidate) description = String(candidate).trim();
    }
    if (!description || !hasLetters(description)) continue;

    // Skip linhas de pagamento (não entram na fatura)
    if (isPaymentLine(description)) continue;

    // Skip summary lines
    if (isSummaryLine(description)) continue;

    // Amount (preservar sinal: + gasto, - crédito/estorno)
    let amount = parsePtBrNumber(rawVal);
    if (!isValidAmount(amount)) {
      const nums = row
        .map((c) => (typeof c === "number" ? c : parsePtBrNumber(c)))
        .filter((n) => isValidAmount(n));
      if (nums.length) amount = nums[nums.length - 1]; // Usually last number is the value
    }

    // Normalizar sinal pelo texto (estorno/etc)
    amount = normalizeAmountByDescription(description, amount);

    if (!isValidAmount(amount)) continue;

    const { num, total } = extractInstallments(description);
    const cleanedDescription = cleanDescription(description);

    txs.push({
      date,
      description: cleanedDescription,
      amount,
      installment_number: num,
      total_installments: total,
    });
  }

  return txs;
}

// ============= CSV PARSER (AZUL, LATAM, GENERIC) =============

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

  // Parse header to identify columns
  let dateColIdx = -1;
  let descColIdx = -1;
  let amountColIdx = -1;
  
  const headerLine = lines[0];
  const headerParts = headerLine.split(delimiter).map(p => 
    p.trim().toLowerCase().replace(/^["'\uFEFF]|["']$/g, "") // Remove BOM, quotes
  );
  
  console.log("Header parts:", headerParts);

  headerParts.forEach((h, idx) => {
    if (h === "data" || h === "date") dateColIdx = idx;
    if (h === "lançamento" || h === "lancamento" || h.includes("descr") || h.includes("estabelecimento") || h === "merchant") descColIdx = idx;
    if (h === "valor" || h === "value" || h === "amount") amountColIdx = idx;
  });
  
  console.log("Detected columns:", { dateColIdx, descColIdx, amountColIdx });

  // If we found header columns, start from line 1
  const hasHeader = dateColIdx >= 0 || descColIdx >= 0 || amountColIdx >= 0;
  const startLine = hasHeader ? 1 : 0;

  for (let lineIdx = startLine; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const parts = line.split(delimiter).map((p) => p.trim().replace(/^["'\uFEFF]|["']$/g, ""));

    // Find date
    let date = "";
    if (dateColIdx >= 0 && parts[dateColIdx]) {
      date = parseDateAny(parts[dateColIdx]);
    }
    if (!date) {
      const dateIndex = parts.findIndex((p) => !!parseDateAny(p));
      if (dateIndex >= 0) date = parseDateAny(parts[dateIndex]);
    }
    if (!date) continue;

    let description = "";
    let amount = 0;

    // Get description from identified column
    if (descColIdx >= 0 && parts[descColIdx]) {
      description = parts[descColIdx];
    }

    // Get amount from identified column - agora aceita valores negativos também
    if (amountColIdx >= 0 && parts[amountColIdx]) {
      const rawAmount = parsePtBrNumber(parts[amountColIdx]);
      if (isValidAmount(rawAmount)) {
        amount = rawAmount;
      }
    }

    // Fallback: search through columns
    if (!description) {
      for (let i = 0; i < parts.length; i++) {
        if (i === dateColIdx || i === amountColIdx) continue;
        if (parts[i].length > 2 && hasLetters(parts[i])) {
          description = parts[i];
          break;
        }
      }
    }

    if (amount === 0) {
      for (let i = parts.length - 1; i >= 0; i--) {
        if (i === dateColIdx || i === descColIdx) continue;
        const n = parsePtBrNumber(parts[i]);
        if (isValidAmount(n)) {
          amount = n;
          break;
        }
      }
    }

    if (!description || (amount === 0 && !isValidAmount(amount))) continue;

    // Skip linhas de pagamento (não entram na fatura)
    if (isPaymentLine(description)) continue;

    // Skip summary lines
    if (isSummaryLine(description)) continue;

    // Normalizar sinal pelo texto (estorno/etc)
    amount = normalizeAmountByDescription(description, amount);

    const { num, total } = extractInstallments(description);
    const cleanedDescription = cleanDescription(description);

    txs.push({
      date,
      description: cleanedDescription,
      amount,
      installment_number: num,
      total_installments: total,
    });
  }

  return txs;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    let transactions: ParsedTransaction[] = [];
    let errorMessage = "";

    const provider = String(cardProvider).toUpperCase();
    const type = String(fileType || "").toUpperCase();

    console.log(`Processing provider: ${provider}, fileType: ${type}`);

    // PDF Processing - not supported
    if (type === "PDF") {
      console.log("PDF files are not directly supported");
      errorMessage = "PDFs não são suportados. Por favor, exporte a fatura no formato CSV ou XLSX do site do seu banco (Mercado Pago permite exportar CSV).";
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
      transactions = parseItauEmpresasFromRows(rows, fileName);
    }
    // CSV Processing
    else if (content) {
      console.log("Processing CSV file...");
      transactions = parseGenericCSV(content);
    }

    console.log(`Parsed ${transactions.length} transactions`);
    if (transactions.length > 0) {
      console.log("Sample transactions:");
      transactions.slice(0, 3).forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.date} | ${t.description} | ${t.amount} | ${t.installment_number}/${t.total_installments}`);
      });
    }

    // Save import record
    const { data: importRecord, error: importError } = await supabase
      .from("credit_card_imports")
      .insert({
        credit_card_id: creditCardId,
        file_name: fileName || "import",
        file_type: type || "CSV",
        competencia: competencia || null,
        status: transactions.length > 0 ? "SUCCESS" : "FAILED",
        records_imported: transactions.length,
        records_failed: 0,
        error_log: errorMessage ? [{ message: errorMessage }] : [],
      })
      .select()
      .single();

    if (importError) {
      console.error("Error saving import record:", importError);
    }

    // Return parsed transactions for frontend to review/save
    return new Response(
      JSON.stringify({
        success: transactions.length > 0,
        transactions,
        importId: importRecord?.id,
        message: errorMessage || `${transactions.length} transações encontradas`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Import error:", error);
    const errMsg = error instanceof Error ? error.message : "Erro ao processar arquivo";
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
