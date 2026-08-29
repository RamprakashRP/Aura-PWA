import { useState } from 'react';
import type { Reminder } from '../../lib/vaultApi';
import { format, differenceInDays } from 'date-fns';
import { 
  CreditCard,
  Landmark,
  GraduationCap,
  Package,
  ExternalLink, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  RotateCcw, 
  Clock, 
  Search, 
  Filter, 
  Calendar, 
  AlertTriangle,
  Plus
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ReminderListProps {
  reminders: Reminder[];
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onCreateNew?: () => void;
}

export function ReminderList({ reminders, onEdit, onDelete, onStatusChange, onCreateNew }: ReminderListProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();

  const [filter, setFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');

  const filteredReminders = reminders
    .filter((reminder) => {
      const matchesStatus = filter === 'all' || reminder.status === filter;
      const matchesType = typeFilter === 'all' || reminder.reminderType === typeFilter;
      const matchesSearch =
        reminder.title.toLowerCase().includes(search.toLowerCase()) ||
        (reminder.description && reminder.description.toLowerCase().includes(search.toLowerCase())) ||
        (reminder.issuerBank && reminder.issuerBank.toLowerCase().includes(search.toLowerCase()));
      return matchesStatus && matchesType && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.paymentDueDate || a.renewalDate).getTime();
        const dateB = new Date(b.paymentDueDate || b.renewalDate).getTime();
        return dateA - dateB;
      }
      if (sortBy === 'amount') {
        return (Number(b.amount) || Number(b.estimatedSavings) || 0) - (Number(a.amount) || Number(a.estimatedSavings) || 0);
      }
      return a.title.localeCompare(b.title);
    });

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return differenceInDays(target, today);
  };

  const getUrgencyBadge = (days: number, status: string) => {
    if (status === 'cancelled' || status === 'returned' || status === 'completed') {
      return { 
        bg: 'bg-slate-800/80 text-zinc-400 border-zinc-700', 
        text: status.toUpperCase(), 
        icon: <CheckCircle size={12} /> 
      };
    }
    if (days < 0) {
      return { 
        bg: 'bg-rose-950/80 text-rose-300 border-rose-500/40', 
        text: 'Overdue / Passed', 
        icon: <AlertTriangle size={12} /> 
      };
    }
    if (days === 0) {
      return { 
        bg: 'bg-rose-600 text-white border-rose-500 animate-pulse', 
        text: 'Due Today!', 
        icon: <AlertTriangle size={12} /> 
      };
    }
    if (days === 1) {
      return { 
        bg: 'bg-rose-500/30 text-rose-300 border-rose-500/40', 
        text: 'Due Tomorrow!', 
        icon: <AlertTriangle size={12} /> 
      };
    }
    if (days <= 3) {
      return { 
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', 
        text: `In ${days} days`, 
        icon: <Clock size={12} /> 
      };
    }
    if (days <= 7) {
      return { 
        bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', 
        text: `In ${days} days`, 
        icon: <Clock size={12} /> 
      };
    }
    return { 
      bg: 'bg-slate-800/60 text-zinc-300 border-zinc-700', 
      text: `In ${days} days`, 
      icon: <Calendar size={12} /> 
    };
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard size={14} className="text-cyan-400" />;
      case 'bank_offer':
        return <Landmark size={14} className="text-emerald-400" />;
      case 'fee_transition':
        return <GraduationCap size={14} className="text-amber-400" />;
      case 'return_warranty':
        return <Package size={14} className="text-pink-400" />;
      default:
        return <Calendar size={14} className="text-rose-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-[#080808]/90 border border-zinc-800 backdrop-blur-xl flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search subscriptions, card due dates, bank bonuses, returns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#000000] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-zinc-700 transition-all"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#000000] border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="credit_card">💳 Credit Cards</option>
            <option value="bank_offer">🏦 Bank Bonuses</option>
            <option value="fee_transition">🎓 Fee Deadlines</option>
            <option value="return_warranty">📦 Return Windows</option>
            <option value="subscription">📅 Subscriptions</option>
          </select>

          {/* Status Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#000000] border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="cancelled">Archived</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'name')}
            className="bg-[#000000] border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="date">Sort: Soonest Due</option>
            <option value="amount">Sort: Highest Cost/Reward</option>
            <option value="name">Sort: Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Empty State or Grid */}
      {filteredReminders.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#080808]/50 border border-zinc-800/80 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-zinc-400 flex items-center justify-center mx-auto shadow-xl">
            <Filter size={26} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Reminders Found</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              {search || filter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search query or reset filter tags.'
                : 'Protect your money: add your credit card billing dates, bank bonuses, 1-year free checking conversions, return windows, or subscriptions.'}
            </p>
          </div>
          {onCreateNew && (
            <button
              type="button"
              onClick={onCreateNew}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all hover:scale-105 inline-flex items-center gap-1.5"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #b91c1c)` }}
            >
              <Plus size={14} />
              <span>+ Create First Reminder</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReminders.map((reminder) => {
            const targetDate = reminder.paymentDueDate || reminder.renewalDate;
            const daysUntil = getDaysUntil(targetDate);
            const urgency = getUrgencyBadge(daysUntil, reminder.status);

            return (
              <div
                key={reminder.id}
                className="p-5 rounded-2xl bg-[#0a0a0a]/95 border border-zinc-800 backdrop-blur-xl shadow-xl flex flex-col justify-between hover:border-zinc-700 transition-all group"
                style={{ opacity: reminder.status === 'cancelled' || reminder.status === 'completed' ? 0.75 : 1 }}
              >
                <div>
                  {/* Top Bar: Urgency badge & Type */}
                  <div className="flex justify-between items-center mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${urgency.bg}`}>
                      {urgency.icon}
                      <span>{urgency.text}</span>
                    </span>

                    <span className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 capitalize bg-[#000000] px-2 py-0.5 rounded-md border border-zinc-800">
                      {getTypeIcon(reminder.reminderType)}
                      <span>{reminder.reminderType.replace('_', ' ')}</span>
                    </span>
                  </div>

                  {/* Title & Bank */}
                  <h4 className="font-bold text-white text-base group-hover:text-rose-400 transition-colors">
                    {reminder.title}
                  </h4>
                  {reminder.issuerBank && (
                    <span className="text-xs text-zinc-400 mt-0.5 block">
                      {reminder.issuerBank} {reminder.last4Digits ? `• (••• ${reminder.last4Digits})` : ''}
                    </span>
                  )}

                  {/* Description / Notes */}
                  {(reminder.description || reminder.notes) && (
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2 bg-[#050505]/60 p-2 rounded-lg border border-zinc-800/60">
                      {reminder.description || reminder.notes}
                    </p>
                  )}

                  {/* Financial Value (Amount or Estimated Savings) */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                        {reminder.estimatedSavings ? 'Potential Savings' : 'Amount Due'}
                      </span>
                      <span className="font-mono font-black text-sm text-white">
                        {reminder.estimatedSavings
                          ? `+$${Number(reminder.estimatedSavings).toFixed(2)}`
                          : reminder.amount
                          ? `$${Number(reminder.amount).toFixed(2)} ${reminder.currency || 'CAD'}`
                          : '—'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Target Deadline</span>
                      <span className="font-mono font-semibold text-xs text-zinc-300">
                        {format(new Date(targetDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-zinc-800">
                  {reminder.actionUrl && (
                    <a
                      href={reminder.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 text-zinc-400 hover:text-white"
                      title="Open Direct Portal Link"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => onStatusChange(reminder.id, reminder.status === 'active' ? 'completed' : 'active')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] font-semibold text-zinc-300 hover:bg-slate-700 flex items-center gap-1"
                  >
                    {reminder.status === 'active' ? (
                      <>
                        <CheckCircle size={12} className="text-emerald-400" /> Done
                      </>
                    ) : (
                      <>
                        <RotateCcw size={12} className="text-cyan-400" /> Reactivate
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(reminder)}
                    className="p-1.5 rounded-lg bg-slate-800 text-zinc-400 hover:text-white"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(reminder.id)}
                    className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-500/20"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
