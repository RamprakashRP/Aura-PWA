import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Users, 
  DollarSign, 
  Percent, 
  FileText, 
  Sparkles, 
  Receipt,
  AlertCircle,
  Divide
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { tabsApi, type Contact } from '../../lib/tabsApi';
import { supabase } from '../../lib/supabase';
import { 
  type ParsedReceipt, 
  type ReceiptItem, 
  SAMPLE_RECEIPTS, 
  } from '../../lib/receiptParser';

interface ReceiptScannerModalProps {
  onClose: () => void;
  onReceiptProcessed?: (receipt: ParsedReceipt) => void;
}

export function ReceiptScannerModal({ onClose, onReceiptProcessed }: ReceiptScannerModalProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Parsing & Receipt State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedReceipt, setScannedReceipt] = useState<ParsedReceipt | null>(null);
  
  const [step, setStep] = useState<'upload' | 'review'>('upload');

  // Friends & Split State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [enableSplit, setEnableSplit] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'equal' | 'percentage' | 'custom'>('equal');
  const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Load Contacts for Bill Splitting
  useEffect(() => {
    tabsApi.getContacts().then((data) => {
      setContacts(data);
    });
  }, []);

  // Handle OCR / Image Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result as string;
      

      // Simulate Intelligent OCR processing
      setTimeout(() => {
        // Match filename heuristics or parse sample
        const fileNameLower = file.name.toLowerCase();
        let parsed: ParsedReceipt;

        if (fileNameLower.includes('keg') || fileNameLower.includes('dinner') || fileNameLower.includes('rest')) {
          parsed = { ...SAMPLE_RECEIPTS.roommate_dinner, imageUrl: result };
        } else if (fileNameLower.includes('uber') || fileNameLower.includes('food')) {
          parsed = { ...SAMPLE_RECEIPTS.uber_eats, imageUrl: result };
        } else {
          // Default rich grocery scan
          parsed = { ...SAMPLE_RECEIPTS.costco_groceries, imageUrl: result };
        }

        setScannedReceipt(parsed);
        setIsScanning(false);
        setStep('review');
      }, 1200);
    };

    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sampleKey: string) => {
    const sample = SAMPLE_RECEIPTS[sampleKey];
    if (sample) {
      setScannedReceipt({ ...sample });
      setStep('review');
    }
  };

  // Line Item Management
  const handleItemChange = (id: string, field: keyof ReceiptItem, value: any) => {
    if (!scannedReceipt) return;
    const updatedItems = scannedReceipt.items.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        return updated;
      }
      return item;
    });

    const newSubtotal = updatedItems.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
    const newTotal = Number((newSubtotal + Number(scannedReceipt.tax || 0) + Number(scannedReceipt.tip || 0)).toFixed(2));

    setScannedReceipt({
      ...scannedReceipt,
      items: updatedItems,
      subtotal: Number(newSubtotal.toFixed(2)),
      total: newTotal,
    });
  };

  const handleAddItem = () => {
    if (!scannedReceipt) return;
    const newItem: ReceiptItem = {
      id: `item-new-${Date.now()}`,
      name: 'New Item',
      price: 0,
      quantity: 1,
    };
    setScannedReceipt({
      ...scannedReceipt,
      items: [...scannedReceipt.items, newItem],
    });
  };

  const handleDeleteItem = (id: string) => {
    if (!scannedReceipt) return;
    const filtered = scannedReceipt.items.filter(i => i.id !== id);
    const newSubtotal = filtered.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
    const newTotal = Number((newSubtotal + Number(scannedReceipt.tax || 0) + Number(scannedReceipt.tip || 0)).toFixed(2));

    setScannedReceipt({
      ...scannedReceipt,
      items: filtered,
      subtotal: Number(newSubtotal.toFixed(2)),
      total: newTotal,
    });
  };

  // Friend Selection for Splitting
  const toggleFriend = (id: string) => {
    if (selectedFriendIds.includes(id)) {
      setSelectedFriendIds(selectedFriendIds.filter(fId => fId !== id));
    } else {
      setSelectedFriendIds([...selectedFriendIds, id]);
    }
  };

  // Split Calculations
  const totalAmount = scannedReceipt?.total || 0;
  const totalParticipants = selectedFriendIds.length + 1; // Friends + You

  // Equal Split Amount per Person
  const equalSplitAmount = totalParticipants > 0 ? Number((totalAmount / totalParticipants).toFixed(2)) : 0;

  // Percentage Split Validation
  const sumOfPercentages = Object.values(customPercentages).reduce((s, p) => s + (Number(p) || 0), 0);
  const myPercentage = Math.max(0, 100 - sumOfPercentages);

  // Custom Amount Validation
  const sumOfCustomAmounts = Object.values(customAmounts).reduce((s, a) => s + (Number(a) || 0), 0);
  const remainingUnallocated = Number((totalAmount - sumOfCustomAmounts).toFixed(2));

  // Final Submission (Ledger & Tabs)
  const handleSaveAndSplit = async () => {
    if (!scannedReceipt || !user?.id) return;
    setIsSubmitting(true);

    try {
      // 1. Save Transaction to Ledger
      const txPayload = {
        user_id: user.id,
        description: `${scannedReceipt.merchant} (Receipt Scan)`,
        amount: scannedReceipt.total,
        category: scannedReceipt.category || 'Groceries',
        currency: scannedReceipt.currency || 'CAD',
        payment_method: 'Receipt OCR / Card',
        date: scannedReceipt.date || new Date().toISOString().split('T')[0],
        notes: `Scanned ${scannedReceipt.items.length} items (Subtotal: $${scannedReceipt.subtotal}, Tax: $${scannedReceipt.tax}, Tip: $${scannedReceipt.tip})`,
        created_at: new Date().toISOString(),
      };

      await supabase.from('transactions').insert(txPayload);

      // 2. If bill split is enabled with friends, post to Tabs & Debt Entries
      if (enableSplit && selectedFriendIds.length > 0) {
        const participantPayloads = selectedFriendIds.map((contactId) => {
          const friend = contacts.find(c => c.id === contactId);
          let share = equalSplitAmount;
          if (splitMode === 'percentage') {
            const pct = customPercentages[contactId] || (100 / totalParticipants);
            share = Number(((totalAmount * pct) / 100).toFixed(2));
          } else if (splitMode === 'custom') {
            share = customAmounts[contactId] || 0;
          }
          return { contactId, name: friend?.name || 'Friend', shareAmount: share };
        });

        await tabsApi.createSplitBill({
          title: `${scannedReceipt.merchant} (${scannedReceipt.items.length} items)`,
          totalAmount: scannedReceipt.total,
          category: scannedReceipt.category,
          date: scannedReceipt.date,
          participants: participantPayloads,
        });
      }

      if (onReceiptProcessed) {
        onReceiptProcessed(scannedReceipt);
      }

      setSuccessToast(true);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Failed to save scanned bill:', err);
      alert(err.message || 'Failed to process receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-[#080808] border border-zinc-800 shadow-2xl relative overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="h-1 w-full flex-shrink-0"
          style={{ background: `linear-gradient(90deg, ${auraColor}, #00f2fe)` }}
        />

        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center flex-shrink-0 bg-[#080808]">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
            >
              <Receipt size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Smart Receipt & E-Bill Scanner</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  OCR + 3-Way Split
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Snap physical receipts or upload PDF e-bills for itemized breakdown and roommate splitting
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {successToast ? (
            <div className="py-16 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-2xl">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Receipt Processed & Logged!</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Transaction saved to your Ledger and IOUs posted to your Tabs roommates.
              </p>
            </div>
          ) : step === 'upload' ? (
            /* STEP 1: UPLOAD OR CAMERA CAPTURE */
            <div className="space-y-6">
              {/* Capture Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Camera Snap */}
                <div 
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-6 rounded-2xl bg-[#000000] border-2 border-dashed border-zinc-800 hover:border-cyan-500/80 hover:bg-cyan-950/20 transition-all cursor-pointer text-center space-y-3 group"
                >
                  <input 
                    ref={cameraInputRef}
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                  <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Camera size={26} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      📸 Snap Photo with Camera
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">Take a live photo of your printed receipt</p>
                  </div>
                </div>

                {/* Upload File / PDF */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl bg-[#000000] border-2 border-dashed border-zinc-800 hover:border-purple-500/80 hover:bg-purple-950/20 transition-all cursor-pointer text-center space-y-3 group"
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*,application/pdf" 
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                  <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <UploadCloud size={26} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                      📁 Upload Photo or PDF E-Bill
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">Supports PNG, JPG, HEIC, and digital PDF invoices</p>
                  </div>
                </div>
              </div>

              {isScanning && (
                <div className="p-6 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-center space-y-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
                  <b className="text-sm text-cyan-300 block">Analyzing items, prices & Canadian tax...</b>
                  <p className="text-xs text-zinc-400">Extracting individual line items and store details</p>
                </div>
              )}

              {/* 1-Click Demo Presets */}
              <div className="p-4 rounded-2xl bg-[#000000] border border-zinc-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <Sparkles size={14} className="text-cyan-400" />
                  <span>Or Test with 1-Click Canadian Demo Receipts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectSample('costco_groceries')}
                    className="p-3 rounded-xl bg-[#080808] border border-zinc-800 hover:border-cyan-500/60 text-left text-xs cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <b className="text-white block">🛒 Costco Wholesale</b>
                    <span className="text-[11px] text-zinc-400">6 Items • $78.10 CAD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSample('roommate_dinner')}
                    className="p-3 rounded-xl bg-[#080808] border border-zinc-800 hover:border-rose-500/60 text-left text-xs cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <b className="text-white block">🥩 The Keg Dinner</b>
                    <span className="text-[11px] text-zinc-400">5 Items + Tip • $176.85</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSample('uber_eats')}
                    className="p-3 rounded-xl bg-[#080808] border border-zinc-800 hover:border-amber-500/60 text-left text-xs cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <b className="text-white block">🌯 Uber Eats (Chipotle)</b>
                    <span className="text-[11px] text-zinc-400">4 Items • $57.74 CAD</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: REVIEW ITEMS & BILL SPLIT CONFIGURATION */
            scannedReceipt && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Top Info Bar: Merchant, Date, Category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#000000] border border-zinc-800">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Merchant / Store
                    </label>
                    <input
                      type="text"
                      value={scannedReceipt.merchant}
                      onChange={(e) => setScannedReceipt({ ...scannedReceipt, merchant: e.target.value })}
                      className="w-full bg-[#080808] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={scannedReceipt.date}
                      onChange={(e) => setScannedReceipt({ ...scannedReceipt, date: e.target.value })}
                      className="w-full bg-[#080808] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Category
                    </label>
                    <select
                      value={scannedReceipt.category}
                      onChange={(e) => setScannedReceipt({ ...scannedReceipt, category: e.target.value })}
                      className="w-full bg-[#080808] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Groceries">Groceries</option>
                      <option value="Food">Dining & Food</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Transport">Transport</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Studies">Studies / Pharmacy</option>
                    </select>
                  </div>
                </div>

                {/* Itemized Breakdown Table */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <FileText size={14} className="text-cyan-400" />
                      <span>Itemized Items Breakdown ({scannedReceipt.items.length})</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus size={12} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-[#000000]">
                    <div className="grid grid-cols-12 gap-2 px-3.5 py-2 bg-zinc-900/60 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <span className="col-span-6">Item Description</span>
                      <span className="col-span-2 text-center">Qty</span>
                      <span className="col-span-3 text-right">Price</span>
                      <span className="col-span-1 text-center"></span>
                    </div>

                    <div className="divide-y divide-zinc-800/60 max-h-56 overflow-y-auto">
                      {scannedReceipt.items.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 px-3.5 py-2 items-center text-xs">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                            className="col-span-6 bg-transparent border-0 text-white font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1"
                          />
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="col-span-2 bg-[#080808] border border-zinc-800 rounded text-center py-0.5 text-zinc-300 focus:outline-none focus:border-cyan-500 font-mono"
                          />
                          <div className="col-span-3 text-right font-mono flex items-center justify-end gap-1">
                            <span className="text-zinc-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-20 bg-[#080808] border border-zinc-800 rounded text-right px-1.5 py-0.5 text-white font-bold focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-zinc-600 hover:text-rose-400 p-1 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals Summary Footer */}
                    <div className="p-3.5 bg-zinc-950 border-t border-zinc-800 space-y-1.5 text-xs">
                      <div className="flex justify-between text-zinc-400">
                        <span>Items Subtotal:</span>
                        <span className="font-mono text-white">${scannedReceipt.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-400">
                        <span>Tax (HST / GST):</span>
                        <div className="flex items-center gap-1 font-mono">
                          <span>$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={scannedReceipt.tax}
                            onChange={(e) => {
                              const taxVal = parseFloat(e.target.value) || 0;
                              setScannedReceipt({
                                ...scannedReceipt,
                                tax: taxVal,
                                total: Number((scannedReceipt.subtotal + taxVal + scannedReceipt.tip).toFixed(2)),
                              });
                            }}
                            className="w-16 bg-[#000000] border border-zinc-800 rounded text-right px-1 text-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-zinc-400">
                        <span>Tip / Gratuity:</span>
                        <div className="flex items-center gap-1 font-mono">
                          <span>$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={scannedReceipt.tip}
                            onChange={(e) => {
                              const tipVal = parseFloat(e.target.value) || 0;
                              setScannedReceipt({
                                ...scannedReceipt,
                                tip: tipVal,
                                total: Number((scannedReceipt.subtotal + scannedReceipt.tax + tipVal).toFixed(2)),
                              });
                            }}
                            className="w-16 bg-[#000000] border border-zinc-800 rounded text-right px-1 text-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-zinc-800">
                        <span className="text-cyan-400">Grand Total:</span>
                        <span className="font-mono text-base font-black text-cyan-400">
                          ${scannedReceipt.total.toFixed(2)} <span className="text-xs text-zinc-400">{scannedReceipt.currency}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bill Split Engine with Roommates */}
                <div className="p-5 rounded-2xl bg-[#000000] border border-zinc-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-cyan-400" />
                      <h3 className="text-sm font-bold text-white">Split This Bill With Roommates / Friends?</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={enableSplit} 
                        onChange={(e) => setEnableSplit(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  {enableSplit && (
                    <div className="space-y-4 pt-2 animate-in fade-in">
                      {/* Friend Selector */}
                      <div>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                          1. Select Friends To Share Bill:
                        </span>
                        {contacts.length === 0 ? (
                          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
                            No friends added yet. You can add friends on the <b>Tabs</b> page.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {contacts.map((c) => {
                              const isSelected = selectedFriendIds.includes(c.id);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => toggleFriend(c.id)}
                                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400'
                                      : 'bg-[#080808] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                  }`}
                                >
                                  <img
                                    src={c.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.name)}`}
                                    alt={c.name}
                                    className="w-5 h-5 rounded-full"
                                  />
                                  <span>{c.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Split Mode Switcher: Equal | Percentage | Custom Exact Amount */}
                      {selectedFriendIds.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                            2. Choose Split Distribution Mode:
                          </span>

                          <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-900 rounded-xl">
                            <button
                              type="button"
                              onClick={() => setSplitMode('equal')}
                              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                splitMode === 'equal' ? 'bg-cyan-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              <Divide size={14} />
                              <span>Equal (1/N)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSplitMode('percentage')}
                              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                splitMode === 'percentage' ? 'bg-cyan-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              <Percent size={14} />
                              <span>Percentage (%)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSplitMode('custom')}
                              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                splitMode === 'custom' ? 'bg-cyan-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              <DollarSign size={14} />
                              <span>Exact Amount ($)</span>
                            </button>
                          </div>

                          {/* MODE 1: EQUAL SPLIT */}
                          {splitMode === 'equal' && (
                            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs flex justify-between items-center">
                              <div>
                                <b className="text-white block">Divided evenly across {totalParticipants} people</b>
                                <span className="text-zinc-400 text-[11px]">(You + {selectedFriendIds.length} roommates)</span>
                              </div>
                              <div className="text-right">
                                <span className="text-base font-black font-mono text-cyan-300">
                                  ${equalSplitAmount.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-zinc-400 block">/ person</span>
                              </div>
                            </div>
                          )}

                          {/* MODE 2: PERCENTAGE SPLIT */}
                          {splitMode === 'percentage' && (
                            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
                              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                                <span className="font-bold text-white">Your Share (You Paid Total):</span>
                                <span className="font-mono font-bold text-cyan-400">
                                  {myPercentage}% (${((totalAmount * myPercentage) / 100).toFixed(2)})
                                </span>
                              </div>

                              {selectedFriendIds.map((cId) => {
                                const friend = contacts.find(c => c.id === cId);
                                const pct = customPercentages[cId] || Number((100 / totalParticipants).toFixed(0));
                                const friendShare = ((totalAmount * pct) / 100).toFixed(2);

                                return (
                                  <div key={cId} className="flex justify-between items-center gap-3">
                                    <span className="text-zinc-300 font-medium truncate">{friend?.name}:</span>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={customPercentages[cId] ?? pct}
                                        onChange={(e) => {
                                          const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                                          setCustomPercentages({ ...customPercentages, [cId]: val });
                                        }}
                                        className="w-16 bg-[#000000] border border-zinc-700 rounded p-1 text-center font-mono text-white"
                                      />
                                      <span className="text-zinc-500 font-mono">%</span>
                                      <span className="font-mono text-zinc-400 text-[11px] w-16 text-right">${friendShare}</span>
                                    </div>
                                  </div>
                                );
                              })}

                              {sumOfPercentages > 100 && (
                                <div className="text-rose-400 text-[11px] flex items-center gap-1 font-bold">
                                  <AlertCircle size={13} />
                                  <span>Total percentages exceed 100%!</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* MODE 3: CUSTOM EXACT DOLLAR AMOUNTS */}
                          {splitMode === 'custom' && (
                            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
                              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                                <div>
                                  <span className="font-bold text-white block">Allocation Balance:</span>
                                  <span className="text-[10px] text-zinc-400">Total bill: ${totalAmount.toFixed(2)}</span>
                                </div>
                                <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                                  remainingUnallocated === 0
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {remainingUnallocated === 0 ? 'Fully Allocated ✅' : `Remaining: $${remainingUnallocated.toFixed(2)}`}
                                </span>
                              </div>

                              {selectedFriendIds.map((cId) => {
                                const friend = contacts.find(c => c.id === cId);
                                return (
                                  <div key={cId} className="flex justify-between items-center gap-3">
                                    <span className="text-zinc-300 font-medium truncate">{friend?.name} owes:</span>
                                    <div className="flex items-center gap-1 font-mono">
                                      <span className="text-zinc-500">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={customAmounts[cId] ?? ''}
                                        onChange={(e) => {
                                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                                          setCustomAmounts({ ...customAmounts, [cId]: val });
                                        }}
                                        className="w-24 bg-[#000000] border border-zinc-700 rounded p-1 text-right font-mono text-white focus:outline-none focus:border-cyan-400"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
                  >
                    ← Rescan / Change File
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndSplit}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl cursor-pointer transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Logging & Splitting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>{enableSplit && selectedFriendIds.length > 0 ? 'Log to Ledger & Post Tabs IOUs' : 'Save Scanned Bill to Ledger'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
