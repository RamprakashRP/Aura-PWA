import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  X, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { BANK_CATALOG } from '../../data/bankCatalog';

interface QuickLinkCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    last4: string;
    bankId?: string;
    accountName?: string;
    accountType?: string;
  };
  onAccountLinked: () => void;
}

export function QuickLinkCardModal({
  isOpen,
  onClose,
  initialData,
  onAccountLinked,
}: QuickLinkCardModalProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();
  const { user } = useAuth();

  const [bankId, setBankId] = useState(initialData.bankId || 'cibc');
  const [accountName, setAccountName] = useState(initialData.accountName || '');
  const [accountType, setAccountType] = useState(initialData.accountType || 'Credit Card');
  const [last4Digits, setLast4Digits] = useState(initialData.last4 || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData.last4) setLast4Digits(initialData.last4);
    if (initialData.bankId) setBankId(initialData.bankId);
    if (initialData.accountName) setAccountName(initialData.accountName);
    if (initialData.accountType) setAccountType(initialData.accountType);
  }, [initialData]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return;

    setIsSaving(true);
    const newAccountId = `acc_${bankId}_${last4Digits || Date.now()}`;

    const accountPayload = {
      id: newAccountId,
      user_id: user?.id,
      bank_id: bankId,
      account_name: accountName,
      account_type: accountType,
      last_4_digits: last4Digits,
      balance: 0,
      currency: 'CAD',
    };

    try {
      // 1. Save to Supabase if logged in
      if (user?.id) {
        await supabase.from('bank_accounts').upsert(accountPayload, { onConflict: 'id' });
      }

      // 2. Save to user-scoped LocalStorage
      const localKey = user?.id ? `aura_bank_accounts_${user.id}` : 'aura_bank_accounts_guest';
      const existingRaw = localStorage.getItem(localKey);
      let existingList: any[] = [];
      try { existingList = JSON.parse(existingRaw || '[]'); } catch (e) {}
      
      const filtered = existingList.filter(a => a.id !== newAccountId);
      filtered.push(accountPayload);
      localStorage.setItem(localKey, JSON.stringify(filtered));

      onAccountLinked();
      onClose();
    } catch (err) {
      console.error('Failed to link account:', err);
      onAccountLinked();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-3xl bg-[#080808] border border-zinc-800 shadow-2xl p-6 relative overflow-hidden text-slate-100"
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
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Link Discovered Card</h2>
              <p className="text-xs text-zinc-400">Save card to auto-track future transactions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Bank Selector */}
          <div>
            <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
              Issuing Bank / Institution
            </label>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-cyan-500"
            >
              {BANK_CATALOG.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.country})
                </option>
              ))}
              <option value="other">Other / Custom Bank</option>
            </select>
          </div>

          {/* Account / Card Name */}
          <div>
            <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
              Account / Card Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CIBC Adapta Mastercard, TD Cash Back"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Account Type & Last 4 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Chequing Account">Chequing Account</option>
                <option value="Savings Account">Savings Account</option>
                <option value="Line of Credit">Line of Credit</option>
                <option value="Prepaid Card">Prepaid / Cash Card</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
                Last 4 Digits
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="8840"
                value={last4Digits}
                onChange={(e) => setLast4Digits(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-white font-mono text-center font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-zinc-300 flex items-start gap-2">
            <Sparkles size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <span>
              All past & future transactions matching <b>••••{last4Digits || 'XXXX'}</b> will automatically link to this account.
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !accountName.trim()}
              className="px-5 py-2 rounded-xl font-bold text-white shadow-xl cursor-pointer flex items-center gap-1.5 transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
            >
              <Check size={14} />
              <span>{isSaving ? 'Linking...' : 'Link & Save Card'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
