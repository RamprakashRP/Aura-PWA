import type { Reminder } from '../../lib/vaultApi';
import { format, differenceInDays } from 'date-fns';
import { GraduationCap, CheckCircle, RotateCcw, Edit3, Trash2, CheckSquare, Square } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface FeeTransitionManagerProps {
  transitions: Reminder[];
  onToggleStep: (reminderId: string, milestoneId: string, completed: boolean) => void;
  onEdit: (item: Reminder) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onCreateNew?: () => void;
}

export function FeeTransitionManager({ transitions, onToggleStep, onEdit, onDelete, onStatusChange, onCreateNew }: FeeTransitionManagerProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return differenceInDays(target, today);
  };

  if (transitions.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-amber-400 flex items-center justify-center mx-auto shadow-xl">
          <GraduationCap size={26} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">No 1-Year Fee Transitions Tracked</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Free 1-year promotional bank accounts or student tier conversions? Get alerted 2 weeks before fees start so you can switch tiers or request a waiver.
          </p>
        </div>
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
          >
            + Add Fee Transition
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {transitions.map((item) => {
        const daysLeft = getDaysUntil(item.renewalDate);
        const milestones = item.milestones || [];

        return (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/30">
                  {item.issuerBank || 'Fee Expiry Transition'}
                </span>
                <span className="font-mono font-black text-amber-400 text-base">
                  Saves ~${Number(item.estimatedSavings || 144).toFixed(0)}/yr
                </span>
              </div>

              <h4 className="font-bold text-white text-base">{item.title}</h4>
              <span className="text-xs text-slate-400 block mt-0.5">
                Free Promo Ends: {format(new Date(item.renewalDate), 'MMM d, yyyy')} ({daysLeft >= 0 ? `${daysLeft} days left` : 'Expired'})
              </span>

              {item.notes && (
                <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 my-3">
                  💡 {item.notes}
                </p>
              )}

              {/* Step Checklist */}
              {milestones.length > 0 && (
                <div className="space-y-1.5 my-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  {milestones.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onToggleStep(item.id, m.id, !m.completed)}
                      className="w-full text-left flex items-start gap-2 text-xs text-slate-300 hover:text-white cursor-pointer group"
                    >
                      {m.completed ? (
                        <CheckSquare size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Square size={14} className="text-slate-500 flex-shrink-0 mt-0.5 group-hover:text-slate-300" />
                      )}
                      <span className={m.completed ? 'line-through text-slate-500' : ''}>{m.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => onStatusChange(item.id, item.status === 'active' ? 'completed' : 'active')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 flex items-center gap-1"
              >
                {item.status === 'active' ? <CheckCircle size={12} className="text-emerald-400" /> : <RotateCcw size={12} className="text-cyan-400" />}
                <span>{item.status === 'active' ? 'Converted' : 'Reactivate'}</span>
              </button>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <Edit3 size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-500/20"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
