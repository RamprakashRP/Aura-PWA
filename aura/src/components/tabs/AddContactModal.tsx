import React, { useState, useEffect } from 'react';
import { tabsApi, type Contact } from '../../lib/tabsApi';
import { useTheme } from '../../context/ThemeContext';
import { 
  UserPlus, 
  CheckCircle2, 
  X, 
  Mail, 
  Phone, 
  User,
  ShieldCheck
} from 'lucide-react';

interface AddContactModalProps {
  onClose: () => void;
  onContactAdded: (contact: Contact) => void;
}

export function AddContactModal({ onClose, onContactAdded }: AddContactModalProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; name: string; email: string; avatarUrl?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live lookup for Aura registered users when email or name is typed
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (email.trim().length > 3 || (name.trim().length > 2 && !foundUser)) {
        setIsSearching(true);
        const user = await tabsApi.searchAuraUser(email.trim() || name.trim());
        setFoundUser(user);
        setIsSearching(false);
      } else {
        setFoundUser(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [email, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a contact name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newContact = await tabsApi.createContact({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        contactUserId: foundUser?.id,
        status: foundUser ? 'connected' : 'unregistered',
      });
      onContactAdded(newContact);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md p-6 rounded-2xl bg-[#080808] border border-zinc-800 shadow-2xl relative overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${auraColor}, #00f2fe)` }}
        />

        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Add Friend or Roommate</h2>
              <p className="text-[11px] text-zinc-400">Keep tabs on shared expenses, splits & IOUs</p>
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
          {/* Contact Name (Mandatory) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <User size={13} />
              <span>Name * (Mandatory)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Henderson, Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all"
              autoFocus
              required
            />
          </div>

          {/* Email (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Mail size={13} />
              <span>Email Address (Optional)</span>
            </label>
            <input
              type="email"
              placeholder="e.g. alex@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          {/* Phone (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Phone size={13} />
              <span>Mobile Number (Optional)</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. +1 (647) 555-0199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          {/* Live Aura Registered User Match Indicator */}
          {isSearching ? (
            <div className="p-3 rounded-xl bg-[#000000] border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span>Checking Aura network for matching profiles...</span>
            </div>
          ) : foundUser ? (
            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={foundUser.avatarUrl}
                  alt={foundUser.name}
                  className="w-8 h-8 rounded-full border border-cyan-400/50 bg-[#000000]"
                />
                <div>
                  <div className="flex items-center gap-1 text-xs font-bold text-white">
                    <span>{foundUser.name}</span>
                    <ShieldCheck size={13} className="text-cyan-400" />
                  </div>
                  <span className="text-[10px] text-cyan-300 font-mono">{foundUser.email}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Aura Member
              </span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#050505] border border-zinc-800 text-[11px] text-zinc-500">
              💡 Contact will be tracked as a personal ledger contact unless they join Aura.
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
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
            >
              <CheckCircle2 size={14} />
              <span>{isSubmitting ? 'Saving...' : 'Save Contact'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
