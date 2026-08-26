import type { Reminder, Milestone } from '../../lib/vaultApi';
import { format, differenceInDays } from 'date-fns';
import { Landmark, CheckSquare, Square, Gift, Clock, ExternalLink, Edit3, Trash2 } from 'lucide-react';

interface BankMilestoneTrackerProps {
  offers: Reminder[];
  onToggleMilestone: (reminderId: string, milestoneId: string, completed: boolean) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}

export function BankMilestoneTracker({
  offers,
  onToggleMilestone,
  onEdit,
  onDelete,
}: BankMilestoneTrackerProps) {
  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return differenceInDays(target, today);
  };

  if (offers.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Landmark size={28} />
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Bank Offers or Milestone Tasks</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto' }}>
          Opened a new bank account for a bonus or promotional offer? Track all requirements (direct deposits, card spends, balance minimums) and never miss a payout!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
      {offers.map((offer) => {
        const milestones = (offer.milestones as Milestone[]) || [];
        const completedCount = milestones.filter((m) => m.completed).length;
        const progressPct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
        const daysLeft = getDaysUntil(offer.renewalDate);

        return (
          <div key={offer.id} className="reminder-card" style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}>
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: 'var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Landmark size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{offer.title}</h3>
                    {offer.issuerBank && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{offer.issuerBank}</span>
                    )}
                  </div>
                </div>

                {offer.estimatedSavings && (
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
                    <Gift size={13} /> +${Number(offer.estimatedSavings).toFixed(0)} Bonus
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div style={{ margin: '1rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Tasks Completed ({completedCount}/{milestones.length})
                  </span>
                  <span style={{ fontWeight: 700, color: progressPct === 100 ? 'var(--accent-emerald)' : 'var(--primary)' }}>
                    {progressPct}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPct}%`,
                      background: progressPct === 100 ? 'var(--accent-emerald)' : 'linear-gradient(90deg, var(--primary), var(--secondary))',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Milestone Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}>
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onToggleMilestone(offer.id, m.id, !m.completed)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.625rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: m.completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      border: m.completed ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                  >
                    <div style={{ marginTop: '2px', color: m.completed ? 'var(--accent-emerald)' : 'var(--text-subtle)' }}>
                      {m.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          color: m.completed ? 'var(--text-muted)' : '#ffffff',
                          textDecoration: m.completed ? 'line-through' : 'none',
                        }}
                      >
                        {m.title}
                      </span>
                      {m.notes && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                          {m.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Deadline & Target */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Clock size={13} /> Complete By:
                </span>
                <span style={{ fontWeight: 600, color: daysLeft <= 7 ? '#fde047' : '#ffffff' }}>
                  {format(new Date(offer.renewalDate), 'MMM dd, yyyy')} ({daysLeft >= 0 ? `${daysLeft} days left` : 'Expired'})
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="card-actions" style={{ marginTop: '1rem' }}>
              {offer.actionUrl || offer.url ? (
                <a
                  href={offer.actionUrl || offer.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                >
                  <ExternalLink size={13} /> Bank Portal
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => onEdit(offer)}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
              >
                <Edit3 size={13} /> Edit Tasks
              </button>
              <button
                type="button"
                onClick={() => onDelete(offer.id)}
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
