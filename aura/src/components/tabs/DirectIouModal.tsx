import React, { useState } from 'react';
import { tabsApi, type Contact, type DebtEntry } from '../../lib/tabsApi';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Check, 
  X
} from 'lucide-react';

interface DirectIouModalProps {
  contacts: Contact[];
  initialContactId?: string;
  onClose: () => void;
  onIouCreated: (entry: DebtEntry) => void;
  onOpenAddContact: () => void;
}

export function DirectIouModal({
  contacts,
  initialContactId,
  onClose,
  onIouCreated,
  onOpenAddContact,
}: DirectIouModalProps) {

  const [type, setType] = useState<'lent' | 'borrowed'>('lent');
  const [contactId, setContactId] = useState(initialContactId || (contacts[0]?.id || ''));
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState('CAD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) {
      setError('Please select a friend or contact.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description (e.g. Lent for Uber, Borrowed for Dinner).');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid dollar amount.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const entry = await tabsApi.createDirectIou({
        contactId,
        description: description.trim(),
        amount: Number(amount),
        currency,
        type,
      });

      onIouCreated(entry);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record IOU.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedContact = contacts.find((c) => c.id === contactId);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md p-6 rounded-2xl bg-[#080808] border border-zinc-800 shadow-2xl relative overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: type === 'lent' ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f43f5e, #e11d48)' }}
        />

        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              type === 'lent' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
            }`}>
              {type === 'lent' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {type === 'lent' ? 'I Lent Money' : 'I Borrowed Money'}
              </h2>
              <p className="text-[11px] text-zinc-400">Direct personal loan / IOU entry</p>
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
          {/* Type Toggle: Lent vs Borrowed */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#000000] rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setType('lent')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'lent'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowUpRight size={14} />
              <span>I Lent (They Owe Me)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('borrowed')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'borrowed'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft size={14} />
              <span>I Borrowed (I Owe Them)</span>
            </button>
          </div>

          {/* Select Contact */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Contact / Friend *
              </label>
              <button
                type="button"
                onClick={onOpenAddContact}
                className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
              >
                + Add Friend
              </button>
            </div>
            {contacts.length === 0 ? (
              <div className="p-3 rounded-xl bg-[#000000] border border-zinc-800 text-center">
                <button
                  type="button"
                  onClick={onOpenAddContact}
                  className="text-xs text-cyan-400 font-bold hover:underline"
                >
                  Click to add your first friend
                </button>
              </div>
            ) : (
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer font-semibold"
                required
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Description / Reason *
            </label>
            <input
              type="text"
              placeholder={type === 'lent' ? 'e.g. Lent $20 for Uber, Paid for concert ticket' : 'e.g. Borrowed for lunch, Hotel room deposit'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all"
              required
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="20.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer font-bold"
              >
                <option value="CAD">🇨🇦 CAD ($)</option>
                <option value="USD">🇺🇸 USD ($)</option>
                <option value="INR">🇮🇳 INR (₹)</option>
              </select>
            </div>
          </div>

          {/* Summary Preview */}
          {selectedContact && Number(amount) > 0 && (
            <div className="p-3 rounded-xl bg-[#000000] border border-zinc-800 text-xs flex justify-between items-center">
              <span>Effect on Balance:</span>
              <span className={`font-mono font-bold ${type === 'lent' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {type === 'lent' ? `+$${Number(amount).toFixed(2)} CAD (They owe you)` : `-$${Number(amount).toFixed(2)} CAD (You owe them)`}
              </span>
            </div>
          )}

          {/* Action Buttons */}
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
              disabled={isSubmitting || !contactId || !description.trim() || !amount}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
              style={{
                background: type === 'lent' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f43f5e, #be123c)',
              }}
            >
              <Check size={14} />
              <span>{isSubmitting ? 'Recording...' : 'Record IOU'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
