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

export const CANADIAN_MERCHANTS: Record<string, { match: RegExp; name: string; category: string }> = {
  dollarama: { match: /\bdollarama\b/i, name: 'Dollarama Canada', category: 'Shopping' },
  shoppers: { match: /\bshoppers\b|\bshoppers drug mart\b/i, name: 'Shoppers Drug Mart', category: 'Studies' },
  pharmaprix: { match: /\bpharmaprix\b/i, name: 'Pharmaprix', category: 'Studies' },
  rexall: { match: /\brexall\b/i, name: 'Rexall PharmaPlus', category: 'Studies' },
  costco: { match: /\bcostco\b/i, name: 'Costco Wholesale', category: 'Groceries' },
  loblaws: { match: /\bloblaws\b/i, name: 'Loblaws', category: 'Groceries' },
  metro: { match: /\bmetro\b/i, name: 'Metro', category: 'Groceries' },
  walmart: { match: /\bwalmart\b/i, name: 'Walmart Canada', category: 'Groceries' },
  'no frills': { match: /\bno frills\b|\bnofrills\b/i, name: 'No Frills', category: 'Groceries' },
  sobeys: { match: /\bsobeys\b/i, name: 'Sobeys', category: 'Groceries' },
  'food basics': { match: /\bfood basics\b/i, name: 'Food Basics', category: 'Groceries' },
  freshco: { match: /\bfreshco\b|\bfresh co\b/i, name: 'FreshCo', category: 'Groceries' },
  'farm boy': { match: /\bfarm boy\b/i, name: 'Farm Boy', category: 'Groceries' },
  'tim hortons': { match: /\btim hortons\b|\btimhortons\b|\btims\b/i, name: 'Tim Hortons', category: 'Food' },
  starbucks: { match: /\bstarbucks\b/i, name: 'Starbucks Coffee', category: 'Food' },
  mcdonald: { match: /\bmcdonald'?s\b/i, name: "McDonald's", category: 'Food' },
  lcbo: { match: /\blcbo\b/i, name: 'LCBO', category: 'Entertainment' },
  'beer store': { match: /\bbeer store\b/i, name: 'The Beer Store', category: 'Entertainment' },
  'uber eats': { match: /\buber eats\b/i, name: 'Uber Eats', category: 'Food' },
  doordash: { match: /\bdoordash\b/i, name: 'DoorDash', category: 'Food' },
  'best buy': { match: /\bbest buy\b/i, name: 'Best Buy Canada', category: 'Shopping' },
  ikea: { match: /\bikea\b/i, name: 'IKEA Canada', category: 'Shopping' },
  amazon: { match: /\bamazon\b/i, name: 'Amazon.ca', category: 'Shopping' },
  keg: { match: /\bkeg\b/i, name: 'The Keg Steakhouse', category: 'Food' },
  cactus: { match: /\bcactus\b/i, name: 'Cactus Club Cafe', category: 'Food' },
  subway: { match: /\bsubway\b/i, name: 'Subway', category: 'Food' },
  chipotle: { match: /\bchipotle\b/i, name: 'Chipotle Mexican Grill', category: 'Food' },
  wendy: { match: /\bwendy'?s\b/i, name: "Wendy's", category: 'Food' },
  popeyes: { match: /\bpopeyes\b/i, name: 'Popeyes', category: 'Food' },
  harveys: { match: /\bharvey'?s\b/i, name: "Harvey's", category: 'Food' },
  aw: { match: /\ba&w\b|\ba & w\b/i, name: 'A&W Canada', category: 'Food' },
  shell: { match: /\bshell\b/i, name: 'Shell Gas Station', category: 'Transport' },
  esso: { match: /\besso\b/i, name: 'Esso / Mobil', category: 'Transport' },
  petro: { match: /\bpetro-canada\b|\bpetro canada\b/i, name: 'Petro-Canada', category: 'Transport' },
};

export const SAMPLE_RECEIPTS: Record<string, ParsedReceipt> = {
  dollarama_haul: {
    merchant: 'Dollarama Canada',
    date: '2026-08-31',
    currency: 'CAD',
    category: 'Shopping',
    items: [
      { id: 'item-1', name: 'FOLDING UMBRELLA', price: 3.75, quantity: 1 },
      { id: 'item-2', name: 'BENTO BOX', price: 4.00, quantity: 1 },
      { id: 'item-3', name: 'SILKIES QUEEN PA', price: 2.00, quantity: 1 },
      { id: 'item-4', name: 'PAPER TOWELS', price: 1.50, quantity: 1 },
      { id: 'item-5', name: 'NEEDLEWORK KIT', price: 3.00, quantity: 1 },
      { id: 'item-6', name: 'ERASE BOARD', price: 3.00, quantity: 1 },
      { id: 'item-7', name: 'FOIL ROLL', price: 1.75, quantity: 1 },
      { id: 'item-8', name: 'AIR FRESHENER', price: 1.75, quantity: 1 },
      { id: 'item-9', name: 'BATH GLOVE', price: 1.25, quantity: 1 },
      { id: 'item-10', name: 'ICE STIX TRAY', price: 1.75, quantity: 1 },
      { id: 'item-11', name: 'DVD RACK', price: 2.75, quantity: 1 },
    ],
    subtotal: 26.50,
    tax: 3.45,
    tip: 0,
    total: 29.95,
  },
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
};

function extractAllPrices(str: string): number[] {
  const matches = [...str.matchAll(/(?:\$\s*)?([0-9]+\.[0-9]{2})/g)];
  return matches.map((m) => parseFloat(m[1])).filter((p) => !isNaN(p) && p > 0);
}

function cleanProductDescription(rawLine: string): string {
  let clean = rawLine
    // 1. Remove all monetary prices ($3.75, 4.00, 1.50)
    .replace(/(?:\$\s*)?[0-9]+\.[0-9]{2}(?:\s+[A-Za-z0-9*]+)?/g, '')
    // 2. Remove all 6-16 digit SKU / barcode numbers anywhere in the string (e.g. Dollarama 667888026715)
    .replace(/\b[0-9]{6,16}\b/g, '')
    // 3. Remove trailing tax tags (H, G, GP, FP, S, GST, HST)
    .replace(/\b(GP|FP|GST|HST|PST|TVH|TAX|[A-Z])\b/g, '')
    // 4. Remove leading/trailing symbols, slashes, pipes, OCR edge artifacts
    .replace(/[^A-Za-z0-9\s&'.-]/g, ' ')
    .trim();

  // 5. Clean leading wood-grain / shadow OCR fragments (e.g. "Gin NG , FOLDING UMBRELLA" -> "FOLDING UMBRELLA")
  const validWords = clean.split(/\s+/).filter((w) => w.length > 0);

  // Filter out tiny single/double letter noise at the beginning if followed by clean uppercase words
  while (
    validWords.length > 1 &&
    validWords[0].length <= 3 &&
    !/^(BOX|KIT|TRAY|RACK|ROLL|TOWELS|FOIL|BAG|ICE|TEA|EGG|MILK|BAR|OIL|CUP|PAN)$/i.test(validWords[0])
  ) {
    if (/^[a-z]{1,3}$/i.test(validWords[0]) && validWords.length > 2) {
      validWords.shift();
    } else {
      break;
    }
  }

  clean = validWords.join(' ').trim();
  clean = clean.replace(/^[-.\d\s]+/, '').trim();

  if (clean.length > 35) clean = clean.slice(0, 35).trim();
  return clean;
}

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

  const normalizedText = text
    .replace(/(\d+),(\d{2})/g, '$1.$2')
    .replace(/\$\s+/g, '$')
    .replace(/([0-9])\s*\.\s*([0-9]{2})/g, '$1.$2');

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

  for (let i = 0; i < Math.min(rawLines.length, 15); i++) {
    const line = rawLines[i];
    for (const [, info] of Object.entries(CANADIAN_MERCHANTS)) {
      if (info.match.test(line)) {
        detectedMerchant = info.name;
        detectedCategory = info.category;
        break;
      }
    }
    if (detectedMerchant !== 'Store Receipt') break;
  }

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

  const candidateTotals: number[] = [];

  for (const line of rawLines) {
    const lineLower = line.toLowerCase();
    const prices = extractAllPrices(line);
    const lastPrice = prices.length > 0 ? prices[prices.length - 1] : 0;

    if (
      lineLower.includes('total') || 
      lineLower.includes('amount due') || 
      lineLower.includes('balance') ||
      lineLower.includes('mastercard') ||
      lineLower.includes('visa') ||
      lineLower.includes('debit') ||
      lineLower.includes('chequing') ||
      lineLower.includes('cad$') ||
      lineLower.includes('cad $')
    ) {
      if (!lineLower.includes('subtotal') && !lineLower.includes('sub total') && !lineLower.includes('sub-total')) {
        if (lastPrice > 0 && lastPrice < 5000) {
          candidateTotals.push(lastPrice);
        }
      }
    }

    if (lineLower.startsWith('total') || lineLower.includes('total:') || lineLower.includes('total :') || lineLower === 'total') {
      if (lastPrice > 0) {
        parsedTotal = lastPrice;
      }
    }

    if (lineLower.includes('subtotal') || lineLower.includes('sub total') || lineLower.includes('sub-total')) {
      if (lastPrice > 0) {
        parsedSubtotal = lastPrice;
      }
    }

    if (
      lineLower.includes('hst') || 
      lineLower.includes('gst') || 
      lineLower.includes('pst') || 
      lineLower.includes('tvh') || 
      lineLower.includes('tax')
    ) {
      if (!lineLower.includes('#') && !lineLower.includes('rt000') && !lineLower.includes('reg')) {
        if (lastPrice > 0 && lastPrice < 500) {
          parsedTax = lastPrice;
        }
      }
    }

    if (lineLower.includes('tip') || lineLower.includes('gratuity')) {
      if (lastPrice > 0) {
        parsedTip = lastPrice;
      }
    }
  }

  if (parsedTotal === 0 && candidateTotals.length > 0) {
    parsedTotal = candidateTotals[0];
  }

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
    'reprint', 'customer copy', 'questions', 'comments', 'eco fees', 'crf', 'deposit',
    'no exchange', 'no return', 'we\'re hiring', 'hiring'
  ];

  let passedItemsZone = false;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx];
    const lineLower = line.toLowerCase();
    const prices = extractAllPrices(line);
    const linePrice = prices.length > 0 ? prices[prices.length - 1] : 0;

    if (
      lineLower.includes('subtotal') || 
      lineLower.includes('sub total') || 
      lineLower.includes('sub-total') ||
      lineLower.startsWith('total') || 
      lineLower.includes('total:') ||
      lineLower.includes('total :') ||
      lineLower.includes('hst :') ||
      lineLower.includes('hst 13%') ||
      lineLower.includes('gst :') ||
      lineLower.includes('mastercard') ||
      lineLower.includes('debit')
    ) {
      passedItemsZone = true;
      continue;
    }

    if (passedItemsZone) continue;

    if (noiseKeywords.some((kw) => lineLower.includes(kw))) continue;

    if (linePrice && linePrice > 0 && linePrice < 1500) {
      const cleanName = cleanProductDescription(line);

      if (cleanName.length >= 2 && !/^[0-9]+$/.test(cleanName)) {
        items.push({
          id: `item-${idx}-${Date.now()}`,
          name: cleanName,
          price: linePrice,
          quantity: 1,
        });
      }
    }
  }

  const calculatedItemsSum = items.reduce((s, i) => s + (i.price * i.quantity), 0);

  if (parsedSubtotal === 0) {
    parsedSubtotal = calculatedItemsSum > 0 ? Number(calculatedItemsSum.toFixed(2)) : parsedTotal;
  }

  if (parsedTotal === 0 || (parsedTotal === parsedSubtotal && candidateTotals.length > 0)) {
    const higherCandidates = candidateTotals.filter((c) => c >= parsedSubtotal);
    if (higherCandidates.length > 0) {
      parsedTotal = higherCandidates[0];
    }
  }

  if (parsedTax === 0 && parsedTotal > parsedSubtotal) {
    parsedTax = Number((parsedTotal - parsedSubtotal).toFixed(2));
  }

  if (parsedTotal === 0) {
    parsedTotal = Number((parsedSubtotal + parsedTax + parsedTip).toFixed(2));
  }

  if (parsedTotal < parsedSubtotal + parsedTax) {
    parsedTotal = Number((parsedSubtotal + parsedTax + parsedTip).toFixed(2));
  }

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
