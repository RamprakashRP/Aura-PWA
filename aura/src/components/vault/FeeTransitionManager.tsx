import type { Reminder, Milestone } from '../../lib/vaultApi';
import { format, differenceInDays } from 'date-fns';
import { 
  GraduationCap, 
  Clock, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  ShieldAlert, 
  DollarSign,
  FileText,
  Square,
  CheckSquare
} from 'lucide-react';

interface FeeTransitionManagerProps {
  transitions: Reminder[];
  onToggleStep: (reminderId: string, stepId: string, completed: boolean) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function FeeTransitionManager({
  transitions,
  onToggleStep,
  onEdit,
  onDelete,
  onStatusChange,
}: FeeTransitionManagerProps) {
  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return differenceInDays(target, today);
  };

  if (transitions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
          <GraduationCap size={28} />
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Fee Transitions or Waivers Tracked</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto' }}>
          Have a bank account that is only free for 1 year, a student account you need to renew, or an annual fee credit card to downgrade? Track transition dates and action checklists here to avoid hundreds in recurring fees!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
      {transitions.map((item) => {
        const daysLeft = getDaysUntil(item.renewalDate);
        const steps = (item.milestones as Milestone[]) || [];
        const completedSteps = steps.filter((s) => s.completed).length;
        const progressPct = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;
        const isUrgent = daysLeft <= 14;

        return (
          <div
            key={item.id}
            className="reminder-card"
            style={{
              borderColor: isUrgent ? 'rgba(245, 158, 11, 0.4)' : 'var(--border)',
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
            }}
          >
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--accent-amber)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{item.title}</h3>
                    {item.issuerBank && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Bank / Institution: <b>{item.issuerBank}</b>
                      </span>
                    )}
                  </div>
                </div>

                {item.estimatedSavings && (
                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#fde047',
                      padding: '0.25rem 0.625rem',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <DollarSign size={13} /> Saves ${Number(item.estimatedSavings).toFixed(0)}/yr
                  </span>
                )}
              </div>

              {/* Urgency Alert Callout */}
              <div
                style={{
                  background: isUrgent ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: isUrgent ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.625rem 0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  fontSize: '0.8125rem',
                  margin: '0.75rem 0',
                }}
              >
                {isUrgent ? <ShieldAlert size={16} color="#f59e0b" /> : <Clock size={16} color="var(--text-muted)" />}
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: isUrgent ? '#fde047' : '#ffffff' }}>
                    {daysLeft > 0 ? `Free period ends in ${daysLeft} days` : daysLeft === 0 ? 'Free period ends TODAY!' : 'Promo period ended!'}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Deadline: {format(new Date(item.renewalDate), 'MMMM dd, yyyy')}
                  </span>
                </div>
              </div>

              {/* Action Steps & Requirements Checklist */}
              {steps.length > 0 && (
                <div style={{ margin: '1rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                      Transition Steps ({completedSteps}/{steps.length})
                    </span>
                    <span style={{ color: progressPct === 100 ? 'var(--accent-emerald)' : 'var(--primary)', fontWeight: 700 }}>
                      {progressPct}% Done
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {steps.map((step) => (
                      <div
                        key={step.id}
                        onClick={() => onToggleStep(item.id, step.id, !step.completed)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.4rem 0.625rem',
                          borderRadius: 'var(--radius-sm)',
                          background: step.completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                          border: step.completed ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <div style={{ color: step.completed ? 'var(--accent-emerald)' : 'var(--text-subtle)' }}>
                          {step.completed ? <CheckSquare size={15} /> : <Square size={15} />}
                        </div>
                        <span
                          style={{
                            flex: 1,
                            color: step.completed ? 'var(--text-muted)' : '#ffffff',
                            textDecoration: step.completed ? 'line-through' : 'none',
                          }}
                        >
                          {step.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Instructions & Notes */}
              {item.notes && (
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.625rem 0.75rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    margin: '0.75rem 0',
                    lineHeight: '1.4',
                  }}
                >
                  <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FileText size={12} /> Notes & Checklist:
                  </p>
                  {item.notes}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="card-actions" style={{ marginTop: '1rem' }}>
              {(item.actionUrl || item.url) && (
                <a
                  href={item.actionUrl || item.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                >
                  <ExternalLink size={13} /> Bank Portal
                </a>
              )}

              <button
                type="button"
                onClick={() => onStatusChange(item.id, item.status === 'active' ? 'completed' : 'active')}
                className="btn btn-sm"
                style={{
                  background: item.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border)',
                  color: item.status === 'completed' ? 'var(--accent-emerald)' : 'var(--text-main)',
                }}
              >
                <CheckCircle2 size={13} /> {item.status === 'completed' ? 'Converted' : 'Mark Converted'}
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
