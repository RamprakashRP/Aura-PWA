import React, { useState } from 'react';
import type { CreateReminderInput, ReminderType, Milestone } from '../../lib/vaultApi';
import { 
  CreditCard, 
  Landmark, 
  GraduationCap, 
  Tv, 
  Package,
  CheckCircle2, 
  Plus, 
  Trash2,
  Clock,
  Sparkles
} from 'lucide-react';

interface ReminderFormProps {
  initialData?: Partial<CreateReminderInput>;
  onSubmit: (data: CreateReminderInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ReminderForm({ initialData, onSubmit, onCancel, submitLabel = 'Save Item' }: ReminderFormProps) {
  const [reminderType, setReminderType] = useState<ReminderType>(
    initialData?.reminderType || 'subscription'
  );

  const getFormattedDate = (dateVal?: string | null, daysOffset = 30) => {
    if (!dateVal) {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().split('T')[0];
    }
    return dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
  };

  const [formData, setFormData] = useState<CreateReminderInput>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || 'subscription',
    reminderType: initialData?.reminderType || 'subscription',
    startDate: initialData?.startDate ? getFormattedDate(initialData.startDate, 0) : getFormattedDate(null, 0),
    renewalDate: getFormattedDate(initialData?.renewalDate, 30),
    statementDate: getFormattedDate(initialData?.statementDate, 15),
    paymentDueDate: getFormattedDate(initialData?.paymentDueDate, 35),
    issuerBank: initialData?.issuerBank || '',
    last4Digits: initialData?.last4Digits || '',
    milestones: initialData?.milestones || [
      { id: '1', title: 'Get student proof / enrollment document', completed: false },
      { id: '2', title: 'Visit branch or message support to switch tier', completed: false },
      { id: '3', title: 'Confirm zero-maintenance fee waiver applied', completed: false },
    ],
    estimatedSavings: initialData?.estimatedSavings || undefined,
    actionUrl: initialData?.actionUrl || initialData?.url || '',
    remindDaysBefore: initialData?.remindDaysBefore && initialData.remindDaysBefore.length > 0
      ? initialData.remindDaysBefore
      : [14, 7, 2, 1],
    amount: initialData?.amount ? Number(initialData.amount) : undefined,
    currency: initialData?.currency || 'USD',
    billingCycle: initialData?.billingCycle || 'monthly',
    autoRenew: initialData?.autoRenew !== undefined ? initialData.autoRenew : true,
    url: initialData?.url || '',
    notes: initialData?.notes || '',
    tags: initialData?.tags || [],
  });

  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTypeChange = (type: ReminderType) => {
    setReminderType(type);
    setFormData((prev) => ({
      ...prev,
      reminderType: type,
      category: type === 'credit_card' ? 'credit_card' : type === 'bank_offer' ? 'bank' : type === 'fee_transition' ? 'student_fee' : type === 'return_warranty' ? 'return' : prev.category,
    }));
  };

  const applyFeePreset = (presetType: 'student_switch' | 'card_retention' | 'promo_close') => {
    const today = new Date();
    if (presetType === 'student_switch') {
      const oneYear = new Date(today);
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      setFormData((prev) => ({
        ...prev,
        title: 'Checking Account (Switch to Student Tier)',
        issuerBank: 'Bank of America / Chase',
        renewalDate: oneYear.toISOString().split('T')[0],
        estimatedSavings: 144,
        notes: 'Free 1-year period ends! Bring student ID or proof of enrollment to branch to convert to student checking to avoid $12/month fee.',
        milestones: [
          { id: '1', title: 'Download student enrollment verification PDF', completed: false },
          { id: '2', title: 'Visit bank branch or submit student verification online', completed: false },
          { id: '3', title: 'Verify monthly maintenance fee is $0 on next statement', completed: false },
        ],
        remindDaysBefore: [30, 14, 7, 2],
      }));
    } else if (presetType === 'card_retention') {
      const elevenMonths = new Date(today);
      elevenMonths.setMonth(elevenMonths.getMonth() + 11);
      setFormData((prev) => ({
        ...prev,
        title: 'Credit Card Annual Fee Waiver / Downgrade',
        issuerBank: 'Chase / Amex / Capital One',
        renewalDate: elevenMonths.toISOString().split('T')[0],
        estimatedSavings: 95,
        notes: 'Call retention department before $95 annual fee posts. Ask: "Are there any retention offers or fee waivers on my account? Otherwise I would like to downgrade to a no-fee card."',
        milestones: [
          { id: '1', title: 'Call number on back of card (ask for Retention Dept)', completed: false },
          { id: '2', title: 'Request annual fee waiver or downgrade to no-annual-fee tier', completed: false },
        ],
        remindDaysBefore: [30, 14, 3],
      }));
    } else if (presetType === 'promo_close') {
      const sixMonths = new Date(today);
      sixMonths.setMonth(sixMonths.getMonth() + 6);
      setFormData((prev) => ({
        ...prev,
        title: 'Close Promo Account Before Inactivity/Fee',
        issuerBank: 'Promotional Bank',
        renewalDate: sixMonths.toISOString().split('T')[0],
        estimatedSavings: 60,
        notes: 'Bonus received! Transfer out remaining funds and close account before monthly fees start.',
        milestones: [
          { id: '1', title: 'Confirm promotional bonus has been deposited', completed: false },
          { id: '2', title: 'Transfer remaining balance back to primary account', completed: false },
          { id: '3', title: 'Call or message bank to close account cleanly', completed: false },
        ],
        remindDaysBefore: [14, 7, 2],
      }));
    }
  };

  const applyReturnPreset = (days: number, name: string) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFormData((prev) => ({
      ...prev,
      title: name,
      renewalDate: d.toISOString().split('T')[0],
      remindDaysBefore: [5, 2, 1],
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleRemindDaysToggle = (day: number) => {
    const current = formData.remindDaysBefore || [2, 1];
    let updated: number[];
    if (current.includes(day)) {
      updated = current.filter((d) => d !== day);
      if (updated.length === 0) updated = [day];
    } else {
      updated = [...current, day].sort((a, b) => b - a);
    }
    setFormData((prev) => ({ ...prev, remindDaysBefore: updated }));
  };

  const addMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    const newM: Milestone = {
      id: Date.now().toString(),
      title: newMilestoneTitle.trim(),
      completed: false,
    };
    setFormData((prev) => ({
      ...prev,
      milestones: [...(prev.milestones || []), newM],
    }));
    setNewMilestoneTitle('');
  };

  const removeMilestone = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      milestones: (prev.milestones || []).filter((m) => m.id !== id),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title or Card/Account name is required';

    if (reminderType === 'credit_card' && !formData.paymentDueDate && !formData.renewalDate) {
      newErrors.paymentDueDate = 'Payment due date is required';
    } else if (!formData.renewalDate) {
      newErrors.renewalDate = 'Target date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: CreateReminderInput = {
        ...formData,
        reminderType,
        renewalDate: formData.renewalDate || formData.paymentDueDate || new Date().toISOString(),
      };
      await onSubmit(payload);
    } catch (error) {
      console.error('Failed to submit reminder:', error);
      alert('Failed to save reminder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remindDays = formData.remindDaysBefore || [2, 1];

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Type Selector Tabs */}
      <div>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
          Choose What You Want to Track & Save On:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${reminderType === 'credit_card' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleTypeChange('credit_card')}
            style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem' }}
          >
            <CreditCard size={14} /> Credit Card
          </button>
          <button
            type="button"
            className={`btn btn-sm ${reminderType === 'bank_offer' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleTypeChange('bank_offer')}
            style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem' }}
          >
            <Landmark size={14} /> Bank Bonus
          </button>
          <button
            type="button"
            className={`btn btn-sm ${reminderType === 'fee_transition' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleTypeChange('fee_transition')}
            style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem' }}
          >
            <GraduationCap size={14} /> Student / Fee Expiry
          </button>
          <button
            type="button"
            className={`btn btn-sm ${reminderType === 'return_warranty' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleTypeChange('return_warranty')}
            style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem' }}
          >
            <Package size={14} /> Return / Warranty
          </button>
          <button
            type="button"
            className={`btn btn-sm ${reminderType === 'subscription' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleTypeChange('subscription')}
            style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem' }}
          >
            <Tv size={14} /> Subscription
          </button>
        </div>
      </div>

      {/* QUICK PRESETS FOR FEE TRANSITIONS */}
      {reminderType === 'fee_transition' && (
        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#fde047', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.375rem' }}>
            <Sparkles size={13} /> Quick Transition Presets:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            <button
              type="button"
              onClick={() => applyFeePreset('student_switch')}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              🎓 1-Yr Free Checking $\rightarrow$ Switch to Student
            </button>
            <button
              type="button"
              onClick={() => applyFeePreset('card_retention')}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              💳 Annual Fee Waiver / Retention Call
            </button>
            <button
              type="button"
              onClick={() => applyFeePreset('promo_close')}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              ⚠️ Close Promo Account Before Inactivity Fee
            </button>
          </div>
        </div>
      )}

      {/* QUICK PRESETS FOR RETURN WINDOWS */}
      {reminderType === 'return_warranty' && (
        <div style={{ background: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.25)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#f472b6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.375rem' }}>
            <Sparkles size={13} /> Return Policy Shortcuts:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            <button
              type="button"
              onClick={() => applyReturnPreset(14, '14-Day Electronics Return Window')}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              🍎 14-Day Apple / Electronics
            </button>
            <button
              type="button"
              onClick={() => applyReturnPreset(30, '30-Day Amazon / Retail Return Window')}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              📦 30-Day Amazon / Online Return
            </button>
            <button
              type="button"
              onClick={() => applyReturnPreset(90, '90-Day Costco / Store Guarantee')}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              🏪 90-Day Extended Return
            </button>
          </div>
        </div>
      )}

      <div className="form-grid">
        {/* Title */}
        <div className="form-group full-width">
          <label className="form-label" htmlFor="title">
            {reminderType === 'credit_card'
              ? 'Credit Card Name *'
              : reminderType === 'bank_offer'
              ? 'Bank Account & Bonus Name *'
              : reminderType === 'fee_transition'
              ? 'Account Name / Fee Transition Goal *'
              : reminderType === 'return_warranty'
              ? 'Item / Store Name *'
              : 'Title *'}
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`form-control ${errors.title ? 'error' : ''}`}
            placeholder={
              reminderType === 'credit_card'
                ? 'e.g. Chase Sapphire Preferred, Amex Gold'
                : reminderType === 'bank_offer'
                ? 'e.g. Wells Fargo $300 Checking Bonus'
                : reminderType === 'fee_transition'
                ? 'e.g. Bank of America Checking (Switch to Student Tier)'
                : reminderType === 'return_warranty'
                ? 'e.g. Sony WH-1000XM5 Headphones (Amazon)'
                : 'e.g. Spotify Premium, ChatGPT Plus'
            }
            required
          />
          {errors.title && <span className="error-text">{errors.title}</span>}
        </div>

        {/* CREDIT CARD SPECIFIC FIELDS */}
        {reminderType === 'credit_card' && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="issuerBank">
                Issuing Bank
              </label>
              <input
                type="text"
                id="issuerBank"
                name="issuerBank"
                value={formData.issuerBank || ''}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. Chase, Amex, Citi, Discover"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="last4Digits">
                Last 4 Digits
              </label>
              <input
                type="text"
                id="last4Digits"
                name="last4Digits"
                maxLength={4}
                value={formData.last4Digits || ''}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. 4821"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="statementDate">
                Bill Generation Date (Cycle Close)
              </label>
              <input
                type="date"
                id="statementDate"
                name="statementDate"
                value={formData.statementDate || ''}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="paymentDueDate">
                Payment Due Date *
              </label>
              <input
                type="date"
                id="paymentDueDate"
                name="paymentDueDate"
                value={formData.paymentDueDate || ''}
                onChange={handleChange}
                className={`form-control ${errors.paymentDueDate ? 'error' : ''}`}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">
                Statement Balance / Due Amount
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                step="0.01"
                min="0"
                value={formData.amount !== undefined && formData.amount !== null ? formData.amount : ''}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. 150.00"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="actionUrl">
                Bank Login / Payment URL
              </label>
              <input
                type="url"
                id="actionUrl"
                name="actionUrl"
                value={formData.actionUrl || ''}
                onChange={handleChange}
                className="form-control"
                placeholder="https://www.chase.com"
              />
            </div>
          </>
        )}

        {/* BANK OFFER & MILESTONE SPECIFIC FIELDS */}
        {reminderType === 'bank_offer' && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="issuerBank">
                Bank Name
              </label>
              <input
                type="text"
                id="issuerBank"
                name="issuerBank"
                value={formData.issuerBank || ''}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. Chase, Capital One, SoFi"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="estimatedSavings">
                Promotional Bonus Reward ($)
              </label>
              <input
                type="number"
                id="estimatedSavings"
                name="estimatedSavings"
                value={formData.estimatedSavings !== undefined && formData.estimatedSavings !== null ? formData.estimatedSavings : ''}
                onChange={handleChange}
                className="form-control"
                placeholder="300"
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="renewalDate">
                Bonus Criteria Deadline (Must Complete By) *
              </label>
              <input
                type="date"
                id="renewalDate"
                name="renewalDate"
                value={formData.renewalDate}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            {/* Milestones Builder */}
            <div className="form-group full-width">
              <label className="form-label">Bonus Requirement Milestones:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.5rem' }}>
                {(formData.milestones || []).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.4rem 0.75rem',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <span>• {m.title}</span>
                    <button
                      type="button"
                      onClick={() => removeMilestone(m.id)}
                      style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="e.g. Deposit $1,000 within 60 days"
                  className="form-control"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMilestone();
                    }
                  }}
                />
                <button type="button" onClick={addMilestone} className="btn btn-secondary btn-sm">
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </>
        )}

        {/* FEE TRANSITION & STUDENT ACCOUNT FIELDS */}
        {reminderType === 'fee_transition' && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="issuerBank">
                Bank / Financial Institution
              </label>
              <input
                type="text"
                id="issuerBank"
                name="issuerBank"
                value={formData.issuerBank || ''}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. Bank of America, Chase, Wells Fargo"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="estimatedSavings">
                Annual Maintenance Fee Avoided ($/yr)
              </label>
              <input
                type="number"
                id="estimatedSavings"
                name="estimatedSavings"
                value={formData.estimatedSavings !== undefined && formData.estimatedSavings !== null ? formData.estimatedSavings : ''}
                onChange={handleChange}
                className="form-control"
                placeholder="144 ($12/mo)"
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="renewalDate">
                Free-Period Expiration / Fee Waiver Cutoff Date *
              </label>
              <input
                type="date"
                id="renewalDate"
                name="renewalDate"
                value={formData.renewalDate}
                onChange={handleChange}
                className="form-control"
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                Set to 1-2 weeks before your 1-year free trial or promo period expires.
              </span>
            </div>

            {/* Step-by-Step Transition Action Builder */}
            <div className="form-group full-width">
              <label className="form-label">Step-by-Step Action & Document Checklist:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.5rem' }}>
                {(formData.milestones || []).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.4rem 0.75rem',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <span>• {m.title}</span>
                    <button
                      type="button"
                      onClick={() => removeMilestone(m.id)}
                      style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="e.g. Show student ID at branch to change tier"
                  className="form-control"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMilestone();
                    }
                  }}
                />
                <button type="button" onClick={addMilestone} className="btn btn-secondary btn-sm">
                  <Plus size={14} /> Add Step
                </button>
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="actionUrl">
                Bank Portal / Appointment Booking Link
              </label>
              <input
                type="url"
                id="actionUrl"
                name="actionUrl"
                value={formData.actionUrl || ''}
                onChange={handleChange}
                className="form-control"
                placeholder="https://bank.com/student-account"
              />
            </div>
          </>
        )}

        {/* RETURN WINDOW & WARRANTY SPECIFIC FIELDS */}
        {reminderType === 'return_warranty' && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="issuerBank">
                Store / Merchant
              </label>
              <input
                type="text"
                id="issuerBank"
                name="issuerBank"
                value={formData.issuerBank || ''}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. Amazon, Apple, Best Buy, Target"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">
                Refundable Amount ($)
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                step="0.01"
                min="0"
                value={formData.amount !== undefined && formData.amount !== null ? formData.amount : ''}
                onChange={handleChange}
                className="form-control"
                placeholder="199.99"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="startDate">
                Purchase / Delivery Date
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate || ''}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="renewalDate">
                Return Deadline Date *
              </label>
              <input
                type="date"
                id="renewalDate"
                name="renewalDate"
                value={formData.renewalDate}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="actionUrl">
                Return Portal / Order Status Link
              </label>
              <input
                type="url"
                id="actionUrl"
                name="actionUrl"
                value={formData.actionUrl || ''}
                onChange={handleChange}
                className="form-control"
                placeholder="https://amazon.com/orders"
              />
            </div>
          </>
        )}

        {/* STANDARD SUBSCRIPTION FIELDS */}
        {reminderType === 'subscription' && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="category">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category || 'subscription'}
                onChange={handleChange}
                className="form-control"
              >
                <option value="subscription">Subscription</option>
                <option value="trial">Free Trial</option>
                <option value="domain">Domain Name</option>
                <option value="license">Software License</option>
                <option value="cloud">Cloud / Server</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="billingCycle">
                Billing Cycle
              </label>
              <select
                id="billingCycle"
                name="billingCycle"
                value={formData.billingCycle || 'monthly'}
                onChange={handleChange}
                className="form-control"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="quarterly">Quarterly</option>
                <option value="one-time">One-time Expiration</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="renewalDate">
                Renewal Date *
              </label>
              <input
                type="date"
                id="renewalDate"
                name="renewalDate"
                value={formData.renewalDate}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">
                Cost ($)
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                step="0.01"
                min="0"
                value={formData.amount !== undefined && formData.amount !== null ? formData.amount : ''}
                onChange={handleChange}
                className="form-control"
                placeholder="14.99"
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="url">
                Cancellation / Management URL
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url || ''}
                onChange={handleChange}
                className="form-control"
                placeholder="https://netflix.com/youraccount"
              />
            </div>
          </>
        )}

        {/* Remind Days Before Selection */}
        <div className="form-group full-width">
          <label className="form-label">
            <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
            Notify Me:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
            {[1, 2, 3, 5, 7, 14, 30].map((day) => {
              const selected = remindDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleRemindDaysToggle(day)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    border: selected ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: selected ? 'var(--primary-glow)' : 'var(--bg-primary)',
                    color: selected ? '#c084fc' : 'var(--text-muted)',
                  }}
                >
                  {day === 1 ? '1 day before' : `${day} days before`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="form-group full-width">
          <label className="form-label" htmlFor="notes">
            {reminderType === 'fee_transition'
              ? 'Customer Service Script & Requirements Notes'
              : reminderType === 'return_warranty'
              ? 'Order Number, Receipt & Return Instructions'
              : 'Action Notes & Instructions'}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={formData.notes || ''}
            onChange={handleChange}
            className="form-control"
            placeholder={
              reminderType === 'fee_transition'
                ? 'Bring student ID and transcript to local branch to switch tier before fee starts.'
                : reminderType === 'return_warranty'
                ? 'Order #112-9876543-21. Drop off at nearest UPS store with QR code.'
                : 'Private reminder notes, promo codes, steps to complete...'
            }
          />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-outline" disabled={isSubmitting}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          <CheckCircle2 size={16} />
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
