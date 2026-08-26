import type { Reminder } from '../../lib/vaultApi';
import { format, differenceInDays } from 'date-fns';
import { Package, CheckCircle, RotateCcw, Edit3, Trash2, ExternalLink } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ReturnWarrantyTrackerProps {
  items: Reminder[];
  onEdit: (item: Reminder) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onCreateNew?: () => void;
}

export function ReturnWarrantyTracker({ items, onEdit, onDelete, onStatusChange, onCreateNew }: ReturnWarrantyTrackerProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return differenceInDays(target, today);
  };

  if (items.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-pink-400 flex items-center justify-center mx-auto shadow-xl">
          <Package size={26} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">No Return Windows Tracked</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Bought something on Amazon, Best Buy, or Apple? Track 14-day and 30-day return windows so you never get stuck with unwanted items.
          </p>
        </div>
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
          >
            + Track Return Window
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => {
        const daysLeft = getDaysUntil(item.renewalDate);

        return (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-pink-950/60 text-pink-300 border border-pink-500/30">
                  {item.issuerBank || 'Store Purchase'}
                </span>
                <span className="font-mono font-black text-pink-300 text-base">
                  ${Number(item.amount || 0).toFixed(2)} {item.currency || 'CAD'}
                </span>
              </div>

              <h4 className="font-bold text-white text-base">{item.title}</h4>
              <span className="text-xs text-slate-400 block mt-0.5">
                Return Deadline: {format(new Date(item.renewalDate), 'MMM d, yyyy')} ({daysLeft >= 0 ? `${daysLeft} days remaining` : 'Window Closed'})
              </span>

              {item.notes && (
                <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 my-3">
                  📦 {item.notes}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-800">
              {item.actionUrl && (
                <a
                  href={item.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <ExternalLink size={14} />
                </a>
              )}
              <button
                type="button"
                onClick={() => onStatusChange(item.id, item.status === 'active' ? 'returned' : 'active')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 flex items-center gap-1"
              >
                {item.status === 'active' ? <CheckCircle size={12} className="text-emerald-400" /> : <RotateCcw size={12} className="text-cyan-400" />}
                <span>{item.status === 'active' ? 'Returned' : 'Reactivate'}</span>
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
