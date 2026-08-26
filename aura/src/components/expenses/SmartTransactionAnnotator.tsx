import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Tag, Zap } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface UnannotatedTx {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  payment_method?: string;
  notes?: string;
  tags?: string[];
  created_at?: string;
}

export function SmartTransactionAnnotator() {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [recentTx, setRecentTx] = useState<UnannotatedTx | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const QUICK_TAGS = ['#Personal', '#WorkExpense', '#Groceries', '#WithFriends', '#Treat', '#SplitBill', '#Family'];

  useEffect(() => {
    fetchRecentUnannotated();
  }, []);

  const fetchRecentUnannotated = async () => {
    try {
      // 1. Check local mock storage fallback
      const localTxs = JSON.parse(localStorage.getItem('aura_mock_transactions') || '[]');
      const unannotated = localTxs.find((tx: any) => !tx.notes && tx.amount > 0);
      if (unannotated) {
        setRecentTx(unannotated);
        return;
      }

      // 2. Check Supabase
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data && data.length > 0) {
        const found = data.find((tx: any) => !tx.notes);
        if (found) {
          setRecentTx({
            id: found.id || found.transaction_id,
            description: found.description,
            amount: found.amount,
            currency: found.currency || 'CAD',
            category: found.category || 'Miscellaneous',
            date: found.date,
            payment_method: found.payment_method,
            notes: found.notes,
          });
        }
      }
    } catch (e) {
      console.warn('Annotator fetch:', e);
    }
  };

  const handleSaveNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!recentTx) return;

    setIsSaving(true);
    const combinedNote = selectedTag ? `${noteInput} ${selectedTag}`.trim() : noteInput.trim();

    try {
      // 1. Update Supabase
      await supabase
        .from('transactions')
        .update({ notes: combinedNote || 'Annotated' })
        .eq('id', recentTx.id);

      // 2. Update local mock
      const localTxs = JSON.parse(localStorage.getItem('aura_mock_transactions') || '[]');
      const updated = localTxs.map((t: any) =>
        t.id === recentTx.id ? { ...t, notes: combinedNote } : t
      );
      localStorage.setItem('aura_mock_transactions', JSON.stringify(updated));

      setIsDismissed(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!recentTx || isDismissed) {
    return null;
  }

  return (
    <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0a0f1a] to-slate-900 border border-slate-700/80 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-400">
      {/* Glow highlight line */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, ${auraColor}, #e1143d)` }}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0"
            style={{ backgroundColor: `${auraColor}25`, borderColor: auraColor, color: auraColor }}
          >
            <Zap size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white tracking-tight">
                New Payment Intercepted: {recentTx.description}
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                ${Math.abs(recentTx.amount).toFixed(2)} {recentTx.currency}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              What was this purchase for? (Adds context to your monthly budget)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-md text-slate-500 hover:text-white self-end md:self-auto cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Input Form & Quick Tag Pills */}
      <form onSubmit={handleSaveNote} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="e.g. Iced coffee with Sarah, Birthday party snacks, Winter boots..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg cursor-pointer hover:scale-105 transition-all flex items-center gap-1.5 flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
          >
            <Check size={14} />
            <span>{isSaving ? 'Saving...' : 'Add Note'}</span>
          </button>
        </div>

        {/* Quick Tag Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1 flex items-center gap-1">
            <Tag size={10} /> Quick Tags:
          </span>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                selectedTag === tag
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
