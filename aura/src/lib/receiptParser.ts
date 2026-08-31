export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ParsedReceipt {
  merchant: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  currency: string;
  category: string;
  imageUrl?: string;
  rawText?: string;
}

export const CANADIAN_MERCHANTS: Record<string, { name: string; category: string }> = {
  shoppers: { name: 'Shoppers Drug Mart', category: 'Studies' },
  pharmaprix: { name: 'Pharmaprix / Shoppers', category: 'Studies' },
  rexall: { name: 'Rexall PharmaPlus', category: 'Studies' },
  costco: { name: 'Costco Wholesale', category: 'Groceries' },
  loblaws: { name: 'Loblaws', category: 'Groceries' },
  metro: { name: 'Metro', category: 'Groceries' },
  walmart: { name: 'Walmart Canada', category: 'Groceries' },
  'no frills': { name: 'No Frills', category: 'Groceries' },
  sobeys: { name: 'Sobeys', category: 'Groceries' },
  'food basics': { name: 'Food Basics', category: 'Groceries' },
  freshco: { name: 'FreshCo', category: 'Groceries' },
  'farm boy': { name: 'Farm Boy', category: 'Groceries' },
  'tim hortons': { name: 'Tim Hortons', category: 'Food' },
  tims: { name: 'Tim Hortons', category: 'Food' },
  starbucks: { name: 'Starbucks Coffee', category: 'Food' },
  mcdonald: { name: "McDonald's", category: 'Food' },
  lcbo: { name: 'LCBO', category: 'Entertainment' },
  'beer store': { name: 'The Beer Store', category: 'Entertainment' },
  'uber eats': { name: 'Uber Eats', category: 'Food' },
  doordash: { name: 'DoorDash', category: 'Food' },
  'best buy': { name: 'Best Buy Canada', category: 'Shopping' },
  ikea: { name: 'IKEA Canada', category: 'Shopping' },
  dollarama: { name: 'Dollarama', category: 'Shopping' },
  amazon: { name: 'Amazon.ca', category: 'Shopping' },
  keg: { name: 'The Keg Steakhouse', category: 'Food' },
  cactus: { name: 'Cactus Club Cafe', category: 'Food' },
  subway: { name: 'Subway', category: 'Food' },
  chipotle: { name: 'Chipotle Mexican Grill', category: 'Food' },
  wendy: { name: "Wendy's", category: 'Food' },
  popeyes: { name: 'Popeyes', category: 'Food' },
  harveys: { name: "Harvey's", category: 'Food' },
  aw: { name: 'A&W Canada', category: 'Food' },
  shell: { name: 'Shell Gas Station', category: 'Transport' },
  esso: { name: 'Esso / Mobil', category: 'Transport' },
  petro: { name: 'Petro-Canada', category: 'Transport' },
};

export const SAMPLE_RECEIPTS: Record<string, ParsedReceipt> = {
  costco_groceries: {
    merchant: 'Costco Wholesale',
    date: new Date().toISOString().split('T')[0],
    currency: 'CAD',
    category: 'Groceries',
    items: [
      { id: 'item-1', name: 'Kirkland Organic Milk 3x2L', price: 10.99, quantity: 1 },
      { id: 'item-2', name: 'Kirkland Cage-Free Eggs 30pk', price: 8.49, quantity: 1 },
      { id: 'item-3', name: 'Fresh Boneless Chicken Breast 2kg', price: 24.50, quantity: 1 },
      { id: 'item-4', name: 'Organic Bananas 1.5kg', price: 2.89, quantity: 1 },
      { id: 'item-5', name: 'Kirkland Paper Towels 12pk', price: 21.99, quantity: 1 },
      { id: 'item-6', name: 'Avocados Bag 5pk', price: 5.99, quantity: 1 },
    ],
    subtotal: 74.85,
    tax: 3.25,
    tip: 0,
    total: 78.10,
  },
  shoppers_drug_mart: {
    merchant: 'Shoppers Drug Mart',
    date: '2026-08-27',
    currency: 'CAD',
    category: 'Studies',
    items: [
      { id: 'item-1', name: 'NESTLE AERO CH', price: 1.75, quantity: 1 },
    ],
    subtotal: 1.75,
    tax: 0.23,
    tip: 0,
    total: 1.98,
  },
  roommate_dinner: {
    merchant: 'The Keg Steakhouse + Bar',
    date: new Date().toISOString().split('T')[0],
    currency: 'CAD',
    category: 'Food',
    items: [
      { id: 'item-1', name: 'Top Sirloin 8oz & Fries', price: 34.00, quantity: 2 },
      { id: 'item-2', name: 'Keg Prime Rib 10oz', price: 42.00, quantity: 1 },
      { id: 'item-3', name: 'Crispy Calamari Appetizer', price: 18.50, quantity: 1 },
      { id: 'item-4', name: 'Draft Beer Pint (Alexander Keiths)', price: 9.50, quantity: 3 },
      { id: 'item-5', name: 'Billy Miner Pie Dessert', price: 12.00, quantity: 1 },
    ],
    subtotal: 135.00,
    tax: 17.55,
    tip: 24.30,
    total: 176.85,
  },
  uber_eats: {
    merchant: 'Uber Eats (Chipotle Mexican Grill)',
    date: new Date().toISOString().split('T')[0],
    currency: 'CAD',
    category: 'Food',
    items: [
      { id: 'item-1', name: 'Chicken Burrito Bowl + Guacamole', price: 17.80, quantity: 2 },
      { id: 'item-2', name: 'Steak Quesadilla', price: 18.50, quantity: 1 },
      { id: 'item-3', name: 'Chips & Fresh Tomato Salsa', price: 4.50, quantity: 1 },
      { id: 'item-4', name: 'Delivery Fee & Service', price: 4.99, quantity: 1 },
    ],
    subtotal: 45.79,
    tax: 5.95,
    tip: 6.00,
    total: 57.74,
  },
};

/**
 * Extract all monetary numbers ($X.XX) from a string
 */
function extractAllPrices(str: string): number[] {
  const matches = [...str.matchAll(/(?:\$\s*)?([0-9]+\.[0-9]{2})/g)];
  return matches.map((m) => parseFloat(m[1])).filter((p) => !isNaN(p) && p > 0);
}

/**
 * Super-Resilient Canadian Receipt & E-Bill Parser
 * Accurately reconciles line items, subtotal, HST/GST tax, and grand total
 */
export function parseReceiptText(text: string): ParsedReceipt {
  if (!text || typeof text !== 'string') {
    return {
      merchant: 'Store Receipt',
      date: new Date().toISOString().split('T')[0],
      items: [{ id: 'item-default-1', name: 'Scanned Purchase', price: 0, quantity: 1 }],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      currency: 'CAD',
      category: 'Groceries',
      rawText: '',
    };
  }

  // 1. Text Normalization
  const normalizedText = text
    .replace(/(\d+),(\d{2})/g, '$1.$2')               // Convert 1,75 -> 1.75
    .replace(/\$\s+/g, '$')                           // Clean $ 1.98 -> $1.98
    .replace(/([0-9])\s*\.\s*([0-9]{2})/g, '$1.$2'); // Clean 1 . 98 -> 1.98

  const rawLines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let detectedMerchant = 'Store Receipt';
  let detectedCategory = 'Groceries';
  let detectedDate = new Date().toISOString().split('T')[0];
  const items: ReceiptItem[] = [];
  let parsedSubtotal = 0;
  let parsedTax = 0;
  let parsedTip = 0;
  let parsedTotal = 0;

  // 2. Detect Merchant from Header Lines (Top 12 lines)
  for (let i = 0; i < Math.min(rawLines.length, 12); i++) {
    const lineLower = rawLines[i].toLowerCase();
    for (const [key, info] of Object.entries(CANADIAN_MERCHANTS)) {
      if (lineLower.includes(key)) {
        detectedMerchant = info.name;
        detectedCategory = info.category;
        break;
      }
    }
    if (detectedMerchant !== 'Store Receipt') break;
  }

  // 3. Detect Purchase Date
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  for (const line of rawLines) {
    const textMonthMatch = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})/i);
    if (textMonthMatch) {
      const m = monthMap[textMonthMatch[1].slice(0, 3).toLowerCase()];
      const d = textMonthMatch[2].padStart(2, '0');
      const y = textMonthMatch[3];
      detectedDate = `${y}-${m}-${d}`;
      break;
    }

    const numDateMatch = line.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (numDateMatch) {
      detectedDate = `${numDateMatch[1]}-${numDateMatch[2].padStart(2, '0')}-${numDateMatch[3].padStart(2, '0')}`;
      break;
    }
    const shortDateMatch = line.match(/(\d{2})[/](\d{2})[/](\d{2})/);
    if (shortDateMatch) {
      detectedDate = `20${shortDateMatch[1]}-${shortDateMatch[2]}-${shortDateMatch[3]}`;
      break;
    }
  }

  // 4. Pass 1: Global Scan for Grand Total, Subtotal & Tax across whole receipt
  const candidateTotals: number[] = [];

  for (const line of rawLines) {
    const lineLower = line.toLowerCase();
    const prices = extractAllPrices(line);
    const lastPrice = prices.length > 0 ? prices[prices.length - 1] : 0;

    // TOTAL matches
    if (
      lineLower.includes('total') || 
      lineLower.includes('amount due') || 
      lineLower.includes('balance') ||
      lineLower.includes('debit') ||
      lineLower.includes('chequing') ||
      lineLower.includes('cad$') ||
      lineLower.includes('cad $')
    ) {
      // Avoid Subtotal lines
      if (!lineLower.includes('subtotal') && !lineLower.includes('sub total') && !lineLower.includes('sub-total')) {
        if (lastPrice > 0 && lastPrice < 5000) {
          candidateTotals.push(lastPrice);
        }
      }
    }

    // Explicit TOTAL Line
    if (lineLower.startsWith('total') || lineLower.includes('total:') || lineLower.includes('total :')) {
      if (lastPrice > 0) {
        parsedTotal = lastPrice;
      }
    }

    // Explicit SUBTOTAL Line
    if (lineLower.includes('subtotal') || lineLower.includes('sub total') || lineLower.includes('sub-total')) {
      if (lastPrice > 0) {
        parsedSubtotal = lastPrice;
      }
    }

    // Explicit TAX Line (HST, GST, PST, TVH)
    if (
      lineLower.includes('hst') || 
      lineLower.includes('gst') || 
      lineLower.includes('pst') || 
      lineLower.includes('tvh') || 
      lineLower.includes('tax')
    ) {
      // Avoid GST/HST Registration Number lines (e.g. GST/HST #: 84281 5086 RT0002)
      if (!lineLower.includes('#') && !lineLower.includes('rt000') && !lineLower.includes('reg')) {
        if (lastPrice > 0 && lastPrice < 500) {
          parsedTax = lastPrice;
        }
      }
    }

    // Explicit TIP Line
    if (lineLower.includes('tip') || lineLower.includes('gratuity')) {
      if (lastPrice > 0) {
        parsedTip = lastPrice;
      }
    }
  }

  // If parsedTotal is still 0, take the most common or maximum candidate from total/debit lines
  if (parsedTotal === 0 && candidateTotals.length > 0) {
    parsedTotal = candidateTotals[0];
  }

  // 5. Pass 2: Extract Purchased Line Items (Strictly before Subtotal/Total)
  const noiseKeywords = [
    'subtotal', 'sub total', 'sub-total', 'total', 'grand total', 'amount due', 'balance due',
    'hst', 'gst', 'pst', 'tvh', 'tax', 'tip', 'gratuity',
    'debit', 'visa', 'mastercard', 'amex', 'interac', 'cash', 'change', 'tendered',
    'approved', 'auth', 'terminal', 'merchant id', 'member', 'cashier', 'item',
    'return', 'policy', 'thank you', 'merci', 'telephone', 'phone', 'fax',
    'street', 'waterloo', 'toronto', 'ottawa', 'canada', 'ontario', 'www', 'http',
    'optimum', 'points', 'pc optimum', 'gift card', 'gift cards', 'giftcard',
    'win', 'prize', 'million', 'contest', 'certificate', 'purchase', 'chequing',
    'savings', 'card number', 'card type', 'date', 'time', 'reference', 'verified by pin',
    'reprint', 'customer copy'
  ];

  let passedItemsZone = false;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx];
    const lineLower = line.toLowerCase();
    const prices = extractAllPrices(line);
    const linePrice = prices.length > 0 ? prices[prices.length - 1] : 0;

    // The moment we hit Subtotal, HST, or Total, stop parsing items!
    if (
      lineLower.includes('subtotal') || 
      lineLower.includes('sub total') || 
      lineLower.includes('sub-total') ||
      lineLower.startsWith('total') || 
      lineLower.includes('total:') ||
      lineLower.includes('total :') ||
      lineLower.includes('hst :') ||
      lineLower.includes('gst :') ||
      lineLower.includes('debit')
    ) {
      passedItemsZone = true;
      continue;
    }

    if (passedItemsZone) continue;

    // Check if line contains any noise word
    if (noiseKeywords.some((kw) => lineLower.includes(kw))) continue;

    // Must have a valid item price
    if (linePrice && linePrice > 0 && linePrice < 1500) {
      // Clean product description from prices, Shoppers tax tags, and barcodes
      let cleanName = line
        .replace(/(?:\$\s*)?[0-9]+\.[0-9]{2}(?:\s+[A-Za-z0-9*]+)?/g, '') // remove all price occurrences
        .replace(/\b(GP|FP|GST|HST|PST|TVH|TAX|[A-Z])\b/g, '')             // remove tax codes
        .replace(/^[0-9]{6,16}\s+/, '')                                     // strip barcode
        .replace(/^[|!/\-•#\d.\s]+/, '')                                  // strip OCR noise
        .trim();

      // Quantity multiplier
      let quantity = 1;
      const qtyMatch = cleanName.match(/^([0-9]+)(?:\s*[xX*@]|\s+)\s*(.+)/);
      if (qtyMatch) {
        quantity = Math.max(1, parseInt(qtyMatch[1], 10) || 1);
        cleanName = qtyMatch[2].trim();
      }

      if (cleanName.length >= 2 && !/^[0-9]+$/.test(cleanName)) {
        if (cleanName.length > 35) cleanName = cleanName.slice(0, 35);
        items.push({
          id: `item-${idx}-${Date.now()}`,
          name: cleanName,
          price: linePrice,
          quantity,
        });
      }
    }
  }

  // 6. Mathematical Final Reconciliation
  const calculatedItemsSum = items.reduce((s, i) => s + (i.price * i.quantity), 0);

  // Reconcile Subtotal
  if (parsedSubtotal === 0) {
    parsedSubtotal = calculatedItemsSum > 0 ? Number(calculatedItemsSum.toFixed(2)) : parsedTotal;
  }

  // If Grand Total is still 0 or was set to Subtotal by mistake when candidates exist
  if (parsedTotal === 0 || (parsedTotal === parsedSubtotal && candidateTotals.length > 0)) {
    const higherCandidates = candidateTotals.filter((c) => c >= parsedSubtotal);
    if (higherCandidates.length > 0) {
      parsedTotal = higherCandidates[0];
    }
  }

  // Automatically compute tax if Total > Subtotal and Tax is 0
  if (parsedTax === 0 && parsedTotal > parsedSubtotal) {
    parsedTax = Number((parsedTotal - parsedSubtotal).toFixed(2));
  }

  // Final fallback for total
  if (parsedTotal === 0) {
    parsedTotal = Number((parsedSubtotal + parsedTax + parsedTip).toFixed(2));
  }

  // Ensure total is at least subtotal + tax
  if (parsedTotal < parsedSubtotal + parsedTax) {
    parsedTotal = Number((parsedSubtotal + parsedTax + parsedTip).toFixed(2));
  }

  // If no items, create primary entry
  if (items.length === 0) {
    items.push({
      id: `item-auto-${Date.now()}`,
      name: `${detectedMerchant} Purchase`,
      price: parsedSubtotal > 0 ? parsedSubtotal : parsedTotal,
      quantity: 1,
    });
  }

  return {
    merchant: detectedMerchant,
    date: detectedDate,
    items,
    subtotal: Number(parsedSubtotal.toFixed(2)),
    tax: Number(parsedTax.toFixed(2)),
    tip: Number(parsedTip.toFixed(2)),
    total: Number(parsedTotal.toFixed(2)),
    currency: 'CAD',
    category: detectedCategory,
    rawText: text,
  };
}
