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
 * Intelligent Section-Aware Canadian Receipt Parser
 * Segments receipts into Header -> Items Zone -> Totals/Tax Zone -> Footer Noise Zone
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

  // 1. Normalize OCR Artifacts
  const normalizedText = text
    .replace(/(\d+),(\d{2})/g, '$1.$2') // Convert European/OCR comma decimals (1,75 -> 1.75)
    .replace(/\$\s+/g, '$')             // Clean space after $
    .replace(/([0-9])\s*\.\s*([0-9]{2})/g, '$1.$2'); // Fix broken decimal spaces (1 . 75 -> 1.75)

  const rawLines = normalizedText
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

  // 2. Detect Merchant from Header Lines (first 12 lines)
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
    // Matches "Aug 27, 2026" or "27-Aug-2026"
    const textMonthMatch = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})/i);
    if (textMonthMatch) {
      const m = monthMap[textMonthMatch[1].slice(0, 3).toLowerCase()];
      const d = textMonthMatch[2].padStart(2, '0');
      const y = textMonthMatch[3];
      detectedDate = `${y}-${m}-${d}`;
      break;
    }

    // Matches "2026-08-27" or "08/27/2026" or "26/08/27"
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

  // Helper to extract numeric price from string
  const getPriceFromLine = (line: string): number | null => {
    const matches = [...line.matchAll(/(?:\$\s*)?([0-9]+\.[0-9]{2})/g)];
    if (matches && matches.length > 0) {
      return parseFloat(matches[matches.length - 1][1]);
    }
    return null;
  };

  // 4. Locate Boundary Indexes
  // Items Zone starts after store address/phone and ENDS at the first Subtotal / Total / Tax line.
  // Everything AFTER Total is discarded as footer noise (Debit Card, PC Optimum, Survey promo, Interac slip).
  let inItemsZone = false;
  let hitTotalZone = false;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx];
    const lineLower = line.toLowerCase();
    const linePrice = getPriceFromLine(line);

    // Identify TOTAL Line
    if (
      lineLower.startsWith('total') || 
      lineLower.includes('total:') || 
      lineLower.includes('grand total') || 
      lineLower.includes('balance due')
    ) {
      if (linePrice && linePrice > 0) {
        total = linePrice;
      }
      hitTotalZone = true;
      inItemsZone = false;
      continue;
    }

    // Identify SUBTOTAL Line
    if (lineLower.includes('subtotal') || lineLower.includes('sub total') || lineLower.includes('sub-total')) {
      if (linePrice && linePrice > 0) {
        subtotal = linePrice;
      }
      inItemsZone = false;
      continue;
    }

    // Identify TAX Line (HST, GST, PST, TVH)
    if (
      lineLower.startsWith('hst') || 
      lineLower.startsWith('gst') || 
      lineLower.startsWith('pst') || 
      lineLower.includes('hst :') ||
      lineLower.includes('gst :') ||
      lineLower.includes('tax :') ||
      lineLower.includes('tax ')
    ) {
      if (linePrice && linePrice > 0 && linePrice < (total || 500)) {
        tax = linePrice;
      }
      inItemsZone = false;
      continue;
    }

    // Identify TIP Line
    if (lineLower.includes('tip') || lineLower.includes('gratuity')) {
      if (linePrice && linePrice > 0) {
        tip = linePrice;
      }
      continue;
    }

    // If we have already passed the Total line, IGNORE everything (Debit slip, PC Optimum, survey WIN $1,000, Interac)
    if (hitTotalZone) {
      // Secondary check: If card payment line has a total and we missed it
      if ((lineLower.includes('debit') || lineLower.includes('visa') || lineLower.includes('mastercard')) && total === 0 && linePrice) {
        total = linePrice;
      }
      continue;
    }

    // Check if we entered items zone (first line with a price that is not address/phone)
    if (!inItemsZone && linePrice && linePrice > 0 && linePrice < 2000) {
      // Avoid phone numbers like 519-886-6130
      if (!/(tel|phone|fax|street|ave|road|blvd|hwy|suite|d{3}-d{3})/i.test(line)) {
        inItemsZone = true;
      }
    }

    // Extract Line Items (ONLY before hitting Total/Subtotal)
    if (inItemsZone && linePrice && linePrice > 0 && linePrice < 2000) {
      // Filter out meta lines
      if (/(cashier|lane|term|auth|order|member|discount|item)/i.test(lineLower)) continue;

      // Clean line from prices and tax codes
      // In Shoppers: "NESTLE AERO CH 1.75 GP 1.75 S" -> extract name "NESTLE AERO CH" and price 1.75
      let cleanName = line
        .replace(/(?:\$\s*)?[0-9]+\.[0-9]{2}(?:\s+[A-Za-z0-9*]+)?/g, '') // remove all price occurrences
        .replace(/\b(GP|FP|GST|HST|PST|TVH|TAX|[A-Z])\b/g, '')             // remove tax codes
        .replace(/^[0-9]{6,16}\s+/, '')                                     // strip UPC barcode
        .trim();

      // Quantity Multiplier (e.g. "2x", "1 @")
      let quantity = 1;
      const qtyMatch = cleanName.match(/^([0-9]+)(?:\s*[xX*@]|\s+)\s*(.+)/);
      if (qtyMatch) {
        quantity = Math.max(1, parseInt(qtyMatch[1], 10) || 1);
        cleanName = qtyMatch[2].trim();
      }

      cleanName = cleanName.replace(/^[-*•#\d.\s]+/, '').trim();

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

  // 5. Final Reconciliation & Calculations
  const calculatedSum = items.reduce((s, i) => s + (i.price * i.quantity), 0);

  if (subtotal === 0) {
    subtotal = calculatedSum > 0 ? Number(calculatedSum.toFixed(2)) : total;
  }

  if (total === 0) {
    total = Number((subtotal + tax + tip).toFixed(2));
  }

  // If items is empty (e.g. single compact total slip)
  if (items.length === 0) {
    items.push({
      id: `item-auto-${Date.now()}`,
      name: `${detectedMerchant} Purchase`,
      price: subtotal > 0 ? subtotal : total,
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
