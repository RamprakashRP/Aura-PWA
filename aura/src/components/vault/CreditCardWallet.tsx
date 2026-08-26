import type { Reminder } from '../../lib/vaultApi';
import { format, differenceInDays } from 'date-fns';
import { CreditCard, ExternalLink, Edit3 } from 'lucide-react';

interface CreditCardWalletProps {
  cards: Reminder[];
  onEdit: (reminder: Reminder) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function CreditCardWallet({ cards, onEdit }: CreditCardWalletProps) {
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
    if (b.includes('chase')) return 'linear-gradient(135deg, #1e3a8a, #0284c7)';
    if (b.includes('amex') || b.includes('american express')) return 'linear-gradient(135deg, #047857, #10b981)';
    if (b.includes('citi')) return 'linear-gradient(135deg, #1d4ed8, #ef4444)';
    if (b.includes('capital one')) return 'linear-gradient(135deg, #b91c1c, #d97706)';
    if (b.includes('discover')) return 'linear-gradient(135deg, #ea580c, #f59e0b)';
    if (b.includes('wells fargo')) return 'linear-gradient(135deg, #991b1b, #dc2626)';
    if (b.includes('apple')) return 'linear-gradient(135deg, #374151, #1f2937)';
    return 'linear-gradient(135deg, #6366f1, #a855f7)';
  };

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <CreditCard size={28} />
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Credit Cards Added Yet</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
          Track your credit card statement generation dates and payment due dates to never miss a payment or incur interest!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
      {cards.map((card) => {
        const daysUntilDue = getDaysUntil(card.paymentDueDate || card.renewalDate);
        const daysUntilStatement = getDaysUntil(card.statementDate);
        const isUrgent = daysUntilDue !== null && daysUntilDue <= 3;

        return (
          <div
            key={card.id}
            style={{
              borderRadius: 'var(--radius-lg)',
              background: getBankGradient(card.issuerBank),
              padding: '1.5rem',
              color: '#ffffff',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '220px',
              border: isUrgent ? '2px solid #fda4af' : '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {/* Card Top */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
                  {card.issuerBank || 'Credit Card'}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem', color: '#ffffff' }}>
                  {card.title}
                </h3>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                <CreditCard size={20} />
              </div>
            </div>

            {/* Middle: Last 4 & Balance */}
            <div style={{ margin: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', letterSpacing: '0.15em' }}>
                  •••• •••• •••• {card.last4Digits || '••••'}
                </span>
                {card.amount && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', opacity: 0.8, display: 'block' }}>Statement Balance</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                      ${Number(card.amount).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Deadlines Section */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.625rem 0.875rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8125rem',
              }}
            >
              {card.statementDate && (
                <div>
                  <span style={{ opacity: 0.75, fontSize: '0.7rem', display: 'block' }}>Bill Generates</span>
                  <span style={{ fontWeight: 600 }}>
                    {format(new Date(card.statementDate), 'MMM dd')}
                    {daysUntilStatement !== null && ` (${daysUntilStatement}d)`}
                  </span>
                </div>
              )}

              <div>
                <span style={{ opacity: 0.75, fontSize: '0.7rem', display: 'block' }}>Payment Due</span>
                <span style={{ fontWeight: 700, color: isUrgent ? '#fde047' : '#ffffff' }}>
                  {format(new Date(card.paymentDueDate || card.renewalDate), 'MMM dd')}
                  {daysUntilDue !== null && (
                    <span style={{ marginLeft: '0.25rem' }}>
                      {daysUntilDue === 0 ? '(TODAY!)' : `(in ${daysUntilDue}d)`}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              {card.url && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{ flex: 1, background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', border: 'none' }}
                >
                  <ExternalLink size={13} /> Pay / Portal
                </a>
              )}
              <button
                type="button"
                onClick={() => onEdit(card)}
                className="btn btn-sm"
                style={{ flex: 1, background: 'rgba(0, 0, 0, 0.25)', color: '#ffffff', border: 'none' }}
              >
                <Edit3 size={13} /> Edit
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
