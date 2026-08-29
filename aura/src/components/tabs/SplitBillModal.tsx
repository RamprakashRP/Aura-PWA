import React, { useState } from 'react';
import { tabsApi, type Contact, type SplitBill } from '../../lib/tabsApi';
import { useTheme } from '../../context/ThemeContext';
import { 
  Divide, 
  Users, 
  Check, 
  X, 
  Plus 
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
  const [currency, setCurrency] = useState('CAD');
  const [category, setCategory] = useState(initialCategory);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
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

    setIsSubmitting(true);
    setError(null);

    try {
      const participants = [
        { contactId: 'you', name: 'You (Payer)', shareAmount: equalShare },
        ...selectedFriends.map((f) => ({
          contactId: f.id,
          name: f.name,
          shareAmount: equalShare,
        })),
      ];

      const split = await tabsApi.createSplitBill({
        title: title.trim(),
        totalAmount: parsedTotal,
        currency,
        category,
        participants,
      });

      onSplitCreated(split);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create split.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg p-6 rounded-2xl bg-[#080808] border border-zinc-800 shadow-2xl relative overflow-hidden text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${auraColor}, #e1143d)` }}
        />

        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Divide size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Split Expense with Friends</h2>
              <p className="text-[11px] text-zinc-400">Assuming you paid the total bill, splits are added to your IOU tab</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Expense Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Costco Groceries, Dinner at Kinton, Uber Ride"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-all"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Total Bill ($) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="22.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="Groceries">🛒 Groceries / Supermarket</option>
                <option value="Food">🍔 Dining & Food</option>
                <option value="Transport">🚗 Uber & Transit</option>
                <option value="Housing">🏠 Rent & Utilities</option>
                <option value="Entertainment">🎬 Entertainment / Outing</option>
                <option value="Miscellaneous">📦 Other Shared Bill</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer font-bold"
              >
                <option value="CAD">🇨🇦 CAD ($)</option>
                <option value="USD">🇺🇸 USD ($)</option>
                <option value="INR">🇮🇳 INR (₹)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Users size={13} />
                <span>Split With ({selectedContactIds.length} Friends Selected):</span>
              </label>
              <button
                type="button"
                onClick={onOpenAddContact}
                className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add New Friend
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#000000] border border-zinc-800 text-center space-y-2">
                <p className="text-xs text-zinc-400">You have no friends or roommates added yet.</p>
                <button
                  type="button"
                  onClick={onOpenAddContact}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 cursor-pointer hover:bg-cyan-900/60"
                >
                  + Add First Contact
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {contacts.map((c) => {
                  const isSelected = selectedContactIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleContact(c.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-rose-950/40 border-rose-500/80 text-white shadow-md'
                          : 'bg-[#000000] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white">
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1 truncate">
                        <p className="truncate text-xs font-bold">{c.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {parsedTotal > 0 && selectedContactIds.length > 0 && (
            <div className="p-4 rounded-xl bg-[#000000] border border-zinc-800/90 space-y-2">
              <div className="flex justify-between items-center text-xs text-zinc-400 border-b border-zinc-800 pb-2">
                <span>Split Math ({totalPeopleCount} people total):</span>
                <span className="font-mono font-bold text-white">
                  ${parsedTotal.toFixed(2)} ÷ {totalPeopleCount} = ${equalShare.toFixed(2)} / person
                </span>
              </div>

              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Your Share (Paid by You):</span>
                  <span className="font-mono text-zinc-400">${equalShare.toFixed(2)}</span>
                </div>
                {selectedFriends.map((f) => (
                  <div key={f.id} className="flex justify-between items-center text-emerald-400 font-semibold">
                    <span>{f.name} owes you:</span>
                    <span className="font-mono font-bold">+${equalShare.toFixed(2)} {currency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !parsedTotal || selectedContactIds.length === 0}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
            >
              <Check size={14} />
              <span>{isSubmitting ? 'Recording Split...' : 'Confirm & Split Bill'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
