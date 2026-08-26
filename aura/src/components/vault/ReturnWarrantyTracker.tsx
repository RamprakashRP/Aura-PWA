import type { Reminder } from '../../lib/vaultApi';
import { format, differenceInDays } from 'date-fns';
import { 
  Package, 
  Clock, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  DollarSign,
  AlertTriangle,
  ShoppingBag
} from 'lucide-react';

interface ReturnWarrantyTrackerProps {
  items: Reminder[];
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function ReturnWarrantyTracker({
  items,
  onEdit,
  onDelete,
  onStatusChange,
}: ReturnWarrantyTrackerProps) {
  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return differenceInDays(target, today);
  };

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
          <Package size={28} />
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Return Windows or Warranties Tracked</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto' }}>
          Bought an item online with a 14-day or 30-day money-back guarantee? Track return deadlines so you never get stuck paying for things you intended to return!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
      {items.map((item) => {
        const daysLeft = getDaysUntil(item.renewalDate);
        const isUrgent = daysLeft <= 3 && daysLeft >= 0;
        const isExpired = daysLeft < 0;

        return (
          <div
            key={item.id}
            className="reminder-card"
            style={{
              borderColor: isUrgent ? 'rgba(244, 63, 94, 0.5)' : 'var(--border)',
            }}
          >
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(236, 72, 153, 0.15)',
                      color: '#f472b6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{item.title}</h3>
                    {item.issuerBank && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Merchant/Store: <b>{item.issuerBank}</b>
                      </span>
                    )}
                  </div>
                </div>

                {item.amount && (
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#6ee7b7',
                      padding: '0.25rem 0.625rem',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <DollarSign size={13} /> ${Number(item.amount).toFixed(2)} Refundable
                  </span>
                )}
              </div>

              {/* Urgency Badge */}
              <div
                style={{
                  background: isUrgent
                    ? 'rgba(244, 63, 94, 0.15)'
                    : isExpired
                    ? 'rgba(100, 116, 139, 0.15)'
                    : 'rgba(99, 102, 241, 0.1)',
                  border: isUrgent
                    ? '1px solid rgba(244, 63, 94, 0.3)'
                    : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0.75rem 0',
                }}
              >
                {isUrgent ? (
                  <AlertTriangle size={15} color="#fda4af" />
                ) : (
                  <Clock size={15} color="var(--text-muted)" />
                )}
                <span style={{ fontWeight: 600, color: isUrgent ? '#fda4af' : '#ffffff' }}>
                  {isExpired
                    ? 'Return window closed'
                    : daysLeft === 0
                    ? 'Last day to return TODAY!'
                    : daysLeft === 1
                    ? 'Last day to return TOMORROW!'
                    : `Return window closes in ${daysLeft} days`}
                </span>
              </div>

              {/* Dates and Order Info */}
              <div className="card-metrics">
                <div className="metric-row">
                  <span className="metric-label">Return Deadline:</span>
                  <span className="metric-value">{format(new Date(item.renewalDate), 'MMMM dd, yyyy')}</span>
                </div>
                {item.startDate && (
                  <div className="metric-row">
                    <span className="metric-label">Purchased On:</span>
                    <span className="metric-value">{format(new Date(item.startDate), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </div>

              {item.notes && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0', lineHeight: '1.4' }}>
                  <b>Order / Return Notes:</b> {item.notes}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="card-actions" style={{ marginTop: '1rem' }}>
              {(item.actionUrl || item.url) && (
                <a
                  href={item.actionUrl || item.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                >
                  <ExternalLink size={13} /> Order / Return Portal
                </a>
              )}

              <button
                type="button"
                onClick={() => onStatusChange(item.id, item.status === 'active' ? 'returned' : 'active')}
                className="btn btn-sm"
                style={{
                  background: item.status === 'returned' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border)',
                  color: item.status === 'returned' ? 'var(--accent-emerald)' : 'var(--text-main)',
                }}
              >
                <CheckCircle2 size={13} /> {item.status === 'returned' ? 'Returned' : 'Mark Returned'}
              </button>

              <button
                type="button"
                onClick={() => onEdit(item)}
                className="btn btn-secondary btn-sm"
              >
                <Edit3 size={13} /> Edit
              </button>

              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="btn btn-danger btn-sm"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
