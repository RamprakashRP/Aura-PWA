import React, { useState } from 'react';
import { 
  Zap, 
  Mail, 
  Smartphone, 
  CheckCircle, 
  Sparkles, 
  Plus
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ParsedPayment {
  amount: number;
  merchant: string;
  category: string;
  paymentMethod: string;
  date: string;
  sourceText: string;
  confidence: number;
}

interface CanadianExpenseIngestionProps {
  onAddTransaction: (tx: {
    description: string;
    amount: number;
    category: string;
    date: string;
    payment_method: string;
  }) => Promise<void>;
}

export function CanadianExpenseIngestion({ onAddTransaction }: CanadianExpenseIngestionProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [activeTab, setActiveTab] = useState<'tap' | 'email' | 'statement'>('tap');
  const [emailText, setEmailText] = useState('');
  const [parsedPayment, setParsedPayment] = useState<ParsedPayment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Quick-Tap Form State
  const [quickAmount, setQuickAmount] = useState('');
  const [quickMerchant, setQuickMerchant] = useState('');
  const [quickCategory] = useState('Food');
  const [quickWallet, setQuickWallet] = useState('Apple Pay (RBC Visa)');

  // Preset Fast Taps for Canada
  const CANADIAN_PRESETS = [
    { name: 'Tim Hortons', amount: 2.85, category: 'Food', icon: '☕' },
    { name: 'Costco Wholesale', amount: 115.00, category: 'Groceries', icon: '🛒' },
    { name: 'Loblaws / Metro', amount: 54.20, category: 'Groceries', icon: '🥦' },
    { name: 'TTC / Presto Transit', amount: 3.35, category: 'Transport', icon: '🚇' },
    { name: 'Shoppers Drug Mart', amount: 22.40, category: 'Studies', icon: '💊' },
    { name: 'Uber / Lyft', amount: 18.50, category: 'Transport', icon: '🚗' },
    { name: 'LCBO / Beer Store', amount: 28.00, category: 'Entertainment', icon: '🍻' },
    { name: 'Amazon.ca', amount: 35.00, category: 'Shopping', icon: '📦' },
  ];

  // Regex Engine for Canadian Bank Transaction Emails & Interac e-Transfers
  const parseCanadianEmail = (text: string) => {
    if (!text || text.trim().length < 5) {
      setParsedPayment(null);
      return;
    }

    let detectedAmount = 0;
    let detectedMerchant = 'Unknown Merchant';
    let detectedCategory = 'Miscellaneous';
    let detectedWallet = 'Card / Bank Alert';

    // 1. Check Amount patterns: "$45.00", "CAD 45.00", "45.00 CAD"
    const amountMatch = text.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)/i) ||
                        text.match(/(?:CAD|INR)\s*([0-9]+(?:\.[0-9]{2})?)/i) ||
                        text.match(/([0-9]+(?:\.[0-9]{2})?)\s*(?:CAD|dollars)/i);
    if (amountMatch) {
      detectedAmount = parseFloat(amountMatch[1]);
    }

    // 2. Check Interac e-Transfer
    if (/interac/i.test(text) || /e-transfer/i.test(text)) {
      detectedWallet = 'Interac e-Transfer';
      const toMatch = text.match(/(?:sent to|received from|to:?)\s+([A-Za-z0-9\s]{2,30})/i);
      if (toMatch) {
        detectedMerchant = 'e-Transfer: ' + toMatch[1].trim();
      } else {
        detectedMerchant = 'Interac e-Transfer';
      }
      detectedCategory = 'Miscellaneous';
    } 
    // 3. Check Card Swipes / Merchant alerts
    else {
      const atMatch = text.match(/(?:at|from|to|spent at)\s+([A-Za-z0-9\s&'.-]{2,35})(?:\s+on|\s+for|\s+with|\.|\n)/i);
      if (atMatch) {
        detectedMerchant = atMatch[1].trim();
      }
    }

    // Categorization logic
    const lowerM = detectedMerchant.toLowerCase() + ' ' + text.toLowerCase();
    if (/tim hortons|starbucks|mcdonald|restaurant|subway|chipotle|cafe|coffee|dining|food/i.test(lowerM)) {
      detectedCategory = 'Food';
    } else if (/costco|loblaws|metro|walmart|sobeys|no frills|grocery|superstore|freshco/i.test(lowerM)) {
      detectedCategory = 'Groceries';
    } else if (/ttc|presto|uber|lyft|gas|esso|petro|shell|transit|flight/i.test(lowerM)) {
      detectedCategory = 'Transport';
    } else if (/amazon|shoppers|winners|best buy|apple|mall|clothing|h&m/i.test(lowerM)) {
      detectedCategory = 'Shopping';
    } else if (/netflix|spotify|cinema|cineplex|lcbo|pub|bar/i.test(lowerM)) {
      detectedCategory = 'Entertainment';
    }

    setParsedPayment({
      amount: detectedAmount,
      merchant: detectedMerchant,
      category: detectedCategory,
      paymentMethod: detectedWallet,
      date: new Date().toISOString().split('T')[0],
      sourceText: text,
      confidence: detectedAmount > 0 ? 0.95 : 0.4,
    });
  };

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEmailText(val);
    parseCanadianEmail(val);
  };

  const handleConfirmParsed = async () => {
    if (!parsedPayment || parsedPayment.amount <= 0) return;
    setIsProcessing(true);
    try {
      await onAddTransaction({
        description: parsedPayment.merchant,
        amount: parsedPayment.amount,
        category: parsedPayment.category,
        date: parsedPayment.date,
        payment_method: parsedPayment.paymentMethod,
      });
      setSuccessToast(true);
      setEmailText('');
      setParsedPayment(null);
      setTimeout(() => setSuccessToast(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickTapSubmit = async (preset?: { name: string; amount: number; category: string }) => {
    const desc = preset ? preset.name : quickMerchant || 'Quick Tap Purchase';
    const amt = preset ? preset.amount : parseFloat(quickAmount) || 0;
    const cat = preset ? preset.category : quickCategory;

    if (amt <= 0) return;
    setIsProcessing(true);
    try {
      await onAddTransaction({
        description: desc,
        amount: amt,
        category: cat,
        date: new Date().toISOString().split('T')[0],
        payment_method: quickWallet,
      });
      setSuccessToast(true);
      setQuickAmount('');
      setQuickMerchant('');
      setTimeout(() => setSuccessToast(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #e1143d)` }}
          >
            <Zap size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Instant Canadian Expense Ingestion
            </h2>
            <p className="text-xs text-slate-400">
              Zero SMS required. Tap-to-Log, Apple Pay, Google Wallet & Email Scanner
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('tap')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'tap' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={13} />
            <span>3-Sec Quick Tap</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'email' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail size={13} />
            <span>Email / e-Transfer</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle size={16} />
          <span className="font-bold">Transaction logged to your Ledger successfully!</span>
        </div>
      )}

      {/* TAB 1: 3-SECOND QUICK TAP WIDGET */}
      {activeTab === 'tap' && (
        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              1-Tap Canadian Quick Presets
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CANADIAN_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleQuickTapSubmit(p)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-600 transition-all text-left group flex items-center justify-between cursor-pointer"
                >
                  <div className="truncate">
                    <div className="text-xs font-bold text-white group-hover:text-rose-400 flex items-center gap-1">
                      <span>{p.icon}</span>
                      <span className="truncate">{p.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">${p.amount.toFixed(2)} CAD</span>
                  </div>
                  <Plus size={14} className="text-slate-500 group-hover:text-white" />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Fast Logger */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span>Custom Tap-to-Log</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Amount ($ CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Merchant / Store</label>
                <input
                  type="text"
                  value={quickMerchant}
                  onChange={(e) => setQuickMerchant(e.target.value)}
                  placeholder="e.g. Dollarama, Petro-Canada"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Wallet / Card</label>
                <select
                  value={quickWallet}
                  onChange={(e) => setQuickWallet(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                >
                  <option>Apple Pay (RBC Visa)</option>
                  <option>Apple Pay (TD Chequing)</option>
                  <option>Google Wallet (Tangerine MC)</option>
                  <option>Scotia Debit</option>
                  <option>Wealthsimple Cash (1% Cashback)</option>
                  <option>Interac e-Transfer</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleQuickTapSubmit()}
              disabled={!quickAmount || parseFloat(quickAmount) <= 0 || isProcessing}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-lg cursor-pointer hover:scale-[1.01] transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
            >
              {isProcessing ? 'Logging...' : '⚡ Log Tap Expense'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL / INTERAC E-TRANSFER SCANNER */}
      {activeTab === 'email' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Paste Interac e-Transfer, Card Alert, or Bank Notification Email
            </label>
            <textarea
              rows={3}
              value={emailText}
              onChange={handleEmailInputChange}
              placeholder="e.g. 'You sent an INTERAC e-Transfer of $45.00 to landlord@domain.com...' or 'RBC Alert: $32.40 spent at Tim Hortons with Apple Pay on Nov 12...'"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-mono"
            />
          </div>

          {parsedPayment && parsedPayment.amount > 0 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>AI / Regex Extracted Details:</span>
                </span>
                <span className="text-[10px] bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 text-cyan-300">
                  98% Confidence
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Amount</span>
                  <span className="text-base font-black text-white font-mono">${parsedPayment.amount.toFixed(2)} CAD</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Merchant / Target</span>
                  <span className="font-bold text-white truncate block">{parsedPayment.merchant}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Category</span>
                  <span className="font-bold text-rose-400 block">{parsedPayment.category}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Method</span>
                  <span className="font-bold text-slate-300 truncate block">{parsedPayment.paymentMethod}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmParsed}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-lg cursor-pointer hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
              >
                <CheckCircle size={15} />
                <span>Confirm & Add to Ledger</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
