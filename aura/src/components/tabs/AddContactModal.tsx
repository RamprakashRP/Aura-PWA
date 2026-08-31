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
  ShieldCheck,
  Check,
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
  const [isSelectedAuraUser, setIsSelectedAuraUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live lookup for Aura registered users when email or name is typed
  useEffect(() => {
    if (isSelectedAuraUser) return;

    const timer = setTimeout(async () => {
      const query = email.trim() || name.trim();
      if (query.length >= 2) {
        setIsSearching(true);
        const user = await tabsApi.searchAuraUser(query);
        setFoundUser(user);
        setIsSearching(false);
      } else {
        setFoundUser(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [email, name, isSelectedAuraUser]);

  const handleSelectAuraUser = (user: { id: string; name: string; email: string; avatarUrl?: string }) => {
    setName(user.name);
    setEmail(user.email);
    setFoundUser(user);
    setIsSelectedAuraUser(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a contact name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const targetUserId = (isSelectedAuraUser || foundUser) ? (foundUser?.id || undefined) : undefined;
      const targetEmail = (isSelectedAuraUser && foundUser) ? foundUser.email : (email.trim() || undefined);
      const targetName = (isSelectedAuraUser && foundUser) ? foundUser.name : name.trim();

      const newContact = await tabsApi.createContact({
        name: targetName,
        email: targetEmail,
        phone: phone.trim() || undefined,
        contactUserId: targetUserId,
        status: targetUserId ? 'pending' : 'unregistered',
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
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
              <p className="text-[11px] text-zinc-400">Connect accounts for live 2-way expense sync</p>
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
          {/* Email Address (Primary Search Key) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Mail size={13} /> Friend&apos;s Google Email</span>
              {isSearching && <span className="text-[10px] text-cyan-400 animate-pulse font-mono">Searching Aura...</span>}
            </label>
            <input
              type="email"
              placeholder="e.g. friend@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (isSelectedAuraUser) setIsSelectedAuraUser(false);
              }}
              className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all"
              autoFocus
            />
          </div>

          {/* Contact Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <User size={13} />
              <span>Contact Name *</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Henderson"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (isSelectedAuraUser) setIsSelectedAuraUser(false);
              }}
              className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all"
              required
            />
          </div>

          {/* Phone (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Phone size={13} />
              <span>Mobile Phone (Optional)</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. +1 (647) 555-0199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#000000] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          {/* Live Found Aura Profile Card with 1-Click Select */}
          {foundUser && (
            <div 
              onClick={() => handleSelectAuraUser(foundUser)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isSelectedAuraUser
                  ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                  : 'bg-zinc-950 border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={foundUser.avatarUrl}
                  alt={foundUser.name}
                  className="w-10 h-10 rounded-xl border border-cyan-400 bg-[#000000] flex-shrink-0"
                />
                <div className="min-w-0 truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-xs truncate">{foundUser.name}</span>
                    <ShieldCheck size={13} className="text-cyan-400 flex-shrink-0" />
                  </div>
                  <span className="text-[11px] text-cyan-300 font-mono block truncate">{foundUser.email}</span>
                  <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5">
                    {isSelectedAuraUser ? '✅ Profile Linked (Will Send Friend Request)' : '👉 Click to link this Aura account'}
                  </span>
                </div>
              </div>

              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                isSelectedAuraUser ? 'bg-cyan-500 text-black' : 'border border-zinc-600 text-transparent'
              }`}>
                <Check size={14} />
              </div>
            </div>
          )}

          {!foundUser && !isSearching && email.trim().length > 3 && (
            <div className="p-3 rounded-xl bg-[#000000] border border-zinc-800 text-[11px] text-zinc-400">
              💡 No Aura member found with this email. Contact will be saved to your personal IOU tab.
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
            >
              <CheckCircle2 size={14} />
              <span>{isSubmitting ? 'Saving...' : (isSelectedAuraUser || foundUser) ? 'Send Friend Request' : 'Save Contact'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
