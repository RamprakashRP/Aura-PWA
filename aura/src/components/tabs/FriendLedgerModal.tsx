import React, { useState, useEffect } from 'react';
import { tabsApi, type Contact, type DebtEntry } from '../../lib/tabsApi';
import { 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Plus, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Divide 
} from 'lucide-react';

interface FriendLedgerModalProps {
  contact: Contact;
  onClose: () => void;
  onOpenSplit: () => void;
  onOpenIou: () => void;
  onDataUpdated: () => void;
}

export function FriendLedgerModal({
  contact,
  onClose,
  onOpenSplit,
  onOpenIou,
  onDataUpdated,
}: FriendLedgerModalProps) {
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleNotes, setSettleNotes] = useState('Paid via Interac e-Transfer');
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    loadDebts();
  }, [contact.id]);

  const loadDebts = async () => {
    setLoading(true);
    const list = await tabsApi.getDebtEntries(contact.id);
    setDebts(list);
    setLoading(false);
  };

  const netBalance = debts
    .filter((d) => d.status !== 'settled')
    .reduce((sum, d) => sum + d.amount, 0);

  const roundedNet = Math.round(netBalance * 100) / 100;
  const currency = debts[0]?.currency || contact.currency || 'CAD';

  const handleSettleUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = Number(settleAmount) || Math.abs(roundedNet);
    if (!amountVal || amountVal <= 0) return;

    setIsSettling(true);
    try {
      const finalSettleAmount = roundedNet > 0 ? -amountVal : amountVal;
      await tabsApi.settleUpDebt({
        contactId: contact.id,
        amount: finalSettleAmount,
        currency,
        notes: settleNotes,
      });

      setShowSettleModal(false);
      await loadDebts();
      onDataUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl p-6 rounded-2xl bg-[#080808] border border-zinc-800 shadow-2xl relative overflow-hidden text-slate-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: roundedNet > 0 ? '#10b981' : roundedNet < 0 ? '#f43f5e' : '#71717a' }}
        />

        {/* Top Profile & Balance Header */}
        <div className="flex justify-between items-start pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <img
              src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contact.name)}&backgroundColor=transparent`}
              alt={contact.name}
              className="w-12 h-12 rounded-2xl border border-zinc-800 bg-[#000000]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{contact.name}</h2>
                {contact.status === 'connected' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <ShieldCheck size={11} /> Connected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                {contact.email && <span className="flex items-center gap-1"><Mail size={12} /> {contact.email}</span>}
                {contact.phone && <span className="flex items-center gap-1"><Phone size={12} /> {contact.phone}</span>}
              </div>
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

        {/* Big Balance Banner */}
        <div className={`my-4 p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
          roundedNet > 0
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : roundedNet < 0
            ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
        }`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest block opacity-80">
              Current Tab Status
            </span>
            <span className="text-xl md:text-2xl font-black font-mono">
              {roundedNet > 0
                ? `Owes you +$${roundedNet.toFixed(2)} ${currency}`
                : roundedNet < 0
                ? `You owe them -$${Math.abs(roundedNet).toFixed(2)} ${currency}`
                : `Settled Up ($0.00 ${currency})`}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {roundedNet !== 0 && (
              <button
                type="button"
                onClick={() => {
                  setSettleAmount(Math.abs(roundedNet));
                  setShowSettleModal(true);
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>Settle Up</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => { onClose(); onOpenSplit(); }}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Divide size={14} />
              <span>Split Bill</span>
            </button>
            <button
              type="button"
              onClick={() => { onClose(); onOpenIou(); }}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              <span>IOU</span>
            </button>
          </div>
        </div>

        {/* SETTLE UP MODAL FORM OVERLAY */}
        {showSettleModal && (
          <form onSubmit={handleSettleUp} className="mb-4 p-4 rounded-xl bg-[#000000] border border-zinc-700 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Record Settle Up Repayment</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-400 font-bold mb-1">Repayment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full bg-[#080808] border border-zinc-800 rounded-lg p-2 text-xs font-mono font-bold text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 font-bold mb-1">Payment Method / Note</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full bg-[#080808] border border-zinc-800 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSettling}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                {isSettling ? 'Recording...' : 'Confirm Settle Up'}
              </button>
            </div>
          </form>
        )}

        {/* Chronological Audit Ledger */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Audit Trail & History ({debts.length} Entries)
          </h4>

          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono">Loading history...</div>
          ) : debts.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#000000] border border-zinc-800 text-center text-xs text-zinc-500">
              No split bills or IOU transactions logged with {contact.name} yet.
            </div>
          ) : (
            debts.map((d) => {
              const isPositive = d.amount > 0;
              const isSettled = d.status === 'settled';

              return (
                <div
                  key={d.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isSettled
                      ? 'bg-[#000000]/60 border-zinc-800/60 opacity-60'
                      : 'bg-[#000000] border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSettled
                        ? 'bg-zinc-800 text-zinc-400'
                        : isPositive
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                    }`}>
                      {isSettled ? <CheckCircle2 size={16} /> : isPositive ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-white">{d.description}</h5>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {d.date} • {d.type.replace('_', ' ').toUpperCase()} {isSettled ? '• (SETTLED)' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`font-mono font-bold text-sm block ${
                      isSettled ? 'text-zinc-500 line-through' : isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isPositive ? '+' : ''}${Math.abs(d.amount).toFixed(2)} {d.currency}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
