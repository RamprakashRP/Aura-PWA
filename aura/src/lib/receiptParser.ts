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
    date: new Date().toISOString().split('T')[0],
    currency: 'CAD',
    category: 'Studies',
    items: [
      { id: 'item-1', name: 'Tylenol Extra Strength 100s', price: 12.99, quantity: 1 },
      { id: 'item-2', name: 'Colgate Total Toothpaste 120ml', price: 4.49, quantity: 1 },
      { id: 'item-3', name: 'Kleenex Ultra Soft 6pk', price: 8.99, quantity: 1 },
      { id: 'item-4', name: 'Life Brand Hand Sanitizer', price: 3.49, quantity: 1 },
    ],
    subtotal: 29.96,
    tax: 3.89,
    tip: 0,
    total: 33.85,
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
 * Super-Resilient Canadian & Universal Receipt Parser
 * Handles Shoppers Drug Mart, Walmart, Costco, Loblaws, etc.
 * Cleans UPC numbers, tax codes, Optimum points, and messy OCR text
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

  // Normalize OCR artifacts (e.g. "12,99" -> "12.99", "$ 12.99" -> "$12.99", "O" instead of "0")
  const normalizedText = text
    .replace(/(\d+),(\d{2})/g, '$1.$2')
    .replace(/\$\s+/g, '$');

  const lines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let detectedMerchant = 'Store Receipt';
  let detectedCategory = 'Groceries';
  let detectedDate = new Date().toISOString().split('T')[0];
  const items: ReceiptItem[] = [];
  let subtotal = 0;
  let tax = 0;
  let tip = 0;
  let total = 0;

  // 1. Detect Canadian Merchant Name (Checking first 15 lines)
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const lineLower = lines[i].toLowerCase();
    for (const [key, info] of Object.entries(CANADIAN_MERCHANTS)) {
      if (lineLower.includes(key)) {
        detectedMerchant = info.name;
        detectedCategory = info.category;
        break;
      }
    }
    if (detectedMerchant !== 'Store Receipt') break;
  }

  // If still generic, look for clean header line
  if (detectedMerchant === 'Store Receipt') {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const clean = lines[i].replace(/[^A-Za-z0-9\s&'.-]/g, '').trim();
      if (
        clean.length >= 3 && 
        clean.length <= 35 && 
        !/(welcome|receipt|store|invoice|order|tel|phone|address|date|cashier|terminal|lane|gst|hst)/i.test(clean) &&
        !/^[0-9]+$/.test(clean)
      ) {
        detectedMerchant = clean;
        break;
      }
    }
  }

  // 2. Detect Date
  for (const line of lines) {
    const dateMatch = line.match(/(?:\b)(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})(?:\b)/);
    if (dateMatch) {
      try {
        const d = new Date(dateMatch[1]);
        if (!isNaN(d.getTime())) {
          detectedDate = d.toISOString().split('T')[0];
          break;
        }
      } catch (e) {}
    }
  }

  // 3. Scan Lines for Line Items & Financial Summaries

  // Lines to ignore
  const noisePatterns = [
    'subtotal', 'sub total', 'sub-total', 'total', 'grand total', 'amount due', 'balance due',
    'tax', 'hst', 'gst', 'pst', 'tvh', 'tps', 'tvq', 'tip', 'gratuity',
    'visa', 'mastercard', 'amex', 'debit', 'interac', 'cash', 'change', 'tendered',
    'approved', 'auth', 'terminal', 'merchant id', 'member', 'cashier', 'items sold',
    'return', 'policy', 'thank you', 'merci', 'telephone', 'phone', 'www.', '.com', '.ca',
    'optimum', 'points', 'pc optimum', 'bonus points', 'points earned', 'closing balance',
    'reprint', 'duplicate', 'customer copy', 'trans #', 'store #'
  ];

  // Helper to extract last valid monetary amount from line
  const extractPriceFromLine = (line: string): number | null => {
    const matches = [...line.matchAll(/(?:\$\s*)?([0-9]+\.[0-9]{2})/g)];
    if (matches && matches.length > 0) {
      return parseFloat(matches[matches.length - 1][1]);
    }
    return null;
  };

  lines.forEach((line, idx) => {
    const lineLower = line.toLowerCase();
    const linePrice = extractPriceFromLine(line);

    // 1. Check Subtotal
    if (lineLower.includes('subtotal') || lineLower.includes('sub total') || lineLower.includes('sub-total')) {
      if (linePrice && linePrice > 0) subtotal = linePrice;
      return;
    }

    // 2. Check Tax (HST / GST / PST / TVH)
    if (
      lineLower.includes('hst') || 
      lineLower.includes('gst') || 
      lineLower.includes('pst') || 
      lineLower.includes('tvh') || 
      lineLower.includes('tax')
    ) {
      if (linePrice && linePrice > 0 && linePrice < (total || 1000)) {
        tax += linePrice;
      }
      return;
    }

    // 3. Check Tip
    if (lineLower.includes('tip') || lineLower.includes('gratuity')) {
      if (linePrice && linePrice > 0) tip = linePrice;
      return;
    }

    // 4. Check Grand Total / Amount Due / Card Payment
    if (
      lineLower.startsWith('total') || 
      lineLower.includes('grand total') || 
      lineLower.includes('amount due') || 
      lineLower.includes('balance due') ||
      lineLower.includes('mastercard') ||
      lineLower.includes('visa') ||
      lineLower.includes('interac') ||
      lineLower.includes('approved')
    ) {
      if (linePrice && linePrice > 0) {
        if (linePrice > total) total = linePrice;
      }
      return;
    }

    // Check if line is generic receipt noise
    const isNoise = noisePatterns.some((np) => lineLower.includes(np));
    if (isNoise) return;

    // 5. Line Item Extraction (Handling Shoppers Drug Mart UPC codes, e.g. "05700000000 TYLENOL 12.99 G")
    if (linePrice && linePrice > 0 && linePrice < 2000) {
      // Remove the price and trailing tax code (e.g. "$12.99 G", "12.99 H", "12.99")
      let cleanName = line.replace(/(?:\$\s*)?[0-9]+\.[0-9]{2}(?:\s+[A-Za-z0-9*]+)?$/, '').trim();

      // Strip leading UPC barcode numbers (e.g. "05700012345 ", "0682000... ")
      cleanName = cleanName.replace(/^[0-9]{6,16}\s+/, '').trim();

      // Strip quantity multipliers (e.g. "2x ", "1 @ ")
      let quantity = 1;
      const qtyMatch = cleanName.match(/^([0-9]+)(?:\s*[xX*@]|\s+)\s*(.+)/);
      if (qtyMatch) {
        quantity = Math.max(1, parseInt(qtyMatch[1], 10) || 1);
        cleanName = qtyMatch[2].trim();
      }

      // Strip leading punctuation
      cleanName = cleanName.replace(/^[-*•#\d.\s]+/, '').trim();

      if (cleanName.length >= 2 && !/^[0-9]+$/.test(cleanName)) {
        if (cleanName.length > 40) cleanName = cleanName.slice(0, 40);
        items.push({
          id: `item-${idx}-${Date.now()}`,
          name: cleanName,
          price: linePrice,
          quantity,
        });
      }
    }
  });

  // Calculate totals and reconcile
  const calculatedItemsSum = items.reduce((s, i) => s + (i.price * i.quantity), 0);

  if (subtotal === 0) {
    subtotal = Number(calculatedItemsSum.toFixed(2));
  }

  if (total === 0) {
    total = Number((subtotal + tax + tip).toFixed(2));
  }

  // Fallback: If no line items extracted, search for any prominent dollar amount in entire text
  if (total === 0 && subtotal === 0) {
    const allPrices = [...normalizedText.matchAll(/(?:\$\s*)?([0-9]+\.[0-9]{2})/g)]
      .map(m => parseFloat(m[1]))
      .filter(p => p > 0 && p < 5000);

    if (allPrices.length > 0) {
      total = Math.max(...allPrices);
      subtotal = total;
    }
  }

  if (items.length === 0) {
    items.push({
      id: `item-auto-${Date.now()}`,
      name: `${detectedMerchant} Purchase`,
      price: total > 0 ? total : subtotal > 0 ? subtotal : 0,
      quantity: 1,
    });
  }

  return {
    merchant: detectedMerchant,
    date: detectedDate,
    items,
    subtotal: subtotal > 0 ? subtotal : total,
    tax: Number(tax.toFixed(2)),
    tip: Number(tip.toFixed(2)),
    total: total > 0 ? total : subtotal,
    currency: 'CAD',
    category: detectedCategory,
    rawText: text,
  };
}
