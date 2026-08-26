import type { Reminder } from '../../lib/vaultApi';
import { format, differenceInDays } from 'date-fns';
import { CreditCard, ExternalLink, Edit3 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface CreditCardWalletProps {
  cards: Reminder[];
  onEdit: (reminder: Reminder) => void;
  onStatusChange: (id: string, status: string) => void;
  onCreateNew?: () => void;
}

export function CreditCardWallet({ cards, onEdit, onCreateNew }: CreditCardWalletProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const getDaysUntil = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return differenceInDays(target, today);
  };

  const getBankGradient = (bank?: string | null) => {
    const b = (bank || '').toLowerCase();
    if (b.includes('td')) return 'linear-gradient(135deg, #008a00, #047857)';
    if (b.includes('rbc')) return 'linear-gradient(135deg, #0051a5, #1d4ed8)';
    if (b.includes('scotia')) return 'linear-gradient(135deg, #ec111a, #991b1b)';
    if (b.includes('bmo')) return 'linear-gradient(135deg, #0079c1, #1e3a8a)';
    if (b.includes('cibc')) return 'linear-gradient(135deg, #8b1d41, #4c0519)';
    if (b.includes('tangerine')) return 'linear-gradient(135deg, #ea7024, #c2410c)';
    if (b.includes('chase')) return 'linear-gradient(135deg, #1e3a8a, #0284c7)';
    if (b.includes('amex') || b.includes('american express')) return 'linear-gradient(135deg, #065f46, #047857)';
    return 'linear-gradient(135deg, #334155, #1e293b)';
  };

  if (cards.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-cyan-400 flex items-center justify-center mx-auto shadow-xl">
          <CreditCard size={26} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">No Credit Card Due Dates Tracked Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Never miss a payment or credit card statement cycle date. Track dual deadlines: Statement Closing Date and Payment Due Date.
          </p>
        </div>
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
          >
            + Add First Credit Card
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card) => {
        const daysUntilDue = getDaysUntil(card.paymentDueDate || card.renewalDate);
        const daysUntilStatement = getDaysUntil(card.statementDate);
        const cardGradient = getBankGradient(card.issuerBank);

        return (
          <div
            key={card.id}
            className="rounded-2xl p-5 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[220px] border border-white/10"
            style={{ background: cardGradient }}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  {card.issuerBank || 'Credit Card'}
                </span>
                <h4 className="text-lg font-black tracking-tight mt-0.5">{card.title}</h4>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-[11px] font-mono font-bold">
                •••• {card.last4Digits || '0000'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-xl bg-black/25 backdrop-blur-md border border-white/10 text-xs">
              <div>
                <span className="text-[10px] text-white/70 uppercase font-bold block">Statement Date</span>
                <span className="font-mono font-bold text-sm">
                  {card.statementDate ? format(new Date(card.statementDate), 'MMM d') : '—'}
                </span>
                {daysUntilStatement !== null && (
                  <span className="text-[10px] text-white/60 block mt-0.5">
                    {daysUntilStatement >= 0 ? `in ${daysUntilStatement}d` : 'Closed'}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-white/70 uppercase font-bold block">Payment Due</span>
                <span className="font-mono font-black text-sm text-rose-200">
                  {card.paymentDueDate || card.renewalDate ? format(new Date(card.paymentDueDate || card.renewalDate), 'MMM d, yyyy') : '—'}
                </span>
                {daysUntilDue !== null && (
                  <span className="text-[10px] font-bold text-amber-200 block mt-0.5">
                    {daysUntilDue === 0 ? 'Due Today!' : daysUntilDue > 0 ? `Due in ${daysUntilDue} days` : 'Past due'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/15">
              <div>
                <span className="text-[10px] text-white/70 uppercase font-bold block">Balance Due</span>
                <span className="font-mono font-black text-base">
                  ${Number(card.amount || 0).toFixed(2)} {card.currency || 'CAD'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {card.actionUrl && (
                  <a
                    href={card.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <span>Pay Bill</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(card)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
