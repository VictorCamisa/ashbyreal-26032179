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
  installment_number: number;
  total_installments: number;
  category_suggestion?: string;
  dedupe_key?: string;
  purchase_fingerprint?: string;
  status?: 'NEW' | 'DUPLICATE' | 'FUTURE_INSTALLMENT';
  competencia?: string;
}

interface ImportSummary {
  new_items: number;
  duplicates: number;
  future_installments: number;
  total_value: number;
}

// ============= UTILITY FUNCTIONS =============

const hasLetters = (s: string) => /[A-Za-zÀ-ÿ]/.test(s);

function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";

  // XLSX can return Date
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  // XLSX can return rich objects { v, w }
  if (typeof value === "object") {
    const cell: any = value;
    if (typeof cell.w === "string") return cell.w;
    if (cell.v !== undefined) return cellToText(cell.v);
  }

  return String(value);
}

function parsePtBrNumber(value: unknown): number {
  // XLSX libraries sometimes return rich cell objects like { v, w }
  if (value && typeof value === "object") {
    const cell: any = value;
    if (cell.v !== undefined) return parsePtBrNumber(cell.v);
    if (typeof cell.w === "string") return parsePtBrNumber(cell.w);
  }

  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;

  let cleaned = value.trim();
  cleaned = cleaned.replace(/[R$\s]/g, "");

  if (!cleaned.includes(".") && !cleaned.includes(",")) {
    return parseFloat(cleaned) || 0;
  }

  const hasBrazilianDecimal = /,\d{1,2}$/.test(cleaned);
  const hasAmericanWithThousands = /,\d{3}/.test(cleaned) && /\.\d{1,2}$/.test(cleaned);
  const hasSimpleAmericanDecimal = /\.\d{1,2}$/.test(cleaned) && !cleaned.includes(",");

  if (hasBrazilianDecimal) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasAmericanWithThousands) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (hasSimpleAmericanDecimal) {
    // já está ok
  } else {
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
  // XLSX can return Date or rich cell objects
  if (value && typeof value === "object") {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }

    const cell: any = value;
    if (cell.v !== undefined) return parseDateAny(cell.v, referenceYear);
    if (typeof cell.w === "string") return parseDateAny(cell.w, referenceYear);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 20000 && value < 90000) return excelSerialToISO(value);
  }

  if (typeof value !== "string") return "";
  const v = value.trim();

  const isoInText = v.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoInText) return isoInText[1];

  const ymd = v.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

  const dmy = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  const dmy2 = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (dmy2) {
    const yy = parseInt(dmy2[3], 10);
    const yyyy = yy > 50 ? `19${dmy2[3]}` : `20${dmy2[3]}`;
    return `${yyyy}-${dmy2[2]}-${dmy2[1]}`;
  }

  // DD/Mon format (Itaú Empresas): "27/Nov", "01/Dec"
  const ddMon = v.match(/^(\d{1,2})[\/\-]([A-Za-z]{3,})$/i);
  if (ddMon) {
    const day = ddMon[1].padStart(2, "0");
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
      if (num > 0 && total >= 2 && num <= total && total <= 48) {
        return { num, total };
      }
    }
  }
  return { num: 1, total: 1 };
}

function cleanDescription(description: string): string {
  let cleaned = String(description ?? "").trim();
  
  // Remove installment patterns at end: "01/02", "02/12", "1/5"
  cleaned = cleaned.replace(/\s*\d{1,2}\/\d{1,2}$/, "");
  
  // Remove installment patterns in middle: "PARCELA 1 DE 12", "PARC 2/12", "P 3 DE 10"
  cleaned = cleaned.replace(/\s*(?:PARCELA|PARC\.?|P)\s*\d{1,2}\s*(?:\/|DE)\s*\d{1,2}/gi, "");
  
  // Remove multiplier patterns: "3x12", "3 x 12"
  cleaned = cleaned.replace(/\s*\d{1,2}\s*[xX]\s*\d{1,2}$/, "");
  
  // Remove installment suffix patterns without space: "SHIBA01/02" -> "SHIBA"
  cleaned = cleaned.replace(/(\d{1,2})\/(\d{1,2})$/, "");
  
  // Clean up spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function isValidAmount(amount: number): boolean {
  return Math.abs(amount) >= 0.01 && Math.abs(amount) <= 100000;
}

function normalizeAmountByDescription(description: string, amount: number): number {
  const desc = String(description ?? "").toLowerCase();
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
  return amount;
}

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

function isSummaryLine(description: string): boolean {
  const lower = description.toLowerCase();
  const skipPatterns = [
    'total da fatura', 'saldo da fatura', 'total de lançamentos',
    'total de produtos', 'limite total', 'limite disponível',
    'resumo da fatura', 'fatura anterior', 'total de'
  ];
  return skipPatterns.some(p => lower.includes(p));
}

function normalizeMerchant(description: string): string {
  // IMPORTANT: First clean installment patterns, then normalize
  const cleaned = cleanDescription(description);
  return cleaned
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 50);
}

function generateDedupeKey(
  cardId: string,
  competencia: string,
  date: string,
  amount: number,
  description: string,
  installmentNum: number,
  installmentTotal: number
): string {
  // normalizeMerchant already cleans installment patterns
  const normalized = normalizeMerchant(description);
  const amountStr = Math.round(amount * 100).toString();
  return `${cardId}_${competencia}_${date}_${amountStr}_${normalized}_${installmentNum}_${installmentTotal}`;
}

function generatePurchaseFingerprint(
  cardId: string,
  purchaseDate: string,
  totalAmount: number,
  description: string,
  installmentTotal: number
): string {
  const normalized = normalizeMerchant(description);
  const amountStr = Math.round(totalAmount * 100).toString();
  return `${cardId}_${purchaseDate}_${amountStr}_${normalized}_${installmentTotal}`;
}

async function calculateFileHash(content: string | Uint8Array): Promise<string> {
  let data: ArrayBuffer;
  if (typeof content === 'string') {
    data = new TextEncoder().encode(content).buffer as ArrayBuffer;
  } else {
    const copy = new Uint8Array(content);
    data = copy.buffer as ArrayBuffer;
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// ============= PARSER: ITAUCARD CSV (LATAM, AZUL) =============
// Format: data,lançamento,valor
// Example: 2025-12-17,SUPERMERCADO-CT INDA,7.29

function parseItaucardCSV(content: string): ParsedTransaction[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (!lines.length) return [];

  console.log("Parsing Itaucard CSV format (LATAM/Azul)");
  const txs: ParsedTransaction[] = [];

  // Detect delimiter
  const sample = lines[0];
  const delimiter = sample.includes(';') ? ';' : ',';
  
  // Skip header
  const startLine = lines[0].toLowerCase().includes('data') ? 1 : 0;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(delimiter).map(p => p.trim().replace(/^["'\uFEFF]|["']$/g, ""));
    
    if (parts.length < 3) continue;

    const [rawDate, rawDesc, rawValue] = parts;
    
    // Parse date (ISO format: 2025-12-17)
    const date = parseDateAny(rawDate);
    if (!date) continue;

    const description = rawDesc;
    if (!description || !hasLetters(description)) continue;

    // Skip payment lines
    if (isPaymentLine(description)) continue;

    // Parse amount
    let amount = parsePtBrNumber(rawValue);
    if (!isValidAmount(amount)) continue;

    // Normalize by description (estornos, etc)
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

  console.log(`Itaucard CSV: parsed ${txs.length} transactions`);
  return txs;
}

// ============= PARSER: ITAÚ EMPRESAS XLSX =============
// Format: Tabela com data | descrição | valor em colunas esparsas
// Date format: DD/Mon (27/Nov, 01/Dec)
// The spreadsheet has many empty columns between data, description, and value

function parseItauEmpresasXLSX(rows: any[][], fileName?: string): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];

  // Extract year from filename: ITAUEMPRESAS_DEZEMBRO25NOVO.xlsx -> 2025
  let referenceYear = new Date().getFullYear();
  if (fileName) {
    const yearMatch = fileName.match(/(\d{2})(?:NOVO)?(?:-\d+)?\.xlsx?$/i);
    if (yearMatch) {
      const yy = parseInt(yearMatch[1], 10);
      referenceYear = yy > 50 ? 1900 + yy : 2000 + yy;
    }
  }

  console.log("Parsing Itaú Empresas XLSX, reference year:", referenceYear);

  // Find "Lançamentos nacionais" section and parse rows after header
  let inLancamentosSection = false;
  let foundHeader = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    
    // Convert row to string for section detection
    const rowStr = row.map((c) => cellToText(c).toLowerCase()).join(" ");

    // Detect "Lançamentos nacionais" section header
    if (rowStr.includes("lançamentos nacionais") || rowStr.includes("lancamentos nacionais")) {
      inLancamentosSection = true;
      console.log(`Found 'Lançamentos nacionais' at row ${i}`);
      continue;
    }

    // Detect column headers row (data | descrição | valor)
    if (inLancamentosSection && !foundHeader) {
      const hasData = rowStr.includes("data");
      const hasValor = rowStr.includes("valor");
      if (hasData && hasValor) {
        foundHeader = true;
        console.log(`Found header row at ${i}`);
        continue;
      }
    }

    // Stop at totals AFTER we are inside the real table (header found)
    // (In this XLSX, there is a "Resumo da fatura" section that also contains these words)
    if (
      inLancamentosSection &&
      foundHeader &&
      (rowStr.includes("total de lançamentos") || rowStr.includes("total de produtos"))
    ) {
      console.log(`Stopping at total row ${i}`);
      break;
    }

    // Parse data rows (after header found)
    if (inLancamentosSection && foundHeader) {
      // Find date, description, and value from non-empty cells
      // The file can have leading non-empty columns, so we detect by content (not position)

      const nonEmptyCells: { value: any; idx: number; text: string }[] = [];
      for (let j = 0; j < row.length; j++) {
        const cell = row[j];
        const cellText = cellToText(cell);
        if (cellText.trim() !== "") {
          nonEmptyCells.push({ value: cell, idx: j, text: cellText });
        }
      }

      if (nonEmptyCells.length < 2) continue;

      // Find the first cell that looks like a date
      let date = "";
      let datePos = -1;
      for (let j = 0; j < nonEmptyCells.length; j++) {
        const candidate = parseDateAny(nonEmptyCells[j].value, referenceYear);
        if (candidate) {
          date = candidate;
          datePos = j;
          break;
        }
      }
      if (!date) continue;

      // Find the last cell that looks like an amount
      let amount = 0;
      let valuePos = -1;
      for (let j = nonEmptyCells.length - 1; j >= 0; j--) {
        const val = parsePtBrNumber(nonEmptyCells[j].value);
        if (isValidAmount(val)) {
          amount = val;
          valuePos = j;
          break;
        }
      }
      if (!isValidAmount(amount)) continue;
      if (valuePos <= datePos) continue;

      // Description is typically between date and value
      let description = "";
      for (let j = datePos + 1; j < valuePos; j++) {
        const cellStr = nonEmptyCells[j].text.trim();
        if (cellStr && hasLetters(cellStr)) {
          description = cellStr;
          break;
        }
      }

      // If no description found between, try any other text cell in the row
      if (!description) {
        for (let j = 0; j < nonEmptyCells.length; j++) {
          if (j === datePos || j === valuePos) continue;
          const cellStr = nonEmptyCells[j].text.trim();
          if (cellStr && hasLetters(cellStr)) {
            description = cellStr;
            break;
          }
        }
      }

      if (!description) continue;
      if (isPaymentLine(description)) continue;
      if (isSummaryLine(description)) continue;

      amount = normalizeAmountByDescription(description, amount);

      const { num, total } = extractInstallments(description);
      const cleanedDescription = cleanDescription(description);

      console.log(`  Row ${i}: ${date} | ${cleanedDescription} | ${amount}`);

      txs.push({
        date,
        description: cleanedDescription,
        amount,
        installment_number: num,
        total_installments: total,
      });
    }
  }

  console.log(`Itaú Empresas XLSX: parsed ${txs.length} transactions`);
  return txs;
}

// ============= PARSER: GENERIC CSV (Fallback) =============

function parseGenericCSV(content: string): ParsedTransaction[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (!lines.length) return [];

  const sample = lines.find((l) => l.trim()) ?? "";
  const semi = (sample.match(/;/g) || []).length;
  const comma = (sample.match(/,/g) || []).length;
  const tab = (sample.match(/\t/g) || []).length;
  const delimiter = semi >= comma && semi >= tab ? ";" : comma > tab ? "," : "\t";

  console.log("Parsing Generic CSV, delimiter:", delimiter, "lines:", lines.length);

  const txs: ParsedTransaction[] = [];

  let dateColIdx = -1;
  let descColIdx = -1;
  let amountColIdx = -1;
  
  const headerLine = lines[0];
  const headerParts = headerLine.split(delimiter).map(p => 
    p.trim().toLowerCase().replace(/^["'\uFEFF]|["']$/g, "")
  );

  headerParts.forEach((h, idx) => {
    if (h === "data" || h === "date") dateColIdx = idx;
    if (h === "lançamento" || h === "lancamento" || h.includes("descr") || h.includes("estabelecimento") || h === "merchant") descColIdx = idx;
    if (h === "valor" || h === "value" || h === "amount") amountColIdx = idx;
  });

  const hasHeader = dateColIdx >= 0 || descColIdx >= 0 || amountColIdx >= 0;
  const startLine = hasHeader ? 1 : 0;

  for (let lineIdx = startLine; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const parts = line.split(delimiter).map((p) => p.trim().replace(/^["'\uFEFF]|["']$/g, ""));

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

    if (descColIdx >= 0 && parts[descColIdx]) {
      description = parts[descColIdx];
    }

    if (amountColIdx >= 0 && parts[amountColIdx]) {
      const rawAmount = parsePtBrNumber(parts[amountColIdx]);
      if (isValidAmount(rawAmount)) {
        amount = rawAmount;
      }
    }

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

    if (isPaymentLine(description)) continue;
    if (isSummaryLine(description)) continue;

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
      competenciaAlvo,
      tipoImportacao = 'FECHADA', // Default to FECHADA for backward compatibility
    } = await req.json();

    console.log("=== IMPORT REQUEST (V5 - Tipo Importacao) ===");
    console.log("creditCardId:", creditCardId);
    console.log("cardProvider:", cardProvider);
    console.log("fileType:", fileType);
    console.log("fileName:", fileName);
    console.log("competenciaAlvo:", competenciaAlvo);
    console.log("tipoImportacao:", tipoImportacao);

    if (!creditCardId || !cardProvider) {
      return new Response(
        JSON.stringify({ error: "creditCardId e cardProvider são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!competenciaAlvo) {
      return new Response(
        JSON.stringify({ error: "competenciaAlvo é obrigatória (formato YYYY-MM)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch card info to get closing_day
    const { data: cardInfo, error: cardError } = await supabase
      .from('credit_cards')
      .select('closing_day')
      .eq('id', creditCardId)
      .single();

    if (cardError) {
      console.error("Error fetching card info:", cardError);
    }

    const closingDay = cardInfo?.closing_day || 10;
    console.log("Card closing day:", closingDay);

    // Calculate file hash
    const fileContent = fileBase64 
      ? decodeBase64ToUint8Array(fileBase64) 
      : new TextEncoder().encode(content || '');
    const fileHash = await calculateFileHash(fileContent);
    
    console.log("File hash:", fileHash);

    // Check for existing import - just log, don't block
    // Allow incremental imports: same file can be re-imported to add missing transactions
    const { data: existingImport } = await supabase
      .from('credit_card_imports')
      .select('id, created_at, records_imported, status')
      .eq('credit_card_id', creditCardId)
      .eq('file_hash', fileHash)
      .maybeSingle();

    let previousImportInfo = null;
    if (existingImport && (existingImport.records_imported ?? 0) > 0) {
      console.log("File previously imported, allowing incremental import:", existingImport.id);
      previousImportInfo = {
        import_id: existingImport.id,
        imported_at: existingImport.created_at,
        records_imported: existingImport.records_imported
      };
    }

    if (existingImport && (existingImport.records_imported ?? 0) === 0) {
      console.log("Previous empty/failed import found, deleting:", existingImport.id);
      await supabase.from('credit_card_imports').delete().eq('id', existingImport.id);
    }
    
    // Fetch existing transactions for this card to show in preview
    // For BOTH open and closed invoices, we need to show ALL transactions with this competencia
    // because the bank includes both new purchases AND installments from previous purchases
    const competenciaFormatted = `${competenciaAlvo.slice(0, 7)}-01`;
    
    const { data: existingForCompetencia } = await supabase
      .from('credit_card_transactions')
      .select('id, description, amount, purchase_date, installment_number, total_installments, competencia')
      .eq('credit_card_id', creditCardId)
      .eq('competencia', competenciaFormatted)
      .order('purchase_date', { ascending: true });
    
    console.log(`Found ${existingForCompetencia?.length || 0} existing transactions for competencia ${competenciaAlvo}`);

    let transactions: ParsedTransaction[] = [];
    let errorMessage = "";

    const provider = String(cardProvider).toUpperCase();
    const type = String(fileType || "").toUpperCase();

    console.log(`Processing provider: ${provider}, fileType: ${type}`);

    // Route to appropriate parser based on provider and file type
    if (type === "PDF") {
      errorMessage = "PDFs não são suportados diretamente. Por favor, exporte a fatura em CSV ou XLSX pelo site/app do banco.";
    }
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
      
      // Use Itaú Empresas parser for XLSX
      transactions = parseItauEmpresasXLSX(rows, fileName);
    }
    else if (content) {
      console.log("Processing CSV file...");
      
      // Route based on provider
      if (provider === 'LATAM' || provider === 'LATAM_BLACK' || provider === 'AZUL') {
        // Both use Itaucard format: data,lançamento,valor
        transactions = parseItaucardCSV(content);
      } else {
        // Generic CSV parser for other providers
        transactions = parseGenericCSV(content);
      }
    }

    console.log(`Parsed ${transactions.length} transactions`);

    if (transactions.length > 0) {
      console.log("Sample transactions:");
      transactions.slice(0, 3).forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.date} | ${t.description} | ${t.amount} | ${t.installment_number}/${t.total_installments}`);
      });
    }

    // Function to calculate correct competencia based on closing day
    // IMPORTANT: Banks name invoices by their DUE MONTH (vencimento), not closing month
    // 
    // The billing cycle works like this:
    // - Purchases from day (closingDay+1) of month M-1 to closingDay of month M
    //   are billed in the invoice that CLOSES on day closingDay of month M
    //   and is DUE in month M+1 (around day dueDay)
    // - Banks call this the "Month M+1 invoice" (by due date)
    //
    // Example: Closing day = 27
    // - Purchase on Dec 28 (after closing) → Goes to Jan 27 closing → Due Feb 4 → "February invoice"
    // - Purchase on Jan 15 (before closing) → Goes to Jan 27 closing → Due Feb 4 → "February invoice"  
    // - Purchase on Jan 28 (after closing) → Goes to Feb 27 closing → Due Mar 4 → "March invoice"
    function calculateCompetencia(purchaseDate: string, closingDay: number): string {
      const date = new Date(purchaseDate + 'T12:00:00Z');
      const day = date.getUTCDate();
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth(); // 0-indexed
      
      let competenciaMonth: number;
      let competenciaYear: number;
      
      if (day <= closingDay) {
        // Purchase on or before closing day → invoice closes THIS month, DUE NEXT month
        // Example: Jan 15 with closing 27 → closes Jan 27 → due Feb → competencia = Feb
        competenciaMonth = month + 1; // +1 for due month
        competenciaYear = year;
      } else {
        // Purchase after closing day → invoice closes NEXT month, DUE in 2 months
        // Example: Jan 28 with closing 27 → closes Feb 27 → due Mar → competencia = Mar
        competenciaMonth = month + 2; // +2 for due month (next month's closing + 1)
        competenciaYear = year;
      }
      
      // Handle year overflow
      if (competenciaMonth > 11) {
        competenciaYear += Math.floor(competenciaMonth / 12);
        competenciaMonth = competenciaMonth % 12;
      }
      
      return `${competenciaYear}-${String(competenciaMonth + 1).padStart(2, '0')}-01`;
    }

    // Check for duplicates across ALL competencias for this card
    const { data: existingTransactions } = await supabase
      .from('credit_card_transactions')
      .select('dedupe_key, competencia, purchase_date, amount, description, installment_number, total_installments, parent_purchase_id')
      .eq('credit_card_id', creditCardId)
      .not('dedupe_key', 'is', null);

    const existingDedupeKeys = new Set(existingTransactions?.map(t => t.dedupe_key) || []);
    
    // For open invoices, also create a set of "transaction signatures" that ignore competencia
    // This prevents importing the same transaction again even if the competencia calculation differs
    const existingSignatures = new Set(
      existingTransactions?.map(t => {
        // Create signature: date + amount + description + installment info
        const desc = String(t.description || '').replace(/\s+/g, '').toUpperCase();
        const amt = Math.round(Math.abs(t.amount) * 100);
        return `${t.purchase_date}_${amt}_${desc}_${t.installment_number || 1}_${t.total_installments || 1}`;
      }) || []
    );
    
    // Get existing purchase fingerprints to detect if a purchase (any installment) already exists
    // This is crucial for open invoices where the file shows installment 1 but we already have installment 2+
    const { data: existingPurchases } = await supabase
      .from('card_purchases')
      .select('purchase_fingerprint')
      .eq('credit_card_id', creditCardId)
      .not('purchase_fingerprint', 'is', null);
    
    const existingPurchaseFingerprints = new Set(existingPurchases?.map(p => p.purchase_fingerprint) || []);
    
    console.log(`Found ${existingDedupeKeys.size} existing dedupe keys, ${existingSignatures.size} unique signatures, ${existingPurchaseFingerprints.size} purchase fingerprints`);

    // Process transactions and add idempotency fields
    const summary: ImportSummary = {
      new_items: 0,
      duplicates: 0,
      future_installments: 0,
      total_value: 0,
    };

    const processedTransactions: ParsedTransaction[] = [];
    const targetCompetencia = `${competenciaAlvo.slice(0, 7)}-01`;
    const isOpenInvoice = tipoImportacao === 'ABERTA';

    console.log(`Filtering for tipo=${tipoImportacao}, targetCompetencia=${targetCompetencia}`);

    // Collect unique competencias found in file for debugging
    const competenciasNoArquivo = new Map<string, number>();
    for (const tx of transactions) {
      const txComp = calculateCompetencia(tx.date, closingDay);
      competenciasNoArquivo.set(txComp, (competenciasNoArquivo.get(txComp) || 0) + 1);
    }
    console.log("Competências encontradas no arquivo:", Object.fromEntries(competenciasNoArquivo));

    for (const tx of transactions) {
      // For FECHADA (closed invoice): use the target competencia directly
      // because the bank statement already contains only transactions for that billing cycle
      // For ABERTA (open invoice): calculate based on purchase date and closing day
      let txCompetencia: string;
      let shouldInclude = true;
      
      if (isOpenInvoice) {
        // Open invoice: the bank shows ALL pending installments (current + future)
        // But we only want to import transactions for the TARGET competencia
        // The competencia of a transaction is determined by purchase_date + closing_day
        txCompetencia = calculateCompetencia(tx.date, closingDay);
        
        // For open invoices, we include ALL transactions that will appear on the 
        // target month's invoice. This includes installments from previous purchases
        // that are scheduled to be charged in the target month.
        // The txCompetencia represents when this specific installment will be charged.
        shouldInclude = txCompetencia === targetCompetencia;
        
        if (!shouldInclude) {
          // Don't log every skip, just count them
          continue;
        }
      } else {
        // Closed invoice: ALL transactions in the file belong to the selected competencia
        // This is because bank statements only include transactions for that billing period
        txCompetencia = targetCompetencia;
      }

      const dedupeKey = generateDedupeKey(
        creditCardId,
        txCompetencia,
        tx.date,
        tx.amount,
        tx.description,
        tx.installment_number,
        tx.total_installments
      );

      const originalAmount = tx.amount * tx.total_installments;
      const purchaseFingerprint = generatePurchaseFingerprint(
        creditCardId,
        tx.date,
        originalAmount,
        tx.description,
        tx.total_installments
      );

      // For open invoices, check by multiple methods:
      // 1. Signature (exact match including installment number)
      // 2. Purchase fingerprint (to detect if ANY installment of this purchase exists)
      // For closed invoices, check by dedupe_key (includes competencia)
      let isDuplicate: boolean;
      let duplicateReason = '';
      
      if (isOpenInvoice) {
        // First check by exact signature
        const desc = String(tx.description || '').replace(/\s+/g, '').toUpperCase();
        const amt = Math.round(Math.abs(tx.amount) * 100);
        const signature = `${tx.date}_${amt}_${desc}_${tx.installment_number || 1}_${tx.total_installments || 1}`;
        
        if (existingSignatures.has(signature)) {
          isDuplicate = true;
          duplicateReason = 'signature';
        } 
        // Then check by purchase fingerprint (for installment purchases that already have other installments)
        else if (tx.total_installments > 1 && existingPurchaseFingerprints.has(purchaseFingerprint)) {
          isDuplicate = true;
          duplicateReason = 'purchase_fingerprint';
        }
        else {
          isDuplicate = false;
        }
        
        if (isDuplicate) {
          console.log(`  Duplicate (${duplicateReason}): ${tx.description} | ${tx.date} | ${tx.amount} | ${tx.installment_number}/${tx.total_installments}`);
        }
      } else {
        // Key-based deduplication for closed invoices
        isDuplicate = existingDedupeKeys.has(dedupeKey);
      }

      const processedTx: ParsedTransaction = {
        ...tx,
        competencia: txCompetencia,
        dedupe_key: dedupeKey,
        purchase_fingerprint: purchaseFingerprint,
        status: isDuplicate ? 'DUPLICATE' : 'NEW',
      };

      if (isDuplicate) {
        summary.duplicates++;
      } else {
        summary.new_items++;
        summary.total_value += tx.amount;

        if (tx.total_installments > 1 && tx.installment_number < tx.total_installments) {
          summary.future_installments += (tx.total_installments - tx.installment_number);
        }
      }

      processedTransactions.push(processedTx);
    }

    console.log(`Import summary (tipo=${tipoImportacao}):`, summary);

    // Save preview import record
    const { data: importRecord, error: importError } = await supabase
      .from("credit_card_imports")
      .insert({
        credit_card_id: creditCardId,
        file_name: fileName || "import",
        file_hash: fileHash,
        competencia: targetCompetencia,
        status: processedTransactions.length > 0 ? "PREVIEW" : "FAILED",
        records_imported: 0,
        notes: errorMessage || null,
        raw_data: {
          summary,
          parsed_count: transactions.length,
          provider,
          file_type: type,
          closing_day: closingDay,
          tipo_importacao: tipoImportacao,
        },
      })
      .select()
      .single();

    if (importError) {
      console.error("Error saving import record:", importError);
    }

    return new Response(
      JSON.stringify({
        success: processedTransactions.length > 0 && !errorMessage,
        transactions: processedTransactions,
        summary,
        import_id: importRecord?.id,
        file_hash: fileHash,
        competencia_alvo: targetCompetencia,
        closing_day: closingDay,
        tipo_importacao: tipoImportacao,
        can_import: summary.new_items > 0,
        message: errorMessage || `${summary.new_items} novas transações, ${summary.duplicates} duplicatas ignoradas`,
        // New fields for incremental import
        existing_transactions: existingForCompetencia || [],
        previous_import: previousImportInfo,
        // Debug info - competencias found in file
        competencias_no_arquivo: Object.fromEntries(competenciasNoArquivo),
        total_parsed: transactions.length,
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
