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

// Common Canadian Retailers & Category Rules
export const CANADIAN_MERCHANTS: Record<string, { name: string; category: string }> = {
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
  shoppers: { name: 'Shoppers Drug Mart', category: 'Studies' },
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
 * Intelligent Real OCR Receipt Parser
 * Parses raw extracted text lines into structured line items, taxes, and totals
 */
export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let detectedMerchant = 'Scanned Store Receipt';
  let detectedCategory = 'Groceries';
  let detectedDate = new Date().toISOString().split('T')[0];
  const items: ReceiptItem[] = [];
  let subtotal = 0;
  let tax = 0;
  let tip = 0;
  let total = 0;

  // 1. Detect Merchant Name from header lines (first 10 lines)
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lineLower = lines[i].toLowerCase();
    for (const [key, info] of Object.entries(CANADIAN_MERCHANTS)) {
      if (lineLower.includes(key)) {
        detectedMerchant = info.name;
        detectedCategory = info.category;
        break;
      }
    }
    if (detectedMerchant !== 'Scanned Store Receipt') break;
  }

  // If merchant still generic, look for clean brand title in top lines
  if (detectedMerchant === 'Scanned Store Receipt') {
    for (let i = 0; i < Math.min(lines.length, 4); i++) {
      const clean = lines[i].replace(/[^A-Za-z0-9\s&'.-]/g, '').trim();
      if (
        clean.length >= 3 && 
        clean.length <= 35 && 
        !/(welcome|receipt|store|invoice|order|tel|phone|address|date|cashier|terminal|lane)/i.test(clean) &&
        !/^[0-9]+$/.test(clean)
      ) {
        detectedMerchant = clean;
        break;
      }
    }
  }

  // 2. Detect Date (e.g. 2026-08-30, 08/30/2026, 30-Aug-2026)
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

  // 3. Scan Lines for Line Items & Financial Summary
  const priceRegex = /(?:\$\s*)?([0-9]+\.[0-9]{2})/g;

  // Ignored metadata phrases
  const noisePatterns = [
    'subtotal', 'sub total', 'sub-total', 'total', 'grand total', 'amount due', 'balance due',
    'tax', 'hst', 'gst', 'pst', 'tvh', 'tps', 'tvq', 'tip', 'gratuity',
    'visa', 'mastercard', 'amex', 'debit', 'interac', 'cash', 'change', 'tendered',
    'approved', 'auth', 'terminal', 'merchant id', 'member', 'cashier', 'items sold',
    'return', 'policy', 'thank you', 'merci', 'telephone', 'phone', 'www.', '.com', '.ca'
  ];

  lines.forEach((line, idx) => {
    const lineLower = line.toLowerCase();

    // Check Subtotal
    if (lineLower.includes('subtotal') || lineLower.includes('sub total') || lineLower.includes('sub-total')) {
      const match = line.match(priceRegex);
      if (match) {
        const lastNum = parseFloat(match[match.length - 1].replace('$', ''));
        if (lastNum > 0) subtotal = lastNum;
      }
      return;
    }

    // Check Tax (HST / GST / PST / TVH)
    if (
      lineLower.includes('hst') || 
      lineLower.includes('gst') || 
      lineLower.includes('pst') || 
      lineLower.includes('tvh') || 
      lineLower.includes('tax')
    ) {
      const match = line.match(priceRegex);
      if (match) {
        const lastNum = parseFloat(match[match.length - 1].replace('$', ''));
        if (lastNum > 0 && lastNum < (total || 1000)) tax += lastNum;
      }
      return;
    }

    // Check Tip / Gratuity
    if (lineLower.includes('tip') || lineLower.includes('gratuity')) {
      const match = line.match(priceRegex);
      if (match) {
        const lastNum = parseFloat(match[match.length - 1].replace('$', ''));
        if (lastNum > 0) tip = lastNum;
      }
      return;
    }

    // Check Grand Total / Amount Due
    if (
      lineLower.startsWith('total') || 
      lineLower.includes('grand total') || 
      lineLower.includes('amount due') || 
      lineLower.includes('balance') ||
      lineLower.includes('mastercard') ||
      lineLower.includes('visa')
    ) {
      const match = line.match(priceRegex);
      if (match) {
        const lastNum = parseFloat(match[match.length - 1].replace('$', ''));
        if (lastNum > 0 && lastNum >= total) total = lastNum;
      }
      return;
    }

    // Check if line is metadata noise
    const isNoise = noisePatterns.some((np) => lineLower.includes(np));
    if (isNoise) return;

    // Line Item Matcher: Look for text followed by price at the end
    // Patterns:
    // "1  Organic Milk 2L    5.49"
    // "Kirkland Eggs 30pk   $8.49"
    // "Bananas 1.2kg         2.30 H"
    const itemMatch = line.match(/^([A-Za-z0-9\s&'.,#/-]{3,45})\s+(?:\$\s*)?([0-9]+\.[0-9]{2})(?:\s+[A-Za-z0-9*]+)?$/);
    if (itemMatch) {
      let rawName = itemMatch[1].trim();
      const rawPrice = parseFloat(itemMatch[2]);

      // Remove quantity prefix if present (e.g. "1x", "2 @")
      let quantity = 1;
      const qtyMatch = rawName.match(/^([0-9]+)(?:\s*[xX*@]|\s+)\s*(.+)/);
      if (qtyMatch) {
        quantity = Math.max(1, parseInt(qtyMatch[1], 10) || 1);
        rawName = qtyMatch[2].trim();
      }

      // Clean up item name
      rawName = rawName.replace(/^[-*•#\d.\s]+/, '').trim();

      if (rawName.length >= 2 && rawPrice > 0 && rawPrice < 5000) {
        items.push({
          id: `item-${idx}-${Date.now()}`,
          name: rawName,
          price: rawPrice,
          quantity,
        });
      }
    }
  });

  // Post-processing and fallbacks
  const calculatedItemsSum = items.reduce((s, i) => s + (i.price * i.quantity), 0);

  if (subtotal === 0) {
    subtotal = Number(calculatedItemsSum.toFixed(2));
  }

  if (total === 0) {
    total = Number((subtotal + tax + tip).toFixed(2));
  }

  // If no line items were detected (e.g., blurry photo or compact slip), create single primary item
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
