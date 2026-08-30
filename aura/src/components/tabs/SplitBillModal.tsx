import React, { useState } from 'react';
import { tabsApi, type Contact, type SplitBill } from '../../lib/tabsApi';
import { useTheme } from '../../context/ThemeContext';
import { 
  Divide, 
  Users, 
  Check, 
  X, 
  Plus,
  Percent,
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
  const [splitMode, setSplitMode] = useState<'equal' | 'percentage' | 'custom'>('equal');
  const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
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

  // Percentage calculations
  const sumOfPercentages = Object.values(customPercentages).reduce((s, p) => s + (Number(p) || 0), 0);
  const myPercentage = Math.max(0, 100 - sumOfPercentages);

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
      setError('Please select at least 1 friend or roommate to split with.');
      return;
    }

    if (splitMode === 'percentage' && sumOfPercentages > 100) {
      setError('Total percentages cannot exceed 100%.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const participants = selectedFriends.map((friend) => {
        let share = equalShare;
        if (splitMode === 'percentage') {
          const pct = customPercentages[friend.id] || (100 / totalPeopleCount);
          share = Number(((parsedTotal * pct) / 100).toFixed(2));
        } else if (splitMode === 'custom') {
          share = customAmounts[friend.id] || 0;
        }
        return {
          contactId: friend.id,
          name: friend.name,
          shareAmount: share,
        };
      });

      const newSplit = await tabsApi.createSplitBill({
        title: title.trim(),
        totalAmount: parsedTotal,
        category,
        date: new Date().toISOString().split('T')[0],
        participants,
      });

      onSplitCreated(newSplit);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create split bill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg p-6 rounded-2xl bg-[#080808] border border-zinc-800 shadow-2xl relative overflow-hidden text-slate-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${auraColor}, #00f2fe)` }}
        />

        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Divide size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Split a Bill / Expense</h2>
              <p className="text-[11px] text-zinc-400">Equal, percentage, or custom dollar split with roommates</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Bill Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Bill Description *
              </label>
              <input
                type="text"
                placeholder="e.g. Costco Groceries, Dinner"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
              >
                <option value="Groceries">🛒 Groceries</option>
                <option value="Food">🍽️ Food & Dining</option>
                <option value="Utilities">💡 Utilities / Internet</option>
                <option value="Rent">🏠 Rent</option>
                <option value="Transport">🚗 Transport / Uber</option>
                <option value="Entertainment">🍿 Entertainment</option>
                <option value="Miscellaneous">📦 Other</option>
              </select>
            </div>
          </div>

          {/* Total Amount Paid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center justify-between">
              <span>Total Amount Paid (By You) *</span>
              <span className="text-zinc-500 font-mono text-[11px]">{currency}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-[#000000] border border-zinc-800 rounded-xl pl-8 pr-3.5 py-2.5 text-base font-bold font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Friend Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Users size={13} />
                <span>Select Friends to Share With ({selectedContactIds.length})</span>
              </label>
              <button
                type="button"
                onClick={onOpenAddContact}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                <Plus size={12} />
                <span>Add Friend</span>
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#000000] border border-zinc-800 text-center">
                <p className="text-xs text-zinc-400 mb-2">No friends or roommates added yet.</p>
                <button
                  type="button"
                  onClick={onOpenAddContact}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30 cursor-pointer"
                >
                  + Add First Friend
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {contacts.map((contact) => {
                  const isSelected = selectedContactIds.includes(contact.id);
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => toggleContact(contact.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-md'
                          : 'bg-[#000000] border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contact.name)}`}
                          alt={contact.name}
                          className="w-6 h-6 rounded-lg bg-zinc-900 flex-shrink-0"
                        />
                        <span className="text-xs font-medium truncate">{contact.name}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-cyan-400 text-black' : 'border border-zinc-700'
                      }`}>
                        {isSelected && <Check size={12} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3 Split Modes (Equal | Percentage | Custom Exact Amount) */}
          {selectedContactIds.length > 0 && parsedTotal > 0 && (
            <div className="space-y-3 pt-2 border-t border-zinc-800/80">
              <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSplitMode('equal')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    splitMode === 'equal' ? 'bg-cyan-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Divide size={13} />
                  <span>Equal (1/N)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode('percentage')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    splitMode === 'percentage' ? 'bg-cyan-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Percent size={13} />
                  <span>Percent (%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode('custom')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    splitMode === 'custom' ? 'bg-cyan-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <DollarSign size={13} />
                  <span>Exact ($)</span>
                </button>
              </div>

              {/* EQUAL MODE */}
              {splitMode === 'equal' && (
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white block">
                      Divided equally by {totalPeopleCount} people
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      (You + {selectedContactIds.length} friends)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-cyan-300">
                      ${equalShare.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">/ person</span>
                  </div>
                </div>
              )}

              {/* PERCENTAGE MODE */}
              {splitMode === 'percentage' && (
                <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="font-bold text-white">Your Share (Payer):</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {myPercentage}% (${((parsedTotal * myPercentage) / 100).toFixed(2)})
                    </span>
                  </div>
                  {selectedFriends.map((friend) => {
                    const pct = customPercentages[friend.id] || Number((100 / totalPeopleCount).toFixed(0));
                    const friendShare = ((parsedTotal * pct) / 100).toFixed(2);
                    return (
                      <div key={friend.id} className="flex justify-between items-center gap-2">
                        <span className="text-zinc-300 truncate">{friend.name}:</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={customPercentages[friend.id] ?? pct}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                              setCustomPercentages({ ...customPercentages, [friend.id]: val });
                            }}
                            className="w-14 bg-zinc-900 border border-zinc-700 rounded p-1 text-center text-white"
                          />
                          <span className="text-zinc-500">%</span>
                          <span className="text-zinc-400 text-[11px] w-14 text-right">${friendShare}</span>
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

              {/* CUSTOM AMOUNT MODE */}
              {splitMode === 'custom' && (
                <div className="p-3.5 rounded-xl bg-[#000000] border border-zinc-800 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="font-bold text-white">Allocation Status:</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                      remainingUnallocated === 0
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                    }`}>
                      {remainingUnallocated === 0 ? 'Fully Allocated ✅' : `Remaining: $${remainingUnallocated.toFixed(2)}`}
                    </span>
                  </div>
                  {selectedFriends.map((friend) => (
                    <div key={friend.id} className="flex justify-between items-center gap-2">
                      <span className="text-zinc-300 truncate">{friend.name} owes:</span>
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
                          className="w-20 bg-zinc-900 border border-zinc-700 rounded p-1 text-right text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedContactIds.length === 0 || !parsedTotal}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
            >
              <Divide size={14} />
              <span>{isSubmitting ? 'Creating Split...' : 'Post IOUs to Tabs'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
