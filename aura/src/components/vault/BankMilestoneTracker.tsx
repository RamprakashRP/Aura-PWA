import type { Reminder } from '../../lib/vaultApi';
import { format, differenceInDays } from 'date-fns';
import { Landmark, CheckSquare, Square, Edit3, Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface BankMilestoneTrackerProps {
  offers: Reminder[];
  onToggleMilestone: (reminderId: string, milestoneId: string, completed: boolean) => void;
  onEdit: (offer: Reminder) => void;
  onDelete: (id: string) => void;
  onCreateNew?: () => void;
}

export function BankMilestoneTracker({ offers, onToggleMilestone, onEdit, onDelete, onCreateNew }: BankMilestoneTrackerProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return differenceInDays(target, today);
  };

  if (offers.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
          <Landmark size={26} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">No Bank Bonus Bounties Tracked</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Opening a new checking or savings account for a $300-$500 promotional bonus? Track direct deposit criteria and holding deadlines here.
          </p>
        </div>
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
          >
            + Add Bank Bonus Tracker
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {offers.map((offer) => {
        const daysLeft = getDaysUntil(offer.renewalDate);
        const milestones = offer.milestones || [];
        const completedCount = milestones.filter((m) => m.completed).length;
        const progressPct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

        return (
          <div
            key={offer.id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                  {offer.issuerBank || 'Promotional Offer'}
                </span>
                <span className="font-mono font-black text-emerald-400 text-base">
                  +${Number(offer.estimatedSavings || 0).toFixed(0)} Bonus
                </span>
              </div>

              <h4 className="font-bold text-white text-base">{offer.title}</h4>
              <span className="text-xs text-slate-400 block mt-0.5">
                Bonus Deadline: {format(new Date(offer.renewalDate), 'MMM d, yyyy')} ({daysLeft >= 0 ? `${daysLeft} days left` : 'Ended'})
              </span>

              {/* Progress Bar */}
              <div className="my-3">
                <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                  <span>Requirements Progress</span>
                  <span className="text-emerald-400 font-bold">{completedCount} of {milestones.length} Completed ({progressPct}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Milestone Checklist */}
              {milestones.length > 0 && (
                <div className="space-y-1.5 my-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  {milestones.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onToggleMilestone(offer.id, m.id, !m.completed)}
                      className="w-full text-left flex items-start gap-2 text-xs text-slate-300 hover:text-white cursor-pointer group"
                    >
                      {m.completed ? (
                        <CheckSquare size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
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
                onClick={() => onEdit(offer)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <Edit3 size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(offer.id)}
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
