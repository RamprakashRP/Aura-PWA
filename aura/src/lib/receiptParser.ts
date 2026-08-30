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
};

// Preset Demo Receipts for Instant Testing
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
 * Intelligent Receipt OCR Parser
 * Parses raw text from OCR / camera scan / PDF e-bill into structured line items
 */
export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let detectedMerchant = 'Scanned Receipt / Bill';
  let detectedCategory = 'Groceries';
  const detectedDate = new Date().toISOString().split('T')[0];
  const items: ReceiptItem[] = [];
  let subtotal = 0;
  let tax = 0;
  let tip = 0;
  let total = 0;

  // 1. Detect Merchant from top lines
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const lineLower = lines[i].toLowerCase();
    for (const [key, info] of Object.entries(CANADIAN_MERCHANTS)) {
      if (lineLower.includes(key)) {
        detectedMerchant = info.name;
        detectedCategory = info.category;
        break;
      }
    }
    if (detectedMerchant !== 'Scanned Receipt / Bill') break;
  }

  // If merchant still generic, use first prominent text line
  if (detectedMerchant === 'Scanned Receipt / Bill' && lines.length > 0) {
    const firstLine = lines[0].replace(/[^A-Za-z0-9\s&'.-]/g, '').trim();
    if (firstLine.length >= 3 && firstLine.length <= 35) {
      detectedMerchant = firstLine;
    }
  }

  // 2. Regex line item matcher
  const priceRegex = /(?:\$\s*)?([0-9]+\.[0-9]{2})/g;

  lines.forEach((line, idx) => {
    const lineLower = line.toLowerCase();

    // Check for Subtotal
    if (lineLower.includes('subtotal') || lineLower.includes('sub total') || lineLower.includes('amount due')) {
      const match = line.match(priceRegex);
      if (match) {
        const amt = parseFloat(match[match.length - 1].replace('$', ''));
        if (amt > 0) subtotal = amt;
      }
      return;
    }

    // Check for Tax
    if (lineLower.includes('tax') || lineLower.includes('hst') || lineLower.includes('gst') || lineLower.includes('pst')) {
      const match = line.match(priceRegex);
      if (match) {
        const amt = parseFloat(match[match.length - 1].replace('$', ''));
        if (amt > 0) tax = amt;
      }
      return;
    }

    // Check for Tip
    if (lineLower.includes('tip') || lineLower.includes('gratuity')) {
      const match = line.match(priceRegex);
      if (match) {
        const amt = parseFloat(match[match.length - 1].replace('$', ''));
        if (amt > 0) tip = amt;
      }
      return;
    }

    // Check for Total
    if (lineLower.startsWith('total') || lineLower.includes('balance') || lineLower.includes('grand total') || lineLower.includes('mastercard') || lineLower.includes('visa')) {
      const match = line.match(priceRegex);
      if (match) {
        const amt = parseFloat(match[match.length - 1].replace('$', ''));
        if (amt > 0 && amt >= total) total = amt;
      }
      return;
    }

    // Attempt to extract item line
    const match = line.match(/(.+?)\s+(?:\$\s*)?([0-9]+\.[0-9]{2})(?:\s+[A-Za-z0-9*]+)?$/);
    if (match) {
      let itemName = match[1].replace(/^[0-9]+[xX*]\s*/, '').trim();
      const itemPrice = parseFloat(match[2]);

      // Filter out meta terms
      if (!/(subtotal|total|tax|hst|gst|change|cash|visa|mastercard|debit|interac|approved|auth)/i.test(itemName) && itemPrice > 0) {
        if (itemName.length > 30) itemName = itemName.slice(0, 30);
        items.push({
          id: `item-${idx}-${Date.now()}`,
          name: itemName,
          price: itemPrice,
          quantity: 1,
        });
      }
    }
  });

  // Calculate totals if missing
  const calculatedItemsSum = items.reduce((s, i) => s + (i.price * i.quantity), 0);
  if (subtotal === 0) {
    subtotal = calculatedItemsSum > 0 ? calculatedItemsSum : 0;
  }
  if (total === 0) {
    total = subtotal + tax + tip;
  }

  return {
    merchant: detectedMerchant,
    date: detectedDate,
    items: items.length > 0 ? items : [
      { id: 'item-default-1', name: 'Scanned Purchase Item', price: total > 0 ? total : 0, quantity: 1 }
    ],
    subtotal: subtotal > 0 ? subtotal : total,
    tax: tax || 0,
    tip: tip || 0,
    total: total > 0 ? total : subtotal,
    currency: 'CAD',
    category: detectedCategory,
    rawText: text,
  };
}
