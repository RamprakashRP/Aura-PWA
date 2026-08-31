import React, { useState } from 'react';
import { tabsApi, type Contact, type SplitBill } from '../../lib/tabsApi';
import { useTheme } from '../../context/ThemeContext';
import { 
  Divide, 
  Users, 
  Check, 
  X, 
  Plus,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface SplitBillModalProps {
  contacts: Contact[];
  initialAmount?: number;
  initialTitle?: string;
  initialCategory?: string;
  onClose: () => void;
  onSplitCreated: (split: SplitBill) => void;
  onOpenAddContact: () => void;
}

export function SplitBillModal({
  contacts,
  initialAmount,
  initialTitle,
  initialCategory = 'Groceries',
  onClose,
  onSplitCreated,
  onOpenAddContact,
}: SplitBillModalProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [title, setTitle] = useState(initialTitle || '');
  const [totalAmount, setTotalAmount] = useState<number | ''>(initialAmount || '');
  const [currency] = useState('CAD');
  const [category, setCategory] = useState(initialCategory);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleContact = (id: string) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter((cId) => cId !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  const totalPeopleCount = 1 + selectedContactIds.length;
  const parsedTotal = Number(totalAmount) || 0;
  const equalShare = totalPeopleCount > 0 && parsedTotal > 0
    ? Math.round((parsedTotal / totalPeopleCount) * 100) / 100
    : 0;

  // Custom Amount calculations
  const sumOfCustomAmounts = Object.values(customAmounts).reduce((s, a) => s + (Number(a) || 0), 0);
  const remainingUnallocated = Number((parsedTotal - sumOfCustomAmounts).toFixed(2));

  const selectedFriends = contacts.filter((c) => selectedContactIds.includes(c.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a bill or expense title.');
      return;
    }
    if (!parsedTotal || parsedTotal <= 0) {
      setError('Please enter a valid total amount.');
      return;
    }
    if (selectedContactIds.length === 0) {
      setError('Select at least one roommate to split with.');
      return;
    }

    // Build participant payloads
    const participants = selectedFriends.map((contact) => {
      let share = equalShare;
      if (splitMode === 'custom') {
        share = customAmounts[contact.id] || 0;
      }
      return {
        contactId: contact.id,
        name: contact.name,
        shareAmount: share,
      };
    });

    setIsSubmitting(true);
    setError(null);
    try {
      const newSplit = await tabsApi.createSplitBill({
        title,
        totalAmount: parsedTotal,
        category,
        date: new Date().toISOString().split('T')[0],
        participants,
      });
      onSplitCreated(newSplit);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create bill split');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-3xl bg-[#080808] border border-zinc-800 shadow-2xl p-6 relative overflow-hidden text-slate-100 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${auraColor}, #00f2fe)` }}
        />

        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
            >
              <Divide size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Split a Bill</h2>
              <p className="text-xs text-zinc-400">Divide shared costs & log instant roommate IOUs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Bill Title / Merchant
            </label>
            <input
              type="text"
              placeholder="e.g. Costco Groceries, Dinner, Internet Bill"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Total Amount
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-[#000000] border border-zinc-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="Groceries">Groceries</option>
                <option value="Food">Food & Dining</option>
                <option value="Rent">Rent & Utilities</option>
                <option value="Household">Household</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Transport">Transport</option>
              </select>
            </div>
          </div>

          {/* Participant Selection */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Split With Whom?
              </label>
              <button
                type="button"
                onClick={onOpenAddContact}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add Roommate
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#000000] border border-zinc-800 text-center space-y-2">
                <p className="text-xs text-zinc-400">No roommates found yet.</p>
                <button
                  type="button"
                  onClick={onOpenAddContact}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Users size={13} /> Add First Roommate
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                {contacts.map((contact) => {
                  const isSelected = selectedContactIds.includes(contact.id);
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => toggleContact(contact.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                        isSelected 
                          ? 'bg-cyan-950/60 border-cyan-500/80 text-white ring-1 ring-cyan-500/50' 
                          : 'bg-[#000000] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <img 
                        src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contact.name)}`}
                        alt={contact.name}
                        className="w-7 h-7 rounded-full object-cover border border-zinc-700 flex-shrink-0"
                      />
                      <div className="truncate flex-1">
                        <p className="text-xs font-bold truncate">{contact.name}</p>
                      </div>
                      {isSelected && <Check size={14} className="text-cyan-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Split Mode Tabs (Equal 1/N vs Custom $) */}
          {selectedContactIds.length > 0 && parsedTotal > 0 && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSplitMode('equal')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    splitMode === 'equal' ? 'bg-cyan-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Divide size={13} />
                  <span>Split as {totalPeopleCount} People (1 / N)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode('custom')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    splitMode === 'custom' ? 'bg-cyan-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <DollarSign size={13} />
                  <span>Custom Amounts ($)</span>
                </button>
              </div>

              {/* EQUAL SPLIT BREAKDOWN */}
              {splitMode === 'equal' && (
                <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs space-y-2">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span>Divided equally by {totalPeopleCount} people:</span>
                    <span className="text-base font-black font-mono text-cyan-300">
                      ${equalShare.toFixed(2)} <span className="text-xs text-zinc-400">{currency}/ea</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 pt-1.5 border-t border-cyan-500/20">
                    Your share: <b>${equalShare.toFixed(2)}</b> • Each roommate will owe you: <b>${equalShare.toFixed(2)}</b>
                  </div>
                </div>
              )}

              {/* CUSTOM AMOUNT BREAKDOWN */}
              {splitMode === 'custom' && (
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="font-bold text-white">Remaining Balance:</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      remainingUnallocated === 0 ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                    }`}>
                      {remainingUnallocated === 0 ? 'Fully Allocated ✅' : `Remaining: $${remainingUnallocated.toFixed(2)}`}
                    </span>
                  </div>
                  {selectedFriends.map((friend) => (
                    <div key={friend.id} className="flex justify-between items-center">
                      <span className="text-zinc-300">{friend.name} owes:</span>
                      <div className="flex items-center gap-1 font-mono">
                        <span className="text-zinc-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={customAmounts[friend.id] ?? ''}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            setCustomAmounts({ ...customAmounts, [friend.id]: val });
                          }}
                          className="w-24 bg-black border border-zinc-700 rounded p-1 text-right text-white font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedContactIds.length === 0 || !parsedTotal}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xl cursor-pointer transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
            >
              {isSubmitting ? 'Posting IOUs...' : 'Create Split & Log IOUs'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
