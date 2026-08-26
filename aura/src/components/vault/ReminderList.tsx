import { useState } from 'react';
import type { Reminder } from '../../lib/vaultApi';
import { format, differenceInDays } from 'date-fns';
import { 
  Tv, 
  Zap, 
  Globe, 
  Key, 
  Server, 
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
  CheckSquare
} from 'lucide-react';

interface ReminderListProps {
  reminders: Reminder[];
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function ReminderList({ reminders, onEdit, onDelete, onStatusChange }: ReminderListProps) {
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
      return { className: 'urgency-badge expired', text: status.toUpperCase(), icon: <CheckCircle size={13} /> };
    }
    if (days < 0) {
      return { className: 'urgency-badge expired', text: 'Overdue / Passed', icon: <AlertTriangle size={13} /> };
    }
    if (days === 0) {
      return { className: 'urgency-badge urgent', text: 'Due Today!', icon: <AlertTriangle size={13} /> };
    }
    if (days === 1) {
      return { className: 'urgency-badge urgent', text: 'Due Tomorrow!', icon: <AlertTriangle size={13} /> };
    }
    if (days <= 3) {
      return { className: 'urgency-badge warning', text: `In ${days} days`, icon: <Clock size={13} /> };
    }
    if (days <= 7) {
      return { className: 'urgency-badge upcoming', text: `In ${days} days`, icon: <Clock size={13} /> };
    }
    return { className: 'urgency-badge safe', text: `In ${days} days`, icon: <Calendar size={13} /> };
  };

  const getTypeIcon = (type: string, category?: string | null) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard size={14} style={{ color: 'var(--accent-cyan)' }} />;
      case 'bank_offer':
        return <Landmark size={14} style={{ color: 'var(--accent-emerald)' }} />;
      case 'fee_transition':
        return <GraduationCap size={14} style={{ color: 'var(--accent-amber)' }} />;
      case 'return_warranty':
        return <Package size={14} style={{ color: '#ff4d6d' }} />;
      default:
        if (category === 'trial') return <Zap size={14} style={{ color: 'var(--accent-amber)' }} />;
        if (category === 'domain') return <Globe size={14} style={{ color: 'var(--accent-cyan)' }} />;
        if (category === 'license') return <Key size={14} style={{ color: '#a855f7' }} />;
        if (category === 'cloud') return <Server size={14} style={{ color: '#38bdf8' }} />;
        return <Tv size={14} style={{ color: 'var(--crimson-primary)' }} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit_card': return 'Credit Card';
      case 'bank_offer': return 'Bank Offer';
      case 'fee_transition': return 'Fee Expiry';
      case 'return_warranty': return 'Return Window';
      default: return 'Subscription';
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Search & Filter Toolbar */}
      <div className="toolbar-container">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search subscriptions, credit cards, bank bonuses, returns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="select-control"
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
            className="select-control"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="cancelled">Archived / Cancelled</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'name')}
            className="select-control"
          >
            <option value="date">Sort: Soonest Due</option>
            <option value="amount">Sort: Highest Cost/Reward</option>
            <option value="name">Sort: Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Grid of Reminder Cards */}
      {filteredReminders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Filter size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No matching items found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
            {search || filter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search query or reset filter tags.'
              : 'Add your first credit card, bank bonus, return window, or subscription!'}
          </p>
        </div>
      ) : (
        <div className="reminders-grid">
          {filteredReminders.map((reminder) => {
            const targetDate = reminder.paymentDueDate || reminder.renewalDate;
            const daysUntil = getDaysUntil(targetDate);
            const urgency = getUrgencyBadge(daysUntil, reminder.status);

            return (
              <div
                key={reminder.id}
                className="reminder-card"
                style={{ opacity: reminder.status === 'cancelled' || reminder.status === 'completed' ? 0.75 : 1 }}
              >
                <div>
                  {/* Top Bar */}
                  <div className="card-top">
                    <span className="card-category-tag">
                      {getTypeIcon(reminder.reminderType, reminder.category)}
                      <span>{getTypeLabel(reminder.reminderType)}</span>
                    </span>

                    <span className={urgency.className}>
                      {urgency.icon}
                      <span>{urgency.text}</span>
                    </span>
                  </div>

                  {/* Title & Bank details */}
                  <h3 className="card-title">{reminder.title}</h3>
                  {reminder.issuerBank && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                      {reminder.reminderType === 'return_warranty' ? 'Store: ' : 'Bank: '}
                      <b style={{ color: 'var(--text-main)' }}>{reminder.issuerBank}</b>{' '}
                      {reminder.last4Digits ? `(••• ${reminder.last4Digits})` : ''}
                    </div>
                  )}

                  {reminder.description && <p className="card-desc">{reminder.description}</p>}

                  {/* Metrics Box */}
                  <div className="card-metrics">
                    {reminder.reminderType === 'credit_card' ? (
                      <>
                        {reminder.statementDate && (
                          <div className="metric-row">
                            <span className="metric-label">Statement Close:</span>
                            <span className="metric-value">{format(new Date(reminder.statementDate), 'MMM dd')}</span>
                          </div>
                        )}
                        <div className="metric-row">
                          <span className="metric-label"><Clock size={13} /> Payment Due:</span>
                          <span className="metric-value" style={{ color: daysUntil <= 3 ? '#ff4d6d' : '#ffffff', fontWeight: 700 }}>
                            {format(new Date(targetDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        {reminder.amount && (
                          <div className="metric-row">
                            <span className="metric-label">Statement Balance:</span>
                            <span className="amount-highlight">${Number(reminder.amount).toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    ) : reminder.reminderType === 'bank_offer' ? (
                      <>
                        <div className="metric-row">
                          <span className="metric-label"><Calendar size={13} /> Target Deadline:</span>
                          <span className="metric-value">{format(new Date(targetDate), 'MMM dd, yyyy')}</span>
                        </div>
                        {reminder.estimatedSavings && (
                          <div className="metric-row">
                            <span className="metric-label">Bonus Reward:</span>
                            <span className="amount-highlight" style={{ color: 'var(--accent-emerald)' }}>
                              +${Number(reminder.estimatedSavings).toFixed(0)}
                            </span>
                          </div>
                        )}
                        {reminder.milestones && (
                          <div className="metric-row">
                            <span className="metric-label"><CheckSquare size={13} /> Tasks:</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {reminder.milestones.filter((m) => m.completed).length} / {reminder.milestones.length} Done
                            </span>
                          </div>
                        )}
                      </>
                    ) : reminder.reminderType === 'fee_transition' ? (
                      <>
                        <div className="metric-row">
                          <span className="metric-label"><Calendar size={13} /> Fee Cutoff Date:</span>
                          <span className="metric-value">{format(new Date(targetDate), 'MMM dd, yyyy')}</span>
                        </div>
                        {reminder.estimatedSavings && (
                          <div className="metric-row">
                            <span className="metric-label">Fee Avoided:</span>
                            <span className="amount-highlight" style={{ color: 'var(--accent-amber)' }}>
                              ${Number(reminder.estimatedSavings).toFixed(0)}/yr
                            </span>
                          </div>
                        )}
                      </>
                    ) : reminder.reminderType === 'return_warranty' ? (
                      <>
                        <div className="metric-row">
                          <span className="metric-label"><Clock size={13} /> Return Deadline:</span>
                          <span className="metric-value" style={{ color: daysUntil <= 3 ? '#ff4d6d' : '#ffffff', fontWeight: 700 }}>
                            {format(new Date(targetDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        {reminder.amount && (
                          <div className="metric-row">
                            <span className="metric-label">Refundable Sum:</span>
                            <span className="amount-highlight" style={{ color: 'var(--accent-emerald)' }}>
                              ${Number(reminder.amount).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="metric-row">
                          <span className="metric-label"><Calendar size={13} /> Renewal Date:</span>
                          <span className="metric-value">{format(new Date(targetDate), 'MMM dd, yyyy')}</span>
                        </div>
                        {reminder.amount !== undefined && reminder.amount !== null && (
                          <div className="metric-row">
                            <span className="metric-label">Cost ({reminder.billingCycle || 'cycle'}):</span>
                            <span className="amount-highlight">${Number(reminder.amount).toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Action Toolbar */}
                <div className="card-actions">
                  {(reminder.actionUrl || reminder.url) && (
                    <a
                      href={reminder.actionUrl || reminder.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                    >
                      <ExternalLink size={13} /> Portal
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => onEdit(reminder)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Edit3 size={13} /> Edit
                  </button>

                  {reminder.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => onStatusChange(reminder.id, 'cancelled')}
                      className="btn btn-outline btn-sm"
                      title="Archive or mark completed"
                    >
                      <CheckCircle size={13} style={{ color: 'var(--accent-emerald)' }} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStatusChange(reminder.id, 'active')}
                      className="btn btn-outline btn-sm"
                      title="Reactivate"
                    >
                      <RotateCcw size={13} style={{ color: 'var(--crimson-primary)' }} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onDelete(reminder.id)}
                    className="btn btn-danger btn-sm"
                    title="Delete entry"
                  >
                    <Trash2 size={13} />
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
